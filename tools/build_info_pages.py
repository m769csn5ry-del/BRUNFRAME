"""Génère les pages d'information de la prévisualisation (Atelier, FAQ, Livraison, Retours).
Chaque réponse reprend une source publique datée ; ce qui n'est pas publié est signalé « à fournir », jamais inventé.
Sources relevées le 30/10/2026 : breslevgang.com/policies/refund-policy, /policies/shipping-policy (vide), /pages/contact,
bandeau du site, fiches produit (Klarna, moyens de paiement), bio Instagram @breslev_gang, content/claims.json."""
import html

RELEVE = '30/10/2026'
SHOP = 'https://breslevgang.com'
WA = '+33 7 80 95 18 36'

HEAD = ('<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<meta name="theme-color" content="#111315"><meta name="robots" content="noindex,nofollow"><title>{title} — Breslev Gang · Prévisualisation</title>'
        '<meta name="description" content="{desc}"><script>document.documentElement.classList.add("js")</script><script src="../theme/assets/bg-theme.js"></script>'
        '<link rel="preconnect" href="https://cdn.shopify.com"><link rel="stylesheet" href="../theme/assets/bg-tokens.css"><link rel="stylesheet" href="../theme/assets/bg-base.css">'
        '<link rel="icon" href="https://breslevgang.com/cdn/shop/files/2.jpg?crop=center&height=32&v=1691346121&width=32"></head><body>'
        '<script src="data.js"></script><script src="media-map.js"></script><script src="../theme/assets/bg-cart.js"></script><script src="bg-preview.js"></script>'
        "<script>BG.preview.header({active!r});</script>\n<main>")
FOOT = ('</main>\n<script src="../theme/assets/bg-product.js"></script><script src="../theme/assets/bg-ui.js"></script>{extra}'
        '<script>BG.preview.footer();</script></body></html>\n')


def qa(items):
    """Liste de questions : (question, réponse HTML, source)."""
    return '<div class="bg-info">' + ''.join(
        f'<details{" open" if i == 0 else ""}><summary>{html.escape(q)}</summary><div>{a}<p class="bg-note">Source : {html.escape(src)}.</p></div></details>'
        for i, (q, a, src) in enumerate(items)) + '</div>'


def page(name, title, desc, active, body, extra=''):
    open(f'preview/{name}', 'w', encoding='utf-8').write(HEAD.format(title=html.escape(title), desc=html.escape(desc), active=active) + body + FOOT.format(extra=extra))


RETOURS = [
    ('Combien de temps pour échanger ?', '<p>14 jours à compter de la réception de la commande, sur simple demande.</p>', f'politique de retour publiée, relevé du {RELEVE}'),
    ('Quels articles peuvent être échangés ?', '<p>Les échanges sous 14 jours concernent uniquement les colliers. Les sweats et hoodies sont fabriqués à la commande : ils ne sont ni échangés ni remboursés.</p>', 'politique de retour publiée'),
    ('Comment faire ma demande ?', f'<p>Depuis la <a href="{SHOP}/pages/contact" rel="noopener">page contact</a> de la boutique : indiquez le numéro de commande, l’option « Échange » et, si besoin, la taille souhaitée. L’adresse de retour vous est communiquée par e-mail.</p>', 'politique de retour publiée'),
    ('Qui paie le retour ?', '<p>Les frais de retour sont à la charge de l’acheteur, sauf produit défectueux ou erreur de livraison de la part de la maison.</p>', 'politique de retour publiée'),
    ('Dans quel état renvoyer la pièce ?', '<p>Juste essayée, idéalement dans son emballage d’origine : l’article ne doit pas être lavé ni parfumé. Joignez la facture (ou une copie) avec la taille ou le produit souhaité.</p>', 'politique de retour publiée'),
    ('Et si ma pièce est défectueuse ?', '<p>Après accord du service après-vente, un produit jugé défectueux est remplacé dans les 15 jours par un modèle identique ; s’il n’est plus disponible, d’autres modèles vous sont proposés. Envoyez-le avec une preuve d’achat datée et un mot expliquant le problème.</p>', 'politique de retour publiée (garantie)'),
]
LIVRAISON = [
    ('La livraison est-elle offerte ?', '<p>Oui, dès 120 € d’achat sur la boutique en France. En dessous, les frais sont calculés au paiement.</p>', f'bandeau et panier de breslevgang.com, relevé du {RELEVE}'),
    ('Et hors de France ?', '<p>Les conditions varient selon le pays de livraison et s’affichent au paiement. Sur la version Canada de la boutique, la livraison est offerte dès 3 articles.</p>', f'breslevgang.com (marchés FR et EN-CA), relevé du {RELEVE}'),
    ('Quels délais et quel transporteur ?', '<p>La boutique ne publie pas encore ses délais d’expédition ni ses transporteurs. Pour une date précise, écrivez à la maison avant de commander.</p><p class="bg-note">À fournir par Breslev Gang : délais de préparation et de livraison, transporteurs, pays desservis.</p>', 'politique d’expédition publiée sans contenu'),
    ('Les sweats et hoodies ?', '<p>Ils sont fabriqués à la commande.</p>', 'politique de retour publiée'),
]
PAIEMENT = [
    ('Quels moyens de paiement ?', '<p>Carte bancaire (CB, Visa, Mastercard, American Express), Apple Pay, Google Pay, Shop Pay, PayPal, Bancontact et Klarna, selon l’affichage au paiement.</p>', f'moyens listés sur breslevgang.com, relevé du 29/10/2026'),
    ('Puis-je payer en plusieurs fois ?', '<p>Oui, avec Klarna, dès 120 € d’achat.</p>', 'mention affichée sur les fiches produit, relevé du 29/10/2026'),
]
PIECES = [
    ('Qu’est-ce qu’un Petek ?', '<p>Un étui de cuir qui renferme un véritable parchemin. La matière exacte varie selon le modèle et est indiquée par la maison.</p>', 'bio Instagram @breslev_gang, relevé du 29/10/2026'),
    ('Où sont faites les pièces ?', '<p>La maison est installée à Strasbourg. Le détail de fabrication de chaque modèle est à confirmer auprès d’elle.</p>', 'mentions légales et confirmation du commanditaire ; périmètre « fait main » à valider par modèle'),
    ('Matières, dimensions, entretien ?', '<p>Ces informations ne sont pas encore publiées pour la plupart des pièces. Écrivez à la maison pour une pièce précise.</p>', f'audit des 586 fiches publiques, relevé du 29/10/2026'),
]
CONTACT = [('Comment joindre la maison ?', f'<p>Par WhatsApp au {WA}, ou via le <a href="{SHOP}/pages/contact" rel="noopener">formulaire de contact</a> de la boutique.</p>', f'page contact de breslevgang.com, relevé du {RELEVE}')]

