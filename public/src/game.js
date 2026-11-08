// =====================================================================
//  Moteur du runner 2.5D
// =====================================================================
import { GAME, PICKUPS, OBSTACLES, LEVELS, levelById, MSG_CLASSIC, MSG_ADULT, MSG_HIT, MSG_BLONDE, MSG_LOVE_OUT, MSG_MOLESON, MSG_GATE, MSG_COMBO, MSG_HIT_M } from './config.js';
import * as M from './moleson.js';
import { Crossy } from './crossy.js';
import { Buvette } from './buvette.js';
import { Bros } from './bros.js';
import * as D from './draw.js';
import * as S from './scene.js';
import { drawBlonde } from './blonde.js';
import * as G from './grandrue.js';
import { sfx } from './audio.js';

const { rand, pick } = D;

export class Game {
  constructor(canvas, images, ui) {
    this.cv = canvas; this.c = canvas.getContext('2d');
    this.img = images; this.ui = ui;
    this.level = LEVELS[0];
    this.state = 'idle'; // idle | intro | play | pause | love | win | over
    this.t = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.loop = this.loop.bind(this);
    this.last = performance.now();
    this.reset('classic');
    requestAnimationFrame(this.loop);
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
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
    if (this.cross) this.cross.resize();
    if (this.bros) this.bros.resize();
    if (this.buv) this.buv.resize();
  }

  reset(mode, course = this.course || 'bulle') {
    this.mode = mode;
    this.adult = mode === 'adult';
    this.level = levelById(course); this.course = this.level.id;
    this.mole = this.course === 'moleson';
    this.cross = null; this.bros = null; this.buv = null;
    this.speed = this.level.speed.start;
    // chrono, portes, stations, arrivée (Moléson) + combos (tous parcours)
    this.timeLeft = this.level.startTime || 0; this.gateCd = 3; this.stationIdx = 0; this.decorFar = NaN;
    this.level = { ...this.level, stations: (this.level.stations || []).map((st) => ({ ...st })) }; this.finishSpawned = false; this.result = null;
    this.combo = 0; this.comboMult = 1; this.progress = 0; this.tick = 0; this.winT = 0;
    this.introT = 0; this.counted = -1;
    this.travel = 0; this.elapsed = 0;
    this.score = 0; this.beerPts = 0; this.lives = GAME.lives; this.beers = 0;
    this.ents = []; this.decor = []; this.parts = [];
    this.rowCd = 30; this.decorCd = 0; this.lastSide = 1; this.lastFree = null;
    this.castleCd = 120; this.hallCd = 60;
    this.p = { lane: 0, x: 0, jumpH: 0, vy: 0, slide: 0, inv: 0, hitAnim: 0, fx: {}, fxT: 0, wag: 0 };
    this.buffs = { invincible: 0, double: 0, heat: 0, crazy: 0 };
    this.blonde = null; // { t, kind }
    this.closeup = null;
    this.msgCd = 14; this.shake = 0; this.hints = [];
    this.loveDone = 0; this.sinceLove = 8; this.adultCd = 3; this.adultCycle = 0;
    // décor initial + arche de départ
    if (this.level.kind === 'crossy') return; // Traverse Bulle a son propre décor
    for (let z = -4; z < GAME.spawnFar; z += 0) z = this.spawnDecor(z);
    this.decor.push({ kind: 'arch', z: 3.2, label: this.mole ? 'DÉPART · MOLÉSON 2002 m' : 'DÉPART · GRAND-RUE', side: 0 });
  }

  // Ramo Buvette : une journée au chalet des 4F
  startBuvette(mode, save) {
    this.reset(mode, 'bulle'); this.course = 'buvette'; this.reported = false;
    this.buv = new Buvette(this, mode, save); this.state = 'play'; this.buv.hud();
  }
  // Super Ramo Bros : un niveau précis (ex. « 1-2 »)
  startBros(mode, id) {
    this.reset(mode, 'bulle'); this.course = 'bros'; this.reported = false;
    this.bros = new Bros(this, mode, id); this.state = 'play'; this.bros.hud();
  }

  start(mode, course) {
    this.reset(mode, course);
    this.reported = false; this.decorFar = NaN;
    if (this.level.kind === 'crossy') { this.cross = new Crossy(this, mode); this.state = 'play'; this.cross.hud(); return; }
    this.state = 'intro'; this.introT = 0; this.counted = -1;
    this.hints = this.mole ? [
      { t: 2.2, text: '🚩 Passe dans les portes de slalom : +3 secondes !' },
      { t: 5.8, text: '☝️ Saute les rochers et les fondues' },
      { t: 9.4, text: '👇 Baisse-toi sous les télésièges' },
      { t: 13, text: '⏱ Arrive à Gruyères avant la fin du chrono !' },
    ] : [
      { t: 2.6, text: '👈 👉 Glisse à gauche / à droite pour changer de voie' },
      { t: 6.2, text: '☝️ Glisse vers le haut pour sauter les tonneaux' },
      { t: 9.8, text: '👇 Glisse vers le bas sous les banderoles' },
      { t: 13.4, text: '🍺 Enchaîne les bières sans te cogner : COMBO !' },
    ];
    this.emitHud();
  }

