"""Génère preview/data.js depuis le snapshot public (lecture seule). Données réelles publiques, panier fictif."""
import json, re, csv
from collections import defaultdict
P = {p['handle']: p for p in json.load(open('docs/research/catalog-public-snapshot.json'))}
groups = defaultdict(list)
for r in csv.DictReader(open('docs/catalog-mapping-proposal.csv')):
    if r['statut'] == 'candidat': groups[r['master_model_key']].append(r['source_handle'])
member = {h: k for k, hs in groups.items() for h in hs}
TAX = json.load(open('docs/research/taxonomy.json', encoding='utf-8'))
SEG = {'Colliers': 'Collier', 'Peteks': 'Petek', 'Vêtements': 'Vetement'}
def kind(p):
    t = TAX[str(p['id'])]
    if t['segment'] in SEG: return SEG[t['segment']]
    return 'Bijou' if t['famille'] == 'BIJOUX & ACCESSOIRES' else 'Autre'
def fam(p): return TAX[str(p['id'])]['sous_famille']
def label(p, key):
    """Libellé de variante = mots du titre absents de la clé du modèle (souvent la couleur)."""
    words = [w for w in re.split(r'[\s’\']+', p['title']) if w and w.lower() not in key.split()]
    return ' '.join(words).strip() or 'Standard'
def out(p):
    v = p['variants'][0]; k = member.get(p['handle']); t = TAX[str(p['id'])]
    prices = [round(float(x['price']) * 100) for x in p['variants']]
    o = {'h': p['handle'], 't': p['title'], 'k': kind(p), 's': t['segment'], 'f': fam(p), 'p': min(prices), 'c': round(float(v['compare']) * 100) if v.get('compare') else 0,
         'a': any(x['available'] for x in p['variants']), 'vid': v['id'], 'sku': v['sku'] or '',
         'img': [i.split('?')[0] + '?v=' + i.split('v=')[-1] if 'v=' in i else i for i in p['images'][:3]],
         'g': k, 'gl': label(p, k) if k else ''}
    if max(prices) != min(prices): o['pmax'] = max(prices)
    if len(p['variants']) > 1:  # structures de variantes existantes (vêtements, carte cadeau) : options natives, jamais de produit cartésien
        o['on'] = p['options']
        o['v'] = [{'id': x['id'], 'o': [s.strip() for s in x['title'].split(' / ')], 'p': round(float(x['price']) * 100), 'a': x['available']} for x in p['variants']]
    return o
keep = list(P.values())
BEST = ['petek-grey-x-aech-cheli-new-season-25', 'petek-pink-python-x-aech-cheli-new-season-26', 'petek-blue-croco-x-aech-cheli-new-season-26',
        'petek-croco-grey-x-aech-cheli-new-season-26', 'petek-black-python-x-aech-cheli-new-season-25', 'petek-croco-black-x-hay-new-season-26',
        'petek-green-silver', 'petek-deluxe-green', 'necklace-maguen-chrome', 'jewel-breslev-necklace-fire-jewish', 'necklace-fire-2-0', 'collier-mezouza']
RAIL = ['necklace-maguen-chrome', 'jewel-breslev-necklace-fire-jewish', 'necklace-chrome-fire-26', 'necklace-maguen-deluxe', 'necklace-fire-2-0', 'collier-triple-maguen', 'necklace-fire-pearl-black']
data = {'source': 'breslevgang.com — products.json public, relevé du 29/10/2026 (prix en devise de base, à confirmer)',
        'products': [out(p) for p in keep], 'best': [h for h in BEST if h in P], 'rail': [h for h in RAIL if h in P],
        'spotlight': 'necklace-maguen-deluxe', 'logo': 'https://breslevgang.com/cdn/shop/files/WhatsApp_July_24_copie.png?v=1698640604'}
open('preview/data.js', 'w').write('/* GÉNÉRÉ par tools/build_demo_data.py — ne pas éditer. */\nwindow.BG_DATA=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
from collections import Counter
print(len(data['products']), Counter(x['k'] for x in data['products']), Counter(x['f'] for x in data['products'] if x['k'] == 'Collier'))
