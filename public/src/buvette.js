// =====================================================================
//  Jeu 5 : RAMO BUVETTE — au chalet des 4F (gym de Bulle)
//  Principe « service au comptoir » : on prépare (tireuse, grill, caquelon…)
//  puis on tape la cliente / le client pour servir. Journées courtes,
//  pourboires, combos, améliorations à acheter entre les journées.
// =====================================================================
import { rand, pick } from './draw.js';
import { sfx } from './audio.js';
import { makePerson, bustSprite, drawItem, drawSausage, drawScene, drawCounter, drawBubble, ITEMS, clearCache } from './buvette-art.js';
import { roundRect as rr } from './draw.js';

export const DAY_LEN = 80;          // secondes par journée
export const REP_MAX = 5;           // clients fâchés tolérés
export const UNLOCK = { beer: 1, cuchaule: 1, sausage: 2, meringue: 3, kirsch: 4, fondue: 5 };

// Améliorations (boutique) : niveaux et prix
export const UPGRADES = [
  { id: 'tireuse', name: 'Tireuse rapide', emo: '🍺', desc: 'La bière coule plus vite', costs: [60, 160, 380] },
  { id: 'tireuse2', name: '2e tireuse', emo: '🍻', desc: 'Deux bières en même temps', costs: [240] },
  { id: 'auto', name: 'Tireuse automatique', emo: '🤖', desc: 'S\'arrête toute seule (pinte normale)', costs: [420] },
  { id: 'plateau', name: 'Grand plateau', emo: '🍽️', desc: '+1 place sur le plateau', costs: [110, 300] },
  { id: 'grill', name: 'Grand grill', emo: '🔥', desc: '+1 saucisse sur le grill', costs: [140, 360] },
  { id: 'caquelon', name: '2e caquelon', emo: '🫕', desc: 'Deux fondues en même temps', costs: [320] },
  { id: 'terrasse', name: 'Terrasse', emo: '🪑', desc: '+1 client au comptoir', costs: [200, 520] },
  { id: 'deco', name: 'Fanions & lampions', emo: '🎏', desc: 'Les clients patientent +15 %', costs: [80, 220, 480] },
  { id: 'orchestre', name: 'Orchestre champêtre', emo: '🪗', desc: 'Pourboires +25 %', costs: [300, 750] },
  { id: 'affiche', name: 'Affiches dans Bulle', emo: '📣', desc: 'Plus de clients, prix +10 %', costs: [260, 620, 1300] },
  { id: 'lea', name: 'Léa, la serveuse', emo: '💁‍♀️', desc: 'Elle sert les clients toute seule', costs: [650, 1400] },
];
export function target(day) { const b = Math.round(40 + 28 * (day - 1) + 1.5 * (day - 1) * (day - 1)); return [b, Math.round(b * 1.6), Math.round(b * 2.4)]; }
export function eventFor(day) {
  if (day < 3 || day % 2 === 0) return null;
  return ['match', 'desalpe', 'benichon', 'orage', 'vip'][((day - 3) / 2) % 5];
}
export const EVENTS = {
  match: { name: '🏒 Soir de match de Gottéron !', sub: 'Les supporters ont soif : bières à gogo' },
  desalpe: { name: '🐄 Jour de désalpe !', sub: 'Les armaillis descendent : fondues et saucisses' },
  benichon: { name: '🎉 C\'est la Bénichon !', sub: 'Tout le monde est là, prix ×1,5' },
  orage: { name: '⛈️ Orage sur la Gruyère', sub: 'Moins de monde, mais pourboires ×2' },
  vip: { name: '👑 Miss Gruyère passe ce soir', sub: 'Sers-la vite : énorme pourboire !' },
};
const SAY_IN = ['Une mousse, Ramo !', 'Salut le castor !', 'Il fait soif !', 'Santé la gym !', 'Comme d\'hab !'];
const SAY_IN_A = ['Tu me sers, beau castor ? 😘', 'On commence la soirée ?', 'Salut toi… 😏', 'Une tournée !'];
const SAY_OK = ['Merci Ramo !', 'Santé !', 'Trop bon !', 'À la vôtre !', 'Le meilleur chalet !', 'Top service !'];
const SAY_OK_A = ['Merci mon castor 😘', 'Tu me plais toi…', 'Santé ! 💋', 'Je reviens tout à l\'heure 😉'];
const SAY_KO = ['C\'est long !', 'Je vais ailleurs…', 'Bon ben salut !', 'Service de castor…'];
const REGULARS = [
  { name: 'Raillou', fem: false, hair: 'short', beard: 'stubble', outfit: 'gym', cloth: '#d52b1e', beers: true },
  { name: 'Boss', fem: false, hair: 'side', outfit: 'check', cloth: '#2f6fd1', acc: ['glasses'], rich: true },
  { name: 'Bamo', fem: false, hair: 'short', outfit: 'tee', cloth: '#1f2a44', beers: true },
];

