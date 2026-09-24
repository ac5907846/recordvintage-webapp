(function(global) {
  'use strict';
  var P = {
    earlier: '#1b2a49',
    current: '#b8236b',
    neutral: '#333333',
    charcoal: '#3b3b3b',
    survives: '#1d6f7a',
    killed: '#9aa1ad',
    band: '#e3e3e3',
    event: '#c9a227',
    grid: '#e3e3e3',
    spine: '#9a9a9a',
    faint: '#f4f4f4',
    ink: '#16181d',
    tintEarlier: '#D4EBF2',
    tintCurrent: '#EAD1DC',
    tintSurvives: '#D9EAD3',
    tintNeutral: '#BFBFBF'
  };
  var SEQ = [ '#f3f9fb', '#e4f2f7', '#d4ebf2', '#c0e1eb', '#abd6e3', '#96cbdb', '#82c0d2' ];
  var FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, Helvetica, sans-serif';
  var SERIF = 'Georgia, "Times New Roman", Times, serif';
  function pp(x, d) {
    d = d === undefined ? 2 : d;
    var v = Number(x);
    if (!isFinite(v)) return 'n/a';
    var s = Math.abs(v).toFixed(d);
    if (s.indexOf('0.') === 0) s = s.slice(1);
    var neg = v < 0 && Number(s) !== 0;
    return (neg ? '-' : '+') + s;
  }
  function dec(x, d) {
    d = d === undefined ? 2 : d;
    var v = Number(x);
    if (!isFinite(v)) return 'n/a';
    var s = Math.abs(v).toFixed(d);
    if (s.indexOf('0.') === 0) s = s.slice(1);
    return (v < 0 ? '-' : '') + s;
  }
  function pct(x, d) {
    d = d === undefined ? 1 : d;
    var v = Number(x) * 100;
    if (!isFinite(v)) return 'n/a';
    var s = v.toFixed(d);
    if (s.indexOf('0.') === 0) s = s.slice(1);
    return s + '%';
  }
  function num(x) {
    return Math.round(Number(x)).toLocaleString('en-US');
  }
  function ci(arr, d) {
    return arr ? '[' + pp(arr[0], d) + ', ' + pp(arr[1], d) + ']' : '';
  }
  function pval(p) {
    if (p === null || p === undefined) return '';
    var s = Number(p).toFixed(4);
    return 'p ' + (s.indexOf('0.') === 0 ? s.slice(1) : s);
  }
  function fit(canvas, cssHeight) {
    var dpr = global.devicePixelRatio || 1;
    var w = canvas.parentNode.clientWidth || canvas.clientWidth || 800;
    canvas.style.height = cssHeight + 'px';
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, cssHeight);
    ctx.font = '11px ' + FONT;
    ctx.textBaseline = 'middle';
    return {
      ctx: ctx,
      w: w,
      h: cssHeight
    };
  }
  function scale(d0, d1, r0, r1) {
    var k = (r1 - r0) / (d1 - d0 || 1);
    var f = function(v) {
      return r0 + (v - d0) * k;
    };
    f.invert = function(p) {
      return d0 + (p - r0) / k;
    };
    f.domain = [ d0, d1 ];
    f.range = [ r0, r1 ];
    return f;
  }
  function niceTicks(lo, hi, count) {
    var span = hi - lo || 1;
    var step = Math.pow(10, Math.floor(Math.log10(span / (count || 6))));
    var err = span / (count || 6) / step;
    if (err >= 7.5) step *= 10; else if (err >= 3) step *= 5; else if (err >= 1.5) step *= 2;
    var out = [], v = Math.ceil(lo / step) * step;
    for (;v <= hi + 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6);
    return out;
  }
  function text(ctx, s, px, py, o) {
    o = o || {};
    ctx.save();
    ctx.fillStyle = o.color || P.neutral;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.baseline || 'middle';
    ctx.font = (o.weight ? o.weight + ' ' : '') + (o.size || 11) + 'px ' + (o.serif ? SERIF : FONT);
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    ctx.fillText(s, px, py);
    ctx.restore();
  }
  function axisX(ctx, x, y0, y1, ticks, fmt, label, o) {
    o = o || {};
    ctx.save();
    ctx.strokeStyle = P.grid;
    ctx.lineWidth = 1;
    if (o.grid !== false) {
      ticks.forEach(function(t) {
        var px = Math.round(x(t)) + .5;
        ctx.beginPath();
        ctx.moveTo(px, y0);
        ctx.lineTo(px, y1);
        ctx.stroke();
      });
    }
    ctx.strokeStyle = P.spine;
    ctx.beginPath();
    ctx.moveTo(x.range[0], y1 + .5);
    ctx.lineTo(x.range[1], y1 + .5);
    ctx.stroke();
    ctx.fillStyle = P.neutral;
    ctx.textAlign = 'center';
    ctx.font = '11px ' + FONT;
    ticks.forEach(function(t) {
      ctx.fillText(fmt(t), x(t), y1 + 12);
    });
    if (label) ctx.fillText(label, (x.range[0] + x.range[1]) / 2, y1 + 28);
    ctx.restore();
  }
  function axisY(ctx, y, x0, x1, ticks, fmt, label, o) {
    o = o || {};
    ctx.save();
    ctx.strokeStyle = P.grid;
    ctx.lineWidth = 1;
    if (o.grid !== false) {
      ticks.forEach(function(t) {
        var py = Math.round(y(t)) + .5;
        ctx.beginPath();
        ctx.moveTo(x0, py);
        ctx.lineTo(x1, py);
        ctx.stroke();
      });
    }
    ctx.fillStyle = P.neutral;
    ctx.textAlign = 'right';
    ctx.font = '11px ' + FONT;
    ticks.forEach(function(t) {
      ctx.fillText(fmt(t), x0 - 6, y(t));
    });
    if (label) {
      ctx.save();
      ctx.translate(x0 - 34, (y.range[0] + y.range[1]) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }
  function vline(ctx, px, y0, y1, color, width, dash) {
    ctx.save();
    ctx.strokeStyle = color || P.spine;
    ctx.lineWidth = width || 1;
    if (dash) ctx.setLineDash(dash);
    px = Math.round(px) + .5;
    ctx.beginPath();
    ctx.moveTo(px, y0);
    ctx.lineTo(px, y1);
    ctx.stroke();
    ctx.restore();
  }
  function hline(ctx, py, x0, x1, color, width, dash) {
    ctx.save();
    ctx.strokeStyle = color || P.spine;
    ctx.lineWidth = width || 1;
    if (dash) ctx.setLineDash(dash);
    py = Math.round(py) + .5;
    ctx.beginPath();
    ctx.moveTo(x0, py);
    ctx.lineTo(x1, py);
    ctx.stroke();
    ctx.restore();
  }
  function dot(ctx, px, py, r, fill, stroke, lw) {
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw || 1;
      ctx.stroke();
    }
  }
  function square(ctx, px, py, s, fill, stroke, lw) {
    ctx.beginPath();
    ctx.rect(px - s / 2, py - s / 2, s, s);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw || 1;
      ctx.stroke();
    }
  }
  function tri(ctx, px, py, s, fill) {
    ctx.beginPath();
    ctx.moveTo(px, py - s * .6);
    ctx.lineTo(px + s * .6, py + s * .5);
    ctx.lineTo(px - s * .6, py + s * .5);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }
  function band(ctx, x0, x1, y0, y1, fill, edge) {
    ctx.save();
    ctx.fillStyle = fill || P.band;
    ctx.fillRect(Math.min(x0, x1), y0, Math.abs(x1 - x0), y1 - y0);
    if (edge) {
      ctx.strokeStyle = edge;
      ctx.lineWidth = 1.2;
      [ x0, x1 ].forEach(function(px) {
        px = Math.round(px) + .5;
        ctx.beginPath();
        ctx.moveTo(px, y0);
        ctx.lineTo(px, y1);
        ctx.stroke();
      });
    }
    ctx.restore();
  }
  function hex(c) {
    return [ parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16) ];
  }
  function mix(a, b, k) {
    var A = hex(a), B = hex(b);
    return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * k) + ',' + Math.round(A[1] + (B[1] - A[1]) * k) + ',' + Math.round(A[2] + (B[2] - A[2]) * k) + ')';
  }
  function rgba(c, a) {
    var A = hex(c);
    return 'rgba(' + A[0] + ',' + A[1] + ',' + A[2] + ',' + a + ')';
  }
  var tipEl = null;
  function hover(canvas, hit) {
    if (!tipEl) tipEl = document.getElementById('tip');
    function move(e) {
      var r = canvas.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      var html = hit(x, y, r);
      if (!html) {
        tipEl.hidden = true;
        canvas.style.cursor = '';
        return;
      }
      tipEl.innerHTML = html;
      tipEl.hidden = false;
      canvas.style.cursor = 'crosshair';
      var tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
      var left = e.clientX + 14, top = e.clientY + 14;
      if (left + tw > global.innerWidth - 8) left = e.clientX - tw - 12;
      if (top + th > global.innerHeight - 8) top = e.clientY - th - 12;
      tipEl.style.left = left + 'px';
      tipEl.style.top = top + 'px';
    }
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerleave', function() {
      tipEl.hidden = true;
      canvas.style.cursor = '';
    });
  }
  function keys(container, items, opts) {
    opts = opts || {};
    container.innerHTML = '';
    var state = {};
    items.forEach(function(it) {
      state[it.id] = it.on !== false;
    });
    var btns = {};
    items.forEach(function(it) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = it.label;
      b.dataset.id = it.id;
      btns[it.id] = b;
      b.addEventListener('click', function() {
        if (opts.mode === 'one') {
          items.forEach(function(o) {
            state[o.id] = o.id === it.id;
          });
        } else {
          state[it.id] = !state[it.id];
        }
        paint();
        opts.onChange(state, it.id);
      });
      container.appendChild(b);
    });
    function paint() {
      items.forEach(function(it) {
        btns[it.id].className = 'key ' + (state[it.id] ? 'on' : 'off') + (it.tone && state[it.id] ? ' ' + it.tone : '');
      });
    }
    paint();
    return {
      state: state,
      set: function(id, v) {
        state[id] = v;
        paint();
      },
      buttons: btns
    };
  }
  function wrap(ctx, s, maxW, size) {
    ctx.save();
    ctx.font = (size || 11) + 'px ' + FONT;
    var words = String(s).split(' '), lines = [], cur = '';
    words.forEach(function(w) {
      var t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && cur) {
        lines.push(cur);
        cur = w;
      } else cur = t;
    });
    if (cur) lines.push(cur);
    ctx.restore();
    return lines;
  }
  function debounce(fn, ms) {
    var h = null;
    return function() {
      clearTimeout(h);
      h = setTimeout(fn, ms || 120);
    };
  }
  global.D = {
    P: P,
    SEQ: SEQ,
    FONT: FONT,
    SERIF: SERIF,
    pp: pp,
    dec: dec,
    pct: pct,
    num: num,
    ci: ci,
    pval: pval,
    fit: fit,
    scale: scale,
    niceTicks: niceTicks,
    text: text,
    axisX: axisX,
    axisY: axisY,
    vline: vline,
    hline: hline,
    dot: dot,
    square: square,
    tri: tri,
    band: band,
    mix: mix,
    rgba: rgba,
    hover: hover,
    keys: keys,
    wrap: wrap,
    debounce: debounce
  };
})(window);