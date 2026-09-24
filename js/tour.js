(function(global) {
  'use strict';
  var Tour = {
    make: function(opts) {
      var state = {
        i: 0,
        paused: false,
        elapsed: 0,
        last: null,
        stop: null
      };
      var dwell = opts.dwell || 6e3;
      function tick(t) {
        if (state.last === null) state.last = t;
        var dt = Math.min(100, t - state.last);
        state.last = t;
        var halted = state.paused || global.M.isPaused();
        state.elapsed = Math.min(dwell, state.elapsed + dt);
        if (opts.onProgress) opts.onProgress(state.elapsed / dwell, state.elapsed);
        if (!halted && state.elapsed >= dwell) {
          state.elapsed = 0;
          state.i = (state.i + 1) % opts.steps;
          opts.onStep(state.i);
        }
        state.stop = global.M.frame(tick);
      }
      var handle = {
        pause: function() {
          state.paused = true;
          if (opts.onPause) opts.onPause();
        },
        resume: function() {
          state.paused = false;
          if (state.elapsed >= dwell) state.elapsed = dwell - 1;
          if (opts.onResume) opts.onResume();
        },
        go: function(i) {
          state.i = (i % opts.steps + opts.steps) % opts.steps;
          state.elapsed = 0;
          opts.onStep(state.i);
        },
        advance: function(ms) {
          state.elapsed = Math.min(dwell, state.elapsed + ms);
        },
        index: function() {
          return state.i;
        },
        elapsed: function() {
          return state.elapsed;
        },
        isPaused: function() {
          return state.paused;
        }
      };
      global.M.register(handle);
      opts.onStep(0);
      state.stop = global.M.frame(tick);
      return handle;
    }
  };
  global.Tour = Tour;
})(window);