export class Buvette {
  constructor(g, mode, save) {
    this.g = g; this.adult = mode === 'adult'; this.mode = mode; this.save = save;
    this.day = save.day; this.u = save.upg || {};
    const L = (id) => this.u[id] || 0;
    this.seats = 3 + L('terrasse'); this.trayMax = 3 + L('plateau');
    this.fillTime = [1.7, 1.35, 1.1, 0.9][L('tireuse')];
    this.patMult = 1 + 0.15 * L('deco'); this.tipMult = 1 + 0.25 * L('orchestre');
    this.priceMult = 1 + 0.1 * L('affiche'); this.crowd = 1 + 0.14 * L('affiche');
    this.event = eventFor(this.day);
    if (this.event === 'benichon') { this.priceMult *= 1.5; this.crowd *= 1.3; }
    if (this.event === 'match') this.crowd *= 1.45;
    if (this.event === 'orage') { this.crowd *= 0.72; this.tipMult *= 2; }
    this.menu = Object.keys(UNLOCK).filter((k) => UNLOCK[k] <= this.day);
    this.targets = target(this.day);
    this.time = DAY_LEN; this.elapsed = 0; this.intro = 2.4;
    this.earned = 0; this.tips = 0; this.served = 0; this.angry = 0; this.perfect = 0; this.rep = REP_MAX;
    this.combo = 0; this.bestCombo = 0;
    this.custs = []; this.tray = []; this.fly = []; this.spawnCd = 0.4; this.lastCall = false; this.ended = false; this.endT = 0;
    this.taps = [{ st: 'idle', f: 0 }]; if (L('tireuse2')) this.taps.push({ st: 'idle', f: 0 });
    this.auto = !!L('auto');
    this.grill = Array.from({ length: 2 + L('grill') }, () => null);
    this.pots = Array.from({ length: 1 + L('caquelon') }, () => null);
    this.cool = {}; this.ramo = { bounce: 0, shake: 0, mood: 'ok' };
    this.lea = L('lea') ? { lvl: L('lea'), x: 0.85, tx: 0.85, cd: 1.5, carry: null, target: null, bob: 0, p: makePerson({ fem: true, hair: 'braids', hairC: '#e8c15f', outfit: this.adult ? 'gown' : 'dirndl', cloth: this.adult ? '#e8287a' : '#c0392b', cloth2: '#2e9a5a', eye: '#4a7bb5', lip: '#d0485e', skin: '#f1cbb0', acc: ['earrings'], name: 'Léa' }) } : null;
    this.vipLeft = this.event === 'vip' ? 3 : (this.day >= 4 && Math.random() < 0.5 ? 1 : 0);
    this.tut = this.day === 1 ? 0 : -1; // étapes du tutoriel du 1er jour
    clearCache(); this.bg = null;
    this.resize();
  }

  // ------------------------------------------------ mise en page
  resize() {
    const g = this.g, W = g.W, H = g.H;
    this.W = W; this.H = H; this.top = 64;
    this.counterY = Math.round(H * 0.47); this.counterH = Math.round(Math.max(44, H * 0.065));
    const n = this.seats; this.spotW = W / n;
    this.S = Math.min(this.spotW * 1.12, H * 0.21, 170);
    const ty = this.counterY + this.counterH + 6; this.trayY = ty; this.trayH = Math.max(50, Math.min(64, H * 0.072));
    const sy = ty + this.trayH + 6, sh = (H - sy - 8) / 2;
    const cols = 4, cw = W / cols;
    const ids = ['tap0', 'tap1', 'grill', 'fondue', 'cuchaule', 'meringue', 'kirsch', 'trash'];
    this.cells = ids.map((id, i) => ({ id, x: (i % cols) * cw + 3, y: sy + Math.floor(i / cols) * sh + 3, w: cw - 6, h: sh - 6 }));
    this.bg = null;
  }
  spotX(i) { return this.spotW * (i + 0.5); }

  // ------------------------------------------------ clients
  spawn() {
    const used = new Set(this.custs.filter((c) => c.st !== 'out').map((c) => c.spot));
    const free = []; for (let i = 0; i < this.seats; i++) if (!used.has(i)) free.push(i);
    if (!free.length) return false;
    const spot = pick(free);
    let p, vip = false, reg = null;
    if (this.vipLeft > 0 && this.elapsed > 12 && Math.random() < 0.18) {
      this.vipLeft--; vip = true;
      p = makePerson({ fem: true, hair: pick(['wavy', 'long']), hairC: pick(['#f2d27a', '#8a4b2a', '#1f1612']), outfit: this.adult ? 'gown' : 'blouse', cloth: this.adult ? '#c0182c' : '#f7f1ff', acc: ['earrings', 'necklace'], sash: 'MISS GRUYÈRE', lip: '#c23a55' });
    } else if (Math.random() < 0.09) {
      reg = pick(REGULARS); p = makePerson({ ...reg, acc: reg.acc || [] });
    } else {
      const o = {};
      if (this.event === 'desalpe' && Math.random() < 0.55) Object.assign(o, { fem: false, outfit: 'bredzon', acc: ['capet'] });
      if (this.event === 'match' && Math.random() < 0.6) Object.assign(o, { outfit: 'tee', cloth: pick(['#111111', '#f0f0f0']) });
      if (this.adult && Math.random() < 0.7) Object.assign(o, { fem: true, outfit: pick(['gown', 'gown', 'top']), cloth: pick(['#e8287a', '#111111', '#8a3ad9', '#d4af37', '#c0182c']) });
      p = makePerson(o);
    }
    // commande
    const maxN = Math.min(3, 1 + Math.floor((this.day + 1) / 3));
    const n = reg && reg.beers ? Math.min(3, 2 + (Math.random() < 0.4 ? 1 : 0)) : 1 + Math.floor(Math.random() * maxN * 0.999);
    const order = [];
    for (let i = 0; i < n; i++) {
      let k;
      if (reg && reg.beers) k = 'beer';
      else if (this.event === 'match' && Math.random() < 0.6) k = 'beer';
      else if (this.event === 'desalpe' && Math.random() < 0.5) k = pick(this.menu.filter((m) => m === 'sausage' || m === 'fondue' || m === 'beer'));
      else k = Math.random() < 0.38 ? 'beer' : pick(this.menu);
      order.push({ kind: k, done: false });
    }
    order.sort((a, b) => Object.keys(ITEMS).indexOf(a.kind) - Object.keys(ITEMS).indexOf(b.kind));
    let pat = (19 + order.length * 4.5 - Math.min(10, this.day * 0.5)) * this.patMult;
    if (order.some((o) => o.kind === 'fondue')) pat += 4;
    if (this.event === 'desalpe') pat *= 1.25;
    if (vip) pat *= 0.8;
    const c = { p, spot, order, pat, patMax: pat, st: 'in', t: 0, enter: 1, side: this.spotX(spot) < this.W / 2 ? -1 : 1, vip, reg: reg && reg.name, rich: reg && reg.rich, blinkT: rand(1, 4), blink: 0, mood: 'wait', shake: 0, hop: 0 };
    this.custs.push(c);
    if (Math.random() < 0.3 || vip) this.say(c, vip ? 'Bonsoir Ramo ✨' : pick(this.adult ? SAY_IN_A : SAY_IN));
    return true;
  }
  say(c, text, force) {
    const busy = this.custs.some((o) => o !== c && o.sayT > 0);
    if (busy && !force) return;
    if (force) for (const o of this.custs) if (o !== c) o.sayT = 0;
    c.sayT = 2.2; c.sayTx = text;
  }
  custBox(c) {
    const x = this.spotX(c.spot), S = this.S, bot = this.counterY + S * 0.05;
    return { x: x - this.spotW / 2, y: bot - S * 1.45, w: this.spotW, h: S * 1.45, cx: x, bot };
  }

