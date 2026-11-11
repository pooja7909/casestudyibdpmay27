// UI for critical-thinking activities, My work page and Teacher toolkit.
const CT = {};

CT.card = () => { const n = store.get('name'); return n ? caseCard(n) : null; };

CT.cardEl = (c, compact) => h('div', { class: 'casecard' + (compact ? ' compact' : '') },
  h('div', { class: 'row', style: 'justify-content:space-between' }, h('b', { class: 'cc-title' }, `Client: ${c.client[0]}`), h('span', { class: 'cc-code num' }, `Case #${c.code}`)),
  h('p', {}, `Needs ${c.client[1]}: `, h('b', {}, `${c.images.toLocaleString()} images`), ` in `, h('b', {}, c.deadline[0]), `, at `, h('b', {}, c.quality[0]), `.`),
  h('p', {}, 'Hardware: ', h('b', {}, c.hardware[0]), '.'),
  h('p', {}, 'Special requirement: ', h('b', {}, c.special), '.'));

CT.cardSetup = (onChange) => {
  const box = h('div');
  const draw = () => {
    box.innerHTML = '';
    const c = CT.card();
    if (c) {
      box.append(CT.cardEl(c), h('div', { class: 'row', style: 'margin-top:10px' }, h('span', { class: 'small muted' }, `Card for “${store.get('name')}”. Your teacher can recreate it from the same name.`),
        h('button', { class: 'btn ghost small', onclick: () => { store.set('name', ''); draw(); onChange && onChange(); } }, 'Change name')));
    } else {
      const inp = h('input', { type: 'text', id: 'cc-name', placeholder: 'Your name or class code', style: 'border:1.5px solid var(--line);border-radius:10px;padding:9px 12px;background:var(--card);min-width:240px' });
      const go = () => { if (inp.value.trim().length < 2) { inp.focus(); return; } store.set('name', inp.value.trim()); draw(); onChange && onChange(); };
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
      box.append(h('p', { class: 'small', style: 'margin-bottom:10px' }, 'Every student gets a different client, so your evidence and recommendation are your own and can’t be copied from a classmate or an AI.'),
        h('div', { class: 'row' }, inp, h('button', { class: 'btn', onclick: go }, 'Get my case card')));
    }
  };
  draw(); return box;
};

// --- textarea bound to store ---
CT.ta = (key, placeholder, rows = 4) => { const t = h('textarea', { id: 'ta-' + key.replace(/[^a-z0-9]/gi, '-'), placeholder, style: `min-height:${rows * 24 + 24}px` }); t.value = store.get(key) || ''; t.addEventListener('input', () => store.set(key, t.value)); return t; };

// --- think box: answer first, then reveal ---
CT.think = (key, label, q, a) => {
  const ans = h('div', { class: 'reveal hidden' }, h('b', {}, 'One strong line of reasoning: '), a);
  const ta = CT.ta(key, 'Your reasoning first…', 3);
  const btn = h('button', { class: 'btn ghost small', style: 'margin-top:8px', onclick: () => {
    if ((ta.value || '').trim().length < 20) { btn.textContent = 'Write at least a sentence first'; setTimeout(() => btn.textContent = 'Compare with a model answer', 1600); return; }
    ans.classList.remove('hidden'); } }, 'Compare with a model answer');
  if ((store.get(key) || '').trim().length >= 20 && store.get(key + ':seen')) ans.classList.remove('hidden');
  btn.addEventListener('click', () => store.set(key + ':seen', true));
  return h('div', { class: 'q' }, h('span', { class: 'kicker' }, label), h('p', { style: 'font-weight:700;margin:4px 0 8px' }, q), ta, btn, ans);
};

