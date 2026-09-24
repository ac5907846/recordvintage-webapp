(function(global) {
  'use strict';
  var D = global.D, M = global.M, P = D.P;
  var Record = {
    data: null,
    metric: 'new_pairs',
    hits: [],
    init: function(data) {
      this.data = data;
      var self = this;
      D.keys(document.getElementById('recordkeys'), [ {
        id: 'new_pairs',
        label: 'mean new pairs',
        on: true,
        tone: 'neutral'
      }, {
        id: 'codes',
        label: 'mean codes',
        on: false,
        tone: 'neutral'
      } ], {
        mode: 'one',
        onChange: function(s) {
          self.metric = s.new_pairs ? 'new_pairs' : 'codes';
          self.render();
        }
      });
      this.render();
      global.addEventListener('resize', D.debounce(function() {
        self.render();
      }));
      D.hover(document.getElementById('recordcanvas'), function(x, y) {
        return self.hit(x, y);
      });
      document.getElementById('recordnote').textContent = 'Marks sit at median days from filing; only the granted lane has a grant-time state. Today is the early-2025 read, drawn at the granted lane’s median in both lanes. Shading between marks carries no observation. Descriptive, no interval. Figure 2 of the article.';
    },
    render: function() {
      var d = this.data, metric = this.metric, self = this;
      var canvas = document.getElementById('recordcanvas');
      var w0 = canvas.parentNode.clientWidth || 800;
      var narrow = w0 < 560;
      var laneH = narrow ? 170 : 200;
      var box = D.fit(canvas, laneH * 2 + 50);
      var ctx = box.ctx, w = box.w;
      var L = narrow ? 44 : 130, R = 60;
      var x = D.scale(0, 9.6, L, w - R);
      var maxV = 0;
      [ 'granted', 'abandoned' ].forEach(function(k) {
        d.lanes[k].states.forEach(function(s) {
          maxV = Math.max(maxV, s[metric]);
        });
      });
      var yTop = Math.ceil(maxV / 5) * 5;
      this.hits = [];
      var lanes = [ [ 'granted', 'granted', P.survives ], [ 'abandoned', 'never granted', P.charcoal ] ];
      lanes.forEach(function(pair, li) {
        var key = pair[0], lane = d.lanes[key];
        var top = 18 + li * laneH, bot = top + laneH - 46;
        var y = D.scale(0, yTop, bot, top);
        D.axisY(ctx, y, L, w - R, D.niceTicks(0, yTop, 4), function(t) {
          return String(t);
        }, null);
        D.hline(ctx, bot, L, w - R, P.spine, 1);
        if (!narrow) {
          D.text(ctx, pair[1], 8, top + 10, {
            size: 13,
            weight: '600',
            serif: true
          });
          D.text(ctx, 'n ' + D.num(lane.n), 8, top + 28, {
            size: 11.5
          });
        } else {
          D.text(ctx, pair[1] + ', n ' + D.num(lane.n), L + 6, top + 10, {
            size: 11.5,
            weight: '600'
          });
        }
        var pts = lane.states.map(function(s) {
          return {
            s: s,
            px: x(s.days / 365.25),
            py: y(s[metric])
          };
        });
        ctx.save();
        ctx.fillStyle = P.faint;
        ctx.beginPath();
        ctx.moveTo(pts[0].px, bot);
        pts.forEach(function(p) {
          ctx.lineTo(p.px, p.py);
        });
        ctx.lineTo(pts[pts.length - 1].px, bot);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = P.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        pts.forEach(function(p, i) {
          if (i) ctx.lineTo(p.px, p.py); else ctx.moveTo(p.px, p.py);
        });
        ctx.stroke();
        ctx.restore();
        var evx = x(lane.events.disposition / 365.25);
        D.tri(ctx, evx, bot + 12, 10, P.charcoal);
        D.text(ctx, key === 'granted' ? 'grant' : 'abandonment', evx + 9, bot + 12, {
          size: 11
        });
        var colour = {
          publication: P.earlier,
          grant: P.charcoal,
          today: P.current
        };
        pts.forEach(function(p) {
          var c = colour[p.s.state];
          if (metric === 'new_pairs') D.dot(ctx, p.px, p.py, 6, '#fff', c, 2.2); else D.square(ctx, p.px, p.py, 10, '#fff', c, 2);
          var lab = D.dec(p.s[metric], metric === 'new_pairs' && p.s.state === 'publication' ? 2 : 1);
          var above = p.s.state !== 'publication' || metric === 'new_pairs';
          D.text(ctx, lab, p.px + (p.s.state === 'today' ? 12 : 0), p.s.state === 'today' ? p.py : above ? p.py - 15 : p.py + 15, {
            size: 12,
            weight: '600',
            color: c,
            align: p.s.state === 'today' ? 'left' : 'center'
          });
          self.hits.push({
            px: p.px,
            py: p.py,
            lane: pair[1],
            s: p.s,
            n: lane.n
          });
        });
        if (li === 0) {
          if (!narrow) {
            D.text(ctx, 'publication', pts[0].px, top - 8, {
              size: 12,
              weight: '600',
              color: P.earlier,
              align: 'center'
            });
            D.text(ctx, 'grant', pts[1].px, top - 8, {
              size: 12,
              weight: '600',
              color: P.charcoal,
              align: 'center'
            });
          }
          D.text(ctx, 'today', pts[2].px, top - 8, {
            size: 12,
            weight: '600',
            color: P.current,
            align: 'right'
          });
          D.text(ctx, 'intermediate states unobserved', (pts[1].px + pts[2].px) / 2, bot - 14, {
            size: 11,
            align: 'center',
            color: P.charcoal
          });
        }
      });
      var axisY0 = 18 + 2 * laneH - 46 + 24;
      D.axisX(ctx, x, axisY0, axisY0, [ 0, 1, 2, 3, 5, 7, 9 ], function(t) {
        return String(t);
      }, 'years from filing', {
        grid: false
      });
      this.readout();
    },
    readout: function() {
      var d = this.data, g = d.grant_time, metric = this.metric;
      var el = document.getElementById('recordreadout');
      if (!el.children.length) {
        el.innerHTML = [ 'rec-a', 'rec-b', 'rec-c', 'rec-d' ].map(function(id) {
          return '<div class="cell"><div class="num" id="' + id + '"></div><div class="lab" id="' + id + 'l"></div></div>';
        }).join('');
      }
      var v = g[metric];
      var f = function(x) {
        return D.dec(x, 2);
      };
      M.countTo(document.getElementById('rec-a'), v[0], f);
      document.getElementById('rec-al').textContent = (metric === 'new_pairs' ? 'new pairs' : 'codes') + ' at publication, granted';
      M.countTo(document.getElementById('rec-b'), v[1], f);
      document.getElementById('rec-bl').textContent = 'at the grant';
      M.countTo(document.getElementById('rec-c'), v[2], f);
      document.getElementById('rec-cl').textContent = 'today';
      var share = (v[1] - v[0]) / (v[2] - v[0]);
      M.countTo(document.getElementById('rec-d'), share, D.pct);
      document.getElementById('rec-dl').textContent = 'of the change present at the grant, ' + D.num(g.n) + ' granted records';
      document.getElementById('rec-a').className = 'num earlier';
      document.getElementById('rec-b').className = 'num killed';
      document.getElementById('rec-c').className = 'num current';
    },
    hit: function(x, y) {
      var best = null, bd = 144;
      this.hits.forEach(function(h) {
        var d = (h.px - x) * (h.px - x) + (h.py - y) * (h.py - y);
        if (d < bd) {
          bd = d;
          best = h;
        }
      });
      if (!best) return null;
      var s = best.s;
      return '<b>' + best.lane + '</b>, ' + (s.state === 'today' ? 'record today' : 'record at ' + s.state) + '<br>' + '<span class="num">' + D.dec(s.new_pairs, 2) + '</span> mean new pairs, <span class="num">' + D.dec(s.codes, 2) + '</span> mean codes<br>' + 'median ' + D.num(s.days) + ' days from filing, n ' + D.num(best.n);
    }
  };
  global.Record = Record;
})(window);