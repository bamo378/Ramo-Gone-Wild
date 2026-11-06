// =====================================================================
//  « La jolie blonde » — personnage adulte inventé, style cartoon premium.
//  Dessin vectoriel : silhouette en sablier, robe de soirée rouge satinée,
//  longs cheveux ondulés, maquillage glamour. Habillée, sans nudité.
//  drawBlonde(c, x, y, size, t, { wink, kiss, pose })  — x,y = pieds ; size = hauteur totale
// =====================================================================

const SKIN = '#f5cdb2', SKIN_S = '#e3ad8e', SKIN_L = '#fde3d2';
const HAIR = '#f3cf6a', HAIR_S = '#d9a93f', HAIR_L = '#fff0b8';
const DRESS = '#d3123f', DRESS_S = '#8f0a29', DRESS_L = '#ff5a7e';

export function drawBlonde(c, x, y, size, t, st = {}) {
  const s = size / 200; // repère : 200 unités de haut
  c.save();
  c.translate(x, y); c.scale(s, s);
  const sway = Math.sin(t * 2.6) * 1;   // déhanché
  const breathe = Math.sin(t * 3.1) * 0.6;
  const kiss = st.kiss || 0;

  // ombre au sol
  c.fillStyle = 'rgba(0,0,0,0.22)'; c.beginPath(); c.ellipse(0, 0, 30, 6, 0, 0, 7); c.fill();

  c.save(); c.rotate(sway * 0.02);
  // --- jambes (une légèrement croisée) + escarpins
  legs(c, sway);
  // --- robe fourreau avec fente
  dress(c, sway, breathe);
  // --- bras gauche (main sur la hanche)
  armHip(c);
  // --- cheveux arrière
  hairBack(c, t);
  // --- cou
  c.fillStyle = SKIN; c.beginPath(); c.moveTo(-6, -150); c.lineTo(6, -150); c.lineTo(7, -136); c.lineTo(-7, -136); c.fill();
  c.fillStyle = SKIN_S; c.beginPath(); c.moveTo(-6, -146); c.quadraticCurveTo(0, -142, 6, -146); c.lineTo(6, -150); c.lineTo(-6, -150); c.fill();
  // --- tête
  head(c, t, st.wink, kiss);
  // --- bras droit (baiser envoyé)
  armKiss(c, kiss);
  c.restore();
  c.restore();
}

function legs(c, sway) {
  const lg = c.createLinearGradient(-15, 0, 15, 0);
  lg.addColorStop(0, SKIN_S); lg.addColorStop(0.4, SKIN_L); lg.addColorStop(1, SKIN_S);
  c.fillStyle = lg;
  // jambe arrière
  c.beginPath(); c.moveTo(-12, -64); c.quadraticCurveTo(-15, -34, -10, -6); c.lineTo(-4, -6); c.quadraticCurveTo(-3, -36, -2, -64); c.fill();
  // jambe avant (sort de la fente)
  c.beginPath(); c.moveTo(2, -78); c.quadraticCurveTo(14, -44, 6, -6); c.lineTo(12, -6); c.quadraticCurveTo(20, -46, 12, -80); c.fill();
  // escarpins rouges vernis
  c.fillStyle = DRESS_S;
  c.beginPath(); c.moveTo(-12, -7); c.quadraticCurveTo(-16, 0, -6, 0); c.lineTo(-2, -2); c.lineTo(-4, -8); c.fill();
  c.beginPath(); c.moveTo(5, -7); c.quadraticCurveTo(3, 0, 15, 0); c.lineTo(17, -3); c.lineTo(12, -8); c.fill();
  c.fillStyle = '#111'; c.fillRect(-3, -6, 1.5, 6); c.fillRect(15, -5, 1.5, 5);
  c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(8, -5, 4, 1.2);
}

