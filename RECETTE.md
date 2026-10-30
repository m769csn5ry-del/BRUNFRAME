# Recette BRESLEV GANG — 30/10/2026

Branche `claude/detourages-officiels`, locale (non poussée, rien de publié ni d'écrit dans Shopify).

## Lancer la prévisualisation

```bash
python3 -m http.server 4174 --directory brunframe
```

Puis ouvrir http://localhost:4174/preview/index.html.

Pour le thème Shopify, la section « Studio d'accueil » (`theme/sections/hero-studio.liquid`) est branchée sur `templates/index.json`.

## Ce qui a été vérifié

| Contrôle | Périmètre | Résultat |
|---|---|---|
| Débordement horizontal | 11 routes × 5 largeurs (360, 390, 430, 768, 1440) | Conforme après correctif : la grille de cartes débordait de 4 à 13 px à 360 px |
| Un seul `h1` par page, images avec `alt`, boutons et liens nommés | 55 combinaisons | Conforme |
| Erreurs JavaScript | 55 combinaisons + 10 captures Playwright | Aucune |
| Hauteur de l'accueil | 1440×900 : 5,07 écrans · 390×844 : 5,29 · 360 : 5,56 · 430 : 4,99 · 768 : 5,83 | Dans la cible (≈ 5 en bureau, ≤ 6 en mobile) |
| Mouvement réduit | Accueil, 390 px | Affiche statique, flèches et points changent la pièce, lien et annonce à jour (après correctif) |
| Sans WebGL | Accueil, 390 et 430 px | Idem (après correctif : les commandes ne réagissaient pas) |
| Geste sur la galerie | 1440 px | Seuil 8 px, aucun glissé n'ouvre une fiche, annonce à l'arrêt |
| Fiche produit | Petek Croco 1/1 (17 coloris), Mezouza Maguen à Perles (15), Jogging (Couleur × Taille) | Nom du modèle, présélection par `?h=` et `?variant=`, panier démo avec l'id de variante réel |
| Theme Check | thème complet | Seules les 2 alertes préexistantes : script bloquant voulu, extrait `intro` orphelin |

## Avant / après

Captures dans `captures/recette-2026-10-30/` :

- **Avant**, boutique actuelle : `avant-accueil-1440`, `avant-accueil-390`, `avant-fiche-1440`.
- **Après**, prévisualisation en thème sombre :
  - accueil : `apres-accueil-1440`, `apres-accueil-390`, `apres-accueil-detail-1440`, `apres-accueil-sans-webgl-430` ;
  - collection : `apres-collection-360`, `apres-collection-1440` ;
  - fiche produit : `apres-fiche-1440`, `apres-fiche-390` ;
  - autres pages : `apres-faq-768`, `apres-atelier-1440`.

## Catalogue

- 586 fiches et 929 variantes sont toutes couvertes, une seule fois chacune, sans variante inventée, dans 506 modèles :
  - 433 pièces individuelles ;
  - 21 regroupements proposés ;
  - 17 produits à options natives ;
  - 35 pièces à ne pas fusionner.
- Par segment : Peteks 252, Colliers 162, Bracelets 46, Maison & objets 17, Vêtements 16, Kippot 7, autres 6.
- État des fiches : 505 à compléter, 1 bloquée (carte cadeau, sans image publique).
- Manques, détaillés modèle par modèle dans `audit/manques-par-modele.csv` :
  - dimensions non documentées : 501 modèles ;
  - matière exacte non documentée : 496 ;
  - aucune description publiée : 332 (174 modèles en ont une) ;
  - classification à confirmer : 45.

## À valider par la maison

Liste consolidée : `audit/validations-ysahar.md`. Points principaux :

- les 21 regroupements proposés ;
- les délais, transporteurs et pays de livraison (la politique d'expédition publiée est vide) ;
- le traitement des remboursements ;
- les modèles concernés par « fait main à Strasbourg » ;
- la matière des Peteks par modèle.

## Thème sombre par défaut (décidé le 30/10/2026)

Le site s'ouvre en sombre, même si l'appareil est réglé en clair. La bascule clair/sombre reste disponible, et le choix du visiteur est conservé d'une page à l'autre.

Vérifié avec un navigateur réglé en clair : ouverture en sombre, bascule vers le clair, choix conservé après navigation. Capture : `apres-accueil-1440-systeme-clair`.
