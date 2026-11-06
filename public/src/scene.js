// =====================================================================
//  Décors de Bulle (version 2, plus réaliste)
//  Références : château baillival de Bulle (1291) — carré savoyard ~44 x 41 m,
//  grand donjon rond de 33 m, trois tourelles en encorbellement aux autres angles,
//  fossé tout autour. Grand-Rue reconstruite après l'incendie de 1805 (façades
//  néoclassiques alignées), Hôtel de Ville de 1809 avec fronton aux armoiries et deux lions.
// =====================================================================
import { roundRect as rr, rand } from './draw.js';
import { drawChurchFar } from './grandrue.js';

// ---------- utilitaires couleur ----------
function hex(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function shade(h, f) {
  const [r, g, b] = hex(h);
  const k = (v) => Math.max(0, Math.min(255, Math.round(f >= 1 ? v + (255 - v) * (f - 1) : v * f)));
  return `rgb(${k(r)},${k(g)},${k(b)})`;
}

// ----------------------------- CIEL -----------------------------
export function drawSky(c, W, H, hor, adult, t) {
  const g = c.createLinearGradient(0, 0, 0, hor);
  if (adult) { g.addColorStop(0, '#0d0021'); g.addColorStop(0.55, '#33094f'); g.addColorStop(1, '#8a1a6b'); }
  else { g.addColorStop(0, '#2f7fd6'); g.addColorStop(0.55, '#7ec3f2'); g.addColorStop(1, '#fbe3b8'); }
  c.fillStyle = g; c.fillRect(0, 0, W, hor + 2);
  if (adult) {
    c.fillStyle = '#fff';
    for (let i = 0; i < 50; i++) {
      const x = (i * 97.3) % W, y = (i * 53.7) % (hor * 0.85);
      c.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 2 + i)); c.fillRect(x, y, i % 7 === 0 ? 3 : 2, i % 7 === 0 ? 3 : 2);
    }
    c.globalAlpha = 1;
    const mg = c.createRadialGradient(W * 0.82, hor * 0.25, 0, W * 0.82, hor * 0.25, W * 0.16);
    mg.addColorStop(0, 'rgba(255,190,240,0.45)'); mg.addColorStop(1, 'rgba(255,190,240,0)');
    c.fillStyle = mg; c.fillRect(W * 0.6, 0, W * 0.4, hor);
    c.fillStyle = '#ffeef9'; c.beginPath(); c.arc(W * 0.82, hor * 0.25, W * 0.05, 0, 7); c.fill();
    c.fillStyle = '#33094f'; c.beginPath(); c.arc(W * 0.845, hor * 0.23, W * 0.046, 0, 7); c.fill();
  } else {
    // halo du soleil
    const sg = c.createRadialGradient(W * 0.78, hor * 0.3, 0, W * 0.78, hor * 0.3, W * 0.35);
    sg.addColorStop(0, 'rgba(255,248,220,0.95)'); sg.addColorStop(0.12, 'rgba(255,240,200,0.6)'); sg.addColorStop(1, 'rgba(255,240,200,0)');
    c.fillStyle = sg; c.fillRect(0, 0, W, hor);
    // nuages doux
    for (let i = 0; i < 5; i++) {
      const x = ((i * 0.27 + t * 0.005) % 1.3 - 0.15) * W, y = hor * (0.14 + (i % 3) * 0.12), r = W * (0.05 + (i % 2) * 0.025);
      const cg = c.createLinearGradient(0, y - r, 0, y + r);
      cg.addColorStop(0, 'rgba(255,255,255,0.95)'); cg.addColorStop(1, 'rgba(220,232,245,0.85)');
      c.fillStyle = cg;
      c.beginPath(); c.arc(x, y, r, 0, 7); c.arc(x + r * 0.95, y + r * 0.25, r * 0.75, 0, 7); c.arc(x - r * 0.95, y + r * 0.3, r * 0.65, 0, 7);
      c.arc(x + r * 0.3, y - r * 0.35, r * 0.6, 0, 7); c.fill();
    }
  }
}

