"""Génère theme/templates/index.json (valeurs par défaut de l'accueil) à partir du relevé public officiel
(.cache/official, produit par `node tools/preview/build.js --fetch`) et des réglages des détourages (tools/pieces_rig.json).

Règles (brief du 31/10/2026) :
- galerie flottante : les pièces détourées, articulation chaîne/pendentif mesurée par tools/piece_rig.py ;
- six familles principales, quatre références distinctes chacune (moins si la famille en compte moins, jamais de clone) ;
- familles annexes réellement présentes sur la boutique : diamants, kids, pochette, déco, kippot, box et carte cadeau.
Usage : python3 tools/build_index_template.py"""
import json, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
O = os.path.join(R, '.cache/official')
P = json.load(open(os.path.join(O, 'products.json')))
P = P['products'] if isinstance(P, dict) else P
BY = {p['handle']: p for p in P}


def available(h):
    p = BY.get(h)
    return bool(p) and any(v.get('available') for v in p['variants'])


def col(h):
    return [x for x in json.load(open(os.path.join(O, 'collections', h + '.json'))) if available(x)]


def pick(handles, fallback):
    """Références demandées si elles sont disponibles, complétées dans l'ordre officiel sans doublon."""
    out = [h for h in handles if available(h)]
    for h in fallback:
        if len(out) >= 4:
            break
        if h not in out:
            out.append(h)
    return out[:4]


FLAME = "La flamme est le symbole emblématique de la maison. Elle exprime ses croyances essentielles, transmises par les paroles du Rabbi Nahman : « Mon feu brûlera jusqu'à la venue du Messie »."
FLAME_SRC = "Descriptions des colliers Flamme, breslevgang.com"
PETEK = "Le Petek renvoie à la lettre reçue en 1922 par Rabbi Israël Ber Odesser, que le récit attribue à Rabbi Nahman, et qui porte la formule « Na Na'h Na'hma Nahman Méouman »."
PETEK_SRC = "« L'histoire du Petek », journal de breslevgang.com"
MAGUEN = "https-breslevgang-com-collections-colliers-maguen-david-e2-9c-a1-ef-b8-8f"
FLAMMES = "colliers-flamme-aesh-cheli-🔥"
CHAIN_TYPE = '/collections/types?q=Petek%20%C3%A0%20chaine'
chain_type = [p['handle'] for p in P if p.get('product_type') == 'Petek à chaine' and available(p['handle'])]

groups = [  # titre, collection, lien libre, références choisies (distinctes : matière, motif ou symbole différents)
    ("Peteks perles", "petek-perles", "", ["petek-full-black-breslev-necklace-jewish", "petek-black-maguen", "petek-blue-tiger", "petek-grey-autruche-1"], col("petek-perles")),
    ("Peteks chaîne", "", CHAIN_TYPE, ["petek-hot-black-croco-necklace-jewish", "petek-breslev-grained-black-necklace-jewish", "petek-breslev-sunset-leopard-safari-necklace-jewish", "petek-breslev-carbon-python-necklace-jewish"], chain_type),
    ("Peteks cordon et cuir", "petek-waxed-edition-cordon", "", ["petek-cordon-chaine-fleur-de-lys", "petek-cordon-chain-tube", "petek-black-grain-leather", "petek-shark-marble"], col("petek-waxed-edition-cordon")),
    ("Colliers et pendentifs", "colliers-pendentifs", "", ["jewel-breslev-necklace-fire-jewish", "collier-mezouza", "double-triangle-maguen-couleur-argent", "jewel-necklace-breslev-hay"], col("colliers-pendentifs")),
    ("Bracelets", "", "/search?q=bracelet&type=product", ["bracelet-cordon-black", "flame-duo-bracelet-collier-black-silver", "bracelet-maguen", "bracelet-hay"], col("bracelet-summer-25") + col("bracelet-icone")),
    ("Vêtements", "hoodies", "", ["pull-modele-classic", "sweat-modele-classic", "tshirt-modele-classic", "t-shirt-manche-longue-logo-na-nah"], col("hoodies")),
]
group_blocks = {}
for i, (t, h, link, want, fb) in enumerate(groups):
    lst = pick(want, fb)
    group_blocks[f'group_{i+1}'] = {"type": "group", "settings": {"title": t, "collection": h, "link": link, "link_label": "Voir toute la collection", "products": lst, "count": 4}}

others = [  # titre, collection, lien libre, libellé, texte court (repris des noms officiels)
    ("Gamme diamants", "bracelet-de-main-flamme", "", "", "Bracelets et pendentifs de la gamme diamants."),
    ("Peteks Kids et bébé", "petek-kids", "", "", "Peteks Kids, broches bébé et Peteks femme enceinte."),
    ("Pochette en cuir", "", "/products/pochette-d-ete-2k26", "Voir la pochette", "La pochette en cuir de la maison."),
    ("Déco et Chabat", "objets-deco", "", "", "Objets de décoration et pièces pour Chabat."),
    ("Kippot", "kippot", "", "", ""),
    ("Box et carte cadeau", "box-hanouka", "", "", "Box Breslev Gang et carte cadeau."),
]
show_blocks = {}
for i, (t, h, link, lab, txt) in enumerate(others):
    if h:
        prods = col(h)[:4]
    else:
        prods = [link.rsplit('/', 1)[-1]]
    if t.startswith('Box'):
        prods = (prods + ['carte-cadeau-breslev-gang'])[:4]
    show_blocks[f'u_{i+1}'] = {"type": "collection", "settings": {"collection": h, "title": t, "text": txt, "products": prods, "link": link, "link_label": lab}}

