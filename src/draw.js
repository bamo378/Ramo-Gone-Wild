// =====================================================================
//  Dessin : décors de Bulle, obstacles, bières, Ramo, la blonde
//  Tout est dessiné en Canvas 2D (léger, aucune image lourde à charger).
// =====================================================================

export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
export { rr as roundRect };

// ----------------------------- CIEL & HORIZON -----------------------------
export function drawSky(c, W, H, hor, adult, t) {
  const g = c.createLinearGradient(0, 0, 0, hor);
  if (adult) { g.addColorStop(0, '#12002b'); g.addColorStop(0.6, '#3a0b5e'); g.addColorStop(1, '#8a1a6b'); }
  else { g.addColorStop(0, '#3d9be9'); g.addColorStop(0.7, '#8fd0ff'); g.addColorStop(1, '#ffe7b5'); }
  c.fillStyle = g; c.fillRect(0, 0, W, hor + 2);
  if (adult) {
    // étoiles + lune
    c.fillStyle = '#fff';
    for (let i = 0; i < 40; i++) {
      const x = (i * 97.3) % W, y = (i * 53.7) % (hor * 0.8);
      c.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i));
      c.fillRect(x, y, 2, 2);
    }
    c.globalAlpha = 1;
    c.fillStyle = '#ffe9f6'; c.beginPath(); c.arc(W * 0.82, hor * 0.25, W * 0.05, 0, 7); c.fill();
    c.fillStyle = '#3a0b5e'; c.beginPath(); c.arc(W * 0.84, hor * 0.23, W * 0.045, 0, 7); c.fill();
  } else {
    c.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 4; i++) {
      const x = ((i * 0.31 + t * 0.006) % 1.2 - 0.1) * W, y = hor * (0.18 + i * 0.13);
      cloud(c, x, y, W * 0.07);
    }
  }
}
function cloud(c, x, y, r) {
  c.beginPath(); c.arc(x, y, r, 0, 7); c.arc(x + r * 0.9, y + r * 0.2, r * 0.75, 0, 7);
  c.arc(x - r * 0.9, y + r * 0.25, r * 0.65, 0, 7); c.fill();
}

// Préalpes fribourgeoises + Moléson (pic pointu caractéristique) + château de Bulle à l'horizon
export function drawMountains(c, W, H, hor, adult) {
  c.fillStyle = adult ? '#2b0c47' : '#7d9cbc';
  c.beginPath(); c.moveTo(0, hor);
  const far = [0, .82, .08, .7, .17, .78, .27, .62, .38, .74, .5, .66, .62, .8, .74, .6, .86, .72, 1, .65];
  for (let i = 0; i < far.length; i += 2) c.lineTo(far[i] * W, hor - (1 - far[i + 1]) * hor * 0.9);
  c.lineTo(W, hor); c.fill();
  // Moléson (premier plan, à gauche)
  c.fillStyle = adult ? '#1d0733' : '#5f7f99';
  c.beginPath(); c.moveTo(0, hor); c.lineTo(W * 0.08, hor - hor * 0.22); c.lineTo(W * 0.2, hor - hor * 0.45);
  c.lineTo(W * 0.24, hor - hor * 0.42); c.lineTo(W * 0.4, hor - hor * 0.14); c.lineTo(W * 0.55, hor - hor * 0.08);
  c.lineTo(W * 0.75, hor - hor * 0.18); c.lineTo(W * 0.9, hor - hor * 0.1); c.lineTo(W, hor - hor * 0.15); c.lineTo(W, hor); c.fill();
  if (!adult) { // neige
    c.fillStyle = '#f4f8ff';
    c.beginPath(); c.moveTo(W * 0.17, hor - hor * 0.39); c.lineTo(W * 0.2, hor - hor * 0.45); c.lineTo(W * 0.24, hor - hor * 0.42);
    c.lineTo(W * 0.225, hor - hor * 0.38); c.lineTo(W * 0.2, hor - hor * 0.4); c.fill();
  }
  // collines vertes de la Gruyère
  c.fillStyle = adult ? '#260a3d' : '#7fb35a';
  c.beginPath(); c.moveTo(0, hor);
  for (let x = 0; x <= W; x += W / 10) c.lineTo(x, hor - hor * (0.05 + 0.04 * Math.sin(x / W * 9)));
  c.lineTo(W, hor); c.fill();
  drawCastleFar(c, W * 0.62, hor, hor * 0.36, adult);
}

