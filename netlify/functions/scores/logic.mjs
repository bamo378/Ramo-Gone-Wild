// Logique du classement public (testable sans Netlify : on injecte le store).
// Un enregistrement par joueur et par mode : clé "<mode>/<idJoueur>" → meilleur score.
// Pas de compteur partagé : chaque joueur n'écrit que sa propre clé.

export const MODES = ['classic', 'adult'];
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
  if (distance > 40 + duration * 35) return false;
  if (score > 3000 + duration * 230) return false;
  if (score < distance * 0.9) return false; // le score contient toujours la distance
  return true;
}

async function readBoard(store, mode) {
  const { blobs } = await store.list({ prefix: `${mode}/` });
  const rows = await Promise.all(blobs.map(async (b) => {
    const r = await store.get(b.key, { type: 'json' });
    return r && { ...r, id: b.key.slice(mode.length + 1) };
  }));
  return rows.filter(Boolean).sort((a, b) => b.score - a.score || a.date - b.date);
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
    }, 200, { 'cache-control': 'public, max-age=10' });
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
    return json({ ok: true, best, rank: rank || null, total: board.length });
  }
  return json({ error: 'méthode non autorisée' }, 405);
}
