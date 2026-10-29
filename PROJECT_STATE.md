# PROJECT_STATE (maj 2026-10-29)
## Architecture
- `theme/` : thème OS2 (layout, 12 sections, templates JSON, snippets, assets `bg-*`). Theme Check : 0 erreur.
- `preview/` : index / collection (filtres+tri) / product (variantes) / 404, panier démo (adaptateur local, même API que l'Ajax Cart Shopify).
- Tringle : `theme/assets/bg-rail.js` — Canvas 2D + Verlet (chaînes, pendentif, voisins qui se repoussent, drag/inertie/rebond, clavier, reduced-motion, fallback sans canvas). `bg-shapes.js` = silhouettes DÉMO ; `item.image` (PNG détouré) les remplace.
- Three.js/GSAP non utilisés : non justifiés (Canvas suffit, 0 dépendance).
## Fait
Fondation, hero+tringle, panier tiroir (qty, retrait, progression 120 €), fiche + variantes (id/prix/SKU/stock/image), collection filtrée, 404, SEO/OG de base, docs.
## Tests
`npm test` : 31/31 (5 viewports sans débordement/erreur console, drag+inertie+balancement, clavier, panier, variantes, filtres, tri, reduced-motion, fallback canvas). Theme Check 0 erreur.
## Bloqué / dépendances
- breslevgang.com injoignable depuis le sandbox (403 proxy) : AUCUN asset réel (photos, logo, police) récupéré. Noms de produits = brief ; handles/prix = fictifs.
- Pas d'accès Shopify. Skills (taste, impeccable, GSAP…) : installation non effectuée (réseau) ; Claude Motion non utilisé (pas d'intégration confirmée).
- Offre 5 %/60 min : conception seulement (docs/OFFER_5PCT.md), désactivée.
## Prochain lot
Assets samedi (photos détourées, logo, polices) → `item.image`, @font-face ; histoire/FAQ/contact/légal ; recherche prédictive ; hreflang/RTL ; Lighthouse ; thème de dev non publié.