function dress(c, sway, breathe) {
  // silhouette sablier
  const g = c.createLinearGradient(-26, 0, 26, 0);
  g.addColorStop(0, DRESS_S); g.addColorStop(0.35, DRESS); g.addColorStop(0.55, DRESS_L); g.addColorStop(0.75, DRESS); g.addColorStop(1, DRESS_S);
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(-19, -128 - breathe);                       // épaule gauche (bustier)
  c.quadraticCurveTo(-24, -118, -16, -104);            // buste
  c.quadraticCurveTo(-11, -96, -13, -90);              // taille fine
  c.quadraticCurveTo(-25, -74, -20, -40);              // hanche
  c.lineTo(-14, -38);
  c.lineTo(1, -40);                                    // fente
  c.lineTo(4, -84);
  c.lineTo(9, -40);
  c.lineTo(21, -42);
  c.quadraticCurveTo(26, -74, 13, -90);
  c.quadraticCurveTo(11, -96, 16, -104);
  c.quadraticCurveTo(24, -118, 19, -128 - breathe);
  c.quadraticCurveTo(0, -122, -19, -128 - breathe);    // décolleté en cœur (sage)
  c.closePath(); c.fill();
  // reflets satinés
  c.strokeStyle = 'rgba(255,190,205,0.55)'; c.lineWidth = 2.2; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-8, -118); c.quadraticCurveTo(-12, -104, -6, -94); c.stroke();
  c.beginPath(); c.moveTo(-14, -80); c.quadraticCurveTo(-17, -62, -13, -44); c.stroke();
  c.strokeStyle = 'rgba(120,0,30,0.35)'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(12, -84); c.quadraticCurveTo(16, -64, 14, -44); c.stroke();
  // ceinture fine dorée
  c.fillStyle = '#f2c24f'; c.beginPath(); c.ellipse(0, -92, 13, 2.2, 0, 0, 7); c.fill();
  c.fillStyle = '#fff3c4'; c.beginPath(); c.arc(-1, -92, 2, 0, 7); c.fill();
  // épaules nues
  c.fillStyle = SKIN;
  c.beginPath(); c.moveTo(-19, -128 - breathe); c.quadraticCurveTo(-24, -140, -12, -143); c.lineTo(12, -143); c.quadraticCurveTo(24, -140, 19, -128 - breathe);
  c.quadraticCurveTo(0, -122, -19, -128 - breathe); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(-8, -135, 5, 2, -0.2, 0, 7); c.fill();
  // collier
  c.strokeStyle = '#f7e2a0'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-7, -141); c.quadraticCurveTo(0, -132, 7, -141); c.stroke();
  c.fillStyle = '#e8f6ff'; c.beginPath(); c.arc(0, -133, 1.8, 0, 7); c.fill();
}

function armHip(c) {
  c.fillStyle = SKIN;
  c.beginPath(); c.moveTo(-20, -138); c.quadraticCurveTo(-34, -118, -30, -98); c.quadraticCurveTo(-26, -88, -15, -90);
  c.lineTo(-14, -95); c.quadraticCurveTo(-22, -96, -23, -102); c.quadraticCurveTo(-25, -118, -14, -132); c.fill();
  c.fillStyle = SKIN_S; c.beginPath(); c.ellipse(-16, -92, 4, 3, 0.3, 0, 7); c.fill();
  // bracelet
  c.fillStyle = '#f2c24f'; c.fillRect(-29, -102, 6, 2);
}

function armKiss(c, kiss) {
  // bras droit : levé vers la bouche puis tendu (baiser soufflé)
  c.save();
  c.translate(18, -138);
  c.rotate(-0.25 - kiss * 1.45);
  c.fillStyle = SKIN;
  c.beginPath(); c.moveTo(-4, 0); c.quadraticCurveTo(-6, 18, -3, 34); c.lineTo(4, 34); c.quadraticCurveTo(6, 18, 5, 0); c.fill();
  c.translate(0, 34); c.rotate(kiss * 0.9);
  c.beginPath(); c.moveTo(-3, 0); c.lineTo(-3, 22); c.lineTo(4, 22); c.lineTo(4, 0); c.fill();
  // main + ongles rouges
  c.beginPath(); c.ellipse(0.5, 26, 4.2, 5.5, 0, 0, 7); c.fill();
  c.fillStyle = DRESS; c.beginPath(); c.arc(-1.5, 31, 1.1, 0, 7); c.arc(1, 31.5, 1.1, 0, 7); c.arc(3.2, 30.5, 1.1, 0, 7); c.fill();
  c.restore();
}

