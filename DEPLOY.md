# Running and deploying this app

Static files only: `index.html`, `css/`, `js/`, `data/`, `models/`. No framework, no build step, no
server code, no web fonts, no external dependency at run time.

## Rebuild the data

```
python build_data.py
```

Reads `02_analysis/40_theory_kill_tests/results/` and
`02_analysis/36_specification_multiverse (fig 2, tables I and II)/results/specs.csv` and writes
`data/*.json`, including `data/provenance.json`, which records the file and key behind every
headline number. Nothing in `js/` or `index.html` holds a number of its own.

## Check the numbers

```
node check_numbers.js
```

Recomputes or looks up every headline value the app displays against `data/` and prints
`N of N checks passed`. Run it after every data rebuild.

## Rebuild the Ask index

```
python build_ask.py
```

Splits `03_manuscript/working_v3/manuscript_v3.md` (abstract and body, tables skipped) and the figure
captions into passages and sentences, embeds them with `sentence-transformers/all-MiniLM-L6-v2` on this
machine, and writes `data/ask.json` (the passages, their section tags, the sentence spans, the
prototype sentences behind the record reading, and the embeddings) plus `data/ask_check.json` (a few
reference vectors in float). Embeddings are packed as int8: for each vector the scale is
max(abs(v)) / 127, q = round(v / scale), all q concatenated row-major and base64 encoded; the decoder
multiplies back by the scale and re-normalises. `node check_ask.js` decodes vectors with the same code
the browser runs (`js/views/ask.js`), compares them with the float references, and confirms every
passage and quoted sentence is a verbatim substring of its source.

The Ask tab runs the same model in the visitor’s browser through `@xenova/transformers` 2.17.2
(`js/vendor/transformers.min.js`, with `ort-wasm-simd.wasm` from onnxruntime-web 1.14.0) and the
quantised ONNX weights in `models/all-MiniLM-L6-v2/` (about 23 MB). Nothing is fetched from any host
but this site: `env.allowRemoteModels` is false, `env.localModelPath` and the WASM path point at this
folder, and the model is fetched only when the visitor presses the Load button, then kept in the
browser cache. Without the model the tab falls back to keyword matching over the same passages.

NOTICE. `models/all-MiniLM-L6-v2/` is the ONNX export `Xenova/all-MiniLM-L6-v2` of
`sentence-transformers/all-MiniLM-L6-v2`, licence Apache-2.0 (https://huggingface.co/Xenova/all-MiniLM-L6-v2).
`js/vendor/transformers.min.js` is `@xenova/transformers` 2.17.2, Apache-2.0 (licence text in
`js/vendor/LICENSE.transformers.txt`); `js/vendor/ort-wasm-simd.wasm` is onnxruntime-web 1.14.0, MIT.

## Serve it locally

```
python -c "import http.server,socketserver;
class T(socketserver.ThreadingMixIn, http.server.HTTPServer): daemon_threads=True;
T(('127.0.0.1',8731), http.server.SimpleHTTPRequestHandler).serve_forever()"
```

Then open `http://127.0.0.1:8731/`. Use a threaded server: the single-threaded one refuses the
parallel fetches the landing view makes. Test in a real browser; headless virtual time stalls the
animation frame.

## Deploy: GitHub Pages plus a Cloudflare subdomain

1. Create a public GitHub repository whose **root is this folder** (`05_web_app`), not the
   project root. Nothing under `01_raw_data`, `02_analysis`, `03_manuscript`,
   `04_literature_review` or `06_repository` belongs in it, and `_archive/` should be excluded
   (add it to `.gitignore`).
2. Push `main`. In the repository settings, Pages: Source "Deploy from a branch", branch `main`,
   folder `/`. `.nojekyll` is already in the folder so the `_archive` and underscore paths are
   served as they are.
3. Add a file named `CNAME` at the root containing only the subdomain, for example
   `<subdomain>.electriai.com` (fill in the name).
4. In Cloudflare, DNS for `electriai.com`: add a record
   `CNAME  <subdomain>  <github-user>.github.io`, proxy status **DNS only** (grey cloud).
5. Back in GitHub Pages, set the custom domain to `<subdomain>.electriai.com`, wait for the DNS
   check, then tick "Enforce HTTPS" once the certificate is issued. If the certificate sticks,
   remove the custom domain and add it again.
6. On every release, bump `?v=N` on every asset reference in `index.html` and in `VER` in
   `js/boot.js`; Pages caches hard.

## Structure

```
index.html            the shell, the tab bar, one section per view
css/app.css           the palette shared with the paper’s figures, and the layout
js/motion.js          one animation loop with a timeout fallback, count-ups that carry
js/tour.js            the stage clock behind every cycling figure: fast first cycle, play x1, x2, pause
js/mascot.js          the small animated character beside the question box on the Ask tab
js/draw.js            canvas helpers, the palette, number formats, hover readouts, button keys
js/hero.js            the landing picture, six stages of morphing marks
js/boot.js            data loading and the hash router
js/views/*.js         one file per view
js/vendor/            transformers.js and its ONNX runtime, served from here
models/               the sentence embedding model the Ask tab loads on request
data/*.json           generated by build_data.py, never edited by hand
build_data.py         writes data/ from the result files
check_numbers.js      the number check
build_ask.py          writes data/ask.json from the manuscript
check_ask.js          the embedding and verbatim check for the Ask tab
```

Every figure with motion (the landing picture, Record, both Vintage lab blocks, the K1 variants on
Kill tests, Multiverse) starts by itself when its tab opens. The first cycle runs at 2.5 times normal
speed, later cycles at normal speed. A click or touch anywhere on a figure pauses that figure only; the
glyph button in its corner cycles play x1, play x2, pause, and is the only way to resume. Count-ups carry
from the previous value at every speed. `prefers-reduced-motion` jumps straight to each stage’s final
state, runs no fast cycle and keeps the Ask character still.
