(function(global) {
  'use strict';
  var D = global.D;
  var STOP = {};
  'a an and are as at be by for from has have in into is it its of on or that the this to was were what which who why with how does do did if not no can could should would will their there these those than then when where whether one two three between over under about after before more most such also only same into'.split(' ').forEach(function(w) {
    STOP[w] = 1;
  });
  function unpack(emb, dim) {
    var bin = global.atob(emb.q);
    var n = emb.n;
    var out = new Float32Array(n * dim);
    for (var i = 0; i < n; i++) {
      var s = emb.scale[i];
      var base = i * dim;
      var sum = 0;
      for (var j = 0; j < dim; j++) {
        var b = bin.charCodeAt(base + j);
        if (b > 127) b -= 256;
        var v = b * s;
        out[base + j] = v;
        sum += v * v;
      }
      var inv = sum > 0 ? 1 / Math.sqrt(sum) : 0;
      for (j = 0; j < dim; j++) out[base + j] *= inv;
    }
    return out;
  }
  function normalise(v) {
    var sum = 0, i;
    for (i = 0; i < v.length; i++) sum += v[i] * v[i];
    var inv = sum > 0 ? 1 / Math.sqrt(sum) : 0;
    var out = new Float32Array(v.length);
    for (i = 0; i < v.length; i++) out[i] = v[i] * inv;
    return out;
  }
  function dotAll(q, mat, dim, n) {
    var out = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var s = 0, base = i * dim;
      for (var j = 0; j < dim; j++) s += q[j] * mat[base + j];
      out[i] = s;
    }
    return out;
  }
  function tokens(text) {
    return String(text).toLowerCase().replace(/[’']s\b/g, '').split(/[^a-z0-9]+/).filter(function(w) {
      return w.length > 1 && !STOP[w];
    }).map(function(w) {
      return w.length > 5 ? w.replace(/(ing|ed|es|s)$/, '') : w.length > 3 ? w.replace(/s$/, '') : w;
    });
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function sim(x) {
    return D.dec(x, 2);
  }
  var Ask = {
    data: null,
    dim: 384,
    P: null,
    S: null,
    R: null,
    sentsOf: null,
    idf: null,
    ptoks: null,
    model: null,
    loading: null,
    mode: 'question',
    enter: function() {
      if (global.Mascot) global.Mascot.enter();
    },
    leave: function() {
      if (global.Mascot) global.Mascot.leave();
    },
    init: function(data) {
      this.data = data;
      this.dim = data.dim;
      this.P = unpack(data.p_emb, data.dim);
      this.S = unpack(data.s_emb, data.dim);
      this.R = unpack(data.r_emb, data.dim);
      var by = [];
      data.passages.forEach(function() {
        by.push([]);
      });
      data.sents.forEach(function(s, i) {
        by[s[0]].push(i);
      });
      this.sentsOf = by;
      var df = {}, self = this;
      this.ptoks = data.passages.map(function(p) {
        var t = tokens(p.text), seen = {};
        t.forEach(function(w) {
          if (!seen[w]) {
            seen[w] = 1;
            df[w] = (df[w] || 0) + 1;
          }
        });
        return t;
      });
      var N = data.passages.length;
      this.idf = {};
      Object.keys(df).forEach(function(w) {
        self.idf[w] = Math.log((N + 1) / (df[w] + .5));
      });
      this.wire();
      this.status();
      if (global.Mascot) global.Mascot.init(document.getElementById('mascot'));
    },
    wire: function() {
      var self = this;
      D.keys(document.getElementById('askmode'), [ {
        id: 'question',
        label: 'A question',
        on: true,
        tone: 'neutral'
      }, {
        id: 'record',
        label: 'Your record',
        on: false,
        tone: 'neutral'
      } ], {
        mode: 'one',
        onChange: function(s, id) {
          self.mode = id;
          document.getElementById('askqform').hidden = id !== 'question';
          document.getElementById('askrform').hidden = id !== 'record';
          document.getElementById('askout').innerHTML = '';
        }
      });
      document.getElementById('askqform').addEventListener('submit', function(e) {
        e.preventDefault();
        self.question(document.getElementById('askqinput').value);
      });
      document.getElementById('askrform').addEventListener('submit', function(e) {
        e.preventDefault();
        self.record(document.getElementById('askrinput').value);
      });
      document.getElementById('askload').addEventListener('click', function() {
        self.load();
      });
    },
    status: function(msg) {
      var el = document.getElementById('askstate');
      if (msg !== undefined) {
        el.textContent = msg;
        return;
      }
      el.textContent = this.model ? 'Model loaded. Questions and records are embedded in this browser; nothing leaves the page.' : 'Until the model is loaded, questions are matched by keyword and the record reading is unavailable.';
    },
    load: function() {
      var self = this;
      if (this.model || this.loading) return this.loading;
      var pill = document.getElementById('askload');
      var bar = document.getElementById('askbar');
      var wrap = document.getElementById('askprogress');
      pill.disabled = true;
      pill.textContent = 'Loading';
      wrap.hidden = false;
      var files = {};
      function paint() {
        var loaded = 0, total = 0;
        Object.keys(files).forEach(function(k) {
          loaded += files[k][0];
          total += files[k][1];
        });
        var f = total ? loaded / total : 0;
        bar.style.width = Math.round(f * 100) + '%';
        self.status('Loading the model, ' + Math.round(loaded / 1048576) + ' of ' + Math.round(total / 1048576 || 24) + ' MB.');
      }
      this.loading = import(new URL('js/vendor/transformers.min.js?v=2', document.baseURI).href).then(function(T) {
        var env = T.env;
        env.allowRemoteModels = false;
        env.allowLocalModels = true;
        env.localModelPath = new URL('models/', document.baseURI).href;
        env.useBrowserCache = true;
        env.backends.onnx.wasm.wasmPaths = new URL('js/vendor/', document.baseURI).href;
        env.backends.onnx.wasm.numThreads = 1;
        env.backends.onnx.wasm.proxy = false;
        return T.pipeline('feature-extraction', 'all-MiniLM-L6-v2', {
          quantized: true,
          progress_callback: function(p) {
            if (p.status === 'progress' && p.file) {
              files[p.file] = [ p.loaded || 0, p.total || 0 ];
              paint();
            }
            if (p.status === 'done' && p.file && files[p.file]) files[p.file][0] = files[p.file][1];
          }
        });
      }).then(function(pipe) {
        self.model = pipe;
        bar.style.width = '100%';
        pill.hidden = true;
        wrap.hidden = true;
        self.status();
        if (self.mode === 'question' && document.getElementById('askqinput').value.trim()) self.question(document.getElementById('askqinput').value);
        return pipe;
      }).catch(function(e) {
        self.loading = null;
        pill.disabled = false;
        pill.textContent = 'Load model (23 MB, once)';
        wrap.hidden = true;
        self.status('The model did not load: ' + String(e && e.message ? e.message : e) + '. Keyword matching remains available.');
      });
      return this.loading;
    },
    embed: function(text) {
      return this.model(text, {
        pooling: 'mean',
        normalize: true
      }).then(function(t) {
        return normalise(new Float32Array(t.data));
      });
    },
    bestSentence: function(pid, scoreSentence) {
      var ids = this.sentsOf[pid], best = -1, bs = -Infinity;
      for (var i = 0; i < ids.length; i++) {
        var s = scoreSentence(ids[i]);
        if (s > bs) {
          bs = s;
          best = ids[i];
        }
      }
      return best;
    },
    question: function(text) {
      var self = this, d = this.data;
      text = String(text || '').trim();
      var out = document.getElementById('askout');
      if (!text) {
        out.innerHTML = '';
        return;
      }
      if (this.model) {
        out.innerHTML = '<p class="fine">Embedding the question.</p>';
        this.embed(text).then(function(q) {
          var pp = dotAll(q, self.P, self.dim, d.passages.length);
          var ss = dotAll(q, self.S, self.dim, d.sents.length);
          var ps = new Float32Array(pp.length);
          for (var i = 0; i < pp.length; i++) {
            var best = self.bestSentence(i, function(k) {
              return ss[k];
            });
            ps[i] = best >= 0 ? (pp[i] + ss[best]) / 2 : pp[i];
          }
          self.showPassages(ps, function(i) {
            return ss[i];
          }, 'embedding');
        }).catch(function(e) {
          out.innerHTML = '<p class="fine">' + esc(String(e && e.message ? e.message : e)) + '</p>';
        });
        return;
      }
      var qt = tokens(text), idf = this.idf;
      var qset = {};
      qt.forEach(function(w) {
        qset[w] = 1;
      });
      var qw = Object.keys(qset);
      var ps = new Float32Array(d.passages.length);
      this.ptoks.forEach(function(t, i) {
        var seen = {}, s = 0;
        t.forEach(function(w) {
          if (qset[w] && !seen[w]) {
            seen[w] = 1;
            s += idf[w] || 0;
          }
        });
        ps[i] = s / Math.sqrt(t.length + 20);
      });
      var stoks = d.sents.map(function(sp) {
        return tokens(d.passages[sp[0]].text.slice(sp[1], sp[2]));
      });
      this.showPassages(ps, function(i) {
        var seen = {}, s = 0;
        stoks[i].forEach(function(w) {
          if (qset[w] && !seen[w]) {
            seen[w] = 1;
            s += idf[w] || 0;
          }
        });
        return s / Math.sqrt(stoks[i].length + 8);
      }, qw.length ? 'keyword' : 'none');
    },
    showPassages: function(ps, scoreSentence, how) {
      var d = this.data, self = this;
      var out = document.getElementById('askout');
      var order = [];
      for (var i = 0; i < ps.length; i++) order.push(i);
      order.sort(function(a, b) {
        return ps[b] - ps[a];
      });
      var top = order.slice(0, 3).filter(function(i) {
        return ps[i] > 0;
      });
      if (how === 'none' || !top.length) {
        out.innerHTML = '<p class="fine">No passage shares a word with the question. Load the model for a reading by meaning.</p>';
        return;
      }
      var html = '<div class="asklead">Closest passages in the paper' + (how === 'keyword' ? ', by keyword' : '') + '</div>';
      top.forEach(function(pid) {
        var p = d.passages[pid];
        var best = self.bestSentence(pid, scoreSentence);
        var body;
        if (best >= 0) {
          var sp = d.sents[best];
          body = esc(p.text.slice(0, sp[1])) + '<mark>' + esc(p.text.slice(sp[1], sp[2])) + '</mark>' + esc(p.text.slice(sp[2]));
        } else body = esc(p.text);
        body = body.replace(/\*([^*<]+)\*/g, '<em>$1</em>');
        html += '<div class="passage"><div class="where">' + esc(p.sec) + (p.head ? ' ' + esc(p.head) : '') + (how === 'embedding' ? ' <span class="simv">' + sim(ps[pid]) + '</span>' : '') + '</div><div class="ptext">' + body + '</div></div>';
      });
      html += '<p class="fine">' + (how === 'embedding' ? 'Passages ranked by the mean of two cosine similarities, question to passage and question to the closest sentence within it; that sentence is highlighted and the number is the mean.' : 'Passages ranked by shared words weighted by their rarity across the paper; the highlighted sentence shares most with the question.') + ' Section numbers refer to the article.</p>';
      out.innerHTML = html;
      if (global.Mascot) global.Mascot.results();
    },
    record: function(text) {
      var self = this, d = this.data;
      text = String(text || '').trim();
      var out = document.getElementById('askout');
      if (!text) {
        out.innerHTML = '';
        return;
      }
      if (!this.model) {
        out.innerHTML = '<p class="fine">Reading a record needs the model. Load it above.</p>';
        return;
      }
      out.innerHTML = '<p class="fine">Embedding the description.</p>';
      var parts = text.split(/(?<=[.?!])\s+(?=[A-Z“(])/).filter(function(t) {
        return t.trim().length > 12;
      });
      if (parts.length < 2) parts = [];
      Promise.all([ text ].concat(parts).map(function(t) {
        return self.embed(t);
      })).then(function(qs) {
        var rs = new Float32Array(d.protos.length);
        qs.forEach(function(q) {
          var r = dotAll(q, self.R, self.dim, d.protos.length);
          for (var i = 0; i < r.length; i++) if (r[i] > rs[i]) rs[i] = r[i];
        });
        var byAsk = {};
        d.protos.forEach(function(r, i) {
          var cur = byAsk[r.ask];
          if (!cur || rs[i] > cur.s) byAsk[r.ask] = {
            s: rs[i],
            i: i
          };
        });
        var ranked = d.asks.map(function(a) {
          return {
            ask: a,
            s: byAsk[a.id] ? byAsk[a.id].s : -1,
            i: byAsk[a.id] ? byAsk[a.id].i : -1
          };
        }).sort(function(a, b) {
          return b.s - a.s;
        });
        var topS = ranked[0].s;
        var html = '<div class="asklead">Which of the paper’s asks the description is closest to</div>';
        ranked.forEach(function(r, k) {
          var near = r.s >= topS - .08 && r.s > .15;
          var proto = d.protos[r.i];
          html += '<div class="ask' + (near ? '' : ' muted') + '"><span class="n">' + esc(r.ask.label) + ', ' + esc(r.ask.cost) + ' <span class="simv">' + sim(r.s) + '</span></span>' + esc(r.ask.quote) + (proto && proto.text !== r.ask.quote ? '<br><span class="also">Closest sentence: ' + esc(proto.text) + '</span>' : '') + '</div>';
        });
        html += '<p class="fine">Each ask is scored by the highest cosine similarity between the description, whole or sentence by sentence, and the sentences of the article that state it; the number is that similarity. Asks within .08 of the top score are shown in full, the others greyed. The quoted text is the article’s own.</p>';
        out.innerHTML = html;
        if (global.Mascot) global.Mascot.results();
      }).catch(function(e) {
        out.innerHTML = '<p class="fine">' + esc(String(e && e.message ? e.message : e)) + '</p>';
      });
    }
  };
  Ask.unpack = unpack;
  Ask.tokens = tokens;
  global.Ask = Ask;
})(typeof window !== 'undefined' ? window : this);