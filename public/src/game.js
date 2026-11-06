// =====================================================================
//  Moteur du runner 2.5D
// =====================================================================
import { GAME, PICKUPS, OBSTACLES, LEVELS, MSG_CLASSIC, MSG_ADULT, MSG_HIT, MSG_BLONDE, MSG_LOVE_OUT } from './config.js';
import * as D from './draw.js';
import * as S from './scene.js';
import { drawBlonde } from './blonde.js';
import { sfx } from './audio.js';

const { rand, pick } = D;

export class Game {
  constructor(canvas, images, ui) {
    this.cv = canvas; this.c = canvas.getContext('2d');
    this.img = images; this.ui = ui;
    this.level = LEVELS[0];
    this.state = 'idle'; // idle | play | pause | love | over
    this.t = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.loop = this.loop.bind(this);
    this.last = performance.now();
    this.reset('classic');
    requestAnimationFrame(this.loop);
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth, H = window.innerHeight;
    this.W = W; this.H = H; this.dpr = dpr;
    this.cv.width = Math.round(W * dpr); this.cv.height = Math.round(H * dpr);
    this.cv.style.width = W + 'px'; this.cv.style.height = H + 'px';
    const hor = H * 0.36, baseY = H * 0.84, Dd = 9;
    const laneW = Math.min(W * 0.29, H * 0.17);
    this.P = {
      hor, baseY, laneW, unit: laneW,
      s: (z) => Dd / (Dd + z),
      y: (z) => hor + (baseY - hor) * (Dd / (Dd + z)),
      x: (lane, z) => W / 2 + lane * laneW * (Dd / (Dd + z)),
    };
    this.ramoH = Math.min(H * 0.25, W * 0.4 * (620 / 528));
  }

  reset(mode) {
    this.mode = mode;
    this.adult = mode === 'adult';
    this.speed = GAME.startSpeed;
    this.travel = 0; this.elapsed = 0;
    this.score = 0; this.beerPts = 0; this.lives = GAME.lives; this.beers = 0;
    this.ents = []; this.decor = []; this.parts = [];
    this.rowCd = 30; this.decorCd = 0; this.lastSide = 1;
    this.castleCd = 120; this.hallCd = 60;
    this.p = { lane: 0, x: 0, jumpH: 0, vy: 0, slide: 0, inv: 0, hitAnim: 0, fx: {}, fxT: 0, wag: 0 };
    this.buffs = { invincible: 0, double: 0, heat: 0, crazy: 0 };
    this.blonde = null; // { t, kind }
    this.closeup = null;
    this.msgCd = 14; this.shake = 0; this.hints = [];
    this.loveDone = 0; this.sinceLove = 8; this.adultCd = 3; this.adultCycle = 0;
    // décor initial
    for (let z = -4; z < GAME.spawnFar; z += 0) z = this.spawnDecor(z);
  }

  start(mode) {
    this.reset(mode);
    this.state = 'play';
    this.hints = [
      { t: 2.6, text: '👈 👉 Glisse à gauche / à droite pour changer de voie' },
      { t: 6.2, text: '☝️ Glisse vers le haut pour sauter les tonneaux' },
      { t: 9.8, text: '👇 Glisse vers le bas sous les banderoles' },
      { t: 13.4, text: '🍺 Attrape un max de bières !' },
    ];
    this.ui.message(pick(['Le castor est lâché dans Bulle !', 'Mission apéro : GO !', 'Bulle n\'était pas prête pour ça !']));
    this.emitHud();
  }
  pause(on) { if (this.state === 'play' && on) this.state = 'pause'; else if (this.state === 'pause' && !on) { this.state = 'play'; this.last = performance.now(); } }

  // ------------------------------------------------ commandes
  input(dir) {
    if (this.state !== 'play') return;
    const p = this.p;
    if (dir === 'left' && p.lane > -1) { p.lane--; sfx.lane(); }
    else if (dir === 'right' && p.lane < 1) { p.lane++; sfx.lane(); }
    else if (dir === 'up' && p.jumpH <= 0.02 ) { p.vy = 3.3; p.slide = 0; sfx.jump(); }
    else if (dir === 'down') {
      if (p.jumpH > 0.05) p.vy = -5; // redescendre vite
      p.slide = 0.72; sfx.slide();
    }
  }

