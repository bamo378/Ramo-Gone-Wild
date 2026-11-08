// =====================================================================
//  Jeu 4 : SUPER RAMO BROS — plateformes (inspiré du principe des jeux de plateformes classiques)
//  Moteur : physique en unités de tuiles, sous-pas fixes, collisions par axe.
// =====================================================================
import { buildLevel, ROWS } from './bros-levels.js';
import { rand, pick, faceOverlay, RAMO_FULL, drawTail } from './draw.js';
import { drawBlonde } from './blonde.js';
import { sfx } from './audio.js';
import * as A from './bros-art.js';

const SOLID = new Set(['#', '=', '?', 'p', 'X', 'T', 'U']);
const PH = { g: 44, jump: 17.6, run: 6.8, acc: 36, airAcc: 24, fric: 32, glide: 2.4, maxFall: 19, coyote: 0.1, buffer: 0.14, spring: 25, stomp: 11, stompHold: 15.5 };
export const CONTROLS_H = 150;

export class Bros {
  constructor(game, mode, id) {
    this.g = game; this.mode = mode; this.adult = mode === 'adult';
    this.L = buildLevel(id); this.id = id; this.world = this.L.world; this.theme = this.world.theme;
    this.ice = this.theme === 'moleson';
    this.keys = { left: false, right: false, jump: false };
    this.time = 0; this.score = 0; this.beers = 0; this.lives = 3; this.starsGot = [false, false, false]; this.starIdx = 0;
    this.stompChain = 0; this.bumps = new Map(); this.items = []; this.projectiles = []; this.state = 'play'; this.endT = 0;
    this.parse();
    this.p = this.newPlayer(this.start.x, this.start.y);
    this.checkpoint = { ...this.start };
    this.camX = 0; this.shakeT = 0; this.msgs = [];
    this.resize();
    this.camX = this.clampCam(this.p.x - this.viewWt * 0.35);
    this.intro = 1.6;
  }

