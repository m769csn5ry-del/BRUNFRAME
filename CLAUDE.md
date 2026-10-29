# BRESLEV GANG — directives stables (BRUNFRAME)
- Thème Shopify OS2 natif dans `theme/` (Liquid, sections, JSON templates). Pas de SPA/headless. Prévisualisation locale dans `preview/` (mêmes CSS/JS que le thème, fixtures DÉMO).
- Direction : sombre minéral, chrome, vert profond/lumineux contrôlé. Aucune dominante blanc/beige (le brief client prime sur la palette par défaut du skill DA). Un CTA dominant par vue.
- Jamais d'invention : logo/typo de marque, prix, stocks, avis, célébrités, significations religieuses, données légales. Marquer `[à fournir]` / « démo ».
- Interdit sans autorisation : publication, écriture Shopify réelle, achats, analytics non consentis. Pas de clés/secrets en JS ; `.env` ignoré.
- Animations : reduced-motion respecté, intro passable, jamais bloquante pour l'achat.
- Quota : lire seulement les fichiers concernés, pas d'agents multiples. Fin de lot : FAIT / TESTÉ / BLOQUÉ / PROCHAIN (<120 mots).
- Tests : `npm test` (Playwright, captures dans `captures/`), `npm run theme:check`.
