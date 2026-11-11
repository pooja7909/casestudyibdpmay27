// PostgreSQL (Supabase) sync using student codes — no emails, no names.
// Students enter a code their teacher gave them; the teacher signs in to the dashboard with a password.
const CLOUD = (() => {
  const cfg = window.LAB_CONFIG || {};
  const url = (cfg.SUPABASE_URL || '').replace(/\/+$/, ''), key = cfg.SUPABASE_KEY || cfg.SUPABASE_ANON_KEY || '';
  const enabled = !!(url && key);
  const S = { code: null, status: enabled ? 'signed-out' : 'local', pendingLocal: false, teacher: false };
  const subs = []; let timer = null, saving = false, again = false;
  const emit = () => subs.forEach(f => f(S));
  const setStatus = (s) => { S.status = s; emit(); };
  const ss = { get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) { } } };

  // Spot common config.js mistakes before calling the database.
  function configProblem() {
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) return `config.js: SUPABASE_URL should look like https://abcd1234.supabase.co (it is “${url}”).`;
    if (/[^A-Za-z0-9._-]/.test(key)) return 'config.js: the key contains spaces or invalid characters (such as … or quotes). Paste the real publishable key from Supabase → Project Settings → API Keys.';
    if (/^sb_secret_/.test(key)) return 'config.js: that is a SECRET key. Remove it now and use the publishable key (sb_publishable_…).';
    if (!/^(sb_publishable_|eyJ)/.test(key)) return 'config.js: the key should start with sb_publishable_ (or eyJ for a legacy anon key).';
    if (/^sb_publishable_/.test(key) && key.length < 30) return 'config.js: the key looks too short. Copy the whole publishable key.';
    return null;
  }
  async function rpc(fn, args) {
    const bad = configProblem(); if (bad) return { ok: false, error: bad };
    const headers = { 'Content-Type': 'application/json', apikey: key };
    if (key.startsWith('eyJ')) headers.Authorization = 'Bearer ' + key; // legacy anon key
    let res;
    try { res = await fetch(`${url}/rest/v1/rpc/${fn}`, { method: 'POST', headers, body: JSON.stringify(args) }); }
    catch (e) { return { ok: false, error: 'network', detail: e && e.message }; }
    if (res.status === 404) return { ok: false, error: 'Database function not found (HTTP 404). Run supabase/schema.sql in the Supabase SQL Editor, then try again.' };
    if (res.status === 401 || res.status === 403) return { ok: false, error: `The database refused the key (HTTP ${res.status}). Check SUPABASE_ANON_KEY in config.js is your publishable key, and that schema.sql ran fully.` };
    let body = null; try { body = await res.json(); } catch (e) { }
    if (!res.ok) return { ok: false, error: (body && (body.message || body.hint)) || `HTTP ${res.status}` };
    return body || { ok: false, error: 'empty' };
  }

  // ----- students -----
  async function enter(code) {
    const r = await rpc('lab_student_load', { p_code: code });
    if (!r.ok) return r;
    S.code = r.code; ss.set('dvl:code', r.code);
    store.useAccount(r.code, r.data || {});
    if (!store.get('name')) store.set('name', r.code);
    S.pendingLocal = Object.keys(store.localData()).some(k => k !== 'level');
    setStatus('saved'); route();
    return r;
  }
  async function push() {
    if (!S.code) return;
    if (saving) { again = true; return; }
    saving = true; setStatus('saving');
    const r = await rpc('lab_student_save', { p_code: S.code, p_data: store.all() });
    saving = false;
    setStatus(r.ok ? 'saved' : 'error');
    if (again) { again = false; push(); }
  }
  function queue() { if (!S.code) return; setStatus('pending'); clearTimeout(timer); timer = setTimeout(push, 1200); }
  async function leave() {
    clearTimeout(timer); if (S.code) await push();
    const c = S.code; S.code = null; ss.set('dvl:code', null); if (c) store.forget(c);
    store.useLocal(); S.pendingLocal = false; setStatus('signed-out'); route();
  }
  function mergeLocal(keep) {
    if (keep) { const loc = store.localData(); for (const [k, v] of Object.entries(loc)) { const cur = store.get(k); if (k !== 'name' && (cur == null || cur === '')) store.set(k, v); } }
    store.clearLocal(); S.pendingLocal = false; emit(); route();
  }

  // ----- teacher -----
  const tpw = () => ss.get('dvl:tpw');
  async function teacherLogin(pw) { const r = await rpc('lab_teacher_login', { p_password: pw }); if (r.ok) { ss.set('dvl:tpw', pw); S.teacher = true; emit(); } return r; }
  function teacherLogout() { ss.set('dvl:tpw', null); S.teacher = false; emit(); }
  const teacher = {
    list: () => rpc('lab_teacher_list', { p_password: tpw() }),
    create: (n, grp) => rpc('lab_teacher_create_codes', { p_password: tpw(), p_count: n, p_group: grp }),
    remove: (code) => rpc('lab_teacher_delete_code', { p_password: tpw(), p_code: code }),
    changePw: (nw) => rpc('lab_teacher_change_password', { p_password: tpw(), p_new: nw }).then(r => { if (r.ok) ss.set('dvl:tpw', nw); return r; })
  };

  function init() {
    window.addEventListener('online', () => S.code && push());
    if (!enabled) { emit(); return; }
    if (tpw()) S.teacher = true;
    const c = ss.get('dvl:code');
    if (c) enter(c).then(r => { if (!r.ok) { ss.set('dvl:code', null); setStatus('signed-out'); } });
    else emit();
  }
  return { enabled, S, init, queue, push, enter, leave, mergeLocal, teacherLogin, teacherLogout, teacher, on: (f) => subs.push(f) };
})();

