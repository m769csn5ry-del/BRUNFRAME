"""Fusionne des exports publics products.json (Firecrawl rawHtml ou JSON brut) en un snapshot compact.
Usage: python3 tools/merge_products_json.py out.json page1.txt page2.txt ...  (lecture seule, aucune écriture Shopify)"""
import json, re, sys, html
out, seen = [], set()
for f in sys.argv[2:]:
    d = json.load(open(f)); d = d.get('data', d)
    raw = d.get('rawHtml') if isinstance(d, dict) and 'rawHtml' in d else json.dumps(d)
    m = re.search(r'(\{"products".*\})', raw, re.S)
    for p in json.loads(html.unescape(m.group(1)))['products']:
        if p['handle'] in seen: continue
        seen.add(p['handle'])
        out.append({'id': p['id'], 'handle': p['handle'], 'title': p['title'], 'type': p['product_type'], 'tags': p['tags'],
                    'created_at': p.get('created_at'), 'options': [o['name'] for o in p['options']],
                    'variants': [{'id': v['id'], 'title': v['title'], 'sku': v['sku'], 'price': v['price'], 'available': v['available'],
                                  'compare': v['compare_at_price']} for v in p['variants']],
                    'images': [i['src'] for i in p['images'][:4]]})
json.dump(out, open(sys.argv[1], 'w'), ensure_ascii=False)
print(len(out), 'produits')