// --- spot the AI's mistakes ---
CT.spot = (id) => {
  const F = FLAWED[id]; if (!F) return '';
  const key = `spot:${id}`; const st = store.get(key) || { flags: [], fixes: [], checked: false };
  const list = h('div', { class: 'spot' }); const result = h('div');
  const save = () => store.set(key, st);
  const draw = () => {
    list.innerHTML = '';
    F.s.forEach(([t, kind, why, lines], i) => {
      const flagged = !!st.flags[i];
      let cls = 'sent' + (flagged ? ' flagged' : '');
      let verdict = '';
      if (st.checked) {
        if (kind && flagged) { cls += ' found'; verdict = `✓ Found (${kind === 'wrong' ? 'factual error' : 'weak reasoning'})`; }
        else if (kind && !flagged) { cls += ' missed'; verdict = `✗ Missed (${kind === 'wrong' ? 'factual error' : 'weak reasoning'})`; }
        else if (!kind && flagged) { cls += ' false'; verdict = 'This sentence was actually fine'; }
      }
      const fix = h('input', { type: 'text', id: `fix-${id}-${i}`, placeholder: 'What is wrong, and what should it say?', value: st.fixes[i] || '', class: 'fixin', oninput: (e) => { st.fixes[i] = e.target.value; save(); } });
      const row = h('div', { class: cls },
        h('button', { class: 'sentbtn', 'aria-pressed': String(flagged), disabled: st.checked, onclick: () => { st.flags[i] = !st.flags[i]; save(); draw(); } }, h('span', { class: 'flag' }, flagged ? '⚑' : String(i + 1)), h('span', {}, t)),
        flagged && !st.checked ? fix : '',
        flagged && st.checked && st.fixes[i] ? h('p', { class: 'small', style: 'margin:6px 0 0 40px' }, h('b', {}, 'Your fix: '), st.fixes[i]) : '',
        verdict ? h('p', { class: 'verdict' }, verdict) : '',
        st.checked && kind ? h('p', { class: 'small', style: 'margin:4px 0 0 40px' }, why, ' ', h('span', { class: 'lines' }, `Booklet: ${lines}`)) : '');
      list.append(row);
    });
    result.innerHTML = '';
    if (st.checked) {
      const errs = F.s.filter(s => s[1]).length, found = F.s.filter((s, i) => s[1] && st.flags[i]).length, fals = F.s.filter((s, i) => !s[1] && st.flags[i]).length;
      result.append(h('div', { class: 'reveal ' + (found === errs && !fals ? 'good' : '') }, h('b', {}, `You found ${found} of ${errs} problems`), fals ? ` and flagged ${fals} correct sentence${fals > 1 ? 's' : ''}.` : '.',
        ' Fluent, confident text can still be wrong. Always check claims against the booklet.'),
        h('button', { class: 'btn ghost small', style: 'margin-top:8px', onclick: () => { st.checked = false; st.flags = []; st.fixes = []; save(); draw(); } }, 'Try again'));
      store.set(`spotscore:${id}`, [found, errs, fals]);
    } else {
      const n = st.flags.filter(Boolean).length;
      result.append(h('button', { class: 'btn', disabled: n === 0, onclick: () => { st.checked = true; save(); draw(); } }, n ? `Check my critique (${n} flagged)` : 'Flag at least one sentence'));
    }
  };
  draw();
  return h('div', { class: 'q aiq' },
    h('span', { class: 'kicker' }, 'Spot the AI’s mistakes'),
    h('p', { class: 'small muted', style: 'margin:4px 0 8px' }, 'An AI chatbot wrote this answer. Click every sentence that is wrong or weakly argued, explain the problem, then check. Use the booklet as your evidence.'),
    h('div', { class: 'aiprompt' }, h('b', {}, 'Question: '), F.q), list, h('div', { style: 'margin-top:12px' }, result));
};

