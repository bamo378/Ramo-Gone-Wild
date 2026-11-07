// =====================================================================
//  Parcours 2 : LA DESCENTE DU MOLÉSON
//  Ramo dévale le Moléson en luge jusqu'au château de Gruyères :
//  piste damée, sapins enneigés, chalets, télésiège, stations
//  (Plan-Francey, Moléson-sur-Gruyères) et lac de la Gruyère au loin.
// =====================================================================
import { roundRect as rr, rand, pick } from './draw.js';
import { shade, drawCastle } from './scene.js';

const SNOW = '#f4f8fd', SNOW_S = '#d6e3f2', SNOW_D = '#b9cde4';

// ----------------------------- PANORAMA (lac, Gruyères, Préalpes) -----------------------------
export function drawPanorama(c, W, H, hor, adult, progress) {
  // Préalpes enneigées au loin
  let g = c.createLinearGradient(0, hor * 0.3, 0, hor);
  g.addColorStop(0, adult ? '#3b1466' : '#b8c9de'); g.addColorStop(1, adult ? '#2a0c47' : '#dfe8f2');
  c.fillStyle = g;
  c.beginPath(); c.moveTo(0, hor);
  const peaks = [0, .35, .07, .5, .13, .42, .2, .62, .24, .58, .29, .66, .36, .45, .45, .52, .55, .4, .63, .55, .7, .7, .74, .66, .8, .5, .9, .58, 1, .42];
  for (let i = 0; i < peaks.length; i += 2) c.lineTo(peaks[i] * W, hor - peaks[i + 1] * hor * 0.62);
  c.lineTo(W, hor); c.fill();
  // neige sur les sommets
  if (!adult) {
    c.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 2; i < peaks.length - 2; i += 2) {
      if (peaks[i + 1] < 0.55) continue;
      const x = peaks[i] * W, y = hor - peaks[i + 1] * hor * 0.62, s = W * 0.03;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - s, y + s * 0.9); c.lineTo(x - s * 0.3, y + s * 0.6); c.lineTo(x + s * 0.2, y + s * 0.95); c.lineTo(x + s, y + s * 0.8); c.closePath(); c.fill();
    }
  }
  // collines vertes + lac de la Gruyère
  g = c.createLinearGradient(0, hor * 0.82, 0, hor);
  g.addColorStop(0, adult ? '#2a0b40' : '#7fae63'); g.addColorStop(1, adult ? '#1e0830' : '#9cc47c');
  c.fillStyle = g; c.beginPath(); c.moveTo(0, hor);
  for (let x = 0; x <= W + 1; x += W / 14) c.lineTo(x, hor - hor * (0.1 + 0.04 * Math.sin(x / W * 9 + 1)));
  c.lineTo(W, hor); c.fill();
  c.fillStyle = adult ? '#5a1a8a' : '#5f9fd0';
  c.beginPath(); c.ellipse(W * 0.72, hor - hor * 0.035, W * 0.3, hor * 0.028, -0.04, 0, 7); c.fill();
  c.fillStyle = adult ? 'rgba(255,90,220,0.4)' : 'rgba(255,255,255,0.45)';
  c.fillRect(W * 0.55, hor - hor * 0.04, W * 0.12, 1.5);
  // Gruyères : colline + château qui grandit en approchant de l'arrivée
  const k = 0.55 + progress * 1.1, gx = W * 0.36, gy = hor - hor * 0.06;
  c.fillStyle = adult ? '#25093b' : '#6c9c4f';
  c.beginPath(); c.ellipse(gx, gy + hor * 0.02, W * 0.12 * k, hor * 0.07 * k, 0, Math.PI, 0); c.fill();
  drawCastle(c, gx, gy - hor * 0.045 * k, hor * 0.09 * k, adult, 1);
  // flèche « Gruyères » discrète
  if (progress > 0.05) {
    c.fillStyle = adult ? 'rgba(255,180,240,0.85)' : 'rgba(40,60,80,0.75)';
    c.font = `900 ${Math.max(9, W * 0.026)}px Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'bottom';
    c.fillText('GRUYÈRES', gx, gy - hor * 0.2 * k);
  }
}

// ----------------------------- PISTE DAMÉE -----------------------------
export function drawPiste(c, P, W, H, adult, travel) {
  const hor = P.hor, edge = 1.7, near = -3;
  // neige hors-piste (bosses)
  let g = c.createLinearGradient(0, hor, 0, H);
  g.addColorStop(0, adult ? '#2a1a4a' : '#e6eef8'); g.addColorStop(1, adult ? '#1d1036' : '#cddcee');
  c.fillStyle = g; c.fillRect(0, hor, W, H - hor);
  c.fillStyle = adult ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)';
  for (let z = 2 - (travel % 6); z < 60; z += 6) for (const sd of [-1, 1]) {
    const s = P.s(z), x = P.x(sd * 2.8, z), y = P.y(z);
    c.beginPath(); c.ellipse(x, y, P.unit * 0.9 * s, P.unit * 0.12 * s, 0, Math.PI, 0); c.fill();
  }
  // piste
  g = c.createLinearGradient(0, hor, 0, H);
  g.addColorStop(0, adult ? '#3a2860' : '#fbfdff'); g.addColorStop(1, adult ? '#2c1d4c' : '#e9f1fb');
  c.fillStyle = g;
  c.beginPath(); c.moveTo(P.x(-edge, 120), hor); c.lineTo(P.x(edge, 120), hor); c.lineTo(P.x(edge, near), P.y(near)); c.lineTo(P.x(-edge, near), P.y(near)); c.fill();
  // velours de dameuse (lignes longitudinales) + rainures qui défilent
  c.strokeStyle = adult ? 'rgba(160,120,255,0.18)' : 'rgba(150,175,210,0.28)';
  for (let i = -8; i <= 8; i++) {
    const l = (i / 8) * edge; c.lineWidth = 1;
    c.beginPath(); c.moveTo(P.x(l, 100), hor + 1); c.lineTo(P.x(l, near), P.y(near)); c.stroke();
  }
  for (let z = near - (travel % 3); z < 60; z += 3) {
    const s = P.s(z); if (s < 0.15) break;
    c.strokeStyle = adult ? 'rgba(255,120,240,0.10)' : 'rgba(140,165,200,0.22)'; c.lineWidth = Math.max(0.5, 2 * s);
    c.beginPath(); c.moveTo(P.x(-edge, z), P.y(z)); c.lineTo(P.x(edge, z), P.y(z)); c.stroke();
  }
  // traces de luges / skis
  c.strokeStyle = adult ? 'rgba(255,255,255,0.08)' : 'rgba(120,150,190,0.22)'; c.lineWidth = 1.5;
  for (const l of [-0.75, -0.2, 0.35, 0.9]) {
    c.beginPath(); const off = Math.sin(travel * 0.05 + l * 5) * 0.08;
    c.moveTo(P.x(l + off, 90), P.y(90)); c.quadraticCurveTo(P.x(l - off, 10), P.y(10), P.x(l, near), P.y(near)); c.stroke();
  }
  // bords : bourrelet de neige
  for (const sd of [-1, 1]) {
    c.fillStyle = adult ? '#4a3878' : SNOW_S;
    c.beginPath(); c.moveTo(P.x(sd * edge, 120), hor); c.lineTo(P.x(sd * (edge + 0.12), 120), hor);
    c.lineTo(P.x(sd * (edge + 0.12), near), P.y(near)); c.lineTo(P.x(sd * edge, near), P.y(near)); c.fill();
  }
  // balises de piste (piquets orange et noirs) qui défilent
  for (let z = near - (travel % 7) + 7; z < 80; z += 7) for (const sd of [-1, 1]) {
    const s = P.s(z), x = P.x(sd * (edge + 0.06), z), y = P.y(z), h = P.unit * 0.9 * s, w = Math.max(1.5, P.unit * 0.045 * s);
    c.fillStyle = adult ? '#ff3ccf' : '#ff6a00'; c.fillRect(x - w / 2, y - h, w, h);
    c.fillStyle = adult ? '#4fe3ff' : '#1d1d1d'; c.fillRect(x - w / 2, y - h, w, h * 0.22); c.fillRect(x - w / 2, y - h * 0.55, w, h * 0.14);
  }
  // voies : légères (piste lisible)
  c.strokeStyle = adult ? 'rgba(160,240,255,0.35)' : 'rgba(80,140,210,0.25)';
  for (const sd of [-0.5, 0.5]) for (let z = near - (travel % 6); z < 80; z += 6) {
    const z0 = Math.max(z, near), z1 = z + 2; c.lineWidth = Math.max(1, 4 * P.s(z0));
    c.beginPath(); c.moveTo(P.x(sd, z0), P.y(z0)); c.lineTo(P.x(sd, z1), P.y(z1)); c.stroke();
  }
}

// ----------------------------- SAPIN ENNEIGÉ -----------------------------
export function drawSapin(c, P, x, y, s, adult, seed = 0) {
  const u = P.unit * s, h = u * (1.6 + (seed % 3) * 0.25), w = h * 0.42;
  c.fillStyle = 'rgba(60,80,120,0.22)'; c.beginPath(); c.ellipse(x + w * 0.3, y, w * 0.6, w * 0.13, 0, 0, 7); c.fill();
  c.fillStyle = adult ? '#2a1238' : '#5b3a24'; c.fillRect(x - u * 0.05, y - h * 0.16, u * 0.1, h * 0.16);
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const ty = y - h * 0.12 - i * h * 0.22, tw = w * (1 - i * 0.2), th = h * 0.34;
    c.fillStyle = adult ? (i % 2 ? '#1c4a3a' : '#16392e') : (i % 2 ? '#2f6b45' : '#285e3c');
    c.beginPath(); c.moveTo(x, ty - th); c.lineTo(x - tw / 2, ty); c.lineTo(x + tw / 2, ty); c.fill();
    // neige sur les branches
    c.fillStyle = adult ? 'rgba(220,210,255,0.7)' : SNOW;
    c.beginPath(); c.moveTo(x - tw / 2, ty); c.quadraticCurveTo(x - tw * 0.25, ty - th * 0.22, x, ty - th * 0.08); c.quadraticCurveTo(x + tw * 0.25, ty - th * 0.24, x + tw / 2, ty);
    c.quadraticCurveTo(x, ty + th * 0.08, x - tw / 2, ty); c.fill();
  }
  c.fillStyle = adult ? '#fff' : SNOW; c.beginPath(); c.arc(x, y - h * 0.98, Math.max(1, w * 0.08), 0, 7); c.fill();
  if (adult) for (let k = 0; k < 5; k++) { c.fillStyle = k % 2 ? '#ff5fd2' : '#4fe3ff'; c.beginPath(); c.arc(x + Math.sin(k * 2.1) * w * 0.3, y - h * (0.25 + k * 0.14), Math.max(1, u * 0.035), 0, 7); c.fill(); }
}
export function drawSapinDecor(c, P, d, adult) {
  if (d.z < -2.5 || d.z > 95) return;
  const s = P.s(d.z); drawSapin(c, P, P.x(d.side * d.off, d.z), P.y(d.z), s * d.size, adult, d.seed);
}

// ----------------------------- CHALET -----------------------------
export function drawChalet(c, P, d, adult, t) {
  if (d.z < -2 || d.z > 90) return;
  const s = P.s(d.z), x = P.x(d.side * 3.1, d.z), y = P.y(d.z), u = P.unit * s;
  const w = u * 2.1, h = u * 1.1;
  c.fillStyle = 'rgba(60,80,120,0.2)'; c.beginPath(); c.ellipse(x, y, w * 0.6, u * 0.15, 0, 0, 7); c.fill();
  // soubassement pierre + bois
  c.fillStyle = adult ? '#3a2052' : '#c9c1b2'; c.fillRect(x - w / 2, y - h * 0.3, w, h * 0.3);
  const wood = adult ? '#4a2440' : '#8b5a33';
  c.fillStyle = wood; c.fillRect(x - w / 2, y - h, w, h * 0.72);
  c.strokeStyle = adult ? 'rgba(0,0,0,0.3)' : 'rgba(60,35,15,0.35)'; c.lineWidth = Math.max(0.5, u * 0.015);
  for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(x - w / 2, y - h + i * h * 0.12); c.lineTo(x + w / 2, y - h + i * h * 0.12); c.stroke(); }
  // fenêtres + volets rouges et blancs + géraniums
  for (const fx of [-0.28, 0.28]) {
    const wx = x + fx * w, wy = y - h * 0.78;
    c.fillStyle = adult ? '#ffcf5f' : '#ffe9a8'; c.fillRect(wx - u * 0.15, wy, u * 0.3, u * 0.28);
    c.fillStyle = adult ? '#ff2fc4' : '#c8202c'; c.fillRect(wx - u * 0.27, wy, u * 0.11, u * 0.28); c.fillRect(wx + u * 0.16, wy, u * 0.11, u * 0.28);
    c.fillStyle = '#fff'; c.fillRect(wx - u * 0.235, wy + u * 0.1, u * 0.04, u * 0.08); c.fillRect(wx + u * 0.195, wy + u * 0.1, u * 0.04, u * 0.08);
  }
  // balcon
  c.fillStyle = adult ? '#2a1238' : '#6b4226'; c.fillRect(x - w * 0.52, y - h * 0.42, w * 1.04, u * 0.06);
  for (let i = 0; i <= 10; i++) c.fillRect(x - w * 0.5 + i * w * 0.1, y - h * 0.42, u * 0.03, u * 0.16);
  // grand toit enneigé
  c.fillStyle = adult ? '#1a0828' : '#5a3320';
  c.beginPath(); c.moveTo(x - w * 0.68, y - h * 0.95); c.lineTo(x, y - h * 1.75); c.lineTo(x + w * 0.68, y - h * 0.95); c.fill();
  c.fillStyle = adult ? '#e8dcff' : SNOW;
  c.beginPath(); c.moveTo(x - w * 0.7, y - h * 0.98); c.lineTo(x, y - h * 1.82); c.lineTo(x + w * 0.7, y - h * 0.98);
  c.quadraticCurveTo(x + w * 0.35, y - h * 1.12, x, y - h * 1.5); c.quadraticCurveTo(x - w * 0.35, y - h * 1.12, x - w * 0.7, y - h * 0.98); c.fill();
  // cheminée fumante
  c.fillStyle = adult ? '#2a1238' : '#7a7068'; c.fillRect(x + w * 0.2, y - h * 1.7, u * 0.14, u * 0.4);
  for (let k = 0; k < 3; k++) { const ph = (t * 0.6 + k / 3) % 1; c.fillStyle = `rgba(255,255,255,${0.55 * (1 - ph)})`; c.beginPath(); c.arc(x + w * 0.27 + ph * u * 0.4, y - h * 1.75 - ph * u * 0.8, u * (0.08 + ph * 0.15), 0, 7); c.fill(); }
  // enseigne
  if (d.sign && d.z > 2 && d.z < 50) {
    const fs = u * 0.17;
    if (fs > 7) { c.fillStyle = adult ? '#16001f' : '#fff4d6'; rr(c, x - w * 0.42, y - h * 1.08, w * 0.84, u * 0.26, u * 0.06); c.fill(); c.fillStyle = adult ? '#ff9cf0' : '#7a1f12'; c.font = `900 ${fs}px Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(d.sign, x, y - h * 1.08 + u * 0.13, w * 0.8); }
  }
}

