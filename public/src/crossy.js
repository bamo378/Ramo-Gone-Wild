// =====================================================================
//  Jeu 3 : TRAVERSE BULLE — inspiré du principe « traverser la route » (Frogger / Crossy Road)
//  Ramo saute de case en case à travers Bulle : rues et tracteurs, voie du train,
//  la Trême avec troncs et radeaux de fromage, place du Marché, château.
//  Rendu « voxel » (blocs 3D vus de face-dessus), tout dessiné en Canvas 2D.
// =====================================================================
import { rand, pick, roundRect as rr, faceOverlay, RAMO_FULL, heart } from './draw.js';
import { drawBlonde } from './blonde.js';
import { sfx } from './audio.js';

const COLS = 9;            // colonnes jouables (0..8)
const HOP = 0.12;          // durée d'un saut (s)

// ---------------- palettes jour / nuit
const PAL = {
  day: {
    grassA: '#8fd16a', grassB: '#83c75f', grassSide: '#5f9b3f', flower: ['#ffffff', '#ffd84a', '#ff6b8a'],
    road: '#5b5f66', roadSide: '#3f4248', dash: '#f4f1e8', curb: '#c9c3b6',
    rail: '#9a8a76', railSide: '#76695a', sleeper: '#6b4a2e', steel: '#c9ccd2',
    water: '#4fb3e8', waterB: '#43a5db', waterSide: '#2f7fb5', foam: 'rgba(255,255,255,0.55)',
    place: '#d9cdb8', placeB: '#cfc2ab', placeSide: '#a8987e',
    sky: '#9fd7ff',
  },
  night: {
    grassA: '#2a3d4a', grassB: '#263744', grassSide: '#172630', flower: ['#ff9cf0', '#4fe3ff', '#ffd84a'],
    road: '#231b33', roadSide: '#150f22', dash: '#ff4fd8', curb: '#4a3a66',
    rail: '#3a2e48', railSide: '#251c30', sleeper: '#1d1426', steel: '#9fa6ff',
    water: '#2a1f6b', waterB: '#251a5f', waterSide: '#140e3d', foam: 'rgba(255,120,240,0.45)',
    place: '#3a2a50', placeB: '#34264a', placeSide: '#1f1630',
    sky: '#1a0d2e',
  },
};
const FACADES = ['#efe6cf', '#f1dd9c', '#ec9e8f', '#f2b9aa', '#f3f0e8', '#ddd3c2', '#e8c98a', '#e9a896'];
const SHUTTERS = ['#2f7d8f', '#3d7a4a', '#9aa0a3', '#7a5236', '#2a6f9e'];
const CAR_COLORS = ['#e8402f', '#2f7fd6', '#f2b51d', '#ffffff', '#3dbb6e', '#8a4fd8', '#ff7a1a', '#2b2b2b'];

