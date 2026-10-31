# PROJECT_STATE (mis à jour le 2026-10-30, phase 1 du MASTER PROMPT CODEX)

## Architecture
- `theme/` : thème OS2 avec 16 sections, dont hero-rail, carrousel produits, tuiles collections, signature, histoire, pièce en lumière, communauté et réassurance. Templates JSON et snippets (intro, carte produit). Theme Check : 0 erreur, 2 avertissements Google Fonts documentés.
- `preview/` : démo statique branchée sur `preview/data.js`, généré par `tools/build_demo_data.py` à partir du catalogue public réel (586 fiches). Panier local fictif, même API que l'Ajax Cart.
- `tools/` : `merge_products_json.py` (snapshot), `group_candidates.py` (proposition « 1 modèle = 1 fiche »), `build_demo_site.sh` (dist/ noindex), `build_demo_data.py`.
- La tringle (`bg-rail.js`) tourne en Canvas 2D + Verlet. Ordre de rendu : détourage PNG > photo officielle en cadre chromé > plaque neutre. **Les silhouettes inventées ont été supprimées.** Elle comprend anneaux, tiges, ombres au sol, reflet glissant, amortissement de la pièce et un mode allégé pour les appareils modestes.
- Design system : noir minéral/graphite, chrome brossé (CTA), émeraude réservée aux reflets, Cormorant (police officielle) + Manrope.
- GSAP et Three.js ne sont pas utilisés : le Canvas et les transitions CSS suffisent, sans aucune dépendance.

## Décisions
- Accroche = adaptation de la signature officielle « Not Just Necklace it's a Protection ».
- Best-sellers affichés dans l'ordre public, avec la mention explicite que ce n'est pas un classement des ventes.
- Personnalités : le bloc ne s'affiche que si la case « droits confirmés » est cochée dans le thème.

## Tests (29/10)
- `npm test` : **32/32**. Couverture : 5 viewports, drag, inertie, balancement, clavier, panier (180 €, seuil 120 €), coloris regroupés, pièce épuisée, filtres, tri, regroupement, reduced-motion, repli sans canvas, 404.
- Lighthouse mobile local (ressources externes bloquées, donc non représentatif) : Perf 92, A11y 100, BP 96, SEO 63 (dû au `noindex` volontaire). LCP 2,2 s et CLS 0,01 en labo uniquement, pas des données réelles.
- `node tests/visual.js after` : captures avant/après dans `captures/`.

## Bloqué
- Chrome : extension non exposée dans cette session. Recherche faite via Firecrawl (voir BRAND_RESEARCH.md).
- Sandbox : cdn.shopify.com, breslevgang.com et l'upload Netlify sont refusés par la politique réseau. La démo publique exige de relier le dépôt au projet Netlify `breslev-gang-2100-demo` (une action dans le dashboard).
- Aucun détourage PNG des pendentifs n'existe : la tringle montre les photos officielles en cadre. Les détourages réels sont à fournir samedi.
- Skills taste, impeccable, GSAP, transitions et design-extract non installés. Claude Motion non intégré.
- Shopify : pas d'accès. Offre 5 % / 60 min désactivée (voir docs/OFFER_5PCT.md).

## Prochain lot
Lien Netlify, puis contrôle des vraies photos sur l'URL. Ensuite : détourages, histoire validée, polices auto-hébergées, recherche prédictive, thème de dev non publié.

