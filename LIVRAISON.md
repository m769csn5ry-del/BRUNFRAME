# Breslev Gang Studio — correctif « bijoux flottants » du 31/10/2026

Ce correctif remplace le manège circulaire par une galerie horizontale de bijoux flottants. Il corrige aussi les cadrages, le décor, les familles de l'accueil et les fiches produit.

- **Points de retour** : étiquette git `avant-correctif-flottant-2026-10-31`, et `avant-refonte-2026-10-31` pour la version précédente.
- **Boutique** : rien n'a été publié ni écrit (aucun produit, prix, stock, description ni métachamp modifié).

## Livrables

| Livrable | Où |
|---|---|
| Thème installable | `livrables/breslev-gang-theme-2.1.0.zip` |
| Prévisualisation | `node tools/preview/build.js --fetch` puis `python3 -m http.server 4180 --directory dist-preview`, puis http://localhost:4180 |
| Captures | `captures/correctif-2026-10-31/` :<br>• `d-` ordinateur sombre<br>• `l-` ordinateur clair<br>• `m-` téléphone sombre<br>• `n-` téléphone clair |
| Preuve vidéo (23 s) | `captures/correctif-2026-10-31/preuve-galerie-flottante.mp4` : glisser avec élan, recalage, chaîne, flèches, deux thèmes, rapprochement, détail, retour |
| Recette reproductible | `node tests/float-interactions.js <playwright>` (29 contrôles) et `node tests/correctif-captures.js <dossier> <playwright>` (captures, vidéo, `mesures.json`) |
| Fiches courtes | `content/fiches-courtes.json` (textes et sources), générées par `python3 tools/build_product_copy.py` |
| Références à compléter | `docs/fiches-a-completer.csv` |
| Registre des informations retenues | `docs/research/registre-informations.md` |
| Skill motion-design (LottieFiles) | `.claude/skills/motion-design/` (installé par `npx skills add`) |

**Installer** : Boutique en ligne → Thèmes → Ajouter un thème → Importer un fichier ZIP. Le thème arrive non publié.

## Réalisé et testé

Tests faits sous Chromium, en 1440 × 900 et 390 × 844, dans les deux thèmes.

### Galerie flottante (`sections/jewel-float.liquid`, `assets/brg-float.js`)

- **Disposition** : pièces alignées latéralement, avec une profondeur mesurée.
  - Aucune ellipse, rotation automatique, tringle, crochet ni socle.
  - Sur ordinateur, la pièce centrale domine et ses voisines sont espacées. Sur téléphone, une pièce principale et l'aperçu des suivantes.
- **Glisser** :
  - suit le doigt ou la souris sans retard ;
  - l'élan du relâchement est limité à deux pièces ;
  - le recalage se fait sans rebond, en 0,3 à 0,5 s, comme dans la vidéo de référence ;
  - résistance douce aux extrémités.
- **Autres commandes** : flèches, points, clavier (← → Début Fin), tactile et molette horizontale.
  - Un relâchement après glisser n'ouvre jamais de fiche.
  - Un clic sur une voisine la sélectionne.
