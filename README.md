# 🦫🍺 RAMO GONE WILD

« Un castor, des bières et zéro limite ! » — runner 2.5D pour smartphone, dans les rues de Bulle (Gruyère).

## Parcours
- **Super Ramo Bros** (nouveau) : jeu de plateformes, 4 mondes (Bulle, Gruyères, Moléson, Lac de la Gruyère) × 2 niveaux + 1 boss, carte des mondes, 3 étoiles par niveau, bières partout, sauvegarde et classement. Fichiers : `src/bros.js` (moteur), `src/bros-levels.js` (niveaux en caractères), `src/bros-art.js` (graphismes, boss).
- **Traverse Bulle** : saute de case en case à travers Bulle — routes, tracteurs, bus, train, la Trême (troncs, meules de gruyère), place du Marché, château. Moteur à part : `src/crossy.js`.
- **Mission apéro — Bulle** : sans fin, la Grand-Rue de Bulle.
- **La descente du Moléson** : en luge jusqu'à Gruyères (2,2 km), chrono, portes de slalom (+3 s), stations Plan-Francey et Moléson-sur-Gruyères.
Ajouter un parcours : une entrée dans `LEVELS` (`public/src/config.js`) + ses dessins.

## Jouer
Ouvrir le lien Netlify sur un téléphone, en portrait. Glisser ← → pour changer de voie, ↑ pour sauter, ↓ pour glisser.
Sur ordinateur : flèches du clavier (P / Échap = pause).

## Structure
Le site publié est dans `public/` ; le classement en ligne dans `netlify/functions/scores/`.
- `public/index.html`, `public/style.css` — écrans et interface
- `src/main.js` — menus, commandes, partage, accès secret
- `src/game.js` — moteur du jeu (génération, collisions, bonus, Love Room)
- `src/draw.js` — tous les dessins (Bulle, obstacles, Ramo, personnages)
- `src/config.js` — niveaux, bonus, messages (ajouter un niveau = une entrée dans `LEVELS`)
- `src/audio.js` — sons et musique synthétisés (aucun fichier audio)
- `src/moleson.js` — décors et obstacles de la descente du Moléson
- `src/storage.js` — records locaux + envoi/lecture du classement public
- `assets/` — images de Ramo
- `netlify/functions/log/` — rapports d'erreurs des téléphones (journaux Netlify)
- `netlify/functions/scores/` — API `/api/scores` (top 100 classique et 18+, contrôle de vraisemblance des scores, limite anti-abus), stockage Netlify Blobs

Aucune compilation : Netlify publie `public/` et déploie la fonction automatiquement à chaque push.
