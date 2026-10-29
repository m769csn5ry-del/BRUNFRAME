# Connexion Shopify (sans publier)
1. Après accord d'Ysahar : accès collaborateur (Store → Settings → Users). Sauvegarder le thème live : `shopify theme pull --live` (dossier à part) + exports produits CSV.
2. `npm i` puis `shopify theme push --path theme --unpublished --theme "BG 2100 dev"` → URL de prévisualisation partageable. **Jamais** `--live` ni `--allow-live`.
3. Brancher : hero → ajouter blocs « Collier » (produit par sélecteur, détourage PNG optionnel) ; menus `main-menu`/`footer` ; logo/favicon/police dans Paramètres du thème ; collection « Colliers » (handle `colliers`, adapter `data-collection-url`).
4. Vérifier en back-office : seuil 120 € par marché, Stripe/Klarna, taxes, langues/Markets (ne rien remplacer). Checkout = natif Shopify (bouton `name="checkout"`).
5. Tests en mode test autorisé avant toute publication ; validation PDG.
Notes : templates client (account/login…) non fournis → Shopify utilise ses défauts (nouveaux comptes clients). Images de partage 1200×630 via réglage `share_image`. sitemap/robots : fichiers Shopify natifs, non modifiés.