function shadeHex(h, f) {
  const n = parseInt(h.slice(1), 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const k = (v) => Math.max(0, Math.min(255, Math.round(f >= 1 ? v + (255 - v) * (f - 1) : v * f)));
  return `rgb(${k(r)},${k(g)},${k(b)})`;
}

export class Crossy {
  constructor(game, mode) {
    this.g = game; this.adult = mode === 'adult';
    this.pal = this.adult ? PAL.night : PAL.day;
    this.rows = new Map(); this.genR = 0; this.segQueue = [];
    this.p = { c: 4, r: 0, fc: 4, fr: 0, t: 1, face: 0, dead: null, deadT: 0, bump: 0, onLog: null, inv: 0 };
    this.queue = []; this.camR = -1.5; this.maxR = 0; this.score = 0; this.beerPts = 0; this.beers = 0;
    this.elapsed = 0; this.idle = 0; this.started = false; this.eagle = null; this.shield = 0;
    this.introT = 0; this.lastMsgR = 0;
    this.resize();
    for (let r = -6; r < 0; r++) this.rows.set(r, this.makeRow(r, 'grass', { edgeOnly: true }));
    while (this.genR < 40) this.genSegment();
  }

  resize() {
    const W = this.g.W, H = this.g.H;
    this.cell = Math.min(W / 10.4, H / 13.5);
    this.cellH = this.cell * 0.98;
    this.offX = (W - COLS * this.cell) / 2;
    this.baseY = H * 0.8;
  }
  colX(c) { return this.offX + (c + 0.5) * this.cell; }
  rowY(r) { return this.baseY - (r - this.camR) * this.cellH; } // bord avant (bas) de la rangée

  // ------------------------------------------------ génération procédurale
  difficulty(r) { return Math.min(1, Math.max(0, r / 160)); }
  genSegment() {
    const r0 = this.genR, d = this.difficulty(r0);
    if (r0 < 3) { this.push('grass', { safe: true }); return; }
    // Place du Marché (repère de Bulle) toutes les ~45 rangées
    if (r0 - (this.lastPlace ?? -30) > 45) { this.lastPlace = r0; this.push('place', { fountain: true }); this.push('place', {}); return; }
    const w = { road: 0.48 + 0.08 * d, river: 0.2 + 0.1 * d, rail: 0.1 + 0.1 * d, grass: 0.2 - 0.15 * d };
    let x = Math.random() * (w.road + w.river + w.rail + w.grass);
    const type = (x -= w.road) < 0 ? 'road' : (x -= w.river) < 0 ? 'river' : (x -= w.rail) < 0 ? 'rail' : 'grass';
    if (type === 'road') {
      const n = 1 + Math.floor(Math.random() * (2 + 2.5 * d));
      const fanions = Math.random() < 0.35;
      for (let i = 0; i < n; i++) this.push('road', { first: i === 0, last: i === n - 1, fanions: fanions && i === 0 });
    } else if (type === 'river') {
      const n = 1 + Math.floor(Math.random() * (2 + 2 * d));
      for (let i = 0; i < n; i++) this.push(Math.random() < 0.2 && n > 1 ? 'lily' : 'river', {});
    } else if (type === 'rail') {
      this.push('rail', {}); if (Math.random() < 0.25 * d) this.push('rail', {});
    }
    // toujours une bande d'herbe pour souffler après un passage dangereux
    const g = type === 'grass' ? 1 + Math.floor(Math.random() * 3) : (Math.random() < 0.75 ? 1 : 2);
    for (let i = 0; i < g; i++) this.push('grass', {});
  }
  push(type, o) { const r = this.genR++; this.rows.set(r, this.makeRow(r, type, o)); }

  makeRow(r, type, o = {}) {
    const d = this.difficulty(r), row = { r, type, blocks: new Map(), items: [], pick: new Map(), edge: {}, ...o };
    row.dir = Math.random() < 0.5 ? -1 : 1;
    // décor des bords : façades de Bulle, arbres, réverbères…
    for (const side of [-1, 1]) {
      const k = Math.random();
      if (type === 'grass' || type === 'place') row.edge[side] = k < 0.6 ? { kind: 'house', col: pick(FACADES), sh: pick(SHUTTERS), h: rand(1.8, 2.8), flowers: Math.random() < 0.5 } : k < 0.85 ? { kind: 'tree' } : { kind: 'lamp' };
      else if (type === 'road') row.edge[side] = Math.random() < 0.4 ? { kind: 'lamp' } : null;
      else if (type === 'rail') row.edge[side] = { kind: 'signal' };
      else row.edge[side] = Math.random() < 0.5 ? { kind: 'reeds' } : null;
    }
    // le château de Bulle borde la traversée environ toutes les 50 rangées
    if (type === 'grass' && r > 12 && r - (this.lastCastle ?? -40) > 50) { this.lastCastle = r; row.edge[pick([-1, 1])] = { kind: 'castle' }; }
    if (type === 'grass' && !o.safe && !o.edgeOnly) {
      // obstacles fixes (jamais plus de 3, et la rangée reste traversable)
      const n = Math.floor(Math.random() * (1.5 + 2 * d + 0.5));
      const prev = this.rows.get(r - 1);
      for (let i = 0; i < n; i++) {
        const c = Math.floor(Math.random() * COLS);
        if (prev && prev.type === 'grass' && prev.blocks.size >= 2 && prev.blocks.has(c)) continue;
        row.blocks.set(c, pick(['sapin', 'tree', 'tree', 'rock', 'bench', 'hay', 'cow', 'pot']));
      }
      if (this.adult && Math.random() < 0.18) { const c = this.freeCol(row); if (c !== null) row.blocks.set(c, 'blonde'); }
    }
    if (type === 'place') {
      if (o.fountain) row.blocks.set(4, 'fountain');
      for (const c of [1, 7]) if (Math.random() < 0.7) row.blocks.set(c, 'terrace');
      row.banner = o.fountain;
    }
    // bières (et parfois une bière dorée / un cœur en mode nuit)
    if ((type === 'grass' || type === 'place' || type === 'road') && r > 2 && Math.random() < 0.33) {
      const c = this.freeCol(row);
      if (c !== null) row.pick.set(c, Math.random() < 0.08 ? 'golden' : this.adult && Math.random() < 0.12 ? 'heart' : 'beer');
    }
    // éléments mobiles
    if (type === 'road') {
      const speed = rand(1.6, 2.6) + d * rand(1, 2.8);
      row.speed = speed;
      const kind = Math.random();
      let x = rand(-3, 2);
      while (x < COLS + 3) {
        const v = kind < 0.2 ? { kind: 'tractor', len: 1.3 } : kind < 0.38 ? { kind: 'bus', len: 2.6 } : { kind: 'car', len: 1.15 };
        if (Math.random() < 0.15) v.kind = 'fondue';
        v.color = pick(CAR_COLORS); v.x = x; row.items.push(v);
        x += v.len + rand(2.4 - d * 0.6, 4.6 - d * 1.4);
      }
    } else if (type === 'river') {
      row.speed = rand(1.1, 1.9) + d * rand(0.2, 1.1);
      let x = rand(-3, 0);
      while (x < COLS + 3) {
        const v = Math.random() < 0.3 ? { kind: 'cheese', len: rand(1.9, 2.4) } : { kind: 'log', len: rand(2.2, 3.6) - d * 0.5 };
        v.x = x; row.items.push(v); x += v.len + rand(1.1, 2.1 + d * 0.5);
      }
    } else if (type === 'lily') {
      // nénuphars / meules de fromage immobiles : au moins 4 sur la rangée, alignés avec la rangée précédente
      const prev = this.rows.get(r - 1), cols = new Set();
      while (cols.size < 4) cols.add(Math.floor(Math.random() * COLS));
      if (prev && prev.type === 'lily') for (const c of prev.lilies) if (Math.random() < 0.6) cols.add(c);
      row.lilies = [...cols];
    } else if (type === 'rail') {
      row.speed = 32; row.train = { state: 'wait', t: rand(2, 6), x: 0, len: 9 };
    }
    row.span = COLS + 6;
    return row;
  }
  freeCol(row) {
    for (let k = 0; k < 10; k++) { const c = Math.floor(Math.random() * COLS); if (!row.blocks.has(c) && !row.pick.has(c)) return c; }
    return null;
  }
  row(r) { return this.rows.get(r); }

  // ------------------------------------------------ commandes
  input(dir) {
    if (this.p.dead) return;
    if (dir === 'tap') dir = 'up';
    if (this.queue.length < 2) this.queue.push(dir);
    this.started = true;
  }
  tryHop(dir) {
    const p = this.p;
    let nc = Math.round(p.c), nr = p.r;
    if (dir === 'up') nr++; else if (dir === 'down') nr--; else if (dir === 'left') nc--; else if (dir === 'right') nc++;
    p.face = dir === 'left' ? -1 : dir === 'right' ? 1 : p.face;
    const target = this.row(nr);
    if (nc < 0 || nc >= COLS || !target || target.blocks.has(nc) || nr < this.camR - 1.5) {
      p.bump = 0.15; sfx.lane(); return;
    }
    p.fc = p.c; p.fr = p.r; p.c = nc; p.r = nr; p.t = 0; p.onLog = null;
    sfx.jump();
    if (nr > this.maxR) {
      this.maxR = nr; this.idle = 0;
      if (nr % 25 === 0) { this.g.ui.message(pick(['Bulle n\'a jamais vu ça !', 'Le castor traverse tout !', `${nr} rangées ! Santé !`, 'Même le train a peur !']), 2); sfx.combo(2); }
    }
  }

  // ------------------------------------------------ boucle
  update(dt) {
    const p = this.p, g = this.g;
    this.elapsed += dt; this.introT += dt;
    if (p.inv > 0) p.inv -= dt;
    if (this.shield > 0) this.shield -= dt;
    // génération devant, nettoyage derrière
    while (this.genR < this.camR + 40) this.genSegment();
    for (const r of this.rows.keys()) if (r < this.camR - 8) this.rows.delete(r);
    // mouvements des véhicules, troncs, trains
    for (const row of this.rows.values()) {
      if (row.items.length) for (const v of row.items) {
        v.x += row.dir * row.speed * dt;
        if (row.dir > 0 && v.x > COLS + 3) v.x -= row.span; else if (row.dir < 0 && v.x + v.len < -3) v.x += row.span;
      }
      if (row.train) this.updateTrain(row, dt);
    }
    if (p.dead) { this.updateDeath(dt); return; }
    // saut
    if (p.t < 1) {
      p.t = Math.min(1, p.t + dt / HOP);
      if (p.t >= 1) this.land();
    } else if (this.queue.length) this.tryHop(this.queue.shift());
    if (p.bump > 0) p.bump -= dt;
    // sur un tronc : on dérive avec lui
    const cur = this.row(p.r);
    if (p.t >= 1 && cur && cur.type === 'river') {
      const log = p.onLog;
      if (log) { p.c += cur.dir * cur.speed * dt; if (p.c < -0.45 || p.c > COLS - 0.55) return this.die('water'); }
    }
    // collisions véhicules / train (pendant le saut aussi)
    const rr2 = p.t < 0.5 ? p.fr : p.r, row = this.row(rr2), pc = p.t < 1 ? p.fc + (p.c - p.fc) * p.t : p.c;
    if (row && row.type === 'road' && p.inv <= 0) {
      for (const v of row.items) if (pc + 0.32 > v.x && pc - 0.32 < v.x + v.len) { if (this.shield > 0) { this.shield = 0; p.inv = 1; sfx.boing(); g.ui.message('Bière dorée : sauvé !', 1.5); break; } return this.die('car', v); }
    }
    if (row && row.train && row.train.state === 'pass') {
      const tr = row.train; if (pc + 0.3 > tr.x && pc - 0.3 < tr.x + tr.len) return this.die('train');
    }
    // caméra : suit Ramo, et avance toute seule (l'aigle punit les traînards)
    const pr = p.t < 1 ? p.fr + (p.r - p.fr) * p.t : p.r;
    const auto = this.started && this.maxR > 2 ? Math.min(1.25, 0.32 + this.maxR * 0.005) : 0;
    const target = Math.max(this.camR + auto * dt, pr - 3.2);
    this.camR += (target - this.camR) * Math.min(1, dt * 5);
    if (this.started) this.idle += dt;
    if (pr < this.camR - 1.4 || this.idle > 10) return this.die('eagle');
    // score
    this.score = this.maxR * 10 + this.beerPts;
    g.score = this.score;
    this.hud();
  }

  land() {
    const p = this.p, row = this.row(p.r); if (!row) return;
    if (row.type === 'river') {
      const log = row.items.find((v) => p.c > v.x - 0.25 && p.c < v.x + v.len + 0.25);
      if (!log) return this.die('water');
      p.onLog = log; this.splashSmall();
    } else if (row.type === 'lily') {
      if (!row.lilies.includes(Math.round(p.c))) return this.die('water');
      p.c = Math.round(p.c); this.splashSmall();
    } else p.c = Math.round(p.c);
    const pk = row.pick.get(Math.round(p.c));
    if (pk) { row.pick.delete(Math.round(p.c)); this.collect(pk); }
  }

  collect(type) {
    const g = this.g, x = this.colX(this.p.c), y = this.rowY(this.p.r) - this.cellH;
    if (type === 'beer') { this.beerPts += 10; this.beers++; sfx.beer(); g.burst(x, y - this.cell, 'text', 1, { text: '+10', color: '#fff', size: 18 }); if (Math.random() < 0.15) g.closeupShow('wink', pick(['Santé !', 'Glou glou !', 'Une de plus !'])); }
    else if (type === 'golden') { this.beerPts += 100; this.beers++; this.shield = 6; sfx.golden(); g.closeupShow('surprise', 'BIÈRE DORÉE : protégé des voitures !'); g.burst(x, y, 'confetti', 26, { color: '#ffd700' }); }
    else if (type === 'heart') { this.beerPts += 250; sfx.kiss(); g.closeupShow('hearts', '💋 « Joli saut, beau castor ! » +250'); for (let i = 0; i < 12; i++) g.burst(x, y, 'heart', 1, { color: pick(['#ff2fa8', '#ff1744']) }); }
    g.burst(x, y, 'dot', 8, { color: type === 'golden' ? '#ffd700' : '#fffbe8' });
  }
  splashSmall() { const x = this.colX(this.p.c), y = this.rowY(this.p.r) - this.cellH * 0.3; for (let i = 0; i < 6; i++) this.g.parts.push({ kind: 'dot', x, y, vx: rand(-80, 80), vy: rand(-120, -30), life: 0.4, max: 0.4, size: rand(2, 4), color: '#e8f6ff', g: 500 }); }

  updateTrain(row, dt) {
    const tr = row.train; tr.t -= dt;
    if (tr.state === 'wait' && tr.t <= 0) { tr.state = 'warn'; tr.t = 1.3; if (Math.abs(row.r - this.p.r) < 9) sfx.tick(); }
    else if (tr.state === 'warn') { if (Math.floor(tr.t * 6) !== tr.lastBlink) { tr.lastBlink = Math.floor(tr.t * 6); if (Math.abs(row.r - this.p.r) < 6 && tr.lastBlink % 2) sfx.tick(); } if (tr.t <= 0) { tr.state = 'pass'; tr.x = row.dir > 0 ? -tr.len - 2 : COLS + 2; if (Math.abs(row.r - this.p.r) < 8) sfx.heat(); } }
    else if (tr.state === 'pass') {
      tr.x += row.dir * row.speed * dt;
      if ((row.dir > 0 && tr.x > COLS + 3) || (row.dir < 0 && tr.x + tr.len < -3)) { tr.state = 'wait'; tr.t = rand(3, 7) - this.difficulty(row.r) * 2; }
    }
  }

  die(kind, v) {
    const p = this.p; if (p.dead) return;
    p.dead = kind; p.deadT = 0; p.deadC = p.t < 1 ? p.fc + (p.c - p.fc) * p.t : p.c; p.deadR = p.t < 1 ? p.fr + (p.r - p.fr) * p.t : p.r;
    const g = this.g, x = this.colX(p.deadC), y = this.rowY(p.deadR) - this.cellH * 0.5;
    g.shake = 0.3;
    if (kind === 'car') { sfx.hit(); g.burst(x, y - this.cell, 'text', 1, { text: 'SPLAT !', color: '#ffd84a', size: 30 }); g.burst(x, y, 'dot', 18, { color: '#8b5a33' }); g.closeupShow('grimace', pick(['Aplati comme une raclette !', 'Le tracteur ne freine pas !', 'Regarde à gauche, à droite…'])); }
    if (kind === 'train') { sfx.hit(); g.burst(x, y - this.cell, 'text', 1, { text: 'TCHOU-TCHOU !', color: '#ffd84a', size: 26 }); g.closeupShow('surprise', 'Le train de la Gruyère ne s\'arrête pas !'); }
    if (kind === 'water') { sfx.slide(); for (let i = 0; i < 20; i++) g.parts.push({ kind: 'dot', x, y, vx: rand(-140, 140), vy: rand(-260, -80), life: 0.7, max: 0.7, size: rand(2, 6), color: '#cfefff', g: 600 }); g.burst(x, y - this.cell, 'text', 1, { text: 'PLOUF !', color: '#9fe8ff', size: 30 }); g.closeupShow('surprise', pick(['Ramo a bu la tasse dans la Trême !', 'Un castor qui ne sait pas nager…'])); }
    if (kind === 'eagle') { this.eagle = { t: 0 }; sfx.wolf(); g.closeupShow('surprise', this.idle > 10 ? 'Trop lent ! L\'aigle du Moléson t\'emporte !' : 'Un aigle a emporté Ramo !'); }
    this.hud();
  }
  updateDeath(dt) {
    const p = this.p; p.deadT += dt;
    if (this.eagle) this.eagle.t += dt;
    if (p.deadT > 1.5 && !this.reported) {
      this.reported = true;
      const g = this.g; g.state = 'over'; g.reported = true; sfx.gameover();
      g.ui.gameOver({ score: this.score, distance: this.maxR, beers: this.beers, mode: this.adult ? 'adult' : 'classic', duration: Math.max(3, Math.round(this.elapsed)), course: 'traverse', result: p.dead, timeLeft: 0 });
    }
  }
  hud() {
    this.g.ui.hud({ score: this.score, lives: this.p.dead ? 0 : 1, distance: this.maxR, bonus: this.shield > 0 ? `⭐ Protégé ${Math.ceil(this.shield)}s` : '', combo: 1, mole: false, cross: true, timeLeft: 0, progress: 0 });
  }

  // =====================================================================
  //  RENDU
  // =====================================================================
  // bloc voxel : x0..x1 à l'écran, yFront = bas de la face avant, depth = profondeur (px), h = hauteur (px)
  // vue 3/4 : face avant + dessus incliné + flanc droit (relief façon voxel)
  box(c, x0, x1, yFront, depth, h, col, light = 1) {
    const sk = depth * 0.32, yt = yFront - h;
    c.fillStyle = shadeHex(col, 0.55 * light);                       // flanc droit (ombre)
    c.beginPath(); c.moveTo(x1, yFront); c.lineTo(x1, yt); c.lineTo(x1 + sk, yt - depth); c.lineTo(x1 + sk, yFront - depth); c.closePath(); c.fill();
    c.fillStyle = shadeHex(col, 0.78 * light); c.fillRect(x0, yt, x1 - x0, h); // face avant
    c.fillStyle = shadeHex(col, 1.1 * light);                        // dessus (lumière)
    c.beginPath(); c.moveTo(x0, yt); c.lineTo(x1, yt); c.lineTo(x1 + sk, yt - depth); c.lineTo(x0 + sk, yt - depth); c.closePath(); c.fill();
  }
  shadow(c, x0, x1, y, depth) { c.fillStyle = 'rgba(20,30,10,0.2)'; c.beginPath(); c.moveTo(x0 + depth * 0.1, y); c.lineTo(x1 + depth * 0.5, y); c.lineTo(x1 + depth * 0.8, y - depth * 0.45); c.lineTo(x0 + depth * 0.4, y - depth * 0.45); c.closePath(); c.fill(); }

  render(c) {
    const g = this.g, W = g.W, H = g.H, P = this.pal, t = g.t;
    // ciel (visible tout en haut)
    c.fillStyle = P.sky; c.fillRect(0, 0, W, H);
    const r0 = Math.floor(this.camR - (H - this.baseY) / this.cellH) - 2, r1 = Math.ceil(this.camR + this.baseY / this.cellH) + 2;
    // 1) sols, du plus loin au plus près
    for (let r = r1; r >= r0; r--) { const row = this.row(r); if (row) this.drawGround(c, row, t); }
    // 2) objets + Ramo, rangée par rangée (le plus loin d'abord)
    const p = this.p, pr = p.dead ? p.deadR : p.t < 1 ? p.fr + (p.r - p.fr) * p.t : p.r;
    const pRowDraw = Math.round(pr + 0.49);
    for (let r = r1; r >= r0; r--) {
      const row = this.row(r);
      if (row) this.drawRowObjects(c, row, t);
      if (r === pRowDraw) this.drawRamo(c, t);
    }
    if (this.eagle) this.drawEagle(c, t);
    // brume en haut pour la profondeur
    const fg = c.createLinearGradient(0, 0, 0, H * 0.18); fg.addColorStop(0, this.adult ? 'rgba(26,13,46,0.9)' : 'rgba(200,232,255,0.85)'); fg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = fg; c.fillRect(0, 0, W, H * 0.18);
    // bords hors-jeu assombris
    c.fillStyle = this.adult ? 'rgba(10,0,20,0.35)' : 'rgba(20,40,20,0.12)'; c.fillRect(0, 0, this.offX, H); c.fillRect(this.offX + COLS * this.cell, 0, W, H);
    if (!this.started) this.drawStartHint(c, t);
  }

  drawGround(c, row, t) {
    const P = this.pal, y = this.rowY(row.r), h = this.cellH, W = this.g.W, cell = this.cell;
    if (y < -h || y > this.g.H + h * 2) return;
    const side = Math.max(3, h * 0.16);
    if (row.type === 'grass') {
      c.fillStyle = row.r % 2 ? P.grassA : P.grassB; c.fillRect(0, y - h, W, h);
      c.fillStyle = P.grassSide; c.fillRect(0, y, W, side);
      // touffes et fleurs (stables par rangée)
      for (let k = 0; k < 5; k++) {
        const fx = ((row.r * 97 + k * 211) % 1000) / 1000 * W, fy = y - h * (0.2 + ((row.r * 31 + k * 17) % 60) / 100);
        c.fillStyle = P.flower[(row.r + k) % 3]; c.fillRect(fx, fy, Math.max(2, cell * 0.07), Math.max(2, cell * 0.07));
      }
    } else if (row.type === 'place') {
      c.fillStyle = P.place; c.fillRect(0, y - h, W, h);
      c.strokeStyle = P.placeB; c.lineWidth = 1;
      for (let x = (row.r % 2) * cell * 0.25; x < W; x += cell * 0.5) { c.beginPath(); c.moveTo(x, y - h); c.lineTo(x, y); c.stroke(); }
      c.beginPath(); c.moveTo(0, y - h * 0.5); c.lineTo(W, y - h * 0.5); c.stroke();
      c.fillStyle = P.placeSide; c.fillRect(0, y, W, side);
    } else if (row.type === 'road') {
      c.fillStyle = P.road; c.fillRect(0, y - h, W, h);
      if (!row.first) { c.fillStyle = P.dash; for (let x = 0; x < W; x += cell) c.fillRect(x + cell * 0.2, y - h - 1, cell * 0.5, Math.max(2, h * 0.06)); }
      if (row.first) { c.fillStyle = P.curb; c.fillRect(0, y - 2, W, Math.max(3, h * 0.08)); }
      if (row.last) { c.fillStyle = P.curb; c.fillRect(0, y - h - 2, W, Math.max(3, h * 0.08)); }
    } else if (row.type === 'rail') {
      c.fillStyle = P.rail; c.fillRect(0, y - h, W, h);
      c.fillStyle = P.sleeper; for (let x = 0; x < W; x += cell * 0.45) c.fillRect(x, y - h * 0.85, cell * 0.16, h * 0.7);
      c.fillStyle = P.steel; c.fillRect(0, y - h * 0.72, W, Math.max(2, h * 0.07)); c.fillRect(0, y - h * 0.32, W, Math.max(2, h * 0.07));
      c.fillStyle = P.railSide; c.fillRect(0, y, W, side);
      if (row.train.state === 'warn') { c.fillStyle = `rgba(255,40,40,${0.15 + 0.15 * Math.sin(t * 20)})`; c.fillRect(0, y - h, W, h); }
    } else { // rivière / nénuphars
      c.fillStyle = row.r % 2 ? P.water : P.waterB; c.fillRect(0, y - h, W, h + 1);
      c.strokeStyle = P.foam; c.lineWidth = 1.5;
      const off = (t * (row.speed || 0.5) * (row.dir || 1) * cell) % (cell * 2);
      for (let x = -cell * 2 + off; x < W + cell * 2; x += cell * 1.3) { c.beginPath(); c.moveTo(x, y - h * 0.5); c.quadraticCurveTo(x + cell * 0.25, y - h * 0.62, x + cell * 0.5, y - h * 0.5); c.stroke(); }
      const below = this.row(row.r - 1);
      if (below && below.type !== 'river' && below.type !== 'lily') { c.fillStyle = P.waterSide; c.fillRect(0, y - 2, W, 3); }
    }
  }

  drawRowObjects(c, row, t) {
    const y = this.rowY(row.r), h = this.cellH, cell = this.cell;
    if (y < -h * 3 || y > this.g.H + h * 3) return;
    const front = y - h * 0.12, depth = h * 0.72;
    // décor des bords
    for (const side of [-1, 1]) { const e = row.edge[side]; if (e) this.drawEdge(c, row, e, side, front, depth, t); }
    // éléments fixes
    for (const [col, kind] of row.blocks) this.drawBlock(c, kind, this.colX(col), front, depth, t, row);
    if (row.type === 'lily') for (const col of row.lilies) this.drawLily(c, this.colX(col), y - h * 0.5, t, col);
    // objets à ramasser
    for (const [col, kind] of row.pick) this.drawPickup(c, kind, this.colX(col), front - depth * 0.4, t);
    // mobiles
    for (const v of row.items) {
      const x0 = this.offX + v.x * cell, x1 = x0 + v.len * cell;
      if (x1 < -cell || x0 > this.g.W + cell) continue;
      if (row.type === 'road') this.drawVehicle(c, v, x0, x1, front, depth, row.dir, t);
      else this.drawFloat(c, v, x0, x1, y, h, t);
    }
    if (row.train && row.train.state === 'pass') this.drawTrain(c, row, front, depth);
    if (row.fanions) this.drawFanions(c, y - h, t);
    if (row.banner) this.drawBanner(c, y, t);
  }

  // ---------------- décor des bords (hors zone de jeu)
  drawEdge(c, row, e, side, front, depth, t) {
    const cell = this.cell, xIn = side < 0 ? this.offX : this.offX + COLS * this.cell;
    const x0 = side < 0 ? xIn - cell * 1.5 : xIn + cell * 0.04, x1 = side < 0 ? xIn - cell * 0.04 : xIn + cell * 1.5;
    if (e.kind === 'house') {
      const hh = e.h * cell, col = this.adult ? '#3a1a52' : e.col;
      this.box(c, x0, x1, front, depth, hh, col);
      // fenêtres sur la face avant
      for (let k = 0; k < 2; k++) for (let j = 0; j < Math.floor(e.h); j++) {
        const wx = x0 + (x1 - x0) * (0.2 + k * 0.42), wy = front - hh + cell * (0.25 + j * 0.85), ww = (x1 - x0) * 0.2, wh = cell * 0.42;
        c.fillStyle = this.adult ? ((k + j + row.r) % 3 ? '#ffcf5f' : '#ff5fd2') : '#43586b'; c.fillRect(wx, wy, ww, wh);
        if (!this.adult) { c.fillStyle = e.sh; c.fillRect(wx - ww * 0.35, wy, ww * 0.3, wh); c.fillRect(wx + ww * 1.05, wy, ww * 0.3, wh); }
        if (e.flowers && j === 0) { c.fillStyle = this.adult ? '#ff9cf0' : '#e0262c'; c.fillRect(wx - ww * 0.1, wy + wh, ww * 1.2, cell * 0.08); }
      }
      // toit brun
      c.fillStyle = this.adult ? '#1a0828' : '#7a4a3a'; c.fillRect(x0 - cell * 0.05, front - hh - depth - cell * 0.18, x1 - x0 + cell * 0.1, depth + cell * 0.2);
      c.fillStyle = this.adult ? '#2a1238' : '#8a5240'; c.fillRect(x0 - cell * 0.05, front - hh - cell * 0.18, x1 - x0 + cell * 0.1, cell * 0.18);
    } else if (e.kind === 'tree') this.drawBlock(c, 'tree', (x0 + x1) / 2, front, depth, t, row);
    else if (e.kind === 'lamp') {
      const x = side < 0 ? x1 - cell * 0.2 : x0 + cell * 0.2;
      c.fillStyle = '#2d2d2d'; c.fillRect(x - 2, front - cell * 1.7, 4, cell * 1.7);
      c.fillStyle = this.adult ? '#ff9cf0' : '#ffe9a6'; c.fillRect(x - cell * 0.12, front - cell * 1.85, cell * 0.24, cell * 0.16);
      if (this.adult) { c.fillStyle = 'rgba(255,156,240,0.15)'; c.beginPath(); c.arc(x, front - cell * 1.8, cell * 0.6, 0, 7); c.fill(); }
    } else if (e.kind === 'signal') {
      const x = side < 0 ? x1 - cell * 0.25 : x0 + cell * 0.25, warn = row.train.state !== 'wait';
      c.fillStyle = '#333'; c.fillRect(x - 2, front - cell * 1.4, 4, cell * 1.4);
      c.fillStyle = '#fff'; c.fillRect(x - cell * 0.3, front - cell * 1.35, cell * 0.6, cell * 0.12);
      c.fillStyle = '#c81e1e'; c.fillRect(x - cell * 0.3, front - cell * 1.23, cell * 0.6, cell * 0.06);
      for (const dx of [-0.16, 0.16]) { const on = warn && (Math.floor(t * 6) % 2 === (dx > 0 ? 1 : 0)); c.fillStyle = on ? '#ff3b3b' : '#4a1010'; c.beginPath(); c.arc(x + dx * cell, front - cell * 1.05, cell * 0.1, 0, 7); c.fill(); }
    } else if (e.kind === 'reeds') {
      c.strokeStyle = this.adult ? '#4a6a5a' : '#4f8a35'; c.lineWidth = 2;
      for (let k = 0; k < 4; k++) { const x = x0 + (x1 - x0) * (0.2 + k * 0.2); c.beginPath(); c.moveTo(x, front); c.lineTo(x + Math.sin(t * 2 + k) * 3, front - cell * 0.7); c.stroke(); }
    } else if (e.kind === 'castle') {
      const xa = side < 0 ? xIn - cell * 3.2 : xIn, xb = xa + cell * 3.2, hh = cell * 2.6;
      const stone = this.adult ? '#4b2b6b' : '#e3d7bf';
      this.box(c, xa, xb, front, depth, hh, stone);
      const tx = side < 0 ? xb - cell * 0.9 : xa, tw = cell * 0.9;
      this.box(c, tx, tx + tw, front + 1, depth, hh * 1.55, this.adult ? '#5d3a80' : '#efe6d2');
      c.fillStyle = this.adult ? '#6d1b52' : '#9a4a33';
      c.beginPath(); c.moveTo(tx - cell * 0.1, front - hh * 1.55 - depth); c.lineTo(tx + tw / 2, front - hh * 1.55 - depth - cell * 1.1); c.lineTo(tx + tw + cell * 0.1, front - hh * 1.55 - depth); c.fill();
      c.fillStyle = this.adult ? '#ff5fd2' : '#3b3326';
      for (let k = 0; k < 3; k++) c.fillRect(xa + cell * (0.3 + k * 0.7), front - hh * 0.65, cell * 0.25, cell * 0.4);
      c.fillStyle = '#fff'; c.font = `900 ${Math.max(9, cell * 0.28)}px Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('CHÂTEAU', (xa + xb) / 2, front - hh * 0.2);
    }
  }

  // ---------------- obstacles fixes
  drawBlock(c, kind, x, front, depth, t, row) {
    const cell = this.cell, A = this.adult;
    const w = cell * 0.8, x0 = x - w / 2, x1 = x + w / 2;
    switch (kind) {
      case 'tree': {
        this.shadow(c, x0, x1, front, depth);
        this.box(c, x - cell * 0.1, x + cell * 0.1, front - depth * 0.3, depth * 0.3, cell * 0.4, A ? '#3a2238' : '#7a5236');
        this.box(c, x0, x1, front - depth * 0.15, depth * 0.75, cell * 0.65, A ? '#2a5a4a' : '#4f9a3a');
        this.box(c, x0 + w * 0.15, x1 - w * 0.15, front - depth * 0.3, depth * 0.5, cell * 1.05, A ? '#367060' : '#62b048');
        if (A) for (let k = 0; k < 3; k++) { c.fillStyle = k % 2 ? '#ff5fd2' : '#4fe3ff'; c.fillRect(x0 + w * (0.2 + k * 0.3), front - cell * 0.8, 3, 3); }
        break;
      }
      case 'sapin': {
        this.shadow(c, x0, x1, front, depth);
        this.box(c, x - cell * 0.08, x + cell * 0.08, front - depth * 0.3, depth * 0.3, cell * 0.3, '#6b4226');
        const cols = A ? ['#1c4a3a', '#22584a', '#2a6a5a'] : ['#2f6b45', '#3a7d52', '#469160'];
        for (let k = 0; k < 3; k++) { const ww = w * (1 - k * 0.25); this.box(c, x - ww / 2, x + ww / 2, front - depth * (0.15 + k * 0.08), depth * (0.7 - k * 0.15), cell * (0.55 + k * 0.38), cols[k]); }
        c.fillStyle = A ? '#e8dcff' : '#ffffff'; c.fillRect(x - w * 0.12, front - cell * 1.4 - depth * 0.4, w * 0.24, cell * 0.1);
        break;
      }
      case 'rock': this.shadow(c, x0, x1, front, depth); this.box(c, x0 + w * 0.08, x1 - w * 0.05, front, depth * 0.7, cell * 0.42, A ? '#4a3a6a' : '#8d9096'); this.box(c, x0 + w * 0.3, x1 - w * 0.25, front - depth * 0.2, depth * 0.4, cell * 0.6, A ? '#5a4a7a' : '#a3a6ad'); break;
      case 'bench': this.box(c, x0, x1, front, depth * 0.35, cell * 0.28, A ? '#5a2a7a' : '#8b5a33'); this.box(c, x0, x1, front - depth * 0.4, depth * 0.15, cell * 0.55, A ? '#5a2a7a' : '#8b5a33'); c.fillStyle = '#2a2a2a'; c.fillRect(x0 + 2, front - cell * 0.16, 3, cell * 0.16); c.fillRect(x1 - 5, front - cell * 0.16, 3, cell * 0.16); break;
      case 'hay': this.shadow(c, x0, x1, front, depth); this.box(c, x0, x1, front, depth * 0.8, cell * 0.5, A ? '#7a6a3a' : '#e8c35a'); c.fillStyle = A ? '#5a4a2a' : '#c9a23a'; c.fillRect(x0, front - cell * 0.32, w, 3); c.fillRect(x0 + w * 0.48, front - cell * 0.5 - depth * 0.8, 3, depth * 0.8); break;
      case 'pot': this.box(c, x - w * 0.3, x + w * 0.3, front, depth * 0.5, cell * 0.35, A ? '#3a2052' : '#b8643a'); for (let k = 0; k < 5; k++) { c.fillStyle = A ? '#ff9cf0' : ['#e0262c', '#ffb020', '#ff6b8a'][k % 3]; c.beginPath(); c.arc(x - w * 0.2 + k * w * 0.1, front - cell * 0.35 - depth * 0.35 - (k % 2) * 4, cell * 0.08, 0, 7); c.fill(); } break;
      case 'cow': {
        this.shadow(c, x0 - cell * 0.1, x1 + cell * 0.1, front, depth);
        const bob = Math.sin(t * 2 + row.r) * 1.5;
        this.box(c, x0 - cell * 0.05, x1 - cell * 0.15, front - depth * 0.1, depth * 0.6, cell * 0.5 + bob, '#f7f7f2');
        c.fillStyle = '#1b1b1b'; c.fillRect(x0 + w * 0.15, front - cell * 0.45 - bob, w * 0.25, cell * 0.2); c.fillRect(x0 + w * 0.55, front - cell * 0.3 - bob, w * 0.18, cell * 0.14);
        this.box(c, x1 - cell * 0.25, x1 + cell * 0.12, front - depth * 0.15, depth * 0.45, cell * 0.68 + bob, '#f7f7f2');
        c.fillStyle = '#f3b6b6'; c.fillRect(x1 - cell * 0.2, front - cell * 0.4 - bob, cell * 0.28, cell * 0.12);
        c.fillStyle = '#111'; c.fillRect(x1 - cell * 0.18, front - cell * 0.6 - bob, 3, 3); c.fillRect(x1, front - cell * 0.6 - bob, 3, 3);
        c.fillStyle = '#d4a42a'; c.fillRect(x1 - cell * 0.1, front - cell * 0.28 - bob, cell * 0.12, cell * 0.12);
        c.fillStyle = '#1b1b1b'; for (const lx of [0.05, 0.3, 0.55]) c.fillRect(x0 + w * lx, front - cell * 0.12, 4, cell * 0.12);
        break;
      }
      case 'fountain': {
        this.shadow(c, x0 - cell * 0.4, x1 + cell * 0.4, front, depth);
        this.box(c, x0 - cell * 0.35, x1 + cell * 0.35, front, depth * 0.85, cell * 0.35, A ? '#3a2052' : '#cfc6b4');
        c.fillStyle = A ? '#ff5fd2' : '#7cc7f0'; c.fillRect(x0 - cell * 0.28, front - cell * 0.35 - depth * 0.78, w + cell * 0.56, depth * 0.7);
        this.box(c, x - cell * 0.12, x + cell * 0.12, front - depth * 0.35, depth * 0.25, cell * 1.0, A ? '#4a2a66' : '#d9d0bd');
        for (let k = 0; k < 7; k++) { c.fillStyle = A ? '#ff9cf0' : ['#e0262c', '#ffb020', '#d94fa0', '#3f7a2c'][k % 4]; c.beginPath(); c.arc(x - cell * 0.2 + k * cell * 0.065, front - cell * 1.05 - depth * 0.55 - (k % 3) * 3, cell * 0.07, 0, 7); c.fill(); }
        c.strokeStyle = 'rgba(220,240,255,0.9)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + cell * 0.1, front - cell * 0.7); c.quadraticCurveTo(x + cell * 0.35, front - cell * 0.75 + Math.sin(t * 8) * 1.5, x + cell * 0.42, front - cell * 0.42); c.stroke();
        break;
      }
      case 'terrace': {
        this.box(c, x - w * 0.35, x + w * 0.35, front - depth * 0.25, depth * 0.4, cell * 0.42, A ? '#5a2a7a' : '#8a8f94');
        c.fillStyle = '#f5b82e'; c.fillRect(x - w * 0.15, front - cell * 0.62 - depth * 0.4, cell * 0.1, cell * 0.16); c.fillRect(x + w * 0.05, front - cell * 0.6 - depth * 0.4, cell * 0.1, cell * 0.14);
        c.fillStyle = A ? '#ff2fc4' : '#e94b3c'; c.fillRect(x - 1.5, front - cell * 1.35, 3, cell * 0.95);
        c.beginPath(); c.moveTo(x - w * 0.7, front - cell * 1.15); c.lineTo(x, front - cell * 1.55); c.lineTo(x + w * 0.7, front - cell * 1.15); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - w * 0.25, front - cell * 1.3); c.lineTo(x, front - cell * 1.55); c.lineTo(x + w * 0.25, front - cell * 1.3); c.fill();
        break;
      }
      case 'blonde': drawBlonde(c, x, front - depth * 0.3, cell * 1.9, t, { wink: Math.sin(t * 3) > 0.3, kiss: Math.sin(t * 1.5) > 0.6 ? 1 : 0 }); break;
    }
  }

  drawLily(c, x, y, t, col) {
    const cell = this.cell, bob = Math.sin(t * 2 + col) * 1.5;
    if (this.adult) { c.fillStyle = '#ff5fd2'; c.beginPath(); c.ellipse(x, y + bob, cell * 0.38, cell * 0.2, 0, 0, 7); c.fill(); return; }
    // meule de gruyère flottante
    c.fillStyle = '#c99a3a'; c.beginPath(); c.ellipse(x, y + 3 + bob, cell * 0.4, cell * 0.2, 0, 0, 7); c.fill();
    c.fillStyle = '#f7d35c'; c.beginPath(); c.ellipse(x, y + bob, cell * 0.4, cell * 0.2, 0, 0, 7); c.fill();
    c.fillStyle = '#e2b843'; c.beginPath(); c.arc(x - cell * 0.12, y + bob, cell * 0.04, 0, 7); c.arc(x + cell * 0.1, y - cell * 0.05 + bob, cell * 0.03, 0, 7); c.fill();
  }

  drawPickup(c, kind, x, y, t) {
    const s = this.cell * 0.5, bob = Math.sin(t * 5 + x) * 3, yy = y - s * 0.4 + bob;
    c.fillStyle = 'rgba(0,0,0,0.15)'; c.beginPath(); c.ellipse(x, y + s * 0.2, s * 0.35, s * 0.1, 0, 0, 7); c.fill();
    if (kind === 'heart') { heart(c, x, yy - s * 0.2, s * 1.1, '#ff2fa8'); return; }
    if (kind === 'golden') { c.fillStyle = 'rgba(255,215,0,0.35)'; c.beginPath(); c.arc(x, yy - s * 0.3, s * (0.75 + 0.1 * Math.sin(t * 8)), 0, 7); c.fill(); }
    c.fillStyle = kind === 'golden' ? '#ffd700' : '#f5b82e'; rr(c, x - s * 0.28, yy - s * 0.7, s * 0.56, s * 0.7, s * 0.08); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 2; c.beginPath(); c.arc(x + s * 0.28, yy - s * 0.38, s * 0.16, -1.3, 1.3); c.stroke();
    c.fillStyle = '#fffdf5'; c.beginPath(); c.arc(x - s * 0.15, yy - s * 0.7, s * 0.16, 0, 7); c.arc(x + s * 0.08, yy - s * 0.75, s * 0.18, 0, 7); c.arc(x + s * 0.25, yy - s * 0.7, s * 0.12, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(x - s * 0.18, yy - s * 0.58, s * 0.08, s * 0.45);
  }

  // ---------------- véhicules
  drawVehicle(c, v, x0, x1, front, depth, dir, t) {
    const cell = this.cell, A = this.adult, len = x1 - x0;
    this.shadow(c, x0, x1, front, depth);
    const col = A ? pick2(['#ff2fc4', '#9b3cff', '#4fe3ff'], v) : v.color;
    if (v.kind === 'car') {
      this.box(c, x0, x1, front - 1, depth * 0.85, cell * 0.32, col);
      const cx0 = x0 + len * (dir > 0 ? 0.2 : 0.3), cx1 = x0 + len * (dir > 0 ? 0.7 : 0.8);
      this.box(c, cx0, cx1, front - depth * 0.2, depth * 0.55, cell * 0.6, col);
      c.fillStyle = A ? '#ffd6f6' : '#bfe3f5'; c.fillRect(cx0 + 3, front - depth * 0.2 - cell * 0.55, cx1 - cx0 - 6, cell * 0.2);
    } else if (v.kind === 'bus') {
      this.box(c, x0, x1, front - 1, depth * 0.9, cell * 0.9, A ? '#9b3cff' : '#f2b51d');
      c.fillStyle = A ? '#ffd6f6' : '#bfe3f5';
      for (let k = 0; k < 5; k++) c.fillRect(x0 + len * (0.06 + k * 0.19), front - cell * 0.78, len * 0.14, cell * 0.28);
      c.fillStyle = A ? '#fff' : '#1d1d1d'; c.font = `900 ${Math.max(7, cell * 0.2)}px Nunito`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(A ? 'LOVE BUS' : 'BULLE – GRUYÈRES', (x0 + x1) / 2, front - cell * 0.25, len * 0.9);
    } else if (v.kind === 'tractor') {
      const g = A ? '#3dbb6e' : '#2f8a3a';
      this.box(c, x0, x1, front - cell * 0.1, depth * 0.7, cell * 0.38, g);
      const cab = dir > 0 ? [x0, x0 + len * 0.45] : [x1 - len * 0.45, x1];
      this.box(c, cab[0], cab[1], front - depth * 0.15, depth * 0.55, cell * 0.85, g);
      c.fillStyle = '#bfe3f5'; c.fillRect(cab[0] + 3, front - cell * 0.8, cab[1] - cab[0] - 6, cell * 0.25);
      c.fillStyle = '#1d1d1d';
      const big = dir > 0 ? x0 + len * 0.15 : x1 - len * 0.35; c.fillRect(big, front - cell * 0.35, len * 0.22, cell * 0.38);
      const sm = dir > 0 ? x1 - len * 0.25 : x0 + len * 0.08; c.fillRect(sm, front - cell * 0.22, len * 0.16, cell * 0.24);
      c.fillStyle = '#555'; const ex = dir > 0 ? x1 - len * 0.3 : x0 + len * 0.25; c.fillRect(ex, front - cell * 0.85, 3, cell * 0.4);
      if (Math.sin(t * 9 + v.x) > 0.6) { c.fillStyle = 'rgba(120,120,120,0.45)'; c.beginPath(); c.arc(ex + 1, front - cell * 0.95, cell * 0.1, 0, 7); c.fill(); }
    } else if (v.kind === 'fondue') { // char à fondue
      this.box(c, x0, x1, front - cell * 0.12, depth * 0.7, cell * 0.3, A ? '#5a2a7a' : '#7a4a24');
      c.fillStyle = A ? '#ff2fc4' : '#c0392b'; c.beginPath(); c.ellipse((x0 + x1) / 2, front - cell * 0.5 - depth * 0.3, len * 0.3, cell * 0.16, 0, 0, 7); c.fill();
      c.fillStyle = '#ffe08a'; c.beginPath(); c.ellipse((x0 + x1) / 2, front - cell * 0.6 - depth * 0.3, len * 0.26, cell * 0.08, 0, 0, 7); c.fill();
    }
    // roues + phares
    if (v.kind !== 'tractor') { c.fillStyle = '#1d1d1d'; c.fillRect(x0 + len * 0.12, front - cell * 0.12, len * 0.18, cell * 0.14); c.fillRect(x1 - len * 0.3, front - cell * 0.12, len * 0.18, cell * 0.14); }
    c.fillStyle = A ? '#ff9cf0' : '#fff6b0'; const hx = dir > 0 ? x1 - 4 : x0; c.fillRect(hx, front - cell * 0.3, 4, cell * 0.1);
    if (A) { c.fillStyle = 'rgba(255,156,240,0.18)'; c.beginPath(); c.moveTo(hx + 2, front - cell * 0.25); c.lineTo(hx + dir * cell * 1.4, front - cell * 0.55); c.lineTo(hx + dir * cell * 1.4, front + cell * 0.05); c.fill(); }
  }
  drawTrain(c, row, front, depth) {
    const cell = this.cell, tr = row.train, x0 = this.offX + tr.x * cell, x1 = x0 + tr.len * cell, A = this.adult;
    this.box(c, x0, x1, front - 1, depth * 0.95, cell * 1.05, A ? '#ff2fc4' : '#d72a2a');
    c.fillStyle = A ? '#2a0c3d' : '#ffffff'; c.fillRect(x0, front - cell * 0.38, x1 - x0, cell * 0.12);
    c.fillStyle = A ? '#ffd6f6' : '#bfe3f5';
    for (let x = x0 + cell * 0.4; x < x1 - cell * 0.6; x += cell * 0.9) c.fillRect(x, front - cell * 0.92, cell * 0.55, cell * 0.36);
    c.fillStyle = A ? '#fff' : '#ffffff'; c.font = `900 ${Math.max(8, cell * 0.24)}px Nunito`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(A ? 'TRAIN DE NUIT 💋' : 'GRUYÈRE EXPRESS', (x0 + x1) / 2, front - cell * 0.2);
    c.fillStyle = '#ffe16b'; const hx = row.dir > 0 ? x1 - 5 : x0; c.fillRect(hx, front - cell * 0.6, 5, cell * 0.15);
  }
  drawFloat(c, v, x0, x1, y, h, t) {
    const cell = this.cell, bob = Math.sin(t * 2.2 + v.x) * 1.5, yc = y - h * 0.5 + bob, A = this.adult;
    if (v.kind === 'log') {
      c.fillStyle = A ? '#3a2052' : '#6b4226'; rr(c, x0, yc - h * 0.3, x1 - x0, h * 0.6, h * 0.25); c.fill();
      c.fillStyle = A ? '#5a3a7a' : '#8b5a33'; rr(c, x0, yc - h * 0.32, x1 - x0, h * 0.4, h * 0.2); c.fill();
      c.strokeStyle = A ? '#7a5a9a' : '#a87444'; c.lineWidth = 1.5;
      for (let x = x0 + cell * 0.5; x < x1 - cell * 0.3; x += cell * 0.7) { c.beginPath(); c.moveTo(x, yc - h * 0.28); c.lineTo(x + cell * 0.15, yc - h * 0.12); c.stroke(); }
      c.fillStyle = A ? '#9a7aba' : '#d9b07a'; c.beginPath(); c.ellipse(x1 - h * 0.15, yc - h * 0.05, h * 0.15, h * 0.26, 0, 0, 7); c.fill();
      c.strokeStyle = A ? '#5a3a7a' : '#8b5a33'; c.lineWidth = 1; c.beginPath(); c.ellipse(x1 - h * 0.15, yc - h * 0.05, h * 0.07, h * 0.13, 0, 0, 7); c.stroke();
    } else { // radeau de fromage (gruyère : petits trous !)
      c.fillStyle = A ? '#7a3a8a' : '#d9a83a'; rr(c, x0, yc - h * 0.22, x1 - x0, h * 0.5, h * 0.12); c.fill();
      c.fillStyle = A ? '#ff9cf0' : '#f7d35c'; rr(c, x0, yc - h * 0.34, x1 - x0, h * 0.4, h * 0.12); c.fill();
      c.fillStyle = A ? '#c95ab8' : '#e2b843';
      for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x0 + (x1 - x0) * (0.2 + k * 0.2), yc - h * 0.16 + (k % 2) * 3, Math.max(1.5, cell * 0.04), 0, 7); c.fill(); }
    }
    c.strokeStyle = this.pal.foam; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x0 - 4, yc + h * 0.3); c.lineTo(x1 + 4, yc + h * 0.3); c.stroke();
  }
  drawFanions(c, yTop, t) {
    const W = this.g.W, cell = this.cell, y0 = yTop - cell * 1.2;
    c.strokeStyle = 'rgba(40,40,40,0.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, y0); c.quadraticCurveTo(W / 2, y0 + cell * 0.5, W, y0); c.stroke();
    const cols = this.adult ? ['#ff2fc4', '#4fe3ff'] : ['#f6c21c', '#d92b2b', '#1f5fbf', '#f08a1c'];
    for (let i = 1; i < 14; i++) { const k = i / 14, x = W * k, y = y0 + cell * 2 * k * (1 - k); c.fillStyle = cols[i % cols.length]; c.beginPath(); c.moveTo(x - cell * 0.18, y); c.lineTo(x + cell * 0.18, y); c.lineTo(x + Math.sin(t * 3 + i) * 2, y + cell * 0.45); c.fill(); }
  }
  drawBanner(c, y, t) {
    const W = this.g.W, cell = this.cell, by = y - this.cellH * 1.05 - cell * 0.95;
    c.fillStyle = this.adult ? '#16001f' : '#fff3d6'; rr(c, W * 0.18, by, W * 0.64, cell * 0.55, cell * 0.12); c.fill();
    c.strokeStyle = this.adult ? '#ff3ccf' : '#c8202c'; c.lineWidth = 3; c.stroke();
    c.fillStyle = this.adult ? '#ffd6f6' : '#c8202c'; c.font = `900 ${cell * 0.3}px Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(this.adult ? 'PLACE DU MARCHÉ · BY NIGHT' : 'PLACE DU MARCHÉ · BULLE', W / 2, by + cell * 0.28, W * 0.6);
  }

  // ---------------- Ramo
  drawRamo(c, t) {
    const p = this.p, img = this.g.img.full, cell = this.cell;
    let pc = p.t < 1 ? p.fc + (p.c - p.fc) * p.t : p.c, pr = p.t < 1 ? p.fr + (p.r - p.fr) * p.t : p.r;
    if (p.dead) { pc = p.deadC; pr = p.deadR; if (p.onLog && p.dead === 'water') pc = p.deadC; }
    const x = this.colX(pc), yGround = this.rowY(pr) - this.cellH * 0.38;
    const hgt = cell * 1.8, w = hgt * (528 / 620);
    const arc = p.t < 1 ? Math.sin(p.t * Math.PI) * cell * 0.55 : 0;
    let sx = 1, sy = 1, rot = 0, dy = 0, alpha = 1;
    if (p.t < 1) { sy = 1 + Math.sin(p.t * Math.PI) * 0.12; sx = 1 - Math.sin(p.t * Math.PI) * 0.08; }
    else if (p.bump > 0) { sx = 1.1; sy = 0.9; }
    else { const br = Math.sin(t * 4) * 0.02; sy = 1 + br; }
    if (p.dead === 'car') { const k = Math.min(1, p.deadT * 8); sy = 1 - 0.82 * k; sx = 1 + 0.5 * k; }
    if (p.dead === 'train') { dy = -p.deadT * cell * 14; rot = p.deadT * 9; }
    if (p.dead === 'water') { dy = Math.min(1, p.deadT * 1.6) * hgt * 0.8; alpha = Math.max(0, 1 - p.deadT * 0.9); }
    if (p.dead === 'eagle' && this.eagle && this.eagle.t > 0.55) dy = -(this.eagle.t - 0.55) * cell * 9;
    // ombre
    if (p.dead !== 'train' && !(p.dead === 'eagle' && this.eagle && this.eagle.t > 0.6)) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(x, yGround + 2, w * 0.34 * (1 - arc / cell * 0.4), cell * 0.12, 0, 0, 7); c.fill(); }
    if (p.inv > 0 && Math.floor(p.inv * 12) % 2 === 0) return;
    c.save(); c.globalAlpha = alpha;
    c.translate(x, yGround - arc + dy); c.rotate(rot); c.scale(sx * (p.face < 0 ? -1 : 1), sy);
    if (p.dead === 'water') { c.beginPath(); c.rect(-w, -hgt * 2, w * 2, hgt * 2 - dy); c.clip(); }
    c.drawImage(img, -w / 2, -hgt, w, hgt);
    const fx = {};
    if (p.dead) fx.surprise = 1; else if (this.shield > 0) fx.wink = Math.sin(t * 3) > 0.5;
    faceOverlay(c, RAMO_FULL, w / 528, -w / 2, -hgt, fx);
    c.restore();
    if (this.shield > 0 && !p.dead) { c.strokeStyle = `rgba(255,215,0,${0.5 + 0.4 * Math.sin(t * 12)})`; c.lineWidth = 3; c.beginPath(); c.ellipse(x, yGround - arc - hgt * 0.5, w * 0.62, hgt * 0.6, 0, 0, 7); c.stroke(); }
    if (p.dead === 'water' && p.deadT < 1.2) { c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 2; for (let k = 0; k < 3; k++) { const rr2 = cell * (0.3 + p.deadT * 0.8 + k * 0.25); c.beginPath(); c.ellipse(x, yGround, rr2, rr2 * 0.35, 0, 0, 7); c.stroke(); } }
  }

  drawEagle(c, t) {
    const e = this.eagle, p = this.p, cell = this.cell;
    const tx = this.colX(p.deadC), ty = this.rowY(p.deadR) - cell * 1.2;
    const k = Math.min(1, e.t / 0.55);
    const x = tx + (1 - k) * cell * 3, y = e.t < 0.55 ? -cell * 2 + (ty + cell * 2) * k : ty - (e.t - 0.55) * cell * 9;
    const flap = Math.sin(t * 18) * 0.5, s = cell * 1.2;
    c.save(); c.translate(x, y - s * 0.6);
    c.fillStyle = '#5a3a1e';
    for (const d of [-1, 1]) { c.beginPath(); c.moveTo(0, 0); c.lineTo(d * s * 1.6, -s * (0.3 + flap)); c.lineTo(d * s * 1.3, s * 0.2); c.closePath(); c.fill(); }
    c.fillStyle = '#6b4626'; c.beginPath(); c.ellipse(0, 0, s * 0.35, s * 0.55, 0, 0, 7); c.fill();
    c.fillStyle = '#f4f1e8'; c.beginPath(); c.arc(0, -s * 0.55, s * 0.25, 0, 7); c.fill();
    c.fillStyle = '#f2b51d'; c.beginPath(); c.moveTo(-s * 0.06, -s * 0.5); c.lineTo(s * 0.06, -s * 0.5); c.lineTo(0, -s * 0.3); c.fill();
    c.fillStyle = '#111'; c.fillRect(-s * 0.12, -s * 0.62, 3, 3); c.fillRect(s * 0.08, -s * 0.62, 3, 3);
    c.restore();
  }

  drawStartHint(c, t) {
    const W = this.g.W, H = this.g.H, k = 0.85 + 0.15 * Math.sin(t * 5);
    c.save(); c.translate(W / 2, H * 0.36); c.scale(k, k);
    c.font = `${Math.min(W * 0.11, 52)}px "Luckiest Guy", Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 9; c.strokeStyle = this.adult ? '#3a0040' : '#6b2a00'; c.strokeText('TAPE POUR SAUTER !', 0, 0);
    c.fillStyle = this.adult ? '#ff4fd8' : '#ffcf2e'; c.fillText('TAPE POUR SAUTER !', 0, 0);
    c.font = '900 16px Nunito, sans-serif'; c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,0.5)';
    const s2 = 'Glisse ← → pour changer de colonne'; c.strokeText(s2, 0, 46); c.fillStyle = '#fff'; c.fillText(s2, 0, 46);
    c.restore();
  }
}

// couleur stable par véhicule (mode nuit)
function pick2(arr, v) { return arr[Math.abs(Math.floor(v.len * 10 + (v.color || '').length)) % arr.length]; }
