import base64
import json
import re
from pathlib import Path

import numpy as np
from sentence_transformers import SentenceTransformer

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
MANUSCRIPT = ROOT / '03_manuscript' / 'working_v3' / 'manuscript_v3.md'
CAPTIONS = ROOT / '03_manuscript' / 'v3_submission' / 'figure_captions_v3.json'
OUT = HERE / 'data' / 'ask.json'
CHECK = HERE / 'data' / 'ask_check.json'
MODEL = 'sentence-transformers/all-MiniLM-L6-v2'

ABBR = {'al', 'p', 'pp', 'cf', 'vs', 'e.g', 'i.e', 'fig', 'no', 'eq', 'st', 'mr', 'dr', 'us', 'u.s'}

ASKS = [
    {
        'id': 'when',
        'label': 'Ask 1, when the measure was written',
        'cost': 'cheapest',
        'quote': 'ask when the measure was written, not only what it says, meaning whether the categories and assignments existed at the event they are dated to',
        'protos': [
            'ask when the measure was written, not only what it says, meaning whether the categories and assignments existed at the event they are dated to',
            'the categories available now are not those available then',
            'Every symbol carries a validity date',
            'An anachronistic code is a current code whose symbol’s validity date postdates the document’s own publication',
            'the timing arguments establish only that information cannot have been written before an event',
        ],
    },
    {
        'id': 'two',
        'label': 'Ask 2, read two versions',
        'cost': 'a join',
        'quote': 'if the artefact is versioned, read two versions and state which one an estimate comes from, since a second version is a join, not a new data collection',
        'protos': [
            'if the artefact is versioned, read two versions and state which one an estimate comes from, since a second version is a join, not a new data collection',
            'The patent record is used here because its earlier states are published and dated rather than inferred',
            'Only the date at which the classification record is read varies',
            'The design therefore compares two versions of one record, measuring neither against the truth',
            'Maintenance is continuous while the events a record describes are not, so one document accumulates several states of its own entry',
        ],
    },
    {
        'id': 'coupling',
        'label': 'Ask 3, whether the writing is coupled to the outcome',
        'cost': 'a question about the keeper',
        'quote': 'if it is not, ask whether the writing is coupled to the outcome, because here coupling, not revision, does the damage',
        'protos': [
            'if it is not, ask whether the writing is coupled to the outcome, because here coupling, not revision, does the damage',
            'A measure can therefore inherit an outcome without any revision made in its light, if the writing and the outcome share a schedule',
            'the writing of the record and the decision share a schedule',
            'the record of a granted application is written in instalments, at publication, again at the grant and then maintained',
            'Nothing in that arrangement ties the revision of one record to what happened to that record',
            'Where documentation is completed on the outcome’s schedule, as an incident report may be on escalation, a customer record when a deal closes or a case file on decision, the density of the record can track the outcome',
            'a codified memory is dated by the schedule on which it was written, not by the events its entries describe, and a secondary user who reads it as a history has to recover that schedule first',
            'P2 separates a store from a record whose writing schedule is tied to the process under study',
            'reclassified patents tend to be more cited than those that were not',
        ],
    },
    {
        'id': 'keeper',
        'label': 'What this asks of the keeper',
        'cost': 'for the keeper of the record',
        'quote': 'To serve historical work, the keeper should date assignments and keep superseded states as first-class objects rather than by-products of a snapshot.',
        'protos': [
            'To serve historical work, the keeper should date assignments and keep superseded states as first-class objects rather than by-products of a snapshot.',
            'The keeper of this scheme already publishes most of what a historical user needs, except a date on each assignment',
            'Accuracy is a separate question from vintage, and not a reassuring one',
            'A record optimised for historical inference is judged by whether it can be read back to a date',
            'A record optimised for present retrieval is judged by whether the next search succeeds, and it earns its revisions',
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
        if not para or para.startswith('[[table'):
            continue
        m = re.match(r'^(#{2,3})\s+([0-9]+(?:\.[0-9]+)?)\.?\s+(.*)$', para)
        if m:
            sec, head = m.group(2), m.group(3).strip()
            continue
        if para.startswith('#'):
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
