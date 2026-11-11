// PostgreSQL (Supabase) sync, accounts and the teacher dashboard.
const CLOUD = (() => {
  const cfg = window.LAB_CONFIG || {};
  const enabled = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase && window.supabase.createClient);
  const sb = enabled ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
  const S = { user: null, profile: null, teacher: false, status: enabled ? 'signed-out' : 'local', pendingLocal: false, recovery: false, ready: !enabled };
  const subs = [];
  let timer = null, saving = false, again = false;
  const emit = () => subs.forEach(f => f(S));
  const setStatus = (s) => { S.status = s; emit(); };

  async function loadUser(user) {
    if (S.ready && ((S.user && user && S.user.id === user.id) || (!S.user && !user))) return;
    S.user = user || null;
    if (!user) { S.profile = null; S.teacher = false; store.useLocal(); S.pendingLocal = false; S.ready = true; setStatus('signed-out'); route(); return; }
    setStatus('syncing');
    const [p, t, r] = await Promise.all([
      sb.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      sb.from('teachers').select('user_id').eq('user_id', user.id).maybeSingle(),
      sb.from('progress').select('data, updated_at').eq('user_id', user.id).maybeSingle()]);
    S.profile = p.data || null; S.teacher = !!t.data;
    store.useAccount(user.id, (r.data && r.data.data) || {});
    const loc = store.localData();
    S.pendingLocal = Object.keys(loc).some(k => k !== 'level');
    if (!store.get('name') && S.profile) store.set('name', S.profile.display_name);
    S.ready = true;
    if (r.error) setStatus('error'); else if (!r.data) await push(); else setStatus('saved');
    route();
  }

  async function push() {
    if (!S.user) return;
    if (saving) { again = true; return; }
    saving = true; setStatus('saving');
    const { error } = await sb.from('progress').upsert({ user_id: S.user.id, data: store.all(), updated_at: new Date().toISOString() });
    saving = false;
    setStatus(error ? 'error' : 'saved');
    if (again) { again = false; push(); }
  }
  function queue() { if (!S.user) return; setStatus('pending'); clearTimeout(timer); timer = setTimeout(push, 1200); }
  function mergeLocal(keep) {
    if (keep) { const loc = store.localData(); for (const [k, v] of Object.entries(loc)) { const cur = store.get(k); if (cur == null || cur === '') store.set(k, v); } }
    store.clearLocal(); S.pendingLocal = false; emit(); route();
  }
  function init() {
    window.addEventListener('online', () => S.user && push());
    if (!enabled) { emit(); return; }
    sb.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') { S.recovery = true; location.hash = '#account'; }
      setTimeout(() => loadUser(session ? session.user : null), 0);
    });
  }
  async function signOut() { const uid = S.user && S.user.id; clearTimeout(timer); if (S.user) await push(); await sb.auth.signOut(); if (uid) store.forget(uid); }
  return { enabled, sb, S, init, queue, push, mergeLocal, signOut, on: (f) => subs.push(f) };
})();

// ---------- header chip ----------
function syncChip() {
  const el = document.getElementById('syncchip'); if (!el) return;
  const S = CLOUD.S;
  const map = { local: ['Saved on this device', 'muted'], 'signed-out': ['Sign in to save', 'warn'], syncing: ['Loading…', 'muted'], pending: ['Unsaved changes…', 'muted'], saving: ['Saving…', 'muted'], saved: ['Saved ✓', 'ok'], error: ['Not saved: retrying on next change', 'bad'] };
  const [t, c] = map[S.status] || ['', 'muted'];
  el.textContent = S.user && S.status === 'saved' ? `Saved ✓ · ${S.profile ? S.profile.display_name : ''}` : t;
  el.className = 'syncchip ' + c;
  document.querySelectorAll('[data-teacher-only]').forEach(a => a.classList.toggle('hidden', !S.teacher));
}
CLOUD.on(syncChip);

