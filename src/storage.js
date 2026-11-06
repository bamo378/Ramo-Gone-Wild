// Records locaux (localStorage) + point d'entrée pour un futur classement en ligne.
//
// ÉVOLUTION PRÉVUE (Supabase + Netlify Functions) :
//   - netlify/functions/submit-score.js : reçoit { pseudo, score, distance, mode, runToken },
//     valide côté serveur (score plausible / durée de partie, limite de fréquence), écrit dans Supabase.
//   - netlify/functions/leaderboard.js : renvoie le top 100 par mode ('classic' | 'adult').
//   - Activer ONLINE = true et renseigner les URL ci-dessous.
// Aucun faux score n'est jamais affiché : tant que ONLINE = false, seuls les records locaux apparaissent.

export const ONLINE = false;
const KEY = 'ramo-gone-wild-v1';

const defaults = { pseudo: '', sound: true, best: { classic: 0, adult: 0 }, bestDist: { classic: 0, adult: 0 }, history: [] };

function load() {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return { ...defaults }; }
}
let data = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* stockage indisponible */ } }

export const store = {
  get pseudo() { return data.pseudo; },
  set pseudo(v) { data.pseudo = String(v).slice(0, 16); save(); },
  get sound() { return data.sound; },
  set sound(v) { data.sound = !!v; save(); },
  best(mode) { return data.best[mode] || 0; },
  bestDist(mode) { return data.bestDist[mode] || 0; },
  history() { return data.history || []; },
  // Retourne true si nouveau record
  submit(mode, score, distance) {
    const isRecord = score > (data.best[mode] || 0);
    if (isRecord) data.best[mode] = score;
    if (distance > (data.bestDist[mode] || 0)) data.bestDist[mode] = distance;
    data.history = [{ mode, score, distance, date: Date.now() }, ...(data.history || [])].slice(0, 20);
    save();
    if (ONLINE) submitOnline(mode, score, distance);
    return isRecord;
  },
};

async function submitOnline(mode, score, distance) {
  try {
    await fetch('/.netlify/functions/submit-score', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pseudo: data.pseudo, mode, score, distance }),
    });
  } catch { /* hors ligne : on garde le record local */ }
}