// ----------------------------- MONTAGNES : Préalpes + Moléson -----------------------------
function ridge(c, W, base, pts, h) { c.beginPath(); c.moveTo(0, base); for (let i = 0; i < pts.length; i += 2) c.lineTo(pts[i] * W, base - pts[i + 1] * h); c.lineTo(W, base); c.closePath(); }
export function drawMountains(c, W, H, hor, adult) {
  // Préalpes lointaines (brume)
  let g = c.createLinearGradient(0, hor * 0.4, 0, hor);
  g.addColorStop(0, adult ? '#3a1260' : '#a9bdd2'); g.addColorStop(1, adult ? '#2a0c47' : '#cbd8e5');
  c.fillStyle = g;
  ridge(c, W, hor, [0, .22, .08, .3, .16, .26, .26, .36, .62, .34, .7, .42, .78, .3, .86, .38, .94, .28, 1, .3], hor * 0.75);
  c.fill();
  // Moléson : grand pic pointu au bout de la Grand-Rue
  const px = W * 0.46, ph = hor * 0.66;
  g = c.createLinearGradient(px - W * 0.3, 0, px + W * 0.3, 0);
  g.addColorStop(0, adult ? '#1d0733' : '#56708a'); g.addColorStop(0.48, adult ? '#2f0f4f' : '#7d97b0'); g.addColorStop(0.52, adult ? '#1a062d' : '#4d6680'); g.addColorStop(1, adult ? '#16052a' : '#465d75');
  c.fillStyle = g;
  c.beginPath(); c.moveTo(px - W * 0.42, hor); c.lineTo(px - W * 0.2, hor - ph * 0.42); c.lineTo(px - W * 0.08, hor - ph * 0.78);
  c.lineTo(px - W * 0.02, hor - ph * 0.95); c.lineTo(px, hor - ph); c.lineTo(px + W * 0.03, hor - ph * 0.93); c.lineTo(px + W * 0.1, hor - ph * 0.7);
  c.lineTo(px + W * 0.22, hor - ph * 0.45); c.lineTo(px + W * 0.32, hor - ph * 0.3); c.lineTo(px + W * 0.48, hor); c.closePath(); c.fill();
  // rochers et neige sur le sommet
  if (!adult) {
    c.fillStyle = 'rgba(248,251,255,0.95)';
    c.beginPath(); c.moveTo(px - W * 0.05, hor - ph * 0.86); c.lineTo(px, hor - ph); c.lineTo(px + W * 0.03, hor - ph * 0.93); c.lineTo(px + W * 0.07, hor - ph * 0.78);
    c.lineTo(px + W * 0.03, hor - ph * 0.8); c.lineTo(px, hor - ph * 0.74); c.lineTo(px - W * 0.03, hor - ph * 0.8); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1.2;
    for (const k of [-0.12, -0.06, 0.06, 0.13]) { c.beginPath(); c.moveTo(px + W * k * 0.3, hor - ph * 0.85); c.lineTo(px + W * k, hor - ph * 0.5); c.stroke(); }
  }
  // pâturages et forêts de la Gruyère
  g = c.createLinearGradient(0, hor * 0.78, 0, hor);
  g.addColorStop(0, adult ? '#2a0b40' : '#5c9640'); g.addColorStop(1, adult ? '#1e0830' : '#86ba5c');
  c.fillStyle = g; c.beginPath(); c.moveTo(0, hor);
  for (let x = 0; x <= W + 1; x += W / 16) c.lineTo(x, hor - hor * (0.07 + 0.035 * Math.sin(x / W * 11) + 0.02 * Math.sin(x / W * 29)));
  c.lineTo(W, hor); c.fill();
  c.fillStyle = adult ? '#16062a' : '#2f5e2c';
  for (let i = 0; i < 22; i++) {
    const x = (i * 0.047 + 0.01) * W, base = hor - hor * (0.03 + 0.035 * Math.abs(Math.sin(i * 1.7))), h = hor * (0.05 + (i % 3) * 0.014);
    c.beginPath(); c.moveTo(x, base - h); c.lineTo(x - h * 0.3, base); c.lineTo(x + h * 0.3, base); c.fill();
  }
  drawChurchFar(c, W * 0.64, hor, hor * 0.4, adult);
  drawCastle(c, W * 0.3, hor, hor * 0.17, adult, 1);
}