// ----------------------------- TÉLÉSIÈGE (pylône + câble + sièges) -----------------------------
export function drawPylon(c, P, d, adult, t) {
  if (d.z < -2 || d.z > 95) return;
  const s = P.s(d.z), x = P.x(d.side * 2.3, d.z), y = P.y(d.z), u = P.unit * s, h = u * 4.2;
  c.fillStyle = adult ? '#5a4a7a' : '#8a95a3'; c.fillRect(x - u * 0.07, y - h, u * 0.14, h);
  c.fillRect(x - u * 0.6, y - h, u * 1.2, u * 0.1);
  c.fillStyle = adult ? '#ff2fc4' : '#e5a51a'; c.fillRect(x - u * 0.62, y - h - u * 0.06, u * 0.12, u * 0.12); c.fillRect(x + u * 0.5, y - h - u * 0.06, u * 0.12, u * 0.12);
  // câble vers le pylône suivant (vers le haut de l'écran) + sièges qui montent
  if (d.next) {
    const s2 = P.s(d.next.z), x2 = P.x(d.side * 2.3, d.next.z), y2 = P.y(d.next.z) - P.unit * s2 * 4.2;
    for (const dx of [-0.55, 0.55]) {
      c.strokeStyle = adult ? 'rgba(200,180,255,0.7)' : 'rgba(50,55,60,0.7)'; c.lineWidth = Math.max(0.6, 1.2 * s);
      c.beginPath(); c.moveTo(x + dx * u, y - h); c.lineTo(x2 + dx * P.unit * s2, y2); c.stroke();
    }
    for (let k = 0; k < 2; k++) {
      const f = ((t * 0.15 + k * 0.5 + d.seed * 0.13) % 1);
      const cx = x + 0.55 * u + (x2 + 0.55 * P.unit * s2 - x - 0.55 * u) * f, cy = y - h + (y2 - y + h) * f, ss = s + (s2 - s) * f, uu = P.unit * ss;
      c.strokeStyle = '#333'; c.lineWidth = Math.max(0.5, ss * 1.5); c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx, cy + uu * 0.5); c.stroke();
      c.fillStyle = adult ? '#ff2fc4' : '#2f5d8a'; c.fillRect(cx - uu * 0.28, cy + uu * 0.5, uu * 0.56, uu * 0.1); c.fillRect(cx - uu * 0.28, cy + uu * 0.25, uu * 0.06, uu * 0.3);
    }
  }
}

