// ---------- tiny DOM helper ----------
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style') el.style.cssText = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
}
function cv(w, hgt, cls) { const c = h('canvas', { width: w, height: hgt, class: cls }); return c; }
function chipGroup(options, value, onChange, label) {
  const wrap = h('div', { class: 'row', role: 'group', 'aria-label': label || '' });
  const btns = options.map(([v, t]) => {
    const b = h('button', { class: 'chip', 'aria-pressed': String(v === value), onclick: () => { btns.forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); onChange(v); } }, t);
    return b;
  });
  wrap.append(...btns);
  return wrap;
}
function ctrl(label, ...kids) { return h('div', { class: 'ctrl' }, h('span', { class: 'lab' }, label), ...kids); }
function meter(label, pct, color, text) {
  return h('div', { class: 'meter' },
    h('div', { class: 'row', style: 'justify-content:space-between' }, h('span', { class: 'small' }, label), h('b', { class: 'small num' }, text)),
    h('div', { class: 'track' }, h('i', { style: `width:${Math.max(2, Math.min(100, pct))}%;background:${color}` })));
}
const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// animate a denoising reveal of `img` into canvas
function denoiseInto(canvas, img, ms = 1300, seed = 1, done) {
  const w = img.width, hh = img.height, u = IMG.toUnit(img), n = IMG.gaussArr(w * hh * 3, seed);
  canvas.width = w; canvas.height = hh;
  const g = canvas.getContext('2d');
  if (canvas._raf) cancelAnimationFrame(canvas._raf);
  if (reduceMotion()) { g.putImageData(img, 0, 0); done && done(); return; }
  const t0 = performance.now();
  const tick = (t) => {
    const p = Math.min(1, (t - t0) / ms);
    g.putImageData(IMG.mix(u, n, w, hh, 1 - p), 0, 0);
    if (p < 1) canvas._raf = requestAnimationFrame(tick); else { g.putImageData(img, 0, 0); done && done(); }
  };
  canvas._raf = requestAnimationFrame(tick);
}

const SIMS = {};

// =============== 1. Generation studio ===============
SIMS.studio = (root) => {
  const W = 480, H = 300;
  const tabs = h('div', { class: 'subtabs', role: 'tablist' });
  const body = h('div');
  root.append(tabs, body);
  const modes = [['t2i', 'Text-to-image'], ['cond', 'Conditional'], ['uncond', 'Unconditional']];
  let seedCounter = 3;
  const show = (m) => {
    [...tabs.children].forEach((b, i) => b.setAttribute('aria-selected', String(modes[i][0] === m)));
    body.innerHTML = '';
    ({ t2i, cond, uncond })[m]();
  };
  modes.forEach(([m, t]) => tabs.append(h('button', { role: 'tab', onclick: () => show(m) }, t)));

  function styleImg(scene, time, style, seed) {
    let base, lab = null;
    if (scene === 'lake') { const L = IMG.landscape(W, H, seed, time); base = L.img; lab = L.lab; }
    else base = IMG.city(W, H, seed, time === 'day' || time === 'winter' ? 'day' : 'dusk');
    if (style === 'poster') return IMG.posterize(base, 4);
    if (style === 'sketch') return lab ? IMG.sketch(lab, W, H) : IMG.grey(IMG.posterize(base, 3));
    return base;
  }

  function t2i() {
    const st = { scene: 'lake', time: 'sunrise', style: 'photo' };
    const out = cv(W, H); const prompt = h('div', { class: 'callout' });
    const words = { lake: 'Mountain lake with pine trees', city: 'City skyline', sunrise: 'at sunrise', day: 'on a clear day', dusk: 'at dusk', winter: 'in winter', photo: 'photorealistic', poster: 'flat travel-poster style', sketch: 'pencil line drawing' };
    const upd = () => { prompt.innerHTML = `<b>Prompt:</b> “${words[st.scene]} ${words[st.time]}, ${words[st.style]}”`; };
    const gen = () => { upd(); denoiseInto(out, styleImg(st.scene, st.time, st.style, seedCounter), 1300, seedCounter); };
    const sim = h('div', { class: 'sim' },
      h('div', { class: 'simbox' }, out, h('p', { class: 'small muted', style: 'margin-top:8px' }, 'Each press of Generate starts from new random noise, so the same prompt gives a new variation.')),
      h('div', { class: 'ctrls' },
        ctrl('Subject', chipGroup([['lake', 'Mountain lake'], ['city', 'City skyline']], st.scene, v => { st.scene = v; upd(); })),
        ctrl('Time / setting', chipGroup([['sunrise', 'Sunrise'], ['day', 'Day'], ['dusk', 'Dusk'], ['winter', 'Winter']], st.time, v => { st.time = v; upd(); })),
        ctrl('Style', chipGroup([['photo', 'Photo'], ['poster', 'Poster'], ['sketch', 'Sketch']], st.style, v => { st.style = v; upd(); })),
        prompt,
        h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => { seedCounter++; gen(); } }, 'Generate'), h('button', { class: 'btn ghost', onclick: gen }, 'Same noise, regenerate'))));
    body.append(sim); upd(); out.getContext('2d').putImageData(styleImg('lake', 'sunrise', 'photo', seedCounter), 0, 0);
  }

  function cond() {
    const GW = 24, GH = 15, cell = 20;
    let grid = new Uint8Array(GW * GH);
    let brush = 4;
    const preset = (kind) => {
      for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
        const y = j / GH, x = i / GW; let c = 0;
        if (y > 0.38 + 0.08 * Math.sin(x * 7)) c = 2;
        if (y > 0.5 + 0.05 * Math.sin(x * 11 + 1)) c = 3;
        if (y >= 0.62) c = 5;
        if (kind !== 'none' && y >= 0.62 && y < 0.86 && (kind === 'left' ? x < 0.55 : x > 0.45)) c = 4;
        if (kind === 'clear') c = y < 0.62 ? 0 : 5;
        grid[j * GW + i] = c;
      }
      if (kind !== 'clear') { grid[3 * GW + (kind === 'left' ? 17 : 5)] = 1; grid[3 * GW + (kind === 'left' ? 18 : 6)] = 1; grid[13 * GW + (kind === 'left' ? 19 : 3)] = 6; grid[12 * GW + (kind === 'left' ? 19 : 3)] = 6; grid[13 * GW + (kind === 'left' ? 21 : 1)] = 6; }
      drawMap();
    };
    const map = cv(GW * cell, GH * cell); map.style.touchAction = 'none'; map.style.cursor = 'crosshair';
    const out = cv(W, H);
    function drawMap() {
      const g = map.getContext('2d');
      for (let k = 0; k < GW * GH; k++) { const c = IMG.SEG[grid[k]]; g.fillStyle = `rgb(${c})`; g.fillRect((k % GW) * cell, Math.floor(k / GW) * cell, cell, cell); }
      g.strokeStyle = 'rgba(255,255,255,.18)';
      for (let i = 0; i <= GW; i++) { g.beginPath(); g.moveTo(i * cell, 0); g.lineTo(i * cell, GH * cell); g.stroke(); }
      for (let j = 0; j <= GH; j++) { g.beginPath(); g.moveTo(0, j * cell); g.lineTo(GW * cell, j * cell); g.stroke(); }
    }
    let down = false;
    const paint = (e) => {
      const r = map.getBoundingClientRect();
      const i = Math.floor((e.clientX - r.left) / r.width * GW), j = Math.floor((e.clientY - r.top) / r.height * GH);
      if (i < 0 || j < 0 || i >= GW || j >= GH) return;
      for (let dj = 0; dj <= 1; dj++) for (let di = 0; di <= 1; di++) if (i + di < GW && j + dj < GH) grid[(j + dj) * GW + i + di] = brush;
      drawMap();
    };
    map.addEventListener('pointerdown', e => { down = true; map.setPointerCapture(e.pointerId); paint(e); });
    map.addEventListener('pointermove', e => { if (down) paint(e); });
    map.addEventListener('pointerup', () => down = false);
    const sw = h('div', { class: 'palette' });
    const brushes = [[0, 'Sky'], [1, 'Sun'], [3, 'Mountain'], [4, 'Water'], [5, 'Grass'], [6, 'Tree']];
    brushes.forEach(([c, t]) => {
      const b = h('button', { class: 'swatch', 'aria-pressed': String(c === brush), onclick: () => { brush = c; [...sw.children].forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); } }, h('i', { style: `background:rgb(${IMG.SEG[c]})` }), t);
      sw.append(b);
    });
    let pal = 'day';
    const renderMap = () => {
      const w = W, hh = H, lab = new Uint8Array(w * hh);
      // sample the painted grid through a gentle warp so block edges become natural contours
      for (let j = 0; j < hh; j++) for (let i = 0; i < w; i++) {
        const x = i + 9 * Math.sin(j * 0.045 + 1.3) + 4 * Math.sin(j * 0.13), y = j + 7 * Math.sin(i * 0.035) + 3 * Math.sin(i * 0.11 + 2);
        const gi = Math.min(GW - 1, Math.max(0, Math.floor(x / w * GW))), gj = Math.min(GH - 1, Math.max(0, Math.floor(y / hh * GH)));
        lab[j * w + i] = grid[gj * GW + gi];
      }
      const jit = lab;
      let sxs = 0, sn = 0; for (let k = 0; k < GW * GH; k++) if (grid[k] === 1) { sxs += (k % GW) / GW; sn++; }
      const img = IMG.blur(IMG.render(jit, w, hh, pal, sn ? sxs / sn + 0.5 / GW : 0.7), 1);
      denoiseInto(out, img, 1200, 9);
    };
    const classOut = (k) => {
      const img = k === 'landscape' ? IMG.landscape(W, H, ++seedCounter, ['day', 'sunrise', 'dusk'][seedCounter % 3]).img : k === 'city' ? IMG.city(W, H, ++seedCounter) : IMG.animal(W, H, k);
      denoiseInto(out, img, 1100, seedCounter);
    };
    const i2i = (k) => {
      const L = IMG.landscape(W, H, 12, 'day');
      const input = k === 'sketch' ? IMG.sketch(L.lab, W, H) : IMG.grey(L.img);
      const g = out.getContext('2d'); out.width = W; out.height = H; g.putImageData(input, 0, 0);
      setTimeout(() => denoiseInto(out, k === 'sketch' ? IMG.landscape(W, H, 12, 'sunrise').img : L.img, 1100, 4), 700);
    };
    body.append(h('div', { class: 'sim' },
      h('div', { class: 'simbox' },
        h('div', { class: 'row', style: 'justify-content:space-between;margin-bottom:8px' }, h('b', {}, 'Segmentation map (paint it)'), h('div', { class: 'row' },
          h('button', { class: 'btn ghost small', onclick: () => preset('left') }, 'Lake left'), h('button', { class: 'btn ghost small', onclick: () => preset('right') }, 'Lake right'), h('button', { class: 'btn ghost small', onclick: () => preset('clear') }, 'Clear'))),
        map, h('div', { style: 'margin-top:10px' }, sw)),
      h('div', { class: 'ctrls' },
        h('div', { class: 'simbox' }, out),
        ctrl('Lighting of the render', chipGroup([['day', 'Day'], ['sunrise', 'Sunrise'], ['dusk', 'Dusk']], pal, v => pal = v)),
        h('button', { class: 'btn', onclick: renderMap }, 'Render segmentation map'),
        ctrl('Other conditions', h('div', { class: 'row' },
          h('button', { class: 'chip', onclick: () => classOut('landscape') }, "class = 'landscape'"), h('button', { class: 'chip', onclick: () => classOut('city') }, "class = 'city'"), h('button', { class: 'chip', onclick: () => classOut('cat') }, "class = 'cat'"),
          h('button', { class: 'chip', onclick: () => i2i('sketch') }, 'Sketch → render'), h('button', { class: 'chip', onclick: () => i2i('bw') }, 'B&W → colour'))))));
    preset('left'); renderMap();
  }

  function uncond() {
    let data = 'land';
    const out = cv(W, H); const hist = h('div', { class: 'thumbs' });
    const gen = () => {
      seedCounter++;
      const r = IMG.rng(seedCounter * 13);
      const img = data === 'land' ? IMG.landscape(W, H, seedCounter, ['day', 'sunrise', 'dusk', 'winter'][Math.floor(r() * 4)]).img : IMG.city(W, H, seedCounter, r() < 0.5 ? 'day' : 'dusk');
      denoiseInto(out, img, 1100, seedCounter, () => {
        const t = cv(120, 75); t.getContext('2d').drawImage(out, 0, 0, 120, 75);
        hist.prepend(t); while (hist.children.length > 8) hist.lastChild.remove();
      });
    };
    body.append(h('div', { class: 'sim' },
      h('div', { class: 'simbox' }, out, h('p', { class: 'small muted', style: 'margin:10px 0 6px' }, 'History'), hist),
      h('div', { class: 'ctrls' },
        h('div', { class: 'callout' }, h('b', {}, 'Input given: none. '), 'No prompt, no label, no map. Only random noise and what the model learned.'),
        ctrl('Model was trained on', chipGroup([['land', 'Landscapes'], ['city', 'Cities']], data, v => { data = v; hist.innerHTML = ''; })),
        h('button', { class: 'btn', onclick: gen }, 'Generate'),
        h('p', { class: 'small muted' }, 'Uses: exploratory creativity, abstract art, novel unexpected visuals, and synthetic datasets for training other AI models.'))));
    gen();
  }
  show('t2i');
};

