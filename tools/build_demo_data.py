"""Génère preview/data.js depuis le snapshot public (lecture seule). Données réelles publiques, panier fictif."""
import json, re, csv
from collections import defaultdict
P = {p['handle']: p for p in json.load(open('docs/research/catalog-public-snapshot.json'))}
groups = defaultdict(list)
for r in csv.DictReader(open('docs/catalog-mapping-proposal.csv')):
    if r['statut'] == 'candidat': groups[r['master_model_key']].append(r['source_handle'])
member = {h: k for k, hs in groups.items() for h in hs}
FAM = [('maguen', 'Maguen David'), ('fire|flame|flamme|aech|aesh', 'Flamme'), (r'\bhay\b|h ay|haï|hai\b|chai', 'Hay'), ('israel|israël', 'Israël'),
       ('love', 'Love'), ('mezouza', 'Mezouza'), ('padlock|cadenas', 'Cadenas'), ('rabbi|770|tsadik|moise|moshe|guematria|nah man', 'Tsadikim'), ('smile|smiley', 'Smiley')]
def fam(t):
    t = t.lower()
    for rx, n in FAM:
        if re.search(rx, t): return n
    return 'Autres'
def kind(p):
    t = p['title'].lower()
    if t.startswith('petek'): return 'Petek'
    if t.startswith(('necklace', 'collier', 'jewel', 'double triangle')) or 'necklace' in t: return 'Collier'
    if t.startswith('bracelet'): return 'Bracelet'
    return 'Autre'
def label(p, key):
    """Libellé de variante = mots du titre absents de la clé du modèle (souvent la couleur)."""
    words = [w for w in re.split(r'[\s’\']+', p['title']) if w and w.lower() not in key.split()]
    return ' '.join(words).strip() or 'Standard'
def out(p):
    v = p['variants'][0]; k = member.get(p['handle'])
    return {'h': p['handle'], 't': p['title'], 'k': kind(p), 'f': fam(p['title']), 'p': round(float(v['price']) * 100),
            'c': round(float(v['compare']) * 100) if v.get('compare') else 0, 'a': v['available'], 'vid': v['id'], 'sku': v['sku'] or '',
            'img': [i.split('?')[0] + '?v=' + i.split('v=')[-1] if 'v=' in i else i for i in p['images'][:3]],
            'g': k, 'gl': label(p, k) if k else ''}
keep = [p for p in P.values() if kind(p) in ('Collier', 'Petek')]
BEST = ['petek-grey-x-aech-cheli-new-season-25', 'petek-pink-python-x-aech-cheli-new-season-26', 'petek-blue-croco-x-aech-cheli-new-season-26',
        'petek-croco-grey-x-aech-cheli-new-season-26', 'petek-black-python-x-aech-cheli-new-season-25', 'petek-croco-black-x-hay-new-season-26',
        'petek-green-silver', 'petek-deluxe-green', 'necklace-maguen-chrome', 'jewel-breslev-necklace-fire-jewish', 'necklace-fire-2-0', 'collier-mezouza']
RAIL = ['necklace-maguen-chrome', 'jewel-breslev-necklace-fire-jewish', 'necklace-chrome-fire-26', 'necklace-maguen-deluxe', 'necklace-fire-2-0', 'collier-triple-maguen', 'necklace-fire-pearl-black']
data = {'source': 'breslevgang.com — products.json public, relevé du 29/10/2026 (prix en devise de base, à confirmer)',
        'products': [out(p) for p in keep if p['images']], 'best': [h for h in BEST if h in P], 'rail': [h for h in RAIL if h in P],
        'spotlight': 'necklace-maguen-deluxe', 'logo': 'https://breslevgang.com/cdn/shop/files/WhatsApp_July_24_copie.png?v=1698640604'}
open('preview/data.js', 'w').write('/* GÉNÉRÉ par tools/build_demo_data.py — ne pas éditer. */\nwindow.BG_DATA=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
from collections import Counter
print(len(data['products']), Counter(x['k'] for x in data['products']), Counter(x['f'] for x in data['products'] if x['k'] == 'Collier'))
