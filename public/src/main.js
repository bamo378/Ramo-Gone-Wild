import { Game } from './game.js';
import { store, submitOnline, fetchBoard, syncBest } from './storage.js';
import { WORLDS, LEVEL_IDS } from './bros-levels.js';
import { UPGRADES, target, eventFor, EVENTS } from './buvette.js';
import { initAudio, setSound, startMusic, stopMusic, sfx } from './audio.js';
import { MSG_GAMEOVER, MSG_GAMEOVER_ADULT, SHARE_TEXT, LEVELS, LEVEL_ORDER, levelById } from './config.js';

const $ = (id) => document.getElementById(id);
const show = (id) => $(id).classList.add('show');
const hide = (id) => $(id).classList.remove('show');
const pick = (a) => a[Math.floor(Math.random() * a.length)];

let mode = 'classic'; // le mode adulte n'est jamais mémorisé : il faut le réactiver à chaque visite
let toastTimer = null;
let course = 'bulle';            // parcours choisi (libre : pas besoin de réussir le premier)
const boardKey = (c, m) => levelById(c).board(m);

function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }

const ui = {
  hud({ score, lives, distance, bonus, combo, mole, timeLeft, progress, cross, brosText, text }) {
    $('hScore').textContent = score.toLocaleString('fr-CH');
    $('hLives').classList.toggle('hidden', !!cross);
    const cb = $('hCombo');
    if (combo > 1) { const txt = `COMBO x${combo}`; if (cb.textContent !== txt) { cb.textContent = txt; cb.classList.remove('pop'); void cb.offsetWidth; cb.classList.add('pop'); } cb.classList.remove('hidden'); }
    else cb.classList.add('hidden');
    $('hTime').classList.toggle('hidden', !mole); $('hProg').classList.toggle('hidden', !mole);
    if (mole) {
      $('hTime').textContent = `⏱ ${Math.max(0, timeLeft).toFixed(timeLeft < 10 ? 1 : 0)} s`;
      $('hTime').classList.toggle('danger', timeLeft < 10);
      $('hProgFill').style.width = `${(progress * 100).toFixed(1)}%`;
      $('hProgRamo').style.left = `${(progress * 100).toFixed(1)}%`;
    }
    $('hDist').textContent = text || brosText || (cross ? `🐾 ${distance} rangées` : `${distance.toLocaleString('fr-CH')} m`);
    $('brosPad').classList.toggle('hidden', !brosText);
    const icon = mode === 'adult' ? '💋' : '🍺';
    const html = Array.from({ length: 3 }, (_, i) => `<span class="${i < lives ? '' : 'lost'}">${icon}</span>`).join('');
    if ($('hLives').innerHTML !== html) $('hLives').innerHTML = html;
    const b = $('hBonus');
    if (bonus) { b.textContent = bonus; b.classList.remove('hidden'); } else b.classList.add('hidden');
  },
  message(text, dur = 2.8) {
    const t = $('toast'); t.textContent = text; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), dur * 1000);
  },
  gameOver({ score, distance, mode: md, duration, course: crs, result, timeLeft, brosId }) {
    $('brosPad').classList.add('hidden');
    if (crs === 'bros') {
      $('overTitle').textContent = 'GAME OVER'; $('overMsg').textContent = `Plus de vies au niveau ${brosId.replace('B', 'BOSS')}… Une bière et on y retourne !`;
      $('oScore').textContent = score.toLocaleString('fr-CH'); $('oBest').textContent = ((store.bros(md)[brosId] || {}).best || 0).toLocaleString('fr-CH');
      $('oDist').textContent = brosId.replace('B', 'BOSS'); $('oDistLabel').textContent = 'NIVEAU'; $('oRecord').classList.add('hidden'); $('oRank').textContent = '';
      $('hud').classList.add('hidden'); lastScore = score; show('over'); return;
    }
    const m = boardKey(crs, md), mole = crs === 'moleson';
    const isRecord = store.submit(m, score, distance, duration);
    const rk = $('oRank'); rk.textContent = '🌍 Envoi au classement…';
    submitOnline(m, score, distance, duration).then((res) => {
      if (!res) { rk.textContent = '🌍 Classement indisponible pour le moment'; return; }
      rk.innerHTML = res.rank === 1 ? `🥇 <b>N°1 du classement</b> ${res.total > 1 ? `sur ${res.total} joueurs` : '(premier joueur inscrit)'} !` : `🌍 Ton meilleur score est <b>${res.rank}e</b> sur ${res.total} joueurs`;
      lastRank = res.rank;
    });
    $('oScore').textContent = score.toLocaleString('fr-CH');
    $('oBest').textContent = store.best(m).toLocaleString('fr-CH');
    $('oDist').textContent = `${distance.toLocaleString('fr-CH')} m`;
    $('oDistLabel').textContent = 'DISTANCE';
    const cross = crs === 'traverse';
    if (cross) { $('oDist').textContent = `${distance}`; $('oDistLabel').textContent = 'RANGÉES'; }
    if (mole && result === 'finish') { $('oDist').textContent = `${timeLeft.toFixed(1)} s`; $('oDistLabel').textContent = 'CHRONO RESTANT'; }
    const CROSS_MSG = { car: 'Aplati par la circulation de Bulle ! Regarde à gauche ET à droite…', train: 'Le Gruyère Express ne s\'arrête pour personne !',
      water: 'Plouf ! Ramo a bu la tasse dans la Trême.', eagle: 'L\'aigle du Moléson n\'aime pas les castors qui traînent !' };
    $('overMsg').textContent = cross ? (CROSS_MSG[result] || 'Fin de la traversée !') : mole
      ? (result === 'finish' ? 'Arrivé à Gruyères ! Une meringue double-crème bien méritée 🍮' : result === 'timeout' ? 'Le télésiège est fermé… Passe plus de portes pour gagner du temps !' : 'Gamelle dans la poudreuse ! La luge est en miettes.')
      : pick(md === 'adult' ? MSG_GAMEOVER_ADULT : MSG_GAMEOVER);
    $('overTitle').textContent = isRecord ? 'QUEL CASTOR !'
      : cross ? ({ car: 'SPLAT !', train: 'TCHOU-TCHOU !', water: 'PLOUF !', eagle: 'ENVOLÉ !' }[result] || 'FIN !')
      : mole ? (result === 'finish' ? 'ARRIVÉ ! 🏁' : result === 'timeout' ? 'TROP TARD ! ⏱' : 'GAMELLE !')
      : (md === 'adult' ? 'RIDEAU !' : 'FIN DE TOURNÉE !');
    $('oRecord').classList.toggle('hidden', !isRecord);
    if (isRecord) setTimeout(() => sfx.record(), 300);
    $('hud').classList.add('hidden');
    lastScore = score;
    show('over');
  },
  reportError(where, e) {
    try {
      fetch('/api/log', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ where, msg: String(e && e.message || e), stack: String(e && e.stack || '').slice(0, 1500), course, mode, ua: navigator.userAgent }) });
    } catch { /* ignore */ }
  },
  brosDone(r) {
    $('brosPad').classList.add('hidden'); $('hud').classList.add('hidden');
    const isBest = store.saveBros(r.mode, r.id, r);
    const P = store.bros(r.mode), total = brosTotal(r.mode);
    const done = LEVEL_IDS.filter((id) => P[id] && P[id].done).length, dur = LEVEL_IDS.reduce((a, id) => a + ((P[id] && P[id].time) || 0), 0);
    const key = boardKey('bros', r.mode);
    store.submit(key, total, done, dur);
    $('bdTitle').textContent = r.boss ? 'BOSS VAINCU ! 🏆' : 'NIVEAU TERMINÉ !';
    $('bdStars').innerHTML = r.stars.map((s, i) => `<span class="bstar ${s ? 'on' : ''}" style="animation-delay:${0.2 + i * 0.25}s">★</span>`).join('');
    $('bdStars').classList.toggle('hidden', r.boss);
    $('bdLines').innerHTML = [
      ['🍺 Bières', r.beers], ['🚩 Drapeau', `+${r.flagBonus}`], ['⏱ Temps', `${Math.round(r.time)} s · +${r.timeBonus}`], ['❤️ Vies restantes', `+${r.lifeBonus}`],
    ].map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('');
    $('bdScore').textContent = r.score.toLocaleString('fr-CH');
    $('bdBest').textContent = isBest ? '🎉 NOUVEAU RECORD DU NIVEAU !' : `Record du niveau : ${P[r.id].best.toLocaleString('fr-CH')}`;
    const rk = $('bdRank'); rk.textContent = '🌍 Envoi au classement…';
    submitOnline(key, total, done, dur).then((res) => {
      rk.innerHTML = res ? `🌍 Total ${total.toLocaleString('fr-CH')} pts · <b>${res.rank === 1 ? '🥇 N°1' : res.rank + 'e'}</b> sur ${res.total}` : `🌍 Total ${total.toLocaleString('fr-CH')} pts`;
      lastRank = res && res.rank;
    });
    const next = LEVEL_IDS[LEVEL_IDS.indexOf(r.id) + 1];
    $('btnBdNext').classList.toggle('hidden', !next); if (next) $('btnBdNext').textContent = `NIVEAU ${next.replace('B', 'BOSS')} ▶`;
    brosNext = next; lastScore = total;
    sfx.record(); show('brosDone');
  },
  buvDay(r) {
    $('hud').classList.add('hidden');
    const S = store.buv(r.mode);
    S.money += r.earned; S.total += r.earned; S.time += r.duration;
    const prevStars = S.stars[r.day] || 0; S.stars[r.day] = Math.max(prevStars, r.stars);
    const advanced = r.stars >= 1 && r.day === S.day; if (advanced) S.day++;
    store.saveBuv(r.mode, S);
    const key = boardKey('buvette', r.mode), dur = Math.max(3, Math.min(3600, S.time));
    store.submit(key, S.total, S.day, dur);
    $('bvTitle').textContent = r.closed ? 'LE CHALET FERME ! 😬' : r.stars >= 3 ? 'SOIRÉE DE FOLIE ! 🎉' : r.stars >= 1 ? 'BELLE JOURNÉE ! 🍻' : 'PAS ASSEZ… 😅';
    $('bvStars').innerHTML = [0, 1, 2].map((i) => `<span class="bstar ${i < r.stars ? 'on' : ''}" style="animation-delay:${0.2 + i * 0.25}s">★</span>`).join('');
    $('bvLines').innerHTML = [
      ['🙋 Clients servis', r.served], ['💰 Pourboires', `${r.tips} CHF`], ['🔥 Meilleur combo', `x${Math.max(1, r.bestCombo)}`], ['😤 Clients fâchés', r.angry], ['💸 Pertes (gaspillage, fâchés)', `-${r.lost || 0} CHF`],
      ['🎯 Objectifs', r.targets.map((t, i) => `${'★'.repeat(i + 1)} ${t}`).join(' · ')],
    ].map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('');
    $('bvEarned').textContent = `${r.earned} CHF`; $('bvMoney').textContent = `${S.money} CHF`;
    $('bvMsg').textContent = r.stars >= 1 ? (advanced ? `🔓 Jour ${S.day} débloqué !` : '') : `Il faut ${r.targets[0]} CHF pour passer au jour suivant. Achète des améliorations à la boutique !`;
    const rk = $('bvRank'); rk.textContent = '🌍 Envoi au classement…';
    submitOnline(key, S.total, S.day, dur).then((res) => {
      rk.innerHTML = res ? `🌍 Total gagné ${S.total.toLocaleString('fr-CH')} CHF · <b>${res.rank === 1 ? '🥇 N°1' : res.rank + 'e'}</b> sur ${res.total}` : `🌍 Total gagné ${S.total.toLocaleString('fr-CH')} CHF`;
      lastRank = res && res.rank;
    });
    buvDayNext = r.stars >= 1 ? S.day : r.day;
    $('btnBvNext').textContent = r.stars >= 1 ? `JOUR ${S.day} ▶` : `↻ RÉESSAYER LE JOUR ${r.day}`;
    lastScore = S.total;
    $('bvSummary').classList.remove('hidden'); $('bvShop').classList.add('hidden');
    updateShopBtn(); show('buvDay');
  },
  loveRoom(on) { $('btnSkipLove').classList.toggle('hidden', !on); },
};
let lastScore = 0;
let buvDayNext = 1;
let brosLevel = '1-1', brosNext = null;
const brosTotal = (md) => Object.values(store.bros(md)).reduce((a, l) => a + (l.best || 0), 0);
let lastRank = null;
let boardMode = 'classic';
let pendingPlay = false;
let howtoSeen = false; // le mode d'emploi s'affiche avant la première partie de chaque visite
let game;