  // ------------------------------------------------ commandes
  tap(x, y) {
    if (this.ended) return;
    if (this.intro > 0) { this.intro = 0; return; }
    // plateau : retirer un élément
    if (y >= this.trayY && y <= this.trayY + this.trayH) {
      const i = this.traySlotAt(x); if (i >= 0 && i < this.tray.length) { const it = this.tray.splice(i, 1)[0]; this.floater(x, this.trayY, 'Jeté !', '#ccc'); sfx.slide(); void it; }
      return;
    }
    for (const cell of this.cells) if (x >= cell.x && x <= cell.x + cell.w && y >= cell.y && y <= cell.y + cell.h) { this.useCell(cell); return; }
    // client
    for (const c of this.custs) {
      if (c.st !== 'wait') continue; const b = this.custBox(c);
      if (x >= b.x && x <= b.x + b.w && y >= b.y - 40 && y <= this.counterY + this.counterH) { this.serve(c, null); return; }
    }
  }
  traySlotAt(x) { const x0 = this.trayX0(), sw = this.slotW(); const i = Math.floor((x - x0) / sw); return i >= 0 && i < this.trayMax ? i : -1; }
  trayX0() { return this.trayH * 1.15 + 10; }
  slotW() { return Math.min(64, (this.W - this.trayX0() - 8) / this.trayMax); }
  room() { return this.tray.length < this.trayMax; }
  push(kind, o = {}) {
    if (!this.room()) { this.floater(this.W / 2, this.trayY + 10, 'Plateau plein !', '#ffd84a'); sfx.lane(); return false; }
    this.tray.push({ kind, perfect: !!o.perfect, t: 0 }); return true;
  }
  locked(id) {
    if (id === 'tap1') return this.taps.length < 2 ? 'shop' : null;
    const k = { tap0: 'beer', grill: 'sausage', fondue: 'fondue', cuchaule: 'cuchaule', meringue: 'meringue', kirsch: 'kirsch' }[id];
    return k && UNLOCK[k] > this.day ? `day${UNLOCK[k]}` : null;
  }
  useCell(cell) {
    const id = cell.id; const cx = cell.x + cell.w / 2, cy = cell.y + cell.h * 0.4;
    const lk = this.locked(id);
    if (lk) { this.floater(cx, cy, lk === 'shop' ? 'À la boutique !' : `Dès le jour ${lk.slice(3)}`, '#fff'); sfx.lane(); return; }
    if (id === 'tap0' || id === 'tap1') {
      const tp = this.taps[id === 'tap0' ? 0 : 1];
      if (tp.st === 'idle') { tp.st = 'fill'; tp.f = 0; sfx.slide(); if (this.tut === 0) this.tut = 1; }
      else if (tp.st === 'fill') this.stopTap(tp, cell);
      else if (tp.st === 'full') { if (this.push('beer', { perfect: tp.perfect })) { tp.st = 'idle'; tp.f = 0; sfx.click(); } }
      return;
    }
    if (id === 'grill') {
      const burnt = this.grill.findIndex((s) => s && s.c >= 2.2);
      if (burnt >= 0) { this.grill[burnt] = null; this.floater(cx, cy, 'Cramée ! 🔥', '#ff9f43'); sfx.slide(); return; }
      const ready = this.grill.findIndex((s) => s && s.c >= 1);
      if (ready >= 0 && this.room()) { this.grill[ready] = null; this.push('sausage'); sfx.click(); return; }
      const free = this.grill.indexOf(null);
      if (free >= 0) { this.grill[free] = { c: 0 }; sfx.slide(); return; }
      if (ready >= 0) this.push('sausage'); else this.floater(cx, cy, 'Ça grille…', '#fff');
      return;
    }
    if (id === 'fondue') {
      const ready = this.pots.findIndex((s) => s && s.c >= 1);
      if (ready >= 0) { if (this.push('fondue')) { this.pots[ready] = null; sfx.click(); } return; }
      const free = this.pots.indexOf(null);
      if (free >= 0) { this.pots[free] = { c: 0 }; sfx.slide(); return; }
      this.floater(cx, cy, 'Ça fond…', '#fff'); return;
    }
    if (id === 'trash') { if (this.tray.length) { this.tray.pop(); sfx.slide(); this.floater(cx, cy, 'Poubelle !', '#ccc'); } return; }
    // produits instantanés
    if ((this.cool[id] || 0) > 0) return;
    if (this.push(id)) { this.cool[id] = 0.22; sfx.click(); }
  }
  stopTap(tp, cell) {
    const f = tp.f, cx = cell.x + cell.w / 2, cy = cell.y + cell.h * 0.3;
    if (f < 0.55) { tp.st = 'idle'; tp.f = 0; this.floater(cx, cy, 'Pas assez !', '#ff7a7a'); sfx.lane(); return; }
    const perfect = f >= 0.8 && f <= 0.98;
    if (perfect) { this.floater(cx, cy, 'PINTE PARFAITE ★', '#ffd84a'); sfx.gate(); if (this.tut === 1) this.tut = 2; }
    else this.floater(cx, cy, f < 0.8 ? 'Un peu juste…' : 'Ça mousse !', '#fff');
    if (this.tut === 1) this.tut = 2;
    tp.perfect = perfect;
    if (this.push('beer', { perfect })) { tp.st = 'idle'; tp.f = 0; } else tp.st = 'full';
  }