def section(kicker, title, items):
    return f'<section class="bg-section bg-section--tight"><div class="bg-wrap bg-prose" style="padding-block:0"><p class="bg-kicker">{kicker}</p><h2>{title}</h2>{qa(items)}</div></section>'

def head(kicker, title, lead):
    return f'<div class="bg-wrap bg-prose" style="padding-bottom:10px"><p class="bg-kicker">{kicker}</p><h1 class="bg-display">{title}</h1><p class="bg-dim">{lead}</p></div>'

page('faq.html', 'Questions fréquentes', 'Livraison, échanges, paiement et pièces Breslev Gang : réponses tirées des informations publiées par la maison.', 'FAQ',
     head('Aide', 'Questions fréquentes', 'Réponses tirées des informations publiées par la maison. Ce qui n’est pas encore publié est signalé.') +
     section('Livraison', 'Recevoir sa pièce', LIVRAISON[:3]) + section('Échanges', 'Changer d’avis', RETOURS[:4]) +
     section('Paiement', 'Payer', PAIEMENT) + section('Les pièces', 'Bien choisir', PIECES) + section('Contact', 'Une question précise ?', CONTACT))
page('livraison.html', 'Livraison', 'Livraison Breslev Gang : offerte dès 120 € en France ; frais et délais confirmés au paiement.', 'Livraison',
     head('Informations', 'Livraison', 'Offerte dès 120 € d’achat en France. Frais et conditions confirmés au paiement.') +
     section('Livraison', 'Ce qui est publié', LIVRAISON) + section('Contact', 'Une date précise ?', CONTACT))
page('retours.html', 'Échanges et retours', 'Échange sous 14 jours pour les colliers ; conditions publiées par Breslev Gang.', 'Retours',
     head('Informations', 'Échanges et retours', 'Échange sous 14 jours pour les colliers. Voici la procédure publiée par la maison.') +
     section('Échanges', 'La procédure', RETOURS) +
     f'<div class="bg-wrap bg-prose" style="padding-top:0"><a class="bg-btn" href="{SHOP}/policies/refund-policy" rel="noopener">Lire la politique complète ↗</a></div>')

ATELIER = ('<section class="bg-section bg-atelier" id="atelier" data-atelier hidden><div class="bg-wrap bg-atelier__layout">'
           '<div class="bg-atelier__head"><p class="bg-kicker">L’atelier</p><h1 class="bg-display">Du geste.<br><em>Au bijou.</em></h1>'
           '<p class="bg-dim">Maison installée à Strasbourg. Cinq séquences filmées à l’atelier, sans retouche.</p>'
           '<div class="bg-atelier__chapters" data-atelier-chapters role="group" aria-label="Séquences de l’atelier"></div>'
           '<div class="bg-atelier__progress"><button class="bg-btn bg-btn--ghost bg-btn--sm" type="button" data-atelier-toggle aria-pressed="false">Mettre en pause</button><span data-atelier-caption aria-live="polite"></span></div></div>'
           '<div class="bg-atelier__row" data-atelier-row></div></div></section>'
           '<section class="bg-section bg-section--tight"><div class="bg-wrap bg-prose" style="padding-block:0">'
           '<h2>Ce que montrent les images</h2><p class="bg-dim">Rangées de perles noires, flammes argentées et dorées, pendentifs en main, chaînes et travail à la pince : des gestes filmés tels quels, sans mise en scène.</p>'
           '<p class="bg-note">Le détail de fabrication de chaque modèle (fait main, matières, finitions) est à confirmer par la maison avant publication.</p>'
           '<div class="row" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:24px"><a class="bg-btn" href="collection.html?k=Collier">Voir les colliers</a><a class="bg-btn bg-btn--ghost" href="collection.html?k=Petek">Voir les Peteks</a></div></div></section>')
page('atelier.html', 'L’atelier', 'L’atelier Breslev Gang à Strasbourg : séquences filmées sans retouche.', 'Atelier', ATELIER,
     extra='<script src="atelier-data.js"></script><script src="../theme/assets/bg-atelier.js"></script><script>BG.initAtelier && BG.initAtelier();</script>')
print('pages : atelier, faq, livraison, retours')