function applyMode() {
  document.body.classList.toggle('adult', mode === 'adult');
  $('btnClassic').classList.toggle('hidden', mode !== 'adult');
  $('slogan').textContent = mode === 'adult' ? '🔥 RAMO AFTER DARK 🔥' : 'Un castor, des bières et zéro limite !';
  $('levelName').textContent = mode === 'adult' ? '5 JEUX · BY NIGHT' : '5 JEUX · BULLE & LA GRUYÈRE';
  document.querySelector('meta[name=theme-color]').content = mode === 'adult' ? '#3a0b5e' : '#1b6fd1';
  game.reset(mode, 'bulle'); // décor du menu dans la bonne ambiance
}
function updateHello() { $('hello').textContent = store.pseudo ? `Salut ${store.pseudo} !` : ''; }

// ------------------------------------------------ choix du parcours
function showLevels() {
  const cards = LEVEL_ORDER.map(levelById).map((l) => {
    const best = store.best(l.board(mode));
    const SB = store.buv(mode);
    const info = l.id === 'buvette'
      ? { emo: '🍻', title: 'RAMO BUVETTE', desc: 'Tiens la buvette du chalet des 4F : tire les bières, grille les saucisses, sers les clientes… et agrandis ton chalet !', tag: `NOUVEAU · Jour ${SB.day} · 💰 ${SB.money} CHF` }
      : l.id === 'bros'
      ? { emo: '🍄', title: 'SUPER RAMO BROS', desc: '4 mondes, 12 niveaux et 4 boss : Bulle, Gruyères, le Moléson et le lac. Des bières partout !', tag: `NOUVEAU · ⭐ ${Object.values(store.bros(mode)).reduce((a, x) => a + (x.stars || []).filter(Boolean).length, 0)}/24` }
      : l.id === 'traverse'
      ? { emo: '🦫', title: 'TRAVERSE BULLE', desc: 'Saute de case en case : routes, tracteurs, train, la Trême… Jusqu\'où iras-tu ?', tag: 'NOUVEAU · SANS FIN' }
      : l.id === 'moleson'
      ? { emo: '⛷️', title: 'LA DESCENTE DU MOLÉSON', desc: 'En luge jusqu\'à Gruyères ! Passe les portes de slalom pour gagner du temps.', tag: 'CHRONO · 2,2 km' }
      : { emo: '🍺', title: 'MISSION APÉRO — BULLE', desc: 'La Grand-Rue à fond, des bières partout. Tiens le plus longtemps possible !', tag: 'SANS FIN' };
    return `<button class="level-card lv-${l.id}" data-id="${l.id}">
      <span class="lv-emo">${info.emo}</span>
      <span class="lv-txt"><b>${info.title}</b><small>${info.desc}</small><em>${info.tag}${best ? ` · Record ${best.toLocaleString('fr-CH')}` : ''}</em></span>
    </button>`;
  }).join('');
  $('levelList').innerHTML = cards;
  $('levelList').querySelectorAll('.level-card').forEach((b) => (b.onclick = () => { sfx.click(); hide('levels'); if (b.dataset.id === 'bros') { showBrosMap(); return; } course = b.dataset.id; if (course === 'buvette') buvDayNext = store.buv(mode).day; play(); }));
  show('levels');
}
// ------------------------------------------------ Super Ramo Bros : carte des mondes
function brosUnlocked(id) {
  const i = LEVEL_IDS.indexOf(id); if (id.endsWith('-1')) return true; // le 1er niveau de chaque monde est ouvert
  const prev = store.bros(mode)[LEVEL_IDS[i - 1]]; return !!(prev && prev.done);
}
function showBrosMap() {
  const P = store.bros(mode);
  const emo = { bulle: '🏘️', gruyeres: '🏰', moleson: '🏔️', lac: '⛵' };
  $('brosWorlds').innerHTML = WORLDS.map((w) => `
    <div class="bworld bw-${w.theme}">
      <div class="bw-head"><span class="bw-emo">${emo[w.theme]}</span><span><b>MONDE ${w.id} · ${w.name}</b><small>${w.sub} · boss : ${w.boss.name}</small></span></div>
      <div class="bw-levels">${[`${w.id}-1`, `${w.id}-2`, `${w.id}-B`].map((id) => {
        const L = P[id] || {}, open = brosUnlocked(id), st = (L.stars || [false, false, false]);
        return `<button class="blevel ${open ? '' : 'locked'} ${L.done ? 'done' : ''}" data-id="${id}" ${open ? '' : 'disabled'}>
          <b>${id.endsWith('B') ? '👑 BOSS' : id}</b>
          <small>${open ? (id.endsWith('B') ? (L.done ? '✅' : '') : st.map((s) => (s ? '★' : '☆')).join('')) : '🔒'}</small>
          ${L.best ? `<em>${L.best.toLocaleString('fr-CH')}</em>` : ''}
        </button>`;
      }).join('')}</div>
    </div>`).join('');
  $('brosTotal').textContent = `Total : ${brosTotal(mode).toLocaleString('fr-CH')} pts · ⭐ ${Object.values(P).reduce((a, l) => a + (l.stars || []).filter(Boolean).length, 0)}/24`;
  $('brosWorlds').querySelectorAll('.blevel:not(.locked)').forEach((b) => (b.onclick = () => { sfx.click(); brosLevel = b.dataset.id; course = 'bros'; hide('brosMap'); play(); }));
  show('brosMap');
}