// --- comparative judgement (lab 7) ---
CT.compare = () => {
  const key = 'cmp'; const st = store.get(key) || {};
  const out = h('div');
  const ma = h('input', { type: 'number', min: 0, max: 4, id: 'cmp-a', value: st.a ?? '', style: 'width:70px' });
  const mb = h('input', { type: 'number', min: 0, max: 4, id: 'cmp-b', value: st.b ?? '', style: 'width:70px' });
  const why = CT.ta('cmp:why', 'Which is better, and why? Point to specific sentences.', 3);
  const reveal = () => {
    st.a = ma.value; st.b = mb.value; store.set(key, st);
    if (ma.value === '' || mb.value === '' || (why.value || '').trim().length < 20) { out.innerHTML = '<div class="reveal bad">Give both marks and a reason first.</div>'; return; }
    out.innerHTML = '';
    out.append(h('div', { class: 'reveal good' }, h('b', {}, `Examiner-style view: A = ${COMPARE.marks[0]}/4, B = ${COMPARE.marks[1]}/4. `), `You gave A = ${ma.value}, B = ${mb.value}. `, COMPARE.comment));
  };
  return h('div', { class: 'q' }, h('span', { class: 'kicker' }, 'Which answer is better?'),
    h('p', { style: 'font-weight:700;margin:4px 0 10px' }, COMPARE.q),
    h('div', { class: 'grid2' }, h('div', { class: 'aiprompt' }, h('b', {}, 'Answer A'), h('p', { style: 'margin-top:6px' }, COMPARE.a), h('label', { class: 'row small', for: 'cmp-a', style: 'margin-top:8px' }, 'Your mark for A:', ma, '/ 4')),
      h('div', { class: 'aiprompt' }, h('b', {}, 'Answer B'), h('p', { style: 'margin-top:6px' }, COMPARE.b), h('label', { class: 'row small', for: 'cmp-b', style: 'margin-top:8px' }, 'Your mark for B:', mb, '/ 4'))),
    h('div', { style: 'margin-top:10px' }, why), h('button', { class: 'btn ghost small', style: 'margin-top:8px', onclick: reveal }, 'Reveal the examiner view'), out);
};

// --- recommendation memo (lab 7) ---
CT.memo = () => {
  const c = CT.card();
  const parts = [
    ['memo:rec', 'Recommendation', 'Which model or approach should Visionary Studios use for your client, in one or two sentences?'],
    ['memo:ev', 'Evidence', 'Quote numbers and observations from your evidence log and cite booklet lines.'],
    ['memo:counter', 'Strongest counter-argument, and your response', 'What would a sceptical board member say? Why does your recommendation still stand?'],
    ['memo:mind', 'What would change my mind', 'Name one fact or test result that would make you recommend something else.'],
    ['memo:ai', 'AI-use disclosure', 'Did you use AI? For what, and what did you change or reject? (“No AI used” is fine.)']];
  const evs = Object.keys(EVIDENCE).map(k => [k, store.get(`ev:${k}`)]).filter(([, v]) => v && v.trim());
  const checks = ['Every claim is backed by evidence or a booklet line', 'I weighed at least one trade-off', 'My conclusion follows from my evidence', 'I applied it to my client, not to “companies in general”', 'I disclosed any AI use honestly'];
  return h('div', { class: 'q' }, h('span', { class: 'kicker' }, 'Final task: recommendation memo'),
    c ? CT.cardEl(c, true) : h('p', { class: 'callout' }, 'Get your case card on the home page first, so your memo is about your own client.'),
    h('details', { class: 'think', style: 'margin:12px 0' }, h('summary', {}, `Your evidence log (${evs.length} of ${Object.keys(EVIDENCE).length} labs)`),
      h('div', { class: 'ans' }, evs.length ? evs.map(([k, v]) => h('p', { class: 'small', style: 'margin-bottom:8px' }, h('b', {}, `Lab 0${k}: `), v)) : h('p', { class: 'small muted' }, 'Nothing recorded yet. Fill in the evidence box in each lab’s Hands-on stage.'))),
    ...parts.map(([k, t, p]) => h('div', { style: 'margin-top:10px' }, h('b', {}, t), h('p', { class: 'small muted', style: 'margin:2px 0 6px' }, p), CT.ta(k, '', 3))),
    h('div', { class: 'points', style: 'margin-top:12px' }, ...checks.map((t, i) => { const cb = h('input', { type: 'checkbox', id: `memo-c${i}`, onchange: (e) => store.set(`memo:c${i}`, e.target.checked) }); cb.checked = !!store.get(`memo:c${i}`); return h('label', { class: 'point', for: `memo-c${i}` }, cb, t); })),
    h('p', { class: 'small muted', style: 'margin-top:8px' }, 'Copy your memo and all your work from the My work page to hand it in.'));
};

// --- Critique stage assembly ---
CT.critiqueStage = (id) => {
  const parts = [CT.spot(id)];
  (STRESS[id] || []).forEach(([q, a], i) => parts.push(CT.think(`stress:${id}:${i}`, 'What would change your mind?', q, a)));
  if (TRANSFER[id]) parts.push(CT.think(`transfer:${id}`, 'Transfer to an unseen situation', TRANSFER[id][0], TRANSFER[id][1]));
  if (id === 7) parts.push(CT.compare(), CT.memo());
  return parts;
};

