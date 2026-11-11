const STAGES = [['sense', 'Sense', 'Commit a prediction and a reason'], ['explore', 'Explore', 'Experiment and log evidence for your client'], ['interpret', 'Interpret', 'Check your prediction against what happened'], ['explain', 'Explain', 'Formal definitions and writing'], ['critique', 'Critique', 'Judge AI answers, stress-test your thinking'], ['practise', 'Practise', 'Exam-style questions with confidence ratings']];
let level = store.get('level') || 'HL';
let leaveFns = []; let calibHook = null;
const app = document.getElementById('app');

const stageDone = (lab, s) => !!store.get(`st:${lab}:${s}`);
const labProgress = (lab) => STAGES.filter(([s]) => stageDone(lab, s)).length;
const isLocked = (lab) => lab.badge === 'HL' && level === 'SL';
const myLabs = () => LABS.filter(l => !isLocked(l));
function overall() { const L = myLabs(); const n = L.reduce((a, l) => a + labProgress(l.id), 0); return n / (L.length * STAGES.length); }
function updTop() { document.getElementById('ovbar').style.width = `${overall() * 100}%`; document.getElementById('ovtxt').textContent = `${Math.round(overall() * 100)}% complete`; }

function ring(frac, color) {
  const c = h('canvas', { width: 68, height: 68, class: 'ring', 'aria-hidden': 'true' }); const g = c.getContext('2d');
  g.lineWidth = 7; g.strokeStyle = css('--line'); g.beginPath(); g.arc(34, 34, 28, 0, 7); g.stroke();
  if (frac > 0) { g.strokeStyle = color || css('--good'); g.lineCap = 'round'; g.beginPath(); g.arc(34, 34, 28, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); g.stroke(); }
  return c;
}
function badgeEl(b) { return b === 'HL' ? h('span', { class: 'badge hl' }, 'HL only') : b === 'core' ? h('span', { class: 'badge core' }, 'SL + HL · core') : h('span', { class: 'badge sl' }, 'SL + HL'); }

