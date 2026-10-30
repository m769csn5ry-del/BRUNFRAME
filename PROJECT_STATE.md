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
