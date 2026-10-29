# Offre −5 % pendant 60 min (NON ACTIVÉE)
Constat : Shopify ne propose pas nativement de réduction expirant 60 min après le 1er ajout au panier par session. Un compteur en localStorage serait contournable et trompeur → interdit.
Options à valider avec Ysahar : (a) code −5 % à durée fixe de campagne (natif, gratuit) ; (b) Shopify Function « discount » + attribut de panier horodaté côté serveur (nécessite app personnalisée, sans abonnement, déploiement admin) ; (c) ne pas faire.
Règles à fixer : cumul avec livraison offerte et Klarna, éligibilité, mentions légales. Réglage `offer_5pct_enabled` = false, aucun UI n'est affiché.