// ---------- lab card thumbnails ----------
function thumbFor(kind) {
  const W = 320, H = 180, c = h('canvas', { width: W, height: H, 'aria-hidden': 'true' }), g = c.getContext('2d');
  const put = (img, x, y) => g.putImageData(img, x, y);
  if (kind === 'gen') { const L = IMG.landscape(160, 180, 3, 'day'); put(IMG.segImage(L.lab, 160, 180), 0, 0); put(L.img, 160, 0); }
  else if (kind === 'diff') { const img = IMG.landscape(W, H, 1, 'sunrise').img, u = IMG.toUnit(img), n = IMG.gaussArr(W * H * 3, 2); const parts = 5; for (let p = 0; p < parts; p++) { const m = IMG.mix(u, n, W, H, 1 - p / (parts - 1)); g.putImageData(m, 0, 0, p * W / parts, 0, W / parts, H); } }
  else if (kind === 'gan') { g.fillStyle = css('--paper'); g.fillRect(0, 0, W, H); const a = IMG.landscape(140, 100, 4, 'dusk').img; const f = IMG.mix(IMG.toUnit(a), IMG.gaussArr(140 * 100 * 3, 3), 140, 100, 0.55); put(f, 12, 40); put(a, 168, 40); g.fillStyle = css('--bad'); g.font = 'bold 15px sans-serif'; g.fillText('fake', 14, 30); g.fillStyle = css('--good'); g.fillText('real', 170, 30); }
  else if (kind === 'hybrid') { g.fillStyle = css('--paper'); g.fillRect(0, 0, W, H); const r = IMG.rng(4); [['--sl', 80, 60], ['--warm', 120, 130], ['--hl', 240, 120], ['--bad', 230, 50]].forEach(([col, x, y]) => { g.fillStyle = css(col); for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(x + (r() - 0.5) * 60, y + (r() - 0.5) * 40, 5, 0, 7); g.fill(); } }); g.strokeStyle = css('--ink'); g.lineWidth = 2; g.setLineDash([5, 5]); g.beginPath(); g.moveTo(80, 60); g.lineTo(240, 120); g.stroke(); }
  else if (kind === 'eval') { g.fillStyle = css('--paper'); g.fillRect(0, 0, W, H); [0.85, 0.55, 0.4, 0.62, 0.95].forEach((v, i) => { g.fillStyle = i === 4 ? css('--good') : css('--accent'); g.fillRect(30, 20 + i * 30, 260 * v, 20); }); }
  else if (kind === 'ethics') { const imgs = [IMG.person(106, 90, '#5b7bd5', '#3a2a20'), IMG.person(106, 90, '#c06a9a', '#1d1d1d', true), IMG.landscape(106, 90, 6, 'day').img, IMG.person(106, 90, '#5b7bd5', '#8a5a2b'), IMG.city(106, 90, 3), IMG.person(106, 90, '#5b7bd5', '#b8b0a6')]; imgs.forEach((im, i) => put(im, (i % 3) * 107, Math.floor(i / 3) * 90)); g.strokeStyle = css('--bad'); g.lineWidth = 4; g.beginPath(); g.moveTo(222, 100); g.lineTo(310, 175); g.moveTo(310, 100); g.lineTo(222, 175); g.stroke(); }
  else if (kind === 'exam') { g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, W, H); g.strokeStyle = '#c9d4ea'; for (let y = 30; y < H; y += 24) { g.beginPath(); g.moveTo(20, y); g.lineTo(300, y); g.stroke(); } g.fillStyle = '#c9771a'; g.font = 'bold 18px monospace'; g.fillText('[8]', 262, 24); g.strokeStyle = '#1b8a4c'; g.lineWidth = 4; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(30, 44 + i * 24); g.lineTo(38, 52 + i * 24); g.lineTo(52, 36 + i * 24); g.stroke(); } g.fillStyle = '#5b6884'; for (let i = 0; i < 4; i++) g.fillRect(64, 40 + i * 24, 120 + (i * 37) % 90, 6); }
  else if (kind === 'gloss') { g.fillStyle = css('--paper'); g.fillRect(0, 0, W, H); g.fillStyle = css('--accent'); g.font = 'bold 74px Georgia, serif'; g.fillText('Aa', 30, 110); g.fillStyle = css('--muted'); for (let i = 0; i < 5; i++) g.fillRect(170, 50 + i * 22, 120 - (i % 2) * 30, 8); }
  return c;
}

// ---------- home ----------
function heroStrip() {
  const n = 6, fw = 150, fh = 94, gap = 22, W = n * fw + (n - 1) * gap;
  const c = h('canvas', { width: W, height: fh, 'aria-label': 'Six frames of a diffusion model turning noise into a landscape' }), g = c.getContext('2d');
  const img = IMG.landscape(fw, fh, 2, 'sunrise').img, u = IMG.toUnit(img), nz = IMG.gaussArr(fw * fh * 3, 9);
  for (let i = 0; i < n; i++) {
    g.putImageData(IMG.mix(u, nz, fw, fh, 1 - i / (n - 1)), i * (fw + gap), 0);
    if (i < n - 1) { g.fillStyle = css('--accent'); const x = i * (fw + gap) + fw + 4; g.beginPath(); g.moveTo(x, fh / 2 - 7); g.lineTo(x + 14, fh / 2); g.lineTo(x, fh / 2 + 7); g.fill(); }
  }
  return c;
}

