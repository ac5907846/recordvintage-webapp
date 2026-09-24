#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build every JSON the companion app reads, from the result files of the analysis.

The app never holds a number of its own. Everything under data/ is written here from
02_analysis/40_theory_kill_tests/results and 02_analysis/36_specification_multiverse/results, so a
number on the page can always be traced to the result file and key it came from. That trace is
itself written to data/provenance.json and shown on the Verify view.

    python build_data.py
"""
import csv
import hashlib
import io
import json
import os
import re
import itertools

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
KT = os.path.join(ROOT, "02_analysis", "40_theory_kill_tests")
KR = os.path.join(KT, "results")
MV = os.path.join(ROOT, "02_analysis", "36_specification_multiverse (fig 2, tables I and II)", "results")
DATA = os.path.join(HERE, "data")
os.makedirs(DATA, exist_ok=True)

PROV = []


def J(name):
    with open(os.path.join(KR, name), encoding="utf-8") as f:
        return json.load(f)


def dump(name, obj):
    p = os.path.join(DATA, name)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(obj, f, separators=(",", ":"), allow_nan=False, default=float, ensure_ascii=False)
    print(f"  {name:<20} {os.path.getsize(p) / 1024:8.1f} KB")


def prov(label, value, file, key, printed, sample=""):
    """Record where a headline number comes from. `value` is the stored value, `printed` the form the
    paper prints, both kept so the Verify table can show the rounding."""
    PROV.append({"label": label, "value": value, "file": file, "key": key,
                 "printed": printed, "sample": sample})


def r(x, d=3):
    return None if x is None else round(float(x), d)


D0 = J("D0.json")
K1 = J("K1.json")
K2 = J("K2.json")
K4 = J("K4.json")
K5 = J("K5.json")
K6 = J("K6.json")
K7 = J("K7.json")
R0 = J("R0.json")
VER = J("verdict.json")
FI = J("fig_inputs.json")
ATT = pd.read_csv(os.path.join(KR, "attrition.csv"))
K1V = pd.read_csv(os.path.join(KR, "K1_variants.csv"))
SPEC = pd.read_csv(os.path.join(MV, "specs.csv"))

print("building data/")

# ----------------------------------------------------------------------------- headline
S = D0["S1d"]
C = S["components"]
NULL = D0["null"]
G = K1["descriptive"]["K1G"]
X1 = K1["primary"]["X1L"]
X2 = K1["primary"]["X2L"]
K2b = K2["K2b"]
K2c = K2["K2c"]

est = SPEC.estimate_pp.to_numpy()
below = int((SPEC.hi_pp < 0).sum())
above = int((SPEC.lo_pp > 0).sum())
span = int(len(SPEC) - below - above)

headline = {
    "n_apps": S["n_apps"],
    "gap_today": r(S["gaps_adj_pp"]["Ca"]),
    "gap_published": r(S["gaps_adj_pp"]["Pa"]),
    "gap_today_inv": r(S["gaps_adj_pp"]["Ci"]),
    "gap_published_inv": r(S["gaps_adj_pp"]["Pi"]),
    "contrast": r(C["Pub"]["estimate"]), "contrast_ci": [r(v) for v in C["Pub"]["ci95"]],
    "shapley_vintage": r(C["V_S"]["estimate"]), "shapley_vintage_ci": [r(v) for v in C["V_S"]["ci95"]],
    "shapley_type": r(C["T_S"]["estimate"]), "shapley_type_ci": [r(v) for v in C["T_S"]["ci95"]],
    "shapley_type_p": C["T_S"]["p_wcr"],
    "vintage_all": r(C["V_all"]["estimate"]), "vintage_all_ci": [r(v) for v in C["V_all"]["ci95"]],
    "vintage_inv": r(C["V_inv"]["estimate"]), "vintage_inv_ci": [r(v) for v in C["V_inv"]["ci95"]],
    "null_all": r(NULL["V_all"]["V0"]), "excess_all": r(NULL["V_all"]["XV"]),
    "null_inv": r(NULL["V_inv"]["V0"]), "excess_inv": r(NULL["V_inv"]["XV"]),
    "excess_p": NULL["V_all"]["p_perm"],
    "k1_beta": r(X1["beta"] * 100), "k1_ci90": [r(v * 100) for v in X1["ci90"]],
    "k1_band": r(X1["sesoi"] * 100), "k1_base": r(X1["mean_y"] * 100, 2), "k1_n": X1["n"],
    "k1_n_defined": K1["n_K1"],
    "k1_pair_beta": r(X2["beta"] * 100), "k1_pair_ci90": [r(v * 100) for v in X2["ci90"]],
    "k1_pair_band": r(X2["sesoi"] * 100), "k1_pair_base": r(X2["mean_y"] * 100, 2),
    "grant_n": G["n"],
    "new_pairs_pub": r(G["mean_nn_P"], 2), "new_pairs_grant": r(G["mean_nn_G"], 2),
    "new_pairs_today": r(G["mean_nn_C"], 2),
    "share_at_grant": r(G["share_of_change_at_grant"], 4),
    "k2b_beta": r(K2b["beta"] * 100), "k2b_ci95": [r(v * 100) for v in K2b["ci95"]],
    "k2b_band": r(K2b["sesoi"] * 100), "k2b_base": r(K2b["mean_y"] * 100, 2), "k2b_n": K2b["n"],
    "k2b_holm_p": VER["holm_verdict_family"]["K2b"],
    "k2c_beta": r(K2c["beta"] * 100), "k2c_ci95": [r(v * 100) for v in K2c["ci95"]],
    "k2c_band": r(K2c["sesoi"] * 100), "k2c_n": K2c["n"], "k2c_p": K2c["p_wcr"],
    "spec_n": int(len(SPEC)), "spec_min": r(est.min()), "spec_max": r(est.max()),
    "spec_median": r(float(np.median(est))),
    "spec_below": below, "spec_span": span, "spec_above": above,
    "verdict": VER["verdict"],
}

prov("Applications in the primary sample", S["n_apps"], "D0.json", "S1d.n_apps", "833,267",
     "first filings filed 2015 to 2018, disposed, published before their decision")
prov("Grant gap, record today", S["gaps_adj_pp"]["Ca"], "D0.json", "S1d.gaps_adj_pp.Ca", "+3.53pp", "S1d")
prov("Grant gap, record as published", S["gaps_adj_pp"]["Pa"], "D0.json", "S1d.gaps_adj_pp.Pa", "-.60pp", "S1d")
prov("Grant gap, inventional codes today", S["gaps_adj_pp"]["Ci"], "D0.json", "S1d.gaps_adj_pp.Ci", "+2.94pp", "S1d")
prov("Grant gap, inventional codes as published", S["gaps_adj_pp"]["Pi"], "D0.json", "S1d.gaps_adj_pp.Pi", "-.74pp", "S1d")
prov("Published-style contrast", C["Pub"]["estimate"], "D0.json", "S1d.components.Pub.estimate", "+4.27pp [+3.33, +5.28]", "S1d")
prov("Shapley contribution, vintage", C["V_S"]["estimate"], "D0.json", "S1d.components.V_S.estimate", "+3.90pp [+3.24, +4.63]", "S1d")
prov("Shapley contribution, code type", C["T_S"]["estimate"], "D0.json", "S1d.components.T_S.estimate", "+.37pp [-.04, +.78], p .0801", "S1d")
prov("Vintage difference, all code types", C["V_all"]["estimate"], "D0.json", "S1d.components.V_all.estimate", "+4.13pp [+3.39, +4.95]", "S1d")
prov("Vintage difference, inventional codes", C["V_inv"]["estimate"], "D0.json", "S1d.components.V_inv.estimate", "+3.68pp [+3.06, +4.34]", "S1d")
prov("Outcome-blind null, all code types", NULL["V_all"]["V0"], "D0.json", "null.V_all.V0", "+.34pp", "S1d, 9,999 permutations")
prov("Excess over the null, all code types", NULL["V_all"]["XV"], "D0.json", "null.V_all.XV", "+3.79pp, p .0001", "S1d")
prov("Outcome-blind null, inventional codes", NULL["V_inv"]["V0"], "D0.json", "null.V_inv.V0", "+.33pp", "S1d")
prov("Excess over the null, inventional codes", NULL["V_inv"]["XV"], "D0.json", "null.V_inv.XV", "+3.35pp", "S1d")
prov("Post-decision code, granted minus never granted", X1["beta"], "K1.json", "primary.X1L.beta", "+.40pp on a base of 13.87%", "K1, n 821,647")
prov("Post-decision code, 90% interval", X1["ci90"], "K1.json", "primary.X1L.ci90", "[+.155, +.652]", "K1")
prov("Post-decision code, equivalence band", X1["sesoi"], "K1.json", "primary.X1L.sesoi", "±1.387pp", "fixed before the tests")
prov("Post-decision new pair, granted minus never granted", X2["beta"], "K1.json", "primary.X2L.beta", "+.66pp on a base of 9.65%", "K1, n 821,647")
prov("Share of a granted record’s change present at grant", G["share_of_change_at_grant"], "K1.json", "descriptive.K1G.share_of_change_at_grant", "52.1%", "656,961 granted with a grant-time record")
prov("Mean new pairs at publication, granted", G["mean_nn_P"], "K1.json", "descriptive.K1G.mean_nn_P", "2.85", "K1G")
prov("Mean new pairs at grant", G["mean_nn_G"], "K1.json", "descriptive.K1G.mean_nn_G", "12.28", "K1G")
prov("Mean new pairs today, granted", G["mean_nn_C"], "K1.json", "descriptive.K1G.mean_nn_C", "20.95", "K1G")
prov("Post-window revision per SD of forward citations", K2b["beta"], "K2.json", "K2b.beta", "+1.55pp [+.88, +2.23]", "K2b, n 611,888")
prov("Post-window revision, equivalence band", K2b["sesoi"], "K2.json", "K2b.sesoi", "±.906pp", "fixed before the tests")
prov("Post-grant revision per SD of market value", K2c["beta"], "K2.json", "K2c.beta", "-.08pp, p .5849", "K2c, n 180,196")
prov("Specifications", int(len(SPEC)), "specs.csv", "row count", "432", "4,257,607 published applications")
prov("Lowest specification estimate", float(est.min()), "specs.csv", "min(estimate_pp)", "-6.46pp", "")
prov("Highest specification estimate", float(est.max()), "specs.csv", "max(estimate_pp)", "+14.42pp", "")
prov("Median specification estimate", float(np.median(est)), "specs.csv", "median(estimate_pp)", "-1.31pp", "")
prov("Intervals entirely below zero", below, "specs.csv", "count(hi_pp < 0)", "190", "")
prov("Intervals spanning zero", span, "specs.csv", "count(lo_pp <= 0 <= hi_pp)", "187", "")
prov("Intervals entirely above zero", above, "specs.csv", "count(lo_pp > 0)", "55", "")
prov("Verdict of the frozen rule", VER["verdict"], "verdict.json", "verdict", "B, partially supported", "")

# propositions and the label the frozen rule gave each test they rest on
L = VER["labels"]
propositions = [
    {"id": "P1", "name": "Vintage",
     "claim": "With documents, outcome and construction rule fixed, a novelty measure built from the current record is more positively associated with the outcome than the same measure built from the record as published.",
     "refuted_by": "a type-matched vintage difference below 1pp",
     "tests": [{"id": "D0", "label": L["D0"], "estimate": headline["vintage_all"], "unit": "pp", "ci": headline["vintage_all_ci"]},
               {"id": "K3a", "label": L["K3a"], "estimate": r(C["VT_S"]["estimate"]), "unit": "pp", "ci": [r(v) for v in C["VT_S"]["ci95"]]}],
     "state": "supported"},
    {"id": "P2", "name": "Outcome dependence",
     "claim": "Revision of a record is related to what happened to that record and not merely later than it.",
     "refuted_by": "in the aggregate, a vintage difference no larger than outcome-blind revision would produce; at the level of the record, an association between provably post-decision information and the decision inside the preregistered equivalence band",
     "tests": [{"id": "EXC", "label": "Support" if VER["EXC"] else "Kill", "estimate": headline["excess_all"], "unit": "pp", "ci": None},
               {"id": "K1", "label": L["K1"], "estimate": headline["k1_beta"], "unit": "pp", "ci": headline["k1_ci90"]},
               {"id": "K4", "label": L["K4"], "estimate": r(K4["K"]["K_pp"]), "unit": "pp", "ci": [r(v) for v in K4["K"]["ci95_pp"]]}],
     "state": "supported in the aggregate, not at the level of the record"},
    {"id": "P3", "name": "Reconstruction",
     "claim": "Part of the revision is related to what the field later made of the invention.",
     "refuted_by": "revision that postdates a closed observation window and is unrelated to the later recognition of the individual record",
     "tests": [{"id": "K2b", "label": L["K2b"], "estimate": headline["k2b_beta"], "unit": "pp per SD", "ci": headline["k2b_ci95"]},
               {"id": "K2c", "label": L["K2c"], "estimate": headline["k2c_beta"], "unit": "pp per SD", "ci": headline["k2c_ci95"]}],
     "state": "supported in one channel only"},
]
headline["propositions"] = propositions
prov("Label of D0", L["D0"], "verdict.json", "labels.D0", "Support", "")
prov("Label of K1", L["K1"], "verdict.json", "labels.K1", "Kill", "")
prov("Label of K2b", L["K2b"], "verdict.json", "labels.K2b", "Support", "")
prov("Label of K2c", L["K2c"], "verdict.json", "labels.K2c", "Kill", "")
prov("Label of K4", L["K4"], "verdict.json", "labels.K4", "Inconclusive", "")
dump("headline.json", headline)

# ----------------------------------------------------------------------------- record timeline
record = {"n": FI["n"], "lanes": {}}
for lane in ("granted", "abandoned"):
    g = FI[lane]
    states = [{"state": "publication", "days": g["days_to_publication"], "new_pairs": r(g["new_pairs_publication"], 3), "codes": r(g["codes_publication"], 3)}]
    if "new_pairs_grant" in g:
        states.append({"state": "grant", "days": g["days_to_grant"], "new_pairs": r(g["new_pairs_grant"], 3), "codes": r(g["codes_grant"], 3)})
    states.append({"state": "today", "days": FI["granted"]["days_to_snapshot"], "new_pairs": r(g["new_pairs_current"], 3), "codes": r(g["codes_current"], 3)})
    record["lanes"][lane] = {
        "n": g["n"], "states": states,
        "events": {"first_action": g["days_to_first_action"], "decision": g["days_to_decision"],
                   "disposition": g["days_to_disposition"], "snapshot": g["days_to_snapshot"]},
    }
record["grant_time"] = {"n": G["n"], "new_pairs": [r(G["mean_nn_P"], 3), r(G["mean_nn_G"], 3), r(G["mean_nn_C"], 3)],
                        "codes": [r(G["mean_codes_P"], 3), r(G["mean_codes_G"], 3), r(G["mean_codes_C"], 3)],
                        "share_at_grant": r(G["share_of_change_at_grant"], 4)}
prov("Never-granted first filings in Figure 2", FI["abandoned"]["n"], "fig_inputs.json", "abandoned.n", "238,669", "")
prov("Granted first filings in Figure 2", FI["granted"]["n"], "fig_inputs.json", "granted.n", "657,428", "")
prov("Mean new pairs today, never granted", FI["abandoned"]["new_pairs_current"], "fig_inputs.json", "abandoned.new_pairs_current", "17.47", "")
prov("Mean codes today, granted against never granted", [FI["granted"]["codes_current"], FI["abandoned"]["codes_current"]], "fig_inputs.json", "granted.codes_current, abandoned.codes_current", "9.45 against 8.48", "")
dump("record.json", record)

# ----------------------------------------------------------------------------- vintage lab
def comp(k):
    c = C[k]
    return {"estimate": r(c["estimate"]), "ci95": [r(v) for v in c["ci95"]], "p": c["p_wcr"]}

vintage = {
    "n": S["n_apps"],
    "cells": {"Ca": r(S["gaps_adj_pp"]["Ca"]), "Ci": r(S["gaps_adj_pp"]["Ci"]),
              "Pa": r(S["gaps_adj_pp"]["Pa"]), "Pi": r(S["gaps_adj_pp"]["Pi"])},
    "raw": {k: {"gap": r(v["gap_pp"]), "n5": v["n5"], "n0": v["n0"], "share5": r(v["share5"], 4), "share0": r(v["share0"], 4)}
            for k, v in S["raw"].items()},
    "components": {k: comp(k) for k in ("V_all", "V_inv", "T_C", "T_P", "Pub", "V_S", "T_S", "VT_S",
                                        "path1_V_all_minus_T_P", "path2_V_inv_minus_T_C")},
    "null": {"all": {"V": r(NULL["V_all"]["V"]), "V0": r(NULL["V_all"]["V0"]), "XV": r(NULL["V_all"]["XV"]), "p": NULL["V_all"]["p_perm"]},
             "inv": {"V": r(NULL["V_inv"]["V"]), "V0": r(NULL["V_inv"]["V0"]), "XV": r(NULL["V_inv"]["XV"]), "p": NULL["V_inv"]["p_perm"]}},
    "normalised": {k: r(v["gap_pp"]) for k, v in D0["normalised_raw"].items()},
    "bins": ["0", "1", "2-4", "5+"],
    "migration": {t: [[r(D0["migration_S1d"][t][a][b], 6) for b in ("0", "1", "2-4", "5+")] for a in ("0", "1", "2-4", "5+")]
                  for t in ("all", "inv")},
}
prov("Top bin today still top bin as published", D0["migration_S1d"]["all"]["5+"]["5+"], "D0.json", "migration_S1d.all.5+.5+", "38.5%", "S1d, all code types")
prov("Top bin today falling to zero as published", D0["migration_S1d"]["all"]["5+"]["0"], "D0.json", "migration_S1d.all.5+.0", "21.9%", "S1d, all code types")
dump("vintage.json", vintage)

# ----------------------------------------------------------------------------- kill tests
def pp100(x):
    return None if x is None else r(x * 100)

K6r = K6["K6r"]
K7b = K7["K7b"]
K7p = K7["K7p"]
ledger = [
    {"id": "R0", "question": "Does the construction reproduce the published pipeline?", "label": "Pass",
     "estimate": None, "ci": None, "band": None, "unit": "", "text": "identical on " + f"{R0['n']:,}" + " documents",
     "file": "R0.json", "key": "pass", "n": R0["n"]},
    {"id": "D0", "question": "Does the vintage move the gap with code type held fixed?", "label": L["D0"],
     "estimate": headline["vintage_all"], "ci": headline["vintage_all_ci"], "band": None, "unit": "pp",
     "text": f"{headline['vintage_all']:+.2f} all types; {headline['vintage_inv']:+.2f} inventional", "file": "D0.json", "key": "S1d.components.V_all", "n": S["n_apps"],
     "second": {"estimate": headline["vintage_inv"], "ci": headline["vintage_inv_ci"], "name": "inventional codes"}},
    {"id": "K3a", "question": "Does vintage explain more of the published contrast than code type?", "label": L["K3a"],
     "estimate": r(C["VT_S"]["estimate"]), "ci": [r(v) for v in C["VT_S"]["ci95"]], "band": None, "unit": "pp",
     "text": "vintage minus type", "file": "D0.json", "key": "S1d.components.VT_S", "n": S["n_apps"]},
    {"id": "K4", "question": "Does the excess rise with exposure to scheme revision?", "label": L["K4"],
     "estimate": r(K4["K"]["K_pp"]), "ci": [r(v) for v in K4["K"]["ci95_pp"]], "band": None, "unit": "pp",
     "text": f"p {K4['K']['p_wcr']:.4f}"[1:] if False else "p " + f"{K4['K']['p_wcr']:.4f}".lstrip("0"), "file": "K4.json", "key": "K.K_pp", "n": None},
    {"id": "K1", "question": "Is provably post-decision information related to the decision?", "label": L["K1"],
     "estimate": headline["k1_beta"], "ci": headline["k1_ci90"], "band": headline["k1_band"], "unit": "pp", "ci_level": 90,
     "text": "both inside the equivalence region", "file": "K1.json", "key": "primary.X1L", "n": X1["n"],
     "second": {"estimate": headline["k1_pair_beta"], "ci": headline["k1_pair_ci90"], "band": headline["k1_pair_band"], "name": "post-decision new pair"}},
    {"id": "K2b", "question": "Does revision after the citation window track later citations?", "label": L["K2b"],
     "estimate": headline["k2b_beta"], "ci": headline["k2b_ci95"], "band": headline["k2b_band"], "unit": "pp per SD",
     "text": "per SD of forward citations", "file": "K2.json", "key": "K2b", "n": K2b["n"]},
    {"id": "K2c", "question": "Does revision after the grant track market value?", "label": L["K2c"],
     "estimate": headline["k2c_beta"], "ci": headline["k2c_ci95"], "band": headline["k2c_band"], "unit": "pp per SD",
     "text": "inside the equivalence region", "file": "K2.json", "key": "K2c", "n": K2c["n"]},
    {"id": "K5a", "question": "Does a measure that cannot be reclassified side with the record as published?", "label": "Exploratory",
     "estimate": r(K5["K5a_adjusted_top_minus_bottom_pp"]["beta"]), "ci": None, "se": r(K5["K5a_adjusted_top_minus_bottom_pp"]["se"]), "band": None, "unit": "pp",
     "text": "adjusted, text novelty top against bottom quintile", "file": "K5.json", "key": "K5a_adjusted_top_minus_bottom_pp.beta", "n": K5["K5a_adjusted_top_minus_bottom_pp"]["n"]},
    {"id": "K6r", "question": "Are unsuccessful records disproportionately omitted first carriers?", "label": L["K6r"],
     "estimate": r(K6r["estimate"]), "ci": [r(v) for v in K6r["ci95"]], "band": r(K6r["sesoi"]), "unit": "new pairs",
     "text": "wrong sign", "file": "K6.json", "key": "K6r.estimate", "n": K6r["n"]},
    {"id": "K7b", "question": "Is descendant zero novelty explained by the family’s own documents?", "label": L["K7b"],
     "estimate": r(K7b["closure"]), "ci": [r(v) for v in K7b["closure_ci95_percentile"]], "band": None, "unit": "closure",
     "text": "share of the descendant gap closed", "file": "K7.json", "key": "K7b.closure", "n": K7b["n_descendants"]},
    {"id": "K7p", "question": "Is that inheritance larger under the current record?", "label": L["K7p"],
     "estimate": pp100(K7p["premium_C_minus_P"]), "ci": [pp100(v) for v in K7p["ci95"]], "band": None, "unit": "pp",
     "text": "precision check not met", "file": "K7.json", "key": "K7p.premium_C_minus_P", "n": K7p["n_units"]},
]
prov("K3a, vintage minus type", C["VT_S"]["estimate"], "D0.json", "S1d.components.VT_S.estimate", "+3.54pp [+2.96, +4.14]", "S1d")
prov("K4, top minus bottom exposure quintile", K4["K"]["K_pp"], "K4.json", "K.K_pp", "+2.20pp, p .0642", "S1d quintiles")
prov("K5a, text novelty gap adjusted", K5["K5a_adjusted_top_minus_bottom_pp"]["beta"], "K5.json", "K5a_adjusted_top_minus_bottom_pp.beta", "-4.27pp", "n 358,438")
prov("K6r, selection into the baseline", K6r["estimate"], "K6.json", "K6r.estimate", "-.057 [-.078, -.037]", "n 3,202,512")
prov("K7b, closure", K7b["closure"], "K7.json", "K7b.closure", ".977 [.959, .992]", "1,550,133 first filings, 428,713 descendants")
prov("K7p, inheritance larger under the current record", K7p["premium_C_minus_P"], "K7.json", "K7p.premium_C_minus_P", "+25.9pp [+22.8, +28.4]", "67,432 units in 30,431 families")
prov("R0, documents reproduced", R0["n"], "R0.json", "n", "1,520,189", "")

SHORT = {
    "unrestricted X1 (includes exposure via grant-time codes)": "unrestricted, any code",
    "unrestricted X2": "unrestricted, new pair",
    "(a) own-disposition window": "own-disposition window",
    "(b) 2015 to 2017 cohorts": "2015 to 2017 cohorts",
    "(c) published before the first examination event": "published pre-examination",
    "(h) published cap of 25 current rows": "published 25-row cap",
    "(f) all filings including continuations": "continuations included",
    "(g) window extended to 2025-01-01": "window to 2025",
    "F0-pre (class x cohort, no novelty bin)": "pre-decision fixed effects",
    "PCT x cohort": "PCT by cohort",
    "M4 foreign priority or PCT": "foreign priority or PCT",
    "M4 neither": "neither priority nor PCT",
    "M3f no later publication lists it as a parent (exploratory)": "never listed as parent",
    "cohort 2013": "cohort 2013", "cohort 2014": "cohort 2014", "cohort 2015": "cohort 2015",
    "cohort 2016": "cohort 2016", "cohort 2017": "cohort 2017",
    "(i) inverse-probability weights (CR1 only)": "inverse-probability weights",
    "(d) logit average marginal effect (class, cohort, exposure dummies)": "logit marginal effect",
    "T_c one year later (2013 to 2016)": "horizon a year later",
}
variants = []
for _, v in K1V.iterrows():
    beta = float(v.beta) * 100
    se = None if pd.isna(v.se_cr1_field) else float(v.se_cr1_field) * 100
    variants.append({
        "label": SHORT.get(v.label, v.label), "full": v.label, "n": int(v.n), "beta": r(beta, 5),
        "lo": None if se is None else r(beta - 1.645 * se), "hi": None if se is None else r(beta + 1.645 * se),
        "band": None if pd.isna(v.sesoi) else r(float(v.sesoi) * 100),
        "base": None if pd.isna(v.mean_y) else r(float(v.mean_y) * 100, 2),
        "p": None if pd.isna(v.p_decide) else float(v.p_decide),
    })
prov("K1 variants", len(variants), "K1_variants.csv", "row count", "21", "")
dump("killtests.json", {"ledger": ledger, "variants": variants,
                        "counterfactual": {k: r(v["gap_pp"]) for k, v in K1["descriptive"]["K1C"].items()},
                        "k2b_variants": [{"label": v["label"], "beta": r(v["beta"] * 100)} for v in K2["K2b_robustness"]],
                        "exposure": {k: {"n": v["n"], "gap": r(v["Delta_g"]), "null": r(v["Delta_g0"]), "excess": r(v["XV"])}
                                     for k, v in K4["groups"].items()},
                        "verdict": VER["verdict"], "holm": VER["holm_verdict_family"]})
prov("Grant gap after removing post-disposition codes", K1["descriptive"]["K1C"]["C_all minus post-disposition codes"]["gap_pp"], "K1.json", "descriptive.K1C", "+5.46pp from +6.16pp", "SK subset, not S1d")
prov("Grant gap after removing random codes", K1["descriptive"]["K1C"]["C_all minus random codes (benchmark)"]["gap_pp"], "K1.json", "descriptive.K1C", "+5.56pp", "SK subset")
prov("Excess with no exposure to scheme revision", K4["groups"]["G0"]["XV"], "K4.json", "groups.G0.XV", "+4.11pp", "327,152 applications")

# ----------------------------------------------------------------------------- multiverse
FORKS = ["measure", "sample", "era", "threshold", "controls", "fields"]
levels = {
    "measure": ["granted_current", "full_current", "shallow_atissue", "full_atissue"],
    "sample": ["all", "first_filings"], "era": ["2005-2018", "2013-2018"],
    "threshold": ["5plus_vs_0", "any_vs_0", "count_quartile_4_vs_1", "share_decile_10_vs_1"],
    "controls": ["raw", "log_codes", "year_field_fe"], "fields": ["all", "software", "non_software"],
}
for f in FORKS:
    assert set(levels[f]) == set(SPEC[f].unique()), f
idx = {f: {v: i for i, v in enumerate(levels[f])} for f in FORKS}
rows = []
for _, s in SPEC.sort_values("estimate_pp").iterrows():
    rows.append([r(s.estimate_pp), r(s.lo_pp), r(s.hi_pp), int(s.n), r(s.grant_control, 4),
                 *[idx[f][s[f]] for f in FORKS],
                 int(bool(s.literature_default)) + 2 * int(bool(s.paper_preferred))])

# leverage: the largest median absolute change from swapping two levels of one choice, all else fixed
leverage = {}
for f in FORKS:
    others = [g for g in FORKS if g != f]
    best = 0.0
    for a, b in itertools.combinations(levels[f], 2):
        A = SPEC[SPEC[f] == a].set_index(others).estimate_pp
        B = SPEC[SPEC[f] == b].set_index(others).estimate_pp
        j = A.to_frame("a").join(B.to_frame("b"), how="inner")
        if len(j):
            best = max(best, float((j.a - j.b).abs().median()))
    leverage[f] = r(best)
prov("Leverage of the novelty measure", leverage["measure"], "specs.csv", "median |swap| over matched pairs", "3.2", "")
prov("Leverage of filings included", leverage["sample"], "specs.csv", "median |swap| over matched pairs", "3.1", "")
prov("Leverage of the control set", leverage["controls"], "specs.csv", "median |swap| over matched pairs", "3.1", "")

vint = {"granted_current": "current", "full_current": "current", "shallow_atissue": "published", "full_atissue": "published"}
dump("multiverse.json", {
    "forks": FORKS, "levels": levels,
    "names": {"measure": "Novelty measure", "sample": "Filings included", "era": "Filing window",
              "threshold": "Novelty cut", "controls": "Control set", "fields": "Field restriction"},
    "labels": {
        "measure": {"granted_current": "granted-patent baseline, record today",
                    "full_current": "full baseline, record today",
                    "shallow_atissue": "as-published baseline, record as published",
                    "full_atissue": "full baseline, record as published"},
        "sample": {"all": "all filings", "first_filings": "first filings"},
        "era": {"2005-2018": "2005 to 2018", "2013-2018": "2013 to 2018"},
        "threshold": {"5plus_vs_0": "5+ new pairs against 0", "any_vs_0": "any new pair against 0",
                      "count_quartile_4_vs_1": "top against bottom quartile of the count",
                      "share_decile_10_vs_1": "top against bottom decile of the share"},
        "controls": {"raw": "raw difference", "log_codes": "log code count",
                     "year_field_fe": "filing year by field fixed effects and code count"},
        "fields": {"all": "all fields", "software": "software-exposed fields", "non_software": "other fields"},
    },
    "vintage_of_measure": vint,
    "columns": ["estimate", "lo", "hi", "n", "grant_control"] + FORKS + ["flag"],
    "rows": rows,
    "leverage": leverage,
    "population": 4257607,
    "flags": {"1": "the specification closest to published practice", "2": "record as published, breadth controlled"},
})
lit = SPEC[SPEC.literature_default].iloc[0]
pref = SPEC[SPEC.paper_preferred].iloc[0]
prov("Specification closest to published practice", float(lit.estimate_pp), "specs.csv", "literature_default", "+.31pp [-2.15, +2.77]", "")
prov("Record as published, breadth controlled", float(pref.estimate_pp), "specs.csv", "paper_preferred", "-4.09pp [-5.08, -3.10]", "")

# ----------------------------------------------------------------------------- reading rule (sections 8.2 and 8.3 of the paper)
rule = {
    "questions": [
        {"id": "versioned", "text": "Is the record versioned? Does the keeper keep superseded states, or only the current snapshot?",
         "options": [["yes", "Versioned"], ["no", "Only the current state"], ["unknown", "Not known"]]},
        {"id": "dated", "text": "Are the categories dated? Does each category carry the date it came into existence, and does each assignment carry the date it was made?",
         "options": [["both", "Categories and assignments"], ["categories", "Categories only"], ["neither", "Neither"]]},
        {"id": "coupled", "text": "Is the writing coupled to the outcome? Is the record completed, reviewed or enriched on the schedule of the outcome it is later used to explain?",
         "options": [["yes", "Coupled"], ["no", "Written independently of the outcome"], ["unknown", "Not known"]]},
        {"id": "join", "text": "Is a second vintage a join? Can two versions of the same records be read side by side without a new data collection?",
         "options": [["yes", "A join"], ["no", "A new collection"], ["unknown", "Not known"]]},
    ],
    "asks": [
        {"id": "when", "order": 1, "cost": "cheapest",
         "text": "Ask when the measure was written, not only what it says: whether the categories and assignments existed at the event they are dated to."},
        {"id": "two", "order": 2, "cost": "a join",
         "text": "If the artefact is versioned, read two versions and state which one an estimate comes from; a second version is a join, not a new data collection."},
        {"id": "coupling", "order": 3, "cost": "a question about the keeper",
         "text": "If it is not versioned, ask whether the writing is coupled to the outcome, because coupling, not revision, does the damage."},
    ],
    "report": [
        {"id": "breadth", "text": "A count of first-time pairs also counts how broadly a document has been classified, itself a product of maintenance, so breadth belongs in the reported model."},
        {"id": "level", "text": "A level read from the current record moves by more than its own size across defensible states of the record, whereas a difference can remove a component common to both its sides, a protection argued here, not demonstrated."},
        {"id": "vintage", "text": "State which state of the record each estimate is read from."},
    ],
    "keeper": [
        {"id": "date", "text": "Date assignments, so that the timing of a category on a record is recorded rather than proved from the category’s own validity date."},
        {"id": "keep", "text": "Keep superseded states as first-class objects rather than by-products of a snapshot."},
        {"id": "accuracy", "text": "Accuracy is a separate question from vintage; the two defects need different remedies, and only the undated one is this paper’s subject."},
    ],
    "not_to_conclude": "The current version is not wrong. It is a record maintained for the work of the present, and it does that job. The error is reading it as a history without saying at which date it is read.",
}
dump("rule.json", rule)

# ----------------------------------------------------------------------------- verify
lock = open(os.path.join(KT, "PREREG_LOCK.txt"), encoding="utf-8").read()
m = re.search(r"([0-9a-f]{64})\s+theory_kill_tests_preregistered\.md", lock)
frozen = re.search(r"Frozen at ([0-9-]+ [0-9:]+)", lock)
attrition = [{"sample": a.sample, "rule": a.rule, "n": int(a.n)} for a in ATT.itertuples()]
verify = {
    "prereg": {"frozen_at": frozen.group(1) if frozen else None,
               "sha256_prefix": m.group(1)[:16] if m else None,
               "file": "theory_kill_tests_preregistered.md",
               "lock_file": "PREREG_LOCK.txt"},
    "sources": [
        {"name": "PatentsView, granted patents and pre-grant publications", "url": "https://doi.org/10.5281/zenodo.15783125",
         "gives": "classification at issue and current, WIPO fields, related documents"},
        {"name": "USPTO Patent Examination Research Dataset (PatEx)", "url": "https://www.uspto.gov/ip-policy/economic-research/research-datasets/patent-examination-research-dataset-public-pair",
         "gives": "prosecution events, the grant and the terminal abandonment dated to the day"},
        {"name": "Cooperative Patent Classification, scheme and validity files", "url": "https://www.cooperativepatentclassification.org/cpcSchemeAndDefinitions/bulk",
         "gives": "the validity date of every symbol, lineage of revised symbols"},
        {"name": "KPSS patent market values", "url": "https://github.com/KPSS2017/Technological-Innovation-Resource-Allocation-and-Growth-Extended-Data",
         "gives": "stock-market value of patent grants (K2c)"},
    ],
    "replication": "Replication package: Zenodo record to follow",
    "attrition": attrition,
    "samples": {"S1d": S["n_apps"], "SK": K1["n_SK"], "K1": K1["n_K1"], "K2b": K2b["n"], "K2c": K2c["n"]},
}
dump("verify.json", verify)
dump("provenance.json", {"items": PROV})

print(f"done, {len(PROV)} provenance items")