// ----------------------------- CHÂTEAU DE BULLE -----------------------------
// x = centre, base = sol, h = hauteur du corps de logis, k = 1 (lointain)
export function drawCastle(c, x, base, h, adult, k = 1) {
  const stone = adult ? '#4b2b6b' : '#e3d7bf', stoneS = adult ? '#36204f' : '#c7b796', stoneL = adult ? '#5d3a80' : '#efe6d2';
  const roof = adult ? '#6d1b52' : '#9a4a33', roofS = adult ? '#4e1239' : '#7a3826';
  const win = adult ? '#ff5fd2' : '#3b3326';
  const w = h * 1.35;
  // fossé herbeux
  c.fillStyle = adult ? '#24093a' : '#6fa04a';
  c.beginPath(); c.ellipse(x, base, w * 0.75, h * 0.08, 0, Math.PI, 0); c.fill();
  // corps de logis (façade + côté en ombre)
  c.fillStyle = stone; c.fillRect(x - w / 2, base - h, w * 0.72, h);
  c.fillStyle = stoneS; c.fillRect(x - w / 2 + w * 0.72, base - h, w * 0.28, h);
  // toits en croupe
  c.fillStyle = roof; c.beginPath(); c.moveTo(x - w / 2 - h * 0.04, base - h); c.lineTo(x - w / 2 + h * 0.3, base - h * 1.38);
  c.lineTo(x - w / 2 + w * 0.72 - h * 0.25, base - h * 1.38); c.lineTo(x - w / 2 + w * 0.72 + h * 0.03, base - h); c.fill();
  c.fillStyle = roofS; c.beginPath(); c.moveTo(x - w / 2 + w * 0.72, base - h); c.lineTo(x - w / 2 + w * 0.72 - h * 0.25, base - h * 1.38);
  c.lineTo(x + w / 2 - h * 0.2, base - h * 1.3); c.lineTo(x + w / 2 + h * 0.03, base - h); c.fill();
  // fenêtres à meneaux
  c.fillStyle = win;
  for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) {
    const wx = x - w / 2 + w * (0.12 + i * 0.16), wy = base - h * (0.72 - r * 0.32);
    c.fillRect(wx, wy, w * 0.055, h * 0.15);
  }
  // porte principale + pont
  c.fillStyle = adult ? '#ff3ccf' : '#5a3a22';
  c.beginPath(); c.moveTo(x - w * 0.02, base); c.lineTo(x - w * 0.02, base - h * 0.28); c.arc(x + w * 0.04, base - h * 0.28, w * 0.06, Math.PI, 0); c.lineTo(x + w * 0.1, base); c.fill();
  // tourelles en encorbellement (3 angles)
  const turret = (tx, ty, s) => {
    c.fillStyle = stoneL; c.fillRect(tx - s / 2, ty - s * 1.1, s, s * 1.1);
    c.fillStyle = stoneS; c.beginPath(); c.moveTo(tx - s / 2, ty); c.lineTo(tx, ty + s * 0.45); c.lineTo(tx + s / 2, ty); c.fill();
    c.fillStyle = roof; c.beginPath(); c.moveTo(tx - s * 0.62, ty - s * 1.1); c.lineTo(tx, ty - s * 2.2); c.lineTo(tx + s * 0.62, ty - s * 1.1); c.fill();
    c.fillStyle = roofS; c.beginPath(); c.moveTo(tx, ty - s * 2.2); c.lineTo(tx + s * 0.62, ty - s * 1.1); c.lineTo(tx + s * 0.15, ty - s * 1.1); c.fill();
  };
  turret(x - w / 2 + w * 0.72, base - h * 0.95, h * 0.2);
  turret(x + w / 2, base - h * 0.9, h * 0.17);
  // grand donjon rond (33 m) à l'angle
  const tx = x - w / 2 - h * 0.05, tw = h * 0.62, th = h * 1.85;
  const tg = c.createLinearGradient(tx - tw / 2, 0, tx + tw / 2, 0);
  tg.addColorStop(0, stoneS); tg.addColorStop(0.35, stoneL); tg.addColorStop(0.7, stone); tg.addColorStop(1, stoneS);
  c.fillStyle = tg; c.fillRect(tx - tw / 2, base - th, tw, th);
  c.beginPath(); c.ellipse(tx, base, tw / 2, tw * 0.1, 0, 0, Math.PI); c.fill();
  // assises de pierre
  c.strokeStyle = adult ? 'rgba(0,0,0,0.15)' : 'rgba(120,100,70,0.18)'; c.lineWidth = Math.max(0.5, h * 0.008);
  for (let i = 1; i < 9; i++) { const yy = base - th * i / 9; c.beginPath(); c.moveTo(tx - tw / 2, yy); c.quadraticCurveTo(tx, yy + tw * 0.06, tx + tw / 2, yy); c.stroke(); }
  // archères + porte haute (accès d'origine à ~10 m)
  c.fillStyle = win;
  c.fillRect(tx - tw * 0.05, base - th * 0.36, tw * 0.1, th * 0.07);
  c.fillRect(tx - tw * 0.03, base - th * 0.62, tw * 0.06, th * 0.09);
  c.fillRect(tx + tw * 0.15, base - th * 0.85, tw * 0.05, th * 0.06);
  // toit conique
  c.fillStyle = roof; c.beginPath(); c.moveTo(tx - tw * 0.58, base - th); c.lineTo(tx, base - th - tw * 1.05); c.lineTo(tx + tw * 0.58, base - th); c.closePath(); c.fill();
  c.fillStyle = roofS; c.beginPath(); c.moveTo(tx, base - th - tw * 1.05); c.lineTo(tx + tw * 0.58, base - th); c.lineTo(tx + tw * 0.15, base - th); c.fill();
  c.fillStyle = adult ? '#ff9cf0' : '#e8d9a6'; c.fillRect(tx - tw * 0.6, base - th - tw * 0.02, tw * 1.2, tw * 0.05);
  // drapeau fribourgeois noir et blanc
  const fy = base - th - tw * 1.05, fw = tw * 0.42;
  c.strokeStyle = '#333'; c.lineWidth = Math.max(1, h * 0.012); c.beginPath(); c.moveTo(tx, fy); c.lineTo(tx, fy - fw * 0.9); c.stroke();
  c.fillStyle = '#111'; c.fillRect(tx, fy - fw * 0.9, fw, fw * 0.28);
  c.fillStyle = '#fafafa'; c.fillRect(tx, fy - fw * 0.62, fw, fw * 0.28);
  if (adult && k) { c.fillStyle = 'rgba(255,60,200,0.25)'; c.beginPath(); c.ellipse(tx, base - th * 0.5, tw, th * 0.6, 0, 0, 7); c.fill(); }
}