const ERR = { unknown_code: 'That code was not found. Check it with your teacher (letters and numbers, like K7PQ-M42X).', wrong_password: 'Wrong password.', locked: 'Too many wrong attempts. Try again in 15 minutes.', no_password_set: 'No teacher password has been set yet. Run the lab_set_password line from schema.sql in Supabase.', network: 'Could not reach the database. Check the SUPABASE_URL in config.js, and that your Supabase project is not paused.', too_short: 'The new password must be at least 8 characters.' };
const errText = (r) => (ERR[r.error] || r.error || 'Something went wrong.') + (r.detail ? ` (${r.detail})` : '');

// ---------- header chip ----------
function syncChip() {
  const el = document.getElementById('syncchip'); if (!el) return;
  const S = CLOUD.S;
  const map = { local: ['Saved on this device', 'muted'], 'signed-out': ['Enter your code to save', 'warn'], pending: ['Unsaved changes…', 'muted'], saving: ['Saving…', 'muted'], saved: ['Saved ✓', 'ok'], error: ['Not saved: will retry', 'bad'] };
  const [t, c] = map[S.status] || ['', 'muted'];
  el.textContent = S.code && S.status === 'saved' ? `Saved ✓ · ${S.code}` : t;
  el.className = 'syncchip ' + c;
}
CLOUD.on(syncChip);

function mergeBanner() {
  if (!CLOUD.S.pendingLocal) return '';
  return h('div', { class: 'wrap' }, h('div', { class: 'banner' }, h('b', {}, 'This device has lab work saved before you entered your code. '),
    'If it is yours, add it to your code. On a shared computer it may belong to someone else.',
    h('div', { class: 'row', style: 'margin-top:8px' }, h('button', { class: 'btn small', onclick: () => CLOUD.mergeLocal(true) }, 'Add it to my code'), h('button', { class: 'btn ghost small', onclick: () => CLOUD.mergeLocal(false) }, 'Discard it'))));
}

