/* The landing picture. 432 marks, one per specification in the final stage, step through the
   paper’s argument: the applications and their two dated records, the gap read twice, the Shapley
   split of the contrast, the kill test, the surviving channel, and the 432 specifications. Marks
   morph between stages; every number in the readout comes from data/headline.json and
   data/multiverse.json. */
(function (global) {
  'use strict';

  var D = global.D, M = global.M, P = D.P;
  var N = 432;

  function hexrgb(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  var RGB = { earlier: hexrgb(P.earlier), current: hexrgb(P.current), charcoal: hexrgb(P.charcoal),
    survives: hexrgb(P.survives), killed: hexrgb(P.killed), slate: hexrgb('#7b8290') };

  /* inverse normal, good enough for placing marks along a bell */
  function probit(p) {
    var a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    var b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    var c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    var d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    var q, r;
    if (p < 0.02425) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - 0.02425) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }

  function Hero(els, headline, multiverse) {
    this.els = els;
    this.h = headline;
    this.mv = multiverse;
    this.stage = 0;
    this.enteredAt = 0;
    this.u = 0;
    this.marks = [];
    for (var i = 0; i < N; i++) this.marks.push({ x: 0, y: 0, r: 3, c: RGB.earlier.slice(), a: 0 });
    this.first = true;
    this.specs = this.mv.rows.map(function (r) { return r; });
    var cols = this.mv.columns;
    this.iEst = cols.indexOf('estimate');
    this.iMeasure = cols.indexOf('measure');
    this.stages = this.buildStages();
    this.buildReadout();
    this.layout();
    var self = this;
    global.addEventListener('resize', D.debounce(function () { self.layout(); }));
    els.play.addEventListener('click', function (e) {
      e.stopPropagation();
      if (M.isPaused()) M.resumeAll(); else M.pauseAll();
    });
    D.hover(els.canvas, function (x, y) { return self.hit(x, y); });
  }

  Hero.prototype.narrow = function () { return this.box.w < 520; };

  Hero.prototype.layout = function () {
    var w = this.els.canvas.parentNode.clientWidth || 700;
    var hgt = Math.max(300, Math.min(420, Math.round(w * 0.6)));
    this.box = D.fit(this.els.canvas, hgt);
    this.L = 46; this.R = 18; this.T = 26; this.B = 46;
    this.plot = { x0: this.L, x1: this.box.w - this.R, y0: this.T, y1: this.box.h - this.B };
  };

  /* ------------------------------------------------------------ stage definitions */
  Hero.prototype.buildStages = function () {
    var h = this.h, self = this;
    var vint = this.mv.vintage_of_measure, levels = this.mv.levels.measure;

    return [
      {
        title: 'One record, two dated states',
        lede: 'One classification record per application, read at two of its own dates: as the office published it and as it stands today. The documents, the outcome and the construction rule are held fixed; only the state of the record varies.',
        cells: [
          { v: h.n_apps, f: D.num, lab: 'applications', tone: '' },
          { v: 2, f: function (v) { return String(Math.round(v)); }, lab: 'dated states of one record', tone: '' },
        ],
        targets: function (m, i, u) {
          var p = self.plot, cols = 24, rows = 18;
          var cw = (p.x1 - p.x0) / cols, ch = (p.y1 - p.y0) / rows;
          var c = i % cols, r = Math.floor(i / cols);
          var k = Math.max(0, Math.min(1, (u - 0.35) / 0.35));
          var wave = Math.max(0, Math.min(1, (u * 1.6 - c / cols - 0.2) * 3));
          m.x = p.x0 + (c + 0.5) * cw; m.y = p.y0 + (r + 0.5) * ch;
          m.r = Math.max(2.2, Math.min(cw, ch) * 0.28);
          var col = RGB.earlier;
          m.c[0] = col[0] + (RGB.current[0] - col[0]) * k * wave;
          m.c[1] = col[1] + (RGB.current[1] - col[1]) * k * wave;
          m.c[2] = col[2] + (RGB.current[2] - col[2]) * k * wave;
          m.a = 1;
        },
        overlay: function (ctx, al, u) {
          var p = self.plot;
          D.text(ctx, 'as published', p.x0, p.y0 - 12, { color: P.earlier, size: 12, weight: '600', alpha: al });
          var k = Math.max(0, Math.min(1, (u - 0.35) / 0.35));
          D.text(ctx, 'today', p.x1 - 76, p.y0 - 12, { color: P.current, size: 12, weight: '600', align: 'right', alpha: al * k });
          D.text(ctx, 'same applications, same outcome, same rule', (p.x0 + p.x1) / 2, p.y1 + 18, { size: 11, align: 'center', alpha: al });
        },
      },
      {
        title: 'The same gap, read twice',
        lede: 'The grant gap between applications with five or more new code pairs and none. Neither level carries an interval; what the design identifies is the distance between them, +' + D.dec(h.vintage_all) + ' ' + D.ci(h.vintage_all_ci) + '.',
        cells: [
          { v: h.gap_published, f: D.pp, lab: 'record as published, pp', tone: 'earlier' },
          { v: h.gap_today, f: D.pp, lab: 'record today, pp', tone: 'current' },
          { v: h.n_apps, f: D.num, lab: 'applications', tone: '' },
        ],
        x: function () { return D.scale(-1.5, 4.5, self.plot.x0, self.plot.x1); },
        targets: function (m, i, u) {
          var p = self.plot, x = this.x();
          var k = M.ease(Math.max(0, Math.min(1, (u - 0.28) / 0.42)));
          var cx = x(h.gap_published + (h.gap_today - h.gap_published) * k);
          var cy = (p.y0 + p.y1) / 2;
          var R = Math.min((p.y1 - p.y0) * 0.36, 78);
          var rad = R * Math.sqrt((i + 0.5) / N), ang = i * 2.399963;
          m.x = cx + rad * Math.cos(ang); m.y = cy + rad * Math.sin(ang);
          m.r = Math.max(2.4, R / 22);
          for (var j = 0; j < 3; j++) m.c[j] = RGB.earlier[j] + (RGB.current[j] - RGB.earlier[j]) * k;
          m.a = 1;
        },
        overlay: function (ctx, al, u) {
          var p = self.plot, x = this.x();
          D.axisX(ctx, x, p.y0, p.y1, D.niceTicks(-1, 4, 6), function (t) { return D.pp(t, 0).replace('+0', '0'); }, self.narrow() ? 'grant gap, pp' : 'grant gap, five or more new pairs against none, percentage points');
          D.vline(ctx, x(0), p.y0, p.y1, P.spine, 1.2);
          var cy = (p.y0 + p.y1) / 2, R = Math.min((p.y1 - p.y0) * 0.36, 78);
          var k = M.ease(Math.max(0, Math.min(1, (u - 0.28) / 0.42)));
          D.text(ctx, D.pp(h.gap_published) + ' as published', x(h.gap_published), cy - R - 14, { color: P.earlier, size: 12.5, weight: '600', align: 'center', alpha: al });
          D.text(ctx, D.pp(h.gap_today) + ' today', x(h.gap_today), cy - R - 14, { color: P.current, size: 12.5, weight: '600', align: 'center', alpha: al * k });
          if (k > 0) {
            ctx.save(); ctx.globalAlpha = al * k;
            D.hline(ctx, cy + R + 14, x(h.gap_published), x(h.gap_today), P.neutral, 1.2);
            D.text(ctx, D.pp(h.vintage_all) + ' ' + D.ci(h.vintage_all_ci), (x(h.gap_published) + x(h.gap_today)) / 2, cy + R + 26, { size: 11.5, align: 'center' });
            ctx.restore();
          }
        },
      },
      {
        title: 'Vintage or the counting rule',
        lede: 'The two conventional measures differ in vintage and in the kinds of code they count. Of their contrast, a Shapley decomposition gives the vintage ' + D.pp(h.shapley_vintage) + ' and the counting rule ' + D.pp(h.shapley_type) + ' (' + D.pval(h.shapley_type_p) + '). Outcome-blind revision would move the gap by ' + D.pp(h.null_all) + '; the observed movement exceeds it by ' + D.pp(h.excess_all) + '.',
        cells: [
          { v: h.contrast, f: D.pp, lab: 'published-style contrast, pp', tone: '' },
          { v: h.shapley_vintage, f: D.pp, lab: 'vintage', tone: 'current' },
          { v: h.shapley_type, f: D.pp, lab: 'code type', tone: 'killed' },
          { v: h.null_all, f: D.pp, lab: 'outcome-blind null', tone: '' },
          { v: h.excess_all, f: D.pp, lab: 'excess over the null', tone: '' },
        ],
        x: function () { return D.scale(-0.4, 5.2, self.plot.x0, self.plot.x1); },
        targets: function (m, i, u) {
          var p = self.plot, x = this.x();
          var cols = 48, rows = 9;
          var c = i % cols, r = Math.floor(i / cols);
          var grow = M.ease(Math.max(0, Math.min(1, u / 0.35)));
          var barTop = p.y0 + (p.y1 - p.y0) * 0.16, barH = (p.y1 - p.y0) * 0.38;
          var frac = (c + 0.5) / cols;
          m.x = x(0) + (x(h.contrast) - x(0)) * frac * grow;
          m.y = barTop + (r + 0.5) * (barH / rows);
          m.r = Math.max(2.2, Math.min((x(h.contrast) - x(0)) / cols, barH / rows) * 0.34);
          var pink = frac * h.contrast < h.shapley_vintage;
          var col = pink ? RGB.current : RGB.slate;
          m.c[0] = col[0]; m.c[1] = col[1]; m.c[2] = col[2];
          m.a = frac <= grow + 0.02 ? 1 : 0.15;
        },
        overlay: function (ctx, al, u) {
          var p = self.plot, x = this.x();
          D.axisX(ctx, x, p.y0, p.y1, [0, 1, 2, 3, 4, 5], function (t) { return String(t); }, self.narrow() ? 'contribution, pp' : 'contribution to the contrast, percentage points');
          D.vline(ctx, x(0), p.y0, p.y1, P.spine, 1.2);
          var barTop = p.y0 + (p.y1 - p.y0) * 0.16, barH = (p.y1 - p.y0) * 0.38;
          var grow = M.ease(Math.max(0, Math.min(1, u / 0.35)));
          D.text(ctx, 'record vintage ' + D.pp(h.shapley_vintage), x(h.shapley_vintage / 2), barTop - 12, { color: P.current, size: 12.5, weight: '600', align: 'center', alpha: al * grow });
          D.text(ctx, 'code type ' + D.pp(h.shapley_type), self.narrow() ? p.x1 : x(h.contrast) + 6, barTop - 12, { color: P.charcoal, size: 12, weight: '600', alpha: al * grow, align: self.narrow() ? 'right' : 'left' });
          var k2 = Math.max(0, Math.min(1, (u - 0.45) / 0.25));
          if (k2 > 0) {
            ctx.save(); ctx.globalAlpha = al * k2;
            var y2 = barTop + barH + 40;
            D.hline(ctx, y2, x(0), x(h.vintage_all), P.neutral, 1.4);
            D.vline(ctx, x(h.null_all), y2 - 18, y2 + 8, P.neutral, 1.2, [3, 3]);
            D.text(ctx, 'outcome-blind ' + D.pp(h.null_all), x(h.null_all) + 5, y2 - 12, { size: 11 });
            D.hline(ctx, y2 + 14, x(h.null_all), x(h.vintage_all), P.charcoal, 1);
            D.vline(ctx, x(h.null_all), y2 + 10, y2 + 18, P.charcoal, 1);
            D.vline(ctx, x(h.vintage_all), y2 + 10, y2 + 18, P.charcoal, 1);
            D.text(ctx, self.narrow() ? 'excess ' + D.pp(h.excess_all) + ' over the null' : 'excess ' + D.pp(h.excess_all) + ' over the null, type-matched vintage difference ' + D.pp(h.vintage_all), (x(h.null_all) + x(h.vintage_all)) / 2, y2 + 27, { size: 11, align: 'center' });
            ctx.restore();
          }
        },
      },
      {
        title: 'The decisive test failed',
        lede: 'Information that provably entered the record after the decision is related to the decision, ' + D.pp(h.k1_beta) + 'pp on a base of ' + D.dec(h.k1_base) + '%, but its 90% interval lies inside the equivalence band fixed before the tests: a kill by equivalence. On ' + D.num(h.grant_n) + ' granted records, ' + D.pct(h.share_at_grant) + ' of the change is already present at the grant.',
        cells: [
          { v: h.k1_beta, f: D.pp, lab: 'post-decision code, granted minus never granted, pp', tone: 'killed' },
          { v: h.k1_base, f: function (v) { return D.dec(v) + '%'; }, lab: 'base rate', tone: '' },
          { v: h.share_at_grant, f: D.pct, lab: 'of a granted record’s change present at the grant', tone: '' },
        ],
        x: function () { return D.scale(-1.65, 1.65, self.plot.x0, self.plot.x1); },
        targets: function (m, i, u) {
          var p = self.plot, x = this.x();
          var se = (h.k1_ci90[1] - h.k1_ci90[0]) / (2 * 1.645);
          var z = probit((i + 0.5) / N);
          var top = p.y0 + 4, base = p.y0 + (p.y1 - p.y0) * 0.5;
          var bins = 36, span = 4.4 * se;
          var bin = Math.floor((z + 2.2) / span * bins * se);
          bin = Math.max(0, Math.min(bins - 1, bin));
          if (!this.stack) this.stack = {};
          if (i === 0) this.stack = {};
          var n = this.stack[bin] || 0; this.stack[bin] = n + 1;
          var bw = (x(h.k1_beta + 2.2 * se) - x(h.k1_beta - 2.2 * se)) / bins;
          m.r = Math.max(2, Math.min(bw * 0.42, 3.4));
          m.x = x(h.k1_beta - 2.2 * se) + (bin + 0.5) * bw;
          m.y = base - (n + 0.5) * (m.r * 2.05);
          if (m.y < top) m.y = top;
          m.c[0] = RGB.charcoal[0]; m.c[1] = RGB.charcoal[1]; m.c[2] = RGB.charcoal[2];
          m.a = 1;
        },
        overlay: function (ctx, al, u) {
          var p = self.plot, x = this.x();
          var base = p.y0 + (p.y1 - p.y0) * 0.5;
          D.band(ctx, x(-h.k1_band), x(h.k1_band), p.y0 - 8, base + 6, P.band, P.killed);
          D.axisX(ctx, x, p.y0, base + 6, [-1.5, -1, -0.5, 0, 0.5, 1, 1.5], function (t) { return t === 0 ? '0' : D.pp(t, 1); }, null, { grid: false });
          D.vline(ctx, x(0), p.y0 - 8, base + 6, P.spine, 1.2);
          D.text(ctx, self.narrow() ? 'equivalence region' : 'equivalence region, fixed before the tests', x(-h.k1_band) + 6, p.y0 + 2, { size: 11, alpha: al });
          D.hline(ctx, base + 1, x(h.k1_ci90[0]), x(h.k1_ci90[1]), P.charcoal, 3);
          D.text(ctx, D.pp(h.k1_beta) + ' [' + D.pp(h.k1_ci90[0]) + ', ' + D.pp(h.k1_ci90[1]) + ']' + (self.narrow() ? ', killed' : ', killed by equivalence'), self.narrow() ? (p.x0 + p.x1) / 2 : x(h.k1_beta), base + 38, { size: 12, weight: '600', align: 'center', color: P.charcoal, alpha: al });
          /* the grant-time record: how much of the change is present at the decision */
          var k2 = Math.max(0, Math.min(1, (u - 0.4) / 0.3));
          var yb = p.y1 - 30, hb = 20;
          var xs = D.scale(0, h.new_pairs_today, p.x0 + 40, p.x1 - 10);
          ctx.save(); ctx.globalAlpha = al * k2;
          ctx.fillStyle = P.tintEarlier; ctx.fillRect(xs(0), yb, xs(h.new_pairs_pub) - xs(0), hb);
          ctx.fillStyle = P.tintNeutral; ctx.fillRect(xs(h.new_pairs_pub), yb, (xs(h.new_pairs_grant) - xs(h.new_pairs_pub)) * k2, hb);
          ctx.fillStyle = P.tintCurrent; ctx.fillRect(xs(h.new_pairs_pub) + (xs(h.new_pairs_grant) - xs(h.new_pairs_pub)) * k2, yb, (xs(h.new_pairs_today) - xs(h.new_pairs_pub)) - (xs(h.new_pairs_grant) - xs(h.new_pairs_pub)) * k2, hb);
          ctx.strokeStyle = P.spine; ctx.lineWidth = 1; ctx.strokeRect(xs(0) + 0.5, yb + 0.5, xs(h.new_pairs_today) - xs(0), hb);
          D.text(ctx, 'mean new pairs, granted records', p.x0 + 36, yb - 9, { size: 11, align: 'left' });
          D.text(ctx, D.dec(h.new_pairs_pub), xs(h.new_pairs_pub), yb + hb + 10, { size: 10.5, align: 'center', color: P.earlier });
          D.text(ctx, 'grant ' + D.dec(h.new_pairs_grant), xs(h.new_pairs_grant), yb + hb + 10, { size: 10.5, align: 'center', color: P.charcoal });
          D.text(ctx, 'today ' + D.dec(h.new_pairs_today), xs(h.new_pairs_today), yb + hb + 10, { size: 10.5, align: 'center', color: P.current });
          D.text(ctx, D.pct(h.share_at_grant) + ' at the grant', (xs(h.new_pairs_pub) + xs(h.new_pairs_grant)) / 2, yb + hb / 2, { size: 11, weight: '600', align: 'center', color: '#000' });
          ctx.restore();
        },
      },
      {
        title: 'The channel that survives',
        lede: 'Among ' + D.num(h.k2b_n) + ' granted applications, carrying a symbol introduced after the five-year citation window closed rises by ' + D.pp(h.k2b_beta) + 'pp per standard deviation of forward citations, which accrued before the symbol existed. It is the only channel that supports the reconstructive reading; revision after the grant shows nothing on market value (' + D.pp(h.k2c_beta) + 'pp, killed).',
        cells: [
          { v: h.k2b_beta, f: D.pp, lab: 'pp per SD of later citations', tone: 'survives' },
          { v: h.k2b_n, f: D.num, lab: 'granted applications', tone: '' },
          { v: h.k2c_beta, f: D.pp, lab: 'pp per SD of market value, killed', tone: 'killed' },
        ],
        x: function () { return D.scale(-2.8, 2.8, self.plot.x0, self.plot.x1); },
        targets: function (m, i, u) {
          var p = self.plot, x = this.x();
          var se = (h.k2b_ci95[1] - h.k2b_ci95[0]) / (2 * 1.96);
          var z = probit((i + 0.5) / N);
          var base = p.y0 + (p.y1 - p.y0) * 0.48, bins = 36;
          var bin = Math.max(0, Math.min(bins - 1, Math.floor((z + 2.2) / 4.4 * bins)));
          if (i === 0) this.stack = {};
          var n = this.stack[bin] || 0; this.stack[bin] = n + 1;
          var bw = (x(h.k2b_beta + 2.2 * se) - x(h.k2b_beta - 2.2 * se)) / bins;
          m.r = Math.max(2, Math.min(bw * 0.42, 3.4));
          m.x = x(h.k2b_beta - 2.2 * se) + (bin + 0.5) * bw;
          m.y = Math.max(p.y0 + 4, base - (n + 0.5) * (m.r * 2.05));
          m.c[0] = RGB.survives[0]; m.c[1] = RGB.survives[1]; m.c[2] = RGB.survives[2];
          m.a = 1;
        },
        overlay: function (ctx, al, u) {
          var p = self.plot, x = this.x();
          var base = p.y0 + (p.y1 - p.y0) * 0.48;
          D.band(ctx, x(-h.k2b_band), x(h.k2b_band), p.y0 - 8, base + 6, P.band, P.killed);
          D.text(ctx, 'equivalence region', x(-h.k2b_band) + 6, p.y0 + 2, { size: 11, alpha: al });
          D.vline(ctx, x(0), p.y0 - 8, base + 6, P.spine, 1.2);
          D.hline(ctx, base + 1, x(h.k2b_ci95[0]), x(h.k2b_ci95[1]), P.survives, 3);
          D.text(ctx, D.pp(h.k2b_beta) + ' ' + D.ci(h.k2b_ci95) + (self.narrow() ? ' per SD, supported' : ' per SD of forward citations, supported'), self.narrow() ? (p.x0 + p.x1) / 2 : x(h.k2b_beta), base + 24, { size: 12, weight: '600', align: 'center', color: P.survives, alpha: al });
          /* the companion test on market value, killed */
          var k2 = Math.max(0, Math.min(1, (u - 0.4) / 0.3));
          var y2 = p.y1 - 22;
          ctx.save(); ctx.globalAlpha = al * k2;
          D.band(ctx, x(-h.k2c_band), x(h.k2c_band), y2 - 14, y2 + 14, P.band, P.killed);
          D.hline(ctx, y2, x(h.k2c_ci95[0]), x(h.k2c_ci95[1]), P.killed, 3);
          D.dot(ctx, x(h.k2c_beta), y2, 4.5, P.killed, '#fff', 1);
          D.text(ctx, 'market value ' + D.pp(h.k2c_beta) + (self.narrow() ? ', killed' : ' per SD, killed'), x(h.k2c_ci95[1]) + 10, y2, { size: 11.5, color: P.charcoal });
          ctx.restore();
          D.axisX(ctx, x, p.y1 - 40, p.y1, [-2, -1, 0, 1, 2], function (t) { return t === 0 ? '0' : D.pp(t, 0); }, self.narrow() ? 'revision probability, pp per SD' : 'revision probability, percentage points per standard deviation', { grid: false });
        },
      },
      {
        title: '432 specifications, one estimate',
        lede: 'The same quantity under every defensible combination of six choices, drawn from ' + D.num(this.mv.population) + ' published applications: ' + D.pp(h.spec_min) + 'pp to ' + D.pp(h.spec_max) + 'pp, median ' + D.pp(h.spec_median) + 'pp. ' + h.spec_below + ' intervals lie below zero, ' + h.spec_span + ' span it and ' + h.spec_above + ' lie above it, none of those reading novelty from the record as published.',
        cells: [
          { v: h.spec_n, f: D.num, lab: 'specifications', tone: '' },
          { v: h.spec_min, f: D.pp, lab: 'lowest, pp', tone: '' },
          { v: h.spec_max, f: D.pp, lab: 'highest, pp', tone: '' },
          { v: h.spec_median, f: D.pp, lab: 'median, pp', tone: '' },
        ],
        y: function () { return D.scale(-7.5, 15.5, self.plot.y1, self.plot.y0); },
        targets: function (m, i, u) {
          var p = self.plot, y = this.y();
          var reveal = Math.max(0, Math.min(1, (u - 0.05) / 0.5));
          var row = self.specs[i];
          m.x = p.x0 + 6 + (p.x1 - p.x0 - 12) * (i + 0.5) / N;
          m.y = y(row[self.iEst]);
          m.r = 2.6;
          var v = vint[levels[row[self.iMeasure]]];
          var col = v === 'current' ? RGB.current : RGB.earlier;
          m.c[0] = col[0]; m.c[1] = col[1]; m.c[2] = col[2];
          m.a = (i / N) <= reveal ? 0.95 : 0.12;
        },
        overlay: function (ctx, al, u) {
          var p = self.plot, y = this.y();
          D.axisY(ctx, y, p.x0, p.x1, [-5, 0, 5, 10, 15], function (t) { return t === 0 ? '0' : D.pp(t, 0); }, null);
          D.hline(ctx, y(0), p.x0, p.x1, P.spine, 1.2);
          D.text(ctx, 'specifications, lowest to highest estimate', (p.x0 + p.x1) / 2, p.y1 + 14, { size: 11, align: 'center' });
          D.text(ctx, 'estimated grant gap, pp', p.x0 - 40, p.y0 - 12, { size: 11 });
          var lx = self.narrow() ? p.x0 + 6 : p.x1 - 240, ly = self.narrow() ? p.y0 + 12 : p.y0 - 12;
          D.dot(ctx, lx, ly, 3.5, P.current); D.text(ctx, 'record today', lx + 7, ly, { size: 11, color: P.current, weight: '600' });
          D.dot(ctx, lx + 92, ly, 3.5, P.earlier); D.text(ctx, 'as published', lx + 99, ly, { size: 11, color: P.earlier, weight: '600' });
          var k2 = Math.max(0, Math.min(1, (u - 0.5) / 0.3));
          if (!self.narrow()) D.text(ctx, h.spec_below + ' intervals below zero, ' + h.spec_span + ' span zero, ' + h.spec_above + ' above zero', p.x1 - 4, p.y1 - 14, { size: 11.5, align: 'right', alpha: al * k2 });
        },
      },
    ];
  };

  /* ------------------------------------------------------------ readout */
  Hero.prototype.buildReadout = function () {
    var html = '';
    for (var i = 0; i < 5; i++) {
      html += '<div class="cell" id="ro-c' + i + '"><div class="num" id="ro-n' + i + '"></div><div class="lab" id="ro-l' + i + '"></div></div>';
    }
    this.els.readout.innerHTML = html;
    var steps = '', self = this;
    for (var s = 0; s < this.stages.length; s++) steps += '<button type="button" data-i="' + s + '" aria-label="stage ' + (s + 1) + '"></button>';
    this.els.steps.innerHTML = steps;
    Array.prototype.forEach.call(this.els.steps.querySelectorAll('button'), function (b) {
      b.addEventListener('click', function () { self.tour.go(Number(b.dataset.i)); });
    });
  };

  Hero.prototype.readout = function () {
    var st = this.stages[this.stage];
    if (!document.getElementById('ro-c0')) return;
    this.els.title.textContent = st.title;
    this.els.lede.textContent = st.lede;
    for (var i = 0; i < 5; i++) {
      var cell = document.getElementById('ro-c' + i), n = document.getElementById('ro-n' + i), l = document.getElementById('ro-l' + i);
      var c = st.cells[i];
      if (!c) { cell.style.display = 'none'; continue; }
      cell.style.display = '';
      n.className = 'num ' + (c.tone || '');
      l.textContent = c.lab;
      M.countTo(n, c.v, c.f, 900);
    }
    var self = this;
    Array.prototype.forEach.call(this.els.steps.querySelectorAll('button'), function (b) {
      b.className = Number(b.dataset.i) === self.stage ? 'on' : '';
    });
  };

  /* ------------------------------------------------------------ frame */
  Hero.prototype.setStage = function (i) {
    this.stage = i;
    this.enteredAt = performance.now();
    this.u = 0;
    this.readout();
  };

  Hero.prototype.draw = function (now, dt) {
    var box = this.box, ctx = box.ctx, st = this.stages[this.stage];
    ctx.clearRect(0, 0, box.w, box.h);
    var since = now - this.enteredAt;
    var al = Math.min(1, since / 500);
    var k = M.reduced || this.first ? 1 : 1 - Math.exp(-dt / 170);
    var i, m;
    for (i = 0; i < N; i++) {
      m = this.marks[i];
      var t = this.tmp || (this.tmp = { x: 0, y: 0, r: 0, c: [0, 0, 0], a: 0 });
      t.c[0] = m.c[0]; t.c[1] = m.c[1]; t.c[2] = m.c[2];
      st.targets(t, i, this.u);
      m.x += (t.x - m.x) * k; m.y += (t.y - m.y) * k; m.r += (t.r - m.r) * k; m.a += (t.a - m.a) * k;
      m.c[0] += (t.c[0] - m.c[0]) * k; m.c[1] += (t.c[1] - m.c[1]) * k; m.c[2] += (t.c[2] - m.c[2]) * k;
    }
    this.first = false;
    st.overlay(ctx, al, this.u);
    for (i = 0; i < N; i++) {
      m = this.marks[i];
      ctx.globalAlpha = Math.max(0, Math.min(1, m.a));
      ctx.fillStyle = 'rgb(' + Math.round(m.c[0]) + ',' + Math.round(m.c[1]) + ',' + Math.round(m.c[2]) + ')';
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  Hero.prototype.hit = function (x, y) {
    if (this.stage !== 5) return null;
    var best = null, bd = 64;
    for (var i = 0; i < N; i++) {
      var m = this.marks[i], d = (m.x - x) * (m.x - x) + (m.y - y) * (m.y - y);
      if (d < bd) { bd = d; best = i; }
    }
    if (best === null) return null;
    var row = this.specs[best], cols = this.mv.columns, mv = this.mv, self = this;
    var parts = mv.forks.map(function (f) { return mv.labels[f][mv.levels[f][row[cols.indexOf(f)]]]; });
    return '<span class="num">' + D.pp(row[this.iEst]) + 'pp</span> [' + D.pp(row[cols.indexOf('lo')]) + ', ' + D.pp(row[cols.indexOf('hi')]) + ']<br>' +
      parts.join('; ') + '<br>n ' + D.num(row[cols.indexOf('n')]) + ', rank ' + (best + 1) + ' of ' + N;
  };

  Hero.prototype.start = function () {
    var self = this, last = null;
    this.els.boot.hidden = true;
    this.tour = global.Tour.make({
      steps: this.stages.length,
      dwell: 7600,
      onStep: function (i) { self.setStage(i); },
      onProgress: function (p, elapsed) { self.els.prog.style.width = (p * 100) + '%'; self.u = M.reduced ? 1 : p; },
      onPause: function () { self.els.play.textContent = 'Play'; },
      onResume: function () { self.els.play.textContent = 'Pause'; },
    });
    if (M.reduced) this.u = 1;
    function loop(t) {
      if (last === null) last = t;
      var dt = Math.min(64, t - last); last = t;
      self.draw(t, dt);
      M.frame(loop);
    }
    M.frame(loop);
  };

  global.Hero = Hero;
}(window));