// ----------------------------- ARCHES (stations, départ, arrivée) -----------------------------
export function drawArch(c, P, d, adult, t) {
  if (d.z < -1 || d.z > 90) return;
  const s = P.s(d.z), y = P.y(d.z), u = P.unit * s;
  const xl = P.x(-1.85, d.z), xr = P.x(1.85, d.z), top = y - u * 3.1;
  const col = d.finish ? (adult ? '#ff2fc4' : '#c8202c') : (adult ? '#9b3cff' : '#1f5fbf');
  c.fillStyle = col; c.fillRect(xl - u * 0.12, top, u * 0.24, y - top); c.fillRect(xr - u * 0.12, top, u * 0.24, y - top);
  c.fillRect(xl - u * 0.12, top - u * 0.1, xr - xl + u * 0.24, u * 0.62);
  if (d.finish) { // damier
    const n = 16, cw = (xr - xl) / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) { c.fillStyle = (i + j) % 2 ? '#111' : '#fff'; c.fillRect(xl + i * cw, top + u * 0.52 + j * u * 0.08, cw, u * 0.08); }
  }
  const fs = u * 0.3;
  if (fs > 6) { c.fillStyle = '#fff'; c.font = `900 ${fs}px "Luckiest Guy", Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(d.label, (xl + xr) / 2, top + u * 0.2, xr - xl - u * 0.3); }
  // fanions
  for (let i = 0; i < 6; i++) { c.fillStyle = ['#ffd84a', '#ff4b4b', '#4fa3ff'][i % 3]; const fx = xl + (xr - xl) * (i + 0.5) / 6; c.beginPath(); c.moveTo(fx - u * 0.12, top + u * 0.52); c.lineTo(fx + u * 0.12, top + u * 0.52); c.lineTo(fx, top + u * 0.52 + u * 0.3 + Math.sin(t * 5 + i) * u * 0.03); c.fill(); }
}

// ----------------------------- PORTE DE SLALOM -----------------------------
export function drawGate(c, P, g, adult, t) {
  const s = P.s(g.z), y = P.y(g.z), u = P.unit * s;
  const xl = P.x(g.lane - 0.42, g.z), xr = P.x(g.lane + 0.42, g.z), h = u * 1.25;
  const col = g.passed ? '#2fd36b' : g.missed ? 'rgba(140,140,140,0.6)' : (g.color === 'red' ? (adult ? '#ff2fc4' : '#e3262f') : (adult ? '#4fe3ff' : '#1f6fe0'));
  c.fillStyle = col;
  for (const x of [xl, xr]) { c.fillRect(x - Math.max(1, u * 0.03), y - h, Math.max(2, u * 0.06), h); }
  // banderole de porte
  const wave = Math.sin(t * 6 + g.z) * u * 0.03;
  c.beginPath(); c.moveTo(xl, y - h); c.lineTo(xr, y - h); c.lineTo(xr, y - h * 0.68 + wave); c.lineTo(xl, y - h * 0.68 - wave); c.closePath(); c.fill();
  const fs = u * 0.17;
  if (fs > 6 && !g.missed) { c.fillStyle = '#fff'; c.font = `900 ${fs}px Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(g.passed ? '✓' : '+3 s', (xl + xr) / 2, y - h * 0.84); }
}