  // Servir un client : on donne tout ce qui correspond sur le plateau
  serve(c, onlyOne) {
    let gave = 0;
    for (const o of c.order) {
      if (o.done) continue;
      const i = this.tray.findIndex((t) => t.kind === o.kind); if (i < 0) continue;
      const it = this.tray.splice(i, 1)[0]; o.done = true; o.perfect = it.perfect; gave++;
      const sx = onlyOne ? this.W * this.lea.x : this.trayX0() + this.slotW() * (i + 0.5), sy = onlyOne ? this.counterY : this.trayY + this.trayH / 2;
      const b = this.custBox(c); this.fly.push({ kind: o.kind, x0: sx, y0: sy, x1: b.cx, y1: b.bot - this.S * 0.35, t: 0, perfect: it.perfect });
      if (onlyOne) break;
    }
    if (!gave) { if (!onlyOne) { c.shake = 0.35; this.floater(this.custBox(c).cx, this.counterY - this.S * 0.4, 'Pas ça !', '#ffb0b0'); sfx.lane(); } return false; }
    sfx.beer(); this.ramo.bounce = 0.4;
    c.pat = Math.min(c.patMax, c.pat + c.patMax * 0.12);
    if (this.tut === 2) this.tut = 3;
    if (c.order.every((o) => o.done)) this.pay(c);
    return true;
  }
  pay(c) {
    const frac = Math.max(0, c.pat / c.patMax);
    const base = c.order.reduce((a, o) => a + ITEMS[o.kind].price, 0) * this.priceMult;
    const perf = c.order.filter((o) => o.perfect).length; this.perfect += perf;
    this.combo = frac > 0.35 ? this.combo + 1 : 1; this.bestCombo = Math.max(this.bestCombo, this.combo);
    const cm = 1 + 0.05 * Math.min(10, this.combo - 1);
    let tip = base * (0.05 + 0.35 * frac) * this.tipMult * cm + perf;
    if (c.vip) tip *= 3; if (c.rich) tip *= 2;
    const total = Math.round(base + tip);
    this.earned += total; this.tips += Math.round(tip); this.served++;
    c.st = 'happy'; c.t = 0; c.mood = 'happy'; c.hop = 0.5;
    this.say(c, c.vip ? 'Merci Ramo, t\'es un amour ✨' : pick(this.adult ? SAY_OK_A : SAY_OK), c.vip);
    const b = this.custBox(c);
    this.g.burst(b.cx, b.bot - this.S * 0.9, 'text', 1, { text: `+${total} CHF`, color: '#ffd84a', size: c.vip ? 30 : 24 });
    if (c.vip || this.adult) this.g.burst(b.cx, b.bot - this.S * 0.6, 'heart', c.vip ? 14 : 5, { color: '#ff4f9a' });
    if (this.combo >= 3) { this.g.burst(this.W / 2, this.counterY - this.S * 1.25, 'text', 1, { text: `COMBO x${this.combo} !`, color: '#4fe3ff', size: 22 }); sfx.combo(Math.min(5, this.combo - 2)); }
    else sfx.beer();
    if (c.vip) { sfx.golden(); this.g.ui.message('👑 Miss Gruyère est ravie ! Pourboire royal !', 2.4); }
    this.ramo.mood = 'happy'; this.ramo.moodT = 1.2;
  }
  floater(x, y, text, color) { this.g.burst(Math.max(80, Math.min(this.W - 80, x)), y, 'text', 1, { text, color, size: 18 }); }

  // ------------------------------------------------ mise à jour
  update(dt) {
    const g = this.g;
    if (this.intro > 0) { this.intro -= dt; this.hud(); return; }
    if (this.ended) { this.endT += dt; this.updateCusts(dt); this.updateFly(dt); if (this.endT > 1.6 && !this.reported) this.finish(); return; }
    this.elapsed += dt; this.time -= dt;
    for (const k in this.cool) this.cool[k] -= dt;
    if (this.ramo.bounce > 0) this.ramo.bounce -= dt; if (this.ramo.shake > 0) this.ramo.shake -= dt;
    if (this.ramo.moodT > 0 && (this.ramo.moodT -= dt) <= 0) this.ramo.mood = 'ok';
    // arrivée des clients
    if (this.time > 3) {
      this.spawnCd -= dt;
      const waiting = this.custs.filter((c) => c.st === 'wait' || c.st === 'in').length;
      if (this.spawnCd <= 0 || waiting === 0) {
        if (this.spawn()) { const base = Math.max(1.7, 5.4 - this.day * 0.24) / this.crowd; this.spawnCd = base * rand(0.7, 1.3); }
        else this.spawnCd = 0.5;
      }
    }
    if (!this.lastCall && this.time < 10) { this.lastCall = true; g.ui.message('🔔 Dernière tournée !', 2); sfx.beep(false); }
    // tireuses
    for (let i = 0; i < this.taps.length; i++) {
      const tp = this.taps[i]; if (tp.st !== 'fill') continue;
      tp.f += dt / this.fillTime;
      if (this.auto && tp.f >= 0.86) this.stopTap(tp, this.cells[i]);
      else if (tp.f >= 1.14) { tp.st = 'idle'; tp.f = 0; const c = this.cells[i]; this.floater(c.x + c.w / 2, c.y + c.h * 0.3, 'Ça déborde ! 💦', '#9fe8ff'); sfx.slide(); }
    }
    for (const s of this.grill) if (s) s.c += dt / 4.2;
    for (const s of this.pots) if (s && s.c < 1) s.c += dt / 5.5;
    for (const t of this.tray) t.t += dt;
    this.updateCusts(dt); this.updateFly(dt); this.updateLea(dt);
    if (this.time <= 0 || this.rep <= 0) this.endDay();
    this.hud();
  }
  updateCusts(dt) {
    for (const c of this.custs) {
      c.t += dt; if (c.sayT > 0) c.sayT -= dt; if (c.shake > 0) c.shake -= dt; if (c.hop > 0) c.hop -= dt;
      c.blinkT -= dt; if (c.blinkT <= 0) { c.blink = 0.13; c.blinkT = rand(2.5, 5); } if (c.blink > 0) c.blink -= dt;
      if (c.st === 'in') { c.enter = Math.max(0, c.enter - dt * 2.6); if (c.enter <= 0) c.st = 'wait'; }
      else if (c.st === 'wait') {
        if (this.ended) { c.st = 'out'; c.t = 0; continue; }
        c.pat -= dt; const f = c.pat / c.patMax; c.mood = f < 0.3 ? 'angry' : 'wait';
        if (c.pat <= 0) {
          c.st = 'angry'; c.t = 0; c.mood = 'angry'; this.rep--; this.angry++; this.combo = 0;
          this.say(c, pick(SAY_KO), true); this.ramo.shake = 0.5; this.ramo.mood = 'sad'; this.ramo.moodT = 1.4; this.g.shake = 0.15; sfx.hit();
          const b = this.custBox(c); this.g.burst(b.cx, b.bot - this.S, 'text', 1, { text: 'Trop lent ! 💢', color: '#ff6b6b', size: 22 });
        }
      } else if (c.st === 'happy' || c.st === 'angry') { if (c.t > 1.1) { c.st = 'out'; c.t = 0; } }
      else if (c.st === 'out') c.enter = Math.min(1.2, c.enter + dt * 2.4);
    }
    this.custs = this.custs.filter((c) => !(c.st === 'out' && c.enter >= 1.2));
  }
  updateFly(dt) { for (const f of this.fly) f.t += dt / 0.32; this.fly = this.fly.filter((f) => f.t < 1); }
  updateLea(dt) {
    const L = this.lea; if (!L) return;
    L.bob += dt;
    if (L.target) {
      const c = L.target, tx = this.spotX(c.spot) / this.W;
      L.x += Math.sign(tx - L.x) * Math.min(Math.abs(tx - L.x), dt * 1.4);
      if (Math.abs(tx - L.x) < 0.01) { if (c.st === 'wait') this.serve(c, true); L.target = null; L.cd = L.lvl >= 2 ? 1.3 : 2.3; }
      return;
    }
    L.cd -= dt; if (L.cd > 0) return;
    const cand = this.custs.filter((c) => c.st === 'wait' && c.order.some((o) => !o.done && this.tray.some((t) => t.kind === o.kind))).sort((a, b) => a.pat / a.patMax - b.pat / b.patMax)[0];
    if (cand) L.target = cand; else L.cd = 0.3;
  }
  endDay() {
    if (this.ended) return; this.ended = true; this.endT = 0;
    const stars = this.targets.filter((t) => this.earned >= t).length;
    this.stars = this.rep <= 0 ? Math.min(stars, 0) : stars;
    this.g.ui.message(this.rep <= 0 ? '😬 Trop de clients fâchés… le chalet ferme !' : '🌙 Fermeture du chalet !', 2);
    if (this.stars >= 1) sfx.record(); else sfx.gameover();
  }
  finish() {
    this.reported = true; const g = this.g; g.state = 'over';
    g.ui.buvDay({ mode: this.mode, day: this.day, earned: this.earned, tips: this.tips, served: this.served, angry: this.angry, perfect: this.perfect,
      bestCombo: this.bestCombo, stars: this.stars, targets: this.targets, closed: this.rep <= 0, duration: Math.round(this.elapsed), event: this.event });
  }
  hud() {
    const hearts = '❤️'.repeat(Math.max(0, this.rep)) + '🖤'.repeat(REP_MAX - Math.max(0, this.rep));
    this.g.ui.hud({ score: this.earned, lives: 0, distance: 0, bonus: hearts, combo: this.combo, mole: false, cross: true, timeLeft: 0, progress: 0,
      text: `☀️ Jour ${this.day} · ⏱ ${Math.max(0, Math.ceil(this.time))} s · 🎯 ${this.targets[0]}` });
  }

