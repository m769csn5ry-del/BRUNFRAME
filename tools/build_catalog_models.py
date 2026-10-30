"""Mapping modèles ↔ produits ↔ variantes à partir du classeur d'audit (relevé public du 29/10/2026).
Couche de présentation réversible : aucune donnée Shopify n'est modifiée.
Usage : python3 tools/build_catalog_models.py <chemin CATALOGUE_BRESLEV_GANG.xlsx>
Sorties : content/models.json, content/products.json, content/claims.json, audit/fiches-status.csv,
          audit/coverage.json, audit/validations-ysahar.md
"""
import sys, os, re, json, csv, unicodedata
from collections import Counter, defaultdict
import openpyxl

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser('~/Downloads/CATALOGUE_BRESLEV_GANG.xlsx')
DATE = '2026-10-29'
wb = openpyxl.load_workbook(SRC, read_only=True)

def table(name):
    rows = [r for r in wb[name].iter_rows(values_only=True)]
    i = next(k for k, r in enumerate(rows[:8]) if r and sum(1 for x in r if x) > 4)
    hdr = [str(h) for h in rows[i]]
    return [dict(zip(hdr, r)) for r in rows[i + 1:] if r and r[0]]

S = lambda x: '' if x is None or str(x) == 'None' else str(x).strip()
cat, var, grp = table('Catalogue'), table('Variantes'), table('Regroupements')
P = {S(r['ID']): r for r in cat}
V = defaultdict(list)
for v in var: V[S(v['Produit ID'])].append(v)

def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')[:60]

def words(t): return [w for w in re.split(r'[\s’\'·/,()-]+', t) if w]

def child_labels(titles):
    """Libellé d'option = mots du titre absents d'au moins un autre titre du groupe (souvent la couleur)."""
    fold = lambda w: unicodedata.normalize('NFKD', w).encode('ascii', 'ignore').decode().lower()   # « à », « À » et « a » comptent comme le même mot
    common = set(fold(w) for w in words(titles[0]))
    for t in titles[1:]: common &= set(fold(w) for w in words(t))
    out = []
    for t in titles:
        rest = [w for w in words(t) if fold(w) not in common]
        out.append(' '.join(rest) or t)
    return out

handle = lambda url: S(url).rstrip('/').split('/products/')[-1]
assigned, models = {}, []

def line(pid, v, label):
    p = P[pid]
    opts = [S(v[k]) for k in ('Option 1', 'Option 2', 'Option 3') if S(v[k]) and S(v[k]) != 'Default Title']
    return {'sourceProductId': pid, 'sourceVariantId': S(v['Variante ID']), 'handle': handle(p['URL officielle']), 'url': S(p['URL officielle']),
            'options': ([label] if label else []) + opts, 'price': S(v['Prix EUR']), 'currency': 'EUR',
            'priceMinor': round(float(S(v['Prix EUR']) or 0) * 100), 'compareAt': S(v['Comparaison EUR']) or None,
            'available': S(v['Disponibilité']).lower().startswith('disponible'), 'sku': S(v['SKU public']) or None,
            'images': [u for u in S(p['URL images']).split(' ; ') if u][:4]}

def add_model(mid, name, status, pids, why='', need='', group=None, label_name='Coloris'):
    pids = [p for p in pids if p in P and p not in assigned]
    if not pids: return
    labels = child_labels([S(P[p]['Nom exact']) for p in pids]) if len(pids) > 1 else [None]
    lines = [line(pid, v, lab) for pid, lab in zip(pids, labels) for v in V[pid]]
    keys = Counter(tuple(l['options']) for l in lines)
    if len(pids) > 1 and any(c > 1 for c in keys.values()):          # collision d'options : on ne fusionne pas
        for pid in pids: add_model(slug(S(P[pid]['Nom exact'])) + '-' + pid[-4:], S(P[pid]['Nom exact']), 'INDIVIDUEL', [pid],
                                   'Collision d’options dans ' + (group or mid) + ' : modèles gardés séparés', need)
        return
    for pid in pids: assigned[pid] = mid
    p0 = P[pids[0]]
    optNames = ([label_name] if len(pids) > 1 else []) + ([n for n in ['Option'] if any(len(l['options']) > (1 if len(pids) > 1 else 0) for l in lines)])
    models.append({'modelId': mid, 'name': name, 'status': status, 'group': group, 'justification': why, 'validation': need,
                   'family': S(p0['Famille']), 'segment': S(p0['Segment']), 'subfamily': S(p0['Sous-famille']),
                   'sourceProductIds': pids, 'optionNames': optNames, 'lines': lines,
                   'collections': sorted({c for pid in pids for c in S(P[pid]['Collections officielles']).split(' ; ') if c})})

