// Classement public : GET /api/scores?mode=classic|adult&me=<id>  ·  POST /api/scores
import { getStore } from '@netlify/blobs';
import { handle } from './logic.mjs';

export default async (req) => {
  try {
    return await handle(req, getStore('ramo-scores'));
  } catch (e) {
    console.error('scores', e);
    return new Response(JSON.stringify({ error: 'serveur indisponible' }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
};

export const config = {
  path: '/api/scores',
  method: ['GET', 'POST'],
  // protection contre les envois abusifs
  rateLimit: { windowLimit: 40, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
