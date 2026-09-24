(function(global) {
  'use strict';
  var D = global.D;
  function fmtEst(t) {
    if (t.estimate === null || t.estimate === undefined) return '';
    var s = D.pp(t.estimate) + (t.unit === 'pp' ? 'pp' : t.unit ? ' ' + t.unit : '');
    if (t.ci) s += ' <small>' + D.ci(t.ci) + '</small>';
    return s;
  }
  var Findings = {
    init: function(h) {
      var tiles = document.getElementById('tiles');
      tiles.innerHTML = h.propositions.map(function(p) {
        return '<div class="tile">' + '<div class="pid">' + p.id + ' <span>' + p.name + '</span></div>' + '<div class="claim">' + p.claim + '</div>' + '<div class="tests">' + p.tests.map(function(t) {
          return '<div class="test"><span class="id">' + t.id + '</span><span><span class="chip ' + t.label + '">' + t.label + '</span></span><span class="est">' + fmtEst(t) + '</span></div>';
        }).join('') + '</div>' + '<div class="state">' + p.state + '</div>' + '</div>';
      }).join('');
      document.getElementById('verdictline').textContent = 'Verdict of the frozen rule: ' + h.verdict + ', partially supported. Labels are those the rule assigned mechanically; nothing here is identified causally.';
    }
  };
  global.Findings = Findings;
})(window);