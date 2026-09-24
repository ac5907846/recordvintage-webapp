/* Recompute or look up every headline value the app displays, from the JSON it serves, and
   compare with the value the page shows. A displayed number this check cannot reproduce is a bug.

       node check_numbers.js
*/
'use strict';

const fs = require('fs');
const path = require('path');
const DATA = path.join(__dirname, 'data');
const load = (n) => JSON.parse(fs.readFileSync(path.join(DATA, n + '.json'), 'utf8'));
const h = load('headline'), v = load('vintage'), mv = load('multiverse'), k = load('killtests');
const rec = load('record'), prov = load('provenance'), ver = load('verify'), rule = load('rule');

let pass = 0, fail = 0;
function check(label, got, want, tol) {
  tol = tol === undefined ? 1e-6 : tol;
  const ok = (typeof want === 'number') ? Math.abs(got - want) <= tol : String(got) === String(want);
  if (ok) pass++; else { fail++; console.log(`  FAIL ${label}: got ${got}, expected ${want}`); }
}
const median = (a) => { const s = a.slice().sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

/* ---------------------------------------------------------- the decomposition, from the four cells */
const { Ca, Ci, Pa, Pi } = v.cells;
check('gap today equals the Ca cell', h.gap_today, Ca);
check('gap as published equals the Pa cell', h.gap_published, Pa);
check('vintage difference, all types = Ca - Pa', Ca - Pa, h.vintage_all, 0.0025);
check('vintage difference, inventional = Ci - Pi', Ci - Pi, h.vintage_inv, 0.0025);
check('published-style contrast = Ca - Pi', Ca - Pi, h.contrast, 0.0025);
check('Shapley vintage = mean of both orderings', ((Ca - Pa) + (Ci - Pi)) / 2, h.shapley_vintage, 0.0025);
check('Shapley code type = mean of both orderings', ((Ca - Ci) + (Pa - Pi)) / 2, h.shapley_type, 0.0025);
check('Shapley parts sum to the contrast', h.shapley_vintage + h.shapley_type, h.contrast, 0.0025);
check('vintage share of the contrast rounds to 91%', Math.round(100 * h.shapley_vintage / h.contrast), 91);
check('excess over the null = V - V0', v.null.all.V - v.null.all.V0, h.excess_all, 0.0025);
check('excess over the null, inventional', v.null.inv.V - v.null.inv.V0, h.excess_inv, 0.0025);
check('null stored in headline', h.null_all, v.null.all.V0);
check('vintage components agree between files', v.components.V_all.estimate, h.vintage_all);
check('type component path 1 closes', v.components.V_all.estimate + v.components.T_P.estimate, h.contrast, 0.0025);
check('type component path 2 closes', v.components.V_inv.estimate + v.components.T_C.estimate, h.contrast, 0.0025);
['all', 'inv'].forEach((t) => v.migration[t].forEach((row, i) => check(`migration ${t} row ${i} sums to 1`, row.reduce((a, b) => a + b, 0), 1, 0.001)));
check('top bin stays top bin, 38.5%', Math.round(v.migration.all[3][3] * 1000) / 10, 38.5);
check('top bin falls to zero, 21.9%', Math.round(v.migration.all[3][0] * 1000) / 10, 21.9);
check('bin shares are shares of applications', v.raw.Ca.share5, v.raw.Ca.n5 / h.n_apps, 0.001);
check('top and zero bins together are a part of the sample', v.raw.Ca.n5 + v.raw.Ca.n0 < h.n_apps, true);

/* ---------------------------------------------------------- the record and the grant-time share */
check('share of change at grant recomputed', (h.new_pairs_grant - h.new_pairs_pub) / (h.new_pairs_today - h.new_pairs_pub), h.share_at_grant, 0.001);
check('share of change at grant, from record.json', (rec.grant_time.new_pairs[1] - rec.grant_time.new_pairs[0]) / (rec.grant_time.new_pairs[2] - rec.grant_time.new_pairs[0]), rec.grant_time.share_at_grant, 0.001);
check('granted lane has three states', rec.lanes.granted.states.length, 3);
check('never-granted lane has two states', rec.lanes.abandoned.states.length, 2);
check('granted lane n', rec.lanes.granted.n, 657428);
check('never-granted lane n', rec.lanes.abandoned.n, 238669);
check('lanes sum to the Figure 2 sample', rec.lanes.granted.n + rec.lanes.abandoned.n, rec.n);
check('new pairs at publication, granted, 2.85', Math.round(rec.lanes.granted.states[0].new_pairs * 100) / 100, 2.85);
check('new pairs at grant, 12.28', Math.round(rec.lanes.granted.states[1].new_pairs * 100) / 100, 12.28);
check('new pairs today, never granted, 17.47', Math.round(rec.lanes.abandoned.states[1].new_pairs * 100) / 100, 17.47);

/* ---------------------------------------------------------- the kill tests */
check('K1 inside its band', (h.k1_ci90[0] > -h.k1_band && h.k1_ci90[1] < h.k1_band), true);
check('K1 pair test inside its band', (h.k1_pair_ci90[0] > -h.k1_pair_band && h.k1_pair_ci90[1] < h.k1_pair_band), true);
check('K1 band is 10% of the base', h.k1_band, h.k1_base / 10, 0.002);
check('K1 relative size about 3%', Math.round(100 * h.k1_beta / h.k1_base), 3);
check('K2b estimate clears its band', h.k2b_beta > h.k2b_band, true);
check('K2b interval reaches into its band', h.k2b_ci95[0] < h.k2b_band, true);
check('K2c inside its band', (h.k2c_ci95[0] > -h.k2c_band && h.k2c_ci95[1] < h.k2c_band), true);
check('21 K1 variants', k.variants.length, 21);
const withCi = k.variants.filter((x) => x.lo !== null && x.band !== null);
const outside = withCi.filter((x) => x.hi >= x.band || x.lo <= -x.band);
check('one variant lies outside its region, the unrestricted new pair', outside.length, 1);
check('the variant outside is the unrestricted new pair', outside[0] && outside[0].label, 'unrestricted, new pair');
check('the variant outside reads +1.05', Math.round(outside[0].beta * 100) / 100, 1.05);
check('variants run from +.13', Math.round(Math.min(...k.variants.map((x) => x.beta)) * 100) / 100, 0.13);
const ledgerIds = k.ledger.map((t) => t.id).join(',');
check('ledger order as the preregistration set', ledgerIds, 'R0,D0,K3a,K4,K1,K2b,K2c,K5a,K6r,K7b,K7p');
const lab = Object.fromEntries(k.ledger.map((t) => [t.id, t.label]));
check('K1 label Kill', lab.K1, 'Kill'); check('K2b label Support', lab.K2b, 'Support'); check('K2c label Kill', lab.K2c, 'Kill');
check('K6r label Kill', lab.K6r, 'Kill'); check('K4 label Inconclusive', lab.K4, 'Inconclusive'); check('D0 label Support', lab.D0, 'Support');
check('K7b label Support', lab.K7b, 'Support'); check('K7p label Support', lab.K7p, 'Support'); check('K3a label Support', lab.K3a, 'Support');
check('K6r wrong sign', k.ledger.find((t) => t.id === 'K6r').estimate < 0, true);
check('K7b closure .977', Math.round(k.ledger.find((t) => t.id === 'K7b').estimate * 1000) / 1000, 0.977);
check('K7p +25.9', Math.round(k.ledger.find((t) => t.id === 'K7p').estimate * 10) / 10, 25.9);
check('K5a -4.27', Math.round(k.ledger.find((t) => t.id === 'K5a').estimate * 100) / 100, -4.27);
check('K4 +2.20', Math.round(k.ledger.find((t) => t.id === 'K4').estimate * 100) / 100, 2.2);
check('K3a +3.54', Math.round(k.ledger.find((t) => t.id === 'K3a').estimate * 100) / 100, 3.54);
check('post-decision removal moves the gap by -.70', Math.round((k.counterfactual['C_all minus post-disposition codes'] - k.counterfactual.C_all) * 100) / 100, -0.7);
check('random removal moves the gap by -.60', Math.round((k.counterfactual['C_all minus random codes (benchmark)'] - k.counterfactual.C_all) * 100) / 100, -0.6);
check('excess with no exposure +4.11', Math.round(k.exposure.G0.excess * 100) / 100, 4.11);
check('excess in the top quintile +5.24', Math.round(k.exposure.Q5.excess * 100) / 100, 5.24);
check('K4 = excess Q5 minus Q1', k.exposure.Q5.excess - k.exposure.Q1.excess, k.ledger.find((t) => t.id === 'K4').estimate, 0.0025);
check('seven K2b robustness variants', k.k2b_variants.length, 7);
check('K2b variants run from +1.29', Math.round(Math.min(...k.k2b_variants.map((x) => x.beta)) * 100) / 100, 1.29);
check('verdict B', k.verdict, 'B'); check('verdict B in headline', h.verdict, 'B');

/* ---------------------------------------------------------- propositions */
const props = Object.fromEntries(h.propositions.map((p) => [p.id, p]));
check('three propositions', h.propositions.length, 3);
check('P1 rests on D0 and K3a, both Support', props.P1.tests.map((t) => t.label).join(','), 'Support,Support');
check('P2 carries the aggregate support and the K1 kill', props.P2.tests.map((t) => t.id + ':' + t.label).join(','), 'EXC:Support,K1:Kill,K4:Inconclusive');
check('P3 carries K2b Support and K2c Kill', props.P3.tests.map((t) => t.label).join(','), 'Support,Kill');

/* ---------------------------------------------------------- the multiverse */
const C = {}; mv.columns.forEach((c, i) => { C[c] = i; });
const est = mv.rows.map((r) => r[C.estimate]);
check('432 specifications', mv.rows.length, h.spec_n);
check('lowest estimate', Math.min(...est), h.spec_min, 0.0015);
check('highest estimate', Math.max(...est), h.spec_max, 0.0015);
check('median estimate', median(est), h.spec_median, 0.0015);
check('rows sorted by estimate', est.every((e, i) => i === 0 || e >= est[i - 1]), true);
check('intervals below zero', mv.rows.filter((r) => r[C.hi] < 0).length, h.spec_below);
check('intervals spanning zero', mv.rows.filter((r) => r[C.lo] <= 0 && r[C.hi] >= 0).length, h.spec_span);
check('intervals above zero', mv.rows.filter((r) => r[C.lo] > 0).length, h.spec_above);
check('counts sum to 432', h.spec_below + h.spec_span + h.spec_above, h.spec_n);
check('none above zero reads the record as published', mv.rows.filter((r) => r[C.lo] > 0 && mv.vintage_of_measure[mv.levels.measure[r[C.measure]]] === 'published').length, 0);
const lit = mv.rows.filter((r) => r[C.flag] & 1), pref = mv.rows.filter((r) => r[C.flag] & 2);
check('one specification closest to published practice', lit.length, 1);
check('one breadth-controlled as-published specification', pref.length, 1);
check('published practice +.31', Math.round(lit[0][C.estimate] * 100) / 100, 0.31);
check('as published, breadth controlled -4.09', Math.round(pref[0][C.estimate] * 100) / 100, -4.09);
mv.forks.forEach((f) => check(`levels of ${f} all used`, new Set(mv.rows.map((r) => r[C[f]])).size, mv.levels[f].length));
/* leverage, recomputed from the rows */
mv.forks.forEach((f) => {
  const others = mv.forks.filter((g) => g !== f);
  const key = (r) => others.map((g) => r[C[g]]).join('|');
  const by = {};
  mv.rows.forEach((r) => { (by[r[C[f]]] = by[r[C[f]]] || {})[key(r)] = r[C.estimate]; });
  const lv = Object.keys(by); let best = 0;
  for (let i = 0; i < lv.length; i++) for (let j = i + 1; j < lv.length; j++) {
    const d = []; Object.keys(by[lv[i]]).forEach((kk) => { if (by[lv[j]][kk] !== undefined) d.push(Math.abs(by[lv[i]][kk] - by[lv[j]][kk])); });
    if (d.length) best = Math.max(best, median(d));
  }
  check(`leverage of ${f}`, best, mv.leverage[f], 0.0015);
});
check('leverage order: measure, controls, sample lead', [...mv.forks].sort((a, b) => mv.leverage[b] - mv.leverage[a]).slice(0, 3).sort().join(','), 'controls,measure,sample');
check('leverage of the measure rounds to 3.2', Math.round(mv.leverage.measure * 10) / 10, 3.2);

/* ---------------------------------------------------------- provenance and verify */
check('provenance items present', prov.items.length > 50, true);
const P = Object.fromEntries(prov.items.map((it) => [it.label, it.value]));
check('provenance gap today matches headline', P['Grant gap, record today'], h.gap_today, 0.0006);
check('provenance excess matches headline', P['Excess over the null, all code types'], h.excess_all, 0.0006);
check('provenance K1 in pp', P['Post-decision code, granted minus never granted'] * 100, h.k1_beta, 0.0006);
check('provenance K2b in pp', P['Post-window revision per SD of forward citations'] * 100, h.k2b_beta, 0.0006);
check('provenance share at grant', P['Share of a granted record’s change present at grant'], h.share_at_grant, 0.0006);
check('prereg frozen 21 September 2026', ver.prereg.frozen_at.slice(0, 10), '2026-09-21');
check('prereg hash prefix is 16 hex characters', /^[0-9a-f]{16}$/.test(ver.prereg.sha256_prefix), true);
check('replication line carries no link', ver.replication.indexOf('http') === -1, true);
check('four data sources, all https', ver.sources.filter((s) => s.url.indexOf('https://') === 0).length, 4);
check('attrition ends at the primary sample', ver.attrition.find((a) => a.sample === 's_S1d' && a.rule.indexOf('published strictly') === 0).n, h.n_apps);
check('primary sample 833,267', h.n_apps, 833267);
check('reading rule has four questions and three asks', rule.questions.length * 10 + rule.asks.length, 43);

/* ---------------------------------------------------------- wording rules on every served string */
const text = JSON.stringify([h, v, mv, k, rec, prov, ver, rule]) + fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8') +
  fs.readdirSync(path.join(__dirname, 'js')).filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(path.join(__dirname, 'js', f), 'utf8')).join('') +
  fs.readdirSync(path.join(__dirname, 'js', 'views')).map((f) => fs.readFileSync(path.join(__dirname, 'js', 'views', f), 'utf8')).join('');
check('no em dash anywhere', text.indexOf('—') === -1, true);
check('no "corpus" anywhere', /corpus/i.test(text), false);
check('no "temporal leakage" anywhere', /temporal leakage/i.test(text), false);

console.log(`\n${pass} of ${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