function hairBack(c, t) {
  const g = c.createLinearGradient(-30, -190, 30, -100);
  g.addColorStop(0, HAIR_L); g.addColorStop(0.5, HAIR); g.addColorStop(1, HAIR_S);
  c.fillStyle = g;
  const w = Math.sin(t * 2) * 1.5;
  c.beginPath();
  c.moveTo(-20, -178);
  c.bezierCurveTo(-38, -168, -32, -146, -36 + w, -128);
  c.bezierCurveTo(-40 + w, -112, -26, -108, -30 + w, -98);
  c.quadraticCurveTo(-20, -104, -16, -120);
  c.lineTo(16, -120);
  c.quadraticCurveTo(22, -104, 32 - w, -100);
  c.bezierCurveTo(26 - w, -112, 40 - w, -118, 34, -134);
  c.bezierCurveTo(34, -150, 38, -168, 20, -178);
  c.closePath(); c.fill();
}

function head(c, t, wink, kiss) {
  // visage ovale
  const fg = c.createRadialGradient(-4, -166, 2, 0, -162, 20);
  fg.addColorStop(0, SKIN_L); fg.addColorStop(0.7, SKIN); fg.addColorStop(1, SKIN_S);
  c.fillStyle = fg;
  c.beginPath(); c.moveTo(0, -145);
  c.bezierCurveTo(-12, -145, -17, -156, -17, -166);
  c.bezierCurveTo(-17, -180, -9, -186, 0, -186);
  c.bezierCurveTo(9, -186, 17, -180, 17, -166);
  c.bezierCurveTo(17, -156, 12, -145, 0, -145); c.fill();
  // oreille + boucle d'oreille pendante
  c.fillStyle = SKIN_S; c.beginPath(); c.ellipse(-16.5, -164, 2.5, 4, 0, 0, 7); c.fill();
  c.strokeStyle = '#f2c24f'; c.lineWidth = 1; c.beginPath(); c.moveTo(-16.5, -160); c.lineTo(-16.5, -153); c.stroke();
  c.fillStyle = '#ffe36b'; c.beginPath(); c.arc(-16.5, -151.5, 2, 0, 7); c.fill();
  // yeux en amande
  eye(c, -7, -167, false, 1);
  eye(c, 7, -167, !!wink, -1);
  // sourcils fins arqués
  c.strokeStyle = '#a8792b'; c.lineWidth = 1.3; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-12, -173); c.quadraticCurveTo(-7, -177, -2.5, -174); c.stroke();
  c.beginPath(); c.moveTo(2.5, -174); c.quadraticCurveTo(7, wink ? -176 : -177, 12, -173); c.stroke();
  // nez
  c.strokeStyle = SKIN_S; c.lineWidth = 1; c.beginPath(); c.moveTo(0.5, -165); c.quadraticCurveTo(2, -160, -0.5, -158.5); c.stroke();
  // joues rosées
  c.fillStyle = 'rgba(255,110,140,0.35)'; c.beginPath(); c.ellipse(-10, -159, 3.6, 2.4, 0, 0, 7); c.ellipse(10, -159, 3.6, 2.4, 0, 0, 7); c.fill();
  // bouche glamour (bisou en cœur pendant le baiser)
  c.fillStyle = '#c90f3a';
  if (kiss > 0.5) {
    c.beginPath(); c.ellipse(0, -152.5, 3, 2.6, 0, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.arc(-1, -153.6, 0.8, 0, 7); c.fill();
  } else {
    c.beginPath(); c.moveTo(-5.5, -153); c.quadraticCurveTo(-2.5, -156, 0, -154.5); c.quadraticCurveTo(2.5, -156, 5.5, -153);
    c.quadraticCurveTo(0, -148.5, -5.5, -153); c.fill();
    c.strokeStyle = '#8a0a28'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(-5.5, -153); c.quadraticCurveTo(0, -152, 5.5, -153); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.ellipse(-1.5, -151.5, 1.4, 0.6, 0, 0, 7); c.fill();
  }
  // grain de beauté
  c.fillStyle = '#6b3a2a'; c.beginPath(); c.arc(7.5, -155.5, 0.6, 0, 7); c.fill();
  // cheveux avant : raie sur le côté, grande mèche ondulée
  const g = c.createLinearGradient(-20, -192, 18, -150);
  g.addColorStop(0, HAIR_L); g.addColorStop(0.45, HAIR); g.addColorStop(1, HAIR_S);
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(-19, -160);
  c.bezierCurveTo(-22, -184, -8, -194, 4, -191);
  c.bezierCurveTo(16, -189, 22, -178, 19, -158);
  c.bezierCurveTo(17, -150, 21, -142, 24, -136);
  c.bezierCurveTo(14, -140, 13, -156, 14, -166);
  c.bezierCurveTo(10, -176, 0, -180, -6, -176);   // mèche qui balaie le front
  c.bezierCurveTo(-12, -172, -14, -166, -19, -160);
  c.closePath(); c.fill();
  c.strokeStyle = 'rgba(255,248,215,0.8)'; c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(-14, -178); c.quadraticCurveTo(-4, -190, 10, -184); c.stroke();
  c.beginPath(); c.moveTo(14, -176); c.quadraticCurveTo(18, -162, 16, -148); c.stroke();
}