function renderHome() {
  const wrap = h('div', { class: 'wrap' });
  wrap.append(h('section', { class: 'hero' },
    h('div', {},
      h('p', { class: 'eyebrow' }, 'IB DP Computer Science · Paper 1 case study'),
      h('h1', {}, 'Generative AI for image creation — a diffuse vision'),
      h('p', { class: 'lede' }, 'Eight hands-on labs. In each one you predict, experiment with a working simulation, explain what you saw, then practise exam-style questions.'),
      h('div', { class: 'facts' },
        h('div', { class: 'fact' }, h('b', {}, 'May & Nov 2027'), 'for use in'),
        h('div', { class: 'fact' }, h('b', {}, '8-page booklet'), '117 numbered lines'),
        h('div', { class: 'fact' }, h('b', {}, 'HL only'), 'GANs · hybrid models'))),
    h('div', { class: 'strip' }, heroStrip(), h('div', { class: 'cap' }, h('span', {}, 'pure noise'), h('span', {}, 'iterative denoising →'), h('span', {}, 'coherent image')))));

  wrap.append(h('section', { class: 'panel', style: 'margin-top:22px' }, h('div', { class: 'section-head' }, h('h2', {}, 'Your case card'), h('a', { href: '#mywork', style: 'color:var(--accent);font-weight:700;text-decoration:none' }, 'My work & AI-use log →')), CT.cardSetup()));
  const labs = h('div', { class: 'labs' });
  LABS.forEach(l => {
    const p = labProgress(l.id);
    labs.append(h('a', { class: 'labcard' + (isLocked(l) ? ' locked-card' : ''), href: `#lab-${l.id}`, 'aria-label': isLocked(l) ? `${l.title}: locked, HL only` : null },
      isLocked(l) ? h('span', { class: 'lockbadge' }, '🔒 HL only') : '',
      thumbFor(l.thumb), h('span', { class: 'n' }, `Lab 0${l.id}`), h('h3', {}, l.title),
      h('div', { class: 'meta' }, h('div', { style: 'display:grid;gap:4px' }, badgeEl(l.badge), h('span', {}, l.lines)), h('div', { class: 'row', style: 'gap:6px;flex-wrap:nowrap' }, h('span', { class: 'num' }, `${p}/${STAGES.length}`), ring(p / STAGES.length)))));
  });
  wrap.append(h('section', { class: 'panel', style: 'margin-top:26px' },
    h('div', { class: 'section-head' }, h('h2', {}, 'Start a lab'), h('a', { href: '#lab-1', style: 'color:var(--accent);font-weight:700;text-decoration:none' }, 'Learn in a structured sequence →')),
    level === 'SL' ? h('p', { class: 'small muted', style: 'margin:-6px 0 12px' }, levelLockedByTeacher() ? 'Your teacher has set your level to SL: HL-only labs are locked.' : 'SL mode: HL-only labs are locked. Switch to HL at the top if you take HL.') : '',
    labs));

  wrap.append(h('section', { class: 'panel', style: 'margin-top:18px' },
    h('div', { class: 'section-head' }, h('h2', {}, 'How each lab works'), h('span', { class: 'muted small' }, 'Think first, then use tools. Every lab follows the same cycle.')),
    h('div', { class: 'cycle' }, ...STAGES.map(([, t, d], i) => h('div', { class: 'stage-tile' }, h('span', { class: 'k' }, `0${i + 1}`), h('h4', {}, t), h('p', {}, d))))));

  wrap.append(h('div', { class: 'grid2', style: 'margin:18px 0 60px' },
    h('section', { class: 'panel bigq' }, h('p', { class: 'eyebrow', style: 'color:var(--warm)' }, 'The big question'),
      h('h2', {}, 'Which generative model should Visionary Studios bet on, and at what cost?'),
      h('p', { class: 'muted' }, 'Diffusion gives quality but costs computation. GANs are fast but unstable. Hybrids combine strengths but add complexity. And every option depends on curated, fair training data. By the end of the labs you should be able to argue a justified answer.'),
      h('a', { href: '#lab-5', class: 'btn', style: 'display:inline-block;margin-top:14px;text-decoration:none' }, 'Weigh it up in Lab 05')),
    h('section', { class: 'panel' }, h('h2', { style: 'margin-bottom:10px' }, 'How it is examined'),
      h('p', { class: 'small muted', style: 'margin-bottom:10px' }, 'Paper 1, Section B (after Section A on Theme A concepts).'),
      h('table', { class: 'exam' }, h('tr', {}, h('th', {}, ''), h('th', {}, 'SL'), h('th', {}, 'HL')),
        h('tr', {}, h('td', {}, 'Case study marks'), h('td', { class: 'num' }, '12'), h('td', { class: 'num' }, '24')),
        h('tr', {}, h('td', {}, 'Paper 1 length'), h('td', { class: 'num' }, '1 h 15 min'), h('td', { class: 'num' }, '2 h')),
        h('tr', {}, h('td', {}, 'Challenges to prepare'), h('td', { class: 'num' }, '2'), h('td', { class: 'num' }, '4'))),
      h('p', { class: 'small muted', style: 'margin-top:8px' }, 'Based on published summaries of the 2027 guide; confirm with your teacher.'),
      h('a', { href: '#lab-7', style: 'display:inline-block;margin-top:10px;color:var(--accent);font-weight:700;text-decoration:none' }, 'Practise in Lab 07 →'))));
  app.append(wrap);
}