// ------------------------------------------------ Ramo Buvette : boutique
function updateShopBtn() { const S = store.buv(mode); $('btnBvShop').textContent = `🛒 BOUTIQUE · 💰 ${S.money} CHF`; }
function renderShop() {
  const S = store.buv(mode);
  $('bvShopMoney').textContent = `💰 Caisse du chalet : ${S.money} CHF`;
  $('bvShopList').innerHTML = UPGRADES.map((u) => {
    const lv = S.upg[u.id] || 0, max = lv >= u.costs.length, cost = u.costs[lv];
    return `<div class="shop-item ${max ? 'max' : ''}"><span class="se">${u.emo}</span><span class="st"><b>${u.name}</b><small>${u.desc}</small>
      <span class="lv">${u.costs.map((_, i) => (i < lv ? '●' : '○')).join(' ')}</span></span>
      <button data-id="${u.id}" ${max || S.money < cost ? 'disabled' : ''}>${max ? '✓ MAX' : `${cost} CHF`}</button></div>`;
  }).join('');
  $('bvShopList').querySelectorAll('button[data-id]').forEach((b) => (b.onclick = () => {
    const S2 = store.buv(mode), u = UPGRADES.find((x) => x.id === b.dataset.id), lv = S2.upg[u.id] || 0, cost = u.costs[lv];
    if (cost === undefined || S2.money < cost) return;
    S2.money -= cost; S2.upg[u.id] = lv + 1; store.saveBuv(mode, S2); sfx.golden(); renderShop(); updateShopBtn();
    $('bvMoney').textContent = `${S2.money} CHF`;
  }));
}