// Passage du château en bord de rue (vue de face, grand)
export function drawCastleSide(c, P, b, adult) {
  const z = b.z + 4;
  if (z < -1.5 || z > 90) return;
  const s = P.s(z), x = P.x(b.side * 3.4, z), base = P.y(z);
  drawCastle(c, x, base, P.unit * 2.6 * s, adult, 0);
  if (z < 60 && z > 2) {
    const bw = P.unit * 2.4 * s, bh = P.unit * 0.42 * s, bx = P.x(b.side * 1.15, z), by = base - P.unit * 2.9 * s;
    c.strokeStyle = adult ? '#999' : '#3b2a1c'; c.lineWidth = Math.max(1, 2 * s);
    c.beginPath(); c.moveTo(bx, by - bh / 2); c.lineTo(bx, base); c.stroke();
    c.fillStyle = adult ? '#16001f' : '#fff3d6'; rr(c, bx - bw / 2, by - bh / 2, bw, bh, bh * 0.2); c.fill();
    c.strokeStyle = adult ? '#ff3ccf' : '#8b3a2a'; c.lineWidth = Math.max(1, 3 * s); c.stroke();
    c.fillStyle = adult ? '#ffd6f6' : '#8b3a2a';
    const fs = bh * 0.45; if (fs > 7) { c.font = `900 ${fs}px Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(adult ? 'CHÂTEAU DE BULLE · After Dark' : 'CHÂTEAU DE BULLE · 1291', bx, by, bw * 0.92); }
  }
}

// ----------------------------- RUE PAVÉE -----------------------------
export function drawRoad(c, P, W, H, adult, travel) {
  const hor = P.hor, edge = 1.62, near = -3;
  // trottoirs
  let g = c.createLinearGradient(0, hor, 0, H);
  g.addColorStop(0, adult ? '#22102f' : '#cdbfa8'); g.addColorStop(1, adult ? '#170824' : '#b9a88d');
  c.fillStyle = g; c.fillRect(0, hor, W, H - hor);
  // chaussée
  g = c.createLinearGradient(0, hor, 0, H);
  g.addColorStop(0, adult ? '#2f1a48' : '#9b8f84'); g.addColorStop(1, adult ? '#26123a' : '#857a70');
  c.fillStyle = g;
  c.beginPath(); c.moveTo(P.x(-edge, 120), hor); c.lineTo(P.x(edge, 120), hor); c.lineTo(P.x(edge, near), P.y(near)); c.lineTo(P.x(-edge, near), P.y(near)); c.fill();
  // pavés : rangées en quinconce qui défilent
  const step = 1.1, off = travel % (step * 2);
  c.strokeStyle = adult ? 'rgba(255,90,220,0.10)' : 'rgba(60,45,30,0.16)';
  for (let z = near - off; z < 45; z += step) {
    const s = P.s(z); if (s < 0.17) break;
    const y = P.y(z); c.lineWidth = Math.max(0.6, 2.2 * s);
    c.beginPath(); c.moveTo(P.x(-edge, z), y); c.lineTo(P.x(edge, z), y); c.stroke();
    const row = Math.round((z + off) / step) % 2;
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const l = -edge + (2 * edge) * ((i + (row ? 0.5 : 0)) / n);
      if (l > edge) continue;
      c.beginPath(); c.moveTo(P.x(l, z), y); c.lineTo(P.x(l, z + step), P.y(z + step)); c.stroke();
    }
  }
  // caniveaux + bordures de trottoir
  for (const sd of [-1, 1]) {
    c.fillStyle = adult ? '#ff3ccf' : '#e9e0d0';
    c.beginPath(); c.moveTo(P.x(sd * edge, 120), hor); c.lineTo(P.x(sd * (edge + 0.08), 120), hor);
    c.lineTo(P.x(sd * (edge + 0.08), near), P.y(near)); c.lineTo(P.x(sd * edge, near), P.y(near)); c.fill();
    c.fillStyle = adult ? 'rgba(0,0,0,0.3)' : 'rgba(70,55,40,0.25)';
    c.beginPath(); c.moveTo(P.x(sd * (edge - 0.1), 120), hor); c.lineTo(P.x(sd * edge, 120), hor);
    c.lineTo(P.x(sd * edge, near), P.y(near)); c.lineTo(P.x(sd * (edge - 0.1), near), P.y(near)); c.fill();
  }
  // voies : lignes discrètes
  c.strokeStyle = adult ? 'rgba(160,240,255,0.5)' : 'rgba(255,255,255,0.45)';
  for (const sd of [-0.5, 0.5]) {
    for (let z = near - (travel % 6); z < 90; z += 6) {
      const z0 = Math.max(z, near), z1 = z + 2.6; c.lineWidth = Math.max(1, 5 * P.s(z0));
      c.beginPath(); c.moveTo(P.x(sd, z0), P.y(z0)); c.lineTo(P.x(sd, z1), P.y(z1)); c.stroke();
    }
  }
  // lumière / ombre portée des façades
  if (!adult) {
    c.fillStyle = 'rgba(40,30,60,0.12)';
    c.beginPath(); c.moveTo(P.x(1.75, 120), hor); c.lineTo(P.x(0.9, 120), hor); c.lineTo(P.x(0.9, near), P.y(near)); c.lineTo(P.x(1.75, near), P.y(near)); c.fill();
  }
}

// ----------------------------- FAÇADES DE LA GRAND-RUE -----------------------------
export function drawBuilding(c, P, b, adult, t) {
  const side = b.side, x0 = side * 1.75, z0 = b.z, z1 = b.z + b.len;
  if (z1 < -3) return;
  const za = Math.max(z0, -2.5);
  const Hh = b.h * P.unit;
  const pt = (z, v, dx = 0) => [P.x(x0 - side * dx, z), P.y(z) - Hh * P.s(z) * v];
  const quad = (zA, zB, v0, v1, fill, dx0 = 0, dx1 = 0) => {
    const a = pt(zA, v0, dx0), bq = pt(zB, v0, dx0), cq = pt(zB, v1, dx1), d = pt(zA, v1, dx1);
    c.fillStyle = fill; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(bq[0], bq[1]); c.lineTo(cq[0], cq[1]); c.lineTo(d[0], d[1]); c.fill();
  };
  const lightF = side < 0 ? 1.06 : 0.8; // la rangée de gauche est au soleil
  const wall = adult ? b.colN : b.col;
  // mur
  const A = pt(za, 0), B = pt(z1, 0), C2 = pt(z1, 1), D2 = pt(za, 1);
  const wg = c.createLinearGradient(0, D2[1], 0, A[1]);
  wg.addColorStop(0, shade(wall, lightF * 1.02)); wg.addColorStop(1, shade(wall, lightF * 0.88));
  c.fillStyle = wg; c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.lineTo(C2[0], C2[1]); c.lineTo(D2[0], D2[1]); c.fill();
  // mur mitoyen (épaisseur visible au bout proche)
  if (z0 > -2.5) {
    const e1 = pt(z0, 0), e2 = pt(z0, 1), e3 = pt(z0, 1, -0.6), e4 = pt(z0, 0, -0.6);
    c.fillStyle = shade(wall, 0.62); c.beginPath(); c.moveTo(e1[0], e1[1]); c.lineTo(e2[0], e2[1]); c.lineTo(e3[0], e3[1]); c.lineTo(e4[0], e4[1]); c.fill();
  }
  // corniche + toit de tuiles avec avant-toit
  quad(za, z1, 0.97, 1.02, adult ? '#5a2a7a' : '#f4ecdd', 0, 0.06);
  quad(za, z1, 1.02, 1.2, adult ? '#14061f' : shade(b.roof, lightF), 0.06, -0.35);
  // cheminée
  const zc = z0 + b.len * 0.7;
  if (zc > -2) { const s = P.s(zc), [cx, cy] = pt(zc, 1.16, -0.2); c.fillStyle = adult ? '#1d0a2c' : '#8c6a55'; c.fillRect(cx - P.unit * 0.08 * s, cy - P.unit * 0.35 * s, P.unit * 0.16 * s, P.unit * 0.35 * s); }
  // bandeau entre rez et étages
  quad(za, z1, 0.25, 0.28, adult ? '#3a1852' : shade(wall, 0.82));
  // fenêtres avec encadrement et volets
  const cols = 3, floors = b.floors;
  for (let i = 0; i < cols; i++) {
    const f0 = z0 + b.len * (0.14 + i * 0.29), f1 = f0 + b.len * 0.13;
    if (f1 < -2.5) continue;
    const fa = Math.max(f0, -2.5);
    for (let r = 0; r < floors; r++) {
      const v0 = 0.34 + r * (0.6 / floors), v1 = v0 + (0.6 / floors) * 0.6;
      quad(fa, f1, v0 - 0.015, v1 + 0.02, adult ? '#2a1238' : '#f6f1e6');
      const lit = adult ? ((i + r + b.seed) % 3 === 0 ? '#ff5fd2' : (i + r) % 2 ? '#ffcf5f' : '#3b1a52') : null;
      if (lit) quad(fa, f1, v0, v1, lit);
      else {
        const p0 = pt(fa, v1), p1 = pt(fa, v0);
        const gg = c.createLinearGradient(0, p0[1], 0, p1[1]); gg.addColorStop(0, '#5b7c99'); gg.addColorStop(1, '#2c4257');
        quad(fa, f1, v0, v1, gg);
        quad(fa, f1, v0 + (v1 - v0) * 0.48, v0 + (v1 - v0) * 0.52, '#f6f1e6'); // traverse
      }
      if (!adult) { // volets ouverts de chaque côté
        const sw = (f1 - f0) * 0.42;
        quad(Math.max(f0 - sw, -2.5), fa, v0, v1, shade(b.shutter, lightF));
        if (f1 + sw > -2.5) quad(f1, f1 + sw, v0, v1, shade(b.shutter, lightF * 0.9));
      }
    }
  }
  // rez-de-chaussée : vitrine + store rayé
  const sA = Math.max(z0 + b.len * 0.12, -2.5), sB = z0 + b.len * 0.88;
  if (sB > -2.5) {
    quad(sA, sB, 0.03, 0.22, adult ? 'rgba(255,60,200,0.55)' : '#3d4a52');
    if (!adult) quad(sA, sB, 0.05, 0.2, 'rgba(255,236,180,0.35)');
    // store
    const stripes = 7, cols2 = adult ? ['#ff2fc4', '#2a0c3d'] : [b.awning || '#c0392b', '#f7f1e3'];
    for (let k = 0; k < stripes; k++) {
      const q0 = sA + (sB - sA) * (k / stripes), q1 = sA + (sB - sA) * ((k + 1) / stripes);
      if (q1 < -2.5) continue;
      quad(Math.max(q0, -2.5), q1, 0.235, 0.24, cols2[k % 2], 0, 0);
      const a = pt(Math.max(q0, -2.5), 0.245), bb = pt(q1, 0.245), cc = pt(q1, 0.19, 0.42), dd = pt(Math.max(q0, -2.5), 0.19, 0.42);
      c.fillStyle = shade(cols2[k % 2], lightF); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(bb[0], bb[1]); c.lineTo(cc[0], cc[1]); c.lineTo(dd[0], dd[1]); c.fill();
    }
  }
  // enseigne suspendue, face à la caméra
  const zs = z0 + b.len * 0.25;
  if (zs > 2 && zs < 70) {
    const s = P.s(zs), sx = P.x(side * 1.5, zs), sy = P.y(zs) - Hh * s * 0.42;
    const w = P.unit * 1.25 * s, h = P.unit * 0.36 * s;
    c.strokeStyle = adult ? '#999' : '#2b2018'; c.lineWidth = Math.max(1, 3 * s);
    c.beginPath(); c.moveTo(sx + side * w * 0.5, sy - h * 0.8); c.lineTo(sx - side * w * 0.3, sy - h * 0.8); c.stroke();
    c.beginPath(); c.moveTo(sx - w * 0.3, sy - h * 0.8); c.lineTo(sx - w * 0.3, sy - h / 2); c.moveTo(sx + w * 0.3, sy - h * 0.8); c.lineTo(sx + w * 0.3, sy - h / 2); c.stroke();
    const bx2 = sx - w / 2, by2 = sy - h / 2;
    if (adult) {
      const pulse = 0.65 + 0.35 * Math.sin(t * 6 + b.seed);
      c.fillStyle = '#16001f'; rr(c, bx2, by2, w, h, h * 0.25); c.fill();
      c.strokeStyle = `rgba(255,${80 + b.seed % 3 * 60},230,${pulse})`; c.lineWidth = Math.max(1.5, 4 * s); c.stroke();
      c.fillStyle = `rgba(255,220,250,${pulse})`;
    } else {
      const sg = c.createLinearGradient(0, by2, 0, by2 + h); sg.addColorStop(0, shade(b.signCol, 1.15)); sg.addColorStop(1, shade(b.signCol, 0.85));
      c.fillStyle = sg; rr(c, bx2, by2, w, h, h * 0.2); c.fill();
      c.strokeStyle = '#d9b45a'; c.lineWidth = Math.max(1, 2 * s); c.stroke();
      c.fillStyle = '#fff8e8';
    }
    const fs = Math.max(6, h * 0.42);
    if (fs > 7) { c.font = `800 ${fs}px Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(b.sign, sx, sy, w * 0.92); }
  }
}

