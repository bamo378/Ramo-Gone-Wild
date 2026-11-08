// Logique du classement public (testable sans Netlify : on injecte le store).
// Un enregistrement par joueur et par mode : clé "<mode>/<idJoueur>" → meilleur score.
// Pas de compteur partagé : chaque joueur n'écrit que sa propre clé.

export const MODES = ['classic', 'adult', 'moleson-classic', 'moleson-adult', 'traverse-classic', 'traverse-adult', 'bros-classic', 'bros-adult'];

// Corrections manuelles : record perdu à cause d'un ancien bug d'affichage.
// Appliquées une seule fois si le score enregistré est plus bas.
// Raillou a ensuite pris le pseudo « Boss » (même joueur, même ligne du classement).
export const MANUAL = [
  { mode: 'classic', pseudos: ['raillou', 'boss'], score: 13822 },
  // Bamo : partie perdue à cause d'un bug (identifié par son téléphone, car deux joueurs s'appellent « bamo »)
  { mode: 'classic', id: 'd9fe6bd5-4ebe-4774-8bae-1b42216f1e6c', score: 15275 },
];
const ID_RE = /^[a-z0-9-]{8,40}$/;

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...extra } });

export function cleanPseudo(p) {
  const s = String(p ?? '').replace(/[<>"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  return s || 'Castor anonyme';
}

// Contrôle de vraisemblance : un score doit correspondre à une vraie partie.
// Distance max ≈ 31 m/s (vitesse max + coup de chaud) ; points max ≈ distance + bières/bonus.
export function plausible({ score, distance, duration }) {
  if (![score, distance, duration].every((n) => Number.isFinite(n) && n >= 0)) return false;
  if (duration < 3 || duration > 3600) return false;
  // combos (x5), super chope (x2) et bonus d'arrivée du Moléson inclus
  if (distance > 40 + duration * 38) return false;
  if (score > 15000 + duration * 700) return false;
  if (score < distance * 0.9) return false; // le score contient toujours la distance
  return true;
}

async function readBoard(store, mode) {
  // lecture « forte » : un record amélioré est visible immédiatement (sinon jusqu'à 60 s de retard)
  const { blobs } = await store.list({ prefix: `${mode}/`, consistency: 'strong' });
  const rows = (await Promise.all(blobs.map(async (b) => {
    const r = await store.get(b.key, { type: 'json', consistency: 'strong' });
    return r && { ...r, id: b.key.slice(mode.length + 1) };
  }))).filter(Boolean);
  for (const fix of MANUAL) {
    if (fix.mode !== mode) continue;
    const row = rows.find((r) => (fix.id ? r.id === fix.id : fix.pseudos.includes(String(r.pseudo).trim().toLowerCase())));
    if (row && row.score < fix.score) {
      row.score = fix.score; row.distance = Math.max(row.distance || 0, Math.round(fix.score * 0.4));
      const { id, ...data } = row;
      await store.setJSON(`${mode}/${id}`, data);
    }
  }
  return rows.sort((a, b) => b.score - a.score || a.date - b.date);
}

export async function handle(req, store) {
  const url = new URL(req.url);
  if (req.method === 'GET') {
    const mode = url.searchParams.get('mode');
    if (!MODES.includes(mode)) return json({ error: 'mode invalide' }, 400);
    const me = url.searchParams.get('me') || '';
    const board = await readBoard(store, mode);
    const myIndex = board.findIndex((r) => r.id === me);
    return json({
      mode, total: board.length,
      top: board.slice(0, 100).map((r, i) => ({ rank: i + 1, pseudo: r.pseudo, score: r.score, distance: r.distance, me: r.id === me })),
      mine: myIndex >= 0 ? { rank: myIndex + 1, score: board[myIndex].score } : null,
    }, 200, { 'cache-control': 'no-store' });
  }
  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'requête invalide' }, 400); }
    const id = String(body.id || '');
    const mode = body.mode;
    const score = Math.floor(Number(body.score)), distance = Math.floor(Number(body.distance)), duration = Number(body.duration);
    if (!ID_RE.test(id) || !MODES.includes(mode)) return json({ error: 'joueur ou mode invalide' }, 400);
    if (!plausible({ score, distance, duration })) return json({ error: 'score refusé' }, 422);
    const pseudo = cleanPseudo(body.pseudo);
    const key = `${mode}/${id}`;
    const prev = await store.get(key, { type: 'json', consistency: 'strong' });
    let best = prev ? prev.score : 0;
    if (!prev || score > prev.score) {
      await store.setJSON(key, { pseudo, score, distance, date: Date.now() });
      best = score;
    } else if (prev.pseudo !== pseudo) {
      await store.setJSON(key, { ...prev, pseudo }); // changement de pseudo
    }
    const board = await readBoard(store, mode);
    const rank = board.findIndex((r) => r.id === id) + 1;
    return json({ ok: true, best, rank: rank || null, total: board.length }, 200, { 'cache-control': 'no-store' });
  }
  return json({ error: 'méthode non autorisée' }, 405);
}