// ---------- lab ----------
function stageSection(lab, key, idx, title, ...content) {
  const done = stageDone(lab.id, key);
  const btn = h('button', { class: 'donebtn', 'aria-pressed': String(done), onclick: () => { const v = !stageDone(lab.id, key); store.set(`st:${lab.id}:${key}`, v); btn.setAttribute('aria-pressed', String(v)); btn.textContent = v ? '✓ Done' : 'Mark as done'; document.querySelector(`[data-step="${key}"]`).classList.toggle('done', v); updTop(); } }, done ? '✓ Done' : 'Mark as done');
  return h('section', { class: 'panel stage', id: `stage-${key}` }, h('div', { class: 'stage-top' }, h('span', { class: 'tag' }, `${idx + 1} · ${STAGES[idx][1].toUpperCase()}`), h('h2', {}, title), btn), ...content);
}

function renderLab(id) {
  const lab = LABS.find(l => l.id === id); if (!lab) return renderHome();
  const wrap = h('div', { class: 'wrap' });
  if (isLocked(lab)) {
    wrap.append(h('div', { class: 'labhead' }, h('div', {}, h('div', { class: 'crumbs' }, h('a', { href: '#home' }, '← All labs'), h('span', {}, `Lab 0${id}`), badgeEl(lab.badge)), h('h1', {}, lab.title))),
      h('section', { class: 'panel lockpanel' }, h('p', { class: 'lockicon', 'aria-hidden': 'true' }, '🔒'), h('h2', {}, 'This lab is for HL students only'),
        h('p', { class: 'muted', style: 'margin-top:8px;max-width:58ch' }, levelLockedByTeacher() ? 'Your teacher has set your level to SL, so this lab is locked. SL students are not examined on GANs or hybrid models.' : 'You are in SL mode, so this lab is locked. SL students are not examined on GANs or hybrid models. If you take HL, switch to HL at the top of the page.'),
        h('div', { class: 'row', style: 'margin-top:16px' }, h('a', { class: 'btn', href: '#home', style: 'text-decoration:none' }, 'Back to my labs'))));
    app.append(wrap); return;
  }
  const p = labProgress(id);
  const head = h('div', { class: 'labhead' },
    h('div', {}, h('div', { class: 'crumbs' }, h('a', { href: '#home' }, '← All labs'), h('span', {}, `Lab 0${id}`), h('span', {}, '·'), h('span', {}, lab.lines), badgeEl(lab.badge)),
      h('h1', {}, lab.title), h('p', { class: 'big' }, lab.big)),
    h('div', { class: 'row', style: 'flex-wrap:nowrap' }, ring(p / STAGES.length), h('span', { class: 'small muted num' }, `${p} of ${STAGES.length} stages done`)));
  const stepper = h('nav', { class: 'stepper', 'aria-label': 'Lab stages' }, h('div', { class: 'wrap' }, ...STAGES.map(([k, t], i) =>
    h('button', { class: 'step' + (stageDone(id, k) ? ' done' : ''), 'data-step': k, onclick: () => document.getElementById(`stage-${k}`).scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth' }) }, h('span', { class: 'dot' }, String(i + 1)), t))));
  wrap.append(head);
  const body = h('div', { class: 'wrap' });

  // 1 Sense — prediction lock
  const pk = `pred:${id}`; const senseBox = h('div');
  const drawSense = () => {
    senseBox.innerHTML = '';
    const pr = store.get(pk);
    const so = h('div', { class: 'opts' });
    let choice = pr ? pr.c : null;
    lab.sense.options.forEach((t, i) => {
      const b = h('button', { class: 'opt', disabled: !!pr, onclick: () => { choice = i; [...so.children].forEach(x => x.classList.remove('picked')); b.classList.add('picked'); } }, h('span', { class: 'l' }, 'ABCD'[i]), h('span', {}, t));
      if (pr) { if (i === lab.sense.answer) b.classList.add('right'); else if (i === pr.c) b.classList.add('wrong'); }
      so.append(b);
    });
    senseBox.append(so);
    if (!pr) {
      const why = h('textarea', { id: `why-${id}`, placeholder: 'Because… (your own reasoning, before any research or AI)', style: 'min-height:80px;margin-top:12px' });
      why.value = store.get(`whydraft:${id}`) || ''; why.addEventListener('input', () => store.set(`whydraft:${id}`, why.value));
      const msg = h('p', { class: 'small', style: 'color:var(--bad);margin-top:6px' });
      senseBox.append(why, h('div', { class: 'row', style: 'margin-top:10px' }, h('button', { class: 'btn', onclick: () => {
        if (choice == null) { msg.textContent = 'Pick an option first.'; return; }
        if (why.value.trim().length < 15) { msg.textContent = 'Write a reason of at least one sentence. A guess with a reason is worth more than a correct guess without one.'; return; }
        store.set(pk, { c: choice, why: why.value.trim() }); drawSense(); unlockExplore(); } }, 'Lock in my prediction'), h('span', { class: 'small muted' }, 'Locked predictions can’t be changed. That’s the point.')), msg);
    } else {
      senseBox.append(h('div', { class: 'reveal ' + (pr.c === lab.sense.answer ? 'good' : '') }, h('p', {}, h('b', {}, 'Your reason: '), `“${pr.why}”`), h('p', { style: 'margin-top:6px' }, h('b', {}, pr.c === lab.sense.answer ? 'Good prediction. ' : 'Not this time, and that is useful. '), lab.sense.reveal)));
    }
  };
  body.append(stageSection(lab, 'sense', 0, 'Commit a prediction', id === 3 ? ganFigure() : '', h('p', { class: 'prose', style: 'margin-top:12px;font-size:18px' }, lab.sense.prompt), senseBox));
  drawSense();

  // 2 Explore — locked until a prediction is committed
  const simRoot = h('div'); const lockBox = h('div');
  let simMounted = false;
  const card = CT.card();
  const mountSim = () => { if (simMounted) return; simMounted = true; lockBox.innerHTML = ''; SIMS[lab.sim](simRoot, { level, store, card, onLeave: (f) => leaveFns.push(f) }); };
  function unlockExplore() { mountSim(); }
  const evBox = EVIDENCE[id] ? h('div', { class: 'q evidence', style: 'margin-top:18px' }, h('span', { class: 'kicker' }, 'Evidence log for your client'),
    card ? CT.cardEl(card, true) : h('p', { class: 'callout', style: 'margin:8px 0' }, h('a', { href: '#mywork' }, 'Get your case card'), ' so your evidence is about your own client.'),
    h('p', { style: 'font-weight:700;margin:10px 0 8px' }, EVIDENCE[id]), CT.ta(`ev:${id}`, 'Record numbers and observations from YOUR runs…', 4)) : '';
  body.append(stageSection(lab, 'explore', 1, 'Hands-on', h('p', { class: 'prose' }, lab.explore.intro), h('ul', { class: 'tasks', style: 'margin-top:12px' }, ...lab.explore.tasks.map(t => h('li', { html: t }))), lockBox, simRoot, evBox));
  if (store.get(pk)) setTimeout(mountSim, 0);
  else lockBox.append(h('div', { class: 'locked' }, h('b', {}, 'Locked: make your prediction first. '), 'Commit a prediction and a reason in stage 1, then the simulation opens.', h('button', { class: 'btn ghost small', style: 'margin-left:10px', onclick: () => document.getElementById('stage-sense').scrollIntoView({ behavior: 'smooth' }) }, 'Go to stage 1')));

  // 3 Interpret
  const qa = h('div', { class: 'qa' });
  qa.append(h('div', { class: 'q' }, h('span', { class: 'kicker' }, 'Look back at your prediction'),
    h('p', { style: 'font-weight:700;margin:4px 0 8px' }, 'Were you right? Which evidence from the simulation confirmed or changed your thinking? Be specific.'), CT.ta(`refl:${id}`, 'When I… I saw… so…', 3)));
  lab.interpret.forEach(([q, a], i) => {
    const key = `int:${id}:${i}`; const ta = h('textarea', { id: `int-${id}-${i}`, placeholder: 'Your idea first (optional)…', style: 'min-height:70px' }); ta.value = store.get(key) || '';
    ta.addEventListener('input', () => store.set(key, ta.value));
    const ans = h('div', { class: 'reveal hidden' }, a);
    qa.append(h('div', { class: 'q' }, h('p', { style: 'font-weight:700;margin-bottom:8px' }, q), ta, h('button', { class: 'btn ghost small', style: 'margin-top:8px', onclick: (e) => { ans.classList.toggle('hidden'); e.currentTarget.textContent = ans.classList.contains('hidden') ? 'Show explanation' : 'Hide explanation'; } }, 'Show explanation'), ans));
  });
  body.append(stageSection(lab, 'interpret', 2, 'What changed, and why?', qa));

  // 4 Explain
  const ex = [];
  if (lab.defs.length) ex.push(h('div', { class: 'defs' }, ...lab.defs.map(([t, d]) => h('div', { class: 'def' }, h('b', {}, t), h('p', {}, d)))));
  if (lab.write) ex.push(h('h3', { style: 'margin:20px 0 10px' }, 'Write it formally'), writtenQ({ q: lab.write.prompt, marks: lab.write.marks, points: lab.write.points }, store, `w:${id}`));
  body.append(stageSection(lab, 'explain', 3, id === 7 ? 'Command terms' : 'Formal definitions', ...ex));

  // 5 Critique
  body.append(stageSection(lab, 'critique', 4, 'Think critically', ...CT.critiqueStage(id)));

  // 5 Practise
  const ps = h('span', { class: 'score' });
  const qs = lab.mcq.map((m, i) => [m, i]).filter(([m]) => !(m.hl && level === 'SL'));
  const updScore = () => { const n = qs.filter(([m, i]) => store.get(`mcq:${id}:${i}`) === m.a).length, a = qs.filter(([, i]) => store.get(`mcq:${id}:${i}`) != null).length; ps.textContent = qs.length ? `Quick check: ${n} / ${qs.length} correct${a < qs.length ? ` (${qs.length - a} to go)` : ''}` : ''; };
  const pr = [h('p', { class: 'disclaim' }, 'Practice questions written for this lab, not IB questions. Rate your confidence before answering each one.'), h('div', { style: 'margin-bottom:12px' }, ps),
    ...qs.map(([m, i]) => mcqQ(m, store, `mcq:${id}:${i}`, () => { updScore(); calibHook && calibHook(); }, `conf:${id}:${i}`)),
    ...lab.written.map((w, i) => writtenQ(w, store, `pw:${id}:${i}`))];
  if (id === 7) pr.push(h('p', { class: 'callout', style: 'margin-top:12px' }, 'The full question bank and timed mock are in the Hands-on stage above.'));
  body.append(stageSection(lab, 'practise', 5, 'Exam-style practice', ...pr));
  updScore();
  const calib = h('p', { class: 'small', style: 'margin-top:4px' });
  const updCal = () => { let sw = 0, gr = 0; qs.forEach(([m, i]) => { const a = store.get(`mcq:${id}:${i}`), c = store.get(`conf:${id}:${i}`); if (a == null) return; if (c === 'sure' && a !== m.a) sw++; if (c === 'guess' && a === m.a) gr++; }); calib.innerHTML = (sw || gr) ? `<b>Calibration:</b> ${sw ? `sure but wrong ×${sw}: revise these first. ` : ''}${gr ? `guessed but right ×${gr}: you know more than you think; make sure you can explain why.` : ''}` : ''; };
  ps.after(calib); updCal(); calibHook = updCal;

  const prev = LABS.find(l => l.id === id - 1), next = LABS.find(l => l.id === id + 1);
  body.append(h('div', { class: 'foot' }, prev ? h('a', { class: 'btn ghost', href: `#lab-${prev.id}` }, `← Lab 0${prev.id}: ${prev.title}`) : h('a', { class: 'btn ghost', href: '#home' }, '← All labs'),
    next ? h('a', { class: 'btn', href: `#lab-${next.id}` }, `Lab 0${next.id}: ${next.title} →`) : h('a', { class: 'btn', href: '#home' }, 'Back to all labs')));
  app.append(wrap, stepper, body);
}

// ---------- routing ----------
function route() {
  leaveFns.forEach(f => { try { f(); } catch (e) { } }); leaveFns = [];
  app.innerHTML = '';
  const m = location.hash.match(/^#lab-(\d)$/);
  const banner = mergeBanner(); if (banner) app.append(banner);
  if (m) renderLab(+m[1]); else if (location.hash === '#mywork') renderMyWork(); else if (location.hash === '#teacher') renderTeacher(); else if (location.hash === '#account') renderAccount(); else if (location.hash === '#dashboard') renderDashboard(); else renderHome();
  document.querySelectorAll('.navlinks a').forEach(a => a.setAttribute('aria-current', String(a.getAttribute('href') === location.hash)));
  window.scrollTo(0, 0); updTop();
}
function levelLockedByTeacher() { return typeof CLOUD !== 'undefined' && !!CLOUD.S.level; }
function setLevel(l, force) {
  if (levelLockedByTeacher() && !force) l = CLOUD.S.level;
  level = l; if (store.get('level') !== l) store.set('level', l);
  const lockedBy = levelLockedByTeacher();
  document.querySelectorAll('.level button').forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.l === l));
    b.disabled = lockedBy && b.dataset.l !== l;
    b.title = lockedBy ? 'Level set by your teacher' : '';
  });
  document.querySelector('.level').classList.toggle('fixed', lockedBy);
  route();
}
document.querySelectorAll('.level button').forEach(b => b.addEventListener('click', () => setLevel(b.dataset.l)));
window.addEventListener('hashchange', route);
(() => { // brand mark
  const c = document.getElementById('brandmark'), w = 30, hh = 30;
  const img = IMG.landscape(w, hh, 2, 'sunrise').img, u = IMG.toUnit(img), n = IMG.gaussArr(w * hh * 3, 3);
  const g = c.getContext('2d'); for (let x = 0; x < w; x++) g.putImageData(IMG.mix(u, n, w, hh, 1 - x / (w - 1)), 0, 0, x, 0, 1, hh);
})();
setLevel(level);
CLOUD.init(); syncChip();