// --- AI-use log ---
CT.aiLog = () => {
  const box = h('div');
  const draw = () => {
    box.innerHTML = '';
    const log = store.get('ailog') || [];
    const lab = h('select', { id: 'log-lab' }, h('option', { value: 'General' }, 'General'), ...LABS.map(l => h('option', { value: `Lab 0${l.id}` }, `Lab 0${l.id}: ${l.title}`)));
    const what = h('input', { type: 'text', id: 'log-what', placeholder: 'What did you ask the AI to do?', style: 'flex:1;min-width:200px;border:1.5px solid var(--line);border-radius:10px;padding:8px 10px;background:var(--card)' });
    const changed = h('input', { type: 'text', id: 'log-changed', placeholder: 'What did you check, change or reject?', style: 'flex:1;min-width:200px;border:1.5px solid var(--line);border-radius:10px;padding:8px 10px;background:var(--card)' });
    box.append(h('div', { class: 'row' }, lab, what, changed, h('button', { class: 'btn small', onclick: () => { if (!what.value.trim()) return what.focus(); log.push([lab.value, what.value.trim(), changed.value.trim()]); store.set('ailog', log); draw(); } }, 'Add entry')),
      log.length ? h('table', { class: 'exam', style: 'margin-top:10px' }, h('tr', {}, h('th', {}, 'Where'), h('th', {}, 'AI was used to…'), h('th', {}, 'I checked / changed…'), h('th', {}, '')),
        ...log.map((e, i) => h('tr', {}, h('td', {}, e[0]), h('td', {}, e[1]), h('td', {}, e[2] || '—'), h('td', {}, h('button', { class: 'btn ghost small', onclick: () => { log.splice(i, 1); store.set('ailog', log); draw(); } }, 'Remove'))))) :
        h('p', { class: 'small muted', style: 'margin-top:8px' }, 'No entries yet. If you used no AI, that is worth saying too.'));
  };
  draw(); return box;
};

// --- My work page ---
function compileWork(get) {
  get = get || ((k) => get(k));
  const L = []; const c = get('name') ? caseCard(get('name')) : null; const g = (k) => (get(k) || '').toString().trim();
  L.push(`DIFFUSE VISION LAB — MY WORK`, `Name: ${get('name') || '(not set)'}`);
  if (c) L.push(`Case #${c.code}: ${c.client[0]}, ${c.client[1]}; ${c.images} images in ${c.deadline[0]}; ${c.quality[0]}; ${c.hardware[0]}; special: ${c.special}.`);
  LABS.forEach(l => {
    const pr = get(`pred:${l.id}`);
    L.push('', `== Lab 0${l.id}: ${l.title} ==`);
    if (pr) L.push(`Prediction: ${l.sense.options[pr.c]} (${pr.c === l.sense.answer ? 'correct' : 'incorrect'}). Reason: ${pr.why}`);
    if (g(`refl:${l.id}`)) L.push(`Reflection: ${g(`refl:${l.id}`)}`);
    if (g(`ev:${l.id}`)) L.push(`Evidence: ${g(`ev:${l.id}`)}`);
    const sp = get(`spotscore:${l.id}`); if (sp) L.push(`Spot the AI's mistakes: found ${sp[0]}/${sp[1]}, false flags ${sp[2]}`);
    (STRESS[l.id] || []).forEach((s, i) => g(`stress:${l.id}:${i}`) && L.push(`Q: ${s[0]}\nA: ${g(`stress:${l.id}:${i}`)}`));
    if (TRANSFER[l.id] && g(`transfer:${l.id}`)) L.push(`Transfer: ${TRANSFER[l.id][0]}\nA: ${g(`transfer:${l.id}`)}`);
    const w = get(`w:${l.id}`); if (w && w.text) L.push(`Written answer: ${w.text}`);
  });
  L.push('', '== Recommendation memo ==');
  [['memo:rec', 'Recommendation'], ['memo:ev', 'Evidence'], ['memo:counter', 'Counter-argument'], ['memo:mind', 'What would change my mind'], ['memo:ai', 'AI-use disclosure']].forEach(([k, t]) => L.push(`${t}: ${g(k) || '—'}`));
  const log = get('ailog') || [];
  L.push('', '== AI-use log ==', ...(log.length ? log.map(e => `- ${e[0]}: used for ${e[1]}; checked/changed: ${e[2] || '—'}`) : ['(no entries)']));
  return L.join('\n');
}

