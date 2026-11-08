// Records locaux (localStorage) + classement public en ligne (fonction Netlify /api/scores, stockage Netlify Blobs).
// Le serveur vérifie que chaque score est plausible (durée de partie, distance) et limite les envois abusifs.
// Aucun faux score n'est jamais affiché : le classement ne montre que les scores réellement envoyés par les joueurs.

export const ONLINE = true;
const KEY = 'ramo-gone-wild-v1';

const defaults = { pseudo: '', sound: true, best: { classic: 0, adult: 0 }, bestDist: { classic: 0, adult: 0 }, history: [] };

function load() {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return { ...defaults }; }
}
// Copie de secours du pseudo et de l'identifiant dans un cookie (1 an) :
// certains navigateurs (WhatsApp, mode privé, iPhone) vident le localStorage.
function readCookie() {
  try { const m = document.cookie.match(/(?:^|; )ramo_id=([^;]*)/); return m ? JSON.parse(decodeURIComponent(m[1])) : null; } catch { return null; }
}
function writeCookie() {
  try { document.cookie = `ramo_id=${encodeURIComponent(JSON.stringify({ p: data.pseudo || '', i: data.playerId || '' }))}; max-age=31536000; path=/; SameSite=Lax; Secure`; } catch { /* ignore */ }
}
let data = load();
{ const ck = readCookie(); if (ck) { if (!data.pseudo && ck.p) data.pseudo = ck.p; if (!data.playerId && ck.i) data.playerId = ck.i; } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* stockage indisponible */ } writeCookie(); }
save();
// demande au navigateur de garder nos données (évite l'effacement automatique)
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch { /* ignore */ }

export const store = {
  get pseudo() { return data.pseudo; },
  set pseudo(v) { data.pseudo = String(v).slice(0, 16); save(); },
  get tutorial() { return !!data.tutorial; },
  set tutorial(v) { data.tutorial = !!v; save(); },
  // Super Ramo Bros : progression par mode → { niveau: { best, stars:[b,b,b], time } }
  bros(mode) { data.brosP = data.brosP || {}; return (data.brosP[mode] = data.brosP[mode] || {}); },
  saveBros(mode, id, r) {
    const P = this.bros(mode), old = P[id] || { best: 0, stars: [false, false, false], time: 0 };
    const isBest = r.score > old.best;
    P[id] = { best: Math.max(old.best, r.score), stars: old.stars.map((s, i) => s || r.stars[i]), time: isBest ? Math.round(r.time) : old.time, done: true };
    save(); return isBest;
  },
  // Ramo Buvette : progression par mode → { day, money, total, time, upg:{}, stars:{} }
  buv(mode) { data.buvP = data.buvP || {}; return (data.buvP[mode] = { day: 1, money: 0, total: 0, time: 0, upg: {}, stars: {}, ...(data.buvP[mode] || {}) }); },
  saveBuv(mode, s) { data.buvP = data.buvP || {}; data.buvP[mode] = s; save(); },
  get sound() { return data.sound; },
  set sound(v) { data.sound = !!v; save(); },
  best(mode) { return data.best[mode] || 0; },
  bestDist(mode) { return data.bestDist[mode] || 0; },
  history() { return data.history || []; },
  // Retourne true si nouveau record
  get playerId() {
    if (!data.playerId) {
      const r = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
      data.playerId = r.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 36); save();
    }
    return data.playerId;
  },
  bestDur(mode) { return (data.bestDur || {})[mode] || 0; },
  submit(mode, score, distance, duration = 0) {
    const isRecord = score > (data.best[mode] || 0);
    if (isRecord) { data.best[mode] = score; data.bestDur = { ...(data.bestDur || {}), [mode]: duration }; }
    if (distance > (data.bestDist[mode] || 0)) data.bestDist[mode] = distance;
    data.history = [{ mode, score, distance, date: Date.now() }, ...(data.history || [])].slice(0, 20);
    save();
    return isRecord;
  },
};

// Envoie le score au classement public. Retourne { rank, total, best } ou null si hors ligne.
export async function submitOnline(mode, score, distance, duration) {
  if (!ONLINE) return null;
  try {
    const r = await fetch('/api/scores', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: store.playerId, pseudo: data.pseudo, mode, score, distance, duration }),
    });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

// Récupère le top 100 public d'un mode. Retourne null si hors ligne.
export async function fetchBoard(mode) {
  if (!ONLINE) return null;
  try {
    const r = await fetch(`/api/scores?mode=${mode}&me=${encodeURIComponent(store.playerId)}`);
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

// Rattrapage : si le record de ce téléphone est plus haut que celui du classement public
// (envoi raté, réseau coupé, ancienne version du jeu…), on le renvoie automatiquement.
export async function syncBest(mode, board) {
  const local = store.best(mode);
  if (!local || !board || (board.mine && board.mine.score >= local)) return false;
  const dist = Math.max(store.bestDist(mode), 1);
  const dur = store.bestDur(mode) || Math.max(60, Math.ceil(local / 200), Math.ceil(dist / 20));
  const res = await submitOnline(mode, local, Math.min(dist, local), dur);
  return !!(res && res.ok);
}