function updateSoundBtn() { $('btnSound').textContent = store.sound ? '🔊 SON' : '🔇 SON'; }

function play() {
  initAudio();
  if (!store.pseudo) { pendingPlay = true; show('pseudo'); setTimeout(() => $('pseudoInput').focus(), 100); return; }
  if (!howtoSeen) { pendingPlay = true; show('howto'); return; }
  hide('menu'); hide('over'); hide('pause'); hide('levels'); hide('brosDone'); hide('brosMap'); hide('buvDay');
  $('hud').classList.remove('hidden');
  if (course === 'bros') game.startBros(mode, brosLevel);
  else if (course === 'buvette') { const S = store.buv(mode); S.playDay = buvDayNext && buvDayNext <= S.day ? buvDayNext : S.day; game.startBuvette(mode, { ...S, day: S.playDay }); }
  else game.start(mode, course);
  startMusic(mode);
}
function toMenu() {
  hide('over'); hide('pause'); hide('brosDone'); hide('brosMap'); hide('buvDay'); $('hud').classList.add('hidden'); $('btnSkipLove').classList.add('hidden'); $('brosPad').classList.add('hidden');
  game.state = 'idle'; game.reset(mode, 'bulle');
  stopMusic(); updateHello(); show('menu');
}

// ------------------------------------------------ commandes tactiles + clavier
function bindInput() {
  let sx = 0, sy = 0, fired = false, active = false;
  const TH = 28;
  window.addEventListener('pointerdown', () => { if (game.state === 'intro') game.skipIntro(); });
  window.addEventListener('touchstart', (e) => {
    if (game.state !== 'play') return;
    const t = e.touches[0]; sx = t.clientX; sy = t.clientY; fired = false; active = true;
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (!active || fired || game.state !== 'play') return;
    const t = e.touches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < TH) return;
    fired = true;
    if (Math.abs(dx) > Math.abs(dy)) game.input(dx > 0 ? 'right' : 'left'); else game.input(dy > 0 ? 'down' : 'up');
  }, { passive: true });
  window.addEventListener('touchend', (e) => {
    if (active && !fired && game.state === 'play' && !e.target.closest('button')) game.input('tap');
    active = false;
  }, { passive: true });
  // souris (ordinateur) : glisser aussi
  let md = null;
  window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' && game.state === 'play') md = { x: e.clientX, y: e.clientY }; });
  window.addEventListener('pointerup', (e) => {
    if (!md) return; const dx = e.clientX - md.x, dy = e.clientY - md.y; md = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < TH) { if (!e.target.closest('button')) game.input('tap'); return; }
    if (Math.abs(dx) > Math.abs(dy)) game.input(dx > 0 ? 'right' : 'left'); else game.input(dy > 0 ? 'down' : 'up');
  });
  const bkey = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'jump', ' ': 'jump', a: 'left', d: 'right', q: 'left', w: 'jump', z: 'jump' };
  window.addEventListener('keydown', (e) => { if (game.bros && bkey[e.key] && game.state === 'play') { e.preventDefault(); game.bros.setKey(bkey[e.key], true); } });
  window.addEventListener('keyup', (e) => { if (game.bros && bkey[e.key]) game.bros.setKey(bkey[e.key], false); });
  // boutons tactiles (multi-touch) : zone gauche = direction, bouton droit = saut
  const zone = $('padMove'), jumpB = $('padJump');
  const moveIds = new Map();
  const setMove = () => { const vals = [...moveIds.values()]; if (game.bros) { game.bros.setKey('left', vals.includes(-1)); game.bros.setKey('right', vals.includes(1)); }
    $('padL').classList.toggle('on', vals.includes(-1)); $('padR').classList.toggle('on', vals.includes(1)); };
  const dirOf = (e) => { const r = zone.getBoundingClientRect(); return e.clientX < r.left + r.width / 2 ? -1 : 1; };
  zone.addEventListener('pointerdown', (e) => { e.preventDefault(); zone.setPointerCapture(e.pointerId); moveIds.set(e.pointerId, dirOf(e)); setMove(); });
  zone.addEventListener('pointermove', (e) => { if (moveIds.has(e.pointerId)) { moveIds.set(e.pointerId, dirOf(e)); setMove(); } });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) zone.addEventListener(ev, (e) => { moveIds.delete(e.pointerId); setMove(); });
  const jumpIds = new Set();
  jumpB.addEventListener('pointerdown', (e) => { e.preventDefault(); jumpB.setPointerCapture(e.pointerId); jumpIds.add(e.pointerId); if (game.bros) game.bros.setKey('jump', true); jumpB.classList.add('on'); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) jumpB.addEventListener(ev, (e) => { jumpIds.delete(e.pointerId); if (!jumpIds.size) { if (game.bros) game.bros.setKey('jump', false); jumpB.classList.remove('on'); } });
  window.addEventListener('keydown', (e) => {
    const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down', q: 'left', z: 'up', ' ': 'up' };
    if (e.key === 'Escape' || e.key === 'p') { togglePause(); return; }
    if (map[e.key] && game.state === 'play') { e.preventDefault(); game.input(map[e.key]); }
    else if (e.key === 'Enter' && $('over').classList.contains('show')) play();
  });
  document.addEventListener('touchmove', (e) => { if (e.target.tagName !== 'INPUT' && !e.target.closest('.board, .howto-card, .bros-card, .buv-card')) e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
}

function togglePause() {
  if (game.state === 'play') { game.pause(true); show('pause'); stopMusic(); }
  else if (game.state === 'pause') { hide('pause'); game.pause(false); startMusic(mode); }
}

// ------------------------------------------------ accès secret : 5 pressions rapides sur le logo
function bindSecret() {
  let taps = [];
  $('logo').addEventListener('click', () => {
    const now = Date.now();
    taps = taps.filter((t) => now - t < 2500); taps.push(now);
    $('logo').classList.remove('tap'); void $('logo').offsetWidth; $('logo').classList.add('tap');
    if (taps.length >= 5) {
      taps = [];
      if (mode === 'adult') return;
      $('secretCode').value = ''; $('secretAge').checked = false; $('secretErr').classList.add('hidden');
      show('secret'); setTimeout(() => $('secretCode').focus(), 100);
    }
  });
  $('btnSecretOk').onclick = () => {
    const err = $('secretErr');
    if ($('secretCode').value.trim() !== '90') { err.textContent = 'Mauvais code… 🦫'; err.classList.remove('hidden'); return; }
    if (!$('secretAge').checked) { err.textContent = 'Réservé aux plus de 18 ans.'; err.classList.remove('hidden'); return; }
    hide('secret'); mode = 'adult'; applyMode(); updateHello(); initAudio(); sfx.wolf();
  };
  $('btnSecretCancel').onclick = () => hide('secret');
  $('btnClassic').onclick = () => { mode = 'classic'; applyMode(); updateHello(); sfx.click(); };
}

// ------------------------------------------------ partage WhatsApp
async function share() {
  const url = location.origin + '/';
  const text = `${SHARE_TEXT} Mon score : ${lastScore.toLocaleString('fr-CH')} 🍺${lastRank ? ` (n°${lastRank} du classement)` : ''}`;
  if (navigator.share) {
    try { await navigator.share({ title: 'RAMO GONE WILD', text, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(`${text} ${url}`); ui.message('Lien copié ! Colle-le dans WhatsApp 📲'); } catch { /* ignore */ }
  window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank');
}

const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

let boardCourse = 'bulle';
function renderRecords() {
  if (mode !== 'adult') boardMode = 'classic';
  const ctabs = `<div class="tabs">${LEVEL_ORDER.map((id) => `<button class="tab ctab ${boardCourse === id ? 'on' : ''}" data-c="${id}">${{ buvette: '🍻 Buvette', bros: '🍄 Bros', traverse: '🦫 Traverse', moleson: '⛷️ Moléson', bulle: '🍺 Bulle' }[id]}</button>`).join('')}</div>`;
  const tabs = mode === 'adult'
    ? `<div class="tabs"><button class="tab ${boardMode === 'classic' ? 'on' : ''}" data-m="classic">Classique</button><button class="tab ${boardMode === 'adult' ? 'on' : ''}" data-m="adult">🔥 18+</button></div>` : '';
  const key = boardKey(boardCourse, boardMode);
  const mine = `<div class="rec ${boardMode === 'adult' ? 'adult' : ''}"><span>📱 Ton record (${esc(store.pseudo || '—')})</span><b>${store.best(key).toLocaleString('fr-CH')}</b></div>`;
  $('recList').innerHTML = ctabs + tabs + mine + `<h3 class="board-title">🌍 CLASSEMENT PUBLIC</h3><div class="board" id="board"><p class="note">Chargement…</p></div>`;
  $('recList').querySelectorAll('.tab').forEach((b) => (b.onclick = () => { if (b.dataset.c) boardCourse = b.dataset.c; else boardMode = b.dataset.m; renderRecords(); }));
  const want = key;
  fetchBoard(want).then(async (res) => {
    if (res && await syncBest(want, res)) res = await fetchBoard(want); // record local pas encore public : on le rattrape
    if (want !== boardKey(boardCourse, boardMode) || !$('board')) return;
    if (!res) { $('board').innerHTML = '<p class="note">Classement indisponible pour le moment.</p>'; return; }
    if (!res.top.length) { $('board').innerHTML = '<p class="note">Personne pour l\'instant… Joue une partie et deviens le n°1 !</p>'; return; }
    const medal = (r) => (r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : r);
    let html = res.top.map((r) => `<div class="row ${r.me ? 'me' : ''}"><span class="rk">${medal(r.rank)}</span><span class="ps">${esc(r.pseudo)}</span><b>${r.score.toLocaleString('fr-CH')}</b></div>`).join('');
    if (res.mine && res.mine.rank > 100) html += `<div class="row me"><span class="rk">${res.mine.rank}</span><span class="ps">${esc(store.pseudo)}</span><b>${res.mine.score.toLocaleString('fr-CH')}</b></div>`;
    $('board').innerHTML = html + `<p class="note">${res.total} joueur${res.total > 1 ? 's' : ''} au classement</p>`;
  });
}

async function boot() {
  const [full, head] = await Promise.all([loadImg('/assets/ramo-full.webp'), loadImg('/assets/ramo-head.webp')]);
  if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);
  game = new Game($('game'), { full, head }, ui);
  window.__ramo = { game, store, get mode() { return mode; } }; // utile pour les tests
  setSound(store.sound); updateSoundBtn(); updateHello();
  bindInput(); bindSecret();

  $('btnPlay').onclick = () => { sfx.click(); initAudio(); showLevels(); };
  $('btnLevelsBack').onclick = () => hide('levels');
  $('btnBrosBack').onclick = () => { hide('brosMap'); showLevels(); };
  $('btnBdNext').onclick = () => { sfx.click(); if (brosNext) { brosLevel = brosNext; course = 'bros'; play(); } };
  $('btnBdAgain').onclick = () => { sfx.click(); course = 'bros'; play(); };
  $('btnBdMap').onclick = () => { hide('brosDone'); toMenu(); hide('menu'); showBrosMap(); };
  $('btnBdShare').onclick = share;
  $('btnBvNext').onclick = () => { sfx.click(); course = 'buvette'; play(); };
  $('btnBvShop').onclick = () => { sfx.click(); renderShop(); $('bvSummary').classList.add('hidden'); $('bvShop').classList.remove('hidden'); $('bvTitle').textContent = '🛒 BOUTIQUE'; };
  $('btnBvShopBack').onclick = () => { sfx.click(); $('bvShop').classList.add('hidden'); $('bvSummary').classList.remove('hidden'); $('bvTitle').textContent = 'ON CONTINUE ?'; };
  $('btnBvMenu').onclick = () => { hide('buvDay'); toMenu(); };
  $('btnBvShare').onclick = share;
  $('game').addEventListener('pointerdown', (e) => { if (game.buv && game.state === 'play') { e.preventDefault(); game.buv.tap(e.clientX, e.clientY); } });
  $('btnReplay').onclick = () => { sfx.click(); play(); };
  $('btnMenu').onclick = toMenu; $('btnQuit').onclick = toMenu;
  $('btnPause').onclick = togglePause; $('btnResume').onclick = togglePause;
  $('btnShare').onclick = share;
  $('btnSound').onclick = () => { initAudio(); store.sound = !store.sound; setSound(store.sound); updateSoundBtn(); sfx.click(); };
  $('btnRecords').onclick = () => { boardCourse = course; renderRecords(); show('records'); };
  $('btnRecClose').onclick = () => hide('records');
  $('btnPseudo').onclick = () => { hide('records'); $('pseudoInput').value = store.pseudo; show('pseudo'); };
  $('btnPseudoOk').onclick = () => {
    const v = $('pseudoInput').value.trim(); if (!v) { $('pseudoInput').focus(); return; }
    store.pseudo = v; hide('pseudo'); updateHello();
    if (pendingPlay) { pendingPlay = false; play(); }
  };
  $('pseudoInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btnPseudoOk').click(); });
  $('secretCode').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btnSecretOk').click(); });
  $('btnSkipLove').onclick = () => game.endLove();
  $('btnHelp').onclick = () => { sfx.click(); show('howto'); };
  $('btnHowtoOk').onclick = () => { howtoSeen = true; store.tutorial = true; hide('howto'); if (pendingPlay) { pendingPlay = false; play(); } };
  document.addEventListener('visibilitychange', () => { if (document.hidden && game.state === 'play') togglePause(); });

  hide('loading'); show('menu');
  for (const l of LEVELS) for (const md of ['classic', 'adult']) { const k = l.board(md); if (store.best(k)) fetchBoard(k).then((b) => syncBest(k, b)); }
  window.addEventListener('error', (e) => ui.reportError('window', e.error || e.message));
}
boot();