// Château de Bulle (vue lointaine) : carré savoyard en pierre + grand donjon rond
function drawCastleFar(c, x, base, h, adult) {
  const stone = adult ? '#4a2a66' : '#d9cbb0', stoneD = adult ? '#3a1f52' : '#bfae8f', roof = adult ? '#7a1f5a' : '#8b3a2a';
  const w = h * 1.1;
  c.fillStyle = stone; c.fillRect(x - w / 2, base - h * 0.55, w, h * 0.55);
  c.fillStyle = roof; c.beginPath(); c.moveTo(x - w / 2 - 4, base - h * 0.55); c.lineTo(x - w * 0.1, base - h * 0.78);
  c.lineTo(x + w * 0.3, base - h * 0.78); c.lineTo(x + w / 2 + 4, base - h * 0.55); c.fill();
  // donjon rond
  const tx = x - w * 0.42, tw = h * 0.42;
  c.fillStyle = stoneD; c.fillRect(tx - tw / 2, base - h * 0.92, tw, h * 0.92);
  c.fillStyle = stone; c.fillRect(tx - tw / 2, base - h * 0.92, tw * 0.55, h * 0.92);
  c.fillStyle = roof; c.beginPath(); c.moveTo(tx - tw / 2 - 3, base - h * 0.92); c.lineTo(tx, base - h * 1.3); c.lineTo(tx + tw / 2 + 3, base - h * 0.92); c.fill();
  c.fillStyle = adult ? '#ff4fd8' : '#4a3b2a';
  for (let i = 0; i < 4; i++) c.fillRect(x - w * 0.3 + i * w * 0.2, base - h * 0.4, w * 0.06, h * 0.1);
  if (adult) { c.fillStyle = '#ffd1f4'; c.fillRect(tx - 3, base - h * 0.6, 6, h * 0.1); }
}

// ----------------------------- RUE -----------------------------
export function drawRoad(c, P, W, H, adult, travel) {
  const hor = P.hor;
  const edge = 1.62; // bord de rue en unités de voie
  // trottoirs
  c.fillStyle = adult ? '#1b0b2b' : '#c9b79a';
  c.fillRect(0, hor, W, H - hor);
  // chaussée pavée
  const nearY = P.y(-3), farY = hor;
  c.fillStyle = adult ? '#2a1640' : '#a89786';
  c.beginPath(); c.moveTo(P.x(-edge, 120), farY); c.lineTo(P.x(edge, 120), farY);
  c.lineTo(P.x(edge, -3), nearY); c.lineTo(P.x(-edge, -3), nearY); c.fill();
  // bandes de pavés défilantes
  const band = 4, off = travel % (band * 2);
  for (let z = -3 - off; z < 110; z += band * 2) {
    const z0 = Math.max(z, -3), z1 = z + band;
    c.fillStyle = adult ? 'rgba(255,80,220,0.06)' : 'rgba(80,60,40,0.10)';
    c.beginPath(); c.moveTo(P.x(-edge, z0), P.y(z0)); c.lineTo(P.x(edge, z0), P.y(z0));
    c.lineTo(P.x(edge, z1), P.y(z1)); c.lineTo(P.x(-edge, z1), P.y(z1)); c.fill();
  }
  // bordures
  c.strokeStyle = adult ? '#ff3ccf' : '#efe4d2'; c.lineWidth = 3;
  for (const s of [-edge, edge]) { c.beginPath(); c.moveTo(P.x(s, 120), farY); c.lineTo(P.x(s, -3), nearY); c.stroke(); }
  // séparations de voies (pointillés)
  c.strokeStyle = adult ? 'rgba(160,240,255,0.55)' : 'rgba(255,255,255,0.55)';
  for (const s of [-0.5, 0.5]) {
    for (let z = -3 - (travel % 6); z < 90; z += 6) {
      const z1 = z + 2.6; c.lineWidth = Math.max(1, 5 * P.s(z));
      c.beginPath(); c.moveTo(P.x(s, Math.max(z, -3)), P.y(Math.max(z, -3))); c.lineTo(P.x(s, z1), P.y(z1)); c.stroke();
    }
  }
}