# 1) groupes PROBABLE (présentation regroupée réversible) et CONFIRMÉ (variantes natives) ; À NE PAS FUSIONNER → séparés
for g in grp:
    ids = [i for i in re.split(r'[\s;]+', S(g['IDs enfants'])) if i]
    st = S(g['Confiance'])
    if st == 'À NE PAS FUSIONNER':
        for pid in ids:
            add_model(slug(S(P[pid]['Nom exact'])) + '-' + pid[-4:], S(P[pid]['Nom exact']), 'À NE PAS FUSIONNER', [pid], S(g['Justification']), S(g['Validation requise']), S(g['Groupe']))
    elif st == 'PROBABLE':
        name = re.sub(r'^HOMONYMES( À CONTRÔLER)? · ', '', S(g['Parent proposé'])).title()
        add_model('g-' + slug(S(g['Parent proposé'])), name, 'PROBABLE', ids, S(g['Justification']), S(g['Validation requise']), S(g['Groupe']),
                  'Finition' if 'inition' in S(g['Attributs proposés']) else 'Coloris')
    else:
        for pid in ids: add_model(slug(S(P[pid]['Nom exact'])), S(P[pid]['Nom exact']), 'CONFIRMÉ', [pid], 'Variantes déjà structurées dans Shopify', '', S(g['Groupe']))
# 2) tout le reste : une fiche par produit
for pid, p in P.items():
    if pid not in assigned: add_model(slug(S(p['Nom exact'])) + ('-' + pid[-4:] if any(slug(S(m['name'])) == slug(S(p['Nom exact'])) for m in models) else ''), S(p['Nom exact']), 'INDIVIDUEL', [pid])

# contrôles de couverture
allv = [S(v['Variante ID']) for v in var]
mapped = [l['sourceVariantId'] for m in models for l in m['lines']]
cov = {'date_releve': DATE, 'produits_source': len(P), 'produits_mappes': len(assigned), 'produits_doubles': len(assigned) - len(set(assigned)),
       'variantes_source': len(allv), 'variantes_mappees': len(mapped), 'variantes_manquantes': sorted(set(allv) - set(mapped)),
       'variantes_en_double': [k for k, c in Counter(mapped).items() if c > 1], 'variantes_inventees': sorted(set(mapped) - set(allv)),
       'modeles': len(models), 'par_statut': dict(Counter(m['status'] for m in models)), 'modelIds_uniques': len({m['modelId'] for m in models}) == len(models)}
assert not cov['variantes_manquantes'] and not cov['variantes_en_double'] and not cov['variantes_inventees'] and cov['produits_mappes'] == len(P), cov

# contenus de fiche : faits connus seulement, description d'origine conservée à part
FAM_TXT = {'Peteks': 'Petek : un étui de cuir qui renferme un véritable parchemin.'}
def facts(m):
    ls = m['lines']; prices = sorted({l['priceMinor'] for l in ls})
    opt_vals = sorted({l['options'][0] for l in ls if l['options']}) if m['optionNames'] else []
    f = {'symbole_ou_famille': m['subfamily'], 'segment': m['segment'], 'prix_min_eur': prices[0] / 100, 'prix_max_eur': prices[-1] / 100,
         'nb_variantes': len(ls), 'disponible': any(l['available'] for l in ls)}
    if opt_vals: f['options'] = opt_vals[:40]
    return f
