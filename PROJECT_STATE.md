# PROJECT_STATE (mis à jour le 2026-10-29, lot « Operation Rebirth »)

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