function renderMyWork() {
  const wrap = h('div', { class: 'wrap', style: 'padding:26px 20px 60px' });
  const out = h('div'); const pre = h('textarea', { id: 'mywork-text', readonly: true, style: 'min-height:320px;font-family:var(--mono);font-size:13px' });
  const refresh = () => { pre.value = compileWork(); };
  wrap.append(h('p', { class: 'eyebrow' }, 'Hand-in'), h('h1', {}, 'My work'),
    h('p', { class: 'big muted', style: 'margin:10px 0 20px;max-width:62ch' }, 'Everything you have predicted, recorded and argued, in one place. Your teacher marks your reasoning, not just the final answer.'),
    CLOUD.enabled ? h('p', { class: 'callout', style: 'margin-bottom:18px' }, CLOUD.S.user ? 'You are signed in: this work saves to your account automatically and your teacher can see it.' : h('span', {}, h('a', { href: '#account' }, 'Sign in'), ' so your work saves to your account and your teacher can see it.')) : '',
    h('section', { class: 'panel' }, h('h2', { style: 'margin-bottom:12px' }, 'Your case card'), CT.cardSetup(refresh)),
    h('section', { class: 'panel', style: 'margin-top:18px' }, h('h2', { style: 'margin-bottom:6px' }, 'AI-use log'), h('p', { class: 'small muted', style: 'margin-bottom:12px' }, 'The case study asks Visionary Studios to disclose AI use to keep trust (lines 103–105). The same rule applies to your work.'), CT.aiLog()),
    h('section', { class: 'panel', style: 'margin-top:18px' }, h('div', { class: 'section-head' }, h('h2', {}, 'Everything, ready to copy'),
      h('div', { class: 'row' }, h('button', { class: 'btn ghost small', onclick: refresh }, 'Refresh'), h('button', { class: 'btn small', onclick: async (e) => { refresh(); const b = e.currentTarget; try { await navigator.clipboard.writeText(pre.value); b.textContent = 'Copied'; } catch (err) { pre.select(); b.textContent = 'Press Ctrl/Cmd+C to copy'; } setTimeout(() => b.textContent = 'Copy all', 2200); } }, 'Copy all'))), pre, out));
  app.append(wrap); refresh();
}