// Façade de la Grand-Rue (quadrilatère en perspective sur le côté de la rue)
export function drawBuilding(c, P, b, adult, t) {
  const side = b.side, x0 = side * 1.75, z0 = b.z, z1 = b.z + b.len;
  if (z1 < -3) return;
  const za = Math.max(z0, -2.5);
  const hpx = (z) => b.h * P.unit * P.s(z);
  const ax = P.x(x0, za), ay = P.y(za), bx = P.x(x0, z1), by = P.y(z1);
  const ah = hpx(za), bh = hpx(z1);
  c.fillStyle = adult ? b.colN : b.col;
  c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.lineTo(bx, by - bh); c.lineTo(ax, ay - ah); c.fill();
  // toit
  c.fillStyle = adult ? '#120620' : b.roof;
  c.beginPath(); c.moveTo(ax, ay - ah); c.lineTo(bx, by - bh); c.lineTo(bx + side * bh * 0.12, by - bh * 1.14); c.lineTo(ax + side * ah * 0.12, ay - ah * 1.14); c.fill();
  // fenêtres
  const cols = 3, rows = b.floors;
  for (let i = 0; i < cols; i++) {
    const zf = z0 + b.len * (0.18 + i * 0.3); if (zf < -2.5) continue;
    const zf2 = zf + b.len * 0.16;
    for (let r = 0; r < rows; r++) {
      const v0 = 0.3 + r * (0.6 / rows), v1 = v0 + 0.6 / rows * 0.55;
      const p1x = P.x(x0, zf), p1y = P.y(zf), p2x = P.x(x0, zf2), p2y = P.y(zf2);
      const h1 = hpx(zf), h2 = hpx(zf2);
      const lit = adult ? ((i + r + b.seed) % 3 === 0 ? '#ff5fd2' : '#ffcf5f') : '#3c5a74';
      c.fillStyle = lit;
      c.beginPath(); c.moveTo(p1x, p1y - h1 * v0); c.lineTo(p2x, p2y - h2 * v0); c.lineTo(p2x, p2y - h2 * v1); c.lineTo(p1x, p1y - h1 * v1); c.fill();
      if (!adult) { // volets
        c.fillStyle = b.shutter;
        const w2 = (p2x - p1x) * 0.28;
        c.fillRect(p1x - w2, p1y - h1 * v1, w2, h1 * (v1 - v0));
      }
    }
  }
  // arcades / vitrine au rez-de-chaussée
  c.fillStyle = adult ? 'rgba(255,60,200,0.35)' : 'rgba(60,40,30,0.35)';
  c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.lineTo(bx, by - bh * 0.2); c.lineTo(ax, ay - ah * 0.2); c.fill();
  // enseigne suspendue (face à la caméra, lisible)
  const zs = z0 + b.len * 0.25;
  if (zs > 2 && zs < 70) {
    const s = P.s(zs), sx = P.x(side * 1.55, zs), sy = P.y(zs) - b.h * P.unit * s * 0.42;
    const w = P.unit * 1.25 * s, h = P.unit * 0.36 * s;
    c.strokeStyle = adult ? '#999' : '#3b2a1c'; c.lineWidth = Math.max(1, 3 * s);
    c.beginPath(); c.moveTo(sx + side * w * 0.5, sy - h * 0.8); c.lineTo(sx - side * w * 0.3, sy - h * 0.8); c.stroke();
    const bx2 = sx - w / 2, by2 = sy - h / 2;
    if (adult) {
      const pulse = 0.65 + 0.35 * Math.sin(t * 6 + b.seed);
      c.fillStyle = '#16001f'; rr(c, bx2, by2, w, h, h * 0.25); c.fill();
      c.strokeStyle = `rgba(255,${80 + b.seed % 3 * 60},230,${pulse})`; c.lineWidth = Math.max(1.5, 4 * s); c.stroke();
      c.fillStyle = `rgba(255,220,250,${pulse})`;
    } else {
      c.fillStyle = b.signCol; rr(c, bx2, by2, w, h, h * 0.2); c.fill();
      c.strokeStyle = '#3b2a1c'; c.lineWidth = Math.max(1, 2 * s); c.stroke();
      c.fillStyle = '#fff8e8';
    }
    const fs = Math.max(6, h * 0.42);
    if (fs > 7) {
      c.font = `800 ${fs}px Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(b.sign, sx, sy, w * 0.92);
    }
  }
}

// Château de Bulle en bord de rue (passage spectaculaire)
export function drawCastleSide(c, P, b, adult) {
  const side = b.side, x0 = side * 1.9, z0 = b.z, z1 = b.z + b.len;
  if (z1 < -3) return;
  const za = Math.max(z0, -2.5);
  const stone = adult ? '#3d2457' : '#ddd0b6', stoneD = adult ? '#2c1842' : '#c1b092', roof = adult ? '#6d1b52' : '#8b3a2a';
  const H0 = 5.2 * P.unit;
  const ax = P.x(x0, za), ay = P.y(za), bx = P.x(x0, z1), by = P.y(z1);
  const ah = H0 * P.s(za), bh = H0 * P.s(z1);
  c.fillStyle = stone;
  c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.lineTo(bx, by - bh); c.lineTo(ax, ay - ah); c.fill();
  // créneaux / toit
  c.fillStyle = roof;
  c.beginPath(); c.moveTo(ax, ay - ah); c.lineTo(bx, by - bh); c.lineTo(bx, by - bh * 1.25); c.lineTo(ax, ay - ah * 1.25); c.fill();
  // donjon rond au coin proche
  const zt = z0 + 1.2;
  if (zt > -2) {
    const s = P.s(zt), tx = P.x(x0 + side * 0.2, zt), ty = P.y(zt), tw = P.unit * 1.6 * s, th = H0 * 1.45 * s;
    const g = c.createLinearGradient(tx - tw / 2, 0, tx + tw / 2, 0);
    g.addColorStop(0, stoneD); g.addColorStop(0.4, stone); g.addColorStop(1, stoneD);
    c.fillStyle = g; c.fillRect(tx - tw / 2, ty - th, tw, th);
    c.beginPath(); c.ellipse(tx, ty, tw / 2, tw * 0.12, 0, 0, Math.PI); c.fill();
    c.fillStyle = roof; c.beginPath(); c.moveTo(tx - tw * 0.58, ty - th); c.lineTo(tx, ty - th - tw * 1.1); c.lineTo(tx + tw * 0.58, ty - th); c.fill();
    c.fillStyle = adult ? '#ff5fd2' : '#3a2c1d';
    c.fillRect(tx - tw * 0.08, ty - th * 0.62, tw * 0.16, th * 0.12);
    c.fillRect(tx - tw * 0.08, ty - th * 0.35, tw * 0.16, th * 0.1);
    // drapeau fribourgeois (noir et blanc)
    const fx = tx, fy = ty - th - tw * 1.1, fw = tw * 0.5;
    c.strokeStyle = '#333'; c.lineWidth = Math.max(1, 2 * s); c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx, fy - fw); c.stroke();
    c.fillStyle = '#111'; c.fillRect(fx, fy - fw, fw, fw * 0.3);
    c.fillStyle = '#fff'; c.fillRect(fx, fy - fw + fw * 0.3, fw, fw * 0.3);
  }
  // porte d'entrée
  const zd = z0 + b.len * 0.55;
  if (zd > -2) {
    const s = P.s(zd), dx = P.x(x0, zd), dy = P.y(zd);
    c.fillStyle = adult ? '#ff3ccf' : '#5a3a22';
    c.beginPath(); c.moveTo(dx, dy); c.lineTo(dx, dy - H0 * 0.35 * s); c.lineTo(P.x(x0, zd + 1.4), P.y(zd + 1.4) - H0 * 0.35 * P.s(zd + 1.4)); c.lineTo(P.x(x0, zd + 1.4), P.y(zd + 1.4)); c.fill();
  }
  // banderole
  const zb = z0 + 0.6;
  if (zb > -1 && zb < 60) {
    const s = P.s(zb), x = P.x(side * 1.2, zb), y = P.y(zb) - H0 * 0.75 * s, w = P.unit * 2.2 * s, h = P.unit * 0.42 * s;
    c.fillStyle = adult ? '#16001f' : '#fff3d6'; rr(c, x - w / 2, y - h / 2, w, h, h * 0.2); c.fill();
    c.strokeStyle = adult ? '#ff3ccf' : '#8b3a2a'; c.lineWidth = Math.max(1, 3 * s); c.stroke();
    c.fillStyle = adult ? '#ffd6f6' : '#8b3a2a';
    const fs = h * 0.45; if (fs > 7) { c.font = `900 ${fs}px Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(adult ? 'CHÂTEAU DE BULLE · After Dark' : 'CHÂTEAU DE BULLE', x, y, w * 0.92); }
  }
}

