(function(global) {
  'use strict';
  var D = global.D, P = D.P;
  var UNIT = {
    pp: 'pp',
    'pp per SD': 'pp per SD',
    'new pairs': 'new pairs per first filing',
    closure: 'share of the gap closed',
    '': ''
  };
  var TONE = {
    Support: P.survives,
    Kill: P.killed,
    Inconclusive: P.charcoal,
    Exploratory: P.charcoal,
    Pass: P.survives
  };
  var SORTS = [ 'order', 'estimate' ];
  var SHORT = {
    R0: 'Construction reproduces the published pipeline?',
    D0: 'Vintage moves the gap, code type fixed?',
    K3a: 'Vintage explains more than code type?',
    K4: 'Excess rises with exposure to revision?',
    K1: 'Post-decision information related to the decision?',
    K2b: 'Late revision tracks later citations?',
    K2c: 'Post-grant revision tracks market value?',
    K5a: 'Unreclassifiable measure sides with published record?',
    K6r: 'Unsuccessful records omitted as first carriers?',
    K7b: 'Descendant zero novelty from own family documents?',
    K7p: 'Inheritance larger under the current record?'
  };
  var Kill = {
    data: null,
    rows: [],
    vrows: [],
    vsort: 'order',
    tour: null,
    keys: null,
    enter: function() {
      if (this.tour) this.tour.start();
    },
    leave: function() {
      if (this.tour) this.tour.stop();
    },
    init: function(data) {
      this.data = data;
      var self = this;
      this.keys = D.keys(document.getElementById('variantkeys'), [ {
        id: 'order',
        label: 'file order',
        on: true,
        tone: 'neutral'
      }, {
        id: 'estimate',
        label: 'by estimate',
        on: false,
        tone: 'neutral'
      } ], {
        mode: 'one',
        onChange: function(s, id) {
          self.tour.pause();
          self.tour.go(SORTS.indexOf(id));
        }
      });
      this.renderLedger();
      this.tour = global.Tour.make({
        steps: SORTS.length,
        dwell: 6e3,
        stage: document.getElementById('variantstage'),
        ctl: document.getElementById('variantctl'),
        onStep: function(i) {
          self.vsort = SORTS[i];
          self.keys.select(self.vsort);
          self.renderVariants();
        }
      });
      global.addEventListener('resize', D.debounce(function() {
        self.renderLedger();
        self.renderVariants();
      }));
      D.hover(document.getElementById('ledgercanvas'), function(x, y) {
        return self.hitLedger(x, y);
      });
      D.hover(document.getElementById('variantcanvas'), function(x, y) {
        return self.hitVariant(x, y);
      });
      document.getElementById('ledgernote').textContent = 'Each row on its own scale, zero marked; shading is the preregistered equivalence region where the test has one. 95% intervals except K1, 90%; K5a carries a standard error, R0 is a reproduction gate. Table III of the article. Verdict of the frozen rule: ' + data.verdict + ', partially supported.';
      document.getElementById('variantnote').textContent = 'K1 asks whether a symbol whose validity date postdates the cohort horizon, so could not have been on the record at the decision, is more often found on granted records. 90% cluster-robust intervals on 35 fields; the equivalence region is ±10% of the base rate. The logit row has no interval. Figure 4(b) of the article.';
    },
    renderLedger: function() {
      var d = this.data, self = this;
      var canvas = document.getElementById('ledgercanvas');
      var w0 = canvas.parentNode.clientWidth || 800;
      var narrow = w0 < 700;
      var rowH = narrow ? 74 : 44;
      var n = d.ledger.length;
      var box = D.fit(canvas, n * rowH + 16);
      var ctx = box.ctx, w = box.w;
      var qx = narrow ? 8 : 150, qw = narrow ? w - 16 : Math.round(w * .33);
      var axL = narrow ? 70 : qx + qw + 18, axR = w - (narrow ? 8 : 180);
      this.rows = [];
      d.ledger.forEach(function(t, i) {
        var y0 = 8 + i * rowH;
        var y = narrow ? y0 + 56 : y0 + rowH / 2;
        var ytxt = narrow ? y0 + 12 : y;
        if (i % 2 === 0) {
          ctx.fillStyle = P.faint;
          ctx.fillRect(0, y0, w, rowH);
        }
        D.text(ctx, t.id, narrow ? 8 : 10, ytxt, {
          size: 12.5,
          weight: '600'
        });
        self.chip(ctx, t.label, narrow ? 50 : 60, ytxt);
        var lines = D.wrap(ctx, self.shortQ(t), narrow ? w - 150 : qw, 11.5);
        if (narrow) {
          lines.forEach(function(ln, j) {
            D.text(ctx, ln, 140, ytxt + j * 13, {
              size: 11,
              color: P.charcoal
            });
          });
        } else {
          lines.forEach(function(ln, j) {
            D.text(ctx, ln, qx, y + (j - (lines.length - 1) / 2) * 13, {
              size: 11.5,
              color: P.charcoal
            });
          });
        }
        var span = 0;
        if (t.estimate !== null) span = Math.abs(t.estimate);
        if (t.ci) span = Math.max(span, Math.abs(t.ci[0]), Math.abs(t.ci[1]));
        if (t.band) span = Math.max(span, t.band);
        if (t.se) span = Math.max(span, Math.abs(t.estimate) + 2 * t.se);
        if (t.second && t.second.ci) span = Math.max(span, Math.abs(t.second.ci[0]), Math.abs(t.second.ci[1]));
        span = span * 1.15 || 1;
        var x = D.scale(-span, span, axL, axR);
        if (t.id === 'K7b') x = D.scale(0, 1.05, axL, axR);
        if (t.id === 'K7p') x = D.scale(-5, span, axL, axR);
        if (t.band) D.band(ctx, x(-t.band), x(t.band), y - 10, y + 10, P.band, P.killed);
        D.hline(ctx, y, axL, axR, P.grid, 1);
        D.vline(ctx, x(0), y - 12, y + 12, P.spine, 1.2);
        var col = TONE[t.label] || P.charcoal;
        if (t.estimate !== null) {
          if (t.ci) D.hline(ctx, y, x(t.ci[0]), x(t.ci[1]), col, 2.2);
          if (t.se) D.hline(ctx, y, x(t.estimate - 1.96 * t.se), x(t.estimate + 1.96 * t.se), col, 1.2, [ 3, 3 ]);
          D.dot(ctx, x(t.estimate), y, 5, col, '#fff', 1);
          if (t.second && t.second.ci) {
            D.hline(ctx, y + 7, x(t.second.ci[0]), x(t.second.ci[1]), col, 1.2);
            D.dot(ctx, x(t.second.estimate), y + 7, 3, '#fff', col, 1.2);
          }
        }
        var dd = t.id === 'K6r' ? 3 : t.id === 'K7p' ? 1 : 2;
        var est = t.estimate === null ? t.text : D.pp(t.estimate, dd) + (t.ci ? ' ' + D.ci(t.ci, dd) : '');
        if (t.unit === 'closure' && t.ci) est = D.dec(t.estimate, 3) + ' [' + D.dec(t.ci[0], 3) + ', ' + D.dec(t.ci[1], 3) + ']';
        if (!narrow) D.text(ctx, est, w - 8, y, {
          size: 11.5,
          align: 'right'
        }); else D.text(ctx, est, w - 8, y0 + 38, {
          size: 10.5,
          align: 'right'
        });
        self.rows.push({
          y0: y0,
          y1: y0 + rowH,
          t: t
        });
      });
    },
    shortQ: function(t) {
      return SHORT[t.id] || t.question;
    },
    chip: function(ctx, label, x, y) {
      var fills = {
        Support: P.tintSurvives,
        Kill: P.tintNeutral,
        Inconclusive: P.tintEarlier,
        Exploratory: P.faint,
        Pass: P.tintSurvives
      };
      ctx.save();
      ctx.font = '10.5px ' + D.FONT;
      var tw = ctx.measureText(label).width + 14;
      ctx.fillStyle = fills[label] || P.faint;
      ctx.fillRect(x, y - 8, tw, 16);
      if (label === 'Exploratory') {
        ctx.strokeStyle = P.grid;
        ctx.strokeRect(x + .5, y - 7.5, tw, 16);
      }
      ctx.restore();
      D.text(ctx, label, x + 7, y, {
        size: 10.5,
        color: '#000'
      });
    },
    hitLedger: function(x, y) {
      var row = null;
      this.rows.forEach(function(r) {
        if (y >= r.y0 && y < r.y1) row = r;
      });
      if (!row) return null;
      var t = row.t;
      var est = t.estimate === null ? t.text : (t.unit === 'closure' ? D.dec(t.estimate, 3) : D.pp(t.estimate, t.id === 'K6r' ? 3 : 2)) + (t.unit && t.unit !== 'closure' ? ' ' + UNIT[t.unit] : '');
      var html = '<b>' + t.id + '</b> <span class="chip ' + t.label + '">' + t.label + '</span><br>' + t.question + '<br><span class="num">' + est + '</span>';
      if (t.ci) html += ' ' + (t.unit === 'closure' ? '[' + D.dec(t.ci[0], 3) + ', ' + D.dec(t.ci[1], 3) + ']' : D.ci(t.ci, t.id === 'K6r' ? 3 : 2)) + (t.ci_level ? ', 90% interval' : '');
      if (t.se) html += ', standard error ' + D.dec(t.se, 2);
      if (t.band) html += '<br>equivalence region ±' + D.dec(t.band, 3);
      if (t.second) html += '<br>' + t.second.name + ': ' + D.pp(t.second.estimate) + (t.second.ci ? ' ' + D.ci(t.second.ci) : '');
      if (t.text && t.estimate !== null) html += '<br>' + t.text;
      if (t.n) html += '<br>n ' + D.num(t.n);
      html += '<br><span style="color:#3b3b3b">' + t.file + ' ' + t.key + '</span>';
      return html;
    },
    renderVariants: function() {
      var d = this.data, self = this;
      var rows = d.variants.slice();
      if (this.vsort === 'estimate') rows.sort(function(a, b) {
        return a.beta - b.beta;
      });
      var canvas = document.getElementById('variantcanvas');
      var w0 = canvas.parentNode.clientWidth || 800;
      var narrow = w0 < 600;
      var rowH = narrow ? 24 : 21;
      var top = 8, bottom = top + rows.length * rowH;
      var box = D.fit(canvas, bottom + 50);
      var ctx = box.ctx, w = box.w;
      var L = narrow ? 8 : 200, R = 56;
      var axL = narrow ? 8 : L, axR = w - R;
      var x = D.scale(-1.6, 1.6, axL, axR);
      this.vrows = [];
      rows.forEach(function(v, i) {
        var y = top + (i + .5) * rowH;
        if (v.band) D.band(ctx, x(-v.band), x(v.band), y - rowH / 2, y + rowH / 2, P.band, null);
        self.vrows.push({
          y0: y - rowH / 2,
          y1: y + rowH / 2,
          v: v
        });
      });
      D.axisX(ctx, x, top, bottom, [ -1.5, -1, -.5, 0, .5, 1, 1.5 ], function(t) {
        return t === 0 ? '0' : D.pp(t, 1);
      }, 'granted minus never granted, percentage points', {
        grid: true
      });
      D.vline(ctx, x(0), top, bottom, P.spine, 1.2);
      rows.forEach(function(v, i) {
        var y = top + (i + .5) * rowH;
        var inside = v.lo !== null && v.band !== null && v.lo > -v.band && v.hi < v.band;
        var col = v.lo === null ? P.charcoal : inside ? P.charcoal : P.current;
        if (!narrow) D.text(ctx, v.label, L - 10, y, {
          size: 11.5,
          align: 'right'
        }); else D.text(ctx, v.label, axL + 4, y - 7, {
          size: 10,
          color: P.charcoal
        });
        if (v.lo !== null) D.hline(ctx, y, x(v.lo), x(v.hi), col, 1.6);
        D.dot(ctx, x(v.beta), y, v.lo === null ? 3 : 4, col, '#fff', 1);
        D.text(ctx, D.pp(v.beta), w - 8, y, {
          size: 11,
          align: 'right'
        });
      });
      if (!narrow) D.text(ctx, 'equivalence region', x(-1.55), top + 10, {
        size: 10.5,
        color: P.charcoal
      });
    },
    hitVariant: function(x, y) {
      var row = null;
      this.vrows.forEach(function(r) {
        if (y >= r.y0 && y < r.y1) row = r;
      });
      if (!row) return null;
      var v = row.v;
      var html = '<b>' + v.label + '</b><br><span style="color:#3b3b3b">' + v.full + '</span><br><span class="num">' + D.pp(v.beta) + 'pp</span>';
      if (v.lo !== null) html += ' [' + D.pp(v.lo) + ', ' + D.pp(v.hi) + '], 90% interval';
      if (v.base !== null) html += '<br>base rate ' + D.dec(v.base) + '%';
      if (v.band !== null) html += ', equivalence region ±' + D.dec(v.band, 3);
      if (v.p !== null) html += '<br>' + D.pval(v.p);
      html += '<br>n ' + D.num(v.n);
      return html;
    }
  };
  global.Kill = Kill;
})(window);