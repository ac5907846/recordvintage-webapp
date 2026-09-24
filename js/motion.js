(function(global) {
  'use strict';
  var reduced = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var raf = global.requestAnimationFrame ? function(cb) {
    return global.requestAnimationFrame(cb);
  } : function(cb) {
    return setTimeout(function() {
      cb(now());
    }, 16);
  };
  var caf = global.cancelAnimationFrame ? function(id) {
    global.cancelAnimationFrame(id);
  } : function(id) {
    clearTimeout(id);
  };
  function now() {
    return global.performance && global.performance.now ? global.performance.now() : Date.now();
  }
  function frame(cb) {
    var done = false, id, t;
    id = raf(function(ts) {
      if (done) return;
      done = true;
      clearTimeout(t);
      cb(ts);
    });
    t = setTimeout(function() {
      if (done) return;
      done = true;
      caf(id);
      cb(now());
    }, 120);
    return function() {
      done = true;
      caf(id);
      clearTimeout(t);
    };
  }
  var subs = [];
  var loopStop = null;
  var loopLast = null;
  var looping = false;
  function loop(ts) {
    loopStop = null;
    if (loopLast === null) loopLast = ts;
    var dt = Math.max(0, Math.min(100, ts - loopLast));
    loopLast = ts;
    var list = subs.slice();
    for (var i = 0; i < list.length; i++) {
      if (subs.indexOf(list[i]) < 0) continue;
      try {
        list[i](ts, dt);
      } catch (e) {
        if (global.console) global.console.error(e);
      }
    }
    if (subs.length) loopStop = frame(loop); else {
      looping = false;
      loopLast = null;
    }
  }
  function run(fn) {
    if (subs.indexOf(fn) < 0) subs.push(fn);
    if (!looping) {
      looping = true;
      loopLast = null;
      loopStop = frame(loop);
    }
    return function() {
      var k = subs.indexOf(fn);
      if (k >= 0) subs.splice(k, 1);
      if (!subs.length && loopStop) {
        loopStop();
        loopStop = null;
        looping = false;
        loopLast = null;
      }
    };
  }
  function ease(t) {
    return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  var carried = {};
  var running = {};
  function countTo(el, value, fmt, ms) {
    if (!el) return;
    var key = el.id || el.dataset.mkey || (el.dataset.mkey = 'k' + Math.random().toString(36).slice(2));
    var from = carried[key] === undefined ? value : carried[key];
    carried[key] = value;
    if (running[key]) {
      running[key]();
      running[key] = null;
    }
    if (reduced || from === value || !(ms > 0)) {
      el.textContent = fmt(value);
      return;
    }
    var dur = ms, t0 = null, cancel = null;
    function step(t) {
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / dur);
      el.textContent = fmt(k >= 1 ? value : from + (value - from) * ease(k));
      if (k < 1) cancel = frame(step); else running[key] = null;
    }
    cancel = frame(step);
    running[key] = function() {
      if (cancel) cancel();
      el.textContent = fmt(value);
    };
  }
  global.M = {
    frame: frame,
    run: run,
    now: now,
    ease: ease,
    countTo: countTo,
    reduced: reduced
  };
})(window);