// Terrasse (place du Marché) : parasol + table + chope
export function drawTerrace(c, P, d, adult) {
  if (d.z < -2.5 || d.z > 80) return;
  const s = P.s(d.z), x = P.x(d.side * 1.95, d.z), y = P.y(d.z), u = P.unit * s;
  c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.ellipse(x, y, u * 0.6, u * 0.12, 0, 0, 7); c.fill();
  c.fillStyle = '#6b4a2b'; c.fillRect(x - u * 0.04, y - u * 1.4, u * 0.08, u * 1.4);
  c.fillStyle = '#7b5a3a'; c.fillRect(x - u * 0.45, y - u * 0.55, u * 0.9, u * 0.08);
  const col = adult ? ['#ff3ccf', '#6d1bff'] : ['#e94b3c', '#fff'];
  for (let i = 0; i < 6; i++) {
    c.fillStyle = col[i % 2];
    c.beginPath(); c.moveTo(x, y - u * 1.75);
    c.lineTo(x - u * 0.9 + i * u * 0.3, y - u * 1.3); c.lineTo(x - u * 0.6 + i * u * 0.3, y - u * 1.3); c.fill();
  }
  c.fillStyle = '#f5b82e'; c.fillRect(x + u * 0.1, y - u * 0.75, u * 0.14, u * 0.2);
  c.fillStyle = '#fff'; c.fillRect(x + u * 0.1, y - u * 0.79, u * 0.14, u * 0.05);
}

// Lampadaire avec drapeaux suisse / fribourgeois
export function drawLamp(c, P, d, adult) {
  if (d.z < -2.5 || d.z > 90) return;
  const s = P.s(d.z), x = P.x(d.side * 1.7, d.z), y = P.y(d.z), u = P.unit * s;
  c.fillStyle = '#2d2d2d'; c.fillRect(x - u * 0.04, y - u * 2.6, u * 0.08, u * 2.6);
  c.fillStyle = adult ? '#ff9cf0' : '#ffe9a6';
  c.beginPath(); c.arc(x - d.side * u * 0.25, y - u * 2.55, u * 0.12, 0, 7); c.fill();
  const fw = u * 0.45, fy = y - u * 2.2, fx = x - d.side * fw * (d.side > 0 ? 1 : 0);
  if (d.flag === 'ch') {
    c.fillStyle = '#d52b1e'; c.fillRect(fx, fy, fw, fw * 0.8);
    c.fillStyle = '#fff'; c.fillRect(fx + fw * 0.4, fy + fw * 0.12, fw * 0.2, fw * 0.56); c.fillRect(fx + fw * 0.22, fy + fw * 0.3, fw * 0.56, fw * 0.2);
  } else {
    c.fillStyle = '#111'; c.fillRect(fx, fy, fw, fw * 0.4);
    c.fillStyle = '#fff'; c.fillRect(fx, fy + fw * 0.4, fw, fw * 0.4);
  }
}