rig = json.load(open(os.path.join(R, 'tools/pieces_rig.json')))
pieces = [  # handle, famille affichée, collection liée
    ("necklace-chrome-fire-26", "Flamme · Aech Cheli", FLAMMES),
    ("necklace-maguen-chrome", "Maguen David", MAGUEN),
    ("mezouza-pearl-black", "Mezouza Maguen à perles", "colliers-mezouza-maguen-a-perles"),
    ("necklace-fire-2-0", "Flamme · Aech Cheli", FLAMMES),
    ("petek-croco-black-x-hay-new-season-26", "Petek · Haï", "capsule-croco-leather-🐊"),
]
float_blocks, float_order = {}, []
for i, (h, fam, c) in enumerate(pieces):
    m = rig[h]
    k = f'piece_{i+1}'; float_order.append(k)
    float_blocks[k] = {"type": "piece", "settings": {
        "product": h, "collection": c, "family": fam, "cutout_asset": f"piece-{h}.webp", "split": True,
        "cutout_w": m['w'], "cutout_h": m['h'], "bail_x": m['bail_x'], "bail_y": m['bail_y'], "pend_l": m['pend_l'], "pend_r": m['pend_r'],
        "focus_x": m['focus_x'], "focus_y": m['focus_y'], "articulation": int(round(m.get('art', 1) * 100)), "detail_pos": f"{m['focus_x']}% {m['focus_y']}%"}}

people_order = ['9799', '9800', '9801', '9802', '9803', '9804', '9806', '9807', '9808', '9809', '9794', '9796', '9793']
people = {f'p_{n}': {"type": "person", "settings": {"asset": f"portrait-{n}", "name": ""}} for n in people_order}

index = {
  "sections": {
    "hero": {"type": "hero-video", "settings": {"video_url": "https://cdn.shopify.com/videos/c/o/v/cf1608d983f8495fa50cb0a5a7968a63.mov", "title": "Du caractère.\nÀ porter.", "text": "Colliers et Peteks signés Breslev Gang.", "button_label": "Explorer les colliers", "button_link": "#colliers"}},
    "float": {"type": "jewel-float", "blocks": float_blocks, "block_order": float_order, "settings": {"anchor": "colliers", "label": "Colliers & Peteks", "heading": "Choisissez votre pièce", "hint": "Glissez ou utilisez les flèches", "cta_label": "Voir la pièce", "drift": True, "sway": 100, "zoom": 210, "track": 420, "all_label": "Voir tous les colliers", "all_link": "/collections/colliers-pendentifs"}},
    "groups": {"type": "product-groups", "blocks": group_blocks, "block_order": list(group_blocks), "settings": {"heading": "Les familles Breslev Gang"}},
    "others": {"type": "collections-showcase", "blocks": show_blocks, "block_order": list(show_blocks), "settings": {"label": "Aussi chez Breslev Gang", "heading": "Les autres univers"}},
    "people": {"type": "personalities", "blocks": people, "block_order": list(people), "settings": {"layout": "gallery", "label": "Personnalités", "heading": "Breslev Gang, à leur manière", "page_link": "/pages/personnalites"}},
    "meaning": {"type": "jewel-meaning", "settings": {"label": "Le sens des bijoux", "heading": "Chaque détail a un sens", "text": "Ce que la maison dit de ses symboles, sources à l'appui.", "link_label": "Lire le sens des bijoux", "link": "/pages/le-sens-des-bijoux"},
        "blocks": {
            "m1": {"type": "meaning", "settings": {"title": "La flamme", "text": FLAME, "source_label": FLAME_SRC, "source_url": "https://breslevgang.com/collections/colliers-flamme-aesh-cheli-🔥", "link_label": "Voir les colliers Flamme", "link_url": "/collections/" + FLAMMES}},
            "m2": {"type": "meaning", "settings": {"title": "Le Petek", "text": PETEK, "source_label": PETEK_SRC, "source_url": "https://breslevgang.com/blogs/news/lhistoire-du-petek", "link_label": "Voir les Peteks", "link_url": "/collections/petek-perles"}},
            "m3": {"type": "meaning", "settings": {"title": "Breslev", "text": "Rabbi Na'hman de Breslev, né en 1772, est présenté par la maison comme le fondateur de la dynastie hassidique de Breslev.", "source_label": "« Breslev, c'est quoi ? », journal de breslevgang.com", "source_url": "https://breslevgang.com/blogs/news/breslev-cest-quoi", "link_label": "", "link_url": ""}}},
        "block_order": ["m1", "m2", "m3"]},
    "info": {"type": "purchase-info", "settings": {"heading": "Informations d'achat", "show_shipping": True},
        "blocks": {
            "f1": {"type": "fact", "settings": {"title": "Livraison offerte dès 120 €", "text": "D'après le bandeau de la boutique pour la France. En dessous, frais calculés au paiement."}},
            "f2": {"type": "fact", "settings": {"title": "Échange sous 14 jours", "text": "Pour les colliers, à compter de la réception. Sweats et hoodies, faits à la commande, ne sont ni échangés ni remboursés."}},
            "f3": {"type": "fact", "settings": {"title": "Une question ?", "text": "WhatsApp +33 7 80 95 18 36 ou formulaire de la page contact."}}},
        "block_order": ["f1", "f2", "f3"]}
  },
  "order": ["hero", "float", "groups", "others", "people", "meaning", "info"]
}
json.dump(index, open(os.path.join(R, 'theme/templates/index.json'), 'w'), ensure_ascii=False, indent=2)
print('familles', [(b['settings']['title'], len(b['settings']['products'])) for b in group_blocks.values()])
print('univers', [(b['settings']['title'], len(b['settings']['products'])) for b in show_blocks.values()], '| pièces', len(float_order))