// =============== 2. Diffusion simulator ===============
SIMS.diffusion = (root, ctx = {}) => {
  const W = 480, H = 300; const card = ctx.card;
  const st = { data: 'land', steps: 50, res: card ? card.quality[1] : 512, latent: false, imgs: card ? card.images : 2000, gpus: card ? card.hardware[1] : 1, seed: 3, mode: 'reverse', s: 0 };
  const out = cv(W, H);
  const slider = h('input', { type: 'range', min: 0, max: 50, value: 0, id: 'diff-scrub', 'aria-label': 'Denoising step' });
  const stepLab = h('span', { class: 'readout' });
  const cost = h('div', { class: 'ctrls' });
  let u, n, target;
  const prep = () => {
    const base = st.data === 'land' ? IMG.landscape(W, H, (st.seed % 6) + 1, ['day', 'sunrise', 'dusk'][st.seed % 3]).img : IMG.city(W, H, st.seed, st.seed % 2 ? 'dusk' : 'day');
    target = st.steps <= 10 ? IMG.blur(base, 1) : base;
    u = IMG.toUnit(target); n = IMG.gaussArr(W * H * 3, st.seed * 31);
  };
  const draw = () => {
    const s = +slider.value, T = st.steps;
    const frac = st.mode === 'reverse' ? 1 - s / T : s / T;
    const extra = st.steps <= 10 && st.mode === 'reverse' ? 0.12 : 0;
    out.getContext('2d').putImageData(IMG.mix(u, n, W, H, frac, extra), 0, 0);
    stepLab.textContent = st.mode === 'reverse' ? `Denoising step ${s} of ${T}${s === T ? ' — finished' : ''}` : `Training: noise added at step ${s} of ${T}${s === T ? ' — pure noise' : ''}`;
  };
  const fmt = (sec) => sec < 60 ? `${sec.toFixed(sec < 10 ? 2 : 1)} s` : sec < 3600 ? `${(sec / 60).toFixed(1)} min` : `${(sec / 3600).toFixed(1)} h`;
  const updCost = () => {
    const pixels = st.res * st.res * 3;
    const vals = st.latent ? (st.res / 8) ** 2 * 4 : pixels;
    const per = 0.05 * vals / 786432; // baseline: 0.05 s per pass for 512×512×3
    const img = st.steps * per + (st.latent ? 0.05 * (st.res / 512) ** 2 : 0);
    const total = img * st.imgs / st.gpus;
    cost.innerHTML = '';
    cost.append(
      h('h3', {}, 'Cost panel'),
      h('div', { class: 'kv' },
        h('span', {}, 'CNN passes per image'), h('b', {}, st.steps.toLocaleString()),
        h('span', {}, 'Values processed per step'), h('b', {}, vals.toLocaleString()),
        h('span', {}, 'Time per image'), h('b', {}, fmt(img)),
        h('span', {}, `Campaign (${st.imgs.toLocaleString()} images on ${st.gpus} GPU${st.gpus > 1 ? 's' : ''})`), h('b', {}, fmt(total))),
      card ? h('div', { class: 'reveal ' + (total / 3600 <= card.deadline[1] ? 'good' : 'bad') }, h('b', {}, `Your deadline: ${card.deadline[0]}. `), total / 3600 <= card.deadline[1] ? `This setup fits, using ${Math.round(total / 3600 / card.deadline[1] * 100)}% of the time available (running non-stop).` : `This setup is ${(total / 3600 / card.deadline[1]).toFixed(1)}× too slow. What would you change, and what would it cost in quality?`) : '',
      card ? '' : meter('Share of one 8-hour GPU working day', total / 288, total > 28800 ? css('--bad') : total > 14400 ? css('--warm') : css('--good'), `${Math.round(total / 288)}%`),
      h('p', { class: 'toy' }, 'Illustrative numbers: one pass of the denoiser on a 512 × 512 colour image is assumed to take 0.05 s on a GPU. Latent diffusion includes a VAE decode at the end.'),
      st.steps <= 10 ? h('div', { class: 'callout' }, 'At very few steps this sampler leaves residual noise and loses fine detail: faster, but lower quality.') : '');
  };
  let raf;
  const run = () => {
    cancelAnimationFrame(raf);
    const T = st.steps, t0 = performance.now(), ms = 2600;
    const tick = (t) => { const p = Math.min(1, (t - t0) / ms); slider.value = Math.round(p * T); draw(); if (p < 1) raf = requestAnimationFrame(tick); };
    if (reduceMotion()) { slider.value = T; draw(); } else raf = requestAnimationFrame(tick);
  };
  slider.addEventListener('input', draw);
  const resetSteps = () => { slider.max = st.steps; slider.value = 0; prep(); draw(); updCost(); };
  const imgsIn = h('input', { type: 'number', min: 1, max: 100000, step: 100, value: st.imgs, id: 'diff-imgs', oninput: (e) => { st.imgs = Math.max(1, +e.target.value || 1); updCost(); } });
  const resSel = h('select', { id: 'diff-res', onchange: (e) => { st.res = +e.target.value; updCost(); } }, ...[256, 512, 1024].map(r => h('option', { value: r, selected: r === st.res }, `${r} × ${r} px`)));
  const gpuIn = h('input', { type: 'number', min: 1, max: 1000, value: st.gpus, id: 'diff-gpus', style: 'width:90px', oninput: (e) => { st.gpus = Math.max(1, +e.target.value || 1); updCost(); } });
  const lat = h('input', { type: 'checkbox', id: 'diff-latent', onchange: (e) => { st.latent = e.target.checked; updCost(); } });
  root.append(h('div', { class: 'sim' },
    h('div', { class: 'simbox' }, out,
      h('div', { style: 'margin-top:10px' }, slider), h('div', { class: 'row', style: 'justify-content:space-between' }, stepLab,
        h('div', { class: 'row' }, h('button', { class: 'btn small', onclick: run }, st.mode === 'reverse' ? 'Run' : 'Run'), h('button', { class: 'btn ghost small', onclick: () => { st.seed++; resetSteps(); } }, 'New noise'))),
      h('div', { style: 'margin-top:12px' }, chipGroup([['reverse', 'Reverse (generation)'], ['forward', 'Forward (training)']], 'reverse', v => { st.mode = v; slider.value = 0; draw(); }))),
    h('div', { class: 'ctrls' },
      ctrl('Training data', chipGroup([['land', 'Landscapes'], ['city', 'Cities']], 'land', v => { st.data = v; resetSteps(); })),
      ctrl('Denoising steps', chipGroup([[10, '10'], [50, '50'], [250, '250'], [1000, '1,000']], 50, v => { st.steps = v; resetSteps(); })),
      h('div', { class: 'row' }, ctrl('Resolution', resSel), ctrl('Images', imgsIn), ctrl('GPUs', gpuIn)),
      card ? h('p', { class: 'small muted' }, `Pre-filled from your case card (Case #${card.code}).`) : '',
      h('label', { class: 'row', for: 'diff-latent', style: 'font-weight:700' }, lat, 'Latent diffusion (VAE compresses 8× per side)'),
      cost)));
  resetSteps();
};

