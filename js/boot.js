(function(global) {
  'use strict';
  var D = global.D;
  var VER = '?v=5';
  var store = {};
  var built = {};
  var current = null;
  var SUBTITLES = {
    findings: 'Classification vintage and the measurement of knowledge recombination',
    record: 'One record, written in instalments: as published, at the grant, today',
    vintage: 'The same 833,267 applications read from two states of their own record',
    kill: 'Preregistered tests reported as the frozen rule labelled them, failures beside successes',
    multiverse: 'How much of the answer belongs to the record and how much to ordinary modelling latitude',
    rule: 'What the paper asks of a reader holding any maintained taxonomy or classified record',
    ask: 'The article’s own passages, retrieved by meaning in this browser; no text is generated',
    verify: 'Every number on these pages, the file and key it came from, and its recomputation'
  };
  var NEEDS = {
    findings: [ 'headline', 'multiverse' ],
    record: [ 'record' ],
    vintage: [ 'vintage' ],
    kill: [ 'killtests' ],
    multiverse: [ 'multiverse' ],
    rule: [ 'rule' ],
    ask: [ 'ask' ],
    verify: [ 'provenance', 'verify', 'headline', 'vintage', 'multiverse' ]
  };
  function view(tab) {
    return {
      findings: global.HERO,
      record: global.Record,
      vintage: global.Lab,
      kill: global.Kill,
      multiverse: global.Multiverse,
      ask: global.Ask
    }[tab] || null;
  }
  function get(name) {
    return fetch('data/' + name + '.json' + VER).then(function(r) {
      if (!r.ok) throw new Error(name + ': ' + r.status);
      return r.json();
    }).then(function(j) {
      store[name] = j;
      return j;
    });
  }
  function need(name) {
    return store[name] ? Promise.resolve(store[name]) : get(name);
  }
  function show(tab) {
    if (!SUBTITLES[tab]) tab = 'findings';
    if (current && current !== tab && built[current] === 2) {
      var v = view(current);
      if (v && v.leave) v.leave();
    }
    current = tab;
    Array.prototype.forEach.call(document.querySelectorAll('.panel'), function(p) {
      p.hidden = p.id !== 'p-' + tab;
    });
    Array.prototype.forEach.call(document.querySelectorAll('.tabs a'), function(a) {
      a.className = a.dataset.tab === tab ? 'on' : '';
    });
    document.getElementById('subtitle').textContent = SUBTITLES[tab];
    global.scrollTo(0, 0);
    build(tab);
  }
  function enter(tab) {
    if (current !== tab || built[tab] !== 2) return;
    var v = view(tab);
    if (v && v.enter) v.enter();
  }
  function build(tab) {
    if (built[tab] === 2) {
      if (tab !== 'findings') global.dispatchEvent(new Event('resize'));
      enter(tab);
      return;
    }
    if (built[tab] === 1) return;
    built[tab] = 1;
    Promise.all(NEEDS[tab].map(need)).then(function() {
      if (built[tab] === 2) return;
      if (tab === 'findings') global.Findings.init(store.headline);
      if (tab === 'record') global.Record.init(store.record);
      if (tab === 'vintage') global.Lab.init(store.vintage);
      if (tab === 'kill') global.Kill.init(store.killtests);
      if (tab === 'multiverse') global.Multiverse.init(store.multiverse);
      if (tab === 'rule') global.Rule.init(store.rule);
      if (tab === 'ask') global.Ask.init(store.ask);
      if (tab === 'verify') global.Verify.init({
        provenance: store.provenance,
        verify: store.verify,
        headline: store.headline,
        vintage: store.vintage,
        multiverse: store.multiverse
      });
      built[tab] = 2;
      enter(tab);
    }).catch(fail);
  }
  function fail(e) {
    document.getElementById('main').innerHTML = '<div class="block"><h2>The data did not load</h2><p class="fine">' + String(e && e.message ? e.message : e) + '. The page reads static JSON from the data folder, so this usually means the files are being served from a path that does not match.</p></div>';
  }
  function route() {
    show((location.hash || '#findings').slice(1));
  }
  Promise.all([ get('headline'), get('multiverse') ]).then(function() {
    var h = store.headline;
    document.getElementById('footnote').textContent = 'Companion to the article. Built from ' + D.num(h.n_apps) + ' first filings under two states of their own classification record and ' + D.num(h.spec_n) + ' specifications; every number on these pages is generated from the analysis result files by build_data.py and checked by check_numbers.js. The article carries the argument.';
    var hero = new global.Hero({
      canvas: document.getElementById('herocanvas'),
      stage: document.getElementById('hero'),
      ctl: document.getElementById('heroctl'),
      title: document.getElementById('herotitle'),
      readout: document.getElementById('heroreadout'),
      picto: document.getElementById('heropicto'),
      steps: document.getElementById('herosteps'),
      boot: document.getElementById('heroboot')
    }, store.headline, store.multiverse);
    hero.start();
    global.HERO = hero;
    route();
    global.addEventListener('hashchange', route);
    [ 'record', 'vintage', 'killtests', 'rule', 'verify', 'provenance' ].forEach(function(n) {
      need(n).catch(function() {});
    });
  }).catch(fail);
})(window);