  // ------------------------------------------------ génération
  spawnDecor(z) {
    // façades de chaque côté, en continu
    const lvl = this.level;
    const cols = ['#ecd9b4', '#e3c193', '#d8d9bd', '#ecc6ad', '#e8dcc6', '#f1e4c6', '#cfd6d2', '#e7c9a4', '#d9c3a5'];
    const colsN = ['#2d1440', '#3a1a52', '#24113a', '#311648'];
    const shutters = ['#2f6b3a', '#8b2f23', '#355d8a', '#6b4a2b'];
    const signs = ['#7a1f12', '#2f5d3a', '#24476b', '#6b3a1f'];
    const awnings = ['#b8322a', '#2f6b3a', '#24476b', '#c47a1c', '#7a1f4a'];
    const len = rand(7, 11);
    for (const side of [-1, 1]) {
      if (this.castleCd <= 0 && side === this.lastSide) {
        this.decor.push({ kind: 'castle', side, z, len: 14 });
        continue;
      }
      if (this.hallCd <= 0 && side === -this.lastSide) {
        this.decor.push({ kind: 'townhall', side, z, len: len + 2, seed: 1 });
        this.hallCd = rand(450, 650);
        continue;
      }
      this.decor.push({
        kind: 'building', side, z: z + (side > 0 ? 0 : rand(-2, 2)), len, h: rand(3.6, 5.4), floors: Math.random() < 0.5 ? 2 : 3,
        col: pick(cols), colN: pick(colsN), roof: pick(['#8b3a2a', '#6e2f23', '#7a4a3a']), shutter: pick(shutters), signCol: pick(signs), awning: pick(awnings),
        sign: pick(this.adult ? lvl.adultShops : lvl.shops), seed: Math.floor(rand(0, 9)),
      });
      const r = Math.random();
      if (r < 0.5) this.decor.push({ kind: r < 0.22 ? 'terrace' : r < 0.46 ? 'lamp' : 'kiosk', side, z: z + rand(1, len - 1), flag: Math.random() < 0.5 ? 'ch' : 'fr' });
    }
    if (this.castleCd <= 0) { this.castleCd = rand(260, 380); this.lastSide *= -1; return z + 15; }
    return z + len + 0.4;
  }

  spawnRow(z) {
    const d = Math.min(1, this.elapsed / 110);
    const lanes = [-1, 0, 1];
    const obs = {};
    const easy = this.elapsed < 15;
    let n = !easy && Math.random() < 0.25 + 0.45 * d ? 2 : 1;
    let allowTriple = !easy && Math.random() < 0.18 * d;
    if (allowTriple) n = 3;
    const shuffled = lanes.sort(() => Math.random() - 0.5);
    for (let i = 0; i < n; i++) {
      const lane = shuffled[i];
      let type;
      const r = Math.random();
      if (n === 3) type = pick(['barrel', 'crate', 'barrier']); // jamais 3 blocs : toujours passable en sautant / glissant
      else type = r < 0.3 ? 'barrel' : r < 0.5 ? 'crate' : r < 0.72 ? 'barrier' : r < 0.87 ? 'cow' : 'cart';
      obs[lane] = type;
      this.ents.push({ kind: 'obs', type, lane, z, hit: false });
    }
    // une rangée de 3 obstacles ne contient jamais de bloc : il y a toujours un passage (saut / glissade / voie libre)
    // bières dans les voies libres, ou au-dessus d'un tonneau (à attraper en sautant)
    const free = lanes.filter((l) => !obs[l]);
    const beerLane = free.length ? pick(free) : null;
    if (beerLane !== null && Math.random() < 0.85) {
      const count = Math.floor(rand(3, 6));
      for (let i = 0; i < count; i++) this.ents.push({ kind: 'pick', type: 'beer', lane: beerLane, z: z - 4 - i * 2.6, high: false });
    }
    const jumpLane = lanes.find((l) => obs[l] === 'barrel' || obs[l] === 'crate');
    if (jumpLane !== undefined && Math.random() < 0.4) this.ents.push({ kind: 'pick', type: 'big', lane: jumpLane, z, high: true });
    // bonus
    const lane = free.length ? pick(free) : pick(lanes);
    if (this.adult && this.adultCd <= 0) {
      // After Dark : un bonus coquin garanti toutes les ~6 s, et une Love Room toutes les ~20 s
      let type;
      if (this.sinceLove > 20) { type = 'love'; this.sinceLove = 0; }
      else { type = ['charm', 'heat', 'charm', 'crazy'][this.adultCycle++ % 4]; }
      this.ents.push({ kind: 'pick', type, lane, z: z + 6, high: false });
      this.adultCd = rand(5, 7);
    } else if (Math.random() < 0.13) {
      const r = Math.random(); const type = r < 0.45 ? 'big' : r < 0.72 ? 'chope' : 'golden';
      this.ents.push({ kind: 'pick', type, lane, z: z + 6, high: false });
    }
    // en mode adulte : la blonde attend parfois sur le trottoir
    if (this.adult && Math.random() < 0.45) this.decor.push({ kind: 'blonde', side: Math.random() < 0.5 ? -1 : 1, z: z + rand(2, 8), waved: false });
  }

