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
export const REP_MAX = 3;           // 3 cœurs : 3 clients fâchés et le chalet ferme
export const UNLOCK = { beer: 1, coca: 1, suze: 1, cuchaule: 2, sausage: 3, mojito: 4, meringue: 5, suzelait: 5, kirsch: 6, fondue: 7 };

// Améliorations (boutique) : niveaux et prix
export const UPGRADES = [
  { id: 'tireuse', name: 'Tireuse rapide', emo: '🍺', desc: 'Les bières coulent plus vite', costs: [60, 160, 380] },
  { id: 'grill', name: 'Grand grill', emo: '🔥', desc: '+1 saucisse sur le grill', costs: [140, 360] },
  { id: 'caquelon', name: '2e caquelon', emo: '🫕', desc: 'Deux fondues en même temps', costs: [320] },
  { id: 'terrasse', name: 'Terrasse', emo: '🪑', desc: '+1 client au comptoir', costs: [200, 520] },
  { id: 'deco', name: 'Fanions & lampions', emo: '🎏', desc: 'Les clients patientent +15 %', costs: [80, 220, 480] },
  { id: 'orchestre', name: 'Orchestre champêtre', emo: '🪗', desc: 'Pourboires +25 %', costs: [300, 750] },
  { id: 'affiche', name: 'Affiches dans Bulle', emo: '📣', desc: 'Plus de clients, prix +10 %', costs: [260, 620, 1300] },
  { id: 'lea', name: 'Léa, la serveuse', emo: '💁‍♀️', desc: 'Elle sert les clients toute seule', costs: [500, 1200] },
];
export function target(day) { const b = 3500 + 1000 * (day - 1) + 60 * (day - 1) * (day - 1); const r = (x) => Math.round(x / 100) * 100; return [r(b), r(b * 1.8), r(b * 2.8)]; }
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
    this.seats = 3 + L('terrasse');
    this.beerTime = [0.75, 0.55, 0.4, 0.28][L('tireuse')];
    this.patMult = 1 + 0.15 * L('deco'); this.tipMult = 1 + 0.25 * L('orchestre');
    this.priceMult = 1 + 0.1 * L('affiche'); this.crowd = 1 + 0.14 * L('affiche');
    this.event = eventFor(this.day);
    if (this.event === 'benichon') { this.priceMult *= 1.5; this.crowd *= 1.3; }
    if (this.event === 'match') this.crowd *= 1.45;
    if (this.event === 'orage') { this.crowd *= 0.72; this.tipMult *= 2; }
    this.menu = Object.keys(UNLOCK).filter((k) => UNLOCK[k] <= this.day);
    this.targets = target(this.day);
    this.time = DAY_LEN; this.elapsed = 0; this.intro = 2.4;
    this.earned = 0; this.money = 0; this.lost = 0; this.tips = 0; this.served = 0; this.angry = 0; this.perfect = 0; this.rep = REP_MAX;
    this.combo = 0; this.bestCombo = 0;
    this.custs = []; this.fly = []; this.spawnCd = 0.4; this.lastCall = false; this.ended = false; this.endT = 0;
    this.grill = Array.from({ length: 2 + L('grill') }, () => null);
    this.pots = Array.from({ length: 1 + L('caquelon') }, () => null);
    this.cool = {}; this.ramo = { x: 0.5, tx: 0.5, bounce: 0, shake: 0, mood: 'ok', moodT: 0, sayT: 0, sayTx: '', spin: 0, dance: 0 };
    this.lea = L('lea') ? { lvl: L('lea'), x: 0.85, tx: 0.85, cd: 1.5, carry: null, target: null, bob: 0, p: makePerson({ fem: true, hair: 'braids', hairC: '#e8c15f', outfit: this.adult ? 'gown' : 'dirndl', cloth: this.adult ? '#e8287a' : '#c0392b', cloth2: '#2e9a5a', eye: '#4a7bb5', lip: '#d0485e', skin: '#f1cbb0', acc: ['earrings'], name: 'Léa' }) } : null;
    this.vipLeft = this.event === 'vip' ? 3 : (this.day >= 4 && Math.random() < 0.5 ? 1 : 0);
    this.tut = this.day === 1 ? 0 : -1; // aide du 1er jour
    clearCache(); this.bg = null;
    this.resize();
  }

  // ------------------------------------------------ mise en page
  resize() {
    const g = this.g, W = g.W, H = g.H;
    this.W = W; this.H = H; this.top = 64;
    this.counterY = Math.round(H * 0.43); this.counterH = Math.round(Math.max(40, H * 0.055));
    const n = this.seats; this.spotW = W / n;
    this.S = Math.min(this.spotW * 1.12, H * 0.2, 165);
    // zone de Ramo (il court vers les stations)
    this.ramoY = this.counterY + this.counterH; this.ramoH = Math.round(H * (this.menu.length > 6 ? 0.15 : 0.2));
    const sy = this.ramoY + this.ramoH, ids = this.menu.map((k) => (k === 'sausage' ? 'grill' : k));
    const cols = ids.length === 1 ? 1 : ids.length <= 4 ? 2 : ids.length <= 9 ? 3 : 4, rows = Math.ceil(ids.length / cols), cw = W / cols;
    const sh = Math.min((H - sy - 8) / Math.max(2, rows), 150);
    this.cells = ids.map((id, i) => { const r = Math.floor(i / cols), inRow = Math.min(cols, ids.length - r * cols), off = (W - inRow * cw) / 2;
      return { id, kind: id === 'grill' ? 'sausage' : id, x: off + (i % cols) * cw + 4, y: sy + r * sh + 4, w: cw - 8, h: sh - 8 }; });
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
    const maxN = Math.min(3, 2 + Math.floor((this.day - 1) / 3));
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
    let pat = (8 + order.length * 2.6) * Math.max(0.6, 1 - this.day * 0.035) * this.patMult;
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
    for (const cell of this.cells) if (x >= cell.x && x <= cell.x + cell.w && y >= cell.y && y <= cell.y + cell.h) { this.useCell(cell); return; }
    // tape sur Ramo : il fait le show
    if (y > this.ramoY && y < this.ramoY + this.ramoH) { this.ramo.spin = 0.6; this.ramoSay(pick(['Yeeehaa ! 🦫', 'Santé la gym !', 'Qui veut une mousse ?', 'Le roi de la buvette !'])); sfx.combo(1); }
  }
  // le client qui attend le plus (le moins de patience) et qui veut ce produit
  needy(kind) {
    return this.custs.filter((c) => c.st === 'wait' && c.order.some((o) => !o.done && o.kind === kind)).sort((a, b) => a.pat / a.patMax - b.pat / b.patMax)[0];
  }
  wanted(kind) { return this.custs.some((c) => (c.st === 'wait' || c.st === 'in') && c.order.some((o) => !o.done && o.kind === kind)); }
  ramoGo(cell) { this.ramo.tx = (cell.x + cell.w / 2) / this.W; }
  ramoSay(t) { this.ramo.sayT = 1.6; this.ramo.sayTx = t; }
  useCell(cell) {
    const id = cell.id, kind = cell.kind, cx = cell.x + cell.w / 2, cy = cell.y + cell.h * 0.35;
    this.ramoGo(cell);
    if (id === 'grill' || id === 'fondue') {
      const slots = id === 'grill' ? this.grill : this.pots;
      const free = slots.indexOf(null);
      if (free >= 0) { slots[free] = { c: 0 }; sfx.slide(); this.ramo.bounce = 0.3; } else this.floater(cx, cy, id === 'grill' ? 'Ça grille… 🔥' : 'Ça fond… 🧀', '#fff');
      return;
    }
    if ((this.cool[id] || 0) > 0) return;
    const c = this.needy(kind);
    if (!c) { this.penalty(cx, cy, 2, 'Personne n\'en veut ! Gaspillé'); return; }
    this.cool[id] = kind === 'beer' ? this.beerTime : 0.25;
    this.deliver(c, kind, cx, cell.y);
  }
  // Pénalité : on perd des sous et le combo
  penalty(x, y, n, why) {
    const pts = n * 15; this.earned -= pts; this.money = Math.max(0, this.money - n); this.lost += pts; this.combo = 0;
    this.g.burst(Math.max(90, Math.min(this.W - 90, x)), y, 'text', 1, { text: `${why} -${pts}`, color: '#ff5a5a', size: 18 });
    sfx.hit(); this.ramo.shake = 0.35; this.ramo.mood = 'sad'; this.ramo.moodT = 1;
  }
  // Donne un produit à un client (il vole jusqu'à lui)
  deliver(c, kind, x, y) {
    const o = c.order.find((q) => !q.done && q.kind === kind); if (!o) return false;
    o.done = true;
    const b = this.custBox(c); this.fly.push({ kind, x0: x, y0: y, x1: b.cx, y1: b.bot - this.S * 0.35, t: 0 });
    sfx.beer(); this.ramo.bounce = 0.4; this.earned += 10;
    c.pat = Math.min(c.patMax, c.pat + c.patMax * 0.04);
    if (this.tut >= 0) this.tut++;
    if (c.order.every((q) => q.done)) this.pay(c);
    return true;
  }
  pay(c) {
    const frac = Math.max(0, c.pat / c.patMax);
    const base = c.order.reduce((a, o) => a + ITEMS[o.kind].price, 0) * this.priceMult;
    const perf = 0;
    this.combo = frac > 0.35 ? this.combo + 1 : 1; this.bestCombo = Math.max(this.bestCombo, this.combo);
    const cm = 1 + 0.25 * Math.min(8, this.combo - 1); // combo jusqu'à x3
    let tip = base * (0.05 + 0.35 * frac) * this.tipMult + perf;
    if (c.vip) tip *= 3; if (c.rich) tip *= 2;
    const total = Math.round(base + tip), pts = Math.round((base * 10 * (0.6 + frac)) * cm * (c.vip ? 3 : 1) / 5) * 5;
    this.money += total; this.earned += pts; this.tips += Math.round(tip); this.served++;
    c.st = 'happy'; c.t = 0; c.mood = 'happy'; c.hop = 0.5;
    this.say(c, c.vip ? 'Merci Ramo, t\'es un amour ✨' : pick(this.adult ? SAY_OK_A : SAY_OK), c.vip);
    const b = this.custBox(c);
    this.g.burst(b.cx, b.bot - this.S * 0.9, 'text', 1, { text: `+${pts}${cm > 1 ? `  x${cm}` : ''}`, color: '#ffd84a', size: c.vip ? 32 : 26 });
    if (c.vip || this.adult) this.g.burst(b.cx, b.bot - this.S * 0.6, 'heart', c.vip ? 14 : 5, { color: '#ff4f9a' });
    if (this.combo >= 3) { this.g.burst(this.W / 2, this.counterY - this.S * 1.25, 'text', 1, { text: `COMBO x${this.combo} !`, color: '#4fe3ff', size: 22 }); sfx.combo(Math.min(5, this.combo - 2)); }
    else sfx.beer();
    if (c.vip) { sfx.golden(); this.g.ui.message('👑 Miss Gruyère est ravie ! Pourboire royal !', 2.4); }
    this.ramo.mood = 'happy'; this.ramo.moodT = 1.2; if (Math.random() < 0.35 || this.combo >= 3) this.ramoSay(this.combo >= 3 ? `Combo x${this.combo} ! 🔥` : pick(['Et voilà ! 🍺', 'Santé !', 'Au suivant !', 'Trop facile 😎']));
    if (this.combo > 0 && this.combo % 5 === 0) { this.ramo.dance = 1.4; this.g.burst(this.W * this.ramo.x, this.ramoY + this.ramoH * 0.3, 'beer', 12); }
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
        if (this.spawn()) { const base = Math.max(1.3, 4.4 - this.day * 0.25) / this.crowd; this.spawnCd = base * rand(0.7, 1.3); }
        else this.spawnCd = 0.5;
      }
    }
    if (!this.lastCall && this.time < 10) { this.lastCall = true; g.ui.message('🔔 Dernière tournée !', 2); sfx.beep(false); }
    // cuisson : dès que c'est prêt, ça part chez le client qui attend
    for (const [slots, kind, dur, id] of [[this.grill, 'sausage', 3.2, 'grill'], [this.pots, 'fondue', 4.2, 'fondue']]) {
      for (let i = 0; i < slots.length; i++) {
        const sl = slots[i]; if (!sl) continue;
        if (sl.c < 1) { sl.c += dt / dur; continue; }
        const c = this.needy(kind), cell = this.cells.find((q) => q.id === id);
        if (c && cell) { slots[i] = null; this.deliver(c, kind, cell.x + cell.w / 2, cell.y); }
        else if ((sl.w = (sl.w || 0) + dt) > 6 && cell) { slots[i] = null; this.penalty(cell.x + cell.w / 2, cell.y + 20, 3, kind === 'sausage' ? 'Saucisse froide !' : 'Fondue figée !'); }
      }
    }
    const R = this.ramo; R.x += (R.tx - R.x) * Math.min(1, dt * 9); if (R.sayT > 0) R.sayT -= dt; if (R.spin > 0) R.spin -= dt; if (R.dance > 0) R.dance -= dt;
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
          const val = Math.max(5, Math.round(c.order.filter((o) => !o.done).reduce((a, o) => a + ITEMS[o.kind].price, 0) * this.priceMult)); const pts = 100 + val * 10; this.earned -= pts; this.money = Math.max(0, this.money - val); this.lost += pts;
          this.say(c, pick(SAY_KO), true); this.ramo.shake = 0.5; this.ramo.mood = 'sad'; this.ramo.moodT = 1.4; this.g.shake = 0.15; sfx.hit();
          const b = this.custBox(c); this.g.burst(b.cx, b.bot - this.S, 'text', 1, { text: `Parti fâché ! 💢 -${pts}`, color: '#ff5a5a', size: 24 });
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
      if (Math.abs(tx - L.x) < 0.01) { if (c.st === 'wait') { const o = c.order.find((q) => !q.done && q.kind !== 'sausage' && q.kind !== 'fondue'); if (o) this.deliver(c, o.kind, this.W * L.x, this.counterY); } L.target = null; L.cd = L.lvl >= 2 ? 1.4 : 2.5; }
      return;
    }
    L.cd -= dt; if (L.cd > 0) return;
    const cand = this.custs.filter((c) => c.st === 'wait' && c.order.some((o) => !o.done && o.kind !== 'sausage' && o.kind !== 'fondue')).sort((a, b) => a.pat / a.patMax - b.pat / b.patMax)[0];
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
    g.ui.buvDay({ mode: this.mode, day: this.day, earned: this.earned, money: Math.round(this.money), tips: this.tips, served: this.served, angry: this.angry, perfect: this.perfect,
      lost: this.lost, bestCombo: this.bestCombo, stars: this.stars, targets: this.targets, closed: this.rep <= 0, duration: Math.round(this.elapsed), event: this.event });
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
    this.drawCells(c, t);
    this.drawRamo(c, t);
    for (const f of this.fly) { const k = f.t, x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k - Math.sin(k * Math.PI) * 60; drawItem(c, f.kind, x, y, 30, { perfect: f.perfect }); }
    if (this.tut >= 0 && this.tut < 4 && this.intro <= 0) this.drawTut(c, t);
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
    c.font = '800 13px Nunito, sans-serif'; const w = Math.min(this.W - 20, c.measureText(cu.sayTx).width + 18);
    const b = this.custBox(cu), x = Math.max(w / 2 + 6, Math.min(this.W - w / 2 - 6, b.cx + this.offX(cu))), y = b.bot - this.S * 1.55 - 14;
    c.globalAlpha = Math.min(1, cu.sayT * 3);
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
  // Ramo, en grand, qui court d'une station à l'autre
  drawRamo(c, t) {
    const R = this.ramo, img = this.g.img.full, H = this.ramoH, h = H * 1.12, w = h * 528 / 620;
    const x = Math.max(w * 0.45, Math.min(this.W - w * 0.45, this.W * R.x)), floor = this.ramoY + H;
    const moving = Math.abs(R.tx - R.x) > 0.01;
    const bounce = R.bounce > 0 ? Math.sin(R.bounce / 0.4 * Math.PI) * 14 : 0;
    const run = moving ? Math.abs(Math.sin(t * 22)) * 6 : Math.sin(t * 3) * 1.5;
    const sh = R.shake > 0 ? Math.sin(R.shake * 50) * 5 : 0;
    // ombre
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(x, floor - 4, w * 0.32, 7, 0, 0, 7); c.fill();
    c.save(); c.translate(x + sh, floor - bounce - run);
    let rot = moving ? (R.tx > R.x ? 0.12 : -0.12) : 0;
    if (R.dance > 0) rot = Math.sin(t * 16) * 0.22;
    if (R.mood === 'happy' && !moving) rot += Math.sin(t * 12) * 0.06;
    c.rotate(rot);
    if (R.spin > 0) c.scale(Math.cos((0.6 - R.spin) / 0.6 * Math.PI * 2), 1);
    if (this.adult) { c.shadowColor = '#ff4fd8'; c.shadowBlur = 18; }
    if (img) c.drawImage(img, -w / 2, -h, w, h);
    c.shadowBlur = 0;
    // il tient une chope
    drawItem(c, 'beer', w * 0.36, -h * 0.42 + Math.sin(t * 6) * 2, h * 0.2, { fill: 1, t });
    c.restore();
    if (R.mood !== 'ok') { c.font = '26px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(R.mood === 'happy' ? '😄' : '😬', x + w * 0.38, floor - h * 0.95); }
    if (R.sayT > 0) {
      c.globalAlpha = Math.min(1, R.sayT * 3); c.font = '900 15px Nunito, sans-serif';
      const tw = c.measureText(R.sayTx).width + 22, bx = Math.max(tw / 2 + 6, Math.min(this.W - tw / 2 - 6, x)), by = floor - h - 4;
      c.fillStyle = this.adult ? '#ff4fd8' : '#ffd84a'; rr(c, bx - tw / 2, by - 15, tw, 30, 15); c.fill();
      c.fillStyle = this.adult ? '#fff' : '#5a2a08'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(R.sayTx, bx, by);
      c.globalAlpha = 1;
    }
  }
  drawCells(c, t) {
    const adult = this.adult; this.tutHand = 0;
    for (const cell of this.cells) {
      const { x, y, w, h, id, kind } = cell, want = this.wanted(kind);
      const pulse = want ? 0.5 + 0.5 * Math.sin(t * 7) : 0;
      const g = c.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, adult ? '#3a2050' : '#fff6e2'); g.addColorStop(1, adult ? '#22122e' : '#ecd8b4');
      c.fillStyle = g; rr(c, x, y, w, h, 16); c.fill();
      c.lineWidth = want ? 4 : 2; c.strokeStyle = want ? `rgba(60,196,90,${0.6 + 0.4 * pulse})` : adult ? 'rgba(255,79,216,0.4)' : 'rgba(120,70,30,0.35)'; c.stroke();
      const cx = x + w / 2, cy = y + h * 0.43, s = Math.min(w * 0.62, h * 0.62);
      this.cellIcon(c, id, cx, cy, s, t);
      // nombre de clients qui en veulent
      if (want) {
        let n = 0; for (const cu of this.custs) if (cu.st === 'wait' || cu.st === 'in') n += cu.order.filter((o) => !o.done && o.kind === kind).length;
        c.fillStyle = '#e8283a'; c.beginPath(); c.arc(x + w - 14, y + 14, 12 + pulse * 2, 0, 7); c.fill();
        c.fillStyle = '#fff'; c.font = '900 14px Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(n, x + w - 14, y + 15);
      }
      if (want && this.tut >= 0 && this.tut < 4 && !this.tutHand) { this.tutHand = 1; const hb = Math.abs(Math.sin(t * 5)) * 14; c.font = '44px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('👆', cx + w * 0.18, y + h * 0.62 + hb); }
      c.fillStyle = adult ? '#ffd1f4' : '#6a3a18'; c.font = `900 ${Math.max(12, Math.round(Math.min(w, 140) * 0.12))}px Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      const pr = `${Math.round(ITEMS[kind].price * this.priceMult)}.-`;
      if (w < 120) { c.font = `900 ${w < 90 ? 10 : 11}px Nunito, sans-serif`; c.fillText(ITEMS[kind].name.toUpperCase(), cx, y + h - 11); c.font = '800 10px Nunito, sans-serif'; c.textAlign = 'left'; c.fillText(pr, x + 6, y + 11); }
      else c.fillText(`${ITEMS[kind].name.toUpperCase()}  ·  ${pr}`, cx, y + h - 14);
    }
  }
  cellIcon(c, id, cx, cy, s, t) {
    if (id === 'grill' || id === 'fondue') {
      const slots = id === 'grill' ? this.grill : this.pots, n = slots.length;
      if (id === 'grill') {
        const gw = s * 1.5, gh = s * 0.85;
        c.fillStyle = '#2a2a2e'; rr(c, cx - gw / 2, cy - gh / 2, gw, gh, 8); c.fill();
        for (let k = 0; k < 5; k++) { c.fillStyle = `rgba(255,${120 + 60 * Math.sin(t * 8 + k)},30,0.6)`; c.beginPath(); c.arc(cx - gw * 0.4 + k * gw * 0.2, cy + gh * 0.3, 3 + Math.sin(t * 9 + k) * 1.2, 0, 7); c.fill(); }
        c.strokeStyle = '#777'; c.lineWidth = 1.4; for (let k = 0; k < 6; k++) { const yy = cy - gh * 0.4 + k * gh * 0.16; c.beginPath(); c.moveTo(cx - gw * 0.45, yy); c.lineTo(cx + gw * 0.45, yy); c.stroke(); }
        for (let k = 0; k < n; k++) { const sl = slots[k]; if (!sl) continue; const yy = cy - gh * 0.3 + (k + 0.5) * (gh * 0.62 / n); drawSausage(c, cx, yy, gw * 0.7, Math.min(1, sl.c)); }
      } else {
        for (let k = 0; k < n; k++) {
          const px = cx + (n > 1 ? (k - 0.5) * s * 0.85 : 0), sz = s * (n > 1 ? 0.75 : 1);
          c.fillStyle = `rgba(80,160,255,${0.6 + 0.3 * Math.sin(t * 12 + k)})`; c.beginPath(); c.ellipse(px, cy + sz * 0.42, sz * 0.22, sz * 0.08, 0, 0, 7); c.fill();
          drawItem(c, 'fondue', px, cy, sz, { t: slots[k] ? t : 0 });
        }
      }
      // progression de la cuisson
      slots.forEach((sl, k) => { if (!sl) return; const bx = cx - s * 0.7, bw = s * 1.4, by = cy + s * 0.5 + k * 7;
        c.fillStyle = 'rgba(0,0,0,0.2)'; rr(c, bx, by, bw, 5, 3); c.fill(); c.fillStyle = sl.c >= 1 ? '#3cc45a' : '#f2b632'; rr(c, bx, by, bw * Math.min(1, sl.c), 5, 3); c.fill(); });
      if (slots.every((q) => !q) && s > 60) { c.fillStyle = this.adult ? '#ffd1f4' : 'rgba(0,0,0,0.5)'; c.font = '800 11px Nunito, sans-serif'; c.textAlign = 'center'; c.fillText('TAPE pour lancer', cx, cy + s * 0.58); }
      return;
    }
    const cool = this.cool[id] || 0;
    if (id === 'beer' && cool > 0) { drawItem(c, 'beer', cx, cy, s * 1.05, { fill: 1 - cool / this.beerTime, t }); return; }
    drawItem(c, id, cx, cy, s * (cool > 0 ? 0.9 : 1.05), { t, fill: 1 });
  }
  drawRain(c, t) {
    c.strokeStyle = 'rgba(200,220,255,0.35)'; c.lineWidth = 1; c.beginPath();
    for (let i = 0; i < 60; i++) { const x = (i * 53 + t * 80) % this.W, y = (i * 97 + t * 600) % this.counterY; c.moveTo(x, y); c.lineTo(x - 3, y + 12); }
    c.stroke();
  }
  drawTut(c, t) {
    const msg = '👆 Tape ce que la cliente demande !';
    const y = this.ramoY + 24;
    c.font = '900 15px Nunito, sans-serif'; const w = Math.min(this.W - 16, c.measureText(msg).width + 26);
    const pulse = 1 + Math.sin(t * 6) * 0.04;
    c.save(); c.translate(this.W / 2, y); c.scale(pulse, pulse);
    c.fillStyle = 'rgba(20,110,50,0.95)'; rr(c, -w / 2, -17, w, 32, 16); c.fill();
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(msg, 0, 0); c.restore();
  }
  drawIntro(c) {
    const W = this.W, H = this.H, k = Math.min(1, (2.4 - this.intro) * 3);
    c.fillStyle = `rgba(10,5,20,${0.55 * k})`; c.fillRect(0, 0, W, H);
    c.save(); c.translate(W / 2, H * 0.36); c.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '900 16px Nunito, sans-serif'; c.fillStyle = '#ffd84a'; c.fillText(this.adult ? 'CHALET DE LA GYM · 4F · AFTER DARK' : 'CHALET DE LA GYM · 4F · BULLE', 0, -56);
    c.font = '54px "Luckiest Guy", Nunito, sans-serif'; c.fillStyle = '#fff'; c.strokeStyle = '#7a2a18'; c.lineWidth = 8; c.strokeText(`JOUR ${this.day}`, 0, 0); c.fillText(`JOUR ${this.day}`, 0, 0);
    c.font = '800 15px Nunito, sans-serif'; c.fillStyle = '#fff';
    c.fillText(`Objectif ★ ${this.targets[0]} pts  ·  ★★ ${this.targets[1]}  ·  ★★★ ${this.targets[2]}`, 0, 44);
    c.font = '800 13px Nunito, sans-serif'; c.fillStyle = '#ffd1d1'; c.fillText('Erreur = points en moins · 3 clients fâchés = perdu !', 0, this.event ? 150 : 104);
    if (this.event) { const e = EVENTS[this.event]; c.font = '900 19px Nunito, sans-serif'; c.fillStyle = '#4fe3ff'; c.fillText(e.name, 0, 82); c.font = '700 13px Nunito, sans-serif'; c.fillStyle = '#e8e0ff'; c.fillText(e.sub, 0, 104); }
    const nus = Object.keys(UNLOCK).filter((k2) => UNLOCK[k2] === this.day && this.day > 1), nu = nus.length;
    if (nu) { c.font = '900 16px Nunito, sans-serif'; c.fillStyle = '#7CFF6B'; c.fillText(`NOUVEAU : ${nus.map((k2) => ITEMS[k2].emo + ' ' + ITEMS[k2].name).join(' + ')} !`, 0, this.event ? 132 : 82); }
    c.restore();
  }
}
