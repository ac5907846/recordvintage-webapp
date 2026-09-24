'use strict';

const fs = require('fs');

const path = require('path');

const HERE = __dirname;

const ask = JSON.parse(fs.readFileSync(path.join(HERE, 'data', 'ask.json'), 'utf8'));

const ref = JSON.parse(fs.readFileSync(path.join(HERE, 'data', 'ask_check.json'), 'utf8'));

const src = fs.readFileSync(path.join(HERE, 'js', 'views', 'ask.js'), 'utf8');

const win = {
  atob: s => Buffer.from(s, 'base64').toString('latin1'),
  D: {
    dec: x => String(x)
  }
};

new Function('window', src)(win);

const unpack = win.Ask.unpack;

let pass = 0, fail = 0;

function check(label, ok, detail) {
  if (ok) pass++; else {
    fail++;
    console.log(`  FAIL ${label}${detail ? ': ' + detail : ''}`);
  }
}

const dim = ask.dim;

const P = unpack(ask.p_emb, dim), S = unpack(ask.s_emb, dim), R = unpack(ask.r_emb, dim);

check('passage count matches packed count', ask.p_emb.n === ask.passages.length);

check('sentence count matches packed count', ask.s_emb.n === ask.sents.length);

check('prototype count matches packed count', ask.r_emb.n === ask.protos.length);

check('packed bytes equal n times dim', Buffer.from(ask.p_emb.q, 'base64').length === ask.p_emb.n * dim);

function compare(label, mat, idx, floats) {
  idx.forEach((i, k) => {
    const f = floats[k];
    let dot = 0, maxAbs = 0, nf = 0;
    for (let j = 0; j < dim; j++) {
      const a = mat[i * dim + j], b = f[j];
      dot += a * b;
      nf += b * b;
      maxAbs = Math.max(maxAbs, Math.abs(a - b));
    }
    const cos = dot / Math.sqrt(nf);
    const scale = ask[label === 'passage' ? 'p_emb' : label === 'sentence' ? 's_emb' : 'r_emb'].scale[i];
    check(`${label} ${i} decoded within quantisation error (max abs ${maxAbs.toExponential(2)}, half a step ${(scale / 2).toExponential(2)})`, maxAbs <= scale / 2 + .002);
    check(`${label} ${i} cosine with the Python vector above .9995 (${cos.toFixed(6)})`, cos > .9995);
  });
}

compare('passage', P, ref.passage_index, ref.passage_float);

compare('sentence', S, ref.sentence_index, ref.sentence_float);

compare('prototype', R, ref.proto_index, ref.proto_float);

for (let i = 0; i < ask.p_emb.n; i++) {
  let n = 0;
  for (let j = 0; j < dim; j++) n += P[i * dim + j] * P[i * dim + j];
  if (Math.abs(n - 1) > 1e-4) check(`passage ${i} decoded vector has unit norm`, false, n);
}

ask.sents.forEach((s, i) => {
  const t = ask.passages[s[0]].text.slice(s[1], s[2]);
  check(`sentence ${i} is a non-empty span of its passage`, t.trim().length > 0 && s[1] >= 0 && s[2] <= ask.passages[s[0]].text.length);
});

const root = path.resolve(HERE, '..');

const manPath = path.join(root, ask.sources.manuscript), capPath = path.join(root, ask.sources.captions);

if (fs.existsSync(manPath) && fs.existsSync(capPath)) {
  const man = fs.readFileSync(manPath, 'utf8');
  const cap = JSON.parse(fs.readFileSync(capPath, 'utf8')).map(c => c.text).join('\n');
  ask.passages.forEach((p, i) => check(`passage ${i} (${p.sec}) is a verbatim substring of its source`, (p.source === 'manuscript' ? man : cap).indexOf(p.text) >= 0));
  ask.protos.forEach((r, i) => check(`prototype ${i} is a verbatim substring of the manuscript`, man.indexOf(r.text) >= 0));
  ask.asks.forEach(a => check(`ask ${a.id} quote is a verbatim substring of the manuscript`, man.indexOf(a.quote) >= 0));
} else console.log('  manuscript not on this machine, verbatim check skipped');

ask.asks.forEach(a => check(`ask ${a.id} has at least one prototype`, ask.protos.some(r => r.ask === a.id)));

const words = [ 'corpus', '—', '0.0' ];

ask.asks.forEach(a => words.forEach(w => check(`ask ${a.id} label avoids ${JSON.stringify(w)}`, (a.label + a.cost).indexOf(w) < 0)));

console.log(`${pass} of ${pass + fail} checks passed`);

process.exit(fail ? 1 : 0);