  // ------------------------------------------------ boucle
  loop(now) {
    let dt = (now - this.last) / 1000; this.last = now;
    if (dt > 0.05) dt = 0.05;
    this.t += dt;
    if (this.state === 'play') this.update(dt);
    else if (this.state === 'love') this.updateLove(dt);
    else if (this.state === 'over') this.updateParts(dt);
    this.render();
    requestAnimationFrame(this.loop);
  }

  update(dt) {
    const p = this.p, b = this.buffs;
    this.elapsed += dt; this.sinceLove += dt; this.adultCd -= dt;
    const heatBoost = b.heat > 0 ? 1.35 : 1;
    this.speed = Math.min(GAME.maxSpeed, this.speed + GAME.speedRamp * dt);
    const v = this.speed * heatBoost;
    const dz = v * dt;
    this.travel += dz;
    // joueur
    p.x += (p.lane - p.x) * Math.min(1, dt * 16);
    if (p.vy !== 0 || p.jumpH > 0) {
      p.jumpH += p.vy * dt; p.vy -= 7.2 * dt;
      if (p.jumpH <= 0) { p.jumpH = 0; p.vy = 0; }
    }
    if (p.slide > 0) p.slide -= dt;
    if (p.inv > 0) p.inv -= dt;
    if (p.hitAnim > 0) p.hitAnim -= dt;
    if (p.fxT > 0) { p.fxT -= dt; if (p.fxT <= 0) p.fx = {}; }
    for (const k in b) if (b[k] > 0) b[k] = Math.max(0, b[k] - dt);
    if (this.shake > 0) this.shake -= dt;
    // entités
    for (const e of this.ents) e.z -= dz;
    for (const e of this.decor) e.z -= dz;
    this.ents = this.ents.filter((e) => e.z > -4 && !e.gone);
    this.decor = this.decor.filter((e) => e.z + (e.len || 1) > -4);
    // génération
    this.rowCd -= dz;
    if (this.rowCd <= 0) { this.spawnRow(GAME.spawnFar); this.rowCd = this.speed * rand(0.78, 1.15) * (this.elapsed < 15 ? 1.4 : 1); }
    this.castleCd -= dz; this.hallCd -= dz;
    let far = Math.max(...this.decor.filter((d) => d.kind === 'building' || d.kind === 'castle' || d.kind === 'townhall').map((d) => d.z + d.len), 0);
    while (far < GAME.spawnFar + 20) far = this.spawnDecor(far);
    // collisions
    const pz = 0;
    for (const e of this.ents) {
      if (e.done) continue;
      if (Math.abs(e.z - pz) > 0.9) continue;
      const dl = Math.abs(e.lane - p.x);
      if (e.kind === 'pick') {
        if (dl < 0.6 && (e.high ? p.jumpH > 0.3 : p.jumpH < 0.8)) { e.done = true; e.gone = true; this.collect(e); }
      } else if (!e.hit && dl < 0.42) {
        const need = OBSTACLES[e.type].need;
        const avoided = (need === 'jump' && p.jumpH > 0.42) || (need === 'slide' && p.slide > 0 && p.jumpH < 0.2);
        if (avoided) { e.hit = true; if (Math.random() < 0.15) this.burst(this.ramoScreen().x, this.ramoScreen().y - this.ramoH * 0.9, 'text', 1, { text: pick(['Hop !', 'Olé !', 'Trop facile !']), color: '#fff' }); continue; }
        e.hit = true;
        if (p.inv > 0 || b.invincible > 0 || b.heat > 0) { e.gone = true; this.burst(this.P.x(e.lane, 0), this.P.y(0) - this.P.unit * 0.5, 'dot', 14, { color: '#c99a5b' }); continue; }
        this.hurt(e);
      }
    }
    // la blonde salue
    for (const d of this.decor) if (d.kind === 'blonde' && !d.waved && d.z < 8) { d.waved = true; if (Math.random() < 0.8) { sfx.wolf(); this.ui.message(pick(MSG_BLONDE)); } }
    // score
    const mult = b.double > 0 ? 2 : 1;
    this.score = this.beerPts + Math.floor(this.travel * GAME.metersPerUnit);
    // consignes de départ
    if (this.hints.length && this.elapsed >= this.hints[0].t) this.ui.message(this.hints.shift().text, 3.4);
    // messages aléatoires
    this.msgCd -= dt;
    if (this.msgCd <= 0) { this.ui.message(pick(this.adult && Math.random() < 0.7 ? MSG_ADULT : MSG_CLASSIC)); this.msgCd = rand(9, 15); }
    // blonde à l'écran (bonus charme)
    if (this.blonde) { this.blonde.t += dt; if (this.blonde.t > 3.2) this.blonde = null; }
    if (this.closeup) { this.closeup.t += dt; if (this.closeup.t > 1.6) this.closeup = null; }
    // pluie de cœurs / confettis
    if (b.crazy > 0 && Math.random() < 0.6) this.burst(rand(0, this.W), -10, Math.random() < 0.5 ? 'heart' : 'confetti', 1, { vy: rand(120, 260), color: pick(['#ff2fa8', '#ffd700', '#9b3cff', '#4fe3ff']) });
    if (b.heat > 0 && Math.random() < 0.5) { const r = this.ramoScreen(); this.burst(r.x + rand(-30, 30), r.y - rand(0, this.ramoH), 'dot', 1, { color: pick(['#ff5a1f', '#ffb21f', '#ff2f2f']), vy: -rand(40, 120) }); }
    this.updateParts(dt);
    this.mult = mult;
    this.emitHud();
  }