// =============== 3. GAN arena (toy model) ===============
function ganFigure() {
  const info = h('div', { class: 'reveal', style: 'margin-top:12px' }, 'Click any part of the diagram to see what it does.');
  const parts = {
    noise: ['D-dimensional noise vector', 'A list of D random numbers (for example D = 100). Each different vector leads the generator to a different image.'],
    gen: ['Generator network', 'Transforms the noise vector into a candidate image. It improves by learning to deceive the discriminator.'],
    fake: ['Fake images', 'Synthetic images made by the generator, sent to the discriminator to be judged.'],
    real: ['Real images', 'Images from the training dataset. The discriminator compares fakes against these.'],
    disc: ['Discriminator network', 'Evaluates each image and predicts whether it is real or fake. It improves at telling them apart.'],
    labels: ['Predicted labels', 'The discriminator’s verdict (real or fake). Its errors give feedback that updates both networks.']
  };
  const svg = `<svg viewBox="0 0 760 260" role="img" aria-label="Figure 2: the GAN image creation process" style="width:100%;height:auto;font-family:var(--body)">
  <defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="currentColor"/></marker></defs>
  <g style="color:var(--muted)" stroke="currentColor" stroke-width="2.5" fill="none" marker-end="url(#ah)">
   <path d="M95 160 H150"/><path d="M290 160 H335 L360 190"/><path d="M500 75 L555 115"/><path d="M500 200 L555 150"/><path d="M700 132 H740"/>
  </g>
  <g data-p="noise" style="cursor:pointer">${Array.from({ length: 8 }, (_, i) => `<rect x="40" y="${100 + i * 15}" width="44" height="12" rx="2" fill="hsl(${220 + i * 9} 60% ${45 + (i % 3) * 12}%)"/>`).join('')}<text x="62" y="240" text-anchor="middle" font-size="13" fill="var(--muted)">noise vector</text></g>
  <g data-p="gen" style="cursor:pointer"><rect x="152" y="125" width="136" height="70" rx="12" fill="var(--sl-soft)" stroke="var(--sl)" stroke-width="2.5"/><text x="220" y="165" text-anchor="middle" font-size="17" font-weight="700" fill="var(--ink)">Generator</text></g>
  <g data-p="real" style="cursor:pointer"><rect x="365" y="40" width="130" height="70" rx="10" fill="var(--good-soft)" stroke="var(--good)" stroke-width="2"/><text x="430" y="80" text-anchor="middle" font-size="15" font-weight="700" fill="var(--ink)">Real images</text></g>
  <g data-p="fake" style="cursor:pointer"><rect x="365" y="170" width="130" height="70" rx="10" fill="var(--bad-soft)" stroke="var(--bad)" stroke-width="2"/><text x="430" y="210" text-anchor="middle" font-size="15" font-weight="700" fill="var(--ink)">Fake images</text></g>
  <g data-p="disc" style="cursor:pointer"><rect x="558" y="98" width="140" height="70" rx="12" fill="var(--warm-soft)" stroke="var(--warm)" stroke-width="2.5"/><text x="628" y="138" text-anchor="middle" font-size="16" font-weight="700" fill="var(--ink)">Discriminator</text></g>
  <g data-p="labels" style="cursor:pointer"><text x="745" y="120" text-anchor="end" font-size="13" fill="var(--muted)">real /</text><text x="745" y="152" text-anchor="end" font-size="13" fill="var(--muted)">fake</text></g>
  </svg>`;
  const box = h('div', { class: 'simbox', html: svg });
  box.addEventListener('click', (e) => { const g = e.target.closest('[data-p]'); if (g) { const [t, d] = parts[g.dataset.p]; info.innerHTML = `<b>${t}.</b> ${d}`; } });
  return h('div', {}, h('p', { class: 'small muted', style: 'margin-bottom:6px' }, 'Figure 2 (redrawn): the GAN image creation process'), box, info);
}

