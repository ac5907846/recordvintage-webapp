(function(global) {
  'use strict';
  var reduced = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function frame(cb) {
    if (global.requestAnimationFrame) {
      var done = false, id, t;
      id = global.requestAnimationFrame(function(now) {
        if (done) return;
        done = true;
        clearTimeout(t);
        cb(now);
      });
      t = setTimeout(function() {
        if (done) return;
        done = true;
        global.cancelAnimationFrame(id);
        cb(performance.now());
      }, 120);
      return function() {
        done = true;
        global.cancelAnimationFrame(id);
        clearTimeout(t);
      };
    }
    var h = setTimeout(function() {
      cb(Date.now());
    }, 16);
    return function() {
      clearTimeout(h);
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
    if (reduced || from === value) {
      el.textContent = fmt(value);
      return;
    }
    var dur = ms || 700, t0 = null, cancel = null;
    function step(t) {
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / dur);
      el.textContent = fmt(from + (value - from) * ease(k));
      if (k < 1) cancel = frame(step); else running[key] = null;
    }
    cancel = frame(step);
    running[key] = function() {
      if (cancel) cancel();
      el.textContent = fmt(value);
    };
  }
  var tours = [];
  var paused = false;
  function register(t) {
    tours.push(t);
    return t;
  }
  function pauseAll() {
    if (paused) return;
    paused = true;
    tours.forEach(function(t) {
      t.pause();
    });
  }
  function resumeAll() {
    paused = false;
    tours.forEach(function(t) {
      t.resume();
    });
  }
  function isPaused() {
    return paused;
  }
  [ 'pointerdown', 'keydown', 'wheel', 'touchstart' ].forEach(function(ev) {
    global.addEventListener(ev, function() {
      pauseAll();
    }, {
      passive: true,
      capture: true
    });
  });
  global.M = {
    frame: frame,
    ease: ease,
    countTo: countTo,
    reduced: reduced,
    register: register,
    pauseAll: pauseAll,
    resumeAll: resumeAll,
    isPaused: isPaused
  };
})(window);