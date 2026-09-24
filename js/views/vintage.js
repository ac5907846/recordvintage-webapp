(function(global) {
  'use strict';
  var D = global.D, M = global.M, P = D.P;
  var Lab = {
    data: null,
    vint: 'C',
    type: 'a',
    mig: 'all',
    cellHits: [],
    init: function(data) {
      this.data = data;
      var self = this;
      this.buildCells();
      D.keys(document.getElementById('migkeys'), [ {
        id: 'all',
        label: 'all code types',
        on: true,
        tone: 'neutral'
      }, {
        id: 'inv',
        label: 'inventional codes',
        on: false,
        tone: 'neutral'
      } ], {
        mode: 'one',
        onChange: function(s) {
          self.mig = s.all ? 'all' : 'inv';
          self.renderMig();
        }
      });
      this.update();
      this.renderMig();
      global.addEventListener('resize', D.debounce(function() {
        self.renderChart();
        self.renderMig();
      }));
      D.hover(document.getElementById('migcanvas'), function(x, y) {
        return self.hitMig(x, y);
      });
      D.hover(document.getElementById('labcanvas'), function(x, y) {
        return self.hitLab(x, y);
      });
      document.getElementById('labnote').textContent = 'Grant gap between applications with five or more new pairs and none, ' + D.num(data.n) + ' first filings, percentage points. Levels carry no interval; the 95% intervals belong to the differences, restricted wild cluster bootstrap over 35 fields. Table II and Figure 3 of the article.';
      document.getElementById('mignote').textContent = 'Row percentages: where the applications the record today places in each novelty bin sit under the record as published, same code type. Figure 3(c) of the article.';
    },
    buildCells: function() {
      var d = this.data, self = this;
      var grid = document.getElementById('cellgrid');
      var html = '<div class="corner"></div><div class="colhead">inventional codes</div><div class="colhead">all code types</div>';
      [ [ 'P', 'record as published', 'earlier' ], [ 'C', 'record today', 'current' ] ].forEach(function(row) {
        html += '<div class="rowhead ' + row[2] + '">' + row[1] + '</div>';
        [ 'i', 'a' ].forEach(function(t) {
          var k = row[0] + t;
          html += '<button type="button" class="cellbtn ' + row[2] + '" data-k="' + k + '">' + D.pp(d.cells[k]) + '<small>n 5+ ' + D.num(d.raw[k].n5) + ', n 0 ' + D.num(d.raw[k].n0) + '</small></button>';
        });
      });
      grid.innerHTML = html;
      Array.prototype.forEach.call(grid.querySelectorAll('.cellbtn'), function(b) {
        b.addEventListener('click', function() {
          self.vint = b.dataset.k[0];
          self.type = b.dataset.k[1];
          self.update();
        });
      });
    },
    update: function() {
      var d = this.data, k = this.vint + this.type, self = this;
      Array.prototype.forEach.call(document.querySelectorAll('.cellbtn'), function(b) {
        b.classList.toggle('on', b.dataset.k === k);
      });
      var typeName = this.type === 'a' ? 'all code types' : 'inventional codes';
      var vName = this.vint === 'C' ? 'record today' : 'record as published';
      var V = this.type === 'a' ? d.components.V_all : d.components.V_inv;
      var nul = this.type === 'a' ? d.null.all : d.null.inv;
      var T = this.vint === 'C' ? d.components.T_C : d.components.T_P;
      var other = (this.vint === 'C' ? 'P' : 'C') + this.type;
      var otherT = this.vint + (this.type === 'a' ? 'i' : 'a');
      var rows = [ {
        k: vName + ', ' + typeName,
        v: D.pp(d.cells[k]),
        head: true,
        id: 'lab-gap'
      }, {
        k: 'raw difference of grant rates',
        v: D.pp(d.raw[k].gap),
        id: 'lab-raw'
      }, {
        k: 'same code type, ' + (this.vint === 'C' ? 'record as published' : 'record today'),
        v: D.pp(d.cells[other]),
        id: 'lab-other'
      }, {
        k: 'vintage difference, ' + typeName,
        v: D.pp(V.estimate),
        small: D.ci(V.ci95),
        id: 'lab-v'
      }, {
        k: 'outcome-blind null',
        v: D.pp(nul.V0),
        id: 'lab-null'
      }, {
        k: 'excess over the null',
        v: D.pp(nul.XV),
        small: D.pval(nul.p),
        id: 'lab-x'
      }, {
        k: 'code-type difference at this vintage, all minus inventional',
        v: D.pp(T.estimate),
        small: D.ci(T.ci95) + ', ' + D.pval(T.p),
        id: 'lab-t'
      }, {
        k: 'same vintage, ' + (this.type === 'a' ? 'inventional codes' : 'all code types'),
        v: D.pp(d.cells[otherT]),
        id: 'lab-ot'
      } ];
      var out = document.getElementById('labout');
      out.innerHTML = rows.map(function(r) {
        return '<div class="row' + (r.head ? ' head' : '') + '"><span class="k">' + r.k + '</span><span class="v"><span id="' + r.id + '"></span>' + (r.small ? '<small>' + r.small + '</small>' : '') + '</span></div>';
      }).join('');
      var vals = {
        'lab-gap': d.cells[k],
        'lab-raw': d.raw[k].gap,
        'lab-other': d.cells[other],
        'lab-v': V.estimate,
        'lab-null': nul.V0,
        'lab-x': nul.XV,
        'lab-t': T.estimate,
        'lab-ot': d.cells[otherT]
      };
      Object.keys(vals).forEach(function(id) {
        M.countTo(document.getElementById(id), vals[id], D.pp);
      });
      this.renderChart();
    },
    renderChart: function() {
      var d = this.data, self = this;
      var canvas = document.getElementById('labcanvas');
      var box = D.fit(canvas, 210);
      var ctx = box.ctx, w = box.w;
      var narrow = w < 560;
      var L = narrow ? 30 : 150, R = 70;
      var x = D.scale(-1.2, 5.2, L, w - R);
      D.axisX(ctx, x, 14, 150, [ -1, 0, 1, 2, 3, 4, 5 ], function(t) {
        return String(t);
      }, 'grant gap, percentage points');
      D.vline(ctx, x(0), 14, 150, P.spine, 1.2);
      this.cellHits = [];
      [ [ 'a', 'all code types', 46 ], [ 'i', 'inventional codes', 110 ] ].forEach(function(row) {
        var t = row[0], y = row[2], V = t === 'a' ? d.components.V_all : d.components.V_inv;
        var p = d.cells['P' + t], c = d.cells['C' + t];
        var on = self.type === t;
        ctx.globalAlpha = on ? 1 : .35;
        if (!narrow) D.text(ctx, row[1], L - 12, y, {
          size: 12.5,
          align: 'right',
          weight: on ? '600' : 'normal'
        }); else D.text(ctx, row[1], L + 2, y - 22, {
          size: 11.5,
          weight: on ? '600' : 'normal'
        });
        D.hline(ctx, y, x(p), x(c), P.neutral, 2);
        var selP = on && self.vint === 'P', selC = on && self.vint === 'C';
        D.dot(ctx, x(p), y, selP ? 9 : 7, '#fff', P.earlier, 2.4);
        D.dot(ctx, x(c), y, selC ? 9 : 7, P.current, P.current, 2);
        D.text(ctx, D.pp(p), x(p) - 14, y, {
          size: 12.5,
          weight: '600',
          color: P.earlier,
          align: 'right'
        });
        D.text(ctx, D.pp(c), x(c) + 14, y, {
          size: 12.5,
          weight: '600',
          color: P.current
        });
        D.text(ctx, D.pp(V.estimate) + ' ' + D.ci(V.ci95), (x(p) + x(c)) / 2, y + 17, {
          size: 11.5,
          align: 'center'
        });
        ctx.globalAlpha = 1;
        self.cellHits.push({
          px: x(p),
          py: y,
          k: 'P' + t,
          name: 'record as published, ' + row[1]
        });
        self.cellHits.push({
          px: x(c),
          py: y,
          k: 'C' + t,
          name: 'record today, ' + row[1]
        });
      });
      D.text(ctx, 'as published', x(d.cells.Pa), 14, {
        size: 11.5,
        weight: '600',
        color: P.earlier,
        align: 'center'
      });
      D.text(ctx, 'today', x(d.cells.Ca), 14, {
        size: 11.5,
        weight: '600',
        color: P.current,
        align: 'center'
      });
    },
    hitLab: function(x, y) {
      var d = this.data, best = null, bd = 196;
      this.cellHits.forEach(function(h) {
        var dd = (h.px - x) * (h.px - x) + (h.py - y) * (h.py - y);
        if (dd < bd) {
          bd = dd;
          best = h;
        }
      });
      if (!best) return null;
      var r = d.raw[best.k];
      return '<b>' + best.name + '</b><br><span class="num">' + D.pp(d.cells[best.k]) + 'pp</span> adjusted, ' + D.pp(r.gap) + ' raw<br>' + D.pct(r.share5) + ' of applications carry five or more new pairs (n ' + D.num(r.n5) + '), ' + D.pct(r.share0) + ' none (n ' + D.num(r.n0) + ')';
    },
    renderMig: function() {
      var d = this.data, m = d.migration[this.mig], bins = d.bins, self = this;
      var canvas = document.getElementById('migcanvas');
      var w0 = canvas.parentNode.clientWidth || 800;
      var size = Math.min(420, w0 - 20);
      var box = D.fit(canvas, size + 20);
      var ctx = box.ctx, w = box.w;
      var L = 70, T = 30, cell = Math.min((w - L - 20) / 4, (size - T - 40) / 4);
      this.migGeom = {
        L: L,
        T: T,
        cell: cell
      };
      for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 4; j++) {
          var v = m[i][j];
          var idx = Math.min(D.SEQ.length - 1, Math.round(v * (D.SEQ.length - 1)));
          ctx.fillStyle = D.SEQ[idx];
          ctx.fillRect(L + j * cell + 1, T + i * cell + 1, cell - 2, cell - 2);
          D.text(ctx, D.pct(v, 0).replace('%', ''), L + (j + .5) * cell, T + (i + .5) * cell, {
            size: 14,
            align: 'center',
            color: '#000',
            weight: i === 3 ? '600' : 'normal'
          });
        }
      }
      ctx.strokeStyle = P.current;
      ctx.lineWidth = 2;
      ctx.strokeRect(L + 1, T + 3 * cell + 1, 4 * cell - 2, cell - 2);
      bins.forEach(function(b, i) {
        D.text(ctx, b, L - 10, T + (i + .5) * cell, {
          size: 12,
          align: 'right',
          color: i === 3 ? P.current : P.neutral
        });
        D.text(ctx, b, L + (i + .5) * cell, T + 4 * cell + 12, {
          size: 12,
          align: 'center',
          color: P.earlier
        });
      });
      D.text(ctx, 'bin as published, row %', L + 2 * cell, T + 4 * cell + 30, {
        size: 11.5,
        align: 'center',
        color: P.earlier
      });
      ctx.save();
      ctx.translate(16, T + 2 * cell);
      ctx.rotate(-Math.PI / 2);
      D.text(ctx, 'bin today', 0, 0, {
        size: 11.5,
        align: 'center',
        color: P.current
      });
      ctx.restore();
      D.text(ctx, this.mig === 'all' ? 'all code types' : 'inventional codes', L, T - 12, {
        size: 11.5
      });
    },
    hitMig: function(x, y) {
      var g = this.migGeom, d = this.data;
      if (!g) return null;
      var j = Math.floor((x - g.L) / g.cell), i = Math.floor((y - g.T) / g.cell);
      if (i < 0 || i > 3 || j < 0 || j > 3) return null;
      var v = d.migration[this.mig][i][j];
      return '<b>' + d.bins[i] + ' new pairs today</b>, ' + d.bins[j] + ' as published<br><span class="num">' + D.pct(v) + '</span> of the row, ' + (this.mig === 'all' ? 'all code types' : 'inventional codes');
    }
  };
  global.Lab = Lab;
})(window);