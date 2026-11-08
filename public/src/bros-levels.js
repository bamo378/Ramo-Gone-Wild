// =====================================================================
//  SUPER RAMO BROS — niveaux
//  Chaque niveau est un assemblage de « morceaux » dessinés en caractères.
//  Les lignes d'un morceau sont alignées EN BAS (dernière ligne = sol, rangée 13).
//
//  Légende :
//   #  sol            =  brique (cassable quand Ramo est grand)   ?  bloc bière
//   p  bloc bonus (chope / bière dorée)   X  bloc dur   T  pilier (tonneaux, fromages…)
//   -  planche (traversable par dessous)  ^  pics      s  ressort (caquelon)
//   o  bière         *  étoile (3 par niveau)
//   g  marcheur      k  volant            r  roue de fromage      f  poisson (saute des trous)
//   M  plateforme mobile horizontale      V  plateforme mobile verticale
//   C  cloche-checkpoint   F  drapeau d'arrivée   S  départ   B  boss
// =====================================================================

export const ROWS = 14;

const C = {
  start: [
    '              ',
    '              ',
    '              ',
    '  S           ',
    '##############',
    '##############'],
  beers: [
    '                ',
    '   o o o o      ',
    '                ',
    '          g     ',
    '################',
    '################'],
  blocks: [
    '      =?=p=       ',
    '                  ',
    '                  ',
    '        g     g   ',
    '##################',
    '##################'],
  blocks2: [
    '        o o       ',
    '      ?=====?     ',
    '                  ',
    '                  ',
    '   =?=        g   ',
    '                  ',
    '                  ',
    '##################',
    '##################'],
  gap3: [
    '    o o o   ',
    '            ',
    '            ',
    '            ',
    '####   #####',
    '####   #####'],
  gap4star: [
    '     o*o      ',
    '              ',
    '              ',
    '              ',
    '####    ######',
    '####    ######'],
  pillars: [
    '                 o  ',
    '                    ',
    '            TT      ',
    '      TT    TT      ',
    '      TT  g TT    g ',
    '####################',
    '####################'],
  stairsUp: [
    '         o  ',
    '        XXXX',
    '      XXXXXX',
    '    XXXXXXXX',
    '  XXXXXXXXXX',
    '############',
    '############'],
  stairsDownGap: [
    'XXXX           ',
    'XXXXXX         ',
    'XXXXXXX   o    ',
    'XXXXXXXX       ',
    '########   ####',
    '########   ####'],
  checkpoint: [
    '            ',
    '            ',
    '            ',
    '    C       ',
    '############',
    '############'],
  springStar: [
    '      o * o     ',
    '     XXXXXXX    ',
    '                ',
    '                ',
    '                ',
    '                ',
    '  s        g    ',
    '################',
    '################'],
  flyers: [
    '                ',
    '     k      k   ',
    '                ',
    '   o   o   o    ',
    '                ',
    '                ',
    '################',
    '################'],
  oneway: [
    '         o *    ',
    '        -----   ',
    '                ',
    '    ----        ',
    '                ',
    ' ----     g     ',
    '                ',
    '################',
    '################'],
  moving: [
    '     o o o       ',
    '                 ',
    '                 ',
    '                 ',
    '   M             ',
    '                 ',
    '##            ###',
    '##            ###'],
  vertical: [
    '        o o      ',
    '       XXXXX     ',
    '                 ',
    '                 ',
    '                 ',
    '   V             ',
    '                 ',
    '                 ',
    '####    #########',
    '####    #########'],
  spikes: [
    '     o o o     ',
    '               ',
    '               ',
    '     ^^^^      ',
    '###############',
    '###############'],
  rollers: [
    '                  ',
    '    ?   p   ?     ',
    '                  ',
    '                  ',
    '      r      r    ',
    '##################',
    '##################'],
  enemies: [
    '                  ',
    '   o    o    o    ',
    '                  ',
    '    g  g    g  g  ',
    '##################',
    '##################'],
  fishGap: [
    '     o   o     ',
    '               ',
    '   ---   ---   ',
    '               ',
    '               ',
    '###    f    ###',
    '###         ###'],
  bigGap: [
    '                  ',
    '         *        ',
    '                  ',
    '      o    o      ',
    '                  ',
    '                  ',
    '###    ----    ###',
    '###            ###'],
  secret: [
    '  *             ',
    ' XXX            ',
    '                ',
    '                ',
    '      ===       ',
    '                ',
    '                ',
    '     =   =      ',
    '                ',
    '                ',
    '################',
    '################'],
  goal: [
    '                    ',
    '                    ',
    '                    ',
    '                    ',
    '  XX                ',
    ' XXX       F        ',
    '####################',
    '####################'],
  arena: [
    'X                            X',
    'X                            X',
    'X                            X',
    'X                            X',
    'X     ----          ----     X',
    'X                            X',
    'X                            X',
    'X   o                    o   X',
    'X S                    B     X',
    '##############################',
    '##############################'],
};