function mergeBanner() {
  if (!CLOUD.S.pendingLocal) return '';
  return h('div', { class: 'wrap' }, h('div', { class: 'banner' }, h('b', {}, 'This device has lab work that was saved before you signed in. '),
    'If it is yours, add it to your account. On a shared computer, it may belong to someone else.',
    h('div', { class: 'row', style: 'margin-top:8px' }, h('button', { class: 'btn small', onclick: () => CLOUD.mergeLocal(true) }, 'Add it to my account'), h('button', { class: 'btn ghost small', onclick: () => CLOUD.mergeLocal(false) }, 'Discard it'))));
}

// ---------- account page ----------
function field(id, label, type = 'text', attrs = {}) {
  return h('label', { class: 'field', for: id }, h('span', {}, label), h('input', { id, type, ...attrs }));
}
function renderAccount() {
  const wrap = h('div', { class: 'wrap', style: 'padding:26px 20px 60px;max-width:760px' });
  wrap.append(h('p', { class: 'eyebrow' }, 'Account'), h('h1', {}, 'Save your work'));
  const S = CLOUD.S;
  if (!CLOUD.enabled) {
    wrap.append(h('section', { class: 'panel', style: 'margin-top:18px' }, h('h2', {}, 'Accounts are not switched on'),
      h('p', { style: 'margin-top:8px' }, 'This copy of the lab saves work in this browser only. Your teacher can connect a PostgreSQL database (Supabase) by following the README, after which you can sign in and your work is saved online.'),
      h('p', { class: 'small muted', style: 'margin-top:8px' }, 'Until then, use My work → Copy all to hand in your work.')));
    app.append(wrap); return;
  }
  const msg = h('div', { class: 'formmsg' });
  const say = (t, bad) => { msg.className = 'formmsg ' + (bad ? 'bad' : 'ok'); msg.textContent = t; };
  if (S.recovery && S.user) {
    const f = h('form', { class: 'panel form', style: 'margin-top:18px' }, h('h2', {}, 'Choose a new password'), field('np', 'New password (at least 8 characters)', 'password', { minlength: 8, required: true, autocomplete: 'new-password' }), h('button', { class: 'btn', type: 'submit' }, 'Save password'), msg);
    f.addEventListener('submit', async (e) => { e.preventDefault(); const { error } = await CLOUD.sb.auth.updateUser({ password: f.querySelector('#np').value }); if (error) say(error.message, true); else { S.recovery = false; say('Password updated. You are signed in.'); } });
    wrap.append(f); app.append(wrap); return;
  }
  if (S.user) {
    const p = S.profile || {};
    const nameIn = h('input', { id: 'acc-name', type: 'text', value: p.display_name || '' });
    wrap.append(h('section', { class: 'panel', style: 'margin-top:18px' },
      h('div', { class: 'kv', style: 'max-width:520px' }, h('span', {}, 'Email'), h('b', {}, S.user.email || ''), h('span', {}, 'Class'), h('b', {}, p.class_code || (S.teacher ? '—' : 'none: ask your teacher for a code')),
        h('span', {}, 'Role'), h('b', {}, S.teacher ? 'Teacher' : 'Student'), h('span', {}, 'Saving'), h('b', {}, S.status === 'saved' ? 'Up to date ✓' : S.status)),
      h('div', { class: 'row', style: 'margin-top:16px' }, h('label', { class: 'field', for: 'acc-name', style: 'flex:1' }, h('span', {}, 'Display name'), nameIn),
        h('button', { class: 'btn ghost', style: 'align-self:end', onclick: async () => { const { error } = await CLOUD.sb.from('profiles').update({ display_name: nameIn.value.trim() }).eq('id', S.user.id); if (error) say(error.message, true); else { S.profile.display_name = nameIn.value.trim(); say('Name updated.'); syncChip(); } } }, 'Update')),
      h('div', { class: 'row', style: 'margin-top:16px' }, S.teacher ? h('a', { class: 'btn', href: '#dashboard', style: 'text-decoration:none' }, 'Open teacher dashboard') : '', h('button', { class: 'btn ghost', onclick: () => CLOUD.signOut() }, 'Sign out')),
      h('p', { class: 'small muted', style: 'margin-top:10px' }, 'Signing out removes your work from this device; it stays saved in your account.'), msg));
    app.append(wrap); return;
  }
  // signed out: sign in / create account
  const tabs = h('div', { class: 'subtabs', role: 'tablist' }); const box = h('div');
  const show = (m) => { [...tabs.children].forEach((b, i) => b.setAttribute('aria-selected', String(i === (m === 'in' ? 0 : 1)))); box.innerHTML = ''; msg.textContent = ''; box.append(m === 'in' ? signIn() : signUp(), msg); };
  tabs.append(h('button', { role: 'tab', onclick: () => show('in') }, 'Sign in'), h('button', { role: 'tab', onclick: () => show('up') }, 'Create account'));
  function signIn() {
    const f = h('form', { class: 'panel form' }, field('si-email', 'Email', 'email', { required: true, autocomplete: 'email' }), field('si-pw', 'Password', 'password', { required: true, autocomplete: 'current-password' }),
      h('div', { class: 'row' }, h('button', { class: 'btn', type: 'submit' }, 'Sign in'), h('button', { class: 'btn ghost', type: 'button', onclick: async () => {
        const email = f.querySelector('#si-email').value.trim(); if (!email) return say('Type your email first, then press “Forgot password”.', true);
        const { error } = await CLOUD.sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
        say(error ? error.message : 'If that email has an account, a reset link is on its way.', !!error); } }, 'Forgot password')));
    f.addEventListener('submit', async (e) => { e.preventDefault(); say('Signing in…'); const { error } = await CLOUD.sb.auth.signInWithPassword({ email: f.querySelector('#si-email').value.trim(), password: f.querySelector('#si-pw').value }); if (error) say(error.message === 'Invalid login credentials' ? 'Email or password is wrong.' : error.message, true); else location.hash = '#home'; });
    return f;
  }
  function signUp() {
    let role = 'student';
    const code = field('su-code', 'Class code from your teacher', 'text', { autocomplete: 'off', style: 'text-transform:uppercase' });
    const f = h('form', { class: 'panel form' },
      h('div', { class: 'row' }, chipGroup([['student', 'I am a student'], ['teacher', 'I am a teacher']], 'student', v => { role = v; code.classList.toggle('hidden', v === 'teacher'); })),
      field('su-name', 'Your name (as your teacher knows you)', 'text', { required: true, autocomplete: 'name' }), field('su-email', 'Email', 'email', { required: true, autocomplete: 'email' }),
      field('su-pw', 'Password (at least 8 characters)', 'password', { required: true, minlength: 8, autocomplete: 'new-password' }), code,
      h('button', { class: 'btn', type: 'submit' }, 'Create account'),
      h('p', { class: 'small muted' }, 'Teachers: after creating your account, ask the person who set up the database to mark you as a teacher (see README), then create classes from the dashboard.'));
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const cc = f.querySelector('#su-code').value.trim().toUpperCase();
      if (role === 'student') {
        if (!cc) return say('Enter the class code your teacher gave you.', true);
        const { data: ok, error } = await CLOUD.sb.rpc('class_exists', { c: cc });
        if (error) return say(error.message, true);
        if (!ok) return say('That class code was not found. Check it with your teacher.', true);
      }
      say('Creating your account…');
      const { data, error } = await CLOUD.sb.auth.signUp({ email: f.querySelector('#su-email').value.trim(), password: f.querySelector('#su-pw').value,
        options: { data: { display_name: f.querySelector('#su-name').value.trim(), class_code: role === 'student' ? cc : '' }, emailRedirectTo: location.origin + location.pathname } });
      if (error) return say(error.message, true);
      if (!data.session) say('Check your email and click the confirmation link, then sign in here.');
      else location.hash = '#home';
    });
    return f;
  }
  wrap.append(h('p', { class: 'big muted', style: 'margin:10px 0 16px' }, 'Sign in so your predictions, evidence, answers and memo are saved to your account and visible to your teacher.'), tabs, box);
  app.append(wrap); show('in');
}