// ----------------------------- HÔTEL DE VILLE (1809) -----------------------------
export function drawTownHall(c, P, b, adult) {
  // on réutilise la façade, plus large, avec fronton aux armoiries et deux lions
  const zm = b.z + b.len * 0.5;
  if (zm < 1 || zm > 80) return;
  const s = P.s(zm), x = P.x(b.side * 1.62, zm), top = P.y(zm) - 5.6 * P.unit * s * 1.0;
  const w = P.unit * 1.5 * s, h = P.unit * 0.55 * s;
  c.fillStyle = adult ? '#4a2068' : '#f4ead6';
  c.beginPath(); c.moveTo(x - w / 2, top); c.lineTo(x, top - h); c.lineTo(x + w / 2, top); c.fill();
  c.strokeStyle = adult ? '#ff3ccf' : '#b9a27a'; c.lineWidth = Math.max(1, 2 * s); c.stroke();
  // écu (rouge et blanc) + deux lions stylisés
  const ex = x, ey = top - h * 0.42, es = h * 0.32;
  c.fillStyle = '#c8102e'; c.beginPath(); c.moveTo(ex - es * 0.5, ey - es * 0.5); c.lineTo(ex + es * 0.5, ey - es * 0.5); c.lineTo(ex + es * 0.5, ey + es * 0.1); c.quadraticCurveTo(ex, ey + es * 0.75, ex - es * 0.5, ey + es * 0.1); c.fill();
  c.fillStyle = '#fff'; c.fillRect(ex - es * 0.08, ey - es * 0.4, es * 0.16, es * 0.7);
  c.fillStyle = '#c9a23a';
  for (const d of [-1, 1]) { c.beginPath(); c.ellipse(ex + d * es * 1.0, ey + es * 0.1, es * 0.38, es * 0.28, 0, 0, 7); c.fill(); c.beginPath(); c.arc(ex + d * es * 0.8, ey - es * 0.2, es * 0.2, 0, 7); c.fill(); }
}

