"""Propose (sans rien modifier) un regroupement « 1 modèle = 1 fiche, couleurs = variantes » à partir du snapshot public.
Règle prudente : même titre une fois les mots de couleur/finition retirés ET même prix → candidat ; sinon « à valider »."""
import json, re, csv, sys, unicodedata
from collections import defaultdict
COLORS = r"\b(black|noir|noire|grey|gray|gris|gold|or|silver|argent|blue|bleu|bleue|pink|rose|green|vert|verte|red|rouge|white|blanc|blanche|brown|marron|navy|beige|orange|purple|violet|yellow|jaune|multicolor|multicolore|dark|light|full|couleur|color|colour)\b"
def norm(t):
    t = unicodedata.normalize('NFKD', t.lower()).encode('ascii', 'ignore').decode()
    t = re.sub(r"['’`´]", ' ', t); t = re.sub(COLORS, ' ', t); t = re.sub(r'[^a-z0-9]+', ' ', t)
    return ' '.join(t.split())
P = json.load(open(sys.argv[1])); G = defaultdict(list)
for p in P: G[norm(p['title'])].append(p)
rows, n = [], 0
for k, ps in sorted(G.items()):
    if len(ps) < 2: continue
    n += 1; prices = {p['variants'][0]['price'] for p in ps}
    for p in ps:
        rows.append([p['handle'], p['title'], k, p['variants'][0]['id'], p['variants'][0]['sku'] or '', p['variants'][0]['price'],
                     p['images'][0] if p['images'] else '', 'candidat' if len(prices) == 1 else 'à valider (prix différents)'])
with open(sys.argv[2], 'w', newline='') as f:
    w = csv.writer(f); w.writerow(['source_handle', 'source_title', 'master_model_key', 'source_variant_id', 'sku', 'price', 'image', 'statut']); w.writerows(rows)
print(n, 'groupes candidats,', len(rows), 'fiches concernées sur', len(P))
