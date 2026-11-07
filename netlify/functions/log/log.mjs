// Rapport d'erreur du jeu (visible dans les journaux Netlify) : aide à trouver les bugs sur les téléphones.
export default async (req) => {
  try {
    const b = await req.json();
    console.error('[ramo-error]', JSON.stringify({
      where: String(b.where || '').slice(0, 40), msg: String(b.msg || '').slice(0, 300), stack: String(b.stack || '').slice(0, 1500),
      course: String(b.course || '').slice(0, 20), mode: String(b.mode || '').slice(0, 20), ua: String(b.ua || '').slice(0, 200),
    }));
  } catch { /* ignore */ }
  return new Response(null, { status: 204 });
};
export const config = { path: '/api/log', method: 'POST', rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ['ip', 'domain'] } };