  // ------------------------------------------------ animation de départ (3, 2, 1, GO)
  updateIntro(dt) {
    this.introT += dt;
    const n = Math.floor(this.introT / 0.8); // 0..3 → « 3 », « 2 », « 1 », « GO »
    if (n !== this.counted && n <= 3) {
      this.counted = n;
      if (n < 3) sfx.beep(false); else { sfx.beep(true); this.goBurst(); }
    }
    if (this.introT > 0.8 * 3 + 0.35) this.beginPlay();
    this.updateParts(dt);
  }
  skipIntro() { if (this.state === 'intro') { if (this.counted < 3) { sfx.beep(true); this.goBurst(); } this.beginPlay(); } }
  goBurst() {
    const r = this.ramoScreen();
    this.burst(r.x, r.y - this.ramoH * 0.6, 'confetti', 40, {});
    if (this.mole) for (let i = 0; i < 30; i++) this.parts.push({ kind: 'dot', x: r.x + rand(-40, 40), y: r.y, vx: rand(-220, 220), vy: rand(-320, -80), life: 0.8, max: 0.8, size: rand(3, 7), color: '#ffffff', g: 500 });
    this.face({ wink: 1 }, 1);
  }
  beginPlay() {
    this.state = 'play'; this.last = performance.now();
    this.ui.message(this.mole ? pick(['Le castor dévale le Moléson !', 'GO GO GO ! Direction Gruyères !', 'Accroche-toi à ta luge !'])
      : pick(['Le castor est lâché dans Bulle !', 'Mission apéro : GO !', 'Bulle n\'était pas prête pour ça !']));
  }
  pause(on) { if (this.state === 'play' && on) this.state = 'pause'; else if (this.state === 'pause' && !on) { this.state = 'play'; this.last = performance.now(); } }

  // ------------------------------------------------ commandes
  input(dir) {
    if (this.state !== 'play') return;
    if (this.cross) { this.cross.input(dir); return; }
    if (this.bros || this.buv) return; // commandes maintenues / tapes localisées : voir setKey
    if (dir === 'tap') return;
    const p = this.p;
    if (dir === 'left' && p.lane > -1) { p.lane--; sfx.lane(); }
    else if (dir === 'right' && p.lane < 1) { p.lane++; sfx.lane(); }
    else if (dir === 'up' && p.jumpH <= 0.02) { p.vy = 3.3 * this.jumpK(); p.slide = 0; sfx.jump(); }
    else if (dir === 'down') {
      if (p.jumpH > 0.05) p.vy = -5; // redescendre vite
      p.slide = 0.72 / this.jumpK(); sfx.slide();
    }
  }

  // ------------------------------------------------ génération
  spawnDecor(z) {
    if (this.mole) return this.spawnDecorMoleson(z);
    // Grand-Rue de Bulle : façades continues des deux côtés + mobilier urbain
    const lvl = this.level;
    const cols = ['#efe6cf', '#f1dd9c', '#ec9e8f', '#f2b9aa', '#f3f0e8', '#ddd3c2', '#e8c98a', '#f0e2c0', '#e9a896', '#e4dccb'];
    const colsN = ['#2d1440', '#3a1a52', '#24113a', '#311648'];
    const shutters = ['#2f7d8f', '#2a6f9e', '#3d7a4a', '#9aa0a3', '#7a5236', '#e2e0da', '#3a8a94'];
    const roofs = ['#7a4a3a', '#6b3f30', '#8a5240', '#5e3a2c', '#80493a'];
    const signs = ['#7a1f12', '#2f5d3a', '#24476b', '#6b3a1f', '#1f4b52'];
    const awnings = ['#b8322a', '#2f6b3a', '#24476b', '#c47a1c', '#7a1f4a', '#3a3f45'];
    const len = rand(7, 11);
    for (const side of [-1, 1]) {
      if (this.castleCd <= 0 && side === this.lastSide) { this.decor.push({ kind: 'castle', side, z, len: 14 }); continue; }
      const hall = this.hallCd <= 0 && side === -this.lastSide;
      if (hall) this.hallCd = rand(450, 650);
      this.decor.push({
        kind: hall ? 'townhall' : 'building', side, z: z + (side > 0 ? 0 : rand(-1.5, 1.5)), len: hall ? len + 2 : len,
        h: hall ? 5.6 : rand(4.2, 5.6), floors: hall ? 3 : Math.random() < 0.7 ? 3 : 2, cols: hall ? 5 : Math.random() < 0.5 ? 3 : 4,
        dormers: 1 + Math.floor(Math.random() * 3), flowers: Math.random() < 0.5, balcony: Math.random() < 0.2, bulb: hall || Math.random() < 0.05,
        col: hall ? '#efe3c8' : pick(cols), colN: pick(colsN), roof: pick(roofs), shutter: hall ? '#5a6b3a' : pick(shutters),
        signCol: hall ? '#24476b' : pick(signs), awning: hall ? '#24476b' : (Math.random() < 0.7 ? pick(awnings) : null),
        sign: hall ? (this.adult ? 'Hôtel de Ville · After' : 'Hôtel de Ville') : pick(this.adult ? lvl.adultShops : lvl.shops), seed: Math.floor(rand(0, 9)),
      });
      // arbres taillés en boule le long du trottoir
      for (let tz = z + rand(1, 4); tz < z + len; tz += rand(9, 12)) this.decor.push({ kind: 'tree', side, z: tz, seed: Math.floor(rand(0, 9)) });
      const r = Math.random();
      if (r < 0.32) this.decor.push({ kind: 'terrace', side, z: z + rand(1, len - 1), seed: Math.floor(rand(0, 9)) });
      else if (r < 0.4) this.decor.push({ kind: 'fountain', side, z: z + len * 0.5 });
      else if (r < 0.5) this.decor.push({ kind: 'lamp', side, z: z + rand(1, len - 1), flag: Math.random() < 0.5 ? 'ch' : 'fr' });
    }
    // fanions colorés au-dessus de la rue, bannière de Bulle au taureau
    this.garlandCd = (this.garlandCd ?? 0) - len;
    if (this.garlandCd <= 0) { this.decor.push({ kind: 'garland', side: 0, z: z + len * 0.5 }); this.garlandCd = rand(18, 30); }
    this.bannerCd = (this.bannerCd ?? 20) - len;
    if (this.bannerCd <= 0) { this.decor.push({ kind: 'banner', side: Math.random() < 0.5 ? -1 : 1, z: z + len * 0.3 }); this.bannerCd = rand(45, 75); }
    if (this.castleCd <= 0) { this.castleCd = rand(260, 380); this.lastSide *= -1; return z + 15; }
    return z + len + 0.2;
  }