products, status_rows = [], []
for m in models:
    src = [P[i] for i in m['sourceProductIds']]
    orig = {i: S(P[i]['Description originale']) for i in m['sourceProductIds'] if S(P[i]['Description originale'])}
    manques = sorted({x.strip() for p in src for x in S(p['Manques techniques']).split(';') if x.strip()})
    f = facts(m); multi = len(m['lines']) > 1
    acc = (FAM_TXT.get(m['segment'], '') + ' ' if m['segment'] in FAM_TXT else '') + \
          (f"{len(f.get('options', []))} {'finitions' if m['optionNames'][:1] == ['Finition'] else 'coloris'} disponibles sous cette fiche." if f.get('options') and len(m['sourceProductIds']) > 1 else '')
    imgs = sum(len(l['images']) for l in m['lines'])
    st = 'BLOQUÉE (pas d’image publique)' if imgs == 0 else ('PRÊTE' if orig and not manques else 'À COMPLÉTER')
    products.append({'modelId': m['modelId'], 'name': m['name'], 'facts': f, 'accroche_proposee': acc.strip(), 'descriptions_originales': orig,
                     'manques': manques, 'statut_fiche': st, 'sources': ['breslevgang.com/products.json ' + DATE, 'CATALOGUE_BRESLEV_GANG.xlsx']})
    for pid in m['sourceProductIds']:
        p = P[pid]
        status_rows.append({'sourceProductId': pid, 'nom': S(p['Nom exact']), 'modelId': m['modelId'], 'statut_regroupement': m['status'],
                            'variantes': len(V[pid]), 'variantes_couvertes': sum(1 for l in m['lines'] if l['sourceProductId'] == pid),
                            'images': S(p['Images']), 'description_originale': 'oui' if S(p['Description originale']) else 'non',
                            'manques': S(p['Manques techniques']), 'statut_fiche': st, 'date': DATE})

claims = [
    {'texte': 'Livraison offerte dès 120 € d’achat', 'portee': 'marque, marché France/EUR', 'source': 'bandeau breslevgang.com', 'date': DATE, 'statut': 'vérifié (public)'},
    {'texte': 'Échange sous 14 jours (colliers)', 'portee': 'colliers', 'source': 'breslevgang.com/policies/refund-policy', 'date': DATE, 'statut': 'vérifié (public)'},
    {'texte': 'Fait main à Strasbourg', 'portee': 'créations concernées, à préciser par modèle', 'source': 'confirmation du commanditaire (BRUNFRAME) ; siège Strasbourg selon mentions légales', 'date': '2026-10-30', 'statut': 'confirmation commanditaire, périmètre à valider'},
    {'texte': 'Petek : étui de cuir avec véritable parchemin', 'portee': 'Peteks', 'source': 'bio Instagram @breslev_gang (« Luxury leather & genuine parchment »)', 'date': DATE, 'statut': 'vérifié (public), matière exacte par modèle à confirmer'},
    {'texte': 'Pendentifs distinctifs non proposés par les concurrents', 'portee': 'modèles à lister', 'source': 'confirmation du commanditaire', 'date': '2026-10-30', 'statut': 'NON publié tant que les modèles et le périmètre ne sont pas validés'},
]
os.makedirs('content', exist_ok=True); os.makedirs('audit', exist_ok=True)
json.dump(models, open('content/models.json', 'w'), ensure_ascii=False, indent=1)
json.dump(products, open('content/products.json', 'w'), ensure_ascii=False, indent=1)
json.dump(claims, open('content/claims.json', 'w'), ensure_ascii=False, indent=1)
json.dump(cov, open('audit/coverage.json', 'w'), ensure_ascii=False, indent=1)
with open('audit/fiches-status.csv', 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(status_rows[0])); w.writeheader(); w.writerows(status_rows)
need = [m for m in models if m['status'] in ('PROBABLE', 'À NE PAS FUSIONNER') and m['validation']]
with open('audit/validations-ysahar.md', 'w') as f:
    f.write('# Validations à obtenir d’Ysahar (une seule liste)\n\nAucune fusion, suppression ou modification Shopify n’est faite sans accord.\n\n')
    f.write('## Regroupements proposés\n' + ''.join(f"- **{m['group']} · {m['name']}** ({len(m['sourceProductIds'])} fiches, {m['status']}) : {m['validation']}\n" for m in need if m['status'] == 'PROBABLE'))
    f.write('\n## Références gardées séparées, à expliquer\n' + ''.join(sorted({f"- {m['group']} : {m['justification']}\n" for m in need if m['status'] == 'À NE PAS FUSIONNER'})))
    f.write('\n## Informations de marque\n- Liste des pendentifs exclusifs Breslev Gang et périmètre exact de l’exclusivité (dessin, montage).\n- Périmètre de « Fait main à Strasbourg » : quels modèles, quelles étapes réalisées à l’atelier.\n- Matières exactes (métal, finition, cuir) et dimensions / longueurs de chaîne par modèle.\n- Nom des opérations visibles dans les 5 vidéos d’atelier et modèles concernés.\n- Photos de dos et de profil des pièces mises en scène (pour toute vue 3D future).\n')
    f.write(f"\n## Fiches incomplètes\n{Counter(p['statut_fiche'] for p in products)}\n")
print(json.dumps({k: v for k, v in cov.items() if not isinstance(v, list)}, ensure_ascii=False))
print(Counter(p['statut_fiche'] for p in products))
