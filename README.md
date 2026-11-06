# 🦫🍺 RAMO GONE WILD

« Un castor, des bières et zéro limite ! » — runner 2.5D pour smartphone, dans les rues de Bulle (Gruyère).

## Jouer
Ouvrir le lien Netlify sur un téléphone, en portrait. Glisser ← → pour changer de voie, ↑ pour sauter, ↓ pour glisser.
Sur ordinateur : flèches du clavier (P / Échap = pause).

## Structure
- `index.html`, `style.css` — écrans et interface
- `src/main.js` — menus, commandes, partage, accès secret
- `src/game.js` — moteur du jeu (génération, collisions, bonus, Love Room)
- `src/draw.js` — tous les dessins (Bulle, obstacles, Ramo, personnages)
- `src/config.js` — niveaux, bonus, messages (ajouter un niveau = une entrée dans `LEVELS`)
- `src/audio.js` — sons et musique synthétisés (aucun fichier audio)
- `src/storage.js` — records locaux + préparation du classement en ligne (Supabase + Netlify Functions)
- `assets/` — images de Ramo

Site statique : aucune compilation nécessaire, Netlify publie le dossier tel quel.