// --- Teacher toolkit ---
function renderTeacher() {
  const wrap = h('div', { class: 'wrap teacher', style: 'padding:26px 20px 60px' });
  const policy = 'AI USE IN THIS UNIT\nAllowed: asking AI to quiz you; asking AI to critique your draft; asking AI to explain a concept you are stuck on.\nNot allowed: asking AI to write any answer, evidence log, critique or memo you submit.\nRequired: an AI-use log entry for every use. What did you ask, and what did you check, change or reject?\nWhy: the case study itself requires Visionary Studios to disclose AI-generated content to maintain trust (lines 103–105).';
  wrap.append(h('p', { class: 'eyebrow' }, 'For teachers'), h('h1', {}, 'Teacher toolkit'),
    h('p', { class: 'big muted', style: 'margin:10px 0 20px;max-width:64ch' }, 'Activities that make students’ own reasoning visible. Open this page on its own and use your browser’s print command to print any section.'),
    h('section', { class: 'panel' }, h('h2', { style: 'margin-bottom:12px' }, 'How the lab builds critical thinking'),
      h('div', { class: 'grid2' }, ...[
        ['Prediction lock', 'The simulation stays locked until a student commits a prediction and a reason. Afterwards they reflect on what changed their mind.'],
        ['Personal case cards', 'Each name produces a different client (volume, deadline, hardware, special requirement). Recreate any card by typing the student’s name on the My work page.'],
        ['Evidence log', 'Each lab asks for numbers and observations from the student’s own simulation runs, applied to their client.'],
        ['Spot the AI’s mistakes', 'Every lab has a fluent AI-style answer with factual errors and weak reasoning. Students flag, fix and cite booklet lines.'],
        ['Stress tests and transfer', '“What would change your mind?” and unseen-scenario questions. A model answer appears only after the student writes their own.'],
        ['Confidence calibration', 'Before each multiple-choice answer, students rate their confidence. “Sure but wrong” answers show them where to revise.'],
        ['Comparative judgement', 'Lab 07: mark a fluent-but-empty answer against a short, precise one, then compare with the examiner view.'],
        ['Memo and AI log', 'A final recommendation memo plus an AI-use log, compiled on the My work page for submission.']].map(([t, d]) => h('div', { class: 'gitem' }, h('h4', {}, t), h('p', {}, d))))),
    h('section', { class: 'panel', style: 'margin-top:18px' }, h('h2', { style: 'margin-bottom:6px' }, 'Board meeting role-play (45 min)'),
      h('ol', { class: 'tasks', style: 'margin:10px 0 16px' }, ...['Groups of five. Each student takes one role card and one case card (any student’s card works).', '10 min: prepare a 1-minute opening using evidence from the lab.', '15 min: openings, then each role must raise its challenge to at least one other role.', '10 min: the group agrees a recommendation and writes the strongest objection they overruled.', '10 min: individual exit ticket. Write one argument that changed your mind, with a booklet line.'].map(t => h('li', {}, t))),
      h('div', { class: 'grid3 rolecards' }, ...ROLES.map(([r, p, q, c]) => h('div', { class: 'role' }, h('h3', {}, r), h('p', {}, h('b', {}, 'You care about: '), p), h('p', {}, h('b', {}, 'Your opening question: '), q), h('p', {}, h('b', {}, 'Your duty: '), c))))),
    h('section', { class: 'panel', style: 'margin-top:18px' }, h('h2', { style: 'margin-bottom:6px' }, 'Spoken checks (2 minutes per student)'),
      h('p', { class: 'small muted', style: 'margin-bottom:12px' }, 'Read a sentence the student wrote, then ask one or two of these. Students who know they may be asked write things they can defend.'),
      h('div', { class: 'grid2' }, ...LABS.map(l => h('div', { class: 'gitem' }, h('h4', {}, `Lab 0${l.id}: ${l.title}`, badgeEl(l.badge)), h('ul', { style: 'margin:6px 0 0;padding-left:18px;font-size:15px' }, ...VIVA[l.id].map(v => h('li', {}, v))))))),
    h('section', { class: 'panel', style: 'margin-top:18px' }, h('h2', { style: 'margin-bottom:12px' }, 'Transfer scenarios'),
      h('div', { class: 'qa' }, ...Object.entries(TRANSFER).filter(([, v]) => v).map(([k, v]) => h('details', { class: 'think' }, h('summary', {}, `Lab 0${k}: ${v[0]}`), h('div', { class: 'ans' }, v[1]))))),
    h('section', { class: 'panel', style: 'margin-top:18px' }, h('div', { class: 'section-head' }, h('h2', {}, 'Classroom AI-use policy'),
      h('button', { class: 'btn small', onclick: async (e) => { const b = e.currentTarget; try { await navigator.clipboard.writeText(policy); b.textContent = 'Copied'; } catch (err) { b.textContent = 'Select the text and copy'; } setTimeout(() => b.textContent = 'Copy policy', 2000); } }, 'Copy policy')),
      h('pre', { class: 'policy' }, policy)),
    h('section', { class: 'panel', style: 'margin-top:18px' }, h('h2', { style: 'margin-bottom:12px' }, 'Answer key: Spot the AI’s mistakes'),
      h('div', { class: 'qa' }, ...Object.entries(FLAWED).map(([k, F]) => h('details', { class: 'think' }, h('summary', {}, `Lab 0${k}: ${F.q}`),
        h('div', { class: 'ans' }, ...F.s.filter(s => s[1]).map(s => h('p', { class: 'small', style: 'margin-bottom:8px' }, h('b', {}, `“${s[0]}” `), `(${s[1] === 'wrong' ? 'factual error' : 'weak reasoning'}) ${s[2]} `, h('span', { class: 'lines' }, s[3])))))))));
  app.append(wrap);
}