- **Chaîne articulée** : les détourages officiels sont séparés en chaîne et pendentif (`tools/piece_rig.py`), et la chaîne pivote légèrement autour de l'anneau.
  - Aucun étirement, et le pendentif ne se détache jamais.
  - Chaque pièce a sa propre fréquence (pas d'oscillation synchronisée).
  - Dérive lente de quelques pixels, et balancement amorti en environ une seconde.
  - L'impulsion au changement de pièce est plafonnée.
- **Séquence au défilement** : isolement, rapprochement (échelle uniforme, la chaîne garde ses proportions), photos officielles de la même pièce avec un texte court, recul, retour à la galerie.
  - Au retour, la même pièce est retrouvée.
  - Le bouton « Voir la pièce » reste accessible à chaque phase.
- **Studio** :
  - cyclorama, deux boîtes à lumière en parallaxe inverse, niche architecturale ;
  - un reflet parcourt la niche à chaque sélection ;
  - faisceau qui se resserre sur la pièce isolée ;
  - ombres au sol qui varient avec le flottement.
- **Contrôles automatisés : 29 sur 29**.
  - Photo, nom, prix et lien restent synchronisés après chaque geste.
  - Le changement de thème garde la sélection et ne crée qu'une seule instance.
  - Un balayage vertical au tactile fait défiler la page sans changer de pièce.
- **Fluidité mesurée** : 16,7 ms par image en médiane et 16,8 ms au 95e centile (60 images/s), pendant le glisser et pendant le défilement de la séquence, sur les quatre configurations.
  - Le mode allégé s'active si l'appareil peine (images de plus de 34 ms).
  - En mouvement réduit, la galerie tient sur un écran, sans séquence.

### Le reste du site

- **Cadrages** : sur les cartes, fiches, variantes, compositions, collections, panier et portraits, les photos sont entières (`contain`).
  - Les marges sont comblées par la photo elle-même, très floue.
  - Il n'y a plus d'agrandissement au survol.
  - **Recadrages mesurés : 0** sur toutes les pages contrôlées.
  - Changer de variante place son média en grande vue.
  - Le zoom haute définition est volontaire, se déplace au glisser et se réinitialise.
- **Familles de l'accueil** : six familles de quatre références distinctes, chacune avec un lien « Voir toute la collection ».
  - Peteks perles ;
  - Peteks chaîne (type de produit Shopify « Petek à chaine ») ;
  - Peteks cordon et cuir ;
  - Colliers et pendentifs ;
  - Bracelets ;
  - Vêtements.
- **Autres univers** : Gamme diamants, Peteks Kids et bébé, Pochette en cuir, Déco et Chabat, Kippot, Box et carte cadeau.
  - Le nombre réel de pièces est affiché, sans clone.
  - Toutes les familles sont aussi dans le tiroir du menu.
- **Fiches produit** : nom, prix, deux phrases, trois caractéristiques au plus, options et disponibilité, « Ajouter au panier ».
  - Accordéons : livraison et retours, sens du symbole (flamme, Petek ou Breslev, avec la source), description propre à la pièce.
  - Les textes génériques recopiés sur 135 fiches ne sont plus affichés.
  - 49 fiches sont rédigées à partir des photos, titres et descriptions officiels ; pour les autres, le thème n'affiche que des données vérifiables.
- **Livraison** : réglage central dans Paramètres du thème → Livraison et retours, repris sur les fiches, dans le panier et dans les infos d'achat.
  - Libellé : « Livraison dans les huit jours suivant la conclusion du contrat », avec un lien vers les CGV.
- **Ajout au panier** : le produit ajouté correspond à la fiche, dans les quatre configurations.
- **Contrôles** :
  - Theme Check : **0 erreur, 0 avertissement** ;
  - aucune erreur JavaScript ;
  - aucun débordement horizontal à 390 px.

## Informations à confirmer

1. **Délai de livraison et pays concernés, avec Ysahar avant publication.**
   - Les CGV disent « dans les 8 jours suivant la conclusion de votre Contrat » ; elles ne détaillent ni le temps de préparation ni les pays.
   - La politique d'expédition publiée est vide.
2. **Fiches** : 537 références sur 586 n'ont qu'un texte court tiré des données vérifiables, ou aucun texte. Matière, dimensions et entretien manquent presque partout (voir `docs/fiches-a-completer.csv`).
   - Les phrases rédigées peuvent ensuite passer dans des métachamps `custom.accroche` / `custom.caracteristiques`, que le thème lit en priorité.
   - Aucun import n'a été fait.
3. Noms des 13 portraits (aucun nom affiché).
4. Sens des symboles non publiés par la boutique (Maguen David, Mezouza, 770, 555…).
5. Klarna dès 120 €.
6. Liens TikTok et Facebook (comptes introuvables).

## Blocages restants

- **GitHub** : l'envoi de la branche `claude/detourages-officiels` se fait par le site (pas d'identifiants en ligne de commande). Voir l'état en fin de session.
- **Détourages** :
  - Mezouza à perles garde quelques filaments gris visibles sur fond clair ;
  - Petek Real Croco Black est exclu (étui absent) ;
  - deux autres pièces ne sont toujours pas détourées.
  - Un PNG détouré par un professionnel les remplace sans code : bloc « Pièce », et `tools/piece_rig.py` pour l'articulation.
- **Favoris synchronisés entre appareils** : non branchés (contrat décrit dans la livraison précédente).
- **Comptes classiques** : les templates `customers/*` sont absents.
- **Navigateurs** : Safari et Firefox ne sont pas testés.
- **Vidéo d'ouverture** : le fichier HEVC actuel du site est illisible sous Firefox, qui affiche alors le poster.

## Modifier les contenus

| Contenu | Où |
|---|---|
| Pièces flottantes | Section « Galerie flottante », bloc « Pièce » : produit, détourage, chaîne et pendentif séparés, anneau, centre du rapprochement, liberté de la chaîne |
| Mouvement | Même section : flottement, balancement, amplitude du rapprochement, longueur de la séquence |
| Familles | Section « Groupes de produits », un bloc par famille : collection ou lien libre, quatre produits |
| Autres univers | Section « Univers » : collection ou lien libre, quatre produits au plus |
| Familles du menu | En-tête → « Menu des familles » (sinon, liste vérifiée) |
| Livraison et retours | Paramètres du thème → Livraison et retours |
| Fiches courtes | Métachamps `custom.accroche` / `custom.caracteristiques`, ou `content/fiches-courtes.json` puis `python3 tools/build_product_copy.py` |
