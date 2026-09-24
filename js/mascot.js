(function(global) {
  'use strict';
  var M = global.M;
  var LENGTH = {
    wave: 1500,
    nod: 1100,
    look: 1800,
    tilt: 1600,
    blink: 900,
    stretch: 1600,
    card: 2200,
    point: 2e3
  };
  var IDLE = [ 'wave', 'nod', 'look', 'tilt', 'blink', 'stretch', 'card' ];
  var ALL = IDLE.concat([ 'point' ]);
  var Mascot = {
    el: null,
    last: null,
    timer: null,
    busy: null,
    active: false,
    init: function(el) {
      this.el = el;
    },
    enter: function() {
      if (!this.el || M.reduced) return;
      this.active = true;
      this.schedule();
    },
    leave: function() {
      this.active = false;
      clearTimeout(this.timer);
      this.timer = null;
      this.end();
    },
    schedule: function() {
      var self = this;
      clearTimeout(this.timer);
      this.timer = setTimeout(function() {
        self.timer = null;
        self.perform(self.pick());
      }, 6e3 + Math.random() * 6e3);
    },
    pick: function() {
      var last = this.last;
      var pool = IDLE.filter(function(g) {
        return g !== last;
      });
      return pool[Math.floor(Math.random() * pool.length)];
    },
    perform: function(name) {
      if (!this.active || !LENGTH[name]) return;
      var self = this;
      this.end();
      this.el.classList.add('g-' + name);
      this.last = name;
      this.busy = setTimeout(function() {
        self.busy = null;
        self.end();
        self.schedule();
      }, LENGTH[name]);
    },
    end: function() {
      clearTimeout(this.busy);
      this.busy = null;
      var el = this.el;
      if (el) ALL.forEach(function(g) {
        el.classList.remove('g-' + g);
      });
    },
    results: function() {
      if (!this.active || this.last === 'point') return;
      this.perform('point');
    }
  };
  global.Mascot = Mascot;
})(window);