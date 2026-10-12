import base64
import json
import re
from pathlib import Path

import numpy as np
from sentence_transformers import SentenceTransformer

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
MANUSCRIPT = ROOT / '03_manuscript' / 'working_v4' / 'manuscript_v4.md'
CAPTIONS = ROOT / '03_manuscript' / 'working_v4' / 'figure_captions_v4.json'
OUT = HERE / 'data' / 'ask.json'
CHECK = HERE / 'data' / 'ask_check.json'
MODEL = 'sentence-transformers/all-MiniLM-L6-v2'

ABBR = {'al', 'p', 'pp', 'cf', 'vs', 'e.g', 'i.e', 'fig', 'no', 'eq', 'st', 'mr', 'dr', 'us', 'u.s'}

ASKS = [
    {
        'id': 'when',
        'label': 'Ask 1, when the measure was written',
        'cost': 'cheapest',
        'quote': 'Ask when the measure was written, not only what it says.',
        'protos': [
            'Ask when the measure was written, not only what it says.',
            'the categories available now are not those available then',
            'Every symbol carries a validity date',
            'An anachronistic code is a current code whose symbol’s validity date postdates the document’s publication',
            'the timing arguments establish only that information could not have been written before an event',
        ],
    },
    {
        'id': 'two',
        'label': 'Ask 2, read two versions',
        'cost': 'a join',
        'quote': 'If the artefact is versioned, read two versions and state which one an estimate comes from, since a second version is a join rather than a new data collection.',
        'protos': [
            'If the artefact is versioned, read two versions and state which one an estimate comes from, since a second version is a join rather than a new data collection.',
            'The patent record is used here because its earlier states are published and dated rather than inferred',
            'only the state of each application’s record changes',
            'Maintenance is continuous while the events a record describes are not, so one document accumulates several states of its own entry',
            'The design reads one maintained record at its own dates',
        ],
    },
    {
        'id': 'coupling',
        'label': 'Ask 3, whether the writing is coupled to the outcome',
        'cost': 'a question about the keeper',
        'quote': 'If it is not versioned, ask whether entries are completed on the outcome’s schedule, because here coupling at the decision moves the estimate far more than datable revision after it.',
        'protos': [
            'If it is not versioned, ask whether entries are completed on the outcome’s schedule, because here coupling at the decision moves the estimate far more than datable revision after it.',
            'Decision-coupled writing completes entries when the organisation decides, so the density of a record follows the decision',
            'Entries are not rewritten in hindsight; they are written on the organisation’s own decision schedule',
            'Reading each application at disposition, from its grant-time record if granted and its record as published if refused',
            'Nothing in the arrangement ties the revision of one record to what happened to that record',
            'Documentation completed on an outcome’s schedule is common, from incident reports written up on escalation to customer records enriched when a deal closes and case files completed at decision',
            'The incentive to complete a record can also arrive with a decision.',
            'reclassified patents tend to be more cited',
        ],
    },
    {
        'id': 'keeper',
        'label': 'What this asks of the keeper',
        'cost': 'for the keeper of the record',
        'quote': 'For keepers of shared classifications such as the patent offices, dating each assignment and keeping superseded states as first-class objects would let historical users do directly what this paper could do only through symbol validity dates',
        'protos': [
            'For keepers of shared classifications such as the patent offices, dating each assignment and keeping superseded states as first-class objects would let historical users do directly what this paper could do only through symbol validity dates',
            'Store the date of each classification or tag assignment and keep superseded versions of the taxonomy, so that the repository can answer what it said on a given date.',
            'Accuracy is a separate question',
            'a record used for historical inference has to be read back to a date',
            'A record kept for present retrieval is judged by whether the next search succeeds',
        ],
    },
]


def read_manuscript():
    text = MANUSCRIPT.read_text(encoding='utf-8')
    head, _, body = text.partition('\n---\n')
    passages = []
    for para in head.split('\n\n'):
        para = para.strip()
        m = re.match(r'^\*\*([^*]+?)\.\*\*\s+(.*)$', para, re.S)
        if not m:
            continue
        label = m.group(1)
        if label in ('Keywords', 'Article classification'):
            continue
        passages.append({'sec': 'Abstract', 'head': label, 'text': m.group(2).strip(), 'source': 'manuscript'})
    sec, head = '', ''
    for para in body.split('\n\n'):
        para = para.strip()
        if not para or para.startswith('[[table') or para.startswith('[[figure'):
            continue
        m = re.match(r'^(#{2,3})\s+([0-9]+(?:\.[0-9]+)?)\.?\s+(.*)$', para)
        if m:
            sec, head = m.group(2), m.group(3).strip()
            continue
        if para.startswith('#'):
            sec, head = '', para.lstrip('#').strip()
            continue
        passages.append({'sec': sec, 'head': head, 'text': para, 'source': 'manuscript'})
    for p in passages:
        assert p['text'] in text
    return text, passages