// ----------------------------- OBSTACLES -----------------------------
export function drawObstacle(c, P, o, adult, t) {
  const s = P.s(o.z), x = P.x(o.lane, o.z), y = P.y(o.z), u = P.unit * s;
  c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(x, y, u * 0.45, u * 0.1, 0, 0, 7); c.fill();
  switch (o.type) {
    case 'barrel': {
      const w = u * 0.62, h = u * 0.75;
      const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
      g.addColorStop(0, '#6e3f1d'); g.addColorStop(0.45, '#b6733a'); g.addColorStop(1, '#5a3216');
      c.fillStyle = g; rr(c, x - w / 2, y - h, w, h, w * 0.25); c.fill();
      c.fillStyle = '#3d3d3d';
      for (const v of [0.18, 0.5, 0.82]) c.fillRect(x - w / 2, y - h * v - u * 0.03, w, u * 0.06);
      c.fillStyle = '#f2e3c2'; c.font = `900 ${u * 0.16}px Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      if (u > 30) c.fillText(adult ? 'XXX' : 'BIÈRE', x, y - h * 0.66);
      break;
    }
    case 'crate': {
      const w = u * 0.66, h = u * 0.6;
      c.fillStyle = '#c99a5b'; c.fillRect(x - w / 2, y - h, w, h);
      c.strokeStyle = '#7a5a2e'; c.lineWidth = Math.max(1, u * 0.05);
      c.strokeRect(x - w / 2, y - h, w, h);
      c.beginPath(); c.moveTo(x - w / 2, y - h); c.lineTo(x + w / 2, y); c.moveTo(x + w / 2, y - h); c.lineTo(x - w / 2, y); c.stroke();
      c.fillStyle = '#7a1f12'; c.font = `900 ${u * 0.13}px Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      if (u > 30) c.fillText(adult ? 'FRAGILE ♥' : 'GRUYÈRE', x, y - h * 0.5);
      break;
    }
    case 'barrier': { // banderole haute : il faut glisser dessous
      const w = u * 0.98, top = y - u * 1.35, bh = u * 0.32;
      c.fillStyle = '#555'; c.fillRect(x - w / 2, top, u * 0.06, u * 1.35); c.fillRect(x + w / 2 - u * 0.06, top, u * 0.06, u * 1.35);
      const stripes = 6;
      for (let i = 0; i < stripes; i++) {
        c.fillStyle = i % 2 ? '#fff' : (adult ? '#ff2fc4' : '#e2231a');
        c.fillRect(x - w / 2 + i * w / stripes, top + u * 0.05, w / stripes + 1, bh);
      }
      c.fillStyle = adult ? '#1a0025' : '#1d1d1d';
      c.fillRect(x - w * 0.36, top + u * 0.1, w * 0.72, bh * 0.6);
      c.fillStyle = adult ? '#ffd6f6' : '#ffd84a'; c.font = `900 ${u * 0.14}px Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      if (u > 28) c.fillText(adult ? 'BAISSE-TOI !' : 'BÉNICHON', x, top + u * 0.1 + bh * 0.3, w * 0.7);
      break;
    }
    case 'cow': { // vache fribourgeoise noire et blanche
      const w = u * 0.9, h = u * 0.95, bob = Math.sin(t * 3 + o.lane) * u * 0.02;
      c.fillStyle = '#f7f7f2'; rr(c, x - w / 2, y - h * 0.85 + bob, w, h * 0.6, w * 0.2); c.fill();
      c.fillStyle = '#1b1b1b';
      c.beginPath(); c.ellipse(x - w * 0.2, y - h * 0.65 + bob, w * 0.16, h * 0.12, 0.3, 0, 7); c.fill();
      c.beginPath(); c.ellipse(x + w * 0.25, y - h * 0.5 + bob, w * 0.13, h * 0.1, -0.4, 0, 7); c.fill();
      c.fillStyle = '#1b1b1b'; for (const lx of [-0.35, -0.15, 0.15, 0.35]) c.fillRect(x + w * lx - u * 0.04, y - h * 0.28, u * 0.08, h * 0.28);
      // tête de face
      c.fillStyle = '#f7f7f2'; rr(c, x - w * 0.2, y - h * 1.05 + bob, w * 0.4, h * 0.45, w * 0.12); c.fill();
      c.fillStyle = '#1b1b1b'; c.beginPath(); c.ellipse(x - w * 0.08, y - h * 0.95 + bob, w * 0.09, h * 0.08, 0, 0, 7); c.fill();
      c.fillStyle = '#f3b6b6'; rr(c, x - w * 0.15, y - h * 0.75 + bob, w * 0.3, h * 0.16, w * 0.06); c.fill();
      c.fillStyle = '#d8c39a'; c.beginPath(); c.moveTo(x - w * 0.2, y - h * 1.0 + bob); c.lineTo(x - w * 0.34, y - h * 1.15 + bob); c.lineTo(x - w * 0.16, y - h * 1.04 + bob); c.fill();
      c.beginPath(); c.moveTo(x + w * 0.2, y - h * 1.0 + bob); c.lineTo(x + w * 0.34, y - h * 1.15 + bob); c.lineTo(x + w * 0.16, y - h * 1.04 + bob); c.fill();
      c.fillStyle = '#111'; c.beginPath(); c.arc(x - w * 0.09, y - h * 0.9 + bob, u * 0.03, 0, 7); c.arc(x + w * 0.09, y - h * 0.9 + bob, u * 0.03, 0, 7); c.fill();
      // sonnaille
      c.fillStyle = '#d4a42a'; c.beginPath(); c.moveTo(x - u * 0.07, y - h * 0.58 + bob); c.lineTo(x + u * 0.07, y - h * 0.58 + bob); c.lineTo(x + u * 0.1, y - h * 0.45 + bob); c.lineTo(x - u * 0.1, y - h * 0.45 + bob); c.fill();
      if (adult) { c.fillStyle = '#ff2fc4'; c.font = `${u * 0.22}px sans-serif`; c.textAlign = 'center'; c.fillText('💋', x + w * 0.3, y - h * 1.05); }
      break;
    }
    case 'cart': { // char à fondue
      const w = u * 0.92, h = u * 1.0;
      c.fillStyle = '#7a4a24'; c.fillRect(x - w / 2, y - h * 0.55, w, h * 0.35);
      c.fillStyle = '#2b2b2b';
      c.beginPath(); c.arc(x - w * 0.32, y - u * 0.12, u * 0.14, 0, 7); c.arc(x + w * 0.32, y - u * 0.12, u * 0.14, 0, 7); c.fill();
      c.fillStyle = '#c0392b'; c.beginPath(); c.ellipse(x, y - h * 0.62, w * 0.34, h * 0.14, 0, 0, 7); c.fill();
      c.fillStyle = '#ffe08a'; c.beginPath(); c.ellipse(x, y - h * 0.7, w * 0.3, h * 0.08, 0, 0, 7); c.fill();
      c.fillStyle = adult ? '#ff2fc4' : '#fff4c9'; rr(c, x - w * 0.45, y - h * 1.05, w * 0.9, h * 0.22, h * 0.05); c.fill();
      c.fillStyle = adult ? '#fff' : '#7a1f12'; c.font = `900 ${u * 0.13}px Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      if (u > 28) c.fillText(adult ? 'FONDUE COQUINE' : 'MOITIÉ-MOITIÉ', x, y - h * 0.94, w * 0.86);
      break;
    }
  }
}