  collect(e) {
    const def = PICKUPS[e.type];
    const mult = this.buffs.double > 0 ? 2 : 1;
    const pts = def.points * mult;
    this.beerPts += pts;
    if (e.type === 'beer' || e.type === 'big' || e.type === 'golden' || e.type === 'chope') this.beers++;
    const r = this.ramoScreen();
    if (pts) this.burst(r.x, r.y - this.ramoH * 1.05, 'text', 1, { text: (mult > 1 && def.points ? `+${pts}` : def.label), color: e.type === 'golden' ? '#ffd700' : '#fff', size: e.type === 'beer' ? 18 : 26 });
    this.burst(r.x, r.y - this.ramoH * 0.6, 'dot', e.type === 'beer' ? 6 : 18, { color: e.type === 'golden' ? '#ffd700' : '#fffbe8' });
    switch (e.type) {
      case 'beer': sfx.beer(); if (Math.random() < 0.08) this.face({ wink: 1 }, 0.7); break;
      case 'big': sfx.big(); this.face({ wink: 1 }, 0.9); this.closeupShow('wink', pick(['Santé !', 'Une grande, une !', 'Glou glou glou…'])); break;
      case 'golden': sfx.golden(); this.buffs.invincible = def.duration; this.face({ surprise: 1 }, 1);
        this.closeupShow('surprise', 'BIÈRE DORÉE ! Invincible !'); this.burst(r.x, r.y - this.ramoH * 0.5, 'confetti', 30, { color: '#ffd700' }); break;
      case 'chope': sfx.chope(); this.buffs.double = def.duration; this.closeupShow('wink', 'SUPER CHOPE : points x2 !'); this.foam(); break;
      case 'heat': sfx.heat(); this.buffs.heat = def.duration; this.face({ blush: 1 }, def.duration); this.closeupShow('blush', 'COUP DE CHAUD ! 🔥'); break;
      case 'charm': sfx.kiss(); this.blonde = { t: 0 }; this.face({ blush: 1, surprise: 1 }, 2); this.closeupShow('hearts', 'Charme irrésistible ! +250');
        setTimeout(() => sfx.kiss(), 600); this.p.wag = 2.5; break;
      case 'crazy': sfx.wolf(); this.buffs.crazy = def.duration; this.closeupShow('hearts', 'NUIT DE FOLIE !'); this.burst(this.W / 2, this.H / 3, 'confetti', 50, {}); break;
      case 'love': this.startLove(); break;
    }
  }

  face(fx, dur) { this.p.fx = fx; this.p.fxT = dur; }
  closeupShow(expr, text) { this.closeup = { t: 0, expr }; if (text) this.ui.message(text); }
  foam() { const r = this.ramoScreen(); for (let i = 0; i < 24; i++) this.parts.push({ kind: 'dot', x: r.x, y: r.y - this.ramoH * 0.8, vx: rand(-160, 160), vy: rand(-380, -120), life: 0.9, max: 0.9, size: rand(4, 9), color: '#fffdf2', g: 600 }); }