// ----------------------------- KIOSQUE À MUSIQUE -----------------------------
export function drawKiosk(c, P, d, adult) {
  if (d.z < -1.5 || d.z > 80) return;
  const s = P.s(d.z), x = P.x(d.side * 2.3, d.z), y = P.y(d.z), u = P.unit * s;
  c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.ellipse(x, y, u * 0.95, u * 0.18, 0, 0, 7); c.fill();
  c.fillStyle = adult ? '#3a1a52' : '#d8cdb8'; c.fillRect(x - u * 0.9, y - u * 0.35, u * 1.8, u * 0.35);
  c.fillStyle = adult ? '#ff9cf0' : '#2f5d3a';
  for (let i = 0; i < 5; i++) c.fillRect(x - u * 0.85 + i * u * 0.42, y - u * 1.65, u * 0.06, u * 1.3);
  c.fillStyle = adult ? '#ff2fc4' : '#2f5d3a';
  c.beginPath(); c.moveTo(x - u * 1.05, y - u * 1.6); c.lineTo(x, y - u * 2.25); c.lineTo(x + u * 1.05, y - u * 1.6); c.fill();
  c.fillStyle = adult ? '#ffd6f6' : '#c9a23a'; c.beginPath(); c.arc(x, y - u * 2.3, u * 0.07, 0, 7); c.fill();
}