## Phase 1 (30/10) — FAIT / TESTÉ
- **Catalogue complet** : la démo porte les 586 fiches (186 colliers, 286 Peteks, 69 bijoux, 16 vêtements, 29 autres) avec la taxonomie de l'audit (`docs/research/taxonomy.json`, exporté par `tools/export_taxonomy.py` depuis CATALOGUE_BRESLEV_GANG.xlsx). 929 variantes ; les 17 structures natives (16 vêtements Couleur × Taille, carte cadeau) sont des options réelles, aucune combinaison calculée.
- **Navigation** : Colliers, Peteks, Bijoux, Collections, Univers ; Vêtements et « Plus de créations » en entrées secondaires ; page `collections.html` (toutes les familles et sous-familles). Menu burger jusqu'à 1180 px (7 entrées).
- **Recherche** `search.html` sur tout le catalogue : accents/ponctuation ignorés, synonymes Hay/Haï/חי, Aech/Aesh/Flamme, Petek/Peteks ; filtres par famille ; pagination « Afficher plus ». La recherche de collection utilise le même moteur.
- **Thème clair/sombre** : préférence système au premier passage, choix conservé (`bg_theme`), appliqué avant peinture (`theme/assets/bg-theme.js`, chargé dans `<head>`). Palette sombre alignée sur le brief (#111315 / #22262A / #F2F2EF / #B7BBC0), clair #F4F4F1 / #181A1B. Le studio du hero, l'intro, les tuiles sur photo et le bandeau restent des scènes sombres dans les deux thèmes ; le logo officiel est posé sur une plaque sombre en clair.
- **Fiche produit** : sélection native Couleur × Taille / montants, prix de la variante, libellé dans le panier ; carte cadeau sans image (« Visuel à fournir », rien d'inventé) ; épuisé = bouton désactivé ; pas d'ajout rapide sans choix de variante.
- `npm test` : 32/32 (e2e) + 43/43 (`tests/phase1.js`). Captures `captures/p1-*`.

## Phase 1 — BLOQUÉ / À FAIRE
- Mobile réel non testé (captures Chromium émulé seulement). Contraste mesuré sur le texte courant uniquement, pas sur chaque composant.
- Les 24 regroupements restent « proposés » (non validés par le propriétaire) ; aucune fusion.
- Thème Liquid : le bouton de thème et la recherche dédiée sont faits côté preview ; `header.liquid` / `main-search.liquid` à aligner (menu Shopify à créer : Colliers, Peteks, Bijoux, Collections, Univers).
- Prochain lot : phase 2 (rail 3 colliers, sélection DOM, rail → fiche → panier). Phase 3 attend `REFERENCE_ANIMATION_COLLIERS.mp4` et les détourages/modèles 3D.

## Détourages (30/10, session Claude locale avec accès Chrome / CDN)
- **FAIT** : 5 détourages transparents des photos officielles (CDN public Shopify, 1200 px) dans `theme/assets/cut-<handle>.webp` : Maguen Chrome, Chrome Fire 26, Petek Croco Black X Haï, Mezouza Maguen à Perles Black, Fire 2.0. Méthode : segmentation rembg (u2net / isnet-general-use), masque limité au métal clair pour les pièces chromées, ajout des perles noires par ouverture morphologique pour le Petek, plaque hexagonale de prise de vue retirée (accessoire, pas le produit). Haut de chaîne coupé à 30 % pour garder le pendentif lisible. Métadonnées : `tools/cutouts.json` (dimensions, `fy` = hauteur du pendentif).
- Galerie et retour collectif : les 5 pièces détourées pendent sous la lampe ; zoom et poses centrés sur le pendentif (`--fy`). Repli photo fondue conservé pour toute pièce sans détourage.
- Fonds par collier passés en nuances acier / graphite (brief : interface monochrome, la couleur vient des pièces).
- Thème : bloc « Collier » → case « Utiliser le détourage fourni avec le thème » + réglage « Hauteur du pendentif ». `templates/index.json` renseigne les 5 pièces.
- Mobile : titre de galerie masqué visuellement (h1 conservé dans le DOM), il chevauchait les chaînes.
- **Écartés** : Collier Breslev Necklace Fire (photo à deux chaînes, brin droit perdu au détourage) et Petek Real Croco Black (fond croco collé à l'étui). Ils restent visibles partout ailleurs avec leur photo officielle. Rien n'est un modèle 3D : `supportsTrue360` reste faux.
- **TESTÉ** : vérification manuelle navigateur (1440 émulé desktop 800 px réel, 390 px), jalons galerie → isolation → gros plan → chapitres → grande typo → FAQ → retour collectif ; clair/sombre ; images chargées (naturalWidth > 0). Theme Check : seule l'erreur ParserBlockingScript préexistante (bg-theme.js volontairement bloquant). `npm test` **non relancé** dans cette session (exécution refusée par la politique locale) : à relancer.
- **À DÉCIDER** : la signature « It’s a protection » / « Une protection » reprend la bio officielle mais le brief demande de ne pas promettre de protection sans contenu approuvé.

## Checkpoint 30/10 (ULTIMATE MASTER BUILD, lot 1)
- Accueil compact : galerie → gros plan → chapitres (scène 250svh, `data-orbit-end=.6`), Collections (Colliers Flamme / Bracelets & bijoux / Peteks cuir & parchemin), Atelier, Best-sellers + réassurance. ≈ 6,9 écrans à 768 px (avant ≈ 13). Citation, histoire vide, pièce en lumière et communauté retirées de l'accueil (sections désactivées dans `index.json`, pas supprimées).
- Atelier : `bg-atelier.js` + section `atelier.liquid` (vidéos Shopify, muettes, lues à l'écran, bouton pause). **BLOQUÉ** : les 5 vidéos jointes sont dans un dossier temporaire Photos illisible (macOS « Operation not permitted »). À déposer dans `preview/media/atelier-1..5.mp4` + posters, puis `window.BG_ATELIER`.
- Titre de galerie : plus de débordement sur écrans peu hauts.

## 2026-10-30 soir — Studio d'accueil 3D (rendu repris de l'animation « Breslev Gang 3D »)
- FAIT : `theme/assets/bg-studio.js` + `bg-studio.css` remplacent la galerie orbitale Codex sur l'accueil (prévisualisation) et via la nouvelle section `sections/hero-studio.liquid` (templates/index.json : hero → hero-studio ; hero-orbit conservée, non supprimée).
  Relief minéral noir à grain fin + fond anthracite flou ; rail circulaire fin ; pendentifs = silhouette réelle du détourage officiel (contour + trous) extrudée avec biseau, épaisseur estimée ; chaînes vénitienne/forçat ; pièces toujours face caméra ; pas de sol croco, anneau, faisceau, mot géant, cercle « Voir », bloom, ombre de contact.
  Textures 3D : `theme/assets/n3d-*` (22 fichiers, ~600 Ko) ; pièces sans gabarit 3D → photo détourée à plat.
- TESTÉ : 1440×900 (galerie, état détail, glissé → pas de navigation, annonce), 375×812 ; console sans erreur ; Theme Check : seules les alertes préexistantes (ParserBlockingScript voulu, snippet intro orphelin). Hauteur accueil mesurée avant réduction du studio : 5,14 écrans (1440×900), 5,36 (390×844) ; studio réduit 165 → 150 svh.
- BLOQUÉ : rien. Non publié, non poussé.
- PROCHAIN : fiches produit pilotées par content/models.json (pastilles → variantes réelles, ?h= ancien handle), pages Atelier/FAQ/Livraison/Retours, recette 360/430/768.

## 2026-10-30 soir — Fiches produit pilotées par les modèles
- FAIT : `preview/product.html` + `bg-preview.js` : titre = nom du modèle (nom boutique de la variante affiché dessous), libellé d'option = optionNames du modèle, note de regroupement selon le statut (PROBABLE → « à valider par la maison »), id de variante réel dans le formulaire, présélection par ancien handle (`?h=`) et par `?variant=`.
  Description = texte original publié par la boutique pour la variante choisie (`preview/descriptions.js`, 180 textes, non réécrits, attribués) ; sinon manque signalé. `bg-product.js` émet `bg:variant` (bubbles).
  Libellés de variantes : comparaison sans accents (« à »/« À »/« a ») dans `build_catalog_models.py` ; couverture inchangée 586/929/506. Libellés internes « à préciser » plus jamais affichés (repli sur le segment).
- TESTÉ : Petek Croco 1/1 (17 coloris, PROBABLE), Mezouza Maguen à Perles (15), Jogging (options natives Couleur × Taille, `?variant=`) ; ajout panier démo → localStorage contient l'id de variante réel ; 390 px sans débordement.
- BLOQUÉ : aucune écriture Shopify : le regroupement reste une couche de présentation (prévisualisation) ; côté thème, la fiche reste celle du produit Shopify.
- PROCHAIN : pages Atelier / FAQ / Livraison / Retours / 404, recette 360/430/768, liste des manques par modèle.

## 2026-10-30 soir — Pages Atelier, FAQ, Livraison, Retours
- FAIT : `tools/build_info_pages.py` génère `preview/atelier.html`, `faq.html`, `livraison.html`, `retours.html` ; chaque réponse cite sa source publique datée (politique de retour, page contact, bandeau, fiches, bio Instagram) ; la politique d'expédition publiée étant vide, délais et transporteurs sont signalés « à fournir ». Nav « Atelier » → atelier.html ; pied de page → FAQ / Livraison / Échanges et retours / L'atelier ; réassurance de l'accueil → retours.html. 404 existante conservée.
- TESTÉ : 1440 px (FAQ, Atelier : 5 vidéos, nav active) ; 360 px sans débordement sur les 5 pages.
- BLOQUÉ : contenu des pages Shopify (admin) non modifié ; côté thème, `templates/page.json` sert ces pages quand la maison les crée.
- PROCHAIN : recette complète 360/390/430/768/1440 + mouvement réduit + sans WebGL ; liste des manques par modèle ; avant/après.

## 2026-10-30 nuit — Recette
- FAIT : recette 11 routes × 5 largeurs, mouvement réduit, sans WebGL ; captures avant/après (`captures/recette-2026-10-30/`) ; `audit/manques-par-modele.csv` ; rapport `RECETTE.md`.
- Correctifs : grille de cartes (`minmax(0,1fr)`, prix sous le titre ≤ 480 px) ; studio statique (sans WebGL / mouvement réduit) : flèches et points changent la pièce immédiatement.
- PROCHAIN : décision thème sombre par défaut ; validation Ysahar ; poussée de la branche sur accord.
- Thème : sombre par défaut quel que soit le réglage système (décision du 30/10/2026), bascule et choix conservés. Testé navigateur en clair.

## 2026-10-31 — Refonte complète « Breslev Gang Studio » (brief final)
- FAIT : thème reconstruit (visuel Codex retiré ; étiquette `avant-refonte-2026-10-31`). Palette graphite, Aileron Black (CC0), moteur d'animation unique au défilement, séquence des colliers (CSS 3D, photos officielles détourées, supports individuels, flèches, zoom au scroll, détails = photos officielles, recul, alignement, retour), vidéo officielle du hero, six collections, 24 produits, 13 portraits, sens des bijoux sourcé, fiches, panier, filtres, favoris (appareil), pages. Aperçu rendu depuis le Liquid (`tools/preview/build.js`).
- TESTÉ : Theme Check 0/0 ; `tests/refonte-captures.js` (même pièce tout au long de la séquence, groupes 4/4/4/8/2/2, ID de variante réel au panier, 0 erreur JS, 0 débordement mobile, mouvement réduit) ; rechargement de section sans accumulation.
- BLOQUÉ / À FOURNIR : noms des portraits, sens des symboles non publiés, délais de livraison, synchronisation des favoris (app + métachamp), 2 détourages, liens TikTok/Facebook morts.
- PROCHAIN : validation visuelle par Andy ; import du ZIP en thème non publié pour test connecté.

## Correctif « bijoux flottants » (31/10, 02:00–02:30) — interrompu par la limite d'usage
- FAIT : point de retour `avant-correctif-flottant-2026-10-31` ; skill `motion-design` (LottieFiles) installé dans `.claude/skills/motion-design` et lu (ressorts, follow-through 50–150 ms, flottement ±5–15 px sur 3–5 s, périodes désynchronisées).
- Vidéo v26044 (défilement) : recalage sans rebond en 0,3–0,5 s après le relâchement, voisines coupées aux bords, légère inclinaison des objets en mouvement. Vidéo snaptik : pièce choisie éclairée, autres dans l'ombre, lumière du fond qui suit le produit, rapprochement incliné, texte à côté, alignement final.
- Familles (menu officiel vérifié le 31/10) : Peteks perles → `petek-perles` ; Peteks chaîne → type produit « Petek à chaine » (40 produits, `url_for_type`) — le groupe actuel pointe à tort vers `collection-collier-petek-en-cuir` ; Peteks cordon et cuir → `collection-collier-petek-en-cuir` + `petek-waxed-edition-cordon` ; Colliers et pendentifs → `colliers-pendentifs` ; Bracelets → `bracelet-summer-25` (+ icône, flamme, double chaîne, flamme à chaîne, `bracelets`) ; Vêtements → `hoodies`. Autres : diamants `bracelet-de-main-flamme`, pochette `/products/pochette-d-ete-2k26`, déco `objets-deco`, Chabat `chabbat`, kippot `kippot`, box `box-hanouka`, carte cadeau `/products/carte-cadeau-breslev-gang`.
- Photos produit : 1re photo au format portrait (0,68–0,75) ; 447 produits sur 586 n'ont qu'une photo.
- `tools/piece_rig.py` (non appliqué, sans `--write`) : nettoyage des filaments sombres + point d'attache du pendentif. Détection correcte pour Mezouza perles, Chrome Fire 26, Fire 2.0, Petek Croco Haï (deux attaches → articulation réduite) ; échec pour Maguen Chrome (attache à régler à ~87 %) ; Petek Real Croco Black à exclure (étui absent, fond croco).
- Livraison : CGV (`/policies/terms-of-sale`, section LIVRAISON) = livraison sous huit jours à compter de la conclusion du contrat, d'après le brief ; à relire puis à confirmer avec Ysahar.
- RESTE (ordre du brief) : galerie horizontale flottante (remplace `necklace-orbit` / `brg-orbit.js`), cadrages `contain` partout, décor studio, familles 4×6, fiches courtes + réglage livraison, tests 1440/390 sombre/clair, captures, vidéo, ZIP.
- GitHub : envoi web interrompu. La branche distante contient les captures (7f3cc5f) puis la suppression de l'ancien `theme/` ; le nouveau thème et les autres dossiers ne sont pas envoyés. Une poussée normale sera refusée (deux commits web distants) : finir l'envoi web, ou `git push --force-with-lease` depuis un terminal authentifié (les deux commits distants sont remplacés par l'historique local).

## Correctif « bijoux flottants » terminé (31/10, 06:30)
- FAIT : galerie horizontale flottante (glisser, inertie bornée, flèches, clavier, tactile, chaîne articulée, séquence au défilement), cadrages entiers partout, décor studio, familles 4×6 et autres univers, fiches courtes (49 rédigées) et livraison centralisée, menu des familles.
- TESTÉ : 29/29 contrôles d'interaction ; 0 recadrage mesuré ; 60 images/s ; 0 erreur JS ; Theme Check 0/0 ; panier conforme ; captures 1440/390 sombre/clair ; vidéo de preuve.
- BLOQUÉ : envoi GitHub par le site (voir LIVRAISON.md) ; délai et pays de livraison à confirmer avec Ysahar ; fiches non documentées (docs/fiches-a-completer.csv).