  hurt(e) {
    const p = this.p;
    this.lives--; p.inv = GAME.hitInvuln; p.hitAnim = 0.6; this.shake = 0.35;
    sfx.hit();
    this.face({ surprise: 1 }, 0.8);
    this.closeupShow('grimace', pick(MSG_HIT));
    const r = this.ramoScreen();
    this.burst(r.x, r.y - this.ramoH * 0.5, 'dot', 20, { color: e.type === 'cow' ? '#fff' : '#b6733a' });
    this.burst(r.x, r.y - this.ramoH * 1.2, 'text', 1, { text: '★ ★ ★', color: '#ffd84a', size: 22 });
    if (this.lives <= 0) {
      this.state = 'over';
      sfx.gameover();
      setTimeout(() => this.ui.gameOver({ score: this.score, distance: Math.floor(this.travel * GAME.metersPerUnit), beers: this.beers, mode: this.mode, duration: Math.round(this.elapsed) }), 900);
    }
    this.emitHud();
  }

  // ------------------------------------------------ LOVE ROOM
  startLove() {
    this.state = 'love';
    this.blonde = null; this.closeup = null;
    this.love = { t: 0, phase: 0 };
    this.ui.loveRoom(true);
    sfx.kiss();
  }
  updateLove(dt) {
    const L = this.love; L.t += dt;
    if (L.t > 1.4 && L.t < 4 && Math.random() < 0.35) sfx.squeak();
    if (L.t > 1.4 && L.t < 4 && Math.random() < 0.4) this.burst(this.W / 2 + rand(-60, 60), this.H * 0.45, 'heart', 1, { vy: -rand(60, 160), color: pick(['#ff2fa8', '#ff1744', '#ff8ad1']), size: rand(12, 22) });
    if (L.t > 2.6 && !L.boing) { L.boing = true; sfx.boing(); }
    if (L.t > 6.2) this.endLove();
    this.updateParts(dt);
  }
  endLove() {
    if (this.state !== 'love') return;
    this.state = 'play'; this.last = performance.now();
    this.beerPts += PICKUPS.love.points * (this.buffs.double > 0 ? 2 : 1);
    this.p.inv = 2; this.loveDone++;
    this.face({ messy: 1, wink: 1 }, 4);
    this.ui.loveRoom(false);
    this.ui.message(pick(MSG_LOVE_OUT));
    const r = this.ramoScreen(); this.burst(r.x, r.y - this.ramoH * 1.1, 'text', 1, { text: '+500 ♥', color: '#ff8ad1', size: 30 });
    sfx.record();
  }

