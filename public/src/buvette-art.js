// =====================================================================
//  RAMO BUVETTE — graphismes
//  Personnages en buste (dessinés au vecteur, mis en cache), chalet des 4F,
//  icônes des produits, stations de préparation.
// =====================================================================
import { roundRect as rr } from './draw.js';

// ---------------------------------------------------------------- couleurs
export function shade(hex, amt) { // amt -1..1 (négatif = plus sombre)
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (amt < 0) { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; } else { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
const R = (a, b) => a + Math.random() * (b - a);
const P = (a) => a[Math.floor(Math.random() * a.length)];

export const SKINS = ['#f7dccb', '#f1cbb0', '#e8b896', '#d9a07a', '#c08660', '#9c6542', '#74472c'];
const HAIR_F = ['#f2d27a', '#e8c15f', '#d9a441', '#b8743a', '#8a4b2a', '#5a341f', '#3a2418', '#1f1612', '#a83a22', '#c8572e'];
const HAIR_M = ['#3a2418', '#1f1612', '#5a341f', '#8a5a34', '#b8a17a', '#9a9a9a', '#d9b45a'];
const EYES = ['#4a7bb5', '#5b8f5a', '#7a5233', '#3d2a1c', '#6aa0c8', '#8a6a3a'];
const LIPS = ['#d0485e', '#c23a55', '#d86a78', '#b8424a', '#e07a86', '#a8324a'];
const CLOTH = ['#d93a3a', '#2f6fd1', '#2e9a5a', '#f2b632', '#8a3ad9', '#e8558a', '#1f2a44', '#f0f0f0', '#24a6b8', '#ff7a3a'];

let UID = 0;
// Génère un personnage aléatoire (fem = true : cliente)
export function makePerson(o = {}) {
  const fem = o.fem ?? Math.random() < 0.6;
  const p = {
    id: ++UID, fem,
    skin: o.skin || P(SKINS.slice(0, 6)),
    hairC: o.hairC || (fem ? P(HAIR_F) : P(HAIR_M)),
    hair: o.hair || (fem ? P(['long', 'wavy', 'pony', 'bun', 'bob', 'braids', 'long', 'wavy']) : P(['short', 'side', 'curly', 'buzz', 'bald', 'short'])),
    eye: o.eye || P(EYES), lip: o.lip || P(LIPS),
    outfit: o.outfit || (fem ? P(['dirndl', 'top', 'tee', 'blouse', 'jacket', 'dirndl', 'gym']) : P(['tee', 'check', 'bredzon', 'hoodie', 'gym', 'check'])),
    cloth: o.cloth || P(CLOTH), cloth2: o.cloth2 || P(CLOTH),
    beard: o.beard ?? (!fem && Math.random() < 0.4 ? P(['full', 'stubble', 'moustache']) : null),
    acc: o.acc || [],
    name: o.name || null, sash: o.sash || null,
  };
  if (!o.acc) {
    if (fem) { if (Math.random() < 0.35) p.acc.push('earrings'); if (Math.random() < 0.18) p.acc.push('flowers'); else if (Math.random() < 0.18) p.acc.push('sunglasses'); if (Math.random() < 0.25) p.acc.push('necklace'); }
    else { if (p.outfit === 'bredzon' && Math.random() < 0.6) p.acc.push('capet'); else if (Math.random() < 0.2) p.acc.push('cap'); if (Math.random() < 0.15) p.acc.push('glasses'); }
  }
  if (p.outfit === 'bredzon') p.cloth = '#1f2f5a';
  return p;
}

// ---------------------------------------------------------------- buste
// Repère : origine en bas au centre, u = taille/100. Tête centrée en (0, -62u).
function hairBack(c, p, u) {
  const g = c.createLinearGradient(0, -90 * u, 0, -10 * u);
  g.addColorStop(0, shade(p.hairC, 0.12)); g.addColorStop(1, shade(p.hairC, -0.35));
  c.fillStyle = g;
  const h = p.hair;
  c.beginPath();
  if (h === 'long' || h === 'wavy') {
    const wv = h === 'wavy' ? 2.5 : 0.6;
    c.moveTo(-17 * u, -70 * u);
    c.bezierCurveTo(-24 * u, -60 * u, -22 * u, -40 * u, (-25 - wv) * u, -24 * u);
    c.quadraticCurveTo(-20 * u, -18 * u + wv * u, -14 * u, -22 * u);
    c.lineTo(14 * u, -22 * u);
    c.quadraticCurveTo(20 * u, -18 * u + wv * u, (25 + wv) * u, -24 * u);
    c.bezierCurveTo(22 * u, -40 * u, 24 * u, -60 * u, 17 * u, -70 * u);
    c.closePath(); c.fill();
  } else if (h === 'bob') {
    c.moveTo(-17 * u, -72 * u); c.bezierCurveTo(-21 * u, -60 * u, -21 * u, -50 * u, -18 * u, -44 * u);
    c.lineTo(18 * u, -44 * u); c.bezierCurveTo(21 * u, -50 * u, 21 * u, -60 * u, 17 * u, -72 * u); c.fill();
  } else if (h === 'pony') {
    c.ellipse(0, -66 * u, 17.5 * u, 19 * u, 0, 0, 7); c.fill();
    c.beginPath(); c.moveTo(12 * u, -76 * u); c.bezierCurveTo(30 * u, -76 * u, 26 * u, -50 * u, 22 * u, -36 * u);
    c.bezierCurveTo(20 * u, -46 * u, 18 * u, -58 * u, 10 * u, -70 * u); c.fill();
  } else if (h === 'braids') {
    c.ellipse(0, -66 * u, 17.5 * u, 19 * u, 0, 0, 7); c.fill();
  } else if (h === 'bun') {
    c.ellipse(0, -66 * u, 17 * u, 18.5 * u, 0, 0, 7); c.fill();
    c.beginPath(); c.arc(0, -86 * u, 8 * u, 0, 7); c.fill();
  } else if (h === 'curly') {
    for (let i = 0; i < 9; i++) { const a = Math.PI * (1.05 + i * 0.11); c.moveTo(0, 0); c.arc(Math.cos(a) * 15 * u, -66 * u + Math.sin(a) * 16 * u, 6 * u, 0, 7); }
    c.fill();
  }
}
function torso(c, p, u, adult) {
  const sk = p.skin;
  // cou
  const ng = c.createLinearGradient(0, -48 * u, 0, -30 * u);
  ng.addColorStop(0, shade(sk, -0.28)); ng.addColorStop(0.45, shade(sk, -0.1)); ng.addColorStop(1, sk);
  c.fillStyle = ng; c.beginPath();
  c.moveTo(-6.5 * u, -50 * u); c.lineTo(-7 * u, -32 * u); c.quadraticCurveTo(0, -27 * u, 7 * u, -32 * u); c.lineTo(6.5 * u, -50 * u); c.fill();
  // épaules (peau) — visible pour les hauts à bretelles / encolures
  const sh = () => { c.beginPath(); c.moveTo(-38 * u, 0); c.bezierCurveTo(-38 * u, -18 * u, -30 * u, -28 * u, -15 * u, -31 * u); c.quadraticCurveTo(0, -35 * u, 15 * u, -31 * u); c.bezierCurveTo(30 * u, -28 * u, 38 * u, -18 * u, 38 * u, 0); c.closePath(); };
  const skG = c.createLinearGradient(-38 * u, 0, 38 * u, 0); skG.addColorStop(0, shade(sk, -0.18)); skG.addColorStop(0.5, shade(sk, 0.04)); skG.addColorStop(1, shade(sk, -0.18));
  const cl = p.cloth, cg = (col) => { const g = c.createLinearGradient(-38 * u, -30 * u, 38 * u, 0); g.addColorStop(0, shade(col, 0.12)); g.addColorStop(0.55, col); g.addColorStop(1, shade(col, -0.3)); return g; };
  const o = p.outfit;
  if (o === 'top' || o === 'dirndl' || o === 'blouse' || o === 'gown') { c.fillStyle = skG; sh(); c.fill(); }
  if (o === 'gown') {
    // robe de soirée à décolleté en cœur (mode After Dark)
    const sg = c.createRadialGradient(0, -12 * u, 0, 0, -12 * u, 9 * u); sg.addColorStop(0, 'rgba(120,60,40,0.28)'); sg.addColorStop(1, 'rgba(120,60,40,0)');
    c.fillStyle = sg; c.beginPath(); c.ellipse(0, -12 * u, 9 * u, 6 * u, 0, 0, 7); c.fill();
    c.fillStyle = cg(cl); c.beginPath();
    c.moveTo(-30 * u, 0); c.lineTo(-25 * u, -18 * u);
    c.bezierCurveTo(-18 * u, -23 * u, -6 * u, -20 * u, 0, -11 * u);
    c.bezierCurveTo(6 * u, -20 * u, 18 * u, -23 * u, 25 * u, -18 * u);
    c.lineTo(30 * u, 0); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 0.8 * u; c.beginPath(); c.moveTo(-25 * u, -18 * u); c.bezierCurveTo(-18 * u, -23 * u, -6 * u, -20 * u, 0, -11 * u); c.bezierCurveTo(6 * u, -20 * u, 18 * u, -23 * u, 25 * u, -18 * u); c.stroke();
    c.strokeStyle = shade(cl, -0.2); c.lineWidth = 1.3 * u; c.beginPath(); c.moveTo(-19 * u, -21.5 * u); c.lineTo(-15 * u, -31 * u); c.moveTo(19 * u, -21.5 * u); c.lineTo(15 * u, -31 * u); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(-22 * u + i * 5.5 * u, -6 * u + Math.sin(i * 2.1) * 3 * u, 0.5 * u, 0, 7); c.fill(); }
  }
  if (o === 'top') {
    c.fillStyle = cg(cl); c.beginPath();
    c.moveTo(-30 * u, 0); c.lineTo(-27 * u, -16 * u); c.quadraticCurveTo(-14 * u, -12 * u, 0, -14 * u); c.quadraticCurveTo(14 * u, -12 * u, 27 * u, -16 * u); c.lineTo(30 * u, 0); c.fill();
    c.strokeStyle = shade(cl, -0.2); c.lineWidth = 1.6 * u; c.beginPath(); c.moveTo(-21 * u, -14 * u); c.lineTo(-17 * u, -30 * u); c.moveTo(21 * u, -14 * u); c.lineTo(17 * u, -30 * u); c.stroke();
  } else if (o === 'dirndl') {
    // blouse blanche à manches bouffantes + corsage lacé
    c.fillStyle = '#fbf7f1';
    c.beginPath(); c.ellipse(-29 * u, -19 * u, 9 * u, 8 * u, -0.5, 0, 7); c.fill();
    c.beginPath(); c.ellipse(29 * u, -19 * u, 9 * u, 8 * u, 0.5, 0, 7); c.fill();
    c.beginPath(); c.moveTo(-24 * u, 0); c.lineTo(-22 * u, -20 * u); c.quadraticCurveTo(0, -25 * u, 22 * u, -20 * u); c.lineTo(24 * u, 0); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 0.8 * u; c.beginPath(); c.ellipse(-29 * u, -19 * u, 9 * u, 8 * u, -0.5, 0, 7); c.ellipse(29 * u, -19 * u, 9 * u, 8 * u, 0.5, 0, 7); c.stroke();
    const bc = cl === '#f0f0f0' ? '#c0392b' : cl; c.fillStyle = cg(bc); c.beginPath(); c.moveTo(-23 * u, 0); c.lineTo(-20 * u, -17 * u); c.quadraticCurveTo(0, -13 * u, 20 * u, -17 * u); c.lineTo(23 * u, 0); c.fill();
    c.fillStyle = shade(p.cloth2, -0.1); c.fillRect(-21 * u, -17.5 * u, 42 * u, 2 * u);
    c.strokeStyle = '#f7e7c0'; c.lineWidth = 0.7 * u; c.beginPath();
    for (let i = 0; i < 4; i++) { const y = -12 * u + i * 3 * u; c.moveTo(-3 * u, y); c.lineTo(3 * u, y + 3 * u); c.moveTo(3 * u, y); c.lineTo(-3 * u, y + 3 * u); } c.stroke();
  } else if (o === 'blouse') {
    c.fillStyle = cg(cl); c.beginPath(); c.moveTo(-38 * u, 0); c.bezierCurveTo(-38 * u, -16 * u, -32 * u, -25 * u, -22 * u, -27 * u);
    c.quadraticCurveTo(0, -20 * u, 22 * u, -27 * u); c.bezierCurveTo(32 * u, -25 * u, 38 * u, -16 * u, 38 * u, 0); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 0.8 * u; c.beginPath(); c.moveTo(-22 * u, -26 * u); c.quadraticCurveTo(0, -19 * u, 22 * u, -26 * u); c.stroke();
  } else if (o !== 'gown') {
    c.fillStyle = cg(cl); sh(); c.fill();
    if (o === 'tee' || o === 'gym') {
      c.fillStyle = shade(cl, -0.25); c.beginPath(); c.moveTo(-8 * u, -32 * u); c.quadraticCurveTo(0, -25 * u, 8 * u, -32 * u); c.quadraticCurveTo(0, -29 * u, -8 * u, -32 * u); c.fill();
      if (o === 'gym') { c.fillStyle = 'rgba(255,255,255,0.92)'; c.font = `900 ${7.5 * u}px Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('GYM', 0, -18 * u); c.font = `900 ${5 * u}px Nunito, sans-serif`; c.fillText('BULLE · 4F', 0, -10 * u); }
    } else if (o === 'check') {
      c.save(); sh(); c.clip(); c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 2.2 * u;
      for (let x = -40; x < 40; x += 7) { c.beginPath(); c.moveTo(x * u, -40 * u); c.lineTo(x * u, 0); c.stroke(); }
      for (let y = -36; y < 0; y += 7) { c.beginPath(); c.moveTo(-40 * u, y * u); c.lineTo(40 * u, y * u); c.stroke(); }
      c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 0.8 * u;
      for (let x = -37; x < 40; x += 7) { c.beginPath(); c.moveTo(x * u, -40 * u); c.lineTo(x * u, 0); c.stroke(); }
      c.restore();
      c.fillStyle = shade(cl, -0.15); c.beginPath(); c.moveTo(-10 * u, -33 * u); c.lineTo(0, -22 * u); c.lineTo(-3 * u, -33 * u); c.fill(); c.beginPath(); c.moveTo(10 * u, -33 * u); c.lineTo(0, -22 * u); c.lineTo(3 * u, -33 * u); c.fill();
    } else if (o === 'bredzon') {
      // veste d'armailli : manches bouffantes courtes, edelweiss brodés
      c.fillStyle = '#f4f0e6'; c.beginPath(); c.moveTo(-6 * u, -33 * u); c.lineTo(0, -16 * u); c.lineTo(6 * u, -33 * u); c.fill();
      c.fillStyle = shade(cl, 0.08); c.beginPath(); c.ellipse(-29 * u, -18 * u, 12 * u, 11 * u, -0.3, 0, 7); c.fill(); c.beginPath(); c.ellipse(29 * u, -18 * u, 12 * u, 11 * u, 0.3, 0, 7); c.fill();
      const edel = (x, y) => { c.fillStyle = '#fff'; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; c.beginPath(); c.ellipse(x + Math.cos(a) * 1.7 * u, y + Math.sin(a) * 1.7 * u, 1.5 * u, 0.7 * u, a, 0, 7); c.fill(); } c.fillStyle = '#f2c94c'; c.beginPath(); c.arc(x, y, 0.8 * u, 0, 7); c.fill(); };
      edel(-12 * u, -20 * u); edel(12 * u, -20 * u); edel(-14 * u, -11 * u); edel(14 * u, -11 * u);
    } else if (o === 'hoodie') {
      c.fillStyle = shade(cl, -0.15); c.beginPath(); c.ellipse(0, -32 * u, 16 * u, 5 * u, 0, 0, 7); c.fill();
      c.strokeStyle = '#eee'; c.lineWidth = 0.8 * u; c.beginPath(); c.moveTo(-4 * u, -29 * u); c.lineTo(-4.5 * u, -18 * u); c.moveTo(4 * u, -29 * u); c.lineTo(4.5 * u, -18 * u); c.stroke();
    } else if (o === 'jacket') {
      c.fillStyle = shade(p.cloth2, 0); c.beginPath(); c.moveTo(-9 * u, -32 * u); c.quadraticCurveTo(0, -24 * u, 9 * u, -32 * u); c.lineTo(8 * u, 0); c.lineTo(-8 * u, 0); c.fill();
      c.fillStyle = '#4a6fa5'; c.beginPath(); c.moveTo(-38 * u, 0); c.bezierCurveTo(-38 * u, -18 * u, -30 * u, -28 * u, -12 * u, -32 * u); c.lineTo(-8 * u, 0); c.fill();
      c.beginPath(); c.moveTo(38 * u, 0); c.bezierCurveTo(38 * u, -18 * u, 30 * u, -28 * u, 12 * u, -32 * u); c.lineTo(8 * u, 0); c.fill();
      c.strokeStyle = '#c99a4a'; c.setLineDash([1.4 * u, 1.2 * u]); c.lineWidth = 0.6 * u; c.beginPath(); c.moveTo(-11 * u, -30 * u); c.lineTo(-7.5 * u, 0); c.moveTo(11 * u, -30 * u); c.lineTo(7.5 * u, 0); c.stroke(); c.setLineDash([]);
    }
  }
  if (p.sash) { // écharpe de Miss
    c.save(); c.strokeStyle = '#f7f1ff'; c.lineWidth = 6 * u; c.beginPath(); c.moveTo(-24 * u, -27 * u); c.lineTo(26 * u, 0); c.stroke();
    c.strokeStyle = '#d4af37'; c.lineWidth = 0.8 * u; c.beginPath(); c.moveTo(-25 * u, -24.5 * u); c.lineTo(24 * u, 2.5 * u); c.moveTo(-23 * u, -29.5 * u); c.lineTo(28 * u, -2.5 * u); c.stroke();
    c.translate(2 * u, -12 * u); c.rotate(0.5); c.fillStyle = '#b8325a'; c.font = `900 ${3.8 * u}px Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(p.sash, 0, 0); c.restore();
  }
  if (p.acc.includes('necklace')) { c.strokeStyle = '#e8c45a'; c.lineWidth = 0.7 * u; c.beginPath(); c.moveTo(-7 * u, -36 * u); c.quadraticCurveTo(0, -27 * u, 7 * u, -36 * u); c.stroke(); c.fillStyle = '#f5d76e'; c.beginPath(); c.arc(0, -29.5 * u, 1.2 * u, 0, 7); c.fill(); }
}

function face(c, p, u, mood, blink) {
  const sk = p.skin, fem = p.fem;
  // oreilles
  c.fillStyle = shade(sk, -0.1);
  c.beginPath(); c.ellipse(-15.6 * u, -62 * u, 2.6 * u, 4.6 * u, 0.15, 0, 7); c.fill();
  c.beginPath(); c.ellipse(15.6 * u, -62 * u, 2.6 * u, 4.6 * u, -0.15, 0, 7); c.fill();
  if (p.acc.includes('earrings')) { c.strokeStyle = '#e8c45a'; c.lineWidth = 0.8 * u; c.beginPath(); c.arc(-15.8 * u, -55 * u, 2 * u, 0, 7); c.stroke(); c.beginPath(); c.arc(15.8 * u, -55 * u, 2 * u, 0, 7); c.stroke(); }
  // visage
  const jaw = fem ? 5.5 : 7.5, chin = fem ? -43.5 : -42;
  const fg = c.createRadialGradient(-4 * u, -68 * u, 2 * u, 0, -62 * u, 22 * u);
  fg.addColorStop(0, shade(sk, 0.12)); fg.addColorStop(0.65, sk); fg.addColorStop(1, shade(sk, -0.2));
  c.fillStyle = fg; c.beginPath();
  c.moveTo(0, -83 * u);
  c.bezierCurveTo(-10 * u, -83 * u, -16 * u, -76 * u, -16 * u, -64 * u);
  c.bezierCurveTo(-16 * u, -54 * u, -12 * u, -47.5 * u, -jaw * u, (chin - 0.5) * u);
  c.bezierCurveTo(-3 * u, chin * u, 3 * u, chin * u, jaw * u, (chin - 0.5) * u);
  c.bezierCurveTo(12 * u, -47.5 * u, 16 * u, -54 * u, 16 * u, -64 * u);
  c.bezierCurveTo(16 * u, -76 * u, 10 * u, -83 * u, 0, -83 * u);
  c.fill();
  // joues
  const blush = fem ? 0.3 : 0.12, angry = mood === 'angry';
  for (const s of [-1, 1]) {
    const bg = c.createRadialGradient(s * 9 * u, -55 * u, 0, s * 9 * u, -55 * u, 5 * u);
    bg.addColorStop(0, angry ? 'rgba(230,60,60,0.45)' : `rgba(240,110,120,${blush})`); bg.addColorStop(1, 'rgba(240,110,120,0)');
    c.fillStyle = bg; c.beginPath(); c.arc(s * 9 * u, -55 * u, 5 * u, 0, 7); c.fill();
  }
  // barbe
  if (p.beard === 'full' || p.beard === 'stubble') {
    c.fillStyle = p.beard === 'full' ? shade(p.hairC, -0.05) : `rgba(40,30,25,0.22)`;
    c.beginPath(); c.moveTo(-15.5 * u, -60 * u); c.bezierCurveTo(-15 * u, -50 * u, -10 * u, -42 * u, 0, (chin - (p.beard === 'full' ? 2.5 : 0)) * u);
    c.bezierCurveTo(10 * u, -42 * u, 15 * u, -50 * u, 15.5 * u, -60 * u); c.quadraticCurveTo(12 * u, -52 * u, 6 * u, -52 * u); c.quadraticCurveTo(0, -55 * u, -6 * u, -52 * u); c.quadraticCurveTo(-12 * u, -52 * u, -15.5 * u, -60 * u); c.fill();
  }
  // yeux
  const ey = -62.5 * u, ew = (fem ? 5.3 : 4.4) * u, eh = (fem ? 3.3 : 2.5) * u;
  const happy = mood === 'happy' || mood === 'love';
  for (const s of [-1, 1]) {
    const ex = s * 6.3 * u;
    if (fem) { // fard à paupières
      const sg = c.createRadialGradient(ex, ey - 1.5 * u, 0, ex, ey - 1.5 * u, 6 * u);
      sg.addColorStop(0, 'rgba(150,90,120,0.28)'); sg.addColorStop(1, 'rgba(150,90,120,0)'); c.fillStyle = sg; c.beginPath(); c.arc(ex, ey - 1.5 * u, 6 * u, 0, 7); c.fill();
    }
    if (blink || happy) {
      c.strokeStyle = '#2a1a14'; c.lineWidth = (fem ? 1.1 : 0.9) * u; c.lineCap = 'round'; c.beginPath();
      if (happy && !blink) { c.moveTo(ex - ew, ey + 0.4 * u); c.quadraticCurveTo(ex, ey - eh * 1.5, ex + ew, ey + 0.4 * u); } else { c.moveTo(ex - ew, ey); c.quadraticCurveTo(ex, ey + eh * 0.6, ex + ew, ey); }
      c.stroke();
      if (fem) { c.beginPath(); c.moveTo(ex + s * ew, ey); c.lineTo(ex + s * (ew + 1.4 * u), ey - 1.2 * u); c.stroke(); }
      continue;
    }
    c.save(); c.beginPath();
    c.moveTo(ex - ew, ey); c.quadraticCurveTo(ex, ey - eh * 1.35, ex + ew, ey); c.quadraticCurveTo(ex, ey + eh * 0.95, ex - ew, ey); c.closePath();
    c.fillStyle = '#fbf8f5'; c.fill(); c.clip();
    const ig = c.createRadialGradient(ex, ey, 0.2 * u, ex, ey, 2.8 * u); ig.addColorStop(0, shade(p.eye, 0.35)); ig.addColorStop(0.7, p.eye); ig.addColorStop(1, shade(p.eye, -0.5));
    c.fillStyle = ig; c.beginPath(); c.arc(ex, ey - 0.15 * u, (fem ? 2.75 : 2.3) * u, 0, 7); c.fill();
    c.fillStyle = '#120c0a'; c.beginPath(); c.arc(ex, ey - 0.15 * u, 1.2 * u, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.95)'; c.beginPath(); c.arc(ex + 0.9 * u, ey - 1.1 * u, 0.75 * u, 0, 7); c.fill(); c.beginPath(); c.arc(ex - 0.8 * u, ey + 0.8 * u, 0.35 * u, 0, 7); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(ex - ew, ey - eh * 1.4, ew * 2, eh * 0.6);
    c.restore();
    // trait de paupière + cils
    c.strokeStyle = '#1e1310'; c.lineCap = 'round'; c.lineWidth = (fem ? 1.25 : 0.8) * u;
    c.beginPath(); c.moveTo(ex - ew, ey); c.quadraticCurveTo(ex, ey - eh * 1.35, ex + ew, ey); c.stroke();
    if (fem) { c.lineWidth = 0.55 * u; c.beginPath(); for (let i = 0; i < 2; i++) { const t = 0.7 + i * 0.22, lx = ex + s * ew * t; const ly = ey - eh * 1.3 * (1 - t * t); c.moveTo(lx, ly); c.lineTo(lx + s * 1.1 * u, ly - 0.8 * u); } c.stroke(); }
    c.strokeStyle = 'rgba(60,30,20,0.25)'; c.lineWidth = 0.5 * u; c.beginPath(); c.moveTo(ex - ew * 0.8, ey + 0.5 * u); c.quadraticCurveTo(ex, ey + eh * 1.1, ex + ew, ey); c.stroke();
  }
  // sourcils
  c.strokeStyle = shade(p.hairC, -0.35); c.lineCap = 'round'; c.lineWidth = (fem ? 1.0 : 1.7) * u;
  for (const s of [-1, 1]) {
    c.beginPath();
    if (angry) { c.moveTo(s * 2.5 * u, -67 * u); c.lineTo(s * 9.5 * u, -70.5 * u); }
    else if (mood === 'wait') { c.moveTo(s * 2.5 * u, -68.5 * u); c.quadraticCurveTo(s * 6 * u, -70.8 * u, s * 10 * u, -69 * u); }
    else { c.moveTo(s * 2.5 * u, -69 * u); c.quadraticCurveTo(s * 6.5 * u, -72 * u, s * 10.2 * u, -69.5 * u); }
    c.stroke();
  }
  // nez
  const nsg = c.createLinearGradient(-3 * u, 0, 1 * u, 0); nsg.addColorStop(0, 'rgba(0,0,0,0)'); nsg.addColorStop(1, 'rgba(90,40,20,0.16)');
  c.fillStyle = nsg; c.beginPath(); c.moveTo(-1 * u, -65 * u); c.quadraticCurveTo(-2.8 * u, -59 * u, -2.6 * u, -56.5 * u); c.lineTo(-0.5 * u, -56.5 * u); c.quadraticCurveTo(-0.6 * u, -60 * u, 0, -65 * u); c.fill();
  c.strokeStyle = shade(sk, -0.32); c.lineWidth = 0.7 * u; c.beginPath();
  c.moveTo(-2.8 * u, -56.8 * u); c.quadraticCurveTo(0, -54.6 * u, 2.8 * u, -56.8 * u); c.stroke();
  c.fillStyle = shade(sk, -0.28); c.beginPath(); c.ellipse(-1.5 * u, -55.6 * u, 0.9 * u, 0.5 * u, 0, 0, 7); c.ellipse(1.5 * u, -55.6 * u, 0.9 * u, 0.5 * u, 0, 0, 7); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.ellipse(0.3 * u, -57.5 * u, 1.1 * u, 0.8 * u, 0, 0, 7); c.fill();
  // moustache
  if (p.beard === 'moustache' || p.beard === 'full') { c.fillStyle = shade(p.hairC, -0.1); c.beginPath(); c.moveTo(-6 * u, -51 * u); c.quadraticCurveTo(0, -55.5 * u, 6 * u, -51 * u); c.quadraticCurveTo(0, -53 * u, -6 * u, -51 * u); c.fill(); }
  // bouche
  const my = -50.5 * u;
  if (fem) {
    const lg = c.createLinearGradient(0, my - 2 * u, 0, my + 2.5 * u); lg.addColorStop(0, p.lip); lg.addColorStop(1, shade(p.lip, -0.25));
    if (mood === 'happy' || mood === 'love') {
      c.fillStyle = '#5a1e24'; c.beginPath(); c.moveTo(-4.6 * u, my - 0.4 * u); c.quadraticCurveTo(0, my + 4.4 * u, 4.6 * u, my - 0.4 * u); c.quadraticCurveTo(0, my + 0.6 * u, -4.6 * u, my - 0.4 * u); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-3.6 * u, my); c.quadraticCurveTo(0, my + 1.6 * u, 3.6 * u, my); c.quadraticCurveTo(0, my + 0.6 * u, -3.6 * u, my); c.fill();
      c.fillStyle = lg; c.beginPath(); c.moveTo(-4.8 * u, my - 0.5 * u); c.quadraticCurveTo(-2 * u, my - 2.2 * u, 0, my - 1.2 * u); c.quadraticCurveTo(2 * u, my - 2.2 * u, 4.8 * u, my - 0.5 * u); c.quadraticCurveTo(0, my - 0.2 * u, -4.8 * u, my - 0.5 * u); c.fill();
      c.beginPath(); c.moveTo(-4.4 * u, my + 0.6 * u); c.quadraticCurveTo(0, my + 5.2 * u, 4.4 * u, my + 0.6 * u); c.quadraticCurveTo(0, my + 3.6 * u, -4.4 * u, my + 0.6 * u); c.fill();
    } else {
      const down = angry ? 1.2 : 0;
      c.fillStyle = lg; c.beginPath(); // lèvre supérieure (arc de Cupidon)
      c.moveTo(-5.2 * u, my + down * u); c.quadraticCurveTo(-2.4 * u, my - 2.4 * u, 0, my - 1.1 * u); c.quadraticCurveTo(2.4 * u, my - 2.4 * u, 5.2 * u, my + down * u); c.quadraticCurveTo(0, my + 0.5 * u, -5.2 * u, my + down * u); c.fill();
      c.beginPath(); c.moveTo(-4.8 * u, my + (0.3 + down) * u); c.quadraticCurveTo(0, my + 4 * u, 4.8 * u, my + (0.3 + down) * u); c.quadraticCurveTo(0, my + 0.9 * u, -4.8 * u, my + (0.3 + down) * u); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.4)'; c.beginPath(); c.ellipse(1 * u, my + 1.8 * u, 1.4 * u, 0.45 * u, 0, 0, 7); c.fill();
    }
  } else {
    c.strokeStyle = '#7a3a30'; c.lineWidth = 1 * u; c.lineCap = 'round'; c.beginPath();
    if (angry) { c.moveTo(-4 * u, my + 1 * u); c.quadraticCurveTo(0, my - 1.4 * u, 4 * u, my + 1 * u); c.stroke(); }
    else if (mood === 'happy' || mood === 'love') { c.fillStyle = '#5a1e24'; c.moveTo(-5 * u, my - 0.5 * u); c.quadraticCurveTo(0, my + 4.5 * u, 5 * u, my - 0.5 * u); c.closePath(); c.fill(); c.fillStyle = '#fff'; c.fillRect(-3.5 * u, my - 0.2 * u, 7 * u, 1.2 * u); }
    else { c.moveTo(-4 * u, my); c.quadraticCurveTo(0, my + 1.2 * u, 4 * u, my); c.stroke(); }
  }
}
function hairFront(c, p, u) {
  const h = p.hair; if (h === 'bald') return;
  const g = c.createLinearGradient(-10 * u, -88 * u, 10 * u, -60 * u);
  g.addColorStop(0, shade(p.hairC, 0.22)); g.addColorStop(0.6, p.hairC); g.addColorStop(1, shade(p.hairC, -0.25));
  c.fillStyle = g; c.beginPath();
  if (h === 'buzz') { c.globalAlpha = 0.8; c.moveTo(-16 * u, -66 * u); c.bezierCurveTo(-16 * u, -86 * u, 16 * u, -86 * u, 16 * u, -66 * u); c.quadraticCurveTo(14 * u, -74 * u, 0, -76 * u); c.quadraticCurveTo(-14 * u, -74 * u, -16 * u, -66 * u); c.fill(); c.globalAlpha = 1; return; }
  if (h === 'short' || h === 'side' || h === 'curly') {
    c.moveTo(-16.5 * u, -62 * u); c.bezierCurveTo(-19 * u, -84 * u, -6 * u, -90 * u, 4 * u, -88 * u);
    c.bezierCurveTo(14 * u, -87 * u, 19 * u, -80 * u, 16.5 * u, -62 * u);
    if (h === 'side') { c.quadraticCurveTo(14 * u, -72 * u, 8 * u, -76 * u); c.quadraticCurveTo(-6 * u, -70 * u, -13 * u, -75 * u); }
    else { c.quadraticCurveTo(13 * u, -76 * u, 4 * u, -77 * u); c.quadraticCurveTo(-10 * u, -78 * u, -14.5 * u, -70 * u); }
    c.closePath(); c.fill();
    if (h === 'curly') { for (let i = 0; i < 8; i++) { c.beginPath(); c.arc(-12 * u + i * 3.4 * u, -80 * u + Math.sin(i * 1.7) * 3 * u, 3.6 * u, 0, 7); c.fill(); } }
  } else {
    // coiffures longues : frange + mèches qui encadrent le visage
    const side = h === 'bun' || h === 'pony' || h === 'braids' ? 0 : 1;
    c.moveTo(-16.5 * u, -60 * u);
    c.bezierCurveTo(-19 * u, -82 * u, -8 * u, -88 * u, 0, -87.5 * u);
    c.bezierCurveTo(8 * u, -88 * u, 19 * u, -82 * u, 16.5 * u, -60 * u);
    if (side) { c.bezierCurveTo(17 * u, -50 * u, 18 * u, -42 * u, 19 * u, -34 * u); c.quadraticCurveTo(14 * u, -46 * u, 13.5 * u, -60 * u); }
    c.bezierCurveTo(12 * u, -72 * u, 6 * u, -76 * u, -2 * u, -77 * u); // raie sur le côté
    c.bezierCurveTo(-8 * u, -74 * u, -12.5 * u, -70 * u, -13.5 * u, -60 * u);
    if (side) { c.quadraticCurveTo(-14 * u, -46 * u, -19 * u, -34 * u); c.bezierCurveTo(-18 * u, -42 * u, -17 * u, -50 * u, -16.5 * u, -60 * u); }
    c.closePath(); c.fill();
    if (h === 'braids') {
      for (const s of [-1, 1]) for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(s * (15 + i * 0.6) * u, (-56 + i * 5) * u, 3.2 * u, 3 * u, s * 0.4, 0, 7); c.fill(); c.strokeStyle = shade(p.hairC, -0.35); c.lineWidth = 0.5 * u; c.stroke(); }
      c.fillStyle = '#d93a3a'; c.fillRect(-17.5 * u, -27.5 * u, 4 * u, 2 * u); c.fillRect(15.5 * u, -27.5 * u, 4 * u, 2 * u);
    }
  }
  // reflets
  c.strokeStyle = 'rgba(255,255,255,0.13)'; c.lineWidth = 1.6 * u; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-9 * u, -84 * u); c.quadraticCurveTo(-14 * u, -78 * u, -14.5 * u, -68 * u); c.stroke();
  c.beginPath(); c.moveTo(6 * u, -86 * u); c.quadraticCurveTo(12 * u, -82 * u, 13.5 * u, -72 * u); c.stroke();
}
function accessories(c, p, u) {
  if (p.acc.includes('flowers')) { const cols = ['#ff6b8a', '#ffd84a', '#fff', '#b07cff', '#ff9f43']; for (let i = 0; i < 7; i++) { const a = Math.PI * (1.12 + i * 0.13); const x = Math.cos(a) * 16 * u, y = -70 * u + Math.sin(a) * 15 * u; c.fillStyle = cols[i % 5]; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(x + Math.cos(k * 1.26) * 1.6 * u, y + Math.sin(k * 1.26) * 1.6 * u, 1.3 * u, 0, 7); c.fill(); } c.fillStyle = '#f2c94c'; c.beginPath(); c.arc(x, y, 0.9 * u, 0, 7); c.fill(); } }
  if (p.acc.includes('sunglasses')) { c.fillStyle = '#1a1a22'; c.beginPath(); c.ellipse(-6 * u, -82 * u, 5 * u, 3 * u, 0.1, 0, 7); c.ellipse(6 * u, -82 * u, 5 * u, 3 * u, -0.1, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); c.ellipse(-7 * u, -83 * u, 1.6 * u, 0.8 * u, 0, 0, 7); c.fill(); }
  if (p.acc.includes('glasses')) { c.strokeStyle = '#2a2a2a'; c.lineWidth = 0.8 * u; c.beginPath(); c.arc(-6.3 * u, -63 * u, 4.2 * u, 0, 7); c.moveTo(10.5 * u, -63 * u); c.arc(6.3 * u, -63 * u, 4.2 * u, 0, 7); c.moveTo(-2.1 * u, -63.5 * u); c.lineTo(2.1 * u, -63.5 * u); c.stroke(); }
  if (p.acc.includes('cap')) { c.fillStyle = p.cloth2; c.beginPath(); c.moveTo(-17 * u, -70 * u); c.bezierCurveTo(-17 * u, -92 * u, 17 * u, -92 * u, 17 * u, -70 * u); c.closePath(); c.fill(); c.fillStyle = shade(p.cloth2, -0.25); c.beginPath(); c.ellipse(6 * u, -70 * u, 15 * u, 3 * u, 0, 0, 7); c.fill(); }
  if (p.acc.includes('capet')) { // bonnet d'armailli (capet) en paille avec ruban
    c.fillStyle = '#e8c97a'; c.beginPath(); c.ellipse(0, -76 * u, 23 * u, 5 * u, 0, 0, 7); c.fill();
    c.fillStyle = '#d9b45a'; c.beginPath(); c.moveTo(-13 * u, -77 * u); c.quadraticCurveTo(-12 * u, -93 * u, 0, -93 * u); c.quadraticCurveTo(12 * u, -93 * u, 13 * u, -77 * u); c.fill();
    c.fillStyle = '#1f2f5a'; c.fillRect(-13 * u, -81 * u, 26 * u, 3.5 * u);
  }
}