// ----------------------------- BIÈRES & BONUS -----------------------------
export function drawPickup(c, P, p, t, jumpUnitPx) {
  const s = P.s(p.z), x = P.x(p.lane, p.z), lift = p.high ? jumpUnitPx * 0.55 * s : 0;
  const y = P.y(p.z) - lift - P.unit * s * (0.45 + 0.06 * Math.sin(t * 5 + p.z));
  const u = P.unit * s;
  c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.ellipse(x, P.y(p.z), u * 0.2, u * 0.05, 0, 0, 7); c.fill();
  const type = p.type;
  if (['beer', 'big', 'golden', 'chope'].includes(type)) {
    const k = type === 'big' ? 1.35 : type === 'chope' ? 1.5 : 1, w = u * 0.26 * k, h = u * 0.36 * k;
    if (type === 'golden' || type === 'chope') {
      c.fillStyle = type === 'golden' ? 'rgba(255,215,0,0.35)' : 'rgba(255,140,0,0.3)';
      c.beginPath(); c.arc(x, y - h / 2, h * (0.85 + 0.1 * Math.sin(t * 8)), 0, 7); c.fill();
    }
    c.fillStyle = type === 'golden' ? '#ffd700' : '#f5b82e';
    rr(c, x - w / 2, y - h, w, h, w * 0.15); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = Math.max(1, u * 0.025);
    c.beginPath(); c.arc(x + w / 2, y - h * 0.55, h * 0.22, -1.3, 1.3); c.stroke();
    c.fillStyle = '#fffdf5';
    c.beginPath(); c.arc(x - w * 0.25, y - h, w * 0.3, 0, 7); c.arc(x + w * 0.1, y - h * 1.05, w * 0.34, 0, 7); c.arc(x + w * 0.38, y - h, w * 0.24, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(x - w * 0.3, y - h * 0.8, w * 0.12, h * 0.6);
    if (type === 'chope') { c.fillStyle = '#b5121b'; c.font = `900 ${u * 0.16}px Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('x2', x, y - h * 0.45); }
    if (type === 'golden') { c.fillStyle = '#fff'; c.font = `${u * 0.14}px sans-serif`; c.textAlign = 'center'; c.fillText('★', x, y - h * 0.4); }
  } else {
    // bonus After Dark
    const r = u * 0.24;
    const colors = { heat: '#ff5a1f', charm: '#ff2fa8', crazy: '#9b3cff', love: '#ff1744' };
    c.fillStyle = colors[type] + '55'; c.beginPath(); c.arc(x, y - r, r * (1.5 + 0.15 * Math.sin(t * 7)), 0, 7); c.fill();
    if (type === 'love') { heart(c, x, y - r * 1.6, r * 1.3, '#ff1744'); c.fillStyle = '#fff'; c.font = `900 ${r * 0.5}px Nunito`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('LOVE', x, y - r * 1.05); }
    else {
      c.fillStyle = colors[type]; c.beginPath(); c.arc(x, y - r, r, 0, 7); c.fill();
      c.font = `${r * 1.1}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(type === 'heat' ? '🔥' : type === 'charm' ? '💋' : '🪩', x, y - r);
    }
  }
}

export function heart(c, x, y, s, col) {
  c.fillStyle = col; c.beginPath();
  c.moveTo(x, y + s * 0.35);
  c.bezierCurveTo(x - s * 0.9, y - s * 0.25, x - s * 0.35, y - s * 0.85, x, y - s * 0.35);
  c.bezierCurveTo(x + s * 0.35, y - s * 0.85, x + s * 0.9, y - s * 0.25, x, y + s * 0.35);
  c.fill();
}

// ----------------------------- RAMO -----------------------------
// Repères (en pixels de l'image ramo-full.webp 528x620)
export const RAMO_FULL = { w: 528, h: 620, eyeL: [237, 155], eyeR: [305, 176], cheekL: [222, 207], cheekR: [315, 222], hair: [168, 36, 353, 103] };
export const RAMO_HEAD = { w: 300, h: 375, eyeL: [126, 177], eyeR: [204, 201], cheekL: [108, 236], cheekR: [214, 252], hair: [48, 30, 257, 118] };

// Superpositions d'expressions sur le vrai visage (clin d'œil, rougeur, décoiffé)
export function faceOverlay(c, map, sc, ox, oy, fx) {
  const P = (pt) => [ox + pt[0] * sc, oy + pt[1] * sc];
  if (fx.blush) {
    for (const ch of [map.cheekL, map.cheekR]) {
      const [x, y] = P(ch); const g = c.createRadialGradient(x, y, 0, x, y, 26 * sc * (map === RAMO_HEAD ? 1.6 : 1));
      g.addColorStop(0, `rgba(255,60,110,${0.55 * fx.blush})`); g.addColorStop(1, 'rgba(255,60,110,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, 30 * sc * (map === RAMO_HEAD ? 1.6 : 1), 0, 7); c.fill();
    }
  }
  if (fx.wink) {
    const [x, y] = P(map.eyeR), r = (map === RAMO_HEAD ? 22 : 18) * sc;
    c.fillStyle = '#c48a66'; c.beginPath(); c.ellipse(x, y, r * 1.15, r * 0.7, 0.25, 0, 7); c.fill();
    c.strokeStyle = '#2a1a12'; c.lineWidth = Math.max(1.5, 4 * sc); c.lineCap = 'round';
    c.beginPath(); c.arc(x, y - r * 0.3, r * 0.9, 0.35, Math.PI - 0.15); c.stroke();
  }
  if (fx.surprise) {
    for (const e of [map.eyeL, map.eyeR]) {
      const [x, y] = P(e), r = (map === RAMO_HEAD ? 16 : 13) * sc;
      c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
      c.fillStyle = '#3a2414'; c.beginPath(); c.arc(x, y, r * 0.45, 0, 7); c.fill();
    }
  }
  if (fx.hearts) {
    for (const e of [map.eyeL, map.eyeR]) { const [x, y] = P(e); heart(c, x, y + 4 * sc, (map === RAMO_HEAD ? 40 : 30) * sc, '#ff1f6b'); }
  }
  if (fx.messy) {
    const [x0, y0] = P([map.hair[0], map.hair[1]]), [x1] = P([map.hair[2], 0]);
    c.strokeStyle = '#3a3a3a'; c.lineWidth = Math.max(2, 7 * sc); c.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const x = x0 + (x1 - x0) * (i / 8), a = -1.2 + (i % 3) * 0.9;
      c.beginPath(); c.moveTo(x, y0 + 30 * sc); c.lineTo(x + Math.cos(a) * 40 * sc, y0 - 20 * sc + Math.sin(i * 7) * 12 * sc); c.stroke();
    }
    heart(c, x1 + 10 * sc, y0, 34 * sc, '#ff2fa8');
  }
}

export function drawTail(c, x, y, size, angle) {
  c.save(); c.translate(x, y); c.rotate(angle);
  const w = size * 0.42, h = size * 0.62;
  c.fillStyle = '#5b341b'; rr(c, -w / 2, -h, w, h, w * 0.45); c.fill();
  c.strokeStyle = 'rgba(30,15,5,0.5)'; c.lineWidth = Math.max(1, size * 0.012);
  for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(-w / 2, -h * i / 6); c.lineTo(w / 2, -h * i / 6 - h * 0.1); c.stroke(); }
  for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(-w / 2 + w * i / 4, -h); c.lineTo(-w / 2 + w * i / 4, 0); c.stroke(); }
  c.restore();
}

