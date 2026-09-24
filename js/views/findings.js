(function(global) {
  'use strict';
  var D = global.D;
  function fmtEst(t) {
    if (t.estimate === null || t.estimate === undefined) return '';
    var s = D.pp(t.estimate) + (t.unit === 'pp' ? 'pp' : t.unit ? ' ' + t.unit : '');
    if (t.ci) s += ' <small>' + D.ci(t.ci) + '</small>';
    return s;
  }
  var STATE = {
    P1: [ 'Support', 'Support' ],
    P2: [ 'Support', 'Support, aggregate only' ],
    P3: [ 'Support', 'Support, one channel' ]
  };
  function state(p) {
    var s = STATE[p.id];
    if (s) return '<span class="chip ' + s[0] + '">' + s[1] + '</span>';
    return '<span class="chip">' + p.state.split(' ').slice(0, 4).join(' ') + '</span>';
  }
  var Findings = {
    init: function(h) {
      var tiles = document.getElementById('tiles');
      tiles.innerHTML = h.propositions.map(function(p) {
        return '<div class="tile">' + '<div class="pid">' + p.id + ' <span>' + p.name + '</span>' + state(p) + '</div>' + '<div class="tests">' + p.tests.map(function(t) {
          return '<div class="test"><span class="id">' + t.id + '</span><span><span class="chip ' + t.label + '">' + t.label + '</span></span><span class="est">' + fmtEst(t) + '</span></div>';
        }).join('') + '</div>' + '</div>';
      }).join('');
      document.getElementById('verdictline').textContent = 'Verdict of the frozen rule: ' + h.verdict + ', partially supported. Labels are those the rule assigned mechanically; nothing here is identified causally.';
    }
  };
  global.Findings = Findings;
})(window);