  // Décor de la descente : sapins, chalets, pylônes du télésiège
  spawnDecorMoleson(z) {
    const len = rand(5, 8);
    for (const side of [-1, 1]) {
      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) this.decor.push({ kind: 'sapinD', side, z: z + rand(0, len), off: rand(2.05, 3.6), size: rand(0.8, 1.25), seed: Math.floor(rand(0, 9)), len: 0.5 });
    }
    if (Math.random() < 0.3) {
      const side = Math.random() < 0.5 ? -1 : 1;
      this.decor.push({ kind: 'chalet', side, z: z + len * 0.5, sign: Math.random() < 0.7 ? pick(this.adult ? M.MOLESON_SIGNS_ADULT : M.MOLESON_SIGNS) : null, len: 1 });
    }
    this.pylonCd = (this.pylonCd ?? 0) - len;
    if (this.pylonCd <= 0) {
      const py = { kind: 'pylon', side: this.pylonSide || 1, z: z + len * 0.5, seed: Math.floor(rand(0, 9)), len: 1 };
      if (this.lastPylon && this.lastPylon.z > py.z - 40) this.lastPylon.next = py;
      this.lastPylon = py; this.decor.push(py); this.pylonCd = rand(22, 28);
    }
    return z + len;
  }

  // Intensité 0 → 1 : monte avec le temps ET continue après la vitesse max (sinon le jeu devient facile)
  // saut plus vif à grande vitesse : même hauteur, temps en l'air plus court (sinon on « survole » deux rangées)
  jumpK() { return Math.min(1.85, Math.max(1, this.speed / 25)); }
  airTime() { return 0.917 / this.jumpK(); }
  intensity() { return Math.min(1, Math.max(0, (this.elapsed - 12) / 150)); }

  // Séquence spéciale à haute vitesse : slalom de vaches / chars, voies alternées
  spawnSlalom(z) {
    const n = 3 + Math.floor(Math.random() * 3);
    let lane = pick([-1, 1]);
    for (let i = 0; i < n; i++) {
      const zz = z + i * this.speed * 0.55;
      this.ents.push({ kind: 'obs', type: pick(this.level.obstacles.block), lane, z: zz, hit: false });
      this.ents.push({ kind: 'obs', type: pick(this.level.obstacles.block), lane: 0, z: zz, hit: false });
      for (let k = 0; k < 2; k++) this.ents.push({ kind: 'pick', type: 'beer', lane: -lane, z: zz - 2 - k * 2.6, high: false });
      lane = -lane;
    }
    this.lastFree = -lane;
    return (n - 1) * this.speed * 0.55;
  }

  spawnRow(z) {
    const d = this.intensity();
    const lanes = [-1, 0, 1];
    const obs = {};
    const easy = this.elapsed < 15;
    if (!easy && d > 0.35 && Math.random() < 0.06 + 0.1 * d) return this.spawnSlalom(z);
    let n = !easy && Math.random() < 0.3 + 0.5 * d ? 2 : 1;
    if (!easy && Math.random() < 0.08 + 0.3 * d) n = 3;
    const shuffled = lanes.sort(() => Math.random() - 0.5);
    // deux rangées serrées de suite : la voie libre doit rester atteignable (voie voisine)
    if (n === 2 && this.lastFree !== undefined && this.lastFree !== null) {
      const okFree = lanes.filter((l) => Math.abs(l - this.lastFree) <= 1);
      const free = pick(okFree);
      shuffled.splice(0, 3, ...lanes.filter((l) => l !== free), free);
    }
    for (let i = 0; i < n; i++) {
      const lane = shuffled[i];
      let type;
      const r = Math.random();
      const O = this.level.obstacles;
      if (n === 3) type = Math.random() < 0.7 ? pick(O.jump) : pick(O.slide); // jamais 3 blocs : toujours passable en sautant / glissant
      else type = r < 0.5 ? pick(O.jump) : r < 0.72 ? pick(O.slide) : pick(O.block);
      obs[lane] = type;
      this.ents.push({ kind: 'obs', type, lane, z, hit: false });
    }
    const freeLanes = lanes.filter((l) => !obs[l] || OBSTACLES[obs[l]].need !== 'block');
    this.lastFree = n >= 2 && freeLanes.length === 1 ? freeLanes[0] : null;
    // bières dans les voies libres, ou au-dessus d'un tonneau (à attraper en sautant)
    const free = lanes.filter((l) => !obs[l]);
    const beerLane = free.length ? pick(free) : null;
    if (beerLane !== null && Math.random() < 0.85) {
      const count = Math.floor(rand(3, 6));
      for (let i = 0; i < count; i++) this.ents.push({ kind: 'pick', type: 'beer', lane: beerLane, z: z - 4 - i * 2.6, high: false });
    }
    const jumpLane = lanes.find((l) => obs[l] && OBSTACLES[obs[l]].need === 'jump');
    if (jumpLane !== undefined && Math.random() < 0.4) this.ents.push({ kind: 'pick', type: this.mole && Math.random() < 0.5 ? 'meringue' : 'big', lane: jumpLane, z, high: true });
    // Moléson : porte de slalom avant la rangée, dans une voie praticable
    if (this.mole && this.gateCd <= 0 && this.elapsed > 1) {
      const ok = lanes.filter((l) => !obs[l] || OBSTACLES[obs[l]].need !== 'block');
      this.ents.push({ kind: 'gate', lane: pick(ok), z: z - this.speed * 0.42, color: (this.gateN = (this.gateN || 0) + 1) % 2 ? 'red' : 'blue' });
      this.gateCd = rand(2.4, 3.4);
    }
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
      const r = Math.random(); const type = this.mole && r < 0.25 ? 'meringue' : r < 0.45 ? 'big' : r < 0.72 ? 'chope' : 'golden';
      this.ents.push({ kind: 'pick', type, lane, z: z + 6, high: false });
    }
    // en mode adulte : la blonde attend parfois sur le trottoir
    if (this.adult && Math.random() < 0.45) this.decor.push({ kind: 'blonde', side: Math.random() < 0.5 ? -1 : 1, z: z + rand(2, 8), waved: false });
    return 0;
  }

  // ------------------------------------------------ boucle
  loop(now) {
    // la prochaine image est programmée AVANT tout calcul : une erreur ne peut plus figer le jeu
    requestAnimationFrame(this.loop);
    let dt = (now - this.last) / 1000; this.last = now;
    if (!(dt > 0)) dt = 0; if (dt > 0.05) dt = 0.05;
    this.t += dt;
    try {
      if (this.state === 'play') this.update(dt);
      else if (this.state === 'intro') this.updateIntro(dt);
      else if (this.state === 'love') this.updateLove(dt);
      else if (this.state === 'win') this.updateWin(dt);
      else if (this.state === 'over') this.updateParts(dt);
    } catch (e) { this.report(e, 'update'); }
    try { this.render(); } catch (e) { this.report(e, 'render'); try { this.c.restore(); } catch { /* ok */ } }
  }
  report(e, where) {
    this.errCount = (this.errCount || 0) + 1;
    if (this.errCount <= 3 && this.ui.reportError) this.ui.reportError(where, e);
  }

  update(dt) {
    if (this.buv) {
      this.buv.update(dt); this.updateParts(dt);
      if (this.shake > 0) this.shake -= dt;
      return;
    }
    if (this.bros) {
      this.bros.update(dt); this.updateParts(dt);
      if (this.closeup) { this.closeup.t += dt; if (this.closeup.t > 1.6) this.closeup = null; }
      return;
    }
    if (this.cross) {
      this.cross.update(dt); this.updateParts(dt);
      if (this.shake > 0) this.shake -= dt;
      if (this.closeup) { this.closeup.t += dt; if (this.closeup.t > 1.6) this.closeup = null; }
      return;
    }
    const p = this.p, b = this.buffs;
    this.elapsed += dt; this.sinceLove += dt; this.adultCd -= dt; this.gateCd -= dt;
    const heatBoost = b.heat > 0 ? 1.35 : 1;
    const LS = this.level.speed;
    this.speed = Math.min(LS.max, this.speed + LS.ramp * dt);
    const v = this.speed * heatBoost;
    const dz = v * dt;
    this.travel += dz;
    // joueur
    p.x += (p.lane - p.x) * Math.min(1, dt * 16);
    if (p.vy !== 0 || p.jumpH > 0) {
      const k = this.jumpK(); p.jumpH += p.vy * dt; p.vy -= 7.2 * k * k * dt;
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
    if (this.rowCd <= 0) {
      const extra = this.spawnRow(GAME.spawnFar) || 0;
      // écart entre rangées (en secondes) : se resserre avec l'intensité, mais toujours assez pour atterrir et réagir
      const gap = this.elapsed < 15 ? rand(1.3, 1.6) : Math.max(this.airTime() + 0.2, (1.05 - 0.37 * this.intensity()) * rand(0.88, 1.12));
      this.rowCd = extra + this.speed * gap;
    }
    this.castleCd -= dz; this.hallCd -= dz;
    let far = this.decorFar - dz;
    if (!(far > -10)) far = Math.max(0, ...this.decor.map((d) => d.z + (d.len || 0)));
    while (far < GAME.spawnFar + 20) far = this.spawnDecor(far);
    this.decorFar = far;
    if (this.mole) this.updateCourse(dt);
    if (this.state !== 'play') return;
    // collisions
    const pz = 0;
    for (const e of this.ents) {
      if (e.done) continue;
      if (Math.abs(e.z - pz) > 0.9) continue;
      const dl = Math.abs(e.lane - p.x);
      if (e.kind === 'gate') {
        if (dl < 0.5) { e.done = true; e.passed = true; this.passGate(e); }
        continue;
      }
      if (e.kind === 'pick') {
        if (dl < 0.6 && (e.high ? p.jumpH > 0.3 : p.jumpH < 0.8)) { e.done = true; e.gone = true; this.collect(e); }
      } else if (!e.hit && dl < 0.42) {
        const need = OBSTACLES[e.type].need;
        const avoided = (need === 'jump' && p.jumpH > 0.42) || (need === 'slide' && p.slide > 0 && p.jumpH < 0.2);
        if (avoided) { e.hit = true; this.addCombo(1); if (Math.random() < 0.15) this.burst(this.ramoScreen().x, this.ramoScreen().y - this.ramoH * 0.9, 'text', 1, { text: pick(['Hop !', 'Olé !', 'Trop facile !']), color: '#fff' }); continue; }
        e.hit = true;
        if (p.inv > 0 || b.invincible > 0 || b.heat > 0) { e.gone = true; this.burst(this.P.x(e.lane, 0), this.P.y(0) - this.P.unit * 0.5, 'dot', 14, { color: '#c99a5b' }); continue; }
        this.hurt(e);
      } else if (!e.hit && !e.near && dl < 1.15 && OBSTACLES[e.type].need === 'block' && Math.abs(e.z) < 0.3 && this.speed > 24) {
        // frôlé de justesse : petit bonus
        e.near = true; this.addCombo(1);
        const pts = 15 * this.comboMult; this.beerPts += pts;
        if (Math.random() < 0.5) this.burst(this.ramoScreen().x, this.ramoScreen().y - this.ramoH * 1.05, 'text', 1, { text: `Ouf ! +${pts}`, color: '#9fe8ff', size: 18 });
      }
    }
    // portes ratées
    for (const e of this.ents) if (e.kind === 'gate' && !e.done && e.z < -0.9) { e.done = true; e.missed = true; this.combo = 0; this.comboMult = 1; }
    // la blonde salue
    for (const d of this.decor) if (d.kind === 'blonde' && !d.waved && d.z < 8) { d.waved = true; if (Math.random() < 0.8) { sfx.wolf(); this.ui.message(pick(MSG_BLONDE)); } }
    // score
    const mult = b.double > 0 ? 2 : 1;
    this.score = this.beerPts + Math.floor(this.travel * GAME.metersPerUnit);
    if (this.mole && Math.random() < 0.25) this.snowSpray();
    // consignes de départ
    if (this.hints.length && this.elapsed >= this.hints[0].t) this.ui.message(this.hints.shift().text, 3.4);
    // messages aléatoires
    this.msgCd -= dt;
    if (this.msgCd <= 0) { this.ui.message(pick(this.adult && Math.random() < 0.7 ? MSG_ADULT : this.mole ? MSG_MOLESON : MSG_CLASSIC)); this.msgCd = rand(9, 15); }
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
    this.addCombo(1);
    const mult = (this.buffs.double > 0 ? 2 : 1) * this.comboMult;
    const pts = def.points * mult;
    this.beerPts += pts;
    if (e.type === 'beer' || e.type === 'big' || e.type === 'golden' || e.type === 'chope') this.beers++;
    const r = this.ramoScreen();
    if (pts) this.burst(r.x, r.y - this.ramoH * 1.05, 'text', 1, { text: (mult > 1 && def.points ? `+${pts}` : def.label), color: e.type === 'golden' ? '#ffd700' : '#fff', size: e.type === 'beer' ? 18 : 26 });
    this.burst(r.x, r.y - this.ramoH * 0.6, 'dot', e.type === 'beer' ? 6 : 18, { color: e.type === 'golden' ? '#ffd700' : '#fffbe8' });
    switch (e.type) {
      case 'meringue': sfx.big(); this.face({ wink: 1 }, 0.9); this.closeupShow('wink', pick(['Meringue double-crème !', 'Miam, la crème de la Gruyère !'])); break;
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

  // ------------------------------------------------ combos : chaque bière / porte / esquive enchaînée fait monter le multiplicateur
  addCombo(n) {
    this.combo += n;
    const m = Math.min(5, 1 + Math.floor(this.combo / 8));
    if (m > this.comboMult) {
      this.comboMult = m; sfx.combo(m);
      const r = this.ramoScreen();
      this.burst(r.x, r.y - this.ramoH * 1.25, 'text', 1, { text: MSG_COMBO[m - 2], color: '#ffd84a', size: 26, life: 1.3 });
      this.burst(r.x, r.y - this.ramoH * 0.8, 'confetti', 16, {});
      if (m >= 4) this.face({ wink: 1 }, 1);
    }
  }

  passGate(g) {
    this.addCombo(2);
    this.timeLeft += this.level.gateBonus;
    const pts = 25 * this.comboMult; this.beerPts += pts;
    sfx.gate();
    const r = this.ramoScreen();
    this.burst(r.x, r.y - this.ramoH * 1.05, 'text', 1, { text: `+${this.level.gateBonus} s`, color: '#7CFF6B', size: 24 });
    this.burst(this.P.x(g.lane, 0), this.P.y(0) - this.P.unit, 'confetti', 10, { color: g.color === 'red' ? '#ff4b4b' : '#4fa3ff' });
    if (Math.random() < 0.25) this.ui.message(pick(MSG_GATE), 1.6);
  }

  // chrono, stations intermédiaires, arrivée à Gruyères
  updateCourse(dt) {
    const L = this.level, meters = this.travel * GAME.metersPerUnit;
    this.progress = Math.min(1, meters / L.finish);
    this.timeLeft -= dt;
    const sec = Math.ceil(this.timeLeft);
    if (this.timeLeft < 10 && sec !== this.tick && sec > 0) { this.tick = sec; sfx.tick(); }
    const ahead = GAME.spawnFar * GAME.metersPerUnit; // mètres visibles devant
    const st = L.stations[this.stationIdx];
    if (st && meters > st.at - ahead && !st.spawned) { st.spawned = true; this.decor.push({ kind: 'arch', z: GAME.spawnFar, label: st.label, side: 0, station: st }); }
    if (!this.finishSpawned && meters > L.finish - ahead) { this.finishSpawned = true; this.decor.push({ kind: 'arch', z: GAME.spawnFar, label: 'GRUYÈRES · ARRIVÉE', finish: true, side: 0 }); }
    for (const d of this.decor) {
      if (d.kind !== 'arch' || d.done || d.z > 0) continue;
      d.done = true;
      if (d.station) {
        this.stationIdx++; this.timeLeft += d.station.bonus;
        sfx.record(); this.ui.message(`🚡 ${d.station.label} : +${d.station.bonus} s !`, 2.4);
        const r = this.ramoScreen(); this.burst(r.x, r.y - this.ramoH, 'confetti', 40, {});
      } else if (d.finish) return this.finishRun('finish');
    }
    if (this.timeLeft <= 0) { this.timeLeft = 0; this.finishRun('timeout'); }
  }

  finishRun(result) {
    this.result = result;
    if (result === 'finish') {
      const bonus = Math.round(this.timeLeft * 100) + this.lives * 500;
      this.finishBonus = bonus; this.beerPts += bonus;
      this.score = this.beerPts + Math.floor(this.travel * GAME.metersPerUnit);
      this.state = 'win'; this.winT = 0; sfx.record(); setTimeout(() => sfx.golden(), 400);
      this.ui.message('🏁 ARRIVÉ À GRUYÈRES ! Bonus +' + bonus.toLocaleString('fr-CH'), 3);
    } else {
      this.state = 'over'; sfx.gameover();
      this.ui.message(result === 'timeout' ? '⏱ Le télésiège est fermé ! Trop tard…' : pick(MSG_HIT), 2.5);
      setTimeout(() => this.endReport(), 1100);
    }
    this.emitHud();
  }
  updateWin(dt) {
    this.winT += dt;
    this.travel += this.speed * dt * Math.max(0, 1 - this.winT); // la luge freine
    for (const e of this.ents) e.z -= this.speed * dt * Math.max(0, 1 - this.winT);
    if (Math.random() < 0.7) this.burst(rand(0, this.W), rand(0, this.H * 0.5), Math.random() < 0.5 ? 'confetti' : 'dot', 3, { color: pick(['#ffd700', '#ff4b4b', '#4fa3ff', '#7CFF6B', '#ffffff']) });
    this.updateParts(dt);
    if (this.winT > 2.6 && !this.reported) this.endReport();
  }
  endReport() {
    if (this.reported) return; this.reported = true;
    this.state = 'over';
    this.ui.gameOver({ score: this.score, distance: Math.floor(this.travel * GAME.metersPerUnit), beers: this.beers, mode: this.mode, duration: Math.round(this.elapsed),
      course: this.course, result: this.result || 'crash', timeLeft: this.timeLeft, finishBonus: this.finishBonus || 0 });
  }
  snowSpray() {
    const r = this.ramoScreen(), moving = Math.abs(this.p.lane - this.p.x) > 0.05;
    const n = moving ? 4 : 1;
    for (let i = 0; i < n; i++) this.parts.push({ kind: 'dot', x: r.x + rand(-this.ramoH * 0.3, this.ramoH * 0.3), y: r.y, vx: rand(-80, 80) + (this.p.x - this.p.lane) * 300, vy: rand(-140, -40), life: 0.5, max: 0.5, size: rand(2, 5), color: this.adult ? '#e8dcff' : '#ffffff', g: 400 });
  }

  face(fx, dur) { this.p.fx = fx; this.p.fxT = dur; }
  closeupShow(expr, text) { this.closeup = { t: 0, expr }; if (text) this.ui.message(text); }
  foam() { const r = this.ramoScreen(); for (let i = 0; i < 24; i++) this.parts.push({ kind: 'dot', x: r.x, y: r.y - this.ramoH * 0.8, vx: rand(-160, 160), vy: rand(-380, -120), life: 0.9, max: 0.9, size: rand(4, 9), color: '#fffdf2', g: 600 }); }

  hurt(e) {
    const p = this.p;
    this.lives--; p.inv = GAME.hitInvuln; p.hitAnim = 0.6; this.shake = 0.35;
    this.combo = 0; this.comboMult = 1;
    if (this.mole) { this.timeLeft = Math.max(0, this.timeLeft - this.level.hitPenalty); const r0 = this.ramoScreen(); this.burst(r0.x, r0.y - this.ramoH * 1.4, 'text', 1, { text: `-${this.level.hitPenalty} s`, color: '#ff6b6b', size: 24 }); }
    sfx.hit();
    this.face({ surprise: 1 }, 0.8);
    this.closeupShow('grimace', pick(this.mole ? MSG_HIT_M : MSG_HIT));
    const r = this.ramoScreen();
    this.burst(r.x, r.y - this.ramoH * 0.5, 'dot', 20, { color: e.type === 'cow' ? '#fff' : '#b6733a' });
    this.burst(r.x, r.y - this.ramoH * 1.2, 'text', 1, { text: '★ ★ ★', color: '#ffd84a', size: 22 });
    if (this.lives <= 0) {
      this.result = 'crash'; this.state = 'over';
      sfx.gameover();
      setTimeout(() => this.endReport(), 900);
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
    this.ui.hud({ score: this.score, lives: this.lives, distance: Math.floor(this.travel * GAME.metersPerUnit), bonus,
      combo: this.comboMult, mole: this.mole, timeLeft: this.timeLeft, progress: this.progress });
  }

  // ------------------------------------------------ rendu
  render() {
    const c = this.c, W = this.W, H = this.H, P = this.P, adult = this.adult, t = this.t;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.buv) {
      c.save(); if (this.shake > 0) c.translate(rand(-4, 4) * this.shake * 3, rand(-4, 4) * this.shake * 3);
      this.buv.render(c); D.drawParticles(c, this.parts); c.restore(); return;
    }
    if (this.bros) {
      this.bros.render(c); D.drawParticles(c, this.parts);
      if (this.closeup) this.drawCloseup(c);
      return;
    }
    if (this.cross) {
      c.save();
      if (this.shake > 0) c.translate(rand(-5, 5) * this.shake * 3, rand(-5, 5) * this.shake * 3);
      this.cross.render(c); D.drawParticles(c, this.parts);
      if (this.closeup) this.drawCloseup(c);
      c.restore(); return;
    }
    c.save();
    if (this.shake > 0) c.translate(rand(-6, 6) * this.shake * 3, rand(-6, 6) * this.shake * 3);
    // animation de départ : la caméra part d'un gros plan sur Ramo puis recule
    const zoom = this.state === 'intro' ? 1 + 0.85 * Math.pow(1 - Math.min(1, this.introT / 2.3), 3) : 1;
    if (zoom > 1.001) { const r = this.ramoScreen(); c.translate(r.x, r.y - this.ramoH * 0.55); c.scale(zoom, zoom); c.translate(-r.x, -(r.y - this.ramoH * 0.55)); }
    S.drawSky(c, W, H, P.hor, adult, t);
    if (this.mole) { M.drawPanorama(c, W, H, P.hor, adult, this.progress); M.drawPiste(c, P, W, H, adult, this.travel); }
    else { S.drawMountains(c, W, H, P.hor, adult); S.drawRoad(c, P, W, H, adult, this.travel); }
    if (adult) this.discoBeams(c);
    // décor du plus loin au plus près
    const key = (d) => (d.kind === 'building' || d.kind === 'townhall' || d.kind === 'castle' ? d.z + d.len : d.z);
    const dec = [...this.decor].sort((a, b) => key(b) - key(a));
    for (const d of dec) {
      if (d.kind === 'sapinD') M.drawSapinDecor(c, P, d, adult);
      else if (d.kind === 'chalet') M.drawChalet(c, P, d, adult, t);
      else if (d.kind === 'pylon') M.drawPylon(c, P, d, adult, t);
      else if (d.kind === 'arch') M.drawArch(c, P, d, adult, t);
      else if (d.kind === 'building') G.drawFacade(c, P, d, adult, t);
      else if (d.kind === 'townhall') { G.drawFacade(c, P, d, adult, t); S.drawTownHall(c, P, d, adult); }
      else if (d.kind === 'tree') G.drawTree(c, P, d, adult);
      else if (d.kind === 'garland') G.drawGarland(c, P, d, adult, t);
      else if (d.kind === 'banner') G.drawBullBanner(c, P, d, adult, t);
      else if (d.kind === 'fountain') G.drawFountain(c, P, d, adult, t);
      else if (d.kind === 'kiosk') S.drawKiosk(c, P, d, adult);
      else if (d.kind === 'castle') S.drawCastleSide(c, P, d, adult);
      else if (d.kind === 'terrace') G.drawTerrace(c, P, d, adult);
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
      if (e.kind === 'obs') { if (this.mole && e.type !== 'cow') M.drawObstacleM(c, P, e, adult, t); else D.drawObstacle(c, P, e, adult, t); }
      else if (e.kind === 'gate') M.drawGate(c, P, e, adult, t);
      else if (e.type === 'meringue') {
        const s2 = P.s(e.z), lift = e.high ? this.ramoH * 0.55 * s2 : 0, u = P.unit * s2;
        M.drawMeringue(c, P.x(e.lane, e.z), P.y(e.z) - lift - u * (0.3 + 0.06 * Math.sin(t * 5 + e.z)), u * 1.3);
      } else D.drawPickup(c, P, e, t, this.ramoH);
    }
    if (!ramoDrawn) this.drawRamo(c);
    // blonde à l'écran (bonus charme)
    if (this.blonde) this.drawBlondeEvent(c);
    if (this.state === 'love') this.drawLove(c);
    if (this.mole) this.drawSnowfall(c);
    D.drawParticles(c, this.parts);
    if (this.closeup && this.state !== 'love') this.drawCloseup(c);
    if (this.state === 'intro') this.drawCountdown(c);
    if (this.state === 'win') this.drawWin(c);
    if (adult) { // vignette rose
      const g = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(120,0,90,0.35)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
    if (this.buffs.heat > 0) { c.fillStyle = `rgba(255,80,0,${0.08 + 0.05 * Math.sin(t * 10)})`; c.fillRect(0, 0, W, H); }
    c.restore();
  }

  drawCountdown(c) {
    const W = this.W, H = this.H, n = Math.min(3, Math.floor(this.introT / 0.8)), f = (this.introT % 0.8) / 0.8;
    const txt = n < 3 ? String(3 - n) : (this.mole ? 'GO !' : 'SANTÉ !');
    const sc = n < 3 ? 1.6 - 0.6 * Math.min(1, f * 3) : 1 + f * 0.4;
    const alpha = n < 3 ? 1 - Math.max(0, f - 0.75) * 4 : Math.max(0, 1 - f * 2.5);
    c.save(); c.globalAlpha = Math.max(0, alpha);
    c.translate(W / 2, H * 0.36); c.scale(sc, sc); c.rotate(n < 3 ? (1 - Math.min(1, f * 3)) * 0.3 : 0);
    c.font = `${Math.min(W * 0.3, 150)}px "Luckiest Guy", Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 12; c.strokeStyle = this.adult ? '#3a0040' : '#6b2a00'; c.strokeText(txt, 0, 0);
    c.fillStyle = n < 3 ? (this.adult ? '#ff4fd8' : '#ffcf2e') : '#7CFF6B'; c.fillText(txt, 0, 0);
    c.restore();
    if (this.introT < 0.5) { // titre du parcours
      c.save(); c.globalAlpha = 1 - this.introT * 2; c.font = '900 20px Nunito, sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff';
      c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 4; c.strokeText(this.level.name, W / 2, H * 0.22); c.fillText(this.level.name, W / 2, H * 0.22); c.restore();
    }
    c.save(); c.globalAlpha = 0.7; c.font = '800 13px Nunito, sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText('Touche pour passer', W / 2, H * 0.96); c.restore();
  }

  drawWin(c) {
    const W = this.W, H = this.H, k = Math.min(1, this.winT * 2);
    c.save(); c.globalAlpha = k; c.translate(W / 2, H * 0.3); c.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k); c.rotate(Math.sin(this.winT * 4) * 0.04);
    c.font = `${Math.min(W * 0.13, 64)}px "Luckiest Guy", Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 10; c.strokeStyle = '#6b2a00'; c.strokeText('ARRIVÉ !', 0, 0); c.fillStyle = '#ffcf2e'; c.fillText('ARRIVÉ !', 0, 0);
    c.font = '900 18px Nunito, sans-serif'; c.lineWidth = 5; c.strokeStyle = 'rgba(0,0,0,0.5)';
    const t2 = `Chrono restant : ${this.timeLeft.toFixed(1)} s`; c.strokeText(t2, 0, 50); c.fillStyle = '#fff'; c.fillText(t2, 0, 50);
    c.restore();
  }

  drawSnowfall(c) {
    const W = this.W, H = this.H, t = this.t;
    c.fillStyle = this.adult ? 'rgba(255,220,255,0.7)' : 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 28; i++) {
      const x = ((i * 73.1 + Math.sin(t + i) * 20 + t * 12) % W + W) % W, y = ((i * 131.7 + t * (60 + (i % 5) * 25)) % H);
      c.beginPath(); c.arc(x, y, 1 + (i % 3), 0, 7); c.fill();
    }
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
    const run = this.state === 'play' && p.jumpH === 0 && !sliding && !this.mole;
    const bob = run ? Math.abs(Math.sin(t * 15)) * h * 0.03 : 0;
    const dance = this.state === 'win' ? Math.sin(this.winT * 10) * 0.25 : 0;
    const tilt = (p.lane - p.x) * (this.mole ? -0.6 : -0.35) + (p.hitAnim > 0 ? Math.sin(p.hitAnim * 30) * 0.3 : 0) + (this.state === 'over' ? 1.2 : 0) + dance
      + (this.mole && this.state === 'play' ? Math.sin(t * 3) * 0.03 : 0);
    const feetY = base - jumpPx - bob;
    c.save();
    c.translate(x, feetY);
    c.rotate(tilt);
    c.scale(sx, sy);
    // queue (derrière)
    const wag = Math.sin(t * (this.p.wag > 0 || this.adult ? 18 : 9)) * (this.p.wag > 0 ? 0.6 : 0.25);
    if (this.p.wag > 0) this.p.wag -= 1 / 60;
    D.drawTail(c, w * 0.22, -h * 0.12, h * 0.75, 0.6 + wag);
    if (this.mole) { M.drawSled(c, w, h, t, this.adult); c.translate(0, -h * 0.05); }
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