function eye(c, x, y, closed, dir) {
  if (closed) { // clin d'œil + longs cils
    c.strokeStyle = '#2b1a14'; c.lineWidth = 1.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x - 4.5, y); c.quadraticCurveTo(x, y + 3, x + 4.5, y); c.stroke();
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x - 2 + i * 2.5, y + 1.6); c.lineTo(x - 2.5 + i * 3, y + 4); c.stroke(); }
    return;
  }
  // fard à paupières rosé
  c.fillStyle = 'rgba(214,90,150,0.45)'; c.beginPath(); c.ellipse(x, y - 2.2, 5.6, 3.2, 0, Math.PI, 0); c.fill();
  // blanc de l'œil
  c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - 5, y); c.quadraticCurveTo(x, y - 4.8, x + 5, y); c.quadraticCurveTo(x, y + 3.4, x - 5, y); c.fill();
  // iris bleu + pupille + reflet
  const ig = c.createRadialGradient(x, y - 0.5, 0.3, x, y - 0.5, 2.8);
  ig.addColorStop(0, '#9fd7ff'); ig.addColorStop(1, '#2a6fd6');
  c.fillStyle = ig; c.beginPath(); c.arc(x + dir * 0.3, y - 0.4, 2.7, 0, 7); c.fill();
  c.fillStyle = '#10131c'; c.beginPath(); c.arc(x + dir * 0.3, y - 0.4, 1.2, 0, 7); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(x + dir * 0.3 - 0.9, y - 1.4, 0.7, 0, 7); c.fill();
  // eye-liner + cils recourbés
  c.strokeStyle = '#1b1210'; c.lineWidth = 1.5; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x - 5.2, y + 0.3); c.quadraticCurveTo(x, y - 5.2, x + 5.6, y - 0.8); c.stroke();
  const out = dir > 0 ? -1 : 1;
  c.beginPath(); c.moveTo(x + out * 5, y - 0.6); c.lineTo(x + out * 7.2, y - 2.6); c.stroke();
  c.lineWidth = 1;
  for (let i = 0; i < 3; i++) { const lx = x + out * (2 + i * 1.3); c.beginPath(); c.moveTo(lx, y - 3.8 + i * 0.6); c.lineTo(lx + out * 1.4, y - 6 + i * 0.8); c.stroke(); }
}