// ----------------------------- LA JOLIE BLONDE (personnage adulte, cartoon) -----------------------------
export function drawBlonde(c, x, y, size, t, st = {}) {
  // x,y = pieds ; size = hauteur totale
  const s = size / 100;
  c.save(); c.translate(x, y); c.scale(s, s);
  const sway = Math.sin(t * 3) * 3;
  // jambes
  c.fillStyle = '#f1c6a8'; c.fillRect(-9, -34, 6, 34); c.fillRect(3, -34, 6, 34);
  c.fillStyle = '#d0103a'; c.fillRect(-11, -4, 9, 4); c.fillRect(2, -4, 9, 4);
  // robe rouge glamour
  c.fillStyle = '#e0144c';
  c.beginPath(); c.moveTo(-14 + sway * 0.2, -68); c.lineTo(14 + sway * 0.2, -68); c.lineTo(20, -30); c.lineTo(-20, -30); c.fill();
  c.fillStyle = '#ff4f7b'; c.beginPath(); c.moveTo(-4, -66); c.lineTo(2, -66); c.lineTo(6, -32); c.lineTo(-2, -32); c.fill();
  // épaules + bras
  c.fillStyle = '#f1c6a8';
  c.beginPath(); c.ellipse(0, -70, 15, 6, 0, 0, 7); c.fill();
  c.save(); c.translate(-13, -69); c.rotate(0.35); c.fillRect(-3, 0, 6, 26); c.restore();
  // bras qui envoie un baiser
  const kiss = st.kiss || 0;
  c.save(); c.translate(13, -69); c.rotate(-0.4 - kiss * 1.9); c.fillRect(-3, 0, 6, 26); c.restore();
  // cou + tête
  c.fillRect(-3, -80, 6, 10);
  // cheveux arrière (longs, ondulés)
  c.fillStyle = '#f6d46b';
  c.beginPath(); c.ellipse(0, -88, 17, 16, 0, 0, 7); c.fill();
  c.beginPath(); c.moveTo(-17, -88); c.quadraticCurveTo(-24, -62, -14, -56); c.lineTo(-8, -76); c.fill();
  c.beginPath(); c.moveTo(17, -88); c.quadraticCurveTo(24, -62, 14, -56); c.lineTo(8, -76); c.fill();
  // visage
  c.fillStyle = '#f6d0b5'; c.beginPath(); c.ellipse(0, -87, 11, 13, 0, 0, 7); c.fill();
  // frange
  c.fillStyle = '#ffdf7e'; c.beginPath(); c.moveTo(-13, -90); c.quadraticCurveTo(-4, -106, 13, -92); c.quadraticCurveTo(4, -98, -2, -92); c.quadraticCurveTo(-6, -96, -13, -90); c.fill();
  // yeux (clin d'œil)
  const wink = st.wink;
  c.fillStyle = '#2a6fd6'; c.beginPath(); c.ellipse(-4.5, -88, 2.2, 2.6, 0, 0, 7); c.fill();
  c.strokeStyle = '#111'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-8, -91); c.lineTo(-1.5, -91.5); c.stroke();
  if (wink) { c.beginPath(); c.arc(4.5, -89, 2.6, 0.2, Math.PI - 0.2); c.stroke(); }
  else { c.fillStyle = '#2a6fd6'; c.beginPath(); c.ellipse(4.5, -88, 2.2, 2.6, 0, 0, 7); c.fill(); c.beginPath(); c.moveTo(1.5, -91.5); c.lineTo(8, -91); c.stroke(); }
  // joues + lèvres rouges
  c.fillStyle = 'rgba(255,90,120,0.45)'; c.beginPath(); c.arc(-7, -83, 2.5, 0, 7); c.arc(7, -83, 2.5, 0, 7); c.fill();
  c.fillStyle = '#d0103a';
  if (kiss > 0.5) { c.beginPath(); c.ellipse(0, -80, 2.4, 2, 0, 0, 7); c.fill(); }
  else { c.beginPath(); c.ellipse(0, -80, 4.2, 1.8, 0, 0, 7); c.fill(); }
  // boucles d'oreilles
  c.fillStyle = '#ffe36b'; c.beginPath(); c.arc(-11, -82, 1.5, 0, 7); c.arc(11, -82, 1.5, 0, 7); c.fill();
  c.restore();
}

// ----------------------------- PARTICULES -----------------------------
export function drawParticles(c, parts) {
  for (const p of parts) {
    const a = Math.max(0, Math.min(1, p.life / p.max * 1.5));
    c.globalAlpha = a;
    if (p.kind === 'heart') heart(c, p.x, p.y, p.size, p.color);
    else if (p.kind === 'confetti') { c.fillStyle = p.color; c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); c.restore(); }
    else if (p.kind === 'text') { c.fillStyle = p.color; c.font = `900 ${p.size}px Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 4; c.strokeText(p.text, p.x, p.y); c.fillText(p.text, p.x, p.y); }
    else { c.fillStyle = p.color; c.beginPath(); c.arc(p.x, p.y, p.size, 0, 7); c.fill(); }
  }
  c.globalAlpha = 1;
}