// ----------------------------- OBSTACLES DE LA PISTE -----------------------------
export function drawObstacleM(c, P, o, adult, t) {
  const s = P.s(o.z), x = P.x(o.lane, o.z), y = P.y(o.z), u = P.unit * s;
  c.fillStyle = 'rgba(60,80,130,0.25)'; c.beginPath(); c.ellipse(x, y, u * 0.45, u * 0.1, 0, 0, 7); c.fill();
  switch (o.type) {
    case 'rock': { // rocher enneigé (sauter)
      c.fillStyle = adult ? '#4a3a6a' : '#7d7f86';
      c.beginPath(); c.moveTo(x - u * 0.4, y); c.lineTo(x - u * 0.32, y - u * 0.35); c.lineTo(x - u * 0.1, y - u * 0.52); c.lineTo(x + u * 0.18, y - u * 0.46); c.lineTo(x + u * 0.38, y - u * 0.22); c.lineTo(x + u * 0.42, y); c.fill();
      c.fillStyle = adult ? '#3a2c55' : '#5f6168'; c.beginPath(); c.moveTo(x + u * 0.05, y); c.lineTo(x + u * 0.18, y - u * 0.46); c.lineTo(x + u * 0.38, y - u * 0.22); c.lineTo(x + u * 0.42, y); c.fill();
      c.fillStyle = adult ? '#e8dcff' : SNOW; c.beginPath(); c.moveTo(x - u * 0.3, y - u * 0.36); c.lineTo(x - u * 0.1, y - u * 0.55); c.lineTo(x + u * 0.2, y - u * 0.48); c.quadraticCurveTo(x, y - u * 0.38, x - u * 0.3, y - u * 0.36); c.fill();
      break;
    }
    case 'fondue': { // caquelon de fondue sur son réchaud (sauter)
      c.fillStyle = '#2b2b2b'; c.fillRect(x - u * 0.3, y - u * 0.22, u * 0.06, u * 0.22); c.fillRect(x + u * 0.24, y - u * 0.22, u * 0.06, u * 0.22);
      c.fillStyle = '#3a3a3a'; c.fillRect(x - u * 0.34, y - u * 0.26, u * 0.68, u * 0.06);
      c.fillStyle = '#ff9f1c'; c.beginPath(); c.ellipse(x, y - u * 0.1, u * 0.08, u * 0.1 + Math.sin(t * 20) * u * 0.02, 0, 0, 7); c.fill();
      const g = c.createLinearGradient(x - u * 0.35, 0, x + u * 0.35, 0); g.addColorStop(0, '#8e1b14'); g.addColorStop(0.4, '#d23a24'); g.addColorStop(1, '#7a160f');
      c.fillStyle = g; c.beginPath(); c.moveTo(x - u * 0.36, y - u * 0.56); c.quadraticCurveTo(x - u * 0.38, y - u * 0.26, x, y - u * 0.26); c.quadraticCurveTo(x + u * 0.38, y - u * 0.26, x + u * 0.36, y - u * 0.56); c.fill();
      c.fillStyle = '#f7d35c'; c.beginPath(); c.ellipse(x, y - u * 0.56, u * 0.36, u * 0.08, 0, 0, 7); c.fill();
      c.fillStyle = '#fbe58a'; c.beginPath(); c.arc(x - u * 0.1, y - u * 0.58, u * 0.05, 0, 7); c.arc(x + u * 0.12, y - u * 0.57, u * 0.04, 0, 7); c.fill();
      c.strokeStyle = '#8a6a4a'; c.lineWidth = Math.max(1, u * 0.025); c.beginPath(); c.moveTo(x + u * 0.36, y - u * 0.5); c.lineTo(x + u * 0.62, y - u * 0.62); c.stroke();
      if (u > 34) { c.fillStyle = adult ? '#ff9cf0' : '#fff'; c.font = `900 ${u * 0.12}px Nunito`; c.textAlign = 'center'; c.fillText(adult ? 'FONDUE COQUINE' : 'MOITIÉ-MOITIÉ', x, y - u * 0.75); }
      break;
    }
    case 'chair': { // siège de télésiège qui pend très bas (glisser dessous)
      const top = y - u * 1.6, sw = u * 0.9;
      c.strokeStyle = '#333'; c.lineWidth = Math.max(1, u * 0.03);
      c.beginPath(); c.moveTo(x - u * 1.2, top - u * 0.1); c.lineTo(x + u * 1.2, top + u * 0.05); c.stroke();
      c.beginPath(); c.moveTo(x, top); c.lineTo(x, top + u * 0.45); c.stroke();
      const sway = Math.sin(t * 2 + o.z) * u * 0.04;
      c.fillStyle = adult ? '#ff2fc4' : '#2f5d8a';
      c.fillRect(x - sw / 2 + sway, top + u * 0.45, sw, u * 0.1);
      c.fillRect(x - sw / 2 + sway, top + u * 0.15, u * 0.07, u * 0.4); c.fillRect(x + sw / 2 - u * 0.07 + sway, top + u * 0.15, u * 0.07, u * 0.4);
      c.fillStyle = adult ? '#ffd6f6' : '#ffd84a'; c.fillRect(x - sw / 2 + sway, top + u * 0.62, sw, u * 0.2);
      c.fillStyle = adult ? '#16001f' : '#1d1d1d'; c.font = `900 ${u * 0.13}px Nunito`; c.textAlign = 'center'; c.textBaseline = 'middle';
      if (u > 28) c.fillText(adult ? 'BAISSE-TOI ♥' : 'BAISSE-TOI !', x + sway, top + u * 0.72, sw * 0.95);
      break;
    }
    case 'sapin': drawSapin(c, P, x, y, s * 0.9, adult, 1); break;
    case 'snowman': { // bonhomme de neige
      c.fillStyle = adult ? '#e8dcff' : SNOW;
      c.beginPath(); c.arc(x, y - u * 0.28, u * 0.3, 0, 7); c.fill();
      c.beginPath(); c.arc(x, y - u * 0.75, u * 0.22, 0, 7); c.fill();
      c.beginPath(); c.arc(x, y - u * 1.1, u * 0.16, 0, 7); c.fill();
      c.fillStyle = SNOW_D; c.beginPath(); c.arc(x + u * 0.08, y - u * 0.25, u * 0.28, -0.6, 1.2); c.fill();
      c.fillStyle = '#ff7b1c'; c.beginPath(); c.moveTo(x, y - u * 1.1); c.lineTo(x + u * 0.03, y - u * 1.06); c.lineTo(x, y - u * 0.96); c.fill();
      c.fillStyle = '#111'; c.beginPath(); c.arc(x - u * 0.06, y - u * 1.14, u * 0.025, 0, 7); c.arc(x + u * 0.06, y - u * 1.14, u * 0.025, 0, 7); c.fill();
      for (const k of [0.65, 0.78]) { c.beginPath(); c.arc(x, y - u * k, u * 0.025, 0, 7); c.fill(); }
      c.fillStyle = adult ? '#ff2fc4' : '#c8202c'; c.fillRect(x - u * 0.2, y - u * 0.98, u * 0.4, u * 0.07); c.fillRect(x + u * 0.08, y - u * 0.98, u * 0.07, u * 0.25);
      c.fillStyle = '#222'; c.fillRect(x - u * 0.14, y - u * 1.42, u * 0.28, u * 0.18); c.fillRect(x - u * 0.2, y - u * 1.26, u * 0.4, u * 0.04);
      c.strokeStyle = '#5b3a24'; c.lineWidth = Math.max(1, u * 0.03);
      c.beginPath(); c.moveTo(x - u * 0.2, y - u * 0.75); c.lineTo(x - u * 0.5, y - u * 0.95); c.moveTo(x + u * 0.2, y - u * 0.75); c.lineTo(x + u * 0.48, y - u * 0.6); c.stroke();
      break;
    }
  }
}

