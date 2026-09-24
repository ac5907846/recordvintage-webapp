(function(global) {
  'use strict';
  var D = global.D;
  function near(a, b, tol) {
    return Math.abs(a - b) <= (tol || .0015);
  }
  var Verify = {
    init: function(data) {
      var prov = data.provenance, verify = data.verify, h = data.headline, v = data.vintage, mv = data.multiverse;
      this.recompute(h, v, mv);
      this.provTable(prov, verify);
      this.sources(verify);
    },
    recompute: function(h, v, mv) {
      var rows = [];
      var Ca = v.cells.Ca, Ci = v.cells.Ci, Pa = v.cells.Pa, Pi = v.cells.Pi;
      var Vall = Ca - Pa, Vinv = Ci - Pi, Tc = Ca - Ci, Tp = Pa - Pi, Pub = Ca - Pi;
      var shV = (Vall + Vinv) / 2, shT = (Tc + Tp) / 2;
      rows.push([ 'vintage difference, all types, Ca minus Pa', Vall, h.vintage_all, 'pp' ]);
      rows.push([ 'vintage difference, inventional, Ci minus Pi', Vinv, h.vintage_inv, 'pp' ]);
      rows.push([ 'published-style contrast, Ca minus Pi', Pub, h.contrast, 'pp' ]);
      rows.push([ 'Shapley vintage, mean of the two orderings', shV, h.shapley_vintage, 'pp' ]);
      rows.push([ 'Shapley code type, mean of the two orderings', shT, h.shapley_type, 'pp' ]);
      rows.push([ 'Shapley parts sum to the contrast', shV + shT, Pub, 'pp' ]);
      rows.push([ 'vintage share of the contrast', shV / Pub, h.shapley_vintage / h.contrast, 'share' ]);
      rows.push([ 'excess over the null, V minus V0', v.null.all.V - v.null.all.V0, h.excess_all, 'pp' ]);
      rows.push([ 'excess over the null, inventional', v.null.inv.V - v.null.inv.V0, h.excess_inv, 'pp' ]);
      rows.push([ 'share of a granted record’s change at the grant', (h.new_pairs_grant - h.new_pairs_pub) / (h.new_pairs_today - h.new_pairs_pub), h.share_at_grant, 'share' ]);
      rows.push([ 'K1 interval inside its equivalence band', h.k1_ci90[0] > -h.k1_band && h.k1_ci90[1] < h.k1_band ? 1 : 0, 1, 'flag' ]);
      rows.push([ 'K2b interval clears its equivalence band on the estimate', h.k2b_beta > h.k2b_band ? 1 : 0, 1, 'flag' ]);
      var c = mv.columns, iE = c.indexOf('estimate'), iL = c.indexOf('lo'), iH = c.indexOf('hi'), iM = c.indexOf('measure');
      var est = mv.rows.map(function(r) {
        return r[iE];
      }).sort(function(a, b) {
        return a - b;
      });
      var n = est.length;
      var med = n % 2 ? est[(n - 1) / 2] : (est[n / 2 - 1] + est[n / 2]) / 2;
      rows.push([ 'specifications', n, h.spec_n, 'count' ]);
      rows.push([ 'lowest estimate', est[0], h.spec_min, 'pp' ]);
      rows.push([ 'highest estimate', est[n - 1], h.spec_max, 'pp' ]);
      rows.push([ 'median estimate', med, h.spec_median, 'pp' ]);
      rows.push([ 'intervals below zero', mv.rows.filter(function(r) {
        return r[iH] < 0;
      }).length, h.spec_below, 'count' ]);
      rows.push([ 'intervals spanning zero', mv.rows.filter(function(r) {
        return r[iL] <= 0 && r[iH] >= 0;
      }).length, h.spec_span, 'count' ]);
      rows.push([ 'intervals above zero', mv.rows.filter(function(r) {
        return r[iL] > 0;
      }).length, h.spec_above, 'count' ]);
      rows.push([ 'of those above zero, reading the record as published', mv.rows.filter(function(r) {
        return r[iL] > 0 && mv.vintage_of_measure[mv.levels.measure[r[iM]]] === 'published';
      }).length, 0, 'count' ]);
      var f = 'measure', others = mv.forks.filter(function(g) {
        return g !== f;
      });
      var key = function(r) {
        return others.map(function(g) {
          return r[c.indexOf(g)];
        }).join('|');
      };
      var byLevel = {};
      mv.rows.forEach(function(r) {
        var lv = r[c.indexOf(f)];
        (byLevel[lv] = byLevel[lv] || {})[key(r)] = r[iE];
      });
      var lvls = Object.keys(byLevel), best = 0;
      for (var i = 0; i < lvls.length; i++) for (var j = i + 1; j < lvls.length; j++) {
        var diffs = [];
        Object.keys(byLevel[lvls[i]]).forEach(function(k) {
          if (byLevel[lvls[j]][k] !== undefined) diffs.push(Math.abs(byLevel[lvls[i]][k] - byLevel[lvls[j]][k]));
        });
        diffs.sort(function(a, b) {
          return a - b;
        });
        if (diffs.length) {
          var m = diffs.length % 2 ? diffs[(diffs.length - 1) / 2] : (diffs[diffs.length / 2 - 1] + diffs[diffs.length / 2]) / 2;
          best = Math.max(best, m);
        }
      }
      rows.push([ 'leverage of the novelty measure', best, mv.leverage.measure, 'pp' ]);
      var ok = 0;
      var html = '<div class="blockhead"><h2>Recomputed in the browser</h2></div>' + '<p class="fine">Each row is derived again from data/ in this page and compared with the value the page displays.</p>' + '<div class="tabwrap"><table class="tab"><tr><th>Quantity</th><th class="num">Recomputed</th><th class="num">Displayed</th><th></th></tr>';
      rows.forEach(function(r) {
        var fmt = r[3] === 'pp' ? D.pp : r[3] === 'share' ? function(x) {
          return D.pct(x);
        } : function(x) {
          return String(Math.round(x));
        };
        var tol = r[3] === 'pp' ? .0025 : r[3] === 'share' ? 6e-4 : .5;
        var match = near(r[1], r[2], tol);
        if (match) ok++;
        html += '<tr><td>' + r[0] + '</td><td class="num">' + fmt(r[1]) + '</td><td class="num">' + fmt(r[2]) + '</td><td class="' + (match ? 'match' : 'mismatch') + '">' + (match ? 'match' : 'differs') + '</td></tr>';
      });
      html += '</table></div><p class="fine">' + ok + ' of ' + rows.length + ' match.</p>';
      document.getElementById('verifyrecompute').innerHTML = html;
    },
    provTable: function(prov, verify) {
      var fmtV = function(x) {
        if (Array.isArray(x)) return x.map(fmtV).join(', ');
        if (typeof x === 'number') return Number.isInteger(x) ? D.num(x) : String(Math.round(x * 1e6) / 1e6);
        return String(x);
      };
      var html = '<div class="blockhead"><h2>Where every headline number comes from</h2></div>' + '<p class="prereg">Analysis plan frozen on 21 September 2026 before any test was run; the preregistration file <code>' + verify.prereg.file + '</code> has SHA-256 prefix <code>' + verify.prereg.sha256_prefix + '</code>, recorded in <code>' + verify.prereg.lock_file + '</code> with the hash of every script and construction output. ' + verify.replication + '.</p>' + '<div class="tabwrap"><table class="tab"><tr><th>Number</th><th>Printed</th><th>File</th><th>Key</th><th class="num">Stored value</th><th>Sample</th></tr>';
      prov.items.forEach(function(it) {
        html += '<tr><td>' + it.label + '</td><td>' + it.printed + '</td><td class="mono">' + it.file + '</td><td class="mono">' + it.key + '</td><td class="num">' + fmtV(it.value) + '</td><td>' + (it.sample || '') + '</td></tr>';
      });
      html += '</table></div>';
      html += '<h3>Sample attrition</h3><div class="tabwrap"><table class="tab"><tr><th>Sample</th><th>Rule</th><th class="num">n</th></tr>' + verify.attrition.map(function(a) {
        return '<tr><td class="mono">' + a.sample + '</td><td>' + a.rule + '</td><td class="num">' + D.num(a.n) + '</td></tr>';
      }).join('') + '</table></div>';
      document.getElementById('verifyprov').innerHTML = html;
    },
    sources: function(verify) {
      var html = '<div class="blockhead"><h2>Data sources</h2></div><ul class="srclist">' + verify.sources.map(function(s) {
        return '<li><a href="' + s.url + '" rel="noopener">' + s.name + '</a><span class="gives">' + s.gives + '</span></li>';
      }).join('') + '</ul><p class="fine">' + verify.replication + '.</p>';
      document.getElementById('verifysources').innerHTML = html;
    }
  };
  global.Verify = Verify;
})(window);