SIMS.gan = (root) => {
  const kinds = ['Lakes', 'Cities', 'Cats', 'Dogs'];
  const protos = [IMG.landscape(120, 76, 2, 'day').img, IMG.city(120, 76, 4), IMG.animal(120, 76, 'cat'), IMG.animal(120, 76, 'dog')];
  const pu = protos.map(IMG.toUnit), pn = IMG.gaussArr(120 * 76 * 3, 77);
  const gS = h('input', { type: 'range', min: 0.1, max: 1, step: 0.1, value: 0.5, id: 'gan-g' });
  const dS = h('input', { type: 'range', min: 0.1, max: 1, step: 0.1, value: 0.5, id: 'gan-d' });
  const gR = h('b', { class: 'num' }), dR = h('b', { class: 'num' });
  const ls = h('input', { type: 'checkbox', id: 'gan-ls' }), mb = h('input', { type: 'checkbox', id: 'gan-mb' });
  const chart = cv(560, 220); const samples = h('div', { class: 'thumbs' }); const dist = cv(560, 120);
  const status = h('div', { class: 'reveal' });
  let S, raf;
  const reset = () => { cancelAnimationFrame(raf); S = { ep: 0, q: 0.05, d: 0.15, w: [0.25, 0.25, 0.25, 0.25], hist: [] }; record(); paint(); };
  const acc = () => Math.min(1, Math.max(0.5, 0.5 + 0.5 * (S.d - S.q) + 0.02));
  const divers = () => { const H = -S.w.reduce((a, p) => a + (p > 1e-6 ? p * Math.log(p) : 0), 0); return Math.exp(H) / 4; };
  const record = () => S.hist.push([acc(), S.q, divers()]);
  const step = () => {
    const lg = +gS.value, ld = +dS.value, smooth = ls.checked, mini = mb.checked;
    const dcap = smooth ? 0.9 : 1.0;
    S.d += 0.03 * ld * (dcap - S.d);
    const gap = S.d - S.q;
    const useful = gap > (smooth ? 0.5 : 0.32) ? Math.exp(-(gap - (smooth ? 0.5 : 0.32)) * 12) : 1;
    const signal = Math.min(1, S.d / 0.5);
    S.q += 0.03 * lg * useful * signal * (1 - S.q);
    S.q = Math.min(S.q, S.d + 0.06);
    if (lg + ld > 1.3 && !smooth) { const a = (lg + ld - 1.3); S.q += 0.05 * a * Math.sin(S.ep * 0.3); S.d += 0.03 * a * Math.cos(S.ep * 0.3); }
    S.q = Math.max(0.02, Math.min(0.97, S.q)); S.d = Math.max(0.05, Math.min(1, S.d));
    if (lg > 1.8 * ld && S.d - S.q < 0.08 && S.ep > 20) {
      const top = S.w.indexOf(Math.max(...S.w)); const rate = 0.015 * (lg / ld - 1) * (mini ? 0.1 : 1);
      S.w = S.w.map((p, i) => i === top ? p + rate * (1 - p) : p * (1 - rate));
    }
    if (mini) S.w = S.w.map(p => p * 0.95 + 0.25 * 0.05);
    const sum = S.w.reduce((a, b) => a + b); S.w = S.w.map(p => p / sum);
    S.ep++; record();
  };
  const paint = () => {
    gR.textContent = (+gS.value).toFixed(1); dR.textContent = (+dS.value).toFixed(1);
    // chart
    const g = chart.getContext('2d'), w = chart.width, hh = chart.height, pad = 34;
    g.clearRect(0, 0, w, hh);
    g.strokeStyle = css('--line'); g.lineWidth = 1; g.fillStyle = css('--muted'); g.font = '12px sans-serif';
    for (const v of [0, 0.5, 1]) { const y = hh - pad + (pad - hh + 14) * v; g.beginPath(); g.moveTo(pad, y); g.lineTo(w - 8, y); g.stroke(); g.fillText(v === 0.5 ? '50%' : v ? '100%' : '0%', 2, y + 4); }
    g.fillText('epoch 0', pad, hh - 12); g.fillText('300', w - 30, hh - 12);
    const cols = [css('--warm'), css('--sl'), css('--hl')];
    for (let s = 0; s < 3; s++) {
      g.strokeStyle = cols[s]; g.lineWidth = 2.5; g.beginPath();
      S.hist.forEach((r, i) => { const x = pad + (w - pad - 8) * i / 300, y = hh - pad + (pad - hh + 14) * r[s]; i ? g.lineTo(x, y) : g.moveTo(x, y); });
      g.stroke();
      const last = S.hist[S.hist.length - 1];
      g.fillStyle = cols[s]; g.beginPath(); g.arc(pad + (w - pad - 8) * (S.hist.length - 1) / 300, hh - pad + (pad - hh + 14) * last[s], 4, 0, 7); g.fill();
    }
    // distribution bars
    const d = dist.getContext('2d'); d.clearRect(0, 0, dist.width, dist.height); d.font = '13px sans-serif';
    kinds.forEach((k, i) => {
      const x = 10 + i * 137;
      d.fillStyle = css('--line'); d.fillRect(x, 20, 50, 70); d.fillStyle = css('--good'); d.fillRect(x, 20 + 70 * (1 - 0.25 / 0.6), 50, 70 * 0.25 / 0.6);
      d.fillStyle = css('--line'); d.fillRect(x + 58, 20, 50, 70); d.fillStyle = css('--hl'); const v = Math.min(1, S.w[i] / 0.6); d.fillRect(x + 58, 20 + 70 * (1 - v), 50, 70 * v);
      d.fillStyle = css('--ink'); d.fillText(k, x, 110);
    });
    d.fillStyle = css('--muted'); d.fillText('green = real data share, purple = generator share', 10, 13);
    // samples (refresh every 10 epochs)
    if (S.ep % 10 === 0 || !samples.children.length) {
      samples.innerHTML = '';
      const r = IMG.rng(S.ep + 11);
      for (let i = 0; i < 8; i++) {
        let x = r(), k = 0; while (k < 3 && x > S.w[k]) { x -= S.w[k]; k++; }
        const c = cv(120, 76); const img = IMG.mix(pu[k], IMG.gaussArr(120 * 76 * 3, i * 7 + S.ep), 120, 76, Math.max(0, 1 - S.q * 1.03));
        c.getContext('2d').putImageData(S.q < 0.9 ? IMG.blur(img, Math.round((1 - S.q) * 3)) : img, 0, 0);
        samples.append(c);
      }
    }
    const a = acc(), dv = divers();
    let msg;
    if (S.ep === 0) msg = 'Set the learning rates, then press Train.';
    else if (dv < 0.55) msg = `<b>Mode collapse.</b> The generator covers only about ${Math.max(1, Math.round(dv * 4))} of 4 image types. It found outputs that fool a weak discriminator and stopped exploring.`;
    else if (a > 0.8 && S.q < 0.5) msg = '<b>Discriminator too strong.</b> It rejects every fake, so the generator gets almost no useful feedback and its quality stalls.';
    else if (+gS.value + +dS.value > 1.3 && !ls.checked && S.ep > 40) msg = '<b>Unstable training.</b> Both networks update aggressively, so quality rises and falls instead of settling.';
    else if (S.q > 0.8 && a < 0.62) msg = '<b>Balanced.</b> The discriminator is close to guessing (about 50%): fakes are now hard to tell from real images.';
    else msg = 'Training… watch the discriminator’s accuracy and the generator’s quality.';
    status.innerHTML = `Epoch ${S.ep} · D accuracy ${(a * 100).toFixed(0)}% · G quality ${(S.q * 100).toFixed(0)}% · diversity ${(dv * 100).toFixed(0)}%<br>${msg}`;
  };
  const train = () => {
    cancelAnimationFrame(raf);
    if (S.ep >= 300) reset();
    const tick = () => { for (let i = 0; i < 4 && S.ep < 300; i++) step(); paint(); if (S.ep < 300) raf = requestAnimationFrame(tick); };
    if (reduceMotion()) { while (S.ep < 300) step(); paint(); } else raf = requestAnimationFrame(tick);
  };
  [gS, dS].forEach(s => s.addEventListener('input', () => { gR.textContent = (+gS.value).toFixed(1); dR.textContent = (+dS.value).toFixed(1); }));
  const preset = (g, d) => { gS.value = g; dS.value = d; reset(); };
  root.append(h('div', { class: 'sim' },
    h('div', { class: 'simbox' },
      h('div', { class: 'row', style: 'gap:16px;font-size:14px;font-weight:700;margin-bottom:6px' }, h('span', { style: `color:${css('--warm')}` }, '● Discriminator accuracy'), h('span', { style: `color:${css('--sl')}` }, '● Generator quality'), h('span', { style: `color:${css('--hl')}` }, '● Diversity')),
      chart, h('p', { class: 'small muted', style: 'margin:10px 0 6px' }, 'Generator samples'), samples, h('div', { style: 'margin-top:10px' }, dist)),
    h('div', { class: 'ctrls' },
      h('p', { class: 'toy' }, 'Toy model: it imitates GAN behaviour described in the case study; it is not a real neural network.'),
      ctrl('Generator learning rate', h('div', { class: 'row', style: 'flex-wrap:nowrap' }, gS, gR)),
      ctrl('Discriminator learning rate', h('div', { class: 'row', style: 'flex-wrap:nowrap' }, dS, dR)),
      ctrl('Presets', h('div', { class: 'row' }, h('button', { class: 'chip', onclick: () => preset(0.5, 0.5) }, 'Balanced'), h('button', { class: 'chip', onclick: () => preset(0.2, 1) }, 'D too strong'), h('button', { class: 'chip', onclick: () => preset(1, 0.2) }, 'G too strong'), h('button', { class: 'chip', onclick: () => preset(0.9, 0.9) }, 'Both aggressive'))),
      ctrl('Mitigation techniques', h('label', { class: 'row', for: 'gan-ls' }, ls, 'Label smoothing'), h('label', { class: 'row', for: 'gan-mb' }, mb, 'Minibatch discrimination')),
      h('div', { class: 'row' }, h('button', { class: 'btn', onclick: train }, 'Train 300 epochs'), h('button', { class: 'btn ghost', onclick: reset }, 'Reset')),
      status)));
  reset();
};