// Monde : thème visuel + nom + boss
export const WORLDS = [
  { id: 1, name: 'BULLE', sub: 'La Grand-Rue', theme: 'bulle', boss: { name: 'L\'Armailli Géant', hp: 3, kind: 'armailli' } },
  { id: 2, name: 'GRUYÈRES', sub: 'La cité médiévale', theme: 'gruyeres', boss: { name: 'La Grue de Gruyères', hp: 4, kind: 'grue' } },
  { id: 3, name: 'MOLÉSON', sub: 'Les sommets enneigés', theme: 'moleson', boss: { name: 'Le Yéti du Moléson', hp: 4, kind: 'yeti' } },
  { id: 4, name: 'LAC DE LA GRUYÈRE', sub: 'Les rives', theme: 'lac', boss: { name: 'Le Brochet Géant', hp: 5, kind: 'brochet' } },
];

const L = {
  '1-1': ['start', 'beers', 'blocks', 'gap3', 'enemies', 'pillars', 'checkpoint', 'blocks2', 'springStar', 'flyers', 'gap4star', 'stairsUp', 'stairsDownGap', 'secret', 'goal'],
  '1-2': ['start', 'pillars', 'moving', 'enemies', 'blocks', 'oneway', 'checkpoint', 'spikes', 'gap3', 'rollers', 'springStar', 'bigGap', 'stairsUp', 'stairsDownGap', 'goal'],
  '2-1': ['start', 'rollers', 'blocks2', 'gap3', 'pillars', 'enemies', 'checkpoint', 'oneway', 'rollers', 'springStar', 'vertical', 'gap4star', 'stairsUp', 'stairsDownGap', 'goal'],
  '2-2': ['start', 'enemies', 'moving', 'rollers', 'spikes', 'checkpoint', 'secret', 'blocks', 'flyers', 'bigGap', 'pillars', 'vertical', 'springStar', 'rollers', 'goal'],
  '3-1': ['start', 'beers', 'flyers', 'gap3', 'blocks', 'oneway', 'checkpoint', 'enemies', 'vertical', 'springStar', 'spikes', 'gap4star', 'stairsUp', 'stairsDownGap', 'goal'],
  '3-2': ['start', 'flyers', 'moving', 'spikes', 'blocks2', 'checkpoint', 'vertical', 'enemies', 'bigGap', 'secret', 'oneway', 'springStar', 'flyers', 'gap4star', 'goal'],
  '4-1': ['start', 'beers', 'fishGap', 'blocks', 'moving', 'checkpoint', 'fishGap', 'enemies', 'springStar', 'bigGap', 'oneway', 'fishGap', 'gap4star', 'goal'],
  '4-2': ['start', 'fishGap', 'moving', 'rollers', 'vertical', 'checkpoint', 'fishGap', 'secret', 'flyers', 'bigGap', 'moving', 'springStar', 'fishGap', 'spikes', 'goal'],
};

export const LEVEL_IDS = ['1-1', '1-2', '1-B', '2-1', '2-2', '2-B', '3-1', '3-2', '3-B', '4-1', '4-2', '4-B'];

// Assemble un niveau : grille de caractères ROWS × largeur, + liste des étoiles
export function buildLevel(id) {
  const world = WORLDS[Number(id[0]) - 1];
  const isBoss = id.endsWith('B');
  const parts = isBoss ? ['arena'] : L[id];
  const grid = Array.from({ length: ROWS }, () => []);
  for (const name of parts) {
    const ch = C[name];
    const w = Math.max(...ch.map((s) => s.length));
    const top = ROWS - ch.length;
    for (let r = 0; r < ROWS; r++) {
      const line = r >= top ? ch[r - top].padEnd(w, ' ') : ' '.repeat(w);
      grid[r].push(...line);
    }
  }
  // garde exactement 3 étoiles (les autres deviennent des bières) — sauf boss
  let stars = 0;
  for (let c = 0; c < grid[0].length; c++) for (let r = 0; r < ROWS; r++) {
    if (grid[r][c] === '*') { stars++; if (stars > 3 || isBoss) grid[r][c] = 'o'; }
  }
  return { id, world, isBoss, grid, width: grid[0].length, stars: Math.min(3, stars) };
}