export function drawBust(c, p, S, mood = 'wait', blink = false, adult = false) {
  const u = S / 100;
  c.save(); c.lineJoin = 'round';
  hairBack(c, p, u);
  if (p.fem) { c.save(); c.scale(0.86, 1); torso(c, p, u, adult); c.restore(); } else torso(c, p, u, adult);
  face(c, p, u, mood, blink); hairFront(c, p, u); accessories(c, p, u);
  c.restore();
}
// Cache : chaque personnage et chaque humeur est dessiné une fois dans un petit canevas
const CACHE = new Map();
export function bustSprite(p, S, mood, blink, dpr) {
  const key = `${p.id}|${mood}|${blink ? 1 : 0}|${Math.round(S)}`;
  let cv = CACHE.get(key);
  if (!cv) {
    cv = document.createElement('canvas'); const w = S * 0.86, h = S * 1.02;
    cv.width = Math.ceil(w * dpr); cv.height = Math.ceil(h * dpr); cv.cw = w; cv.ch = h;
    const x = cv.getContext('2d'); x.scale(dpr, dpr); x.translate(w / 2, h); drawBust(x, p, S, mood, blink);
    CACHE.set(key, cv);
    if (CACHE.size > 260) CACHE.delete(CACHE.keys().next().value);
  }
  return cv;
}
export function clearCache() { CACHE.clear(); }