// ---------- student: enter code ----------
function renderAccount() {
  const wrap = h('div', { class: 'wrap', style: 'padding:26px 20px 60px;max-width:720px' });
  wrap.append(h('p', { class: 'eyebrow' }, 'Students'), h('h1', {}, 'Your code'));
  const S = CLOUD.S;
  if (!CLOUD.enabled) {
    wrap.append(h('section', { class: 'panel', style: 'margin-top:18px' }, h('h2', {}, 'Saving online is not switched on'),
      h('p', { style: 'margin-top:8px' }, 'This copy of the lab saves work in this browser only. Use My work → Copy all to hand in your work.')));
    app.append(wrap); return;
  }
  const msg = h('p', { class: 'formmsg' });
  if (S.code) {
    wrap.append(h('section', { class: 'panel', style: 'margin-top:18px' },
      h('p', {}, 'You are working with code'), h('p', { class: 'bigcode num' }, S.code),
      h('p', { class: 'muted', style: 'margin-top:6px' }, S.status === 'saved' ? 'Everything is saved ✓' : 'Saving…'),
      h('div', { class: 'row', style: 'margin-top:16px' }, h('a', { href: '#home', class: 'btn', style: 'text-decoration:none' }, 'Go to the labs'), h('button', { class: 'btn ghost', onclick: () => CLOUD.leave() }, 'Finish and leave')),
      h('p', { class: 'small muted', style: 'margin-top:10px' }, 'Always press “Finish and leave” on a shared computer. Your work stays saved under your code; enter it again next time, on any device.')));
    app.append(wrap); return;
  }
  const inp = h('input', { id: 'code-in', type: 'text', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', placeholder: 'e.g. K7PQ-M42X', class: 'codein' });
  const f = h('form', { class: 'panel form', style: 'margin-top:18px' }, h('label', { class: 'field', for: 'code-in' }, h('span', {}, 'Type the code your teacher gave you'), inp),
    h('button', { class: 'btn', type: 'submit' }, 'Start'), msg,
    h('p', { class: 'small muted' }, 'No name or email needed. Keep your code private: anyone with it can see and change your work.'));
  f.addEventListener('submit', async (e) => { e.preventDefault(); msg.className = 'formmsg'; msg.textContent = 'Checking…'; const r = await CLOUD.enter(inp.value); if (!r.ok) { msg.className = 'formmsg bad'; msg.textContent = errText(r); } else location.hash = '#home'; });
  wrap.append(f); app.append(wrap); setTimeout(() => inp.focus(), 0);
}

// ---------- teacher dashboard ----------
function renderDashboard() {
  const wrap = h('div', { class: 'wrap', style: 'padding:26px 20px 60px' });
  wrap.append(h('p', { class: 'eyebrow' }, 'For teachers'), h('h1', {}, 'Class dashboard'));
  app.append(wrap);
  if (!CLOUD.enabled) { wrap.append(h('section', { class: 'panel', style: 'margin-top:18px' }, h('p', {}, 'Connect the database first (see README).'))); return; }
  if (!CLOUD.S.teacher) {
    const pw = h('input', { id: 't-pw', type: 'password', autocomplete: 'current-password' }); const msg = h('p', { class: 'formmsg' });
    const f = h('form', { class: 'panel form', style: 'margin-top:18px;max-width:520px' }, h('label', { class: 'field', for: 't-pw' }, h('span', {}, 'Teacher password'), pw), h('button', { class: 'btn', type: 'submit' }, 'Open dashboard'), msg);
    f.addEventListener('submit', async (e) => { e.preventDefault(); msg.className = 'formmsg'; msg.textContent = 'Checking…'; const r = await CLOUD.teacherLogin(pw.value); if (r.ok) route(); else { msg.className = 'formmsg bad'; msg.textContent = errText(r); } });
    wrap.append(f); setTimeout(() => pw.focus(), 0); return;
  }
  const msg = h('p', { class: 'formmsg' }); const say = (t, bad) => { msg.className = 'formmsg ' + (bad ? 'bad' : 'ok'); msg.textContent = t; };
  const listBox = h('div'); const viewBox = h('div'); const newBox = h('div');
  let rows = [], filter = store.get('dash:grp') || 'All';
  const nIn = h('input', { id: 'c-n', type: 'number', min: 1, max: 60, value: 25, style: 'width:90px' });
  const gIn = h('input', { id: 'c-g', type: 'text', placeholder: 'Group label, e.g. HL Y2 (no names)', style: 'min-width:260px' });
  const createForm = h('form', { class: 'row', style: 'align-items:end' }, h('label', { class: 'field', for: 'c-n' }, h('span', {}, 'How many codes'), nIn), h('label', { class: 'field', for: 'c-g', style: 'flex:1' }, h('span', {}, 'Group'), gIn), h('button', { class: 'btn', type: 'submit' }, 'Generate codes'));
  createForm.addEventListener('submit', async (e) => {
    e.preventDefault(); say('Generating…');
    const r = await CLOUD.teacher.create(+nIn.value || 1, gIn.value.trim());
    if (!r.ok) return say(errText(r), true);
    say(`${r.codes.length} new codes created.`);
    const txt = r.codes.join('\n');
    newBox.innerHTML = '';
    newBox.append(h('div', { class: 'q', style: 'margin-top:12px' }, h('b', {}, 'New codes: write a student’s name next to each one in your own list.'),
      h('div', { class: 'codegrid' }, ...r.codes.map(c => h('span', { class: 'num' }, c))),
      h('button', { class: 'btn ghost small', onclick: (ev) => copyText(txt, ev.currentTarget, 'Copy codes') }, 'Copy codes')));
    load();
  });
  const stat = (d) => {
    const stages = Object.keys(d).filter(k => k.startsWith('st:') && d[k]).length;
    const preds = Object.keys(d).filter(k => k.startsWith('pred:')).length;
    const spot = Object.keys(d).filter(k => k.startsWith('spotscore:')).map(k => d[k]).reduce((a, s) => [a[0] + s[0], a[1] + s[1], a[2] + s[2]], [0, 0, 0]);
    const ev = Object.keys(d).filter(k => k.startsWith('ev:') && (d[k] || '').trim()).length;
    const memo = ['memo:rec', 'memo:ev', 'memo:counter', 'memo:mind', 'memo:ai'].filter(k => (d[k] || '').trim()).length;
    const mcq = LABS.flatMap(l => l.mcq.map((m, i) => [d[`mcq:${l.id}:${i}`], m.a, d[`conf:${l.id}:${i}`]])).filter(x => x[0] != null);
    return { stages, preds, spot, ev, memo, mcqN: mcq.length, right: mcq.filter(x => x[0] === x[1]).length, sureWrong: mcq.filter(x => x[2] === 'sure' && x[0] !== x[1]).length, ai: (d.ailog || []).length };
  };
  const draw = () => {
    listBox.innerHTML = '';
    const groups = ['All', ...new Set(rows.map(r => r.grp || '(no group)'))];
    if (!groups.includes(filter)) filter = 'All';
    const shown = rows.filter(r => filter === 'All' || (r.grp || '(no group)') === filter);
    const total = LABS.length * STAGES.length;
    listBox.append(h('div', { class: 'section-head' }, h('h2', {}, `Codes (${shown.length})`),
      h('div', { class: 'row' }, chipGroup(groups.map(g => [g, g]), filter, v => { filter = v; store.set('dash:grp', v); draw(); }),
        h('button', { class: 'btn ghost small', onclick: load }, 'Refresh'),
        h('button', { class: 'btn ghost small', onclick: (ev) => copyText('Code\tGroup\tStudent name\n' + shown.map(r => `${r.code}\t${r.grp || ''}\t`).join('\n'), ev.currentTarget, 'Copy list for a spreadsheet') }, 'Copy list for a spreadsheet'))));
    if (!shown.length) { listBox.append(h('p', { class: 'muted' }, 'No codes yet. Generate some above.')); return; }
    const table = h('table', { class: 'exam dash' }, h('tr', {}, ...['Code', 'Group', 'Last saved', 'Stages', 'Predictions', 'Evidence', 'AI mistakes found', 'Quiz', 'Sure but wrong', 'Memo', 'AI log', ''].map(t => h('th', {}, t))));
    shown.forEach(r => {
      const d = r.data || {}, s = stat(d);
      const del = h('button', { class: 'btn ghost small', onclick: async () => {
        if (del.dataset.arm !== '1') { del.dataset.arm = '1'; del.textContent = 'Click again to delete'; setTimeout(() => { del.dataset.arm = ''; del.textContent = 'Delete'; }, 3000); return; }
        const x = await CLOUD.teacher.remove(r.code); if (!x.ok) say(errText(x), true); else { say(`Deleted ${r.code} and its work.`); load(); } } }, 'Delete');
      table.append(h('tr', {}, h('td', {}, h('b', { class: 'num' }, r.code)), h('td', { class: 'small' }, r.grp || '—'), h('td', { class: 'small' }, r.updated_at ? new Date(r.updated_at).toLocaleString() : 'not used yet'),
        h('td', { class: 'num' }, `${s.stages}/${total}`), h('td', { class: 'num' }, `${s.preds}/8`), h('td', { class: 'num' }, `${s.ev}/6`),
        h('td', { class: 'num' }, s.spot[1] ? `${s.spot[0]}/${s.spot[1]}${s.spot[2] ? ` (+${s.spot[2]} false)` : ''}` : '—'),
        h('td', { class: 'num' }, s.mcqN ? `${s.right}/${s.mcqN}` : '—'), h('td', { class: 'num' + (s.sureWrong ? ' warnc' : '') }, String(s.sureWrong)),
        h('td', { class: 'num' }, `${s.memo}/5`), h('td', { class: 'num' }, String(s.ai)),
        h('td', {}, h('div', { class: 'row', style: 'flex-wrap:nowrap' }, h('button', { class: 'btn ghost small', onclick: () => showWork(r) }, 'View work'), del))));
    });
    listBox.append(h('div', { style: 'overflow-x:auto' }, table));
  };
  const showWork = (r) => {
    const text = compileWork((k) => (r.data || {})[k]);
    const ta = h('textarea', { readonly: true, id: 'dash-work', style: 'min-height:420px;font-family:var(--mono);font-size:13px' }); ta.value = text;
    viewBox.innerHTML = '';
    viewBox.append(h('section', { class: 'panel', style: 'margin-top:18px' }, h('div', { class: 'section-head' }, h('h2', {}, `Work: ${r.code}`), h('button', { class: 'btn small', onclick: (ev) => copyText(text, ev.currentTarget, 'Copy') }, 'Copy')), ta,
      h('p', { class: 'small muted', style: 'margin-top:8px' }, 'Tip: pick one sentence for a 2-minute spoken check (questions on the Teacher page).')));
    viewBox.scrollIntoView({ behavior: 'smooth' });
  };
  async function load() {
    listBox.innerHTML = '<p class="muted">Loading…</p>';
    const r = await CLOUD.teacher.list();
    if (!r.ok) { if (r.error === 'wrong_password') { CLOUD.teacherLogout(); route(); return; } listBox.innerHTML = ''; listBox.append(h('p', { class: 'formmsg bad' }, errText(r))); return; }
    rows = r.rows; draw();
  }
  const npw = h('input', { id: 't-npw', type: 'password', autocomplete: 'new-password', placeholder: 'New password (8+ characters)' });
  const pwForm = h('form', { class: 'row' }, npw, h('button', { class: 'btn ghost small', type: 'submit' }, 'Change password'));
  pwForm.addEventListener('submit', async (e) => { e.preventDefault(); const r = await CLOUD.teacher.changePw(npw.value); say(r.ok ? 'Password changed.' : errText(r), !r.ok); npw.value = ''; });
  wrap.append(
    h('section', { class: 'panel', style: 'margin-top:18px' }, h('h2', { style: 'margin-bottom:6px' }, 'Generate student codes'),
      h('p', { class: 'small muted', style: 'margin-bottom:12px' }, 'The database stores only codes, group labels and lab work. Keep your own list of which student has which code.'), createForm, newBox, msg),
    h('section', { class: 'panel', style: 'margin-top:18px' }, listBox), viewBox,
    h('section', { class: 'panel', style: 'margin-top:18px' }, h('div', { class: 'row', style: 'justify-content:space-between' }, pwForm, h('button', { class: 'btn ghost small', onclick: () => { CLOUD.teacherLogout(); route(); } }, 'Lock dashboard'))));
  load();
}

async function copyText(text, btn, label) {
  try { await navigator.clipboard.writeText(text); btn.textContent = 'Copied'; }
  catch (e) { const t = h('textarea', { style: 'position:fixed;left:-9999px' }); t.value = text; document.body.append(t); t.select(); try { document.execCommand('copy'); btn.textContent = 'Copied'; } catch (err) { btn.textContent = 'Copy failed: select and copy manually'; } t.remove(); }
  setTimeout(() => btn.textContent = label, 2000);
}