// Meringue double-crème (remplace la grande bière sur ce parcours)
export function drawMeringue(c, x, y, u) {
  c.fillStyle = '#7a4a2a'; c.beginPath(); c.ellipse(x, y - u * 0.05, u * 0.3, u * 0.12, 0, 0, Math.PI); c.fill();
  c.fillStyle = '#c99a5b'; c.beginPath(); c.ellipse(x, y - u * 0.06, u * 0.3, u * 0.07, 0, 0, 7); c.fill();
  c.fillStyle = '#fffdf3';
  c.beginPath(); c.ellipse(x - u * 0.12, y - u * 0.16, u * 0.13, u * 0.09, -0.3, 0, 7); c.ellipse(x + u * 0.12, y - u * 0.16, u * 0.13, u * 0.09, 0.3, 0, 7); c.fill();
  c.fillStyle = '#fff6c9'; c.beginPath(); c.arc(x, y - u * 0.22, u * 0.13, 0, 7); c.arc(x - u * 0.07, y - u * 0.3, u * 0.08, 0, 7); c.arc(x + u * 0.07, y - u * 0.31, u * 0.08, 0, 7); c.fill();
  c.fillStyle = '#e8304a'; c.beginPath(); c.arc(x, y - u * 0.4, u * 0.05, 0, 7); c.fill();
}