// ---------------------------------------------------------------- produits
export const ITEMS = {
  beer: { name: 'Bière', price: 5, emo: '🍺' },
  cuchaule: { name: 'Cuchaule', price: 4, emo: '🍞' },
  sausage: { name: 'Saucisse', price: 7, emo: '🌭' },
  meringue: { name: 'Meringue', price: 6, emo: '🍮' },
  fondue: { name: 'Fondue', price: 12, emo: '🫕' },
  kirsch: { name: 'Kirsch', price: 5, emo: '🥃' },
};
export function drawItem(c, kind, x, y, s, o = {}) {
  c.save(); c.translate(x, y); const u = s / 20;
  if (kind === 'beer') {
    const f = o.fill ?? 1; // niveau de remplissage 0..1.15
    c.fillStyle = 'rgba(255,255,255,0.28)'; c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 1.2 * u;
    c.beginPath(); c.moveTo(-6.5 * u, -9 * u); c.lineTo(-5.5 * u, 9 * u); c.lineTo(5.5 * u, 9 * u); c.lineTo(6.5 * u, -9 * u); c.closePath(); c.fill();
    if (f > 0) {
      const top = 9 * u - Math.min(1, f) * 18 * u;
      c.save(); c.beginPath(); c.moveTo(-6.5 * u, -9 * u); c.lineTo(-5.5 * u, 9 * u); c.lineTo(5.5 * u, 9 * u); c.lineTo(6.5 * u, -9 * u); c.closePath(); c.clip();
      const bg = c.createLinearGradient(0, top, 0, 9 * u); bg.addColorStop(0, '#ffcc33'); bg.addColorStop(1, '#e08a10'); c.fillStyle = bg; c.fillRect(-8 * u, top, 16 * u, 20 * u);
      const foam = Math.min(4.5 * u, f * 6 * u); c.fillStyle = '#fffaf0'; c.fillRect(-8 * u, top - 0.5 * u, 16 * u, foam);
      c.fillStyle = 'rgba(255,255,255,0.55)'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(-3 * u + i * 2 * u, 7 * u - ((o.t || 0) * 8 + i * 4) % 14 * u, 0.5 * u, 0, 7); c.fill(); }
      c.restore();
      if (f > 1) { c.fillStyle = '#fffaf0'; c.beginPath(); c.ellipse(0, -9 * u, 7.5 * u, 2.6 * u, 0, 0, 7); c.fill(); c.fillRect(5 * u, -9 * u, 2 * u, (f - 1) * 90 * u); }
      else if (f > 0.9) { c.fillStyle = '#fffaf0'; c.beginPath(); c.ellipse(0, -9 * u, 6.8 * u, 2.2 * u, 0, Math.PI, 0); c.fill(); }
    }
    c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.arc(8 * u, -1 * u, 4 * u, -1.2, 1.2); c.stroke();
    if (o.perfect) { c.fillStyle = '#ffd84a'; c.font = `900 ${8 * u}px Nunito, sans-serif`; c.textAlign = 'center'; c.fillText('★', 7 * u, -10 * u); }
  } else if (kind === 'cuchaule') {
    const g = c.createRadialGradient(-2 * u, -3 * u, 1 * u, 0, 0, 10 * u); g.addColorStop(0, '#ffd56b'); g.addColorStop(0.7, '#e8a032'); g.addColorStop(1, '#b8691c');
    c.fillStyle = g; c.beginPath(); c.ellipse(0, 1 * u, 9.5 * u, 7.5 * u, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(120,60,10,0.45)'; c.lineWidth = 1 * u; c.beginPath(); c.moveTo(-6 * u, -2 * u); c.lineTo(6 * u, 4 * u); c.moveTo(-6 * u, 4 * u); c.lineTo(6 * u, -2 * u); c.stroke();
    c.fillStyle = '#d9a51a'; rr(c, 4 * u, 2 * u, 7 * u, 8 * u, 1.5 * u); c.fill(); c.fillStyle = '#fff'; c.fillRect(4.5 * u, 4 * u, 6 * u, 2.5 * u); c.fillStyle = '#7a4a10'; c.fillRect(4 * u, 1 * u, 7 * u, 1.6 * u);
  } else if (kind === 'sausage') {
    c.fillStyle = '#f4f0e6'; c.beginPath(); c.ellipse(0, 4 * u, 10.5 * u, 4.5 * u, 0, 0, 7); c.fill(); c.strokeStyle = '#c9c3b6'; c.lineWidth = 0.6 * u; c.stroke();
    drawSausage(c, 0, 1 * u, 16 * u, o.cook ?? 1);
    c.strokeStyle = '#e8c21a'; c.lineWidth = 1.2 * u; c.beginPath(); c.moveTo(-6 * u, 0); for (let i = 0; i < 6; i++) c.lineTo(-6 * u + i * 2.4 * u, (i % 2 ? 1.6 : -0.4) * u); c.stroke();
  } else if (kind === 'meringue') {
    c.fillStyle = '#7a4a2a'; c.beginPath(); c.ellipse(0, 6 * u, 10 * u, 3 * u, 0, 0, 7); c.fill();
    c.fillStyle = '#d9c7a8'; c.beginPath(); c.ellipse(0, 4.5 * u, 9.5 * u, 3 * u, 0, 0, 7); c.fill();
    const g = c.createLinearGradient(0, -8 * u, 0, 4 * u); g.addColorStop(0, '#fffdf8'); g.addColorStop(1, '#f1e3c8');
    c.fillStyle = g; c.beginPath(); c.ellipse(-3 * u, 0, 6 * u, 4.5 * u, -0.3, 0, 7); c.fill(); c.beginPath(); c.ellipse(3.5 * u, 0.5 * u, 6 * u, 4.2 * u, 0.3, 0, 7); c.fill();
    c.fillStyle = '#fffef6'; c.beginPath(); c.arc(0, -3 * u, 4.5 * u, Math.PI, 0); c.quadraticCurveTo(2 * u, -9 * u, 0, -10 * u); c.quadraticCurveTo(-2 * u, -8 * u, -4.5 * u, -3 * u); c.fill();
    c.fillStyle = '#c0392b'; c.beginPath(); c.arc(1 * u, -9.5 * u, 1.6 * u, 0, 7); c.fill();
  } else if (kind === 'fondue') {
    c.fillStyle = '#5a3a24'; c.fillRect(-1 * u, 6 * u, 2 * u, 3 * u);
    c.fillStyle = '#b8241c'; c.beginPath(); c.moveTo(-9 * u, -1 * u); c.quadraticCurveTo(-9 * u, 8 * u, 0, 8 * u); c.quadraticCurveTo(9 * u, 8 * u, 9 * u, -1 * u); c.closePath(); c.fill();
    c.fillStyle = '#fff'; for (let i = -2; i <= 2; i++) { c.beginPath(); c.arc(i * 3.4 * u, 3 * u, 0.9 * u, 0, 7); c.fill(); }
    c.fillStyle = '#f5d76e'; c.beginPath(); c.ellipse(0, -1 * u, 9 * u, 2.8 * u, 0, 0, 7); c.fill();
    c.fillStyle = '#ffe9a0'; c.beginPath(); c.ellipse(-2 * u, -1.5 * u, 3 * u, 1 * u, 0, 0, 7); c.fill();
    c.strokeStyle = '#9aa0a8'; c.lineWidth = 0.9 * u; c.beginPath(); c.moveTo(3 * u, -1 * u); c.lineTo(9 * u, -11 * u); c.stroke();
    c.fillStyle = '#f0c070'; c.fillRect(1.6 * u, -3 * u, 3 * u, 3 * u);
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 0.8 * u; for (let i = 0; i < 2; i++) { const t = ((o.t || 0) * 0.8 + i * 0.5) % 1; c.globalAlpha = 1 - t; c.beginPath(); c.moveTo(-3 * u + i * 4 * u, -4 * u - t * 8 * u); c.quadraticCurveTo(-1 * u + i * 4 * u, -6 * u - t * 8 * u, -3 * u + i * 4 * u, -9 * u - t * 8 * u); c.stroke(); } c.globalAlpha = 1;
  } else if (kind === 'kirsch') {
    c.fillStyle = 'rgba(255,255,255,0.3)'; c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 1 * u;
    c.beginPath(); c.moveTo(-4 * u, -4 * u); c.lineTo(-3 * u, 8 * u); c.lineTo(3 * u, 8 * u); c.lineTo(4 * u, -4 * u); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,245,230,0.85)'; c.fillRect(-3.4 * u, 1 * u, 6.8 * u, 6.5 * u);
    c.fillStyle = '#c0182c'; c.beginPath(); c.arc(-4 * u, -7 * u, 2.2 * u, 0, 7); c.arc(1 * u, -8 * u, 2.2 * u, 0, 7); c.fill();
    c.strokeStyle = '#3a6a2a'; c.lineWidth = 0.7 * u; c.beginPath(); c.moveTo(-4 * u, -9 * u); c.quadraticCurveTo(-1 * u, -14 * u, 2 * u, -13 * u); c.lineTo(1 * u, -10 * u); c.stroke();
  }
  c.restore();
}
export function drawSausage(c, x, y, len, cook) { // cook 0 cru → 1 cuit → 2 brûlé
  const col = cook < 1 ? mix('#e8a0a0', '#c86a3a', cook) : mix('#c86a3a', '#2a1a12', Math.min(1, cook - 1));
  const g = c.createLinearGradient(0, y - len * 0.16, 0, y + len * 0.16); g.addColorStop(0, shadeRGB(col, 0.25)); g.addColorStop(1, shadeRGB(col, -0.3));
  c.fillStyle = g; c.beginPath(); c.ellipse(x, y, len / 2, len * 0.16, 0, 0, 7); c.fill();
  if (cook > 0.6) { c.strokeStyle = 'rgba(40,20,10,0.5)'; c.lineWidth = len * 0.04; c.beginPath(); for (let i = -2; i <= 2; i++) { c.moveTo(x + i * len * 0.14 - len * 0.03, y - len * 0.1); c.lineTo(x + i * len * 0.14 + len * 0.03, y + len * 0.1); } c.stroke(); }
}
function mix(a, b, t) { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); const m = (s) => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t); return `#${((1 << 24) + (m(16) << 16) + (m(8) << 8) + m(0)).toString(16).slice(1)}`; }
function shadeRGB(hex, amt) { return shade(hex, amt); }