def read_captions():
    caps = json.loads(CAPTIONS.read_text(encoding='utf-8'))
    out = []
    for c in caps:
        label = c['label'].rstrip('.')
        out.append({'sec': label, 'head': 'Caption', 'text': c['text'].strip(), 'source': 'captions'})
    return out


def split_sentences(text):
    spans = []
    start = 0
    i = 0
    n = len(text)
    while i < n:
        ch = text[i]
        if ch in '.?!' and i + 1 < n:
            j = i + 1
            while j < n and text[j] in '.?!”)\'"':
                j += 1
            if j < n and text[j] == ' ' and j + 1 < n and (text[j + 1].isupper() or text[j + 1] in '“("'):
                before = text[max(start, i - 6):i]
                word = re.split(r'[\s(]', before)[-1].lower().lstrip('*')
                prev_char = text[i - 1] if i > 0 else ''
                if word not in ABBR and not re.match(r'^p\d$', word) and not (prev_char.isdigit() and text[j + 1].isdigit()):
                    spans.append((start, j))
                    start = j + 1
                    i = j + 1
                    continue
        i += 1
    if start < n:
        spans.append((start, n))
    return [(s, e) for s, e in spans if text[s:e].strip()]


def pack(vecs):
    vecs = np.asarray(vecs, dtype=np.float32)
    scale = np.abs(vecs).max(axis=1) / 127.0
    scale[scale == 0] = 1.0
    q = np.clip(np.rint(vecs / scale[:, None]), -127, 127).astype(np.int8)
    return {
        'n': int(vecs.shape[0]),
        'scale': [float('%.7g' % s) for s in scale],
        'q': base64.b64encode(q.tobytes()).decode('ascii'),
    }


def main():
    text, passages = read_manuscript()
    passages += read_captions()
    sents = []
    for pid, p in enumerate(passages):
        for s, e in split_sentences(p['text']):
            sents.append([pid, s, e])
    model = SentenceTransformer(MODEL, device='cpu')
    p_texts = [p['text'] for p in passages]
    s_texts = [passages[pid]['text'][s:e] for pid, s, e in sents]
    protos = []
    for a in ASKS:
        assert a['quote'] in text, a['quote']
        for t in a['protos']:
            assert t in text, t
            protos.append({'ask': a['id'], 'text': t})
    p_vec = model.encode(p_texts, normalize_embeddings=True, batch_size=32)
    s_vec = model.encode(s_texts, normalize_embeddings=True, batch_size=64)
    r_vec = model.encode([r['text'] for r in protos], normalize_embeddings=True)
    out = {
        'model': MODEL,
        'dim': int(p_vec.shape[1]),
        'packing': 'Each embedding is a unit-norm float32 vector of dim values. For every vector the scale is max(abs(v)) / 127; q = round(v / scale) as int8 in [-127, 127]. The q of all vectors are concatenated in order, row-major, and base64 encoded. Decode vector i as v[j] = scale[i] * int8(q[i * dim + j]), j from 0 to dim - 1. Cosine similarity is the dot product after re-normalising the decoded vector.',
        'passages': [{'sec': p['sec'], 'head': p['head'], 'source': p['source'], 'text': p['text']} for p in passages],
        'sents': sents,
        'p_emb': pack(p_vec),
        's_emb': pack(s_vec),
        'asks': [{'id': a['id'], 'label': a['label'], 'cost': a['cost'], 'quote': a['quote']} for a in ASKS],
        'protos': protos,
        'r_emb': pack(r_vec),
        'sources': {
            'manuscript': str(MANUSCRIPT.relative_to(ROOT)).replace('\\', '/'),
            'captions': str(CAPTIONS.relative_to(ROOT)).replace('\\', '/'),
        },
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    pi = [0, 40, len(passages) - 1]
    si = [0, len(sents) - 1]
    ri = [0, len(protos) // 2, len(protos) - 1]
    check = {
        'passage_index': pi,
        'passage_float': [[float('%.5f' % x) for x in p_vec[i]] for i in pi],
        'sentence_index': si,
        'sentence_float': [[float('%.5f' % x) for x in s_vec[i]] for i in si],
        'proto_index': ri,
        'proto_float': [[float('%.5f' % x) for x in r_vec[i]] for i in ri],
    }
    CHECK.write_text(json.dumps(check, separators=(',', ':')), encoding='utf-8')
    print(len(passages), 'passages', len(sents), 'sentences', len(protos), 'prototypes', OUT.stat().st_size, 'bytes')
    short = [s_texts[i] for i in range(len(s_texts)) if len(s_texts[i]) < 40]
    print('short sentences:', short)


if __name__ == '__main__':
    main()
