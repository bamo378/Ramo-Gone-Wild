// =====================================================================
//  RAMO GONE WILD — configuration (niveaux, objets, messages)
//  Pour ajouter un niveau : ajouter une entrée dans LEVELS.
// =====================================================================

export const GAME = {
  lanes: 3,
  startSpeed: 20,      // unités de profondeur / seconde
  maxSpeed: 46,
  speedRamp: 0.32,     // gain de vitesse par seconde
  lives: 3,
  hitInvuln: 1.6,      // secondes d'invulnérabilité après un choc
  spawnFar: 95,        // profondeur d'apparition
  metersPerUnit: 0.5,
};

// Objets à ramasser
export const PICKUPS = {
  beer:   { points: 10,  label: '+10' },
  big:    { points: 50,  label: '+50' },
  golden: { points: 100, label: '+100', effect: 'invincible', duration: 5 },
  chope:  { points: 0,   label: 'x2 !', effect: 'double', duration: 8 },
  // --- mode After Dark ---
  heat:   { points: 30,  label: 'COUP DE CHAUD', effect: 'heat', duration: 5, adult: true },
  charm:  { points: 250, label: 'CHARME !', effect: 'charm', adult: true },
  crazy:  { points: 150, label: 'NUIT DE FOLIE', effect: 'crazy', duration: 6, adult: true },
  love:   { points: 500, label: 'LOVE ROOM', effect: 'loveroom', adult: true },
};

// Obstacles : jump = sauter par-dessus, slide = glisser dessous, block = changer de voie
export const OBSTACLES = {
  barrel:  { need: 'jump',  w: 0.62 },
  crate:   { need: 'jump',  w: 0.66 },
  barrier: { need: 'slide', w: 0.95 },
  cow:     { need: 'block', w: 0.9 },
  cart:    { need: 'block', w: 0.9 },
};

export const LEVELS = [
  {
    id: 'bulle',
    name: 'MISSION APÉRO — BULLE',
    shops: ['Café du Castor', 'Fromagerie du Gruyère', 'Bar La Mousse', 'Boulangerie Bricelet',
            'Chez Ramo', 'Crèmerie Double', 'Taverne des Armaillis', 'Cave à Bière'],
    adultShops: ['Club 69', 'Le Castor Rose', 'Bar à Câlins', 'Love Hôtel Moléson',
                 'Cabaret Fondu', 'Le Petit Coquin', 'Néon Gruyère', 'After Chalet'],
  },
];

export const MSG_START = [
  'Le castor est lâché dans Bulle !',
  'Mission apéro : GO !',
  'Bulle n\'était pas prête pour ça !',
];
export const MSG_CLASSIC = [
  'Ramo a encore soif !',
  'Une petite dernière ?',
  'Attention, tournée générale !',
  'Ramo ne connaît pas la modération !',
  'Même les tonneaux ont peur de lui !',
  'Santé la Gruyère !',
  'Le castor carbure à la mousse !',
  'Les armaillis sont jaloux !',
  'Encore une pour la route !',
  'Ramo, roi de la Grand-Rue !',
];
export const MSG_HIT = [
  'Aïe, le tonneau !',
  'Ramo a raté une marche…',
  'Il a vu double !',
  'Splash ! Pas la bière !',
  'Mauvais virage, castor !',
  'La vache était là avant !',
];
export const MSG_ADULT = [
  'Le castor a la queue qui frétille !',
  'Attention, ça chauffe sous la fourrure !',
  'Ramo est chaud ce soir !',
  'Une blonde, trois bières et plus aucun contrôle !',
  'La soirée ne fait que commencer !',
  'Le castor ne dort pas seul ce soir !',
  'Il ronge plus que du bois, ce soir…',
  'Barrage ouvert, mesdames !',
  'Ramo sort le grand jeu… et la grande queue !',
  'Plus poilu que jamais, plus charmeur que jamais !',
  'Ce castor-là construit des barrages… et des souvenirs !',
];
export const MSG_LOVE_OUT = [
  'Il est entré seul… il est ressorti décoiffé !',
  'Ramo a encore conclu !',
  'Le rideau en tremble encore…',
  'On dira que c\'était une partie de jass.',
];
export const MSG_BLONDE = [
  'Salut beau castor 😘',
  'T\'as de belles dents, toi…',
  'Tu me paies un verre ?',
  'Joli barrage…',
  'On se voit après le bar ?',
];
export const MSG_GAMEOVER = [
  'Ramo cuve sur la place du Marché…',
  'Le castor a fini sous la table.',
  'Fin de tournée !',
  'Il retentera après une bonne fondue.',
];
export const MSG_GAMEOVER_ADULT = [
  'Le castor est épuisé… mais heureux.',
  'Trop de câlins, plus de jambes !',
  'Rideau ! Ramo doit récupérer.',
];

export const SHARE_TEXT = '🦫🍺 RAMO GONE WILD ! Le castor est lâché dans Bulle ! Tu crois pouvoir battre mon score ?';