// ---------- teacher dashboard ----------
function renderDashboard() {
  const wrap = h('div', { class: 'wrap', style: 'padding:26px 20px 60px' });
  wrap.append(h('p', { class: 'eyebrow' }, 'For teachers'), h('h1', {}, 'Class dashboard'));
  app.append(wrap);
  const S = CLOUD.S;
  if (!CLOUD.enabled || !S.user || !S.teacher) {
    wrap.append(h('section', { class: 'panel', style: 'margin-top:18px' }, h('p', {}, !CLOUD.enabled ? 'Connect the database first (see README).' : !S.user ? 'Sign in with your teacher account.' : 'Your account is not marked as a teacher yet. Run the last statement in supabase/schema.sql with your email, then reload.'), h('a', { href: '#account', class: 'btn', style: 'display:inline-block;margin-top:10px;text-decoration:none' }, 'Go to account')));
    return;
  }
  const msg = h('div', { class: 'formmsg' });
  const classesBox = h('div'); const studentsBox = h('div'); const viewBox = h('div');
  let selected = store.get('dash:class') || null;
  const genCode = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)]; return s; };
  const nameIn = h('input', { id: 'cl-name', type: 'text', placeholder: 'e.g. IB CS HL Year 2' });
  const loadClasses = async () => {
    const { data, error } = await CLOUD.sb.from('classes').select('*').order('created_at');
    classesBox.innerHTML = '';
    if (error) { classesBox.append(h('p', { class: 'formmsg bad' }, error.message)); return; }
    if (!data.length) classesBox.append(h('p', { class: 'muted' }, 'No classes yet. Create one, then give students its code.'));
    if (!selected && data.length) selected = data[0].code;
    classesBox.append(h('div', { class: 'row' }, ...data.map(c => h('button', { class: 'chip', 'aria-pressed': String(c.code === selected), onclick: () => { selected = c.code; store.set('dash:class', selected); loadClasses(); } }, `${c.name} · `, h('b', { class: 'num' }, c.code)))));
    if (selected) loadStudents(selected);
  };
  const stat = (d) => {
    const v = (k) => d[k];
    const stages = Object.keys(d).filter(k => k.startsWith('st:') && d[k]).length;
    const preds = Object.keys(d).filter(k => k.startsWith('pred:')).length;
    const spot = Object.keys(d).filter(k => k.startsWith('spotscore:')).map(k => d[k]).reduce((a, s) => [a[0] + s[0], a[1] + s[1], a[2] + s[2]], [0, 0, 0]);
    const ev = Object.keys(d).filter(k => k.startsWith('ev:') && (d[k] || '').trim()).length;
    const memo = ['memo:rec', 'memo:ev', 'memo:counter', 'memo:mind', 'memo:ai'].filter(k => (v(k) || '').trim()).length;
    const mcq = LABS.flatMap(l => l.mcq.map((m, i) => [d[`mcq:${l.id}:${i}`], m.a, d[`conf:${l.id}:${i}`]])).filter(x => x[0] != null);
    const right = mcq.filter(x => x[0] === x[1]).length, sureWrong = mcq.filter(x => x[2] === 'sure' && x[0] !== x[1]).length;
    return { stages, preds, spot, ev, memo, mcqN: mcq.length, right, sureWrong, ai: (d.ailog || []).length };
  };
  const loadStudents = async (code) => {
    studentsBox.innerHTML = '<p class="muted">Loading…</p>'; viewBox.innerHTML = '';
    const { data: profs, error } = await CLOUD.sb.from('profiles').select('id, display_name, email, class_code').eq('class_code', code).order('display_name');
    if (error) { studentsBox.innerHTML = ''; studentsBox.append(h('p', { class: 'formmsg bad' }, error.message)); return; }
    const ids = profs.map(p => p.id);
    const { data: prog } = ids.length ? await CLOUD.sb.from('progress').select('user_id, data, updated_at').in('user_id', ids) : { data: [] };
    const byId = Object.fromEntries((prog || []).map(r => [r.user_id, r]));
    studentsBox.innerHTML = '';
    studentsBox.append(h('div', { class: 'row', style: 'justify-content:space-between;margin-bottom:10px' }, h('h2', {}, `Class ${code}: ${profs.length} student${profs.length === 1 ? '' : 's'}`), h('button', { class: 'btn ghost small', onclick: () => loadStudents(code) }, 'Refresh')));
    if (!profs.length) { studentsBox.append(h('p', { class: 'muted' }, `No students yet. They join by choosing “Create account” and entering code ${code}.`)); return; }
    const total = LABS.length * STAGES.length;
    const table = h('table', { class: 'exam dash' }, h('tr', {}, ...['Student', 'Last saved', 'Stages', 'Predictions', 'Evidence', 'AI mistakes found', 'Quiz', 'Sure but wrong', 'Memo', 'AI log', ''].map(t => h('th', {}, t))));
    profs.forEach(p => {
      const r = byId[p.id]; const d = (r && r.data) || {}; const s = stat(d);
      const when = r ? new Date(r.updated_at).toLocaleString() : 'never';
      table.append(h('tr', {}, h('td', {}, h('b', {}, p.display_name), h('br'), h('span', { class: 'small muted' }, p.email || '')), h('td', { class: 'small' }, when),
        h('td', { class: 'num' }, `${s.stages}/${total}`), h('td', { class: 'num' }, `${s.preds}/8`), h('td', { class: 'num' }, `${s.ev}/6`),
        h('td', { class: 'num' }, s.spot[1] ? `${s.spot[0]}/${s.spot[1]}${s.spot[2] ? ` (+${s.spot[2]} false)` : ''}` : '—'),
        h('td', { class: 'num' }, s.mcqN ? `${s.right}/${s.mcqN}` : '—'), h('td', { class: 'num' + (s.sureWrong ? ' warnc' : '') }, String(s.sureWrong)),
        h('td', { class: 'num' }, `${s.memo}/5`), h('td', { class: 'num' }, String(s.ai)),
        h('td', {}, h('button', { class: 'btn ghost small', onclick: () => showWork(p, d) }, 'View work'))));
    });
    studentsBox.append(h('div', { style: 'overflow-x:auto' }, table));
  };
  const showWork = (p, d) => {
    const text = compileWork((k) => d[k]);
    const ta = h('textarea', { readonly: true, id: 'dash-work', style: 'min-height:420px;font-family:var(--mono);font-size:13px' }); ta.value = text;
    viewBox.innerHTML = '';
    viewBox.append(h('section', { class: 'panel', style: 'margin-top:18px' }, h('div', { class: 'section-head' }, h('h2', {}, `Work: ${p.display_name}`),
      h('button', { class: 'btn small', onclick: async (e) => { const b = e.currentTarget; try { await navigator.clipboard.writeText(text); b.textContent = 'Copied'; } catch (err) { ta.select(); b.textContent = 'Press Ctrl/Cmd+C'; } setTimeout(() => b.textContent = 'Copy', 2000); } }, 'Copy')), ta,
      h('p', { class: 'small muted', style: 'margin-top:8px' }, 'Tip: pick one sentence from this work for a 2-minute spoken check (questions on the Teacher page).')));
    viewBox.scrollIntoView({ behavior: 'smooth' });
  };
  const createForm = h('form', { class: 'row', style: 'margin-top:12px' }, nameIn, h('button', { class: 'btn', type: 'submit' }, 'Create class'));
  createForm.addEventListener('submit', async (e) => {
    e.preventDefault(); const name = nameIn.value.trim(); if (!name) return nameIn.focus();
    const code = genCode();
    const { error } = await CLOUD.sb.from('classes').insert({ code, name, teacher_id: S.user.id });
    if (error) { msg.className = 'formmsg bad'; msg.textContent = error.message; return; }
    msg.className = 'formmsg ok'; msg.textContent = `Class created. Give students the code ${code}.`; selected = code; store.set('dash:class', code); nameIn.value = ''; loadClasses();
  });
  wrap.append(h('section', { class: 'panel', style: 'margin-top:18px' }, h('h2', { style: 'margin-bottom:10px' }, 'Your classes'), classesBox, createForm, msg),
    h('section', { class: 'panel', style: 'margin-top:18px' }, studentsBox), viewBox);
  loadClasses();
}
