/* Reading rule: a short checklist for a reader holding any maintained taxonomy or classified
   record. The answers select which of the paper’s three asks applies (section 8.2) and what the
   keeper is asked for (section 8.3). All wording comes from data/rule.json. */
(function (global) {
  'use strict';

  var D = global.D;

  var Rule = {
    data: null, answers: {},

    init: function (data) {
      this.data = data;
      var self = this;
      var q = document.getElementById('rulequestions');
      q.innerHTML = '';
      data.questions.forEach(function (qq) {
        var div = document.createElement('div');
        div.className = 'question';
        var p = document.createElement('div');
        p.className = 'q';
        p.textContent = qq.text;
        div.appendChild(p);
        var keys = document.createElement('div');
        keys.className = 'keys';
        div.appendChild(keys);
        q.appendChild(div);
        D.keys(keys, qq.options.map(function (o) { return { id: o[0], label: o[1], on: false, tone: 'neutral' }; }),
          { mode: 'one', onChange: function (s, id) { self.answers[qq.id] = id; self.render(); } });
      });
      this.render();
    },

    render: function () {
      var a = this.answers, d = this.data;
      var out = document.getElementById('ruleout');
      var answered = Object.keys(a).length;
      var asks = d.asks.slice();
      var apply = {};
      var reasons = {};
      /* ask 1 always applies; it is the cheapest */
      apply.when = true;
      reasons.when = a.dated === 'neither' ? 'the categories and assignments carry no date, so the question has to be answered from outside the record'
        : a.dated === 'categories' ? 'categories are dated and assignments are not, which is the position of the scheme studied here'
          : a.dated === 'both' ? 'categories and assignments are dated, so the question can be answered from the record itself' : '';
      /* ask 2 applies where the artefact is versioned */
      apply.two = a.versioned === 'yes';
      reasons.two = a.versioned === 'yes'
        ? (a.join === 'yes' ? 'the record is versioned and a second vintage is a join' : a.join === 'no' ? 'the record is versioned; the second vintage has to be assembled before it can be read' : 'the record is versioned')
        : a.versioned === 'no' ? 'the record is not versioned, so two versions cannot be read' : '';
      /* ask 3 applies where it is not versioned, and coupling is what does the damage */
      apply.coupling = a.versioned !== 'yes';
      reasons.coupling = a.coupled === 'yes' ? 'the writing is coupled to the outcome, which is what does the damage here'
        : a.coupled === 'no' ? 'the writing is stated to be independent of the outcome; outcome-blind maintenance is the null against which dependence has to be shown'
          : a.coupled === 'unknown' ? 'whether the writing is coupled to the outcome is not known' : '';
      var html = '<h3>Which of the three asks applies</h3>';
      asks.forEach(function (k) {
        var on = apply[k.id];
        html += '<div class="ask' + (on ? '' : ' muted') + '"><span class="n">ask ' + k.order + ', ' + k.cost + (on ? '' : ', does not apply to this record') + '</span>' + k.text +
          (reasons[k.id] ? '<br><span style="color:#3b3b3b">' + reasons[k.id] + '.</span>' : '') + '</div>';
      });
      html += '<h3>What to report</h3><ul>' + d.report.map(function (r) { return '<li>' + r.text + '</li>'; }).join('') + '</ul>';
      var keeper = a.dated === 'neither' || a.dated === 'categories' || a.versioned === 'no';
      if (keeper) {
        html += '<h3>What this asks of the keeper</h3><ul>' + d.keeper.slice(0, 2).map(function (r) { return '<li>' + r.text + '</li>'; }).join('') + '</ul>' +
          '<div class="note">' + d.keeper[2].text + '</div>';
      }
      html += '<div class="note">' + d.not_to_conclude + (answered < d.questions.length ? '' : '') + '</div>';
      out.innerHTML = html;
    },
  };

  global.Rule = Rule;
}(window));
