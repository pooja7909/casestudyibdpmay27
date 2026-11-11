// Local store. When a student is signed in, it mirrors their row in PostgreSQL (see cloud.js);
// otherwise it keeps work in this browser only.
const store = (() => {
  const LOCAL = 'dvl:local';
  let ns = LOCAL, mem = {};
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } };
  const persist = () => { try { localStorage.setItem(ns, JSON.stringify(mem)); } catch (e) { /* storage unavailable */ } };
  try { // migrate data from the first version of the lab
    const old = localStorage.getItem('diffuse-vision-lab-v1');
    if (old && !localStorage.getItem(LOCAL)) localStorage.setItem(LOCAL, old);
    localStorage.removeItem('diffuse-vision-lab-v1');
  } catch (e) { }
  mem = read(LOCAL);
  return {
    get: (k) => mem[k],
    set: (k, v) => { mem[k] = v; persist(); if (typeof CLOUD !== 'undefined') CLOUD.queue(); },
    all: () => mem,
    useAccount(uid, data) { ns = 'dvl:u:' + uid; mem = data || {}; persist(); },
    useLocal() { ns = LOCAL; mem = read(LOCAL); },
    localData: () => read(LOCAL),
    clearLocal() { try { localStorage.removeItem(LOCAL); } catch (e) { } },
    forget(uid) { try { localStorage.removeItem('dvl:u:' + uid); } catch (e) { } }
  };
})();
