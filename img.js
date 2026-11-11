// Procedural image engine: every picture in the lab is drawn in code (no photos).
const IMG = (() => {
  const PAL = {
    sunrise: { sky0: [255, 160, 120], sky1: [255, 222, 170], sun: [255, 246, 210], m1: [150, 110, 150], m2: [95, 72, 120], water: [120, 120, 170], grass: [70, 110, 70], tree: [35, 70, 50] },
    day: { sky0: [90, 150, 230], sky1: [190, 225, 250], sun: [255, 250, 220], m1: [120, 140, 170], m2: [80, 100, 130], water: [70, 120, 180], grass: [90, 160, 80], tree: [40, 100, 50] },
    dusk: { sky0: [40, 40, 100], sky1: [230, 120, 110], sun: [255, 200, 150], m1: [80, 60, 110], m2: [50, 40, 80], water: [70, 60, 110], grass: [40, 60, 60], tree: [20, 35, 40] },
    winter: { sky0: [150, 180, 220], sky1: [230, 240, 250], sun: [255, 255, 240], m1: [220, 230, 245], m2: [160, 175, 200], water: [120, 150, 190], grass: [235, 240, 248], tree: [60, 90, 90] },
  };
  // class ids: 0 sky, 1 sun, 2 far mountain, 3 near mountain, 4 water, 5 grass, 6 tree
  const SEG = [[70, 130, 235], [250, 220, 40], [170, 120, 90], [120, 80, 60], [30, 70, 200], [70, 190, 70], [20, 110, 40]];
  const SEGNAMES = ['Sky', 'Sun', 'Far mountain', 'Mountain', 'Water', 'Grass', 'Tree'];

  function rng(seed) {
    let s = (seed * 2654435761) >>> 0 || 1;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  function gaussArr(n, seed) {
    const r = rng(seed), a = new Float32Array(n);
    for (let i = 0; i < n; i += 2) {
      const u = Math.max(1e-9, r()), v = r();
      const m = Math.sqrt(-2 * Math.log(u));
      a[i] = m * Math.cos(6.2831853 * v) * 0.9;
      if (i + 1 < n) a[i + 1] = m * Math.sin(6.2831853 * v) * 0.9;
    }
    return a;
  }

  function labels(w, h, seed) {
    const r = rng(seed + 7);
    const ph = Array.from({ length: 6 }, () => r() * 6.28);
    const sx = 0.25 + r() * 0.5, hor = 0.62;
    const lab = new Uint8Array(w * h);
    const trees = Array.from({ length: 4 }, () => ({ cx: 0.05 + r() * 0.9, by: 0.9 + r() * 0.1, th: 0.18 + r() * 0.1 }));
    for (let j = 0; j < h; j++) {
      const y = j / h;
      for (let i = 0; i < w; i++) {
        const x = i / w;
        const m1 = 0.36 + 0.07 * Math.sin(x * 7 + ph[0]) + 0.04 * Math.sin(x * 17 + ph[1]) + 0.015 * Math.sin(x * 41 + ph[2]);
        const m2 = 0.48 + 0.05 * Math.sin(x * 9 + ph[3]) + 0.025 * Math.sin(x * 23 + ph[4]);
        const shore = 0.8 + 0.03 * Math.sin(x * 5 + ph[5]);
        let c = 0;
        const dx = (x - sx) * w, dy = (y - 0.3) * h;
        if (dx * dx + dy * dy < (0.075 * h) ** 2) c = 1;
        if (y > m1 && y < hor) c = 2;
        if (y > m2 && y < hor) c = 3;
        if (y >= hor && y < shore) c = 4;
        if (y >= shore) c = 5;
        for (const t of trees) {
          const tw = t.th * h / w * 0.55;
          if (y > t.by - t.th && y < t.by && Math.abs(x - t.cx) < (y - (t.by - t.th)) / t.th * tw / 2) c = 6;
        }
        lab[j * w + i] = c;
      }
    }
    return { lab, sx };
  }

  // Render a label map into a "realistic" picture. Works for generated or hand-painted maps.
  function render(lab, w, h, pal = 'day', sx = 0.6) {
    const P = PAL[pal], out = new Uint8ClampedArray(w * h * 4);
    const hor = 0.62;
    for (let j = 0; j < h; j++) {
      const y = j / h;
      for (let i = 0; i < w; i++) {
        const x = i / w, k = j * w + i, c = lab[k];
        let col;
        const t = Math.min(1, y / hor);
        const g = Math.exp(-(((x - sx) * w) ** 2 + ((y - 0.3) * h) ** 2) / (2 * (0.2 * h) ** 2));
        const sky = [0, 1, 2].map(q => (P.sky0[q] * (1 - t) + P.sky1[q] * t) * (1 - 0.5 * g) + P.sun[q] * 0.5 * g);
        if (c === 0) col = sky;
        else if (c === 1) col = P.sun;
        else if (c === 2 || c === 3) { const s = 1 - 0.25 * y; col = (c === 2 ? P.m1 : P.m2).map(v => v * s); }
        else if (c === 4) {
          const rt = Math.min(1, Math.max(0, (2 * hor - y)) / hor);
          const wave = 0.03 * Math.sin(y * h * 0.35 + Math.sin(x * 30) * 2);
          col = [0, 1, 2].map(q => (0.55 * (P.sky0[q] * (1 - rt) + P.sky1[q] * rt) + 0.45 * P.water[q]) * (1 + wave));
        } else if (c === 5) { const s = 1 - 0.3 * (y - 0.8); col = P.grass.map(v => v * s); }
        else col = P.tree;
        out[k * 4] = col[0]; out[k * 4 + 1] = col[1]; out[k * 4 + 2] = col[2]; out[k * 4 + 3] = 255;
      }
    }
    return new ImageData(out, w, h);
  }

  function segImage(lab, w, h) {
    const out = new Uint8ClampedArray(w * h * 4);
    for (let k = 0; k < w * h; k++) { const c = SEG[lab[k]]; out.set([c[0], c[1], c[2], 255], k * 4); }
    return new ImageData(out, w, h);
  }

  function sketch(lab, w, h) {
    const out = new Uint8ClampedArray(w * h * 4);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const k = j * w + i;
      let e = false;
      for (let dj = -1; dj <= 1 && !e; dj++) for (let di = -1; di <= 1; di++) {
        const jj = j + dj, ii = i + di;
        if (jj >= 0 && jj < h && ii >= 0 && ii < w && lab[jj * w + ii] !== lab[k]) { e = true; break; }
      }
      const c = e ? [55, 55, 65] : [246, 241, 229];
      out.set([c[0], c[1], c[2], 255], k * 4);
    }
    return new ImageData(out, w, h);
  }

  function posterize(img, levels = 4) {
    const d = new Uint8ClampedArray(img.data), s = 255 / (levels - 1);
    for (let k = 0; k < d.length; k += 4) for (let q = 0; q < 3; q++) d[k + q] = Math.round(d[k + q] / s) * s * 0.85 + 30;
    return new ImageData(d, img.width, img.height);
  }

  function grey(img) {
    const d = new Uint8ClampedArray(img.data);
    for (let k = 0; k < d.length; k += 4) { const v = 0.3 * d[k] + 0.59 * d[k + 1] + 0.11 * d[k + 2]; d[k] = d[k + 1] = d[k + 2] = v; }
    return new ImageData(d, img.width, img.height);
  }

  function blur(img, r = 2) {
    if (r <= 0) return img;
    const w = img.width, h = img.height, src = img.data;
    const tmp = new Float32Array(w * h * 4), out = new Uint8ClampedArray(src.length);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      for (let q = 0; q < 4; q++) { let s = 0, n = 0; for (let d = -r; d <= r; d++) { const ii = Math.min(w - 1, Math.max(0, i + d)); s += src[(j * w + ii) * 4 + q]; n++; } tmp[(j * w + i) * 4 + q] = s / n; }
    }
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      for (let q = 0; q < 4; q++) { let s = 0, n = 0; for (let d = -r; d <= r; d++) { const jj = Math.min(h - 1, Math.max(0, j + d)); s += tmp[(jj * w + i) * 4 + q]; n++; } out[(j * w + i) * 4 + q] = s / n; }
    }
    return new ImageData(out, w, h);
  }

  function canvasImage(w, h, fn) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); fn(g, w, h);
    return g.getImageData(0, 0, w, h);
  }

  function city(w, h, seed = 3, pal = 'dusk') {
    const r = rng(seed);
    const top = pal === 'day' ? '#6aa6e8' : '#1e1e50', bot = pal === 'day' ? '#cfe6fa' : '#f08c6e';
    return canvasImage(w, h, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bot);
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      let x = 0;
      while (x < w) {
        const bw = (0.08 + r() * 0.08) * w, bh = (0.3 + r() * 0.45) * h, s = 25 + r() * 30;
        g.fillStyle = `rgb(${s},${s},${s + 25})`; g.fillRect(x, h - bh, bw, bh);
        g.fillStyle = '#ffd278';
        const ws = Math.max(2, w / 80);
        for (let wy = h - bh + ws * 2; wy < h - ws; wy += ws * 2.4) for (let wx = x + ws; wx < x + bw - ws * 1.5; wx += ws * 2) if (r() < 0.45) g.fillRect(wx, wy, ws, ws * 1.3);
        x += bw + r() * 0.02 * w;
      }
    });
  }

  function animal(w, h, kind = 'cat', bg = '#faecd6') {
    return canvasImage(w, h, (g) => {
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      const cx = w / 2, cy = h * 0.56, r = Math.min(w, h) * 0.3;
      const fur = kind === 'cat' ? '#f0a050' : '#aa7850';
      g.fillStyle = fur;
      if (kind === 'cat') {
        g.beginPath(); g.moveTo(cx - r * 0.9, cy - r * 0.3); g.lineTo(cx - r * 0.75, cy - r * 1.35); g.lineTo(cx - r * 0.15, cy - r * 0.85); g.fill();
        g.beginPath(); g.moveTo(cx + r * 0.9, cy - r * 0.3); g.lineTo(cx + r * 0.75, cy - r * 1.35); g.lineTo(cx + r * 0.15, cy - r * 0.85); g.fill();
      }
      g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
      if (kind === 'dog') {
        g.fillStyle = '#6e4b32';
        g.beginPath(); g.ellipse(cx - r * 0.95, cy - r * 0.15, r * 0.32, r * 0.65, 0.2, 0, 7); g.fill();
        g.beginPath(); g.ellipse(cx + r * 0.95, cy - r * 0.15, r * 0.32, r * 0.65, -0.2, 0, 7); g.fill();
        g.fillStyle = '#e6c8aa'; g.beginPath(); g.ellipse(cx, cy + r * 0.4, r * 0.45, r * 0.35, 0, 0, 7); g.fill();
      }
      g.fillStyle = '#1e1e1e';
      g.beginPath(); g.arc(cx - r * 0.38, cy - r * 0.14, r * 0.11, 0, 7); g.fill();
      g.beginPath(); g.arc(cx + r * 0.38, cy - r * 0.14, r * 0.11, 0, 7); g.fill();
      g.fillStyle = '#3c1e1e'; g.beginPath(); g.ellipse(cx, cy + r * 0.2, r * 0.12, r * 0.08, 0, 0, 7); g.fill();
    });
  }

  function mascot(w, h, body = '#2ec4b6', bg = '#ebf2fa', variant = 0) {
    return canvasImage(w, h, (g) => {
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      const cx = w / 2, u = Math.min(w, h) / 10;
      if (variant === 0) {
        g.strokeStyle = '#3c3c46'; g.lineWidth = u * 0.25; g.beginPath(); g.moveTo(cx, h * 0.18); g.lineTo(cx, h * 0.28); g.stroke();
        g.fillStyle = '#ffb84c'; g.beginPath(); g.arc(cx, h * 0.15, u * 0.4, 0, 7); g.fill();
        g.fillStyle = body; rr(g, cx - u * 2.4, h * 0.28, u * 4.8, u * 3.4, u * 1.1); g.fill();
        g.fillStyle = '#141e2d'; rr(g, cx - u * 1.7, h * 0.28 + u * 0.7, u * 3.4, u * 1.8, u * 0.7); g.fill();
        g.fillStyle = '#78f0e6'; for (const s of [-1, 1]) { g.beginPath(); g.arc(cx + s * u * 0.8, h * 0.28 + u * 1.6, u * 0.35, 0, 7); g.fill(); }
        g.fillStyle = body; rr(g, cx - u * 1.8, h * 0.28 + u * 3.6, u * 3.6, u * 2.6, u * 0.8); g.fill();
      } else {
        g.fillStyle = body; g.beginPath(); g.ellipse(cx, h * 0.22 + u * 2, u * 2.4, u * 2, 0, 0, 7); g.fill();
        g.fillStyle = '#141414'; for (const s of [-1, 1]) g.fillRect(cx + s * u * 0.9 - u * 0.4, h * 0.22 + u * 1.3, u * 0.8, u * 0.7);
        g.fillStyle = body; g.beginPath(); g.moveTo(cx - u * 2, h * 0.22 + u * 4.2); g.lineTo(cx + u * 2, h * 0.22 + u * 4.2); g.lineTo(cx, h * 0.95); g.fill();
      }
    });
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  function person(w, h, shirt = '#5b7bd5', hair = '#3a2a20', long = false, bg = '#e7ecf5') {
    return canvasImage(w, h, (g) => {
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      const cx = w / 2, u = h / 10;
      g.fillStyle = shirt; g.beginPath(); g.ellipse(cx, h + u * 1.2, u * 3.6, u * 4.6, 0, 0, 7); g.fill();
      g.fillStyle = '#f0f3f8'; g.beginPath(); g.moveTo(cx - u * 0.8, h * 0.66); g.lineTo(cx + u * 0.8, h * 0.66); g.lineTo(cx, h * 0.82); g.fill();
      if (long) { g.fillStyle = hair; g.fillRect(cx - u * 1.85, h * 0.3, u * 0.75, u * 2.6); g.fillRect(cx + u * 1.1, h * 0.3, u * 0.75, u * 2.6); }
      g.fillStyle = '#d9a982'; g.beginPath(); g.arc(cx, h * 0.38, u * 1.55, 0, 7); g.fill();
      g.fillStyle = hair; g.beginPath(); g.arc(cx, h * 0.33, u * 1.6, Math.PI, 0); g.fill();
    });
  }

  function toUnit(img) { const d = img.data, n = img.width * img.height, a = new Float32Array(n * 3); for (let k = 0; k < n; k++) for (let q = 0; q < 3; q++) a[k * 3 + q] = d[k * 4 + q] / 127.5 - 1; return a; }
  function abar(frac) { const s = 0.008, f = u => Math.cos((u + s) / (1 + s) * Math.PI / 2) ** 2; return Math.max(1e-4, Math.min(1, f(frac) / f(0))); }
  // frac = 1 pure noise ... 0 clean
  function mix(u, noise, w, h, frac, extraNoise = 0) {
    const a = abar(frac), sa = Math.sqrt(a), sn = Math.sqrt(1 - a) + extraNoise, out = new Uint8ClampedArray(w * h * 4);
    for (let k = 0; k < w * h; k++) { for (let q = 0; q < 3; q++) out[k * 4 + q] = (sa * u[k * 3 + q] + sn * noise[k * 3 + q] + 1) * 127.5; out[k * 4 + 3] = 255; }
    return new ImageData(out, w, h);
  }
  function blend(a, b, t) { const d = new Uint8ClampedArray(a.data.length); for (let k = 0; k < d.length; k++) d[k] = a.data[k] * (1 - t) + b.data[k] * t; return new ImageData(d, a.width, a.height); }
  function scaleTo(img, w, h) {
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').putImageData(img, 0, 0);
    return canvasImage(w, h, (g) => { g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, w, h); });
  }
  function put(canvas, img) { canvas.width = img.width; canvas.height = img.height; canvas.getContext('2d').putImageData(img, 0, 0); }

  const cache = {};
  function landscape(w, h, seed = 1, pal = 'day') {
    const k = `L${w}x${h}s${seed}${pal}`;
    if (!cache[k]) { const { lab, sx } = labels(w, h, seed); cache[k] = { img: render(lab, w, h, pal, sx), lab, sx }; }
    return cache[k];
  }

  return { PAL, SEG, SEGNAMES, rng, gaussArr, labels, render, segImage, sketch, posterize, grey, blur, city, animal, mascot, person, toUnit, abar, mix, blend, scaleTo, put, landscape, canvasImage };
})();