// ---------------------------------------------------------------- décor : le chalet des 4F
export function drawScene(c, W, H, top, counterY, adult, t, layer = 'all') {
  const ST = layer !== 'dyn', DY = layer !== 'static';
  if (ST) {
  // ciel
  const sky = c.createLinearGradient(0, 0, 0, counterY);
  if (adult) { sky.addColorStop(0, '#120726'); sky.addColorStop(0.6, '#3a0f4e'); sky.addColorStop(1, '#6a1a5e'); }
  else { sky.addColorStop(0, '#5fb0ea'); sky.addColorStop(0.55, '#a9d8f5'); sky.addColorStop(1, '#ffe2b0'); }
  c.fillStyle = sky; c.fillRect(0, 0, W, counterY);
  }
  if (adult && DY) { c.fillStyle = '#fff'; for (let i = 0; i < 40; i++) { c.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t * 1.3 + i)); c.fillRect((i * 97) % W, (i * 53) % (counterY * 0.4), 1.6, 1.6); } c.globalAlpha = 1; }
  if (adult && ST) { c.fillStyle = '#fff4d8'; c.beginPath(); c.arc(W * 0.82, H * 0.07 + top * 0.5, 16, 0, 7); c.fill(); }
  if (ST) {
  // Moléson et préalpes au loin
  const hz = counterY - H * 0.2;
  c.fillStyle = adult ? '#2a1648' : '#8fb5d6';
  c.beginPath(); c.moveTo(0, hz); c.lineTo(W * 0.12, hz - H * 0.07); c.lineTo(W * 0.3, hz - H * 0.13); c.lineTo(W * 0.42, hz - H * 0.09); c.lineTo(W * 0.6, hz - H * 0.15); c.lineTo(W * 0.78, hz - H * 0.08); c.lineTo(W, hz - H * 0.11); c.lineTo(W, hz + 10); c.lineTo(0, hz + 10); c.fill();
  if (!adult) { c.fillStyle = '#f4f8fb'; c.beginPath(); c.moveTo(W * 0.6, hz - H * 0.15); c.lineTo(W * 0.56, hz - H * 0.125); c.lineTo(W * 0.59, hz - H * 0.13); c.lineTo(W * 0.62, hz - H * 0.12); c.lineTo(W * 0.645, hz - H * 0.13); c.closePath(); c.fill(); }
  c.fillStyle = adult ? '#1d1036' : '#6fa05a'; c.fillRect(0, hz, W, counterY - hz);
  // le chalet
  const cw = Math.min(W * 1.05, 520), cx = W / 2, base = counterY - H * 0.03, ch = H * 0.2, roofH = H * 0.11;
  const x0 = cx - cw / 2, x1 = cx + cw / 2, wallTop = base - ch;
  // soubassement en pierre
  c.fillStyle = adult ? '#3a3046' : '#d8d0c2'; c.fillRect(x0 + cw * 0.04, base - ch * 0.22, cw * 0.92, ch * 0.22);
  c.strokeStyle = adult ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.12)'; c.lineWidth = 1;
  for (let i = 0; i < 18; i++) { c.strokeRect(x0 + cw * 0.04 + (i % 9) * cw * 0.102 + (i > 8 ? cw * 0.05 : 0), base - ch * 0.22 + (i > 8 ? ch * 0.11 : 0), cw * 0.1, ch * 0.11); }
  // façade en bois (madriers)
  const wg = c.createLinearGradient(0, wallTop, 0, base); wg.addColorStop(0, adult ? '#4a2a22' : '#9a5a2e'); wg.addColorStop(1, adult ? '#3a1f1a' : '#7a4220');
  c.fillStyle = wg; c.fillRect(x0 + cw * 0.04, wallTop, cw * 0.92, ch * 0.78);
  c.strokeStyle = 'rgba(0,0,0,0.22)'; for (let y = wallTop + 7; y < base - ch * 0.22; y += 7) { c.beginPath(); c.moveTo(x0 + cw * 0.04, y); c.lineTo(x0 + cw * 0.96, y); c.stroke(); }
  // fenêtres avec volets et géraniums
  const win = (wx, wy, ww, wh) => {
    c.fillStyle = adult ? '#ffcf6b' : '#dff1ff'; c.fillRect(wx, wy, ww, wh);
    if (adult) { c.fillStyle = 'rgba(255,90,200,0.35)'; c.fillRect(wx, wy, ww, wh); }
    c.strokeStyle = '#f4efe6'; c.lineWidth = 2; c.strokeRect(wx, wy, ww, wh); c.beginPath(); c.moveTo(wx + ww / 2, wy); c.lineTo(wx + ww / 2, wy + wh); c.moveTo(wx, wy + wh / 2); c.lineTo(wx + ww, wy + wh / 2); c.stroke();
    for (const s of [-1, 1]) { const sx = s < 0 ? wx - ww * 0.42 : wx + ww; c.fillStyle = adult ? '#6a1a3a' : '#c0392b'; c.fillRect(sx, wy, ww * 0.42, wh); c.fillStyle = '#f4efe6'; for (let k = 0; k < 3; k++) c.fillRect(sx + 2, wy + 3 + k * wh / 3, ww * 0.42 - 4, 2); }
    c.fillStyle = '#5a3a1a'; c.fillRect(wx - 3, wy + wh, ww + 6, 6);
    for (let k = 0; k < 6; k++) { c.fillStyle = k % 2 ? '#2e8a3a' : (adult ? '#ff4fd8' : '#e8283a'); c.beginPath(); c.arc(wx + k * ww / 5, wy + wh - 1, 3.6, 0, 7); c.fill(); }
  };
  const wy = wallTop + ch * 0.12, ww = cw * 0.085, wh = ch * 0.3;
  for (const f of [0.16, 0.34, 0.66, 0.84]) win(x0 + cw * f - ww / 2, wy, ww, wh);
  // toit à deux pans, large avant-toit
  c.fillStyle = adult ? '#24142e' : '#5a3020';
  c.beginPath(); c.moveTo(x0 - cw * 0.02, wallTop + 4); c.lineTo(cx, wallTop - roofH); c.lineTo(x1 + cw * 0.02, wallTop + 4); c.lineTo(x1 - cw * 0.02, wallTop + 10); c.lineTo(cx, wallTop - roofH + 9); c.lineTo(x0 + cw * 0.02, wallTop + 10); c.closePath(); c.fill();
  c.fillStyle = adult ? '#3a2448' : '#8a4a28';
  c.beginPath(); c.moveTo(x0 + cw * 0.06, wallTop + 2); c.lineTo(cx, wallTop - roofH + 12); c.lineTo(x1 - cw * 0.06, wallTop + 2); c.closePath(); c.fill();
  // pignon : bardeaux
  c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 1;
  for (let y = wallTop - roofH + 22; y < wallTop; y += 6) { const k = (y - (wallTop - roofH + 12)) / (roofH - 10); c.beginPath(); c.moveTo(cx - (cw * 0.44) * k, y); c.lineTo(cx + (cw * 0.44) * k, y); c.stroke(); }
  // enseigne « CHALET DES 4F »
  const sw = Math.min(cw * 0.5, 230), sh = Math.max(20, roofH * 0.34), sy = wallTop - roofH * 0.42;
  c.fillStyle = adult ? '#140a1e' : '#f4ead2'; rr(c, cx - sw / 2, sy - sh / 2, sw, sh, 5); c.fill();
  c.strokeStyle = adult ? '#ff4fd8' : '#5a3020'; c.lineWidth = 2.5; c.stroke();
  c.font = `900 ${Math.round(sh * 0.62)}px "Luckiest Guy", Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  if (adult) { c.shadowColor = '#ff4fd8'; c.shadowBlur = 12 + 4 * Math.sin(t * 6); c.fillStyle = '#ffd1f4'; } else c.fillStyle = '#7a2a18';
  c.fillText('CHALET DES 4F', cx, sy + 1); c.shadowBlur = 0;
  c.font = `800 ${Math.round(sh * 0.36)}px Nunito, sans-serif`; c.fillStyle = adult ? '#9ff' : '#f4ead2';
  c.fillText(adult ? 'AFTER DARK · BULLE' : 'GYM BULLE', cx, sy + sh * 0.92);
  }
  if (!DY) return;
  // fanions (noir et blanc de Fribourg + rouge suisse) et lampions
  const flags = (y0, sag, n) => {
    c.strokeStyle = adult ? '#ff9cf0' : '#4a3a2a'; c.lineWidth = 1; c.beginPath();
    for (let i = 0; i <= 20; i++) { const x = (i / 20) * W, y = y0 + Math.sin((i / 20) * Math.PI) * sag; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
    for (let i = 0; i < n; i++) { const f = (i + 0.5) / n, x = f * W, y = y0 + Math.sin(f * Math.PI) * sag, sw2 = W / n * 0.38, wave = Math.sin(t * 3 + i) * 1.5;
      c.fillStyle = adult ? ['#ff4fd8', '#4fe3ff', '#ffd84a'][i % 3] : ['#111', '#fff', '#d52b1e'][i % 3];
      c.beginPath(); c.moveTo(x - sw2, y); c.lineTo(x + sw2, y); c.lineTo(x + wave, y + sw2 * 2.1); c.closePath(); c.fill(); }
  };
  flags(top - 2, H * 0.018, 11);
  // guirlande lumineuse
  const ly = counterY - H * 0.08;
  for (let i = 0; i < 14; i++) { const f = (i + 0.5) / 14, x = f * W, y = ly + Math.sin(f * Math.PI) * H * 0.025; const on = 0.6 + 0.4 * Math.sin(t * 4 + i * 1.7);
    c.fillStyle = adult ? `rgba(255,120,240,${on})` : `rgba(255,220,120,${on})`; c.beginPath(); c.arc(x, y, 3.2, 0, 7); c.fill();
    c.globalAlpha = 0.25 * on; c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill(); c.globalAlpha = 1; }
}
// Comptoir (devant les clients)
export function drawCounter(c, W, y, h, adult) {
  const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, adult ? '#5a2a4a' : '#c98a4a'); g.addColorStop(0.12, adult ? '#3a1a30' : '#a8682e'); g.addColorStop(1, adult ? '#22101e' : '#6a3a18');
  c.fillStyle = g; c.fillRect(0, y, W, h);
  c.fillStyle = adult ? '#ff4fd8' : '#e8b072'; c.fillRect(0, y, W, 4);
  c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 1; for (let x = 24; x < W; x += 48) { c.beginPath(); c.moveTo(x, y + 8); c.lineTo(x, y + h); c.stroke(); }
  // panneau
  const pw = Math.min(W * 0.62, 260), ph = h * 0.56, px = W / 2 - pw / 2, py = y + h * 0.26;
  c.fillStyle = adult ? '#150a1e' : '#f4ead2'; rr(c, px, py, pw, ph, 6); c.fill(); c.strokeStyle = adult ? '#4fe3ff' : '#7a2a18'; c.lineWidth = 2; c.stroke();
  c.fillStyle = adult ? '#4fe3ff' : '#7a2a18'; c.font = `900 ${Math.round(ph * 0.6)}px "Luckiest Guy", Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  if (adult) { c.shadowColor = '#4fe3ff'; c.shadowBlur = 10; }
  c.fillText('🍺 BUVETTE CHEZ RAMO', W / 2, py + ph * 0.56); c.shadowBlur = 0;
}
// Bulle de commande au-dessus d'un client
export function drawBubble(c, x, y, order, frac, t, adult, maxW = 999) {
  const n = order.length, s = Math.max(14, Math.min(22, (maxW - 12) / n - 4)), pad = 6, w = n * (s + 4) + pad * 2 - 4, h = s + pad * 2 + 8;
  const cw = c.canvas.width / (c.getTransform().a || 1), bx = Math.max(3, Math.min(cw - w - 3, x - w / 2)), by = y - h;
  c.fillStyle = 'rgba(255,255,255,0.96)'; rr(c, bx, by, w, h, 10); c.fill();
  c.beginPath(); c.moveTo(x - 6, by + h); c.lineTo(x, by + h + 7); c.lineTo(x + 6, by + h); c.fill();
  order.forEach((o, i) => {
    const ix = bx + pad + i * (s + 4) + s / 2, iy = by + pad + s / 2;
    c.globalAlpha = o.done ? 0.35 : 1; drawItem(c, o.kind, ix, iy, s * 0.95, { t }); c.globalAlpha = 1;
    if (o.done) { c.fillStyle = '#2eaa4a'; c.font = '900 16px Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('✓', ix, iy); }
  });
  // patience
  const bw = w - pad * 2, col = frac > 0.5 ? '#3cc45a' : frac > 0.25 ? '#f2b632' : '#e8283a';
  c.fillStyle = '#e4e0d8'; rr(c, bx + pad, by + h - 8, bw, 4, 2); c.fill();
  c.fillStyle = col; rr(c, bx + pad, by + h - 8, Math.max(2, bw * frac), 4, 2); c.fill();
  if (frac < 0.25 && Math.sin(t * 14) > 0) { c.strokeStyle = '#e8283a'; c.lineWidth = 2; rr(c, bx, by, w, h, 10); c.stroke(); }
}