// Luge en bois (dessinée sous Ramo, repère local : pieds en 0,0)
export function drawSled(c, w, h, t, adult) {
  const L = w * 1.15;
  // patins
  c.strokeStyle = adult ? '#ff2fc4' : '#b3171d'; c.lineWidth = Math.max(2, h * 0.025); c.lineCap = 'round';
  for (const dx of [-0.28, 0.28]) {
    c.beginPath(); c.moveTo(dx * w - L * 0.02, h * 0.035); c.lineTo(dx * w, h * 0.035);
    c.quadraticCurveTo(dx * w + h * 0.02, -h * 0.07, dx * w + h * 0.005, -h * 0.1); c.stroke();
  }
  // plateau en lattes
  const g = c.createLinearGradient(0, -h * 0.06, 0, 0);
  g.addColorStop(0, adult ? '#9b3cff' : '#c98a4a'); g.addColorStop(1, adult ? '#5a1a8a' : '#8b5a2b');
  c.fillStyle = g; rr(c, -L / 2, -h * 0.065, L, h * 0.06, h * 0.02); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1;
  for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(-L / 2 + L * i / 5, -h * 0.065); c.lineTo(-L / 2 + L * i / 5, -h * 0.005); c.stroke(); }
  // corde
  c.strokeStyle = '#e8d9a6'; c.lineWidth = Math.max(1, h * 0.01);
  c.beginPath(); c.moveTo(-L * 0.42, -h * 0.05); c.quadraticCurveTo(-L * 0.1, -h * 0.25 + Math.sin(t * 8) * h * 0.01, L * 0.3, -h * 0.4); c.stroke();
}

export const MOLESON_SIGNS = ['Buvette du Moléson', 'Chalet des Armaillis', 'Fondue 24/24', 'Crèmerie Double', 'Chez Ramo', 'Vin chaud', 'Après-ski Castor'];
export const MOLESON_SIGNS_ADULT = ['Chalet Coquin', 'Jacuzzi des Neiges', 'Après-ski 69', 'Le Castor Givré', 'Bar à Câlins'];
