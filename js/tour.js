(function(global) {
  'use strict';
  var M = global.M;
  var FAST = 2.5;
  var GLYPH = {
    x1: '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2 1.5 10.5 6 2 10.5Z"/></svg><span>x1</span>',
    x2: '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M.5 2 5.5 6 .5 10Z M6.5 2 11.5 6 6.5 10Z"/></svg><span>x2</span>',
    pause: '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><rect x="2.4" y="1.5" width="2.7" height="9"/><rect x="6.9" y="1.5" width="2.7" height="9"/></svg>'
  };
  var NAME = {
    x1: 'Playing at normal speed',
    x2: 'Playing at double speed',
    pause: 'Paused'
  };
  var Tour = {
    make: function(opts) {
      var steps = opts.steps, dwell = opts.dwell || 6e3;
      var st = {
        i: 0,
        elapsed: 0,
        paused: false,
        userRate: null,
        fast: !M.reduced && opts.fast !== false,
        unsub: null
      };
      var btn = null;
      function speed() {
        return st.userRate || (st.fast ? FAST : 1);
      }
      function mode() {
        return st.paused ? 'pause' : st.userRate === 2 ? 'x2' : 'x1';
      }
      function paint() {
        if (!btn) return;
        var m = mode();
        if (btn.dataset.mode === m) return;
        btn.dataset.mode = m;
        btn.innerHTML = GLYPH[m];
        btn.setAttribute('aria-label', NAME[m]);
      }
      function tick(ts, dt) {
        if (st.paused) return;
        st.elapsed += dt * speed();
        if (st.elapsed >= dwell) {
          st.elapsed = 0;
          st.i = (st.i + 1) % steps;
          if (st.i === 0) st.fast = false;
          opts.onStep(st.i);
        }
        if (opts.onProgress) opts.onProgress(st.elapsed / dwell);
      }
      var handle = {
        start: function() {
          if (!st.unsub) st.unsub = M.run(tick);
        },
        stop: function() {
          if (st.unsub) {
            st.unsub();
            st.unsub = null;
          }
        },
        pause: function() {
          if (st.paused) return;
          st.paused = true;
          st.fast = false;
          paint();
          if (opts.onPause) opts.onPause();
        },
        play: function(rate) {
          st.userRate = rate === 2 ? 2 : 1;
          st.fast = false;
          var was = st.paused;
          st.paused = false;
          if (st.elapsed >= dwell) st.elapsed = 0;
          paint();
          if (was && opts.onResume) opts.onResume();
        },
        cycle: function() {
          var m = mode();
          if (m === 'x1') handle.play(2); else if (m === 'x2') handle.pause(); else handle.play(1);
        },
        go: function(i) {
          st.i = (i % steps + steps) % steps;
          st.elapsed = 0;
          opts.onStep(st.i);
        },
        index: function() {
          return st.i;
        },
        elapsed: function() {
          return st.elapsed;
        },
        speed: speed,
        mode: mode,
        rate: function() {
          return st.paused ? 0 : speed();
        },
        isPaused: function() {
          return st.paused;
        },
        isFast: function() {
          return st.fast;
        },
        running: function() {
          return !!st.unsub;
        }
      };
      if (opts.ctl) {
        opts.ctl.innerHTML = '';
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'playbtn';
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          handle.cycle();
        });
        opts.ctl.appendChild(btn);
      }
      if (opts.stage) opts.stage.addEventListener('pointerdown', function(e) {
        if (opts.ctl && opts.ctl.contains(e.target)) return;
        handle.pause();
      }, {
        passive: true
      });
      opts.onStep(0);
      paint();
      return handle;
    }
  };
  global.Tour = Tour;
})(window);