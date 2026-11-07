import { Game } from './game.js';
import { store, submitOnline, fetchBoard, syncBest } from './storage.js';
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
  hud({ score, lives, distance, bonus, combo, mole, timeLeft, progress, cross }) {
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
    $('hDist').textContent = cross ? `🐾 ${distance} rangées` : `${distance.toLocaleString('fr-CH')} m`;
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
  gameOver({ score, distance, mode: md, duration, course: crs, result, timeLeft }) {
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
  loveRoom(on) { $('btnSkipLove').classList.toggle('hidden', !on); },
};
let lastScore = 0;
let lastRank = null;
let boardMode = 'classic';
let pendingPlay = false;
let howtoSeen = false; // le mode d'emploi s'affiche avant la première partie de chaque visite
let game;

function applyMode() {
  document.body.classList.toggle('adult', mode === 'adult');
  $('btnClassic').classList.toggle('hidden', mode !== 'adult');
  $('slogan').textContent = mode === 'adult' ? '🔥 RAMO AFTER DARK 🔥' : 'Un castor, des bières et zéro limite !';
  $('levelName').textContent = mode === 'adult' ? '2 PARCOURS · BY NIGHT' : '2 PARCOURS · BULLE & MOLÉSON';
  document.querySelector('meta[name=theme-color]').content = mode === 'adult' ? '#3a0b5e' : '#1b6fd1';
  game.reset(mode, 'bulle'); // décor du menu dans la bonne ambiance
}
function updateHello() { $('hello').textContent = store.pseudo ? `Salut ${store.pseudo} !` : ''; }

// ------------------------------------------------ choix du parcours
function showLevels() {
  const cards = LEVEL_ORDER.map(levelById).map((l) => {
    const best = store.best(l.board(mode));
    const info = l.id === 'traverse'
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
  $('levelList').querySelectorAll('.level-card').forEach((b) => (b.onclick = () => { sfx.click(); course = b.dataset.id; hide('levels'); play(); }));
  show('levels');
}
function updateSoundBtn() { $('btnSound').textContent = store.sound ? '🔊 SON' : '🔇 SON'; }

function play() {
  initAudio();
  if (!store.pseudo) { pendingPlay = true; show('pseudo'); setTimeout(() => $('pseudoInput').focus(), 100); return; }
  if (!howtoSeen) { pendingPlay = true; show('howto'); return; }
  hide('menu'); hide('over'); hide('pause'); hide('levels');
  $('hud').classList.remove('hidden');
  game.start(mode, course);
  startMusic(mode);
}
function toMenu() {
  hide('over'); hide('pause'); $('hud').classList.add('hidden'); $('btnSkipLove').classList.add('hidden');
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
  window.addEventListener('keydown', (e) => {
    const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down', q: 'left', z: 'up', ' ': 'up' };
    if (e.key === 'Escape' || e.key === 'p') { togglePause(); return; }
    if (map[e.key] && game.state === 'play') { e.preventDefault(); game.input(map[e.key]); }
    else if (e.key === 'Enter' && $('over').classList.contains('show')) play();
  });
  document.addEventListener('touchmove', (e) => { if (e.target.tagName !== 'INPUT' && !e.target.closest('.board, .howto-card')) e.preventDefault(); }, { passive: false });
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
  const ctabs = `<div class="tabs">${LEVEL_ORDER.map((id) => `<button class="tab ctab ${boardCourse === id ? 'on' : ''}" data-c="${id}">${{ traverse: '🦫 Traverse', moleson: '⛷️ Moléson', bulle: '🍺 Bulle' }[id]}</button>`).join('')}</div>`;
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