// =============== 4. Hybrid workbench ===============
SIMS.hybrid = (root) => {
  const tabs = h('div', { class: 'subtabs', role: 'tablist' }), body = h('div');
  root.append(tabs, body);
  const modes = [['latent', 'Latent space'], ['recon', 'VAE vs flow'], ['build', 'Hybrid builder']];
  const show = (m) => { [...tabs.children].forEach((b, i) => b.setAttribute('aria-selected', String(modes[i][0] === m))); body.innerHTML = ''; ({ latent, recon, build })[m](); };
  modes.forEach(([m, t]) => tabs.append(h('button', { role: 'tab', onclick: () => show(m) }, t)));

  function latent() {
    const W = 480, H = 320, PW = 240, PH = 150;
    const cl = [
      { n: 'Lakes, day', c: [110, 90], col: '--sl', img: IMG.landscape(PW, PH, 2, 'day').img },
      { n: 'Lakes, sunset', c: [180, 220], col: '--warm', img: IMG.landscape(PW, PH, 2, 'sunrise').img },
      { n: 'Cities', c: [380, 240], col: '--hl', img: IMG.city(PW, PH, 4) },
      { n: 'Cats', c: [390, 80], col: '--bad', img: IMG.animal(PW, PH, 'cat') }];
    const r = IMG.rng(9); const pts = cl.flatMap((k, ci) => Array.from({ length: 16 }, () => [k.c[0] + (r() - 0.5) * 70, k.c[1] + (r() - 0.5) * 60, ci]));
    const c = cv(W, H); c.style.touchAction = 'none'; c.style.cursor = 'grab';
    const prev = cv(PW, PH); const read = h('div', { class: 'small' });
    let P = [140, 120], drag = false;
    const draw = () => {
      const g = c.getContext('2d'); g.fillStyle = css('--card'); g.fillRect(0, 0, W, H);
      g.strokeStyle = css('--line'); for (let x = 0; x < W; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      pts.forEach(([x, y, ci]) => { g.fillStyle = css(cl[ci].col); g.globalAlpha = 0.75; g.beginPath(); g.arc(x, y, 4.5, 0, 7); g.fill(); });
      g.globalAlpha = 1; g.font = 'bold 13px sans-serif';
      cl.forEach(k => { g.fillStyle = css(k.col); g.fillText(k.n, k.c[0] - 34, k.c[1] + 48); });
      g.fillStyle = css('--ink'); g.strokeStyle = css('--card'); g.lineWidth = 3; g.beginPath(); g.arc(P[0], P[1], 10, 0, 7); g.fill(); g.stroke();
      const ws = cl.map(k => 1 / (((P[0] - k.c[0]) ** 2 + (P[1] - k.c[1]) ** 2) / 900 + 0.05) ** 2); const sum = ws.reduce((a, b) => a + b);
      const d = new Uint8ClampedArray(PW * PH * 4);
      for (let i = 0; i < d.length; i++) { let v = 0; for (let k = 0; k < 4; k++) v += cl[k].img.data[i] * ws[k] / sum; d[i] = v; }
      prev.getContext('2d').putImageData(new ImageData(d, PW, PH), 0, 0);
      read.innerHTML = 'Mix at this point: ' + cl.map((k, i) => `${k.n} <b>${Math.round(ws[i] / sum * 100)}%</b>`).join(' · ');
    };
    const mv = (e) => { const b = c.getBoundingClientRect(); P = [(e.clientX - b.left) / b.width * W, (e.clientY - b.top) / b.height * H]; draw(); };
    c.addEventListener('pointerdown', e => { drag = true; c.setPointerCapture(e.pointerId); mv(e); });
    c.addEventListener('pointermove', e => drag && mv(e)); c.addEventListener('pointerup', () => drag = false);
    body.append(h('div', { class: 'sim' }, h('div', { class: 'simbox' }, h('b', {}, 'Latent space (2-D sketch). Drag the dark point.'), h('div', { style: 'margin-top:8px' }, c)),
      h('div', { class: 'ctrls' }, h('div', { class: 'simbox' }, h('b', { class: 'small' }, 'Decoder output at the point'), h('div', { style: 'margin-top:6px' }, prev)), read,
        h('p', { class: 'toy' }, 'Simplified: a real VAE decoder produces a new image from the point; here the preview blends the nearest cluster prototypes to show the idea that nearby points give similar images.'))));
    draw();
  }

  function recon() {
    const W = 240, H = 150; const src = IMG.landscape(W, H, 5, 'sunrise').img;
    const a = cv(W, H), mid = cv(W, H), b = cv(W, H); a.getContext('2d').putImageData(src, 0, 0);
    const midLab = h('p', { class: 'small muted' }, 'Intermediate'), err = h('div', { class: 'reveal' }, 'Choose a model to encode and decode the image.');
    const mae = (x, y) => { let s = 0; for (let i = 0; i < x.data.length; i += 4) for (let q = 0; q < 3; q++) s += Math.abs(x.data[i + q] - y.data[i + q]); return s / (W * H * 3); };
    const vae = () => {
      const lw = 30, lh = 19; const small = IMG.scaleTo(src, lw, lh); IMG.put(mid, IMG.scaleTo(small, W, H)); mid.getContext('2d').imageSmoothingEnabled = false;
      const g = mid.getContext('2d'); g.imageSmoothingEnabled = false; const t = cv(lw, lh); t.getContext('2d').putImageData(small, 0, 0); g.drawImage(t, 0, 0, W, H);
      midLab.textContent = `Latent: ${lw} × ${lh} × 3 = ${(lw * lh * 3).toLocaleString()} values (from ${(W * H * 3).toLocaleString()})`;
      const rec = IMG.blur(IMG.scaleTo(small, W, H), 1); b.getContext('2d').putImageData(rec, 0, 0);
      err.innerHTML = `<b>VAE</b>: average error ${mae(src, rec).toFixed(1)} per value. Compression loses detail, so the reconstruction is softer. In return, the latent space is small and organised, which is good for exploring and editing.`;
    };
    const flow = () => {
      const r = IMG.rng(42), key = new Uint8Array(W * H * 4); for (let i = 0; i < key.length; i++) key[i] = Math.floor(r() * 256);
      const z = new Uint8ClampedArray(src.data.length); for (let i = 0; i < z.length; i++) z[i] = (i % 4 === 3) ? 255 : (src.data[i] + key[i]) % 256;
      mid.getContext('2d').putImageData(new ImageData(z, W, H), 0, 0);
      midLab.textContent = `Noise-like code: ${(W * H * 3).toLocaleString()} values (same size, invertible)`;
      const back = new Uint8ClampedArray(z.length); for (let i = 0; i < z.length; i++) back[i] = (i % 4 === 3) ? 255 : (z[i] - key[i] + 256) % 256;
      const rec = new ImageData(back, W, H); b.getContext('2d').putImageData(rec, 0, 0);
      err.innerHTML = `<b>Flow-based</b>: average error ${mae(src, rec).toFixed(1)}. The mapping is exact and reversible, so the image can be traced and reproduced perfectly: precision, reproducibility, transparency.`;
    };
    body.append(h('div', { class: 'simbox', style: 'margin-top:16px' },
      h('div', { class: 'grid3' }, h('div', {}, h('p', { class: 'small muted' }, 'Original'), a), h('div', {}, midLab, mid), h('div', {}, h('p', { class: 'small muted' }, 'Reconstruction'), b)),
      h('div', { class: 'row', style: 'margin-top:12px' }, h('button', { class: 'btn', onclick: vae }, 'VAE: encode → decode'), h('button', { class: 'btn', onclick: flow }, 'Flow: forward → inverse')), h('div', { style: 'margin-top:10px' }, err),
      h('p', { class: 'toy', style: 'margin-top:8px' }, 'Simplified demo: the flow here is a reversible scrambling, standing in for a learned invertible mapping.')));
  }

  function build() {
    const base = { D: [5, 1, 5, 5, 4, 2], G: [4, 5, 1, 2, 2, 1], V: [2, 4, 4, 4, 5, 2], F: [3, 3, 4, 4, 3, 5] };
    const names = { D: 'Diffusion', G: 'GAN', V: 'VAE', F: 'Flow-based' };
    const axes = ['Quality', 'Speed', 'Stability', 'Diversity', 'Control', 'Traceability'];
    const on = { D: true, G: false, V: false, F: false };
    const radar = cv(420, 340); const expl = h('div', { class: 'ctrls' });
    const toggles = h('div', { class: 'row' });
    Object.keys(names).forEach(k => toggles.append(h('button', { class: 'chip', 'aria-pressed': String(on[k]), onclick: (e) => { on[k] = !on[k]; e.currentTarget.setAttribute('aria-pressed', String(on[k])); upd(); } }, names[k])));
    const score = () => {
      const sel = Object.keys(on).filter(k => on[k]); if (!sel.length) return [null, sel, []];
      const mx = (i) => Math.max(...sel.map(k => base[k][i]));
      const notes = [];
      let speed;
      if (on.D) { speed = 1 + (on.V ? 2 : 0) + (on.G ? 2 : 0); if (on.V) notes.push('<b>VAE + diffusion = latent diffusion</b> (as in Stable Diffusion): denoising runs in a compressed latent space, so speed improves.'); if (on.G) notes.push('<b>Diffusion + GAN-style training</b> can produce high-quality images in very few steps.'); }
      else speed = mx(1);
      speed = Math.min(5, speed - Math.max(0, sel.length - 2) * 0.5);
      let stab = Math.min(...sel.map(k => base[k][2]));
      if (on.G && on.D) { stab = 4; } else if (on.G && on.V) { stab = 3; notes.push('<b>VAE-GAN</b>: the GAN discriminator sharpens the VAE’s blurry outputs, but some GAN instability remains.'); }
      if (on.G && !on.D && !on.V) notes.push('A GAN alone is fast and sharp but risks <b>instability and mode collapse</b>.');
      if (on.F) notes.push('Adding a <b>flow-based</b> component brings exact, reversible stages: better traceability and reproducibility.');
      if (sel.length >= 3) notes.push(`Cost: ${sel.length} components make the system <b>more complex</b> to build, train and maintain.`);
      if (sel.length === 1 && on.D) notes.push('Diffusion alone: top quality and stable training, but slow because of many denoising steps.');
      const sc = [mx(0), speed, stab, mx(3), mx(4), mx(5)];
      return [sc, sel, notes];
    };
    const upd = () => {
      const [sc, sel, notes] = score();
      const g = radar.getContext('2d'), W = radar.width, H = radar.height, cx = W / 2, cy = H / 2 + 6, R = 120;
      g.clearRect(0, 0, W, H); g.font = '13px sans-serif'; g.textAlign = 'center';
      for (let lv = 1; lv <= 5; lv++) { g.strokeStyle = css('--line'); g.beginPath(); axes.forEach((_, i) => { const a = -Math.PI / 2 + i * Math.PI / 3, x = cx + Math.cos(a) * R * lv / 5, y = cy + Math.sin(a) * R * lv / 5; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.stroke(); }
      axes.forEach((t, i) => { const a = -Math.PI / 2 + i * Math.PI / 3; g.fillStyle = css('--ink'); g.fillText(t + (sc ? ` ${sc[i]}` : ''), cx + Math.cos(a) * (R + 30), cy + Math.sin(a) * (R + 22) + 4); });
      if (sc) { g.fillStyle = css('--accent'); g.globalAlpha = 0.25; g.beginPath(); sc.forEach((v, i) => { const a = -Math.PI / 2 + i * Math.PI / 3, x = cx + Math.cos(a) * R * v / 5, y = cy + Math.sin(a) * R * v / 5; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill(); g.globalAlpha = 1; g.strokeStyle = css('--accent'); g.lineWidth = 2.5; g.stroke(); g.lineWidth = 1; }
      expl.innerHTML = '';
      expl.append(h('h3', {}, sel.length ? sel.map(k => names[k]).join(' + ') : 'Pick at least one model'), ...notes.map(n => h('p', { class: 'small', html: n })),
        h('p', { class: 'toy' }, 'Scores (0–5) are simplified teaching estimates for comparison, not benchmark results.'));
    };
    body.append(h('div', { style: 'margin-top:16px' }, toggles), h('div', { class: 'sim' }, h('div', { class: 'simbox' }, radar), expl));
    upd();
  }
  show('latent');
};

// =============== 5. Evaluation matrix ===============
SIMS.evaluate = (root, ctx = {}) => {
  const crit = ['Output quality', 'Computational efficiency', 'Training stability', 'Flexibility & scalability', 'Consistency'];
  const models = [['Diffusion', [5, 2, 5, 5, 4]], ['GAN', [4, 5, 2, 3, 3]], ['VAE', [2, 4, 4, 4, 4]], ['Flow-based', [3, 3, 4, 3, 4]], ['Hybrid: latent diffusion', [5, 4, 4, 5, 4]]];
  const briefs = {
    A: ['Luxury perfume print ad', 'Five photorealistic hero images; two-week deadline; huge billboards.', [5, 1, 3, 2, 3]],
    B: ['Overnight social campaign', '3,000 image variants by tomorrow, on the studio’s existing servers.', [3, 5, 3, 3, 4]],
    C: ['Mascot for a game launch', 'The same character in 200 scenes, always in the client’s flat pastel style.', [3, 3, 3, 4, 5]] };
  if (ctx.card) { const c = ctx.card; briefs.Y = [`Your client: ${c.client[0]}`, `${c.images.toLocaleString()} images for ${c.client[1]} in ${c.deadline[0]}; ${c.quality[0]}; ${c.hardware[0]}; ${c.special}. The weights are a starting guess: change them and justify each one in your evidence log.`, c.weights]; }
  let brief = 'A'; const w = [...briefs.A[2]];
  const desc = h('p', { class: 'callout' }); const sl = h('div', { class: 'ctrls' }); const table = h('div');
  const upd = () => {
    desc.innerHTML = `<b>${briefs[brief][0]}.</b> ${briefs[brief][1]}`; if (brief !== 'Y' && !ctx.card) desc.innerHTML += ' <i>Get a case card on the home page to add your own client here.</i>';
    const tot = models.map(([n, r]) => [n, r.reduce((a, v, i) => a + v * w[i], 0)]);
    const max = Math.max(...tot.map(t => t[1]), 1), best = tot.find(t => t[1] === max)[0];
    table.innerHTML = '';
    table.append(h('h3', { style: 'margin-bottom:10px' }, 'Weighted scores'), ...tot.sort((a, b) => b[1] - a[1]).map(([n, v]) => h('div', { style: 'margin-bottom:10px' },
      meter(n + (n === best ? '  ✓ recommended' : ''), v / Math.max(1, 5 * w.reduce((a, b) => a + b, 0)) * 100, n === best ? css('--good') : css('--accent'), `${v}`))),
      h('p', { class: 'toy' }, 'Ratings (1–5) are simplified teaching estimates. Total = sum of rating × weight.'));
  };
  const sliders = () => {
    sl.innerHTML = '';
    crit.forEach((c, i) => {
      const r = h('b', { class: 'num' }, String(w[i]));
      const s = h('input', { type: 'range', min: 0, max: 5, step: 1, value: w[i], id: `ev-${i}`, oninput: (e) => { w[i] = +e.target.value; r.textContent = w[i]; upd(); } });
      sl.append(ctrl(`${c} — weight`, h('div', { class: 'row', style: 'flex-wrap:nowrap' }, s, r)));
    });
  };
  const ratingTable = h('table', { class: 'exam', style: 'margin-top:14px' }, h('tr', {}, h('th', {}, 'Model'), ...crit.map(c => h('th', {}, c.split(' ')[0]))), ...models.map(([n, r]) => h('tr', {}, h('td', {}, n), ...r.map(v => h('td', { class: 'num' }, String(v))))));
  // consistency test
  const strip = h('div', { class: 'thumbs', style: 'grid-template-columns:repeat(3,1fr)' }); const emb = h('input', { type: 'checkbox', id: 'ev-emb', checked: true });
  let gen = 0; const fb = h('p', { class: 'small' });
  const scenes = () => {
    gen++; strip.innerHTML = ''; const r = IMG.rng(gen * 5); const bgs = ['#ffe2aa', '#c8dcf5', '#bee6be'];
    const cols = ['#2ec4b6', '#ff7070', '#9678dc', '#f0a050'];
    bgs.forEach((bg, i) => { const same = emb.checked; const c = cv(160, 120); c.style.maxWidth = '180px'; const img = IMG.mascot(160, 120, same ? '#2ec4b6' : cols[Math.floor(r() * 4)], bg, same ? 0 : (r() < 0.6 ? 1 : 0)); c.getContext('2d').putImageData(img, 0, 0); strip.append(h('div', {}, c, h('p', { class: 'small muted' }, ['Beach ad', 'Office ad', 'Park ad'][i]))); });
    fb.innerHTML = emb.checked ? '<b>With the character embedding:</b> the same learned vector is reused, so the mascot looks identical in every scene.' : '<b>Without it:</b> each generation interprets “our mascot” afresh, so colours and shape drift. That damages brand identity.';
  };
  emb.addEventListener('change', scenes);
  root.append(h('div', { style: 'margin-top:14px' }, chipGroup(Object.entries(briefs).map(([k, b]) => [k, k === 'Y' ? b[0] : `Brief ${k}: ${b[0]}`]), 'A', v => { brief = v; w.splice(0, 5, ...briefs[v][2]); sliders(); upd(); })),
    h('div', { style: 'margin-top:12px' }, desc),
    h('div', { class: 'sim' }, h('div', { class: 'simbox' }, table, ratingTable), sl),
    h('div', { class: 'simbox', style: 'margin-top:18px' }, h('h3', {}, 'Consistency test'), h('div', { class: 'row', style: 'margin:10px 0' }, h('label', { class: 'row', for: 'ev-emb', style: 'font-weight:700' }, emb, 'Use character embedding'), h('button', { class: 'btn small', onclick: scenes }, 'Generate 3 scenes')), strip, fb));
  sliders(); upd(); scenes();
};

// =============== 6. Ethics: dataset audit ===============
SIMS.ethics = (root) => {
  const SRC = {
    own: ['Studio’s own photoshoot', false], stock: ['Licensed stock (AI training allowed)', false], pd: ['Public-domain archive', false], client: ['Client-supplied, written permission', false],
    noai: ['Stock licence excludes AI training', true], scrape: ['Scraped from an artist’s portfolio, no licence', true], unknown: ['Web scrape, source unknown', true], logo: ['Product shot with another brand’s logo', true], celeb: ['Celebrity photo from a news site', true] };
  const items = [];
  const add = (kind, src, extra = {}) => items.push({ kind, src, on: true, ...extra });
  ['own', 'own', 'own', 'stock', 'stock', 'pd', 'pd', 'scrape', 'noai', 'unknown'].forEach((s, i) => add(i % 3 === 2 ? 'city' : 'land', s));
  ['own', 'own', 'own', 'own', 'stock', 'stock', 'stock', 'client', 'unknown', 'own'].forEach((s, i) => add('pro', s, { woman: i === 2 || i === 6 }));
  add('product', 'logo'); add('pro', 'celeb', { woman: false, celeb: true }); add('land', 'client'); add('city', 'pd');
  let added = 0;
  const grid = h('div', { class: 'audit' }); const meters = h('div', { class: 'ctrls' });
  const thumb = (it, i) => {
    if (it.kind === 'land') return IMG.landscape(150, 94, i + 1, ['day', 'sunrise', 'dusk', 'winter'][i % 4]).img;
    if (it.kind === 'city') return IMG.city(150, 94, i + 2, i % 2 ? 'day' : 'dusk');
    if (it.kind === 'product') return IMG.canvasImage(150, 94, g => { g.fillStyle = '#f2ece2'; g.fillRect(0, 0, 150, 94); g.fillStyle = '#c33'; g.beginPath(); g.arc(75, 47, 28, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = 'bold 15px sans-serif'; g.textAlign = 'center'; g.fillText('™', 75, 53); });
    return IMG.person(150, 94, it.woman ? '#c06a9a' : '#5b7bd5', ['#3a2a20', '#1d1d1d', '#8a5a2b', '#b8b0a6'][i % 4], it.woman);
  };
  const render = () => {
    grid.innerHTML = '';
    items.forEach((it, i) => {
      const c = cv(150, 94); c.getContext('2d').putImageData(thumb(it, i), 0, 0);
      const risky = SRC[it.src][1];
      const b = h('button', { class: 'ditem' + (it.on ? '' : ' out'), 'aria-pressed': String(!it.on), onclick: () => { it.on = !it.on; render(); } },
        c, h('span', { class: 'src' }, SRC[it.src][0]),
        h('span', { class: 'small muted' }, it.kind === 'pro' ? (it.celeb ? 'Real, identifiable person' : `Professional at work · ${it.woman ? 'woman' : 'man'}`) : it.kind === 'product' ? 'Product' : 'Scenery'),
        h('span', { class: 'small', style: `font-weight:700;color:${it.on ? (risky ? css('--bad') : css('--good')) : css('--muted')}` }, it.on ? (risky ? 'Included — check licence' : 'Included') : 'Excluded'));
      grid.append(b);
    });
    const inc = items.filter(i => i.on), risk = inc.filter(i => SRC[i.src][1]).length;
    const pros = inc.filter(i => i.kind === 'pro' && !i.celeb), women = pros.filter(i => i.woman).length, share = pros.length ? women / pros.length : 0;
    const okRisk = risk === 0, okBal = share >= 0.4 && share <= 0.6, okSize = inc.length >= 16;
    meters.innerHTML = '';
    meters.append(h('h3', {}, 'Dataset health'),
      meter('IP risk: risky images included', risk / 6 * 100, okRisk ? css('--good') : css('--bad'), `${risk}`),
      meter(`Representation: women among professionals (${women}/${pros.length})`, share * 100, okBal ? css('--good') : css('--warm'), `${Math.round(share * 100)}%`),
      meter('Dataset size (aim for 16+)', inc.length / 30 * 100, okSize ? css('--good') : css('--warm'), `${inc.length}`),
      h('button', { class: 'btn ghost', disabled: added >= 3, onclick: () => { added++; add('pro', 'stock', { woman: true }); add('pro', 'stock', { woman: true }); render(); } }, `Add 2 licensed images of women professionals (${3 - added} left)`),
      h('div', { class: 'reveal ' + (okRisk && okBal && okSize ? 'good' : '') }, okRisk && okBal && okSize ? '<b>Ready to train.</b> No unlicensed material, balanced representation, and enough data.' :
        [!okRisk && 'Some included images have unclear or restrictive rights.', !okBal && 'Professionals are not balanced: outputs for prompts like “a CEO” would be skewed.', !okSize && 'Too few images: quality will suffer. Add licensed images rather than keeping risky ones.'].filter(Boolean).join(' ')));
  };
  // disclosure scenarios
  const sc = [
    ['An AI-generated hero image will run in a client’s national ad campaign.', ['Say nothing: it looks like a real photo', 'Tell the client it was AI-generated and follow agreed labelling guidelines', 'Describe it as a photograph to avoid questions'], 1, 'Disclosure maintains trust with the client and audience; passing AI work off as photography misleads them.'],
    ['Designers used AI only for internal mood boards; final art is hand-made.', ['Record AI use internally; no public label needed on the final art', 'Label the final art as AI-generated', 'Hide the mood boards from the client'], 0, 'Guidelines should match how AI was used. Internal records keep the process transparent without mislabelling human-made work.'],
    ['A client asks how a campaign image was produced, months later.', ['Guess from memory', 'Provide the recorded prompts, model, settings and data sources', 'Refuse to answer'], 1, 'Keeping provenance records supports transparency (and flow-based or seeded generation makes exact reproduction possible).']];
  const disc = h('div', { class: 'qa' });
  sc.forEach(([q, opts, a, why]) => {
    const fbk = h('div'); const box = h('div', { class: 'q' }, h('p', { style: 'font-weight:700' }, q));
    const o = h('div', { class: 'opts' }); opts.forEach((t, i) => o.append(h('button', { class: 'opt', onclick: (e) => { [...o.children].forEach(x => x.disabled = true); e.currentTarget.classList.add(i === a ? 'right' : 'wrong'); if (i !== a) o.children[a].classList.add('right'); fbk.innerHTML = `<div class="reveal ${i === a ? 'good' : 'bad'}">${why}</div>`; } }, t)));
    box.append(o, fbk); disc.append(box);
  });
  root.append(h('div', { class: 'sim', style: 'grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)' }, h('div', {}, h('p', { class: 'small muted', style: 'margin-bottom:8px' }, 'Click an image to exclude or include it.'), grid), meters),
    h('h3', { style: 'margin:22px 0 10px' }, 'Disclosure decisions'), disc);
  render();
};

// =============== shared question components ===============
function writtenQ(q, store, key) {
  const saved = store.get(key) || { text: '', ticks: [] };
  const ta = h('textarea', { id: `ta-${key}`, placeholder: 'Write your answer here, then reveal the mark points…' }); ta.value = saved.text;
  const pts = h('div', { class: 'points hidden' }); const score = h('span', { class: 'score' });
  const save = () => store.set(key, { text: ta.value, ticks: [...pts.querySelectorAll('input')].map(i => i.checked) });
  const upd = () => { const n = [...pts.querySelectorAll('input')].filter(i => i.checked).length; score.textContent = `${Math.min(n, q.marks)} / ${q.marks}`; };
  const build = () => {
    pts.innerHTML = ''; const txt = ta.value.toLowerCase();
    q.points.forEach(([t, kw], i) => {
      const hit = kw.some(k => txt.includes(k.toLowerCase()));
      const cb = h('input', { type: 'checkbox', id: `pt-${key}-${i}`, onchange: () => { upd(); save(); } }); cb.checked = !!saved.ticks[i];
      pts.append(h('label', { class: 'point', for: `pt-${key}-${i}` }, cb, h('span', {}, t), hit ? h('span', { class: 'det' }, 'key words found') : ''));
    });
    upd();
  };
  ta.addEventListener('input', save);
  const btn = h('button', { class: 'btn ghost small', onclick: () => { if (ta.value.trim().length < 30) { btn.textContent = 'Write your answer first (at least a sentence)'; setTimeout(() => btn.textContent = 'Reveal mark points', 1800); return; } build(); pts.classList.remove('hidden'); } }, 'Reveal mark points');
  if (saved.ticks.length) { build(); pts.classList.remove('hidden'); }
  return h('div', { class: 'q' }, h('div', { class: 'qh' }, h('p', {}, q.q), h('span', { class: 'marks' }, `[${q.marks}]`)), h('div', { style: 'margin-top:10px' }, ta),
    h('div', { class: 'row', style: 'justify-content:space-between;margin-top:8px' }, btn, score), pts,
    h('p', { class: 'small muted', style: 'margin-top:8px' }, 'Tick each point your answer clearly makes. “Key words found” is only a hint; judge the meaning yourself.'));
}
function mcqQ(m, store, key, onAnswer, confKey) {
  const saved = store.get(key);
  const o = h('div', { class: 'opts' }); const fb = h('div');
  let conf = confKey ? store.get(confKey) : 'n/a';
  const confRow = h('div', { class: 'row conf', style: 'margin-top:10px' }, h('span', { class: 'small muted' }, 'How confident are you?'));
  const choose = (i, silent) => {
    [...o.children].forEach(x => x.disabled = true); [...confRow.querySelectorAll('button')].forEach(x => x.disabled = true);
    o.children[i].classList.add(i === m.a ? 'right' : 'wrong'); if (i !== m.a) o.children[m.a].classList.add('right');
    const note = conf === 'sure' && i !== m.a ? ' You were sure, so this is a misconception worth fixing now.' : conf === 'guess' && i === m.a ? ' You guessed: can you now explain why it is right?' : '';
    fb.innerHTML = `<div class="reveal ${i === m.a ? 'good' : 'bad'}"><b>${i === m.a ? 'Correct.' : 'Not quite.'}</b> ${m.why}${note ? `<br><i>${note}</i>` : ''}</div>`;
    if (!silent) { store.set(key, i); onAnswer && onAnswer(); }
  };
  m.o.forEach((t, i) => o.append(h('button', { class: 'opt', disabled: confKey && !conf, onclick: () => choose(i) }, h('span', { class: 'l' }, 'ABCD'[i]), h('span', {}, t))));
  if (confKey) [['sure', 'Sure'], ['unsure', 'Unsure'], ['guess', 'Guessing']].forEach(([v, t]) => {
    const b = h('button', { class: 'chip', 'aria-pressed': String(conf === v), onclick: () => { conf = v; store.set(confKey, v); [...confRow.querySelectorAll('button')].forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); [...o.children].forEach(x => x.disabled = false); } }, t);
    confRow.append(b);
  });
  const el = h('div', { class: 'q' }, h('p', { style: 'font-weight:700' }, m.q), confKey ? confRow : '', o, fb);
  if (saved != null) choose(saved, true);
  return el;
}

// =============== 7. Exam prep ===============
SIMS.exam = (root, ctx) => {
  const lvl = ctx.level;
  const table = h('table', { class: 'exam' }, h('tr', {}, h('th', {}, ''), h('th', {}, 'SL'), h('th', {}, 'HL')),
    h('tr', {}, h('td', {}, 'Paper 1 length'), h('td', { class: 'num' }, '1 h 15 min'), h('td', { class: 'num' }, '2 h')),
    h('tr', {}, h('td', {}, 'Case study marks (Section B)'), h('td', { class: 'num' }, '12'), h('td', { class: 'num' }, '24')),
    h('tr', {}, h('td', {}, 'Challenges to prepare'), h('td', { class: 'num' }, '2'), h('td', { class: 'num' }, '4')),
    h('tr', {}, h('td', {}, 'Suggested time on Section B'), h('td', { class: 'num' }, '≈ 20 min'), h('td', { class: 'num' }, '≈ 40 min')));
  const ch = h('div', { class: 'grid2' }, ...CHALLENGES.filter(c => lvl === 'HL' || c.level === 'SL').map(c => h('div', { class: 'q' },
    h('span', { class: 'badge ' + (c.level === 'SL' ? 'sl' : 'hl') }, c.level === 'SL' ? 'SL + HL' : 'HL ONLY'), h('h3', { style: 'margin:8px 0' }, c.title),
    h('ul', { class: 'tasks' }, ...c.pointers.map(p => h('li', {}, p))))));
  const bank = h('div');
  const qs = EXAM_BANK.filter(q => lvl === 'HL' || q.level === 'SL');
  qs.forEach(q => bank.append(writtenQ(q, ctx.store, 'x' + q.id)));
  // mock
  const mockBox = h('div');
  const startMock = () => {
    const m = MOCKS[lvl]; mockBox.innerHTML = ''; let left = m.minutes * 60;
    const timer = h('div', { class: 'score num' });
    const tick = () => { timer.textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')} left`; if (left <= 0) { clearInterval(iv); timer.textContent = 'Time is up: reveal the mark points and score yourself.'; } left--; };
    const iv = setInterval(tick, 1000); tick(); ctx.onLeave(() => clearInterval(iv));
    mockBox.append(h('div', { class: 'row', style: 'justify-content:space-between;margin:14px 0' }, h('b', {}, `${lvl} mock Section B · ${m.ids.map(id => EXAM_BANK.find(q => q.id === id).marks).reduce((a, b) => a + b)} marks`), timer),
      ...m.ids.map(id => writtenQ(EXAM_BANK.find(q => q.id === id), ctx.store, 'm' + lvl + id)));
  };
  root.append(h('div', { class: 'grid2', style: 'margin-top:14px' }, h('div', { class: 'q' }, h('h3', { style: 'margin-bottom:8px' }, 'How the case study is examined'), table,
    h('p', { class: 'small muted', style: 'margin-top:8px' }, 'From published summaries of the 2027 guide. Confirm details with your teacher and the official IB guide.')),
    h('div', { class: 'q' }, h('h3', {}, 'Timed mock'), h('p', { class: 'small', style: 'margin:8px 0' }, `A practice Section B at ${lvl} level, built from this lab’s question bank. Switch SL/HL at the top to change it.`),
      h('button', { class: 'btn', onclick: startMock }, `Start ${lvl} mock (${MOCKS[lvl].minutes} min)`), mockBox)),
    h('h3', { style: 'margin:22px 0 10px' }, 'Answer pointers for each challenge'), ch,
    h('h3', { style: 'margin:22px 0 4px' }, 'Question bank'), h('p', { class: 'disclaim' }, 'Practice questions written for this lab, not IB questions. Mark allocations are indicative.'), bank);
};

// =============== 8. Glossary drill ===============
SIMS.glossary = (root, ctx) => {
  const lvl = ctx.level;
  let filter = lvl === 'SL' ? 'SL' : 'All', q = '';
  const list = h('div', { class: 'gloss' });
  const draw = () => {
    list.innerHTML = '';
    GLOSSARY.filter(([t, l, d]) => (filter === 'All' || l === filter) && (t + d).toLowerCase().includes(q)).forEach(([t, l, d]) =>
      list.append(h('div', { class: 'gitem' }, h('h4', {}, h('span', {}, t), h('span', { class: 'badge ' + (l === 'SL' ? 'sl' : 'hl') }, l === 'SL' ? 'SL + HL' : 'HL')), h('p', {}, d))));
    if (!list.children.length) list.append(h('p', { class: 'muted' }, 'No terms match. Try a shorter search.'));
  };
  const search = h('input', { type: 'search', id: 'gl-search', placeholder: 'Search terms…', style: 'border:1.5px solid var(--line);border-radius:10px;padding:9px 12px;min-width:240px;background:var(--card)', oninput: (e) => { q = e.target.value.toLowerCase(); draw(); } });
  // flashcards
  let deck = GLOSSARY.filter(([, l]) => lvl === 'HL' || l === 'SL'), idx = 0;
  const card = h('div', { class: 'flash', tabindex: 0, role: 'button', 'aria-label': 'Flashcard, press to flip' });
  const fc = () => { const [t, l, d] = deck[idx]; card.classList.remove('flip'); card.innerHTML = `<div class="in"><div class="face"><div><p class="small muted">${idx + 1} / ${deck.length}</p><h3>${t}</h3><p class="small muted">click to flip</p></div></div><div class="face back"><p>${d}</p></div></div>`; };
  card.addEventListener('click', () => card.classList.toggle('flip'));
  card.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); card.classList.toggle('flip'); } });
  // match drill
  const mbox = h('div'); const mscore = h('span', { class: 'score' });
  const drill = () => {
    const r = IMG.rng(Date.now() % 100000); const pool = [...deck].sort(() => r() - 0.5).slice(0, 5);
    const defs = [...pool].sort(() => r() - 0.5); let sel = null, ok = 0, tries = 0;
    const L = h('div', { style: 'display:grid;gap:8px' }), R = h('div', { style: 'display:grid;gap:8px' });
    const upd = () => mscore.textContent = `${ok} / 5 matched · ${tries} attempts`;
    pool.forEach(([t]) => { const b = h('button', { onclick: () => { if (b.classList.contains('ok')) return; [...L.children].forEach(x => x.classList.remove('sel')); b.classList.add('sel'); sel = [t, b]; } }, t); L.append(b); });
    defs.forEach(([t, , d]) => { const b = h('button', { onclick: () => { if (!sel || b.classList.contains('ok')) return; tries++; if (sel[0] === t) { ok++; b.classList.add('ok'); sel[1].classList.remove('sel'); sel[1].classList.add('ok'); sel = null; } else { b.classList.add('no'); setTimeout(() => b.classList.remove('no'), 600); } upd(); } }, d); R.append(b); });
    mbox.innerHTML = ''; mbox.append(h('div', { class: 'match' }, L, R)); upd();
  };
  root.append(
    h('div', { class: 'row', style: 'margin-top:14px;justify-content:space-between' }, search, chipGroup([['All', 'All'], ['SL', 'SL + HL'], ['HL', 'HL only']], filter, v => { filter = v; draw(); })),
    h('div', { style: 'margin-top:14px' }, list),
    h('div', { class: 'grid2', style: 'margin-top:24px' },
      h('div', {}, h('h3', { style: 'margin-bottom:10px' }, 'Flashcards'), card, h('div', { class: 'row', style: 'margin-top:10px' },
        h('button', { class: 'btn ghost small', onclick: () => { idx = (idx - 1 + deck.length) % deck.length; fc(); } }, 'Previous'), h('button', { class: 'btn ghost small', onclick: () => { idx = (idx + 1) % deck.length; fc(); } }, 'Next'),
        h('button', { class: 'btn ghost small', onclick: () => { const r = IMG.rng(Date.now() % 9999); deck = [...deck].sort(() => r() - 0.5); idx = 0; fc(); } }, 'Shuffle'))),
      h('div', {}, h('div', { class: 'row', style: 'justify-content:space-between;margin-bottom:10px' }, h('h3', {}, 'Matching drill'), mscore), h('p', { class: 'small muted', style: 'margin-bottom:8px' }, 'Pick a term, then its definition.'), mbox, h('button', { class: 'btn small', style: 'margin-top:10px', onclick: drill }, 'New round'))));
  draw(); fc(); drill();
};
