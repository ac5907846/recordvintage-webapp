/* Multiverse: the 432 specifications as a specification curve, filtered by each of the six choices
   with real buttons, coloured by the state of the record, with a readout of the range, median and
   how many intervals lie below, across and above zero for the current filter. */
(function (global) {
  'use strict';

  var D = global.D, M = global.M, P = D.P;

  var Multiverse = {
    data: null, active: null, colour: 'vintage', pts: [],

    init: function (data) {
      this.data = data;
      var self = this;
      this.active = {};
      data.forks.forEach(function (f) {
        self.active[f] = {};
        data.levels[f].forEach(function (v) { self.active[f][v] = true; });
      });
      this.buildControls();
      D.keys(document.getElementById('mvcolour'), [
        { id: 'vintage', label: 'colour by state of the record', on: true, tone: 'neutral' },
        { id: 'none', label: 'no colour', on: false, tone: 'neutral' },
      ], { mode: 'one', onChange: function (s) { self.colour = s.vintage ? 'vintage' : 'none'; self.render(); } });
      this.render();
      this.renderLeverage();
      global.addEventListener('resize', D.debounce(function () { self.render(); self.renderLeverage(); }));
      D.hover(document.getElementById('mvcanvas'), function (x, y) { return self.hit(x, y); });
      document.getElementById('mvnote').textContent =
        'Specifications ranked by estimate, so monotone by construction; faint bars are 95% cluster-robust intervals on technology field. Leverage is the largest median absolute change from swapping two levels of one choice with all else fixed. Specifications are nested and share documents, so the interval counts are not a vote. Neither marked specification is presented as correct. Figure 6 of the article, ' + D.num(data.population) + ' published applications.';
    },

    buildControls: function () {
      var bar = document.getElementById('forkbar'), self = this, d = this.data;
      bar.innerHTML = '';
      d.forks.forEach(function (f) {
        var g = document.createElement('div');
        g.className = 'forkgroup';
        var n = document.createElement('div');
        n.className = 'name';
        n.textContent = d.names[f];
        g.appendChild(n);
        d.levels[f].forEach(function (v) {
          var b = document.createElement('button');
          b.type = 'button';
          var tone = f === 'measure' ? (d.vintage_of_measure[v] === 'current' ? 'current' : '') : 'neutral';
          b.className = 'key on ' + tone;
          b.textContent = d.labels[f][v];
          b.addEventListener('click', function () {
            self.active[f][v] = !self.active[f][v];
            b.className = 'key ' + (self.active[f][v] ? 'on ' + tone : 'off');
            self.render();
          });
          g.appendChild(b);
        });
        bar.appendChild(g);
      });
    },

    matching: function () {
      var d = this.data, cols = d.columns, self = this;
      var ix = {};
      d.forks.forEach(function (f) { ix[f] = cols.indexOf(f); });
      var iEst = cols.indexOf('estimate'), iLo = cols.indexOf('lo'), iHi = cols.indexOf('hi'), iN = cols.indexOf('n'), iFlag = cols.indexOf('flag'), iG = cols.indexOf('grant_control');
      return d.rows.filter(function (r) {
        return d.forks.every(function (f) { return self.active[f][d.levels[f][r[ix[f]]]]; });
      }).map(function (r) {
        var o = { est: r[iEst], lo: r[iLo], hi: r[iHi], n: r[iN], flag: r[iFlag], g: r[iG], levels: {} };
        d.forks.forEach(function (f) { o.levels[f] = d.levels[f][r[ix[f]]]; });
        o.vint = d.vintage_of_measure[o.levels.measure];
        return o;
      });
    },

    render: function () {
      var rows = this.matching(), d = this.data, self = this;
      var canvas = document.getElementById('mvcanvas');
      var w0 = canvas.parentNode.clientWidth || 800;
      var box = D.fit(canvas, Math.max(300, Math.min(440, Math.round(w0 * 0.5))));
      var ctx = box.ctx, w = box.w, h = box.h;
      var L = 46, R = 16, T = 22, B = 40;
      var y = D.scale(-10.5, 18, h - B, T);
      var x = D.scale(0, Math.max(1, rows.length), L, w - R);
      this.pts = [];
      this.readout(rows);
      if (!rows.length) {
        D.text(ctx, 'No specification takes every choice that is switched on.', w / 2, h / 2, { align: 'center', color: P.charcoal });
        return;
      }
      D.axisY(ctx, y, L, w - R, [-10, -5, 0, 5, 10, 15], function (t) { return t === 0 ? '0' : D.pp(t, 0); }, 'estimated grant gap, pp');
      D.hline(ctx, y(0), L, w - R, P.spine, 1.2);
      D.text(ctx, 'specifications, lowest to highest estimate', (L + w - R) / 2, h - 14, { size: 11, align: 'center' });
      var r = Math.max(1.6, Math.min(3.2, (w - L - R) / rows.length * 0.42));
      rows.forEach(function (p, i) {
        var px = x(i + 0.5), py = y(p.est);
        var col = self.colour === 'vintage' ? (p.vint === 'current' ? P.current : P.earlier) : P.charcoal;
        ctx.strokeStyle = col; ctx.globalAlpha = 0.22; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px, y(Math.max(-10.5, p.lo))); ctx.lineTo(px, y(Math.min(18, p.hi))); ctx.stroke();
        ctx.globalAlpha = 1;
        D.dot(ctx, px, py, r, col, null);
        self.pts.push({ px: px, py: py, p: p });
        if (p.flag) {
          ctx.strokeStyle = P.ink; ctx.lineWidth = 1.2; ctx.fillStyle = '#fff';
          ctx.beginPath();
          if (p.flag & 1) { ctx.moveTo(px, py - 7); ctx.lineTo(px + 7, py); ctx.lineTo(px, py + 7); ctx.lineTo(px - 7, py); ctx.closePath(); }
          else ctx.rect(px - 6, py - 6, 12, 12);
          ctx.fill(); ctx.stroke();
          var lab = d.flags[String(p.flag)] + ', ' + D.pp(p.est, 1);
          ctx.font = '11px ' + D.FONT;
          var left = px + 12 + ctx.measureText(lab).width > w - 4;
          D.text(ctx, lab, px + (left ? -12 : 12), py + 18, { size: 11, align: left ? 'right' : 'left' });
        }
      });
      if (this.colour === 'vintage') {
        D.dot(ctx, L + 8, T - 8, 3.5, P.current); D.text(ctx, 'record today', L + 15, T - 8, { size: 11, color: P.current, weight: '600' });
        D.dot(ctx, L + 118, T - 8, 3.5, P.earlier); D.text(ctx, 'record as published', L + 125, T - 8, { size: 11, color: P.earlier, weight: '600' });
      }
    },

    readout: function (rows) {
      var el = document.getElementById('mvreadout');
      if (!el.children.length) {
        el.innerHTML = ['mv-n', 'mv-lo', 'mv-hi', 'mv-med', 'mv-below', 'mv-span', 'mv-above'].map(function (id) {
          return '<div class="cell"><div class="num" id="' + id + '"></div><div class="lab" id="' + id + 'l"></div></div>';
        }).join('');
      }
      var est = rows.map(function (p) { return p.est; }).sort(function (a, b) { return a - b; });
      var med = est.length ? (est.length % 2 ? est[(est.length - 1) / 2] : (est[est.length / 2 - 1] + est[est.length / 2]) / 2) : 0;
      var below = rows.filter(function (p) { return p.hi < 0; }).length;
      var above = rows.filter(function (p) { return p.lo > 0; }).length;
      var span = rows.length - below - above;
      function set(id, v, f, lab) { M.countTo(document.getElementById(id), v, f); document.getElementById(id + 'l').textContent = lab; }
      set('mv-n', rows.length, D.num, 'specifications match');
      set('mv-lo', est.length ? est[0] : 0, D.pp, 'lowest, pp');
      set('mv-hi', est.length ? est[est.length - 1] : 0, D.pp, 'highest, pp');
      set('mv-med', med, D.pp, 'median, pp');
      set('mv-below', below, D.num, 'intervals below zero');
      set('mv-span', span, D.num, 'span zero');
      set('mv-above', above, D.num, 'above zero');
    },

    hit: function (x, y) {
      var best = null, bd = 100;
      this.pts.forEach(function (q) {
        var d = (q.px - x) * (q.px - x) + (q.py - y) * (q.py - y);
        if (d < bd) { bd = d; best = q; }
      });
      if (!best) return null;
      var p = best.p, d = this.data;
      var parts = d.forks.map(function (f) { return '<b>' + d.names[f].toLowerCase() + '</b> ' + d.labels[f][p.levels[f]]; });
      return '<span class="num">' + D.pp(p.est) + 'pp</span> [' + D.pp(p.lo) + ', ' + D.pp(p.hi) + ']<br>' + parts.join('<br>') +
        '<br>n ' + D.num(p.n) + ', comparison grant rate ' + D.pct(p.g) + (p.flag ? '<br>' + d.flags[String(p.flag)] : '');
    },

    renderLeverage: function () {
      var d = this.data;
      var canvas = document.getElementById('levcanvas');
      var order = d.forks.slice().sort(function (a, b) { return d.leverage[b] - d.leverage[a]; });
      var rowH = 20;
      var box = D.fit(canvas, order.length * rowH + 46);
      var ctx = box.ctx, w = box.w;
      var L = Math.min(150, w * 0.3);
      var x = D.scale(0, 4.8, L, Math.min(w - 60, L + 360));
      D.text(ctx, 'leverage of each choice, pp', L, 8, { size: 11.5 });
      order.forEach(function (f, i) {
        var y = 26 + (i + 0.5) * rowH, v = d.leverage[f];
        D.text(ctx, d.names[f].toLowerCase(), L - 10, y, { size: 11.5, align: 'right' });
        D.hline(ctx, y, x(0), x(v), P.spine, 1);
        D.dot(ctx, x(v), y, 4.5, P.neutral, '#fff', 1);
        D.text(ctx, D.dec(v, 1), x(v) + 9, y, { size: 11.5, weight: '600' });
      });
      var yb = 26 + order.length * rowH + 4;
      D.axisX(ctx, x, yb, yb, [0, 2, 4], function (t) { return String(t); }, null, { grid: false });
    },
  };

  global.Multiverse = Multiverse;
}(window));