  // ------------------------------------------------ lecture du niveau
  parse() {
    const G = this.L.grid; this.grid = G.map((r) => r.slice());
    this.enemies = []; this.platforms = []; this.springs = []; this.boss = null; this.flag = null; this.cp = null;
    let starN = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < this.L.width; c++) {
      const ch = G[r][c];
      const clear = () => { this.grid[r][c] = ' '; };
      if (ch === 'S') { this.start = { x: c + 0.15, y: r }; clear(); }
      else if (ch === 'g' || ch === 'r') { this.enemies.push(this.newEnemy(ch === 'g' ? 'walker' : 'roller', c, r)); clear(); }
      else if (ch === 'k') { this.enemies.push({ type: 'flyer', x: c, y: r, x0: c, y0: r, w: 0.9, h: 0.75, alive: true, ph: Math.random() * 6, dir: -1 }); clear(); }
      else if (ch === 'f') { this.enemies.push({ type: 'fish', x: c, y: ROWS + 1, x0: c, w: 0.8, h: 0.9, vy: 0, alive: true, wait: rand(0.5, 2), dir: 1 }); clear(); }
      else if (ch === 'M') { this.platforms.push({ x: c, y: r, w: 3, h: 0.45, x0: c, y0: r, ax: 6, ay: 0, sp: 0.55, ph: 0, dx: 0, dy: 0 }); clear(); }
      else if (ch === 'V') { this.platforms.push({ x: c, y: r, w: 3, h: 0.45, x0: c, y0: r, ax: 0, ay: -4, sp: 0.45, ph: 0, dx: 0, dy: 0 }); clear(); }
      else if (ch === 's') { this.springs.push({ x: c, y: r, t: 0 }); clear(); }
      else if (ch === 'C') { this.cp = { x: c, y: r, on: false }; clear(); }
      else if (ch === 'F') { this.flag = { x: c, y: r, drop: 0 }; clear(); }
      else if (ch === 'B') { this.bossSpawn = { x: c, y: r }; clear(); }
      else if (ch === '*') { this.grid[r][c] = '*' + (starN++); }
    }
    if (this.L.isBoss) this.boss = A.makeBoss(this.world.boss, this.bossSpawn.x - 0.5, ROWS - 3 - 2.6, this.adult);
  }
  newEnemy(type, c, r) { return { type, x: c + 0.05, y: r + 0.15, w: 0.9, h: 0.85, vx: type === 'roller' ? -1.4 : -1.5 - (this.world.id - 1) * 0.25, vy: 0, alive: true, state: 'walk', dir: -1, t: 0 }; }
  newPlayer(x, y) { return { x, y, w: 0.66, h: 0.95, vx: 0, vy: 0, big: false, onGround: false, coyote: 0, buffer: 0, face: 1, inv: 0, star: 0, glide: false, plat: null, dead: false, deadT: 0, runT: 0, grow: 0 }; }

  resize() {
    const W = this.g.W, H = this.g.H;
    this.viewH = H - CONTROLS_H;
    // zoom : ~10,5 rangées visibles (Ramo bien visible en portrait), la caméra suit aussi en hauteur
    this.visRows = Math.min(ROWS, Math.max(8.5, this.viewH / Math.max(44, W / 7)));
    this.T = Math.floor(this.viewH / this.visRows * 100) / 100; this.viewWt = W / this.T;
    if (this.camY === undefined) this.camY = ROWS - this.visRows;
    this.tiles = A.makeTileCache(this.theme, this.adult, this.T);
  }
  clampCam(x) { return Math.max(0, Math.min(this.L.width - this.viewWt, x)); }

  // ------------------------------------------------ commandes (boutons maintenus)
  setKey(k, down) {
    if (k === 'jump' && down && !this.keys.jump) this.p.buffer = PH.buffer;
    this.keys[k] = down;
  }

  tile(c, r) {
    if (c < 0 || c >= this.L.width) return 'X';
    if (r < 0 || r >= ROWS) return ' ';
    return this.grid[r][c];
  }
  solid(c, r) { return SOLID.has(this.tile(c, r)); }

  // ------------------------------------------------ boucle
  update(dt) {
    this.time += dt; if (this.shakeT > 0) this.shakeT -= dt;
    for (const [k, b] of this.bumps) { b.t -= dt; if (b.t <= 0) this.bumps.delete(k); }
    for (const s of this.springs) if (s.t > 0) s.t -= dt;
    if (this.intro > 0) this.intro -= dt;
    const steps = Math.ceil(dt / (1 / 120));
    for (let i = 0; i < steps; i++) this.step(dt / steps);
    // caméra
    const target = this.clampCam(this.p.x - this.viewWt * 0.38 + this.p.vx * 0.12);
    this.camX += (target - this.camX) * Math.min(1, dt * 7);
    const ty = Math.max(0, Math.min(ROWS - this.visRows, this.p.y + this.p.h / 2 - this.visRows * 0.6));
    this.camY += (ty - this.camY) * Math.min(1, dt * 4);
    this.hud();
  }

  step(dt) {
    const p = this.p;
    // plateformes mobiles
    for (const m of this.platforms) {
      m.ph += dt * m.sp;
      const f = (1 - Math.cos(m.ph * Math.PI)) / 2; // va-et-vient doux
      const nx = m.x0 + m.ax * f, ny = m.y0 + m.ay * f;
      m.dx = nx - m.x; m.dy = ny - m.y; m.x = nx; m.y = ny;
    }
    this.updateEnemies(dt);
    this.updateItems(dt);
    if (this.boss) this.updateBoss(dt);
    this.updateProjectiles(dt);
    if (this.state === 'goal') return this.updateGoal(dt);
    if (p.dead) return this.updateDeath(dt);
    this.updatePlayer(dt);
  }

  updatePlayer(dt) {
    const p = this.p, k = this.keys;
    if (p.inv > 0) p.inv -= dt; if (p.star > 0) p.star -= dt; if (p.grow > 0) p.grow -= dt;
    if (p.buffer > 0) p.buffer -= dt;
    const dir = (k.right ? 1 : 0) - (k.left ? 1 : 0);
    if (dir) p.face = dir;
    const ice = this.ice && p.onGround;
    const acc = (p.onGround ? PH.acc : PH.airAcc) * (ice ? 0.35 : 1);
    if (dir) { p.vx += dir * acc * dt; if (Math.abs(p.vx) > PH.run) p.vx = Math.sign(p.vx) * PH.run; }
    else { const f = PH.fric * (p.onGround ? (ice ? 0.2 : 1) : 0.35) * dt; p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f; }
    // saut (tampon + temps de grâce)
    if (p.onGround) p.coyote = PH.coyote; else p.coyote -= dt;
    if (p.buffer > 0 && p.coyote > 0) { p.vy = -PH.jump; p.buffer = 0; p.coyote = 0; p.onGround = false; p.plat = null; sfx.jump(); this.dust(); }
    if (!k.jump && p.vy < -7) p.vy = -7; // saut plus court si on relâche
    p.vy = Math.min(PH.maxFall, p.vy + PH.g * dt);
    // planeur : la queue de castor freine la chute
    p.glide = k.jump && p.vy > PH.glide && !p.onGround;
    if (p.glide) p.vy = PH.glide;
    // emporté par une plateforme mobile
    if (p.plat) { p.x += p.plat.dx; p.y += p.plat.dy; }
    this.moveX(p, p.vx * dt);
    const prevBottom = p.y + p.h;
    p.onGround = false;
    this.moveY(p, p.vy * dt, prevBottom, true);
    // atterrissage sur plateforme mobile
    p.plat = null;
    for (const m of this.platforms) {
      if (p.vy >= 0 && p.x + p.w > m.x + 0.05 && p.x < m.x + m.w - 0.05 && prevBottom <= m.y + 0.12 + Math.max(0, m.dy) && p.y + p.h >= m.y) {
        p.y = m.y - p.h; p.vy = 0; p.onGround = true; p.plat = m;
      }
    }
    // ressorts
    for (const s of this.springs) {
      if (p.vy >= 0 && p.x + p.w > s.x + 0.1 && p.x < s.x + 0.9 && p.y + p.h >= s.y + 0.45 && p.y + p.h <= s.y + 1.05) {
        p.vy = -PH.spring; p.onGround = false; s.t = 0.3; sfx.boing(); this.g.burst(this.sx(s.x + 0.5), this.sy(s.y + 0.4), 'dot', 8, { color: '#ffd84a' });
      }
    }
    if (p.vx && p.onGround) { p.runT += dt * Math.abs(p.vx); if (Math.random() < Math.abs(p.vx) * dt * 0.8) this.dust(0.4); }
    this.touchTiles();
    // ennemis
    for (const e of this.enemies) if (e.alive && !e.squash && this.overlap(p, e)) this.hitEnemy(e);
    if (this.boss && this.boss.alive && this.boss.active && this.overlap(p, this.boss)) this.hitBoss();
    for (const pr of this.projectiles) if (this.overlap(p, pr)) { if (p.star > 0) pr.dead = true; else this.hurt(); }
    // checkpoint, drapeau, chute
    if (this.cp && !this.cp.on && p.x > this.cp.x) { this.cp.on = true; this.checkpoint = { x: this.cp.x + 0.1, y: this.cp.y }; sfx.gate(); this.g.ui.message('🔔 Point de passage !', 1.6); }
    if (this.flag && p.x + p.w > this.flag.x + 0.3) this.reachGoal();
    if (p.y > ROWS + 0.5) this.die(true);
  }

  // collisions horizontales
  moveX(e, dx) {
    if (!dx) return false;
    e.x += dx;
    const r0 = Math.floor(e.y + 0.02), r1 = Math.floor(e.y + e.h - 0.02);
    const c = dx > 0 ? Math.floor(e.x + e.w) : Math.floor(e.x);
    for (let r = r0; r <= r1; r++) if (this.solid(c, r)) {
      // aide au rebord : le joueur qui arrive un poil trop bas est remonté sur la corniche
      if (e === this.p && r === r1 && e.vy >= -2 && e.y + e.h - r < 0.45 && !this.solid(c, r - 1) && !this.solid(c, r - 2) && (e.h < 1.2 || !this.solid(c, r - 3))) {
        e.y = r - e.h - 0.001; e.vy = 0; continue;
      }
      e.x = dx > 0 ? c - e.w - 0.001 : c + 1.001; if (e === this.p) e.vx = 0; return true;
    }
    return false;
  }
  // collisions verticales (sol, plafond, planches)
  moveY(e, dy, prevBottom, isPlayer) {
    e.y += dy;
    const c0 = Math.floor(e.x + 0.02), c1 = Math.floor(e.x + e.w - 0.02);
    if (dy > 0) {
      const r = Math.floor(e.y + e.h);
      for (let c = c0; c <= c1; c++) {
        const t = this.tile(c, r);
        if (SOLID.has(t) || (t === '-' && prevBottom <= r + 0.05)) { e.y = r - e.h; e.vy = 0; e.onGround = true; return true; }
      }
    } else if (dy < 0) {
      const r = Math.floor(e.y);
      let hit = null, best = 9;
      for (let c = c0; c <= c1; c++) if (this.solid(c, r)) { const d = Math.abs(c + 0.5 - (e.x + e.w / 2)); if (d < best) { best = d; hit = c; } }
      if (hit !== null) { e.y = r + 1; e.vy = 0; if (isPlayer) this.headBump(hit, r); return true; }
    }
    return false;
  }

  headBump(c, r) {
    const t = this.tile(c, r), key = c + ',' + r;
    sfx.lane();
    if (t === '?' || t === 'p') {
      this.grid[r][c] = 'U'; this.bumps.set(key, { t: 0.18 });
      if (t === '?') { this.addBeer(); this.items.push({ kind: 'popbeer', x: c + 0.2, y: r - 1, vy: -9, t: 0.45 }); }
      else this.items.push({ kind: this.p.big ? 'golden' : 'chope', x: c + 0.1, y: r, w: 0.8, h: 0.8, vx: 0, vy: 0, rise: 1, emerge: true });
    } else if (t === '=') {
      if (this.p.big) {
        this.grid[r][c] = ' '; this.score += 50; sfx.slide(); this.shakeT = 0.1;
        for (let i = 0; i < 4; i++) this.items.push({ kind: 'debris', x: c + 0.5, y: r + 0.5, vx: (i % 2 ? 1 : -1) * rand(3, 5), vy: -rand(8, 13), t: 1.2, rot: 0, col: A.brickColor(this.theme, this.adult) });
      } else this.bumps.set(key, { t: 0.18 });
    } else this.bumps.set(key, { t: 0.12 });
    // un ennemi posé sur le bloc est éjecté
    for (const e of this.enemies) if (e.alive && Math.abs(e.x + e.w / 2 - (c + 0.5)) < 0.9 && Math.abs(e.y + e.h - r) < 0.2) this.killEnemy(e, true);
  }

  touchTiles() {
    const p = this.p;
    for (let r = Math.floor(p.y); r <= Math.floor(p.y + p.h - 0.01); r++) for (let c = Math.floor(p.x); c <= Math.floor(p.x + p.w - 0.01); c++) {
      const t = this.tile(c, r);
      if (t === 'o') { this.grid[r][c] = ' '; this.addBeer(); this.sparkle(c + 0.5, r + 0.5, '#ffd84a'); }
      else if (t[0] === '*') {
        this.grid[r][c] = ' '; const i = this.starIdx++; if (i < 3) this.starsGot[i] = true;
        this.score += 1000; sfx.golden(); this.g.closeupShow('wink', `⭐ Étoile ${this.starsGot.filter(Boolean).length}/3 !`);
        this.g.burst(this.sx(c + 0.5), this.sy(r + 0.5), 'confetti', 30, { color: '#ffd84a' });
      } else if (t === '^' && p.y + p.h > r + 0.45) this.hurt();
    }
  }

  addBeer() {
    this.beers++; this.score += 10; sfx.beer();
    if (this.beers % 50 === 0) { this.lives++; sfx.record(); this.g.ui.message('🍺 50 bières : +1 vie !', 1.8); }
    if (Math.random() < 0.04) this.g.closeupShow('wink', pick(['Santé !', 'Glou glou !', 'Une petite dernière ?']));
  }

  overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

  // ------------------------------------------------ ennemis
  updateEnemies(dt) {
    const camL = this.camX - 4, camR = this.camX + this.viewWt + 4;
    for (const e of this.enemies) {
      if (!e.alive) { if (e.squash) { e.squash -= dt; if (e.squash <= 0) e.squash = 0; } else if (e.fall) { e.vy += PH.g * dt; e.y += e.vy * dt; e.x += (e.vx || 0) * dt; } continue; }
      if (e.x < camL || e.x > camR) continue; // endormis hors écran
      e.t = (e.t || 0) + dt;
      if (e.type === 'walker' || e.type === 'roller') {
        if (e.state === 'stop') { e.vx = 0; }
        e.vy = Math.min(PH.maxFall, (e.vy || 0) + PH.g * dt);
        if (this.moveX(e, e.vx * dt)) { e.vx = -e.vx; if (e.state === 'kick') sfx.lane(); }
        const pb = e.y + e.h; e.onGround = false; this.moveY(e, e.vy * dt, pb, false);
        for (const m of this.platforms) if (e.vy >= 0 && e.x + e.w > m.x && e.x < m.x + m.w && pb <= m.y + 0.15 && e.y + e.h >= m.y) { e.y = m.y - e.h; e.vy = 0; e.x += m.dx; }
        if (e.y > ROWS + 2) e.alive = false;
        if (e.state === 'kick') for (const o of this.enemies) if (o !== e && o.alive && this.overlap(e, o)) { this.killEnemy(o, true); this.chain(o); }
      } else if (e.type === 'flyer') {
        e.ph += dt; e.x = e.x0 + Math.sin(e.ph * 0.9) * 2.5; e.y = e.y0 + Math.sin(e.ph * 2.6) * 0.7; e.dir = Math.cos(e.ph * 0.9) > 0 ? 1 : -1;
      } else if (e.type === 'fish') {
        if (e.y > ROWS + 0.5) { e.wait -= dt; if (e.wait <= 0) { e.y = ROWS + 0.4; e.vy = -18.5; e.wait = rand(1.2, 2.6); } }
        else { e.vy += PH.g * 0.8 * dt; e.y += e.vy * dt; }
      }
    }
  }

  hitEnemy(e) {
    const p = this.p;
    if (p.star > 0) { this.killEnemy(e, true); this.chain(e); return; }
    const stomp = p.vy > 0 && p.y + p.h - e.y < 0.6;
    if (e.type === 'roller' && e.state === 'stop' && !stomp) { // on tape dans la roue arrêtée : elle part
      e.state = 'kick'; e.vx = (p.x + p.w / 2 < e.x + e.w / 2 ? 1 : -1) * 11; sfx.boing(); p.inv = Math.max(p.inv, 0.25); return;
    }
    if (stomp) {
      p.vy = -(this.keys.jump ? PH.stompHold : PH.stomp); p.onGround = false;
      if (e.type === 'roller') { e.state = e.state === 'stop' ? 'kick' : 'stop'; e.vx = e.state === 'kick' ? (p.face || 1) * 11 : 0; sfx.boing(); this.chain(e); return; }
      e.alive = false; e.squash = 0.45; sfx.boing(); this.chain(e);
      this.g.burst(this.sx(e.x + 0.5), this.sy(e.y), 'dot', 10, { color: '#8b5a33' });
      return;
    }
    if (p.inv > 0) return;
    this.hurt();
  }
  chain(e) {
    this.stompChain = this.p.onGround ? 1 : this.stompChain + 1;
    const pts = 100 * Math.min(8, Math.pow(2, Math.max(0, this.stompChain - 1)));
    this.score += pts;
    this.g.burst(this.sx(e.x + 0.5), this.sy(e.y - 0.3), 'text', 1, { text: `+${pts}`, color: '#fff', size: 18 });
  }
  killEnemy(e, flip) { e.alive = false; e.fall = flip; e.vy = -9; e.vx = rand(-2, 2); e.squash = 0; this.score += 100; sfx.hit(); }

  // ------------------------------------------------ objets (bonus, débris)
  updateItems(dt) {
    for (const it of this.items) {
      if (it.kind === 'popbeer') { it.t -= dt; it.vy += 30 * dt; it.y += it.vy * dt; if (it.t <= 0) it.dead = true; continue; }
      if (it.kind === 'debris') { it.t -= dt; it.vy += PH.g * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.rot += dt * 10; if (it.t <= 0) it.dead = true; continue; }
      if (it.emerge) { it.y -= dt * 2.2; it.rise -= dt * 2.2; if (it.rise <= 0) { it.emerge = false; it.vx = it.kind === 'golden' ? 3.5 : 3; it.vy = it.kind === 'golden' ? -10 : 0; } continue; }
      it.vy = Math.min(PH.maxFall, it.vy + PH.g * dt);
      if (this.moveX(it, it.vx * dt)) it.vx = -it.vx;
      const pb = it.y + it.h; it.onGround = false;
      if (this.moveY(it, it.vy * dt, pb, false) && it.kind === 'golden') it.vy = -11;
      if (it.y > ROWS + 2) it.dead = true;
      if (!this.p.dead && this.overlap(this.p, it)) { it.dead = true; this.powerUp(it.kind); }
    }
    this.items = this.items.filter((i) => !i.dead);
  }
  powerUp(kind) {
    const p = this.p;
    if (kind === 'chope') {
      this.score += 500;
      if (!p.big) { p.big = true; p.y -= 0.55; p.h = 1.5; p.grow = 0.6; }
      sfx.big(); this.g.closeupShow('wink', pick(['GRANDE CHOPE : Ramo grandit !', 'Une chope et ça repart !']));
    } else { this.score += 1000; p.star = 9; sfx.golden(); this.g.closeupShow('surprise', 'BIÈRE DORÉE : invincible !'); }
    this.g.burst(this.sx(p.x + p.w / 2), this.sy(p.y), 'confetti', 24, { color: kind === 'chope' ? '#f5b82e' : '#ffd700' });
  }

  // ------------------------------------------------ boss
  updateBoss(dt) {
    const b = this.boss, p = this.p;
    if (!b.active && p.x > 6 && b.alive) { b.active = true; this.g.ui.message(`👑 ${b.name} !`, 2); sfx.wolf(); this.shakeT = 0.4; }
    if (!b.active) return;
    A.bossThink(this, b, dt);
  }
  hitBoss() {
    const b = this.boss, p = this.p;
    const stomp = p.vy > 0 && p.y + p.h - b.y < 0.8;
    if ((stomp || p.star > 0) && b.inv <= 0) {
      p.vy = -PH.stompHold; b.hp--; b.inv = 1.3; this.shakeT = 0.3; sfx.hit(); this.score += 1000;
      this.g.burst(this.sx(b.x + b.w / 2), this.sy(b.y), 'text', 1, { text: b.hp > 0 ? 'OUILLE !' : 'K.O. !', color: '#ffd84a', size: 28 });
      this.g.closeupShow('wink', b.hp > 0 ? pick(['Prends ça !', 'Encore un coup !', `Plus que ${b.hp} !`]) : 'VICTOIRE !');
      if (b.hp <= 0) this.defeatBoss();
      return;
    }
    if (stomp) { p.vy = -PH.stomp; return; }
    if (p.inv <= 0) this.hurt();
  }
  defeatBoss() {
    const b = this.boss; b.alive = false; b.dead = true; b.vy = -12; this.projectiles = [];
    sfx.record(); setTimeout(() => sfx.golden(), 300);
    this.g.burst(this.sx(b.x + b.w / 2), this.sy(b.y + 1), 'confetti', 60, {});
    for (let i = 0; i < 12; i++) this.items.push({ kind: 'popbeer', x: b.x + rand(-2, 3), y: b.y + rand(-1, 1), vy: -rand(6, 12), t: 0.7 });
    this.beers += 12; this.score += 120 + 5000;
    this.flag = { x: this.L.width - 5, y: ROWS - 3, drop: 0 };
    this.g.ui.message('🏆 Boss vaincu ! Va au drapeau !', 2.4);
  }
  updateProjectiles(dt) {
    for (const pr of this.projectiles) {
      pr.t = (pr.t || 0) + dt;
      if (pr.grav) pr.vy += PH.g * pr.grav * dt;
      pr.x += pr.vx * dt; pr.y += pr.vy * dt;
      if (pr.roll && pr.y + pr.h > ROWS - 2) { pr.y = ROWS - 2 - pr.h; pr.vy = 0; }
      if (pr.bounce && pr.y + pr.h > ROWS - 2) { pr.y = ROWS - 2 - pr.h; pr.vy = -Math.abs(pr.vy) * 0.6; }
      if (pr.x < -2 || pr.x > this.L.width + 2 || pr.y > ROWS + 2 || pr.t > 8) pr.dead = true;
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);
  }

  // ------------------------------------------------ dégâts, mort, arrivée
  hurt() {
    const p = this.p;
    if (p.inv > 0 || p.star > 0 || p.dead || this.state !== 'play') return;
    if (p.big) {
      p.big = false; p.h = 0.95; p.y += 0.55; p.inv = 1.8; sfx.hit(); this.shakeT = 0.25;
      this.g.closeupShow('grimace', pick(['Aïe ! Plus de chope…', 'Ramo rapetisse !']));
    } else this.die(false);
  }
  die(fell) {
    const p = this.p; if (p.dead) return;
    p.dead = true; p.deadT = 0; p.vy = fell ? 0 : -14; p.vx = 0; this.lives--;
    sfx.hit(); this.shakeT = 0.35;
    this.g.closeupShow('grimace', fell ? pick(['Plouf ! Ramo est tombé…', 'Le vide, c\'est pas pour les castors !']) : pick(['Aïe aïe aïe !', 'Le castor a pris une baffe !', 'Ça pique !']));
  }
  updateDeath(dt) {
    const p = this.p; p.deadT += dt;
    if (p.deadT > 0.35) { p.vy += PH.g * 0.7 * dt; p.y += p.vy * dt; }
    if (p.deadT > 1.7 && !this.reported) {
      if (this.lives > 0) {
        this.p = this.newPlayer(this.checkpoint.x, this.checkpoint.y); this.p.inv = 1.5;
        this.camX = this.clampCam(this.p.x - this.viewWt * 0.35); this.projectiles = [];
        if (this.boss && this.boss.alive) A.resetBoss(this.boss);
        this.g.ui.message(`❤️ Encore ${this.lives} vie${this.lives > 1 ? 's' : ''} !`, 1.6);
      } else {
        this.reported = true; const g = this.g; g.state = 'over'; g.reported = true; sfx.gameover();
        g.ui.gameOver({ score: this.score, distance: 0, beers: this.beers, mode: this.mode, duration: Math.round(this.time), course: 'bros', result: 'dead', timeLeft: 0, brosId: this.id });
      }
    }
  }
  reachGoal() {
    if (this.state !== 'play') return;
    this.state = 'goal'; this.endT = 0; const p = this.p; p.vx = 0; p.vy = 0; p.x = this.flag.x - 0.35;
    const h = Math.max(0, (ROWS - 2) - (p.y + p.h)); // hauteur sur le mât = bonus
    this.flagBonus = Math.round(h * 400 / 100) * 100;
    this.score += this.flagBonus; sfx.record();
    this.g.burst(this.sx(this.flag.x), this.sy(p.y), 'text', 1, { text: `+${this.flagBonus}`, color: '#fff', size: 24 });
  }
  updateGoal(dt) {
    const p = this.p; this.endT += dt;
    if (p.y + p.h < ROWS - 2) p.y = Math.min(ROWS - 2 - p.h, p.y + dt * 7); // glisse le long du mât
    this.flag.drop = Math.min(1, this.flag.drop + dt * 1.2);
    if (this.endT > 0.9) { p.x += dt * 3.5; p.face = 1; p.runT += dt * 3.5; }
    if (this.endT > 0.9 && Math.random() < 0.3) this.g.burst(rand(0, this.g.W), rand(0, this.viewH * 0.4), 'confetti', 2, {});
    if (this.endT > 2.8 && !this.reported) {
      this.reported = true;
      const par = this.L.isBoss ? 90 : this.L.width / 3.2;
      const timeBonus = Math.max(0, Math.round((par - this.time) * 10)) * 10;
      const lifeBonus = this.lives * 300;
      this.score += timeBonus + lifeBonus;
      const g = this.g; g.state = 'over'; g.reported = true;
      g.ui.brosDone({ id: this.id, score: this.score, stars: this.starsGot.slice(), time: this.time, beers: this.beers, timeBonus, lifeBonus, flagBonus: this.flagBonus, boss: this.L.isBoss, mode: this.mode });
    }
  }

  dust(k = 1) { const p = this.p; for (let i = 0; i < 3 * k; i++) this.g.parts.push({ kind: 'dot', x: this.sx(p.x + p.w / 2) + rand(-6, 6), y: this.sy(p.y + p.h), vx: rand(-60, 60), vy: rand(-60, -10), life: 0.35, max: 0.35, size: rand(2, 4), color: A.dustColor(this.theme, this.adult), g: 200 }); }
  sparkle(x, y, col) { for (let i = 0; i < 6; i++) this.g.parts.push({ kind: 'dot', x: this.sx(x), y: this.sy(y), vx: rand(-90, 90), vy: rand(-120, 20), life: 0.4, max: 0.4, size: rand(2, 4), color: col, g: 150 }); }

  hud() {
    const n = this.starsGot.filter(Boolean).length;
    this.g.score = this.score;
    this.g.ui.hud({ score: this.score, lives: Math.min(3, Math.max(0, this.lives)), distance: 0, bonus: this.p.star > 0 ? `⭐ Invincible ${Math.ceil(this.p.star)}s` : '', combo: 1, mole: false, cross: false,
      brosText: `🍺 ${this.beers} · ⭐ ${n}/3 · ${this.id.replace('B', 'BOSS')}` + (this.lives > 3 ? ` · ❤️ ${this.lives}` : '') });
  }

  // ------------------------------------------------ rendu
  sx(x) { return (x - this.camX) * this.T; }
  sy(y) { return (y - this.camY) * this.T; }
  render(c) { A.renderLevel(this, c); }
}