  // ------------------------------------------------ particules
  burst(x, y, kind, n, o = {}) {
    for (let i = 0; i < n; i++) {
      const life = o.life || (kind === 'text' ? 1.1 : rand(0.5, 1));
      this.parts.push({ kind, x, y, vx: o.vx ?? (kind === 'text' ? 0 : rand(-140, 140)), vy: o.vy ?? (kind === 'text' ? -60 : rand(-260, -60)),
        life, max: life, size: o.size || (kind === 'heart' ? rand(10, 20) : kind === 'confetti' ? rand(6, 11) : rand(2, 5)),
        color: o.color || pick(['#ff2fa8', '#ffd700', '#4fe3ff', '#7CFF6B']), text: o.text, rot: rand(0, 6), g: kind === 'text' ? 0 : (kind === 'confetti' || kind === 'heart' ? 60 : 500) });
    }
    if (this.parts.length > 260) this.parts.splice(0, this.parts.length - 260);
  }
  updateParts(dt) {
    for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.life -= dt; p.rot += dt * 5; }
    this.parts = this.parts.filter((p) => p.life > 0);
  }

  ramoScreen() { return { x: this.P.x(this.p.x, 0), y: this.P.baseY }; }

  emitHud() {
    const b = this.buffs;
    let bonus = '';
    if (b.invincible > 0) bonus = `⭐ Invincible ${b.invincible.toFixed(0)}s`;
    else if (b.heat > 0) bonus = `🔥 Coup de chaud ${b.heat.toFixed(0)}s`;
    if (b.double > 0) bonus += (bonus ? ' · ' : '') + `🍺 x2 ${b.double.toFixed(0)}s`;
    if (b.crazy > 0) bonus += (bonus ? ' · ' : '') + '🪩 Nuit de folie';
    this.ui.hud({ score: this.score, lives: this.lives, distance: Math.floor(this.travel * GAME.metersPerUnit), bonus });
  }

  // ------------------------------------------------ rendu
  render() {
    const c = this.c, W = this.W, H = this.H, P = this.P, adult = this.adult, t = this.t;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.save();
    if (this.shake > 0) c.translate(rand(-6, 6) * this.shake * 3, rand(-6, 6) * this.shake * 3);
    S.drawSky(c, W, H, P.hor, adult, t);
    S.drawMountains(c, W, H, P.hor, adult);
    S.drawRoad(c, P, W, H, adult, this.travel);
    if (adult) this.discoBeams(c);
    // décor du plus loin au plus près
    const dec = [...this.decor].sort((a, b) => b.z - a.z);
    for (const d of dec) {
      if (d.kind === 'building') S.drawBuilding(c, P, d, adult, t);
      else if (d.kind === 'townhall') S.drawTownHall(c, P, d, adult);
      else if (d.kind === 'kiosk') S.drawKiosk(c, P, d, adult);
      else if (d.kind === 'castle') S.drawCastleSide(c, P, d, adult);
      else if (d.kind === 'terrace') D.drawTerrace(c, P, d, adult);
      else if (d.kind === 'lamp') D.drawLamp(c, P, d, adult);
      else if (d.kind === 'blonde' && d.z > -2 && d.z < 70) {
        const s = P.s(d.z); drawBlonde(c, P.x(d.side * 1.42, d.z), P.y(d.z), P.unit * 1.5 * s, t, { wink: d.z < 12 && Math.sin(t * 4) > 0, kiss: d.z < 10 ? 1 : 0 });
      }
    }
    // entités + Ramo triés par profondeur
    const ents = this.ents.filter((e) => e.z > -3.5 && e.z < 100 && !e.gone).sort((a, b) => b.z - a.z);
    let ramoDrawn = false;
    for (const e of ents) {
      if (!ramoDrawn && e.z < 0) { this.drawRamo(c); ramoDrawn = true; }
      if (e.kind === 'obs') D.drawObstacle(c, P, e, adult, t);
      else D.drawPickup(c, P, e, t, this.ramoH);
    }
    if (!ramoDrawn) this.drawRamo(c);
    // blonde à l'écran (bonus charme)
    if (this.blonde) this.drawBlondeEvent(c);
    if (this.state === 'love') this.drawLove(c);
    D.drawParticles(c, this.parts);
    if (this.closeup && this.state !== 'love') this.drawCloseup(c);
    if (adult) { // vignette rose
      const g = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(120,0,90,0.35)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
    if (this.buffs.heat > 0) { c.fillStyle = `rgba(255,80,0,${0.08 + 0.05 * Math.sin(t * 10)})`; c.fillRect(0, 0, W, H); }
    c.restore();
  }

  discoBeams(c) {
    const W = this.W, H = this.H, t = this.t;
    c.save(); c.globalCompositeOperation = 'lighter';
    const cols = ['rgba(255,47,196,0.10)', 'rgba(79,227,255,0.09)', 'rgba(155,60,255,0.10)'];
    for (let i = 0; i < 3; i++) {
      const a = Math.sin(t * (0.7 + i * 0.3) + i * 2) * 0.7 + Math.PI / 2;
      const ox = W * (0.2 + i * 0.3);
      c.fillStyle = cols[i];
      c.beginPath(); c.moveTo(ox, 0); c.lineTo(ox + Math.cos(a - 0.12) * H * 1.2, Math.sin(a - 0.12) * H * 1.2); c.lineTo(ox + Math.cos(a + 0.12) * H * 1.2, Math.sin(a + 0.12) * H * 1.2); c.fill();
    }
    c.restore();
  }

  drawRamo(c) {
    const p = this.p, P = this.P, t = this.t, img = this.img.full;
    const x = P.x(p.x, 0), base = P.baseY;
    const jumpPx = p.jumpH * this.ramoH * 0.9;
    // ombre
    c.fillStyle = 'rgba(0,0,0,0.3)';
    const sh = 1 - Math.min(0.6, p.jumpH * 0.6);
    c.beginPath(); c.ellipse(x, base + 4, this.ramoH * 0.28 * sh, this.ramoH * 0.06 * sh, 0, 0, 7); c.fill();
    if (p.inv > 0 && Math.floor(p.inv * 12) % 2 === 0 && this.state === 'play') return; // clignote
    const sliding = p.slide > 0 && p.jumpH < 0.2;
    let h = this.ramoH, w = h * (528 / 620);
    let sy = 1, sx = 1;
    if (sliding) { sy = 0.58; sx = 1.12; }
    const run = this.state === 'play' && p.jumpH === 0 && !sliding;
    const bob = run ? Math.abs(Math.sin(t * 15)) * h * 0.03 : 0;
    const tilt = (p.lane - p.x) * -0.35 + (p.hitAnim > 0 ? Math.sin(p.hitAnim * 30) * 0.3 : 0) + (this.state === 'over' ? 1.2 : 0);
    const feetY = base - jumpPx - bob;
    c.save();
    c.translate(x, feetY);
    c.rotate(tilt);
    c.scale(sx, sy);
    // queue (derrière)
    const wag = Math.sin(t * (this.p.wag > 0 || this.adult ? 18 : 9)) * (this.p.wag > 0 ? 0.6 : 0.25);
    if (this.p.wag > 0) this.p.wag -= 1 / 60;
    D.drawTail(c, w * 0.22, -h * 0.12, h * 0.75, 0.6 + wag);
    // pieds animés
    c.fillStyle = '#3b2212';
    const step = run ? Math.sin(t * 15) : 0;
    c.beginPath(); c.ellipse(-w * 0.15, -h * 0.02 - Math.max(0, step) * h * 0.06, w * 0.12, h * 0.05, 0, 0, 7); c.fill();
    c.beginPath(); c.ellipse(w * 0.15, -h * 0.02 - Math.max(0, -step) * h * 0.06, w * 0.12, h * 0.05, 0, 0, 7); c.fill();
    // corps + vrai visage de Ramo
    const ox = -w / 2, oy = -h * 1.04;
    c.drawImage(img, ox, oy, w, h);
    const fx = { ...p.fx };
    if (this.adult && Math.sin(t * 0.9) > 0.97) fx.wink = 1;
    if (this.buffs.heat > 0 || this.blonde) fx.blush = 1;
    D.faceOverlay(c, D.RAMO_FULL, w / 528, ox, oy, fx);
    if (this.buffs.invincible > 0) {
      c.strokeStyle = `rgba(255,215,0,${0.5 + 0.4 * Math.sin(t * 12)})`; c.lineWidth = 5;
      c.beginPath(); c.ellipse(0, -h * 0.52, w * 0.62, h * 0.6, 0, 0, 7); c.stroke();
    }
    c.restore();
  }

  drawBlondeEvent(c) {
    const b = this.blonde, W = this.W, H = this.H;
    const inT = Math.min(1, b.t * 3), outT = b.t > 2.7 ? (b.t - 2.7) * 2 : 0;
    const r = this.ramoScreen();
    const side = r.x < W / 2 ? 1 : -1;
    const x = r.x + side * (W * 0.34) * (inT - outT) + side * W * 0.5 * (1 - inT) ;
    const size = this.ramoH * 1.05;
    drawBlonde(c, x, H * 0.86, size, this.t, { wink: b.t > 0.5 && b.t < 1.3, kiss: b.t > 1.2 && b.t < 2.2 ? 1 : 0 });
    if (b.t > 1.3 && b.t < 2.4 && Math.random() < 0.5) {
      this.parts.push({ kind: 'heart', x: x - side * 10, y: H * 0.86 - size * 0.85, vx: (r.x - x) * 1.4, vy: -rand(20, 80), life: 0.8, max: 0.8, size: rand(10, 18), color: pick(['#ff2fa8', '#ff1744']), g: 40, rot: 0 });
    }
    if (!b.said && b.t > 1.1) { b.said = true; this.ui.message('💋 « ' + pick(MSG_BLONDE) + ' »'); }
  }

  drawLove(c) {
    const L = this.love, W = this.W, H = this.H, t = L.t;
    c.fillStyle = 'rgba(20,0,20,0.78)'; c.fillRect(0, 0, W, H);
    const cw = Math.min(W * 0.8, 340), ch = cw * 1.1, cx = W / 2, cy = H * 0.48;
    // cadre doré
    c.fillStyle = '#3a0a22'; c.fillRect(cx - cw / 2 - 10, cy - ch / 2 - 10, cw + 20, ch + 20);
    c.fillStyle = '#ffd36b'; c.fillRect(cx - cw / 2 - 10, cy - ch / 2 - 10, cw + 20, 10);
    c.font = `900 ${cw * 0.11}px "Luckiest Guy", Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#ff8ad1'; c.fillText('LOVE ROOM', cx, cy - ch / 2 - 40);
    // intérieur
    c.fillStyle = '#5a0f33'; c.fillRect(cx - cw / 2, cy - ch / 2, cw, ch);
    const enter = Math.min(1, t / 1.2);
    // avant rideau : Ramo + blonde entrent
    if (t < 1.4) {
      const hw = cw * 0.42, hh = hw * (620 / 528);
      c.drawImage(this.img.full, cx - hw - cw * 0.5 * (1 - enter), cy + ch / 2 - hh, hw, hh);
      drawBlonde(c, cx + cw * 0.22 + cw * 0.5 * (1 - enter), cy + ch / 2, ch * 0.62, this.t, { wink: true, kiss: t > 0.7 ? 1 : 0 });
    }
    // rideau
    const close = t < 1.4 ? Math.max(0, (t - 0.9) / 0.5) : t > 5 ? Math.max(0, 1 - (t - 5) / 0.5) : 1;
    const wob = t > 1.4 && t < 5 ? Math.sin(t * 22) * 10 + Math.sin(t * 9) * 6 : 0;
    for (const side of [-1, 1]) {
      const wCur = (cw / 2) * close;
      for (let i = 0; i < 6; i++) {
        const x0 = cx + side * (cw / 2) - side * wCur * (i / 6), x1 = cx + side * (cw / 2) - side * wCur * ((i + 1) / 6);
        c.fillStyle = i % 2 ? '#b0102e' : '#d4183c';
        c.beginPath(); c.moveTo(x0, cy - ch / 2); c.lineTo(x1, cy - ch / 2);
        c.quadraticCurveTo(x1 + wob * (i % 2 ? 1 : -1), cy, x1 + wob * 0.6, cy + ch / 2); c.lineTo(x0 + wob * 0.6, cy + ch / 2); c.fill();
      }
    }
    if (t > 1.4 && t < 5) {
      c.fillStyle = '#fff'; c.font = `900 ${cw * 0.08}px Nunito, sans-serif`;
      const words = ['*BOING*', '*grince*', 'Oh Ramo !', '*hihihi*', '♥ ♥ ♥', '*schlurp*'];
      c.fillText(words[Math.floor(t * 1.6) % words.length], cx + Math.sin(t * 3) * 30, cy - ch * 0.25);
    }
    // sortie : Ramo décoiffé
    if (t > 5) {
      const k = Math.min(1, (t - 5) / 0.4);
      const hw = cw * 0.55 * k, hh = hw * (375 / 300);
      const ox = cx - hw / 2, oy = cy - hh / 2;
      if (hw > 4) { c.drawImage(this.img.head, ox, oy, hw, hh); D.faceOverlay(c, D.RAMO_HEAD, hw / 300, ox, oy, { messy: 1, wink: 1, blush: 1 }); }
      c.fillStyle = '#ffe4f4'; c.font = `900 ${cw * 0.07}px Nunito, sans-serif`;
      c.fillText('Il ressort décoiffé…', cx, cy + ch / 2 - 22);
    }
  }

  drawCloseup(c) {
    const cu = this.closeup, W = this.W;
    const k = cu.t < 0.25 ? cu.t / 0.25 : cu.t > 1.35 ? Math.max(0, 1 - (cu.t - 1.35) / 0.25) : 1;
    const size = Math.min(W * 0.28, 130) * (0.6 + 0.4 * k);
    const cx = W / 2, cy = this.H * 0.165;
    c.save(); c.globalAlpha = k;
    const shake = cu.expr === 'grimace' ? Math.sin(cu.t * 60) * 4 : 0;
    c.beginPath(); c.arc(cx + shake, cy, size * 0.55, 0, 7); c.closePath();
    c.fillStyle = this.adult ? '#ff2fa8' : '#ffd84a'; c.fill();
    c.save(); c.beginPath(); c.arc(cx + shake, cy, size * 0.5, 0, 7); c.clip();
    c.fillStyle = this.adult ? '#3a0b5e' : '#8fd0ff'; c.fillRect(cx - size, cy - size, size * 2, size * 2);
    const hw = size * 1.05, hh = hw * (375 / 300), ox = cx - hw / 2 + shake, oy = cy - hh * 0.42;
    if (cu.expr === 'grimace') { c.translate(cx, cy); c.rotate(-0.2); c.translate(-cx, -cy); }
    c.drawImage(this.img.head, ox, oy, hw, hh);
    D.faceOverlay(c, D.RAMO_HEAD, hw / 300, ox, oy, { wink: cu.expr === 'wink', surprise: cu.expr === 'surprise' || cu.expr === 'grimace', blush: cu.expr === 'blush' || cu.expr === 'hearts' ? 1 : 0, hearts: cu.expr === 'hearts' });
    c.restore();
    if (cu.text) {
      c.font = '900 13px Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      const tw = Math.min(c.measureText(cu.text).width + 18, W * 0.6);
      const tx = Math.min(cx, W - tw / 2 - 6);
      c.fillStyle = 'rgba(0,0,0,0.65)'; D.roundRect(c, tx - tw / 2, cy + size * 0.58, tw, 24, 12); c.fill();
      c.fillStyle = '#fff'; c.fillText(cu.text, tx, cy + size * 0.58 + 12, tw - 10);
    }
    c.restore();
  }
}
