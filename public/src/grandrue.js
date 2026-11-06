// =====================================================================
//  Grand-Rue de Bulle — version 3, d'après des photos de référence :
//  grands toits bruns à lucarnes, façades crème / jaune pâle / rose saumon,
//  volets bleu-vert, verts ou gris, géraniums rouges, alignement de petits
//  arbres taillés en boule, bannière de Bulle (taureau rouge), fanions
//  colorés tendus au-dessus de la rue, fontaine fleurie, terrasses,
//  clocher à bulbe vert et Moléson au bout de la rue.
// =====================================================================
import { roundRect as rr } from './draw.js';
import { shade } from './scene.js';

// ----------------------------- FAÇADE -----------------------------
export function drawFacade(c, P, b, adult, t) {
  const side = b.side, x0 = side * 1.78, z0 = b.z, z1 = b.z + b.len;
  if (z1 < -3 || z0 > 110) return;
  const za = Math.max(z0, -2.5);
  const Hh = b.h * P.unit;
  const far = z0 > 55; // moins de détails au loin
  const pt = (z, v, dx = 0) => [P.x(x0 - side * dx, z), P.y(z) - Hh * P.s(z) * v];
  const poly = (pts, fill) => { c.fillStyle = fill; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); c.fill(); };
  const quad = (zA, zB, v0, v1, fill, dx0 = 0, dx1 = dx0) => poly([pt(zA, v0, dx0), pt(zB, v0, dx0), pt(zB, v1, dx1), pt(zA, v1, dx1)], fill);
  const sun = side < 0 ? 1.05 : 0.84; // côté gauche au soleil
  const wall = adult ? b.colN : b.col;

  // --- mur, avec léger dégradé et assombrissement au pied (occlusion)
  const A = pt(za, 0), B = pt(z1, 0), C = pt(z1, 1), D = pt(za, 1);
  const g = c.createLinearGradient(0, D[1], 0, A[1]);
  g.addColorStop(0, shade(wall, sun * 1.04)); g.addColorStop(0.85, shade(wall, sun * 0.95)); g.addColorStop(1, shade(wall, sun * 0.78));
  poly([A, B, C, D], g);
  // chaînage d'angle (pierre claire) côté proche
  if (z0 > -2.5 && !adult) quad(z0, z0 + b.len * 0.05, 0, 1, shade('#efe8da', sun));
  // pignon visible / mur mitoyen
  if (z0 > -2.5) poly([pt(z0, 0), pt(z0, 1), pt(z0, 1, -0.7), pt(z0, 0, -0.7)], shade(wall, 0.6));

  // --- grand toit brun en croupe + avant-toit
  const roofCol = adult ? '#1a0828' : b.roof;
  quad(za, z1, 0.98, 1.03, adult ? '#4a1d66' : shade('#f4ecdd', sun), 0, 0.08); // corniche
  const r0 = pt(za, 1.03, 0.08), r1 = pt(z1, 1.03, 0.08), r2 = pt(z1, 1.5, -1.1), r3 = pt(za, 1.5, -1.1);
  const rg = c.createLinearGradient(0, r3[1], 0, r0[1]);
  rg.addColorStop(0, shade(roofCol, sun * 0.8)); rg.addColorStop(1, shade(roofCol, sun * 1.1));
  poly([r0, r1, r2, r3], rg);
  if (!far && !adult) { // rangs de tuiles
    c.strokeStyle = 'rgba(50,25,15,0.18)'; c.lineWidth = Math.max(0.5, 1.2 * P.s(za));
    for (let k = 1; k < 5; k++) {
      const v = 1.03 + (0.47 * k) / 5, dx = 0.08 - (1.18 * k) / 5;
      const p0 = pt(za, v, dx), p1 = pt(z1, v, dx);
      c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.stroke();
    }
  }
  // lucarnes
  if (!far) {
    for (let i = 0; i < b.dormers; i++) {
      const d0 = z0 + b.len * (0.2 + i * (0.6 / Math.max(1, b.dormers - 1 || 1))), d1 = d0 + b.len * 0.1;
      if (d0 < -2.3) continue;
      const dx = -0.42;
      quad(d0, d1, 1.16, 1.32, adult ? '#2a1238' : shade('#efe6d4', sun), dx);
      quad(d0 + (d1 - d0) * 0.2, d1 - (d1 - d0) * 0.2, 1.18, 1.29, adult ? '#ff5fd2' : '#43586b', dx);
      const m = pt((d0 + d1) / 2, 1.4, dx - 0.05);
      poly([pt(d0 - 0.15, 1.32, dx), pt(d1 + 0.15, 1.32, dx), m], shade(roofCol, sun * 0.9));
    }
    // cheminée
    const zc = z0 + b.len * 0.72;
    if (zc > -2) { const s = P.s(zc), [cx, cy] = pt(zc, 1.42, -0.8); c.fillStyle = adult ? '#1d0a2c' : '#9a7a64'; c.fillRect(cx - P.unit * 0.07 * s, cy - P.unit * 0.3 * s, P.unit * 0.14 * s, P.unit * 0.3 * s); }
  }

  // --- bandeau du rez-de-chaussée
  quad(za, z1, 0.24, 0.27, adult ? '#3a1852' : shade(wall, sun * 0.82));

  // --- fenêtres hautes avec volets, encadrements et géraniums
  const cols = b.cols, floors = b.floors;
  for (let i = 0; i < cols; i++) {
    const f0 = z0 + b.len * ((i + 0.3) / cols), f1 = f0 + b.len * (0.38 / cols);
    if (f1 < -2.5) continue;
    const fa = Math.max(f0, -2.5);
    for (let r = 0; r < floors; r++) {
      const v0 = 0.33 + r * (0.62 / floors), v1 = v0 + (0.62 / floors) * 0.62;
      quad(fa, f1, v0 - 0.018, v1 + 0.022, adult ? '#2a1238' : shade('#f7f2e8', sun)); // encadrement
      if (adult) quad(fa, f1, v0, v1, (i + r + b.seed) % 3 === 0 ? '#ff5fd2' : (i + r) % 2 ? '#ffcf5f' : '#3b1a52');
      else {
        const p0 = pt(fa, v1), p1 = pt(fa, v0);
        const gg = c.createLinearGradient(0, p0[1], 0, p1[1]); gg.addColorStop(0, '#8fb3cc'); gg.addColorStop(0.45, '#3f5d75'); gg.addColorStop(1, '#2a3e50');
        quad(fa, f1, v0, v1, gg);
        if (!far) quad(fa, f1, v0 + (v1 - v0) * 0.46, v0 + (v1 - v0) * 0.52, '#f7f2e8');
        // volets ouverts
        const sw = (f1 - f0) * 0.48;
        quad(Math.max(f0 - sw, -2.5), fa, v0 - 0.01, v1 + 0.01, shade(b.shutter, sun));
        if (f1 + sw > -2.5) quad(f1, f1 + sw, v0 - 0.01, v1 + 0.01, shade(b.shutter, sun * 0.9));
        if (!far) { // lattes des volets
          const mid = pt((Math.max(f0 - sw, -2.5) + fa) / 2, v0), mt = pt((Math.max(f0 - sw, -2.5) + fa) / 2, v1);
          c.strokeStyle = 'rgba(0,0,0,0.15)'; c.lineWidth = Math.max(0.5, P.s(fa)); c.beginPath(); c.moveTo(mid[0], mid[1]); c.lineTo(mt[0], mt[1]); c.stroke();
        }
      }
      // jardinière de géraniums (1er étage)
      if (b.flowers && r === 0 && !far) {
        quad(Math.max(f0 - 0.05, -2.5), f1 + 0.05, v0 - 0.06, v0 - 0.02, adult ? '#ff2fc4' : '#7a4a2a', 0, 0.06);
        const n = 5;
        for (let k = 0; k < n; k++) {
          const zf = f0 + (f1 - f0) * (k / (n - 1)); if (zf < -2.4) continue;
          const [fx, fy] = pt(zf, v0 - 0.045, 0.07), s = P.s(zf);
          c.fillStyle = adult ? '#ff9cf0' : (k % 2 ? '#e0262c' : '#ff4b4b'); c.beginPath(); c.arc(fx, fy, Math.max(1, P.unit * 0.055 * s), 0, 7); c.fill();
          c.fillStyle = adult ? '#6d1bff' : '#3f7a2c'; c.beginPath(); c.arc(fx + P.unit * 0.03 * s, fy + P.unit * 0.03 * s, Math.max(0.8, P.unit * 0.035 * s), 0, 7); c.fill();
        }
      }
    }
  }
  // balcon en fer forgé (quelques maisons)
  if (b.balcony && !far) {
    const bz0 = z0 + b.len * 0.35, bz1 = z0 + b.len * 0.65;
    if (bz1 > -2.5) {
      const v = 0.33 + 0.62 / floors - 0.03;
      quad(Math.max(bz0, -2.5), bz1, v - 0.01, v + 0.01, '#2a2a2a', 0, 0.25);
      for (let k = 0; k <= 6; k++) { const zz = bz0 + (bz1 - bz0) * k / 6; if (zz < -2.5) continue; const a = pt(zz, v, 0.25), bb = pt(zz, v + 0.08, 0.25); c.strokeStyle = '#2a2a2a'; c.lineWidth = Math.max(0.6, 1.4 * P.s(zz)); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(bb[0], bb[1]); c.stroke(); }
      const top0 = pt(Math.max(bz0, -2.5), v + 0.08, 0.25), top1 = pt(bz1, v + 0.08, 0.25);
      c.beginPath(); c.moveTo(top0[0], top0[1]); c.lineTo(top1[0], top1[1]); c.stroke();
    }
  }

  // --- rez : vitrines + store
  const sA = Math.max(z0 + b.len * 0.08, -2.5), sB = z0 + b.len * 0.92;
  if (sB > -2.5) {
    quad(sA, sB, 0.02, 0.21, adult ? 'rgba(255,60,200,0.6)' : '#2f3a40');
    if (!adult) { quad(sA, sB, 0.04, 0.19, 'rgba(255,232,170,0.32)'); quad(sA, sB, 0.12, 0.19, 'rgba(255,255,255,0.12)'); }
    if (b.awning) {
      const stripes = 8, cols2 = adult ? ['#ff2fc4', '#2a0c3d'] : [b.awning, '#f5efe2'];
      for (let k = 0; k < stripes; k++) {
        const q0 = Math.max(sA + (sB - sA) * (k / stripes), -2.5), q1 = sA + (sB - sA) * ((k + 1) / stripes);
        if (q1 <= -2.5) continue;
        poly([pt(q0, 0.235), pt(q1, 0.235), pt(q1, 0.17, 0.45), pt(q0, 0.17, 0.45)], shade(cols2[k % 2], sun));
      }
      // ombre sous le store
      quad(sA, sB, 0.15, 0.21, 'rgba(0,0,0,0.18)');
    }
  }

  // --- enseigne en drapeau (fer forgé), face à la caméra
  const zs = z0 + b.len * 0.22;
  if (zs > 2 && zs < 70) {
    const s = P.s(zs), sx = P.x(side * 1.52, zs), sy = P.y(zs) - Hh * s * 0.31;
    const w = P.unit * 1.15 * s, h = P.unit * 0.33 * s;
    c.strokeStyle = adult ? '#999' : '#1f1a16'; c.lineWidth = Math.max(1, 2.5 * s);
    c.beginPath(); c.moveTo(sx + side * w * 0.55, sy - h * 0.9); c.lineTo(sx - side * w * 0.4, sy - h * 0.9);
    c.moveTo(sx - w * 0.3, sy - h * 0.9); c.lineTo(sx - w * 0.3, sy - h / 2); c.moveTo(sx + w * 0.3, sy - h * 0.9); c.lineTo(sx + w * 0.3, sy - h / 2); c.stroke();
    if (adult) {
      const pulse = 0.65 + 0.35 * Math.sin(t * 6 + b.seed);
      c.fillStyle = '#16001f'; rr(c, sx - w / 2, sy - h / 2, w, h, h * 0.25); c.fill();
      c.strokeStyle = `rgba(255,${80 + (b.seed % 3) * 60},230,${pulse})`; c.lineWidth = Math.max(1.5, 4 * s); c.stroke();
      c.fillStyle = `rgba(255,220,250,${pulse})`;
    } else {
      const sg = c.createLinearGradient(0, sy - h / 2, 0, sy + h / 2); sg.addColorStop(0, shade(b.signCol, 1.2)); sg.addColorStop(1, shade(b.signCol, 0.82));
      c.fillStyle = sg; rr(c, sx - w / 2, sy - h / 2, w, h, h * 0.22); c.fill();
      c.strokeStyle = '#d9b45a'; c.lineWidth = Math.max(1, 1.8 * s); c.stroke();
      c.fillStyle = '#fff8e8';
    }
    const fs = h * 0.44;
    if (fs > 7) { c.font = `800 ${fs}px Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(b.sign, sx, sy, w * 0.9); }
  }
  // tourelle à bulbe sur le toit (comme sur la Grand-Rue)
  if (b.bulb) {
    const zb = z0 + b.len * 0.15;
    if (zb > -1 && zb < 90) {
      const s = P.s(zb), [bx, by] = pt(zb, 1.5, -1.1), u = P.unit * s;
      c.fillStyle = adult ? '#3a1852' : '#d9cfbd'; c.fillRect(bx - u * 0.12, by - u * 0.45, u * 0.24, u * 0.45);
      c.fillStyle = adult ? '#ff2fc4' : '#4f7d62';
      c.beginPath(); c.moveTo(bx - u * 0.18, by - u * 0.45); c.quadraticCurveTo(bx - u * 0.22, by - u * 0.75, bx, by - u * 0.95); c.quadraticCurveTo(bx + u * 0.22, by - u * 0.75, bx + u * 0.18, by - u * 0.45); c.fill();
      c.strokeStyle = '#333'; c.lineWidth = Math.max(1, 1.5 * s); c.beginPath(); c.moveTo(bx, by - u * 0.95); c.lineTo(bx, by - u * 1.2); c.stroke();
    }
  }
}

// ----------------------------- ARBRES TAILLÉS EN BOULE -----------------------------
export function drawTree(c, P, d, adult) {
  if (d.z < -2.2 || d.z > 85) return;
  const s = P.s(d.z), x = P.x(d.side * 1.72, d.z), y = P.y(d.z), u = P.unit * s;
  c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.ellipse(x + u * 0.2, y, u * 0.45, u * 0.09, 0, 0, 7); c.fill();
  // grille + tuteur
  c.fillStyle = '#333'; c.fillRect(x - u * 0.13, y - u * 0.35, u * 0.03, u * 0.35); c.fillRect(x + u * 0.1, y - u * 0.35, u * 0.03, u * 0.35);
  c.fillStyle = adult ? '#2a1238' : '#5a4330'; c.fillRect(x - u * 0.035, y - u * 1.25, u * 0.07, u * 1.25);
  // feuillage (boule)
  const r = u * (0.42 + (d.seed % 3) * 0.04), cy = y - u * 1.45;
  if (d.z > 30) c.fillStyle = adult ? '#3a1760' : '#4f8a35';
  else {
    const g = c.createRadialGradient(x - r * 0.35, cy - r * 0.35, r * 0.1, x, cy, r * 1.05);
    if (adult) { g.addColorStop(0, '#5b2a8a'); g.addColorStop(1, '#1e0a33'); }
    else { g.addColorStop(0, '#8bc25a'); g.addColorStop(0.6, '#4f8a35'); g.addColorStop(1, '#2f5e22'); }
    c.fillStyle = g;
  }
  c.beginPath(); c.arc(x, cy, r, 0, 7); c.arc(x - r * 0.55, cy + r * 0.25, r * 0.6, 0, 7); c.arc(x + r * 0.55, cy + r * 0.2, r * 0.62, 0, 7); c.fill();
  if (adult) { // guirlande lumineuse
    for (let k = 0; k < 6; k++) { c.fillStyle = k % 2 ? '#ff5fd2' : '#4fe3ff'; c.beginPath(); c.arc(x + Math.cos(k * 1.05) * r * 0.8, cy + Math.sin(k * 1.05) * r * 0.5, Math.max(1, u * 0.03), 0, 7); c.fill(); }
  }
}

// ----------------------------- FANIONS AU-DESSUS DE LA RUE -----------------------------
const PENNANTS = ['#f6c21c', '#d92b2b', '#1f5fbf', '#f08a1c', '#c0185a', '#1f5fbf'];
export function drawGarland(c, P, d, adult, t) {
  if (d.z < 0.5 || d.z > 90) return;
  const s = P.s(d.z), y0 = P.y(d.z) - P.unit * 3.6 * s, xl = P.x(-1.8, d.z), xr = P.x(1.8, d.z), sag = P.unit * 0.35 * s;
  c.strokeStyle = adult ? 'rgba(255,200,240,0.7)' : 'rgba(40,40,40,0.7)'; c.lineWidth = Math.max(0.7, 1.4 * s);
  c.beginPath(); c.moveTo(xl, y0); c.quadraticCurveTo((xl + xr) / 2, y0 + sag * 2, xr, y0); c.stroke();
  const n = 10;
  for (let i = 1; i < n; i++) {
    const k = i / n, x = xl + (xr - xl) * k, y = y0 + sag * 4 * k * (1 - k);
    const w = (xr - xl) / n * 0.55, h = P.unit * 0.65 * s, wave = Math.sin(t * 3 + i + d.z) * w * 0.25;
    c.fillStyle = adult ? (i % 2 ? '#ff2fc4' : '#4fe3ff') : PENNANTS[i % PENNANTS.length];
    c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x + w / 2, y); c.lineTo(x + w * 0.2 + wave, y + h); c.lineTo(x - w * 0.2 + wave, y + h * 0.85); c.closePath(); c.fill();
  }
}

// ----------------------------- BANNIÈRE DE BULLE (taureau rouge) -----------------------------
export function drawBullBanner(c, P, d, adult, t) {
  if (d.z < 1 || d.z > 80) return;
  const s = P.s(d.z), x = P.x(d.side * 0.95, d.z), top = P.y(d.z) - P.unit * 3.4 * s, u = P.unit * s;
  const w = u * 0.95, h = u * 1.35, sway = Math.sin(t * 1.8 + d.z) * w * 0.04;
  c.strokeStyle = '#444'; c.lineWidth = Math.max(1, 1.5 * s);
  c.beginPath(); c.moveTo(x - w * 0.6, top); c.lineTo(x + w * 0.6, top); c.stroke();
  c.save(); c.translate(x + sway, top);
  c.fillStyle = adult ? '#1a0025' : '#fbf8f2'; c.fillRect(-w / 2, 0, w, h);
  // bandes ondées rouges et blanches (bas)
  c.fillStyle = adult ? '#ff2fc4' : '#d0202c';
  c.fillRect(-w / 2, h * 0.58, w, h * 0.42);
  c.fillStyle = adult ? '#1a0025' : '#fbf8f2';
  for (const yy of [0.68, 0.84]) {
    c.beginPath(); c.moveTo(-w / 2, h * yy);
    for (let k = 0; k <= 4; k++) c.quadraticCurveTo(-w / 2 + w * (k + 0.5) / 4 - w / 8, h * (yy - 0.04), -w / 2 + w * (k + 1) / 4 - w / 8, h * yy);
    c.lineTo(w / 2, h * (yy + 0.06)); c.lineTo(-w / 2, h * (yy + 0.06)); c.fill();
  }
  // taureau rouge stylisé
  c.fillStyle = adult ? '#ff5fd2' : '#c8202c';
  const bw = w * 0.72, bh = h * 0.24, by = h * 0.28;
  c.beginPath(); c.ellipse(0, by, bw * 0.38, bh * 0.42, 0, 0, 7); c.fill(); // corps
  c.beginPath(); c.ellipse(bw * 0.36, by - bh * 0.18, bw * 0.13, bh * 0.28, 0.3, 0, 7); c.fill(); // tête
  c.fillRect(-bw * 0.3, by, bw * 0.06, bh * 0.55); c.fillRect(-bw * 0.14, by, bw * 0.06, bh * 0.55); c.fillRect(bw * 0.1, by, bw * 0.06, bh * 0.55); c.fillRect(bw * 0.24, by, bw * 0.06, bh * 0.5);
  c.strokeStyle = c.fillStyle; c.lineWidth = Math.max(1, u * 0.025);
  c.beginPath(); c.moveTo(bw * 0.4, by - bh * 0.4); c.quadraticCurveTo(bw * 0.5, by - bh * 0.75, bw * 0.38, by - bh * 0.7); c.stroke(); // corne
  c.beginPath(); c.moveTo(-bw * 0.38, by - bh * 0.1); c.quadraticCurveTo(-bw * 0.55, by + bh * 0.1, -bw * 0.48, by + bh * 0.4); c.stroke(); // queue
  c.restore();
}

// ----------------------------- FONTAINE FLEURIE -----------------------------
export function drawFountain(c, P, d, adult, t) {
  if (d.z < -1.5 || d.z > 75) return;
  const s = P.s(d.z), x = P.x(d.side * 2.05, d.z), y = P.y(d.z), u = P.unit * s;
  const stone = adult ? '#3a2052' : '#cfc6b4', stoneS = adult ? '#2a163d' : '#a89f8c';
  // bassin
  c.fillStyle = stoneS; c.fillRect(x - u * 0.75, y - u * 0.42, u * 1.5, u * 0.42);
  c.fillStyle = stone; c.fillRect(x - u * 0.78, y - u * 0.47, u * 1.56, u * 0.09);
  c.fillStyle = adult ? '#ff5fd2' : '#9fb58a'; c.fillRect(x - u * 0.7, y - u * 0.4, u * 1.4, u * 0.05);
  // colonne + vasque fleurie
  c.fillStyle = stone; c.fillRect(x - u * 0.12, y - u * 1.35, u * 0.24, u * 0.95);
  c.fillStyle = stoneS; c.fillRect(x - u * 0.12, y - u * 1.35, u * 0.07, u * 0.95);
  c.fillStyle = stone; c.fillRect(x - u * 0.3, y - u * 1.45, u * 0.6, u * 0.12);
  const flowers = adult ? ['#ff2fc4', '#ff9cf0', '#9b3cff'] : ['#e0262c', '#ffb020', '#d94fa0', '#ffe14d'];
  for (let k = 0; k < 14; k++) {
    const a = k * 0.45, rr2 = u * (0.12 + (k % 4) * 0.06);
    c.fillStyle = k % 3 === 0 ? (adult ? '#4a1d66' : '#3f7a2c') : flowers[k % flowers.length];
    c.beginPath(); c.arc(x + Math.cos(a) * rr2 * 1.6, y - u * 1.55 - Math.abs(Math.sin(a)) * rr2, Math.max(1, u * 0.07), 0, 7); c.fill();
  }
  // filet d'eau
  c.strokeStyle = adult ? 'rgba(255,170,240,0.8)' : 'rgba(200,230,255,0.85)'; c.lineWidth = Math.max(1, u * 0.03);
  c.beginPath(); c.moveTo(x + u * 0.12, y - u * 0.9); c.quadraticCurveTo(x + u * 0.35, y - u * 0.88 + Math.sin(t * 8) * u * 0.01, x + u * 0.38, y - u * 0.42); c.stroke();
}

// ----------------------------- TERRASSE (chaises en rotin) -----------------------------
export function drawTerrace(c, P, d, adult) {
  if (d.z < -2 || d.z > 70) return;
  const s = P.s(d.z), x = P.x(d.side * 2.0, d.z), y = P.y(d.z), u = P.unit * s;
  const chair = adult ? '#5a2a7a' : '#4a4d52';
  c.fillStyle = 'rgba(0,0,0,0.16)'; c.beginPath(); c.ellipse(x, y, u * 0.75, u * 0.12, 0, 0, 7); c.fill();
  for (const dx of [-0.42, 0.42]) {
    c.fillStyle = chair; c.fillRect(x + dx * u - u * 0.14, y - u * 0.62, u * 0.28, u * 0.36); // dossier
    c.fillRect(x + dx * u - u * 0.15, y - u * 0.3, u * 0.3, u * 0.06);
    c.fillRect(x + dx * u - u * 0.13, y - u * 0.25, u * 0.03, u * 0.25); c.fillRect(x + dx * u + u * 0.1, y - u * 0.25, u * 0.03, u * 0.25);
  }
  c.fillStyle = adult ? '#3a1852' : '#8a8f94'; c.fillRect(x - u * 0.26, y - u * 0.42, u * 0.52, u * 0.05);
  c.fillRect(x - u * 0.02, y - u * 0.42, u * 0.04, u * 0.42);
  // deux chopes sur la table
  c.fillStyle = '#f5b82e'; c.fillRect(x - u * 0.13, y - u * 0.58, u * 0.09, u * 0.15); c.fillRect(x + u * 0.05, y - u * 0.56, u * 0.09, u * 0.13);
  c.fillStyle = '#fffdf2'; c.fillRect(x - u * 0.13, y - u * 0.61, u * 0.09, u * 0.04); c.fillRect(x + u * 0.05, y - u * 0.59, u * 0.09, u * 0.04);
  // chevalet publicitaire
  if (d.seed % 2) {
    c.fillStyle = adult ? '#ff2fc4' : '#b8121b'; c.beginPath(); c.moveTo(x + d.side * u * 0.8, y); c.lineTo(x + d.side * u * 0.95, y - u * 0.6); c.lineTo(x + d.side * u * 1.1, y); c.fill();
    c.fillStyle = '#fff'; c.font = `900 ${Math.max(5, u * 0.09)}px Nunito`; c.textAlign = 'center';
    if (u > 40) c.fillText(adult ? '♥' : 'APÉRO', x + d.side * u * 0.95, y - u * 0.25);
  }
}

// ----------------------------- CLOCHER À BULBE VERT (arrière-plan) -----------------------------
export function drawChurchFar(c, x, base, h, adult) {
  const w = h * 0.22;
  c.fillStyle = adult ? '#3a1a52' : '#e9e2d3'; c.fillRect(x - w / 2, base - h, w, h);
  c.fillStyle = adult ? '#2a1240' : '#cfc5b0'; c.fillRect(x + w * 0.15, base - h, w * 0.35, h);
  c.fillStyle = adult ? '#ff5fd2' : '#3d3a35'; c.fillRect(x - w * 0.18, base - h * 0.82, w * 0.36, h * 0.12);
  c.fillStyle = adult ? '#ffd6f6' : '#f4efe4'; c.beginPath(); c.arc(x, base - h * 0.55, w * 0.22, 0, 7); c.fill(); // horloge
  c.strokeStyle = '#333'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, base - h * 0.55); c.lineTo(x, base - h * 0.55 - w * 0.15); c.stroke();
  const dome = adult ? '#ff2fc4' : '#4f7d62', domeL = adult ? '#ff8ae0' : '#77a58a';
  c.fillStyle = dome;
  c.beginPath(); c.moveTo(x - w * 0.62, base - h); c.quadraticCurveTo(x - w * 0.75, base - h - w * 0.7, x, base - h - w * 1.05); c.quadraticCurveTo(x + w * 0.75, base - h - w * 0.7, x + w * 0.62, base - h); c.fill();
  c.fillStyle = domeL; c.beginPath(); c.ellipse(x - w * 0.18, base - h - w * 0.45, w * 0.12, w * 0.3, 0, 0, 7); c.fill();
  c.fillStyle = dome; c.fillRect(x - w * 0.1, base - h - w * 1.45, w * 0.2, w * 0.45);
  c.beginPath(); c.arc(x, base - h - w * 1.5, w * 0.16, 0, 7); c.fill();
  c.strokeStyle = '#333'; c.beginPath(); c.moveTo(x, base - h - w * 1.6); c.lineTo(x, base - h - w * 2.1); c.stroke();
}