  // ------------------------------------------------ rendu
  render(c) {
    const W = this.W, H = this.H, t = this.g.t, adult = this.adult, dpr = this.g.dpr || 1;
    if (!this.bg || this.bg.w !== W) {
      const cv = document.createElement('canvas'); cv.width = Math.ceil(W * dpr); cv.height = Math.ceil(H * dpr); cv.w = W;
      const x = cv.getContext('2d'); x.scale(dpr, dpr);
      drawScene(x, W, H, this.top, this.counterY, adult, 0, 'static');
      this.drawPrepBg(x); this.bg = cv;
    }
    c.drawImage(this.bg, 0, 0, W, H);
    drawScene(c, W, H, this.top, this.counterY, adult, t, 'dyn');
    if (this.event === 'orage') this.drawRain(c, t);
    // clients (derrière le comptoir)
    const sorted = [...this.custs].sort((a, b) => a.spot - b.spot);
    for (const cu of sorted) this.drawCust(c, cu, t, dpr);
    drawCounter(c, W, this.counterY, this.counterH, adult);
    if (this.lea) this.drawLea(c, t, dpr);
    for (const cu of sorted) if (cu.st === 'wait' || cu.st === 'in') { const b = this.custBox(cu); const hy = b.bot - this.S * 0.98 - (cu.st === 'in' ? 0 : 0); drawBubble(c, b.cx + this.offX(cu), hy, cu.order, Math.max(0, cu.pat / cu.patMax), t, adult, this.spotW - 4); if (cu.reg || cu.vip) this.tag(c, b.cx + this.offX(cu), hy - Math.min(42, (this.spotW - 16) / cu.order.length + 16) - 10, cu.vip ? '👑 Miss Gruyère' : cu.reg); }
    for (const cu of sorted) if (cu.sayT > 0) this.speech(c, cu);
    this.drawTray(c, t);
    this.drawCells(c, t);
    for (const f of this.fly) { const k = f.t, x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k - Math.sin(k * Math.PI) * 60; drawItem(c, f.kind, x, y, 30, { perfect: f.perfect }); }
    if (this.tut >= 0 && this.tut < 3 && this.intro <= 0) this.drawTut(c, t);
    if (this.intro > 0) this.drawIntro(c);
    if (this.ended) { c.fillStyle = `rgba(10,5,20,${Math.min(0.55, this.endT * 0.5)})`; c.fillRect(0, 0, W, H); }
  }
  offX(cu) {
    const sh = cu.shake > 0 ? Math.sin(cu.shake * 60) * 4 : 0;
    const e = cu.st === 'in' ? cu.enter * cu.enter : cu.st === 'out' ? cu.enter * cu.enter : 0;
    return cu.side * e * (this.W * 0.6) + sh;
  }
  drawCust(c, cu, t, dpr) {
    const b = this.custBox(cu), S = this.S;
    const spr = bustSprite(cu.p, S, cu.mood === 'wait' && cu.pat / cu.patMax > 0.65 && cu.st === 'wait' ? 'wait' : cu.mood, cu.blink > 0, dpr);
    const bob = Math.sin(t * 2 + cu.p.id) * 1.5 - (cu.hop > 0 ? Math.sin(cu.hop / 0.5 * Math.PI) * 14 : 0);
    const a = cu.st === 'out' ? Math.max(0, 1 - cu.enter) : 1;
    c.globalAlpha = a; c.drawImage(spr, b.cx + this.offX(cu) - spr.cw / 2, b.bot + bob - spr.ch, spr.cw, spr.ch); c.globalAlpha = 1;
    if (cu.vip && cu.st !== 'out') { c.fillStyle = '#ffd84a'; for (let i = 0; i < 3; i++) { const a2 = t * 2 + i * 2.1; c.globalAlpha = 0.6 + 0.4 * Math.sin(t * 5 + i); c.font = '14px sans-serif'; c.fillText('✨', b.cx + this.offX(cu) + Math.cos(a2) * S * 0.4, b.bot - S * 0.7 + Math.sin(a2) * S * 0.2); } c.globalAlpha = 1; }
  }
  tag(c, x, y, text) {
    c.font = '900 12px Nunito, sans-serif'; const w = c.measureText(text).width + 14;
    c.fillStyle = 'rgba(30,20,10,0.8)'; rr(c, x - w / 2, y - 9, w, 18, 9); c.fill();
    c.fillStyle = '#ffd84a'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, x, y);
  }
  speech(c, cu) {
    const b = this.custBox(cu), x = Math.max(70, Math.min(this.W - 70, b.cx + this.offX(cu))), y = b.bot - this.S * 1.55 - 14;
    c.globalAlpha = Math.min(1, cu.sayT * 3);
    c.font = '800 13px Nunito, sans-serif'; const w = Math.min(this.W - 20, c.measureText(cu.sayTx).width + 18);
    c.fillStyle = cu.st === 'angry' ? '#ffe1e1' : '#fffbe8'; rr(c, x - w / 2, y - 13, w, 26, 13); c.fill();
    c.fillStyle = '#3a2a1a'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(cu.sayTx, x, y);
    c.globalAlpha = 1;
  }
  drawLea(c, t, dpr) {
    const L = this.lea, S = this.S * 0.92, x = this.W * L.x, bot = this.counterY + this.counterH * 0.95;
    const spr = bustSprite(L.p, S, L.target ? 'happy' : 'wait', Math.sin(t * 0.9) > 0.985, dpr);
    const bob = Math.abs(Math.sin(L.bob * (L.target ? 9 : 2))) * (L.target ? 5 : 1.5);
    c.drawImage(spr, x - spr.cw / 2, bot - spr.ch - bob, spr.cw, spr.ch);
    this.tag(c, x, bot - S * 1.02, '💁‍♀️ Léa');
  }
  drawPrepBg(c) {
    const W = this.W, H = this.H, y = this.counterY + this.counterH;
    const g = c.createLinearGradient(0, y, 0, H); g.addColorStop(0, this.adult ? '#24122e' : '#5a3a22'); g.addColorStop(1, this.adult ? '#12081a' : '#3a2414');
    c.fillStyle = g; c.fillRect(0, y, W, H - y);
    c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1; for (let yy = y + 18; yy < H; yy += 18) { c.beginPath(); c.moveTo(0, yy); c.lineTo(W, yy); c.stroke(); }
  }
  drawTray(c, t) {
    const y = this.trayY, h = this.trayH, W = this.W;
    // Ramo
    const img = this.g.img.head, rh = h * 1.18, rw = rh * 300 / 375;
    const bounce = this.ramo.bounce > 0 ? Math.sin(this.ramo.bounce / 0.4 * Math.PI) * 6 : 0, sh = this.ramo.shake > 0 ? Math.sin(this.ramo.shake * 50) * 3 : 0;
    c.save(); c.translate(6 + rw / 2 + sh, y + h - bounce); c.rotate(this.ramo.mood === 'happy' ? Math.sin(t * 10) * 0.08 : 0);
    if (img) c.drawImage(img, -rw / 2, -rh, rw, rh);
    c.restore();
    if (this.ramo.mood !== 'ok') { c.font = '18px sans-serif'; c.textAlign = 'center'; c.fillText(this.ramo.mood === 'happy' ? '😄' : '😬', 6 + rw * 0.95, y + 12); }
    // plateau
    const x0 = this.trayX0(), sw = this.slotW();
    c.fillStyle = this.adult ? 'rgba(255,79,216,0.18)' : 'rgba(255,240,210,0.16)'; rr(c, x0 - 4, y, sw * this.trayMax + 8, h, 12); c.fill();
    c.strokeStyle = this.adult ? 'rgba(255,79,216,0.6)' : 'rgba(255,230,180,0.5)'; c.lineWidth = 2; c.stroke();
    for (let i = 0; i < this.trayMax; i++) {
      const cx = x0 + sw * (i + 0.5), cy = y + h / 2;
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(cx, cy + h * 0.25, sw * 0.36, h * 0.1, 0, 0, 7); c.fill();
      const it = this.tray[i];
      if (it) { const pop = Math.min(1, it.t * 6); drawItem(c, it.kind, cx, cy - 2, h * 0.62 * (0.6 + 0.4 * pop), { perfect: it.perfect, t }); }
    }
    c.fillStyle = 'rgba(255,255,255,0.55)'; c.font = '800 10px Nunito, sans-serif'; c.textAlign = 'right'; c.textBaseline = 'alphabetic';
    c.fillText('PLATEAU · tape pour jeter', W - 8, y + h + 4.5);
  }
  drawCells(c, t) {
    const adult = this.adult;
    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i], { x, y, w, h, id } = cell, lk = this.locked(id);
      const g = c.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, adult ? '#3a2050' : '#f7ecd6'); g.addColorStop(1, adult ? '#22122e' : '#e2cfae');
      c.fillStyle = g; rr(c, x, y, w, h, 12); c.fill();
      c.strokeStyle = adult ? 'rgba(255,79,216,0.5)' : 'rgba(120,70,30,0.45)'; c.lineWidth = 2; c.stroke();
      const cx = x + w / 2, cy = y + h * 0.44, s = Math.min(w, h) * 0.5;
      const label = { tap0: 'BIÈRE', tap1: 'BIÈRE 2', grill: 'SAUCISSE', fondue: 'FONDUE', cuchaule: 'CUCHAULE', meringue: 'MERINGUE', kirsch: 'KIRSCH', trash: 'POUBELLE' }[id];
      if (lk) {
        c.globalAlpha = 0.35; this.noLbl = true; this.cellIcon(c, id, cx, cy, s, t); this.noLbl = false; c.globalAlpha = 1;
        c.fillStyle = 'rgba(0,0,0,0.35)'; rr(c, x, y, w, h, 12); c.fill();
        c.fillStyle = '#fff'; c.font = `900 ${Math.round(s * 0.42)}px Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('🔒', cx, cy - s * 0.1); c.font = '800 11px Nunito, sans-serif'; c.fillText(lk === 'shop' ? 'Boutique' : `Jour ${lk.slice(3)}`, cx, cy + s * 0.45);
      } else this.cellIcon(c, id, cx, cy, s, t);
      c.fillStyle = adult ? '#ffd1f4' : '#6a3a18'; c.font = `900 ${Math.max(10, Math.round(w * 0.12))}px Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(label, cx, y + h - 13);
    }
  }
  cellIcon(c, id, cx, cy, s, t) {
    const ft = c.fillText; if (this.noLbl) c.fillText = () => {};
    try { this.cellIcon2(c, id, cx, cy, s, t); } finally { c.fillText = ft; }
  }
  cellIcon2(c, id, cx, cy, s, t) {
    if (id === 'tap0' || id === 'tap1') {
      const tp = this.taps[id === 'tap0' ? 0 : 1] || { st: 'idle', f: 0 };
      // colonne de tireuse
      c.fillStyle = '#c9ccd2'; rr(c, cx - s * 0.12, cy - s * 0.95, s * 0.24, s * 0.5, 4); c.fill();
      c.fillStyle = '#8a8f98'; c.fillRect(cx - s * 0.05, cy - s * 0.48, s * 0.1, s * 0.16);
      c.fillStyle = this.adult ? '#ff4fd8' : '#d52b1e'; rr(c, cx - s * 0.07, cy - s * 1.15, s * 0.14, s * 0.26, 3); c.fill();
      if (tp.st === 'fill') { c.fillStyle = '#f0a020'; c.fillRect(cx - 1.5, cy - s * 0.32, 3, s * 0.2); }
      drawItem(c, 'beer', cx, cy + s * 0.12, s * 0.62, { fill: tp.st === 'idle' ? 0 : tp.st === 'full' ? 0.9 : tp.f, t, perfect: tp.st === 'full' && tp.perfect });
      // jauge : zone verte = pinte parfaite
      const gx = cx + s * 0.62, gy = cy - s * 0.55, gh = s * 1.05;
      c.fillStyle = 'rgba(0,0,0,0.25)'; rr(c, gx - 4, gy, 8, gh, 4); c.fill();
      c.fillStyle = '#3cc45a'; c.fillRect(gx - 4, gy + gh * (1 - 0.98 / 1.14), 8, gh * (0.18 / 1.14));
      if (tp.st === 'fill') { const my = gy + gh * (1 - Math.min(1.14, tp.f) / 1.14); c.fillStyle = '#fff'; c.fillRect(gx - 7, my - 1.5, 14, 3); }
      if (tp.st === 'idle') { c.fillStyle = 'rgba(0,0,0,0.45)'; c.font = '800 10px Nunito, sans-serif'; c.textAlign = 'center'; c.fillText('TAPE', cx, cy + s * 0.62); }
      if (tp.st === 'fill') { c.fillStyle = '#2e8a3a'; c.font = '900 11px Nunito, sans-serif'; c.textAlign = 'center'; c.fillText('RETAPE !', cx, cy + s * 0.62); }
      if (tp.st === 'full') { c.fillStyle = '#c0392b'; c.font = '900 10px Nunito, sans-serif'; c.textAlign = 'center'; c.fillText('Plateau plein', cx, cy + s * 0.62); }
    } else if (id === 'grill') {
      const n = this.grill.length, gw = s * 1.5, gh = s * 0.9;
      c.fillStyle = '#2a2a2e'; rr(c, cx - gw / 2, cy - gh / 2, gw, gh, 6); c.fill();
      for (let k = 0; k < 4; k++) { c.fillStyle = `rgba(255,${120 + 60 * Math.sin(t * 8 + k)},30,0.6)`; c.beginPath(); c.arc(cx - gw * 0.35 + k * gw * 0.23, cy + gh * 0.3, 3 + Math.sin(t * 9 + k) * 1.2, 0, 7); c.fill(); }
      c.strokeStyle = '#777'; c.lineWidth = 1.4; for (let k = 0; k < 6; k++) { const yy = cy - gh * 0.4 + k * gh * 0.16; c.beginPath(); c.moveTo(cx - gw * 0.45, yy); c.lineTo(cx + gw * 0.45, yy); c.stroke(); }
      for (let k = 0; k < n; k++) {
        const sl = this.grill[k], yy = cy - gh * 0.3 + (k + 0.5) * (gh * 0.65 / n);
        if (!sl) continue;
        drawSausage(c, cx, yy, gw * 0.72, Math.min(2, sl.c));
        if (sl.c >= 1 && sl.c < 2.2) { c.strokeStyle = `rgba(255,216,74,${0.5 + 0.5 * Math.sin(t * 10)})`; c.lineWidth = 2; c.beginPath(); c.ellipse(cx, yy, gw * 0.4, gw * 0.14, 0, 0, 7); c.stroke(); }
        if (sl.c >= 1.7) { c.fillStyle = 'rgba(80,80,80,0.5)'; for (let q = 0; q < 2; q++) { const f = (t * 0.9 + q * 0.5) % 1; c.globalAlpha = 1 - f; c.beginPath(); c.arc(cx + (q - 0.5) * 12, yy - f * 24, 4 + f * 6, 0, 7); c.fill(); } c.globalAlpha = 1; }
      }
      const ready = this.grill.some((sl) => sl && sl.c >= 1 && sl.c < 2.2), burnt = this.grill.some((sl) => sl && sl.c >= 2.2);
      c.fillStyle = burnt ? '#c0392b' : ready ? '#2e8a3a' : 'rgba(0,0,0,0.45)'; c.font = '900 10px Nunito, sans-serif'; c.textAlign = 'center';
      c.fillText(burnt ? 'CRAMÉE ! jette-la' : ready ? 'PRÊTE ! tape' : 'TAPE = 1 saucisse', cx, cy + s * 0.66);
    } else if (id === 'fondue') {
      const n = this.pots.length;
      for (let k = 0; k < n; k++) {
        const px = cx + (n > 1 ? (k - 0.5) * s * 0.8 : 0), sl = this.pots[k], sz = s * (n > 1 ? 0.7 : 0.95);
        c.fillStyle = `rgba(80,160,255,${0.6 + 0.3 * Math.sin(t * 12 + k)})`; c.beginPath(); c.ellipse(px, cy + sz * 0.42, sz * 0.22, sz * 0.08, 0, 0, 7); c.fill();
        drawItem(c, 'fondue', px, cy, sz, { t: sl ? t : 0 });
        if (sl) { c.strokeStyle = sl.c >= 1 ? '#3cc45a' : '#ffd84a'; c.lineWidth = 3; c.beginPath(); c.arc(px, cy, sz * 0.55, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, sl.c)); c.stroke(); }
      }
      const ready = this.pots.some((sl) => sl && sl.c >= 1);
      c.fillStyle = ready ? '#2e8a3a' : 'rgba(0,0,0,0.45)'; c.font = '900 10px Nunito, sans-serif'; c.textAlign = 'center';
      c.fillText(ready ? 'PRÊTE ! tape' : this.pots.every((p) => p) ? 'Ça fond…' : 'TAPE = 1 fondue', cx, cy + s * 0.66);
    } else if (id === 'trash') {
      c.fillStyle = '#7a8088'; rr(c, cx - s * 0.32, cy - s * 0.3, s * 0.64, s * 0.75, 5); c.fill();
      c.fillStyle = '#5a6068'; rr(c, cx - s * 0.4, cy - s * 0.42, s * 0.8, s * 0.14, 4); c.fill(); c.fillRect(cx - s * 0.1, cy - s * 0.52, s * 0.2, s * 0.1);
      c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 2; for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(cx + k * s * 0.15, cy - s * 0.18); c.lineTo(cx + k * s * 0.15, cy + s * 0.35); c.stroke(); }
    } else {
      const cool = (this.cool[id] || 0) > 0 ? 0.88 : 1;
      drawItem(c, id, cx, cy, s * 1.05 * cool, { t });
      c.fillStyle = this.adult ? 'rgba(255,220,250,0.8)' : 'rgba(0,0,0,0.45)'; c.font = '800 10px Nunito, sans-serif'; c.textAlign = 'center'; c.fillText(`${Math.round(ITEMS[id].price * this.priceMult)} CHF`, cx, cy + s * 0.66);
    }
  }
  drawRain(c, t) {
    c.strokeStyle = 'rgba(200,220,255,0.35)'; c.lineWidth = 1; c.beginPath();
    for (let i = 0; i < 60; i++) { const x = (i * 53 + t * 80) % this.W, y = (i * 97 + t * 600) % this.counterY; c.moveTo(x, y); c.lineTo(x - 3, y + 12); }
    c.stroke();
  }
  drawTut(c, t) {
    const msg = ['1️⃣ Tape la TIREUSE pour remplir une bière', '2️⃣ RETAPE quand la jauge est dans le VERT ★', '3️⃣ Tape la CLIENTE pour lui servir son plateau'][this.tut];
    const y = this.tut < 2 ? this.cells[0].y - 6 : this.counterY - this.S * 1.62;
    c.font = '900 14px Nunito, sans-serif'; const w = Math.min(this.W - 16, c.measureText(msg).width + 24);
    const pulse = 1 + Math.sin(t * 6) * 0.03;
    c.save(); c.translate(this.W / 2, y); c.scale(pulse, pulse);
    c.fillStyle = 'rgba(20,110,50,0.95)'; rr(c, -w / 2, -16, w, 30, 15); c.fill();
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(msg, 0, 0); c.restore();
    if (this.tut < 2) { const cl = this.cells[0]; c.strokeStyle = `rgba(255,216,74,${0.6 + 0.4 * Math.sin(t * 8)})`; c.lineWidth = 4; rr(c, cl.x, cl.y, cl.w, cl.h, 12); c.stroke(); }
  }
  drawIntro(c) {
    const W = this.W, H = this.H, k = Math.min(1, (2.4 - this.intro) * 3);
    c.fillStyle = `rgba(10,5,20,${0.55 * k})`; c.fillRect(0, 0, W, H);
    c.save(); c.translate(W / 2, H * 0.36); c.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '900 16px Nunito, sans-serif'; c.fillStyle = '#ffd84a'; c.fillText(this.adult ? 'CHALET DES 4F · AFTER DARK' : 'CHALET DES 4F · GYM BULLE', 0, -56);
    c.font = '54px "Luckiest Guy", Nunito, sans-serif'; c.fillStyle = '#fff'; c.strokeStyle = '#7a2a18'; c.lineWidth = 8; c.strokeText(`JOUR ${this.day}`, 0, 0); c.fillText(`JOUR ${this.day}`, 0, 0);
    c.font = '800 15px Nunito, sans-serif'; c.fillStyle = '#fff';
    c.fillText(`Objectif : ${this.targets[0]} CHF  ·  ★★ ${this.targets[1]}  ·  ★★★ ${this.targets[2]}`, 0, 44);
    if (this.event) { const e = EVENTS[this.event]; c.font = '900 19px Nunito, sans-serif'; c.fillStyle = '#4fe3ff'; c.fillText(e.name, 0, 82); c.font = '700 13px Nunito, sans-serif'; c.fillStyle = '#e8e0ff'; c.fillText(e.sub, 0, 104); }
    const nu = Object.keys(UNLOCK).find((k2) => UNLOCK[k2] === this.day && this.day > 1);
    if (nu) { c.font = '900 16px Nunito, sans-serif'; c.fillStyle = '#7CFF6B'; c.fillText(`NOUVEAU : ${ITEMS[nu].emo} ${ITEMS[nu].name} au menu !`, 0, this.event ? 132 : 82); }
    c.restore();
  }
}
