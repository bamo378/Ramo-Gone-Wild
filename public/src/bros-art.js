// =====================================================================
//  SUPER RAMO BROS — graphismes (tuiles en cache, décors en parallaxe,
//  ennemis, boss) + intelligence des boss
// =====================================================================
import { ROWS } from './bros-levels.js';
import { rand, roundRect as rr, faceOverlay, RAMO_FULL, drawTail, heart } from './draw.js';
import { drawBlonde } from './blonde.js';

// ---------------- palettes des mondes
const TH = {
  bulle:    { sky: ['#5fb8ff', '#d4f0ff'], top: '#6cc04a', topD: '#4f9a35', dirt: '#c08446', dirtD: '#9a6534', brick: '#c8643a', mortar: '#ecd9bd', stone: '#bdb5a6', plank: '#9b6b3a', pillar: 'barrel', far: '#8fa9c4', dust: '#d9c4a0' },
  gruyeres: { sky: ['#78c4ff', '#ffe8c4'], top: '#7cc35a', topD: '#5a9a40', dirt: '#a8947a', dirtD: '#857258', brick: '#b9a98e', mortar: '#e9dfcc', stone: '#c9c0ae', plank: '#8b5a2b', pillar: 'cheese', far: '#9ab0c8', dust: '#cbbb9c' },
  moleson:  { sky: ['#8fc3ef', '#f0f7ff'], top: '#f4f8fd', topD: '#cfdcec', dirt: '#8a96a8', dirtD: '#6c788a', brick: '#a8d8f0', mortar: '#e8f6ff', stone: '#b4c0cf', plank: '#8b5a2b', pillar: 'ice', far: '#b8c8dc', dust: '#ffffff' },
  lac:      { sky: ['#4fc4e8', '#d8f6ff'], top: '#e8d49a', topD: '#c9b070', dirt: '#c9a46a', dirtD: '#a8844e', brick: '#9b6b3a', mortar: '#c99a5b', stone: '#b8b0a0', plank: '#8b5a2b', pillar: 'post', far: '#8fb4c8', dust: '#e8d49a' },
};
const NIGHT = { sky: ['#0d0021', '#4a0f5e'], far: '#2a0c47' };
const pal = (theme, adult) => adult ? { ...TH[theme], ...NIGHT, top: shade(TH[theme].top, 0.45), topD: shade(TH[theme].topD, 0.4), dirt: shade(TH[theme].dirt, 0.4), dirtD: shade(TH[theme].dirtD, 0.35), brick: shade(TH[theme].brick, 0.5), stone: shade(TH[theme].stone, 0.45) } : TH[theme];
export const brickColor = (theme, adult) => pal(theme, adult).brick;
export const dustColor = (theme, adult) => adult ? '#ff9cf0' : TH[theme].dust;

function shade(h, f) {
  const n = parseInt(h.slice(1), 16); const k = (v) => Math.max(0, Math.min(255, Math.round(f >= 1 ? v + (255 - v) * (f - 1) : v * f)));
  return `rgb(${k((n >> 16) & 255)},${k((n >> 8) & 255)},${k(n & 255)})`;
}
const hash = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };

// ---------------- tuiles pré-dessinées (rapide sur téléphone)
export function makeTileCache(theme, adult, T) {
  const P = pal(theme, adult), s = Math.ceil(T) + 1, cache = {};
  const mk = (draw) => { const cv = document.createElement('canvas'); cv.width = s; cv.height = s; const c = cv.getContext('2d'); draw(c, s); return cv; };
  cache.groundTop = mk((c, s) => {
    c.fillStyle = P.dirt; c.fillRect(0, 0, s, s);
    c.fillStyle = P.dirtD; for (let i = 0; i < 5; i++) c.fillRect(hash(i, 1) * s * 0.8, s * 0.35 + hash(i, 2) * s * 0.55, s * 0.16, s * 0.1);
    c.fillStyle = P.top; c.fillRect(0, 0, s, s * 0.3);
    c.fillStyle = P.topD; c.fillRect(0, s * 0.26, s, s * 0.08);
    c.fillStyle = theme === 'moleson' ? '#ffffff' : shade(P.top, 1.25);
    for (let i = 0; i < 4; i++) c.fillRect(hash(i, 3) * s * 0.85, 0, s * 0.08, s * 0.08);
    if (theme === 'moleson') { c.fillStyle = '#ffffff'; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(s * (0.2 + i * 0.3), s * 0.3, s * 0.1, 0, Math.PI); c.fill(); } }
    if (adult) { c.fillStyle = 'rgba(255,60,220,0.6)'; c.fillRect(0, 0, s, Math.max(1, s * 0.04)); }
  });
  cache.ground = mk((c, s) => {
    c.fillStyle = P.dirt; c.fillRect(0, 0, s, s);
    c.fillStyle = P.dirtD; for (let i = 0; i < 6; i++) c.fillRect(hash(i, 4) * s * 0.8, hash(i, 5) * s * 0.85, s * 0.18, s * 0.1);
  });
  cache.brick = mk((c, s) => {
    c.fillStyle = P.mortar; c.fillRect(0, 0, s, s);
    c.fillStyle = P.brick;
    const h = s / 4;
    for (let r = 0; r < 4; r++) for (let k = -1; k < 2; k++) { const off = r % 2 ? s / 4 : 0; c.fillRect(k * s / 2 + off + 1, r * h + 1, s / 2 - 2, h - 2); }
    c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(0, 0, s, 2); c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(0, s - 2, s, 2);
  });
  const qb = (used) => mk((c, s) => {
    c.fillStyle = used ? (adult ? '#3a2052' : '#8a6a4a') : (adult ? '#ff2fc4' : '#f2b51d'); rr(c, 1, 1, s - 2, s - 2, s * 0.12); c.fill();
    c.fillStyle = used ? 'rgba(0,0,0,0.2)' : (adult ? '#ff9cf0' : '#ffd96b'); c.fillRect(3, 3, s - 6, s * 0.12);
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(3, s - s * 0.14, s - 6, s * 0.1);
    for (const [x, y] of [[0.15, 0.15], [0.85, 0.15], [0.15, 0.85], [0.85, 0.85]]) { c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(s * x - 1.5, s * y - 1.5, 3, 3); }
    if (!used) { c.fillStyle = adult ? '#fff' : '#8a4a00'; c.font = `900 ${s * 0.62}px "Luckiest Guy", Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', s / 2, s * 0.56); }
  });
  cache.q = qb(false); cache.used = qb(true);
  cache.stone = mk((c, s) => {
    c.fillStyle = P.stone; c.fillRect(0, 0, s, s);
    c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(0, 0, s, s * 0.12); c.fillRect(0, 0, s * 0.12, s);
    c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillRect(0, s * 0.88, s, s * 0.12); c.fillRect(s * 0.88, 0, s * 0.12, s);
    if (theme === 'moleson') { c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(s * 0.2, s * 0.25, s * 0.15, s * 0.5); }
  });
  const pillar = (top) => mk((c, s) => {
    if (P.pillar === 'barrel') {
      c.fillStyle = adult ? '#5a2a7a' : '#a8692f'; c.fillRect(s * 0.06, 0, s * 0.88, s);
      c.fillStyle = adult ? '#3a1852' : '#7a4a1f'; c.fillRect(s * 0.06, 0, s * 0.12, s); c.fillRect(s * 0.82, 0, s * 0.12, s);
      c.fillStyle = '#4a4a4a'; c.fillRect(s * 0.02, s * 0.15, s * 0.96, s * 0.1); c.fillRect(s * 0.02, s * 0.75, s * 0.96, s * 0.1);
      if (top) { c.fillStyle = adult ? '#7a3a9a' : '#c98a4a'; c.fillRect(s * 0.06, 0, s * 0.88, s * 0.12); }
    } else if (P.pillar === 'cheese') {
      c.fillStyle = adult ? '#7a3a8a' : '#d9a83a'; c.fillRect(s * 0.04, 0, s * 0.92, s);
      c.fillStyle = adult ? '#ff9cf0' : '#f7d35c'; c.fillRect(s * 0.04, s * 0.06, s * 0.92, s * 0.38); c.fillRect(s * 0.04, s * 0.56, s * 0.92, s * 0.38);
      c.fillStyle = adult ? '#c95ab8' : '#e2b843'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(s * (0.2 + i * 0.2), s * (0.25 + (i % 2) * 0.5), s * 0.05, 0, 7); c.fill(); }
    } else if (P.pillar === 'ice') {
      c.fillStyle = adult ? '#5a4a9a' : '#bfe6fa'; c.fillRect(s * 0.04, 0, s * 0.92, s);
      c.fillStyle = 'rgba(255,255,255,0.65)'; c.fillRect(s * 0.18, s * 0.1, s * 0.12, s * 0.8); c.fillRect(s * 0.45, s * 0.2, s * 0.06, s * 0.5);
      c.strokeStyle = adult ? '#9b8aff' : '#8fc6e6'; c.lineWidth = 2; c.strokeRect(s * 0.04 + 1, 1, s * 0.92 - 2, s - 2);
    } else {
      c.fillStyle = adult ? '#4a2a5a' : '#7a5236'; c.fillRect(s * 0.18, 0, s * 0.64, s);
      c.fillStyle = adult ? '#5a3a6a' : '#94683f'; c.fillRect(s * 0.28, 0, s * 0.18, s);
      if (top) { c.fillStyle = adult ? '#ff2fc4' : '#e8402f'; c.fillRect(s * 0.14, 0, s * 0.72, s * 0.18); c.fillStyle = '#fff'; c.fillRect(s * 0.14, s * 0.18, s * 0.72, s * 0.08); }
    }
  });
  cache.pillarTop = pillar(true); cache.pillar = pillar(false);
  cache.plank = mk((c, s) => {
    c.fillStyle = adult ? '#5a2a7a' : P.plank; c.fillRect(0, 0, s, s * 0.32);
    c.fillStyle = adult ? '#ff4fd8' : shade(P.plank, 1.3); c.fillRect(0, 0, s, s * 0.08);
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(s * 0.48, 0, 2, s * 0.32);
    c.fillStyle = adult ? '#3a1852' : shade(P.plank, 0.7); c.fillRect(s * 0.1, s * 0.32, s * 0.08, s * 0.25); c.fillRect(s * 0.82, s * 0.32, s * 0.08, s * 0.25);
  });
  cache.spikes = mk((c, s) => {
    c.fillStyle = theme === 'moleson' ? '#cfeeff' : adult ? '#ff4fd8' : '#9aa0a8';
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(i * s / 3, s); c.lineTo(i * s / 3 + s / 6, s * 0.4); c.lineTo((i + 1) * s / 3, s); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,0.6)'; for (let i = 0; i < 3; i++) c.fillRect(i * s / 3 + s / 6 - 1, s * 0.48, 2, s * 0.3);
  });
  return cache;
}

// ---------------- décor en parallaxe
function drawBackground(B, c, W, H) {
  const P = pal(B.theme, B.adult), t = B.g.t, cam = B.camX * B.T, vh = B.viewH;
  const g = c.createLinearGradient(0, 0, 0, vh); g.addColorStop(0, P.sky[0]); g.addColorStop(1, P.sky[1]);
  c.fillStyle = g; c.fillRect(0, 0, W, vh);
  if (B.adult) {
    c.fillStyle = '#fff';
    for (let i = 0; i < 40; i++) { c.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 2 + i)); c.fillRect((i * 97.3 - cam * 0.02) % W, (i * 53.7) % (vh * 0.5), 2, 2); }
    c.globalAlpha = 1; c.fillStyle = '#ffeef9'; c.beginPath(); c.arc(W * 0.8, vh * 0.12, W * 0.06, 0, 7); c.fill();
  } else {
    c.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 6; i++) { const x = ((i * 260 - cam * 0.08 + t * 6) % (W + 300) + W + 300) % (W + 300) - 150, y = vh * (0.08 + (i % 3) * 0.08), r = 22 + (i % 2) * 12; c.beginPath(); c.arc(x, y, r, 0, 7); c.arc(x + r, y + 6, r * 0.75, 0, 7); c.arc(x - r, y + 8, r * 0.65, 0, 7); c.fill(); }
  }
  // montagnes lointaines (dont le Moléson)
  const base = vh * 0.62 - (B.camY - (ROWS - B.visRows)) * B.T * 0.5;
  c.fillStyle = P.far;
  const px = -((cam * 0.1) % 600);
  for (let k = -1; k < W / 600 + 2; k++) {
    const ox = px + k * 600;
    c.beginPath(); c.moveTo(ox, base);
    c.lineTo(ox + 80, base - vh * 0.16); c.lineTo(ox + 160, base - vh * 0.1); c.lineTo(ox + 260, base - vh * 0.34); c.lineTo(ox + 280, base - vh * 0.33); c.lineTo(ox + 380, base - vh * 0.12); c.lineTo(ox + 470, base - vh * 0.2); c.lineTo(ox + 600, base);
    c.fill();
    if (!B.adult) { c.fillStyle = '#f4f8ff'; c.beginPath(); c.moveTo(ox + 236, base - vh * 0.29); c.lineTo(ox + 260, base - vh * 0.34); c.lineTo(ox + 280, base - vh * 0.33); c.lineTo(ox + 300, base - vh * 0.28); c.lineTo(ox + 270, base - vh * 0.3); c.fill(); c.fillStyle = P.far; }
  }
  // plan intermédiaire selon le monde
  const mid = -(cam * 0.3);
  if (B.theme === 'bulle') midBulle(c, mid, base, vh, W, B.adult, t);
  else if (B.theme === 'gruyeres') midGruyeres(c, mid, base, vh, W, B.adult);
  else if (B.theme === 'moleson') midMoleson(c, mid, base, vh, W, B.adult);
  else midLac(c, mid, base, vh, W, B.adult, t);
  // sol du plan intermédiaire (rue, prairie, neige) jusqu'au premier plan
  const gy = base + vh * 0.05;
  c.fillStyle = B.adult ? '#1d0a2e' : { bulle: '#cdbfa8', gruyeres: '#86b85e', moleson: '#e8f0fa', lac: '#4fa3d0' }[B.theme];
  if (B.theme !== 'lac' && B.theme !== 'moleson') c.fillRect(0, gy, W, vh);
  if (B.theme === 'bulle' && !B.adult) { c.fillStyle = '#b8a78c'; for (let k = 0; k < 6; k++) c.fillRect(0, gy + k * 14 + 6, W, 2); }
  // haies / buissons proches
  const near = -(cam * 0.6), yb = B.sy(ROWS - 2);
  c.fillStyle = B.adult ? '#1a0a2a' : B.theme === 'moleson' ? '#dfeaf6' : B.theme === 'lac' ? '#7aa35a' : '#4f9a35';
  for (let k = -1; k < W / 140 + 2; k++) { const x = ((near % 140) + 140) % 140 - 140 + k * 140; const r = 26 + hash(k + Math.floor(-near / 140)) * 18; c.beginPath(); c.arc(x + 50, yb, r, Math.PI, 0); c.arc(x + 85, yb, r * 0.7, Math.PI, 0); c.fill(); }
}
function midBulle(c, ox, base, vh, W, A, t) {
  const cols = ['#efe6cf', '#f1dd9c', '#ec9e8f', '#f3f0e8', '#e8c98a', '#e9a896', '#ddd3c2'];
  const wdt = 70, start = Math.floor(-ox / wdt) - 1;
  for (let i = start; i < start + W / wdt + 3; i++) {
    const x = ox + i * wdt, h = vh * (0.18 + hash(i, 7) * 0.08), y = base + vh * 0.05 - h;
    if (i % 17 === 5) { // château de Bulle (donjon rond)
      c.fillStyle = A ? '#3d2457' : '#ddd0b6'; c.fillRect(x, y - vh * 0.06, wdt * 1.5, h + vh * 0.06);
      c.fillStyle = A ? '#4b2b6b' : '#e9dfca'; c.fillRect(x - 10, y - vh * 0.17, 34, h + vh * 0.17);
      c.fillStyle = A ? '#6d1b52' : '#9a4a33'; c.beginPath(); c.moveTo(x - 14, y - vh * 0.17); c.lineTo(x + 7, y - vh * 0.26); c.lineTo(x + 28, y - vh * 0.17); c.fill();
      c.beginPath(); c.moveTo(x - 4, y - vh * 0.06); c.lineTo(x + wdt * 0.8, y - vh * 0.12); c.lineTo(x + wdt * 1.55, y - vh * 0.06); c.fill();
      continue;
    }
    c.fillStyle = A ? (i % 2 ? '#2d1440' : '#3a1a52') : cols[Math.abs(i) % cols.length]; c.fillRect(x, y, wdt - 2, h);
    c.fillStyle = A ? '#140620' : '#7a4a3a'; c.beginPath(); c.moveTo(x - 4, y); c.lineTo(x + wdt / 2, y - vh * 0.06); c.lineTo(x + wdt + 2, y); c.fill();
    for (let r = 0; r < 2; r++) for (let k = 0; k < 2; k++) { c.fillStyle = A ? ((i + r + k) % 3 ? '#ffcf5f' : '#ff5fd2') : '#4a6a85'; c.fillRect(x + 12 + k * 26, y + 10 + r * 26, 12, 15); if (!A) { c.fillStyle = '#2f7d8f'; c.fillRect(x + 7 + k * 26, y + 10 + r * 26, 4, 15); } }
  }
}
function midGruyeres(c, ox, base, vh, W, A) {
  const span = 900;
  for (let k = Math.floor(-ox / span) - 1; k < Math.floor(-ox / span) + W / span + 2; k++) {
    const x = ox + k * span;
    c.fillStyle = A ? '#25093b' : '#79ad55'; c.beginPath(); c.ellipse(x + 400, base + vh * 0.06, 360, vh * 0.2, 0, Math.PI, 0); c.fill();
    // château de Gruyères : grand corps, tours rondes
    const cx = x + 400, cy = base - vh * 0.12;
    c.fillStyle = A ? '#4b2b6b' : '#ece2cc'; c.fillRect(cx - 90, cy - vh * 0.1, 180, vh * 0.12);
    c.fillStyle = A ? '#6d1b52' : '#a24a33'; c.beginPath(); c.moveTo(cx - 96, cy - vh * 0.1); c.lineTo(cx, cy - vh * 0.19); c.lineTo(cx + 96, cy - vh * 0.1); c.fill();
    for (const tx of [-100, 95]) { c.fillStyle = A ? '#5d3a80' : '#f4ecda'; c.fillRect(cx + tx - 14, cy - vh * 0.16, 28, vh * 0.18); c.fillStyle = A ? '#6d1b52' : '#a24a33'; c.beginPath(); c.moveTo(cx + tx - 18, cy - vh * 0.16); c.lineTo(cx + tx, cy - vh * 0.24); c.lineTo(cx + tx + 18, cy - vh * 0.16); c.fill(); }
    c.fillStyle = A ? '#ff5fd2' : '#4a3b2a'; for (let i = 0; i < 5; i++) c.fillRect(cx - 70 + i * 32, cy - vh * 0.07, 10, 14);
    // drapeau à la grue
    c.fillStyle = '#c8202c'; c.fillRect(cx, cy - vh * 0.25, 22, 14); c.fillStyle = '#fff'; c.fillRect(cx + 6, cy - vh * 0.245, 4, 10);
    // maisons médiévales
    for (let i = 0; i < 6; i++) { const hx = x + 120 + i * 90 + (i > 2 ? 200 : 0), hh = vh * (0.08 + hash(i, k) * 0.05); c.fillStyle = A ? '#2d1440' : ['#e8dcc6', '#d9c7a8', '#f0e6d2'][i % 3]; c.fillRect(hx, base + vh * 0.04 - hh, 60, hh); c.fillStyle = A ? '#140620' : '#7a4a3a'; c.beginPath(); c.moveTo(hx - 5, base + vh * 0.04 - hh); c.lineTo(hx + 30, base + vh * 0.04 - hh - 22); c.lineTo(hx + 65, base + vh * 0.04 - hh); c.fill(); }
  }
}
function midMoleson(c, ox, base, vh, W, A) {
  const wdt = 48, start = Math.floor(-ox / wdt) - 1;
  for (let i = start; i < start + W / wdt + 3; i++) {
    const x = ox + i * wdt, h = vh * (0.12 + hash(i, 9) * 0.1), y = base + vh * 0.08;
    c.fillStyle = A ? '#16392e' : '#2f6b45';
    for (let k = 0; k < 3; k++) { const w = 34 - k * 8; c.beginPath(); c.moveTo(x + 24, y - h - k * 0); c.lineTo(x + 24 - w / 2 - 4, y - h * (0.25 * k)); c.lineTo(x + 24 + w / 2 + 4, y - h * (0.25 * k)); c.fill(); }
    c.fillStyle = A ? 'rgba(220,210,255,0.7)' : '#ffffff'; c.beginPath(); c.moveTo(x + 24, y - h); c.lineTo(x + 18, y - h * 0.8); c.lineTo(x + 30, y - h * 0.8); c.fill();
  }
  c.fillStyle = A ? '#2a1a4a' : '#e8f0fa'; c.fillRect(0, base + vh * 0.08, W, vh);
}
function midLac(c, ox, base, vh, W, A, t) {
  c.fillStyle = A ? '#2a1f6b' : '#4fa3d0'; c.fillRect(0, base - vh * 0.01, W, vh);
  c.fillStyle = A ? 'rgba(255,120,240,0.25)' : 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 12; i++) c.fillRect((i * 83 + ox * 0.3) % W + (i % 2) * 20, base + vh * (0.03 + (i % 4) * 0.04), 40, 2);
  const span = 420;
  for (let k = Math.floor(-ox / span) - 1; k < Math.floor(-ox / span) + W / span + 2; k++) {
    const x = ox + k * span + 120, y = base + vh * 0.06 + Math.sin(t * 1.5 + k) * 2;
    c.fillStyle = A ? '#5a2a7a' : '#ffffff'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 50, y); c.lineTo(x + 42, y + 8); c.lineTo(x + 6, y + 8); c.fill();
    c.fillStyle = A ? '#ff5fd2' : '#ffffff'; c.beginPath(); c.moveTo(x + 24, y - 2); c.lineTo(x + 24, y - 48); c.lineTo(x + 46, y - 6); c.fill();
    c.fillStyle = A ? '#4fe3ff' : '#e8402f'; c.beginPath(); c.moveTo(x + 22, y - 2); c.lineTo(x + 22, y - 36); c.lineTo(x + 6, y - 6); c.fill();
  }
}

// ---------------- ennemis
function drawEnemy(B, c, e) {
  const T = B.T, x = B.sx(e.x), y = B.sy(e.y), w = e.w * T, h = e.h * T, t = B.g.t, A = B.adult, th = B.theme;
  c.save();
  if (e.fall) { c.translate(x + w / 2, y + h / 2); c.rotate(Math.PI); c.translate(-(x + w / 2), -(y + h / 2)); }
  if (e.type === 'walker') {
    const sq = e.squash > 0 ? 0.35 : 1, yy = y + h * (1 - sq), hh = h * sq, step = Math.sin(e.t * 12) * (sq < 1 ? 0 : 1);
    if (th === 'moleson') { // petit bonhomme de neige qui marche
      c.fillStyle = A ? '#e8dcff' : '#ffffff'; c.beginPath(); c.ellipse(x + w / 2, yy + hh * 0.68, w * 0.45, hh * 0.32, 0, 0, 7); c.fill(); c.beginPath(); c.arc(x + w / 2, yy + hh * 0.3, w * 0.3, 0, 7); c.fill();
      c.fillStyle = '#111'; c.fillRect(x + w * 0.35, yy + hh * 0.22, 3, 3); c.fillRect(x + w * 0.58, yy + hh * 0.22, 3, 3);
      c.fillStyle = '#ff7b1c'; c.beginPath(); c.moveTo(x + w / 2, yy + hh * 0.3); c.lineTo(x + w / 2 + e.dir * -w * 0.3, yy + hh * 0.34); c.lineTo(x + w / 2, yy + hh * 0.38); c.fill();
      c.fillStyle = A ? '#ff2fc4' : '#c8202c'; c.fillRect(x + w * 0.22, yy + hh * 0.46, w * 0.56, hh * 0.08);
    } else if (th === 'lac') { // écrevisse
      c.fillStyle = A ? '#ff2fc4' : '#d0402a'; c.beginPath(); c.ellipse(x + w / 2, yy + hh * 0.6, w * 0.42, hh * 0.32, 0, 0, 7); c.fill();
      for (const d of [-1, 1]) { c.beginPath(); c.ellipse(x + w / 2 + d * w * 0.48, yy + hh * 0.35 - Math.abs(step) * 2, w * 0.18, hh * 0.14, d * 0.5, 0, 7); c.fill(); }
      c.fillStyle = '#111'; c.fillRect(x + w * 0.36, yy + hh * 0.38, 3, 3); c.fillRect(x + w * 0.6, yy + hh * 0.38, 3, 3);
      c.strokeStyle = A ? '#ff2fc4' : '#d0402a'; c.lineWidth = 2; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(x + w * (0.25 + k * 0.25), yy + hh * 0.85); c.lineTo(x + w * (0.2 + k * 0.25) + step * 2, yy + hh); c.stroke(); }
    } else { // marmotte
      c.fillStyle = '#2b1a10'; c.fillRect(x + w * 0.2 + step * 2, yy + hh * 0.86, w * 0.22, hh * 0.14); c.fillRect(x + w * 0.58 - step * 2, yy + hh * 0.86, w * 0.22, hh * 0.14);
      c.fillStyle = A ? '#7a4a8a' : '#9a6a3a'; c.beginPath(); c.ellipse(x + w / 2, yy + hh * 0.52, w * 0.46, hh * 0.42, 0, 0, 7); c.fill();
      c.fillStyle = A ? '#c99ad8' : '#d9b58a'; c.beginPath(); c.ellipse(x + w / 2, yy + hh * 0.62, w * 0.26, hh * 0.26, 0, 0, 7); c.fill();
      c.fillStyle = A ? '#7a4a8a' : '#9a6a3a'; c.beginPath(); c.arc(x + w * 0.22, yy + hh * 0.14, w * 0.1, 0, 7); c.arc(x + w * 0.78, yy + hh * 0.14, w * 0.1, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(x + w * 0.36, yy + hh * 0.32, w * 0.1, 0, 7); c.arc(x + w * 0.64, yy + hh * 0.32, w * 0.1, 0, 7); c.fill();
      c.fillStyle = '#111'; c.beginPath(); c.arc(x + w * (0.36 + e.dir * 0.03), yy + hh * 0.33, w * 0.05, 0, 7); c.arc(x + w * (0.64 + e.dir * 0.03), yy + hh * 0.33, w * 0.05, 0, 7); c.fill();
      c.strokeStyle = '#111'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + w * 0.26, yy + hh * 0.2); c.lineTo(x + w * 0.44, yy + hh * 0.26); c.moveTo(x + w * 0.74, yy + hh * 0.2); c.lineTo(x + w * 0.56, yy + hh * 0.26); c.stroke(); // sourcils fâchés
      c.fillStyle = '#fff'; c.fillRect(x + w * 0.44, yy + hh * 0.46, w * 0.06, hh * 0.1); c.fillRect(x + w * 0.51, yy + hh * 0.46, w * 0.06, hh * 0.1);
    }
  } else if (e.type === 'flyer') {
    const flap = Math.sin(t * 16) * 0.6;
    const body = th === 'lac' ? '#f4f4f4' : th === 'bulle' ? '#8a8f9a' : '#1d1d24';
    c.fillStyle = A ? '#ff5fd2' : body;
    c.beginPath(); c.ellipse(x + w / 2, y + h / 2, w * 0.4, h * 0.3, 0, 0, 7); c.fill();
    for (const d of [-1, 1]) { c.beginPath(); c.moveTo(x + w / 2, y + h * 0.45); c.lineTo(x + w / 2 + d * w * 0.65, y + h * (0.2 - flap * 0.5)); c.lineTo(x + w / 2 + d * w * 0.3, y + h * 0.6); c.fill(); }
    c.beginPath(); c.arc(x + w / 2 + e.dir * w * 0.35, y + h * 0.35, w * 0.18, 0, 7); c.fill();
    c.fillStyle = th === 'moleson' || th === 'lac' ? '#f2c21d' : '#e8a020'; c.beginPath(); c.moveTo(x + w / 2 + e.dir * w * 0.5, y + h * 0.32); c.lineTo(x + w / 2 + e.dir * w * 0.72, y + h * 0.38); c.lineTo(x + w / 2 + e.dir * w * 0.5, y + h * 0.42); c.fill();
    c.fillStyle = '#fff'; c.fillRect(x + w / 2 + e.dir * w * 0.36 - 2, y + h * 0.28, 4, 4); c.fillStyle = '#111'; c.fillRect(x + w / 2 + e.dir * w * 0.38 - 1, y + h * 0.29, 2, 2);
  } else if (e.type === 'roller') { // roue de gruyère
    const r = Math.min(w, h) * 0.5, cx = x + w / 2, cy = y + h - r, rot = e.state === 'stop' ? 0 : (e.x * 2);
    c.translate(cx, cy); c.rotate(rot);
    c.fillStyle = A ? '#7a3a8a' : '#c99a3a'; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
    c.fillStyle = A ? '#ff9cf0' : '#f7d35c'; c.beginPath(); c.arc(0, 0, r * 0.82, 0, 7); c.fill();
    c.fillStyle = A ? '#c95ab8' : '#e2b843'; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(Math.cos(k * 1.26) * r * 0.45, Math.sin(k * 1.26) * r * 0.45, r * 0.09, 0, 7); c.fill(); }
    if (e.state !== 'kick') { c.rotate(-rot); c.fillStyle = '#111'; c.fillRect(-r * 0.35, -r * 0.25, 3, 4); c.fillRect(r * 0.25, -r * 0.25, 3, 4); c.fillRect(-r * 0.3, r * 0.2, r * 0.6, 2); }
  } else if (e.type === 'fish') {
    c.translate(x + w / 2, y + h / 2); c.rotate(e.vy < 0 ? -1.2 : 1.2);
    c.fillStyle = A ? '#4fe3ff' : '#5a8a4a'; c.beginPath(); c.ellipse(0, 0, w * 0.6, h * 0.32, 0, 0, 7); c.fill();
    c.beginPath(); c.moveTo(-w * 0.55, 0); c.lineTo(-w * 0.85, -h * 0.25); c.lineTo(-w * 0.85, h * 0.25); c.fill();
    c.fillStyle = '#d9e8b0'; c.beginPath(); c.ellipse(0, h * 0.1, w * 0.45, h * 0.14, 0, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(w * 0.32, -h * 0.08, 3, 0, 7); c.fill(); c.fillStyle = '#111'; c.fillRect(w * 0.32, -h * 0.09, 2, 2);
    c.fillStyle = '#fff'; for (let k = 0; k < 3; k++) c.fillRect(w * (0.4 + k * 0.06), h * 0.04, 2, 3);
  }
  c.restore();
}

// ---------------- boss : création, IA, dessin
export function makeBoss(cfg, x, y, adult) {
  const dims = { armailli: [1.7, 2.7], grue: [1.9, 2.2], yeti: [2.1, 2.7], brochet: [2.6, 1.6] }[cfg.kind];
  return { name: cfg.name, kind: cfg.kind, hp: cfg.hp, maxHp: cfg.hp, x, y, x0: x, y0: y, w: dims[0], h: dims[1], vx: 0, vy: 0, alive: true, active: false, inv: 0, t: 0, timer: 1.5, jumpT: 3, dir: -1, mode: 'idle', modeT: 0, onGround: false, adult };
}
export function resetBoss(b) { b.x = b.x0; b.y = b.y0; b.vx = 0; b.vy = 0; b.mode = 'idle'; b.timer = 1.8; b.active = false; b.inv = 0; }

export function bossThink(B, b, dt) {
  const p = B.p, ground = ROWS - 2;
  b.t += dt; if (b.inv > 0) b.inv -= dt;
  if (!b.alive) { b.vy += 40 * dt; b.y += b.vy * dt; return; }
  const rage = 1 + (b.maxHp - b.hp) * 0.2, toP = Math.sign(p.x + p.w / 2 - (b.x + b.w / 2)) || 1;
  b.dir = toP;
  const shoot = (o) => B.projectiles.push({ w: 0.7, h: 0.7, ...o });
  const gravity = () => { b.vy = Math.min(20, b.vy + 40 * dt); b.y += b.vy * dt; b.onGround = false; if (b.y + b.h >= ground) { if (b.vy > 8) { B.shakeT = 0.25; if (b.kind === 'yeti') { shoot({ kind: 'snowwave', x: b.x - 0.6, y: ground - 0.6, h: 0.6, vx: -6.5, vy: 0, roll: true }); shoot({ kind: 'snowwave', x: b.x + b.w, y: ground - 0.6, h: 0.6, vx: 6.5, vy: 0, roll: true }); } } b.y = ground - b.h; b.vy = 0; b.onGround = true; } };
  const clampX = () => { b.x = Math.max(1.1, Math.min(B.L.width - 1.1 - b.w, b.x)); };
  b.timer -= dt * rage; b.jumpT -= dt * rage;
  if (b.kind === 'armailli' || b.kind === 'yeti') {
    if (b.onGround) b.vx = toP * (b.kind === 'yeti' ? 2.4 : 1.9) * rage; b.x += b.vx * dt; clampX(); gravity();
    if (b.timer <= 0) {
      b.timer = b.kind === 'yeti' ? 1.9 : 2.3; b.throwT = 0.35;
      if (b.kind === 'armailli') shoot({ kind: 'wheel', x: b.x + b.w / 2, y: ground - 0.8, w: 0.8, h: 0.8, vx: toP * 6.2 * Math.min(1.4, rage), vy: 0, roll: true });
      else shoot({ kind: 'snowball', x: b.x + b.w / 2, y: b.y + 0.3, vx: toP * 6.5, vy: -12, grav: 0.7, bounce: true });
    }
    if (b.jumpT <= 0 && b.onGround) { b.jumpT = rand(3, 4.5); b.vy = -15; }
  } else if (b.kind === 'grue') {
    b.modeT -= dt;
    if (b.mode !== 'dive') { b.y += ((4 + Math.sin(b.t * 2) * 0.8) - b.y) * Math.min(1, dt * 2); b.x += Math.cos(b.t * 0.7 * rage) * 4 * dt * rage; clampX();
      if (b.timer <= 0) { b.timer = 1.6; shoot({ kind: 'egg', x: b.x + b.w / 2 - 0.3, y: b.y + b.h, w: 0.55, h: 0.7, vx: 0, vy: 2, grav: 0.55 }); }
      if (b.jumpT <= 0) { b.mode = 'dive'; b.modeT = 1.8; b.jumpT = rand(4, 5.5); b.diveX = p.x; } }
    else { const ty = b.modeT > 0.9 ? ground - b.h : 4; b.y += (ty - b.y) * Math.min(1, dt * 4); b.x += (b.diveX - b.x) * Math.min(1, dt * 1.8); clampX(); if (b.modeT <= 0) b.mode = 'fly'; }
  } else if (b.kind === 'brochet') {
    gravity(); b.x += b.vx * dt; clampX();
    if (b.onGround) { b.vx *= 0.9; if (b.jumpT <= 0) { b.jumpT = rand(1.4, 2.2); b.vy = -19; b.vx = toP * 5.5 * Math.min(1.4, rage); } }
    if (!b.onGround && b.vy > -1 && b.vy < 1 && !b.spat) { b.spat = true; for (const d of [-1, 0, 1]) shoot({ kind: 'drop', x: b.x + b.w / 2, y: b.y + b.h / 2, w: 0.45, h: 0.45, vx: d * 3.5 + toP * 1.5, vy: -4, grav: 0.55 }); }
    if (b.onGround) b.spat = false;
  }
}

function drawBoss(B, c, b) {
  const T = B.T, x = B.sx(b.x), y = B.sy(b.y), w = b.w * T, h = b.h * T, t = B.g.t, A = b.adult;
  if (b.inv > 0 && Math.floor(b.inv * 14) % 2 === 0) return;
  c.save();
  if (b.dead) { c.translate(x + w / 2, y + h / 2); c.rotate(b.t * 6); c.translate(-(x + w / 2), -(y + h / 2)); }
  const flip = b.dir > 0; if (flip) { c.translate(x + w / 2, 0); c.scale(-1, 1); c.translate(-(x + w / 2), 0); }
  if (b.kind === 'armailli') {
    // armailli : bredzon bleu à manches bouffantes, capet de paille, barbe
    c.fillStyle = '#2b2b2b'; c.fillRect(x + w * 0.22, y + h * 0.82, w * 0.22, h * 0.18); c.fillRect(x + w * 0.56, y + h * 0.82, w * 0.22, h * 0.18);
    c.fillStyle = '#3a3a3a'; c.fillRect(x + w * 0.2, y + h * 0.62, w * 0.6, h * 0.22);
    c.fillStyle = A ? '#5a1a8a' : '#1f4fa0'; rr(c, x + w * 0.12, y + h * 0.32, w * 0.76, h * 0.34, w * 0.1); c.fill();
    c.fillStyle = A ? '#7a3aaa' : '#2f6fd0'; c.beginPath(); c.ellipse(x + w * 0.1, y + h * 0.4, w * 0.18, h * 0.1, 0, 0, 7); c.ellipse(x + w * 0.9, y + h * 0.4, w * 0.18, h * 0.1, 0, 0, 7); c.fill();
    c.fillStyle = '#fff'; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(x + w * (0.35 + k * 0.15), y + h * 0.45, w * 0.04, 0, 7); c.fill(); } // edelweiss
    const armUp = b.throwT > 0 ? -0.5 : 0; if (b.throwT > 0) b.throwT -= 1 / 60;
    c.fillStyle = '#f1c6a8'; c.beginPath(); c.arc(x + w * 0.02, y + h * (0.5 + armUp * 0.3), w * 0.09, 0, 7); c.fill();
    c.fillStyle = '#f1c6a8'; c.beginPath(); c.ellipse(x + w * 0.5, y + h * 0.2, w * 0.24, h * 0.12, 0, 0, 7); c.fill();
    c.fillStyle = '#8a5a2a'; c.beginPath(); c.ellipse(x + w * 0.5, y + h * 0.27, w * 0.22, h * 0.08, 0, 0, Math.PI); c.fill(); // barbe
    c.fillStyle = '#111'; c.fillRect(x + w * 0.38, y + h * 0.18, 4, 4); c.fillRect(x + w * 0.58, y + h * 0.18, 4, 4);
    c.strokeStyle = '#111'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + w * 0.33, y + h * 0.14); c.lineTo(x + w * 0.45, y + h * 0.17); c.moveTo(x + w * 0.67, y + h * 0.14); c.lineTo(x + w * 0.55, y + h * 0.17); c.stroke();
    c.fillStyle = A ? '#ff4fd8' : '#e8c35a'; c.beginPath(); c.ellipse(x + w * 0.5, y + h * 0.09, w * 0.38, h * 0.04, 0, 0, 7); c.fill(); c.fillRect(x + w * 0.32, y + h * 0.0, w * 0.36, h * 0.09);
    c.fillStyle = '#c8202c'; c.fillRect(x + w * 0.32, y + h * 0.06, w * 0.36, h * 0.02);
  } else if (b.kind === 'grue') {
    // la grue, emblème de Gruyères
    const flap = Math.sin(t * 9) * 0.5;
    c.strokeStyle = '#2b2b2b'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + w * 0.45, y + h * 0.62); c.lineTo(x + w * 0.42, y + h); c.moveTo(x + w * 0.58, y + h * 0.62); c.lineTo(x + w * 0.62, y + h); c.stroke();
    c.fillStyle = A ? '#e8dcff' : '#f4f4f0'; c.beginPath(); c.ellipse(x + w * 0.55, y + h * 0.5, w * 0.32, h * 0.18, -0.2, 0, 7); c.fill();
    c.fillStyle = A ? '#c9b8ff' : '#dcdcd6'; c.beginPath(); c.moveTo(x + w * 0.5, y + h * 0.45); c.lineTo(x + w * 1.0, y + h * (0.1 - flap * 0.6)); c.lineTo(x + w * 0.75, y + h * 0.55); c.fill();
    c.fillStyle = '#2b2b2b'; c.beginPath(); c.moveTo(x + w * 0.85, y + h * 0.5); c.lineTo(x + w * 1.05, y + h * 0.62); c.lineTo(x + w * 0.82, y + h * 0.6); c.fill();
    c.strokeStyle = A ? '#e8dcff' : '#f4f4f0'; c.lineWidth = w * 0.08; c.beginPath(); c.moveTo(x + w * 0.35, y + h * 0.45); c.quadraticCurveTo(x + w * 0.15, y + h * 0.3, x + w * 0.22, y + h * 0.1); c.stroke();
    c.fillStyle = '#2b2b2b'; c.beginPath(); c.arc(x + w * 0.22, y + h * 0.1, w * 0.09, 0, 7); c.fill();
    c.fillStyle = '#e3262f'; c.beginPath(); c.arc(x + w * 0.24, y + h * 0.05, w * 0.05, 0, 7); c.fill();
    c.fillStyle = '#e8a020'; c.beginPath(); c.moveTo(x + w * 0.15, y + h * 0.09); c.lineTo(x - w * 0.12, y + h * 0.14); c.lineTo(x + w * 0.15, y + h * 0.13); c.fill();
    c.fillStyle = '#fff'; c.fillRect(x + w * 0.19, y + h * 0.07, 4, 4); c.fillStyle = '#111'; c.fillRect(x + w * 0.19, y + h * 0.075, 2, 2);
  } else if (b.kind === 'yeti') {
    c.fillStyle = A ? '#e8dcff' : '#f4f8ff';
    c.beginPath(); c.ellipse(x + w / 2, y + h * 0.58, w * 0.48, h * 0.4, 0, 0, 7); c.fill();
    c.beginPath(); c.arc(x + w / 2, y + h * 0.2, w * 0.3, 0, 7); c.fill();
    for (let k = 0; k < 8; k++) { c.beginPath(); c.arc(x + w * (0.1 + k * 0.11), y + h * 0.95, w * 0.07, 0, 7); c.fill(); }
    c.fillStyle = A ? '#4fe3ff' : '#7fb0d8'; c.beginPath(); c.ellipse(x + w / 2, y + h * 0.24, w * 0.2, h * 0.11, 0, 0, 7); c.fill();
    c.fillStyle = '#111'; c.fillRect(x + w * 0.38, y + h * 0.2, 5, 5); c.fillRect(x + w * 0.56, y + h * 0.2, 5, 5);
    c.fillStyle = '#fff'; c.fillRect(x + w * 0.42, y + h * 0.3, 5, 6); c.fillRect(x + w * 0.53, y + h * 0.3, 5, 6);
    const arm = b.throwT > 0 ? -0.4 : 0; if (b.throwT > 0) b.throwT -= 1 / 60;
    c.fillStyle = A ? '#e8dcff' : '#f4f8ff'; c.beginPath(); c.ellipse(x + w * 0.02, y + h * (0.5 + arm), w * 0.14, h * 0.2, 0.3, 0, 7); c.fill();
  } else if (b.kind === 'brochet') {
    c.translate(x + w / 2, y + h / 2); c.rotate(b.onGround ? Math.sin(t * 14) * 0.08 : (b.vy < 0 ? 0.35 : -0.35)); c.translate(-(x + w / 2), -(y + h / 2));
    c.fillStyle = A ? '#4fe3ff' : '#4a7a3a'; c.beginPath(); c.ellipse(x + w * 0.5, y + h * 0.5, w * 0.48, h * 0.38, 0, 0, 7); c.fill();
    c.beginPath(); c.moveTo(x + w * 0.95, y + h * 0.5); c.lineTo(x + w * 1.2, y + h * 0.15); c.lineTo(x + w * 1.2, y + h * 0.85); c.fill();
    c.fillStyle = A ? '#9b3cff' : '#c9d88a'; for (let k = 0; k < 7; k++) { c.beginPath(); c.ellipse(x + w * (0.25 + k * 0.1), y + h * (0.35 + (k % 2) * 0.12), w * 0.03, h * 0.06, 0, 0, 7); c.fill(); }
    c.fillStyle = '#e8e8c8'; c.beginPath(); c.ellipse(x + w * 0.45, y + h * 0.68, w * 0.35, h * 0.12, 0, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x + w * 0.18, y + h * 0.36, w * 0.06, 0, 7); c.fill(); c.fillStyle = '#111'; c.beginPath(); c.arc(x + w * 0.17, y + h * 0.37, w * 0.03, 0, 7); c.fill();
    c.fillStyle = '#fff'; for (let k = 0; k < 5; k++) { c.beginPath(); c.moveTo(x + w * (0.02 + k * 0.05), y + h * 0.55); c.lineTo(x + w * (0.045 + k * 0.05), y + h * 0.66); c.lineTo(x + w * (0.07 + k * 0.05), y + h * 0.55); c.fill(); }
  }
  c.restore();
}
function drawProjectile(B, c, pr) {
  const T = B.T, x = B.sx(pr.x), y = B.sy(pr.y), w = pr.w * T, h = pr.h * T, A = B.adult;
  c.save(); c.translate(x + w / 2, y + h / 2);
  if (pr.kind === 'wheel') { c.rotate(pr.x * 2.5 * Math.sign(pr.vx)); c.fillStyle = A ? '#7a3a8a' : '#c99a3a'; c.beginPath(); c.arc(0, 0, w / 2, 0, 7); c.fill(); c.fillStyle = A ? '#ff9cf0' : '#f7d35c'; c.beginPath(); c.arc(0, 0, w * 0.4, 0, 7); c.fill(); c.fillStyle = '#e2b843'; c.beginPath(); c.arc(w * 0.15, -w * 0.1, w * 0.06, 0, 7); c.arc(-w * 0.12, w * 0.12, w * 0.05, 0, 7); c.fill(); }
  else if (pr.kind === 'snowball' || pr.kind === 'snowwave') { c.fillStyle = A ? '#e8dcff' : '#ffffff'; c.beginPath(); c.arc(0, 0, w / 2, 0, 7); c.fill(); c.fillStyle = 'rgba(150,180,220,0.5)'; c.beginPath(); c.arc(w * 0.1, w * 0.1, w * 0.3, 0, 7); c.fill(); }
  else if (pr.kind === 'egg') { c.fillStyle = '#fbf6e8'; c.beginPath(); c.ellipse(0, 0, w / 2, h / 2, 0, 0, 7); c.fill(); c.fillStyle = '#c99a5b'; c.fillRect(-2, -h * 0.2, 3, 3); }
  else if (pr.kind === 'drop') { c.fillStyle = A ? '#ff5fd2' : '#6fc6ff'; c.beginPath(); c.arc(0, w * 0.1, w / 2, 0, 7); c.fill(); c.beginPath(); c.moveTo(-w / 2, w * 0.05); c.lineTo(0, -w * 0.7); c.lineTo(w / 2, w * 0.05); c.fill(); }
  c.restore();
}

// ---------------- Ramo
function drawRamo(B, c) {
  const p = B.p, T = B.T, img = B.g.img.full, t = B.g.t;
  if (p.inv > 0 && !p.dead && Math.floor(p.inv * 14) % 2 === 0) return;
  let hgt = (p.big ? 1.62 : 1.1) * T;
  if (p.grow > 0) hgt = (Math.floor(p.grow * 12) % 2 ? 1.62 : 1.1) * T;
  const w = hgt * (528 / 620), cx = B.sx(p.x + p.w / 2), feet = B.sy(p.y + p.h);
  const moving = Math.abs(p.vx) > 0.5 && p.onGround;
  const bob = moving ? Math.abs(Math.sin(p.runT * 2.2)) * T * 0.08 : Math.sin(t * 3) * T * 0.015;
  let rot = (p.vx / 6.8) * 0.12, sx = 1, sy = 1;
  if (!p.onGround && !p.dead) { sy = p.vy < 0 ? 1.08 : 0.98; sx = p.vy < 0 ? 0.94 : 1.02; }
  if (p.glide) rot += 0.18 * p.face;
  if (B.state === 'goal' && B.endT > 0.9) rot = Math.sin(t * 12) * 0.18;
  // ombre
  if (!p.dead) { c.fillStyle = 'rgba(0,0,0,0.22)'; c.beginPath(); c.ellipse(cx, B.sy(ROWS - 2) - 1, w * 0.3, T * 0.08, 0, 0, 7); if (p.onGround) c.fill(); }
  // halo d'invincibilité
  if (p.star > 0) { const hue = (t * 360) % 360; c.fillStyle = `hsla(${hue},100%,60%,0.35)`; c.beginPath(); c.ellipse(cx, feet - hgt * 0.5, w * 0.7, hgt * 0.62, 0, 0, 7); c.fill(); }
  c.save();
  c.translate(cx, feet - bob); c.rotate(p.dead ? p.deadT * 6 : rot); c.scale(sx * (p.face < 0 ? -1 : 1), sy);
  // queue : planeur
  drawTail(c, -w * 0.18, -hgt * 0.15, hgt * (p.glide ? 0.9 : 0.6), p.glide ? -1.75 : -0.6 + Math.sin(t * 9) * 0.15);
  c.drawImage(img, -w / 2, -hgt, w, hgt);
  faceOverlay(c, RAMO_FULL, w / 528, -w / 2, -hgt, { surprise: p.dead || p.inv > 1.2, wink: B.state === 'goal' || (p.star > 0 && Math.sin(t * 4) > 0.6), blush: p.star > 0 ? 1 : 0 });
  c.restore();
  if (p.glide) { c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 2; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(cx - p.face * w * (0.5 + k * 0.15), feet - hgt * (0.3 + k * 0.15)); c.lineTo(cx - p.face * w * (0.9 + k * 0.15), feet - hgt * (0.3 + k * 0.15)); c.stroke(); } }
}

// ---------------- rendu complet d'un niveau
export function renderLevel(B, c) {
  const g = B.g, W = g.W, H = g.H, T = B.T, t = g.t, A = B.adult;
  c.save();
  if (B.shakeT > 0) c.translate(rand(-4, 4), rand(-4, 4));
  drawBackground(B, c, W, H);
  // eau du lac sous les trous (monde 4) / brume ailleurs
  const c0 = Math.max(0, Math.floor(B.camX) - 1), c1 = Math.min(B.L.width - 1, Math.ceil(B.camX + B.viewWt) + 1);
  if (B.theme === 'lac') {
    c.fillStyle = A ? '#2a1f6b' : '#3f9bd0'; c.fillRect(0, B.sy(ROWS - 1.4), W, T * 1.6);
    c.fillStyle = A ? 'rgba(255,120,240,0.4)' : 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 10; i++) c.fillRect(((i * 61 - B.camX * T + t * 25) % W + W) % W, B.sy(ROWS - 1.25) + Math.sin(t * 2 + i) * 2, 22, 2);
  }
  // tuiles
  const r0 = Math.max(0, Math.floor(B.camY)), r1 = Math.min(ROWS - 1, Math.ceil(B.camY + B.visRows));
  for (let cc = c0; cc <= c1; cc++) for (let r = r0; r <= r1; r++) {
    const ch = B.grid[r][cc]; if (ch === ' ') continue;
    const x = Math.round(B.sx(cc)), bump = B.bumps.get(cc + ',' + r), y = Math.round(B.sy(r) - (bump ? Math.sin((1 - bump.t / 0.18) * Math.PI) * T * 0.3 : 0));
    let img = null;
    if (ch === '#') img = B.tile(cc, r - 1) === '#' ? B.tiles.ground : B.tiles.groundTop;
    else if (ch === '=') img = B.tiles.brick;
    else if (ch === '?' || ch === 'p') img = B.tiles.q;
    else if (ch === 'U') img = B.tiles.used;
    else if (ch === 'X') img = B.tiles.stone;
    else if (ch === 'T') img = B.tile(cc, r - 1) === 'T' ? B.tiles.pillar : B.tiles.pillarTop;
    else if (ch === '-') img = B.tiles.plank;
    else if (ch === '^') img = B.tiles.spikes;
    if (img) { c.drawImage(img, x, y, Math.ceil(T) + 1, Math.ceil(T) + 1); if ((ch === '?' || ch === 'p') && Math.sin(t * 3 + cc) > 0.85) { c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(x + T * 0.15, y + T * 0.15, T * 0.15, T * 0.7); } continue; }
    if (ch === 'o') drawBeer(c, x + T / 2, y + T / 2 + Math.sin(t * 4 + cc) * T * 0.06, T * 0.7, false);
    else if (ch[0] === '*') drawStar(c, x + T / 2, y + T / 2, T * 0.42, t);
  }
  // ressorts, plateformes, checkpoint, drapeau
  for (const s of B.springs) drawSpring(B, c, s);
  for (const m of B.platforms) { const x = B.sx(m.x), y = B.sy(m.y); c.fillStyle = A ? '#ff2fc4' : '#8b5a2b'; rr(c, x, y, m.w * T, T * 0.42, T * 0.1); c.fill(); c.fillStyle = A ? '#ff9cf0' : '#c98a4a'; c.fillRect(x + 3, y + 2, m.w * T - 6, T * 0.1); c.fillStyle = A ? '#4fe3ff' : '#e8402f'; c.fillRect(x + m.w * T / 2 - 3, y + T * 0.15, 6, T * 0.15); }
  if (B.cp) drawCheckpoint(B, c, B.cp, t);
  if (B.flag) drawFlag(B, c, B.flag, t);
  for (const it of B.items) drawItem(B, c, it, t);
  for (const e of B.enemies) if (e.alive || e.squash > 0 || (e.fall && e.y < ROWS + 2)) drawEnemy(B, c, e);
  if (B.boss && (B.boss.alive || B.boss.y < ROWS + 3)) drawBoss(B, c, B.boss);
  for (const pr of B.projectiles) drawProjectile(B, c, pr);
  drawRamo(B, c);
  // la blonde félicite Ramo à l'arrivée (mode nuit)
  if (A && B.state === 'goal' && B.flag) drawBlonde(c, B.sx(B.flag.x + 2.4), B.sy(ROWS - 2), T * 2.2, t, { wink: Math.sin(t * 3) > 0, kiss: B.endT > 1 ? 1 : 0 });
  // barre de vie du boss
  if (B.boss && B.boss.active && B.boss.alive) {
    const bw = W * 0.6, bx = (W - bw) / 2, by = B.viewH * 0.17;
    c.fillStyle = 'rgba(0,0,0,0.55)'; rr(c, bx - 6, by - 22, bw + 12, 40, 10); c.fill();
    c.fillStyle = '#fff'; c.font = '900 13px Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(B.boss.name, W / 2, by - 10);
    c.fillStyle = '#444'; c.fillRect(bx, by, bw, 9); c.fillStyle = '#ff4b4b'; c.fillRect(bx, by, bw * B.boss.hp / B.boss.maxHp, 9);
  }
  // titre de départ
  if (B.intro > 0) {
    const k = Math.min(1, B.intro / 0.4);
    c.save(); c.globalAlpha = k; c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, B.viewH * 0.3, W, 90);
    c.fillStyle = A ? '#ff4fd8' : '#ffcf2e'; c.font = `${Math.min(W * 0.09, 40)}px "Luckiest Guy", Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(B.L.isBoss ? `BOSS · ${B.world.name}` : `MONDE ${B.id}`, W / 2, B.viewH * 0.3 + 32);
    c.fillStyle = '#fff'; c.font = '900 15px Nunito, sans-serif'; c.fillText(B.L.isBoss ? B.world.boss.name : `${B.world.name} — ${B.world.sub}`, W / 2, B.viewH * 0.3 + 66);
    c.restore();
  }
  // panneau des commandes
  const pg = c.createLinearGradient(0, B.viewH, 0, H); pg.addColorStop(0, A ? '#2a0c3d' : '#6b4226'); pg.addColorStop(1, A ? '#12001f' : '#4a2c18');
  c.fillStyle = pg; c.fillRect(0, B.viewH, W, H - B.viewH);
  c.fillStyle = A ? '#ff4fd8' : '#c98a4a'; c.fillRect(0, B.viewH, W, 3);
  c.restore();
}

function drawBeer(c, x, y, s, golden) {
  c.fillStyle = golden ? '#ffd700' : '#f5b82e'; rr(c, x - s * 0.24, y - s * 0.32, s * 0.48, s * 0.6, s * 0.08); c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = Math.max(1.5, s * 0.06); c.beginPath(); c.arc(x + s * 0.24, y - s * 0.02, s * 0.13, -1.3, 1.3); c.stroke();
  c.fillStyle = '#fffdf5'; c.beginPath(); c.arc(x - s * 0.12, y - s * 0.32, s * 0.14, 0, 7); c.arc(x + s * 0.06, y - s * 0.36, s * 0.15, 0, 7); c.arc(x + s * 0.2, y - s * 0.31, s * 0.1, 0, 7); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(x - s * 0.15, y - s * 0.2, s * 0.07, s * 0.38);
}
function drawStar(c, x, y, r, t) {
  c.save(); c.translate(x, y + Math.sin(t * 3) * r * 0.12); c.rotate(Math.sin(t * 2) * 0.15);
  c.fillStyle = 'rgba(255,230,80,0.35)'; c.beginPath(); c.arc(0, 0, r * 1.5, 0, 7); c.fill();
  c.fillStyle = '#ffd84a'; c.strokeStyle = '#b8860b'; c.lineWidth = 2; c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r; c.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); }
  c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#111'; c.fillRect(-r * 0.22, -r * 0.1, 3, 5); c.fillRect(r * 0.12, -r * 0.1, 3, 5);
  c.restore();
}
function drawSpring(B, c, s) {
  const T = B.T, x = B.sx(s.x), y = B.sy(s.y), k = s.t > 0 ? 0.55 : 1, A = B.adult;
  c.fillStyle = '#555'; for (let i = 0; i < 3; i++) c.fillRect(x + T * 0.3, y + T * (1 - (0.2 + i * 0.15) * k), T * 0.4, 3);
  c.fillStyle = A ? '#ff2fc4' : '#c0392b'; c.beginPath(); c.ellipse(x + T / 2, y + T * (1 - 0.62 * k), T * 0.42, T * 0.16, 0, 0, 7); c.fill();
  c.fillStyle = A ? '#ff9cf0' : '#ffe08a'; c.beginPath(); c.ellipse(x + T / 2, y + T * (1 - 0.66 * k), T * 0.34, T * 0.08, 0, 0, 7); c.fill();
}
function drawCheckpoint(B, c, cp, t) {
  const T = B.T, x = B.sx(cp.x + 0.5), y = B.sy(cp.y + 1);
  c.fillStyle = '#6b4226'; c.fillRect(x - 3, y - T * 1.6, 6, T * 1.6);
  const sw = cp.on ? Math.sin(t * 10) * 0.4 : 0;
  c.save(); c.translate(x, y - T * 1.55); c.rotate(sw);
  c.fillStyle = cp.on ? '#ffd84a' : '#b8b0a0'; c.beginPath(); c.moveTo(-T * 0.22, T * 0.1); c.lineTo(T * 0.22, T * 0.1); c.lineTo(T * 0.3, T * 0.55); c.lineTo(-T * 0.3, T * 0.55); c.fill();
  c.fillStyle = '#c8202c'; c.fillRect(-T * 0.3, T * 0.02, T * 0.6, T * 0.1);
  c.restore();
}
function drawFlag(B, c, f, t) {
  const T = B.T, x = B.sx(f.x + 0.5), base = B.sy(ROWS - 2), top = B.sy(2.5);
  // buvette d'arrivée
  const bx = x + T * 2.2, A = B.adult;
  c.fillStyle = A ? '#3a1a52' : '#8b5a33'; c.fillRect(bx, base - T * 3, T * 3.4, T * 3);
  c.fillStyle = A ? '#140620' : '#5a3320'; c.beginPath(); c.moveTo(bx - T * 0.4, base - T * 3); c.lineTo(bx + T * 1.7, base - T * 4.4); c.lineTo(bx + T * 3.8, base - T * 3); c.fill();
  c.fillStyle = A ? '#ff5fd2' : '#2a1a10'; rr(c, bx + T * 1.2, base - T * 1.7, T, T * 1.7, T * 0.4); c.fill();
  c.fillStyle = A ? '#16001f' : '#fff4d6'; rr(c, bx + T * 0.3, base - T * 2.8, T * 2.8, T * 0.6, T * 0.1); c.fill();
  c.fillStyle = A ? '#ff9cf0' : '#7a1f12'; c.font = `900 ${T * 0.36}px Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(A ? 'CLUB 69' : 'BUVETTE', bx + T * 1.7, base - T * 2.5);
  // mât + drapeau suisse qui descend
  c.fillStyle = '#ddd'; c.fillRect(x - 2, top, 5, base - top);
  c.fillStyle = '#ffd84a'; c.beginPath(); c.arc(x, top, 6, 0, 7); c.fill();
  const fy = top + 6 + (base - top - T * 1.2) * f.drop, wave = Math.sin(t * 6) * 3;
  c.fillStyle = '#d52b1e'; c.beginPath(); c.moveTo(x + 2, fy); c.lineTo(x + T * 1.1, fy + wave); c.lineTo(x + T * 1.1, fy + T * 0.8 + wave); c.lineTo(x + 2, fy + T * 0.8); c.fill();
  c.fillStyle = '#fff'; c.fillRect(x + T * 0.48, fy + T * 0.16, T * 0.16, T * 0.48); c.fillRect(x + T * 0.32, fy + T * 0.32, T * 0.48, T * 0.16);
}
function drawItem(B, c, it, t) {
  const T = B.T, x = B.sx(it.x), y = B.sy(it.y);
  if (it.kind === 'popbeer') { drawBeer(c, x + T * 0.3, y, T * 0.7, false); return; }
  if (it.kind === 'debris') { c.save(); c.translate(x, y); c.rotate(it.rot); c.fillStyle = it.col; c.fillRect(-T * 0.18, -T * 0.12, T * 0.36, T * 0.24); c.restore(); return; }
  if (it.kind === 'chope') { // grande chope : fait grandir Ramo
    const s = T * 1.05; drawBeer(c, x + T * 0.4, y + T * 0.45, s, false);
    c.fillStyle = '#c8202c'; c.font = `900 ${T * 0.28}px Nunito`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('XL', x + T * 0.38, y + T * 0.55);
  } else { // bière dorée : invincible
    c.fillStyle = `hsla(${(t * 400) % 360},100%,60%,0.4)`; c.beginPath(); c.arc(x + T * 0.4, y + T * 0.4, T * 0.6, 0, 7); c.fill();
    drawBeer(c, x + T * 0.4, y + T * 0.45, T * 0.95, true);
  }
}
