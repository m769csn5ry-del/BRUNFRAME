"""Fiches courtes : génère theme/snippets/product-copy.liquid depuis content/fiches-courtes.json,
et docs/fiches-a-completer.csv (références qui manquent d'informations vérifiées).

Le snippet ne modifie aucune donnée de la boutique : il choisit ce qu'affiche le thème.
Priorité : métachamps custom.accroche / custom.caracteristiques (s'ils sont créés un jour),
puis les textes rédigés ici (photos officielles, titres, descriptions), puis les seules données vérifiables
(monture d'après les collections de la boutique, coloris et tailles des variantes).
Les paragraphes génériques recopiés sur tout le catalogue ne sont jamais affichés.
Usage : python3 tools/build_product_copy.py"""
import json, os, re, html, csv
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
copy = json.load(open(os.path.join(R, 'content/fiches-courtes.json')))

# fragments des textes génériques (présents sur des dizaines de fiches) et du récit du Petek
MARKERS = ["ne se limitent pas", "méticuleusement conçus", "Au cœur de cette série", "Raffinement et signification spirituelle",
           "En somme, notre série", "plus qu'un simple", "plus qu’un simple", "déclaration de style", "tendances éphémères",
           "savoir-faire artisanal", "Plongez dans notre collection", "Découvrez l'élégance singulière", "Découvrez l’élégance singulière",
           "Explorez avec fascination", "Redécouvrez le luxe", "Découvrez l'éclat captivant", "Découvrez l’éclat captivant",
           "Odesser", "1922", "Na Na'h", "Na Na’h"]
FLAME = "La flamme est le symbole emblématique de la maison. Elle exprime ses croyances essentielles, transmises par les paroles du Rabbi Nahman : « Mon feu brûlera jusqu'à la venue du Messie »."
PETEK = "Le Petek renvoie à la lettre reçue en 1922 par Rabbi Israël Ber Odesser, que le récit attribue à Rabbi Nahman, et qui porte la formule « Na Na'h Na'hma Nahman Méouman »."
BRESLEV = "Rabbi Na'hman de Breslev, né en 1772, est présenté par la maison comme le fondateur de la dynastie hassidique de Breslev."


def lq(s):
    assert '"' not in s, s
    return '"' + s + '"'


whens = []
for h, d in copy.items():
    whens.append(f"    when {lq(h)}\n      assign acc = {lq(d['accroche'])}\n      assign specs = {lq('¦'.join(d['caracteristiques']))}")

snippet = """{%- comment -%}
  Fiche courte — GÉNÉRÉ par tools/build_product_copy.py depuis content/fiches-courtes.json (ne pas modifier à la main).
  part : 'accroche' (2 phrases), 'specs' (<li>, 3 au plus), 'symbol' (sens documenté et source), 'details' (paragraphes propres à la pièce).
  Priorité : métachamps custom.accroche / custom.caracteristiques, puis textes rédigés, puis données vérifiables uniquement.
{%- endcomment -%}
{%- liquid
  assign acc = product.metafields.custom.accroche.value
  assign specs = ''
  if product.metafields.custom.caracteristiques.value != blank
    assign specs = product.metafields.custom.caracteristiques.value | join: '¦'
  endif
  if acc == blank
    case product.handle
__WHENS__
    endcase
  endif
  assign markers = "__MARKERS__" | split: '|'
  if part == 'accroche' or part == 'details'
    assign out = ''
    if product.description != blank
      assign chunks = product.description | replace: '<br />', '</p>' | replace: '<br/>', '</p>' | replace: '<br>', '</p>' | split: '</p>'
      for chunk in chunks
        assign tx = chunk | strip_html | strip
        assign words = tx | split: ' '
        if words.size < 8
          continue
        endif
        assign generic = false
        for m in markers
          if tx contains m
            assign generic = true
            break
          endif
        endfor
        if generic
          continue
        endif
        if part == 'accroche'
          if acc == blank
            assign acc = tx | truncatewords: 40, '…'
          endif
          break
        endif
        assign out = out | append: '<p>' | append: tx | append: '</p>'
      endfor
    endif
    if part == 'accroche'
      echo acc
    else
      echo out
    endif
  endif
  if part == 'specs'
    assign list = specs
    assign hs = product.collections | map: 'handle' | join: ' '
    if hs contains 'petek-perles'
      assign list = list | append: '¦Petek monté sur perles'
    elsif product.type == 'Petek à chaine'
      assign list = list | append: '¦Petek monté sur chaîne'
    elsif hs contains 'petek-waxed-edition-cordon'
      assign list = list | append: '¦Petek monté sur cordon ciré'
    endif
    if hs contains 'capsule-croco-leather'
      assign list = list | append: '¦Collection Gamme exotique / Cuir de luxe'
    endif
    if product.type == 'Collier en acier'
      assign list = list | append: '¦Collier en acier'
    endif
    for option in product.options_with_values
      if option.values.size < 2
        continue
      endif
      assign on = option.name | downcase
      if on == 'taille' or on == 'size' or on == 'tailles'
        assign list = list | append: '¦Tailles : ' | append: option.values.first | append: ' à ' | append: option.values.last
      else
        assign vals = option.values | join: ', '
        assign list = list | append: '¦' | append: option.name | append: ' : ' | append: vals
      endif
    endfor
    assign items = list | split: '¦'
    assign n = 0
    for it in items
      assign v = it | strip
      if v == blank
        continue
      endif
      echo '<li>' | append: v | append: '</li>'
      assign n = n | plus: 1
      if n >= 3
        break
      endif
    endfor
  endif
  if part == 'symbol'
    assign tt = product.title | downcase
    assign hs = product.collections | map: 'handle' | join: ' '
    assign key = ''
    if tt contains 'petek'
      assign key = 'petek'
    elsif tt contains 'flamme' or tt contains 'fire' or tt contains 'flame' or tt contains 'aech' or hs contains 'flamme'
      assign key = 'flamme'
    elsif tt contains 'nahman' or tt contains 'נ נח' or tt contains 'na nah'
      assign key = 'breslev'
    endif
    case key
      when 'petek'
        echo '<p>__PETEK__</p><p class="source">Symbolique présentée par la maison — <a href="https://breslevgang.com/blogs/news/lhistoire-du-petek">« L&#39;histoire du Petek »</a></p>'
      when 'flamme'
        echo '<p>__FLAME__</p><p class="source">Symbolique présentée par la maison — descriptions des colliers Flamme, breslevgang.com</p>'
      when 'breslev'
        echo '<p>__BRESLEV__</p><p class="source">Tradition présentée par la maison — <a href="https://breslevgang.com/blogs/news/breslev-cest-quoi">« Breslev, c&#39;est quoi ? »</a></p>'
    endcase
  endif
-%}
"""
esc = lambda s: s.replace("'", "&#39;")
snippet = (snippet.replace('__WHENS__', '\n'.join(whens)).replace('__MARKERS__', '|'.join(MARKERS))
           .replace('__PETEK__', esc(PETEK)).replace('__FLAME__', esc(FLAME)).replace('__BRESLEV__', esc(BRESLEV)))
open(os.path.join(R, 'theme/snippets/product-copy.liquid'), 'w').write(snippet)

# références à compléter
P = json.load(open(os.path.join(R, '.cache/official/products.json')))
P = P['products'] if isinstance(P, dict) else P
MAT = re.compile(r"\b(acier|inoxydable|argent 925|plaqu[ée]|laiton|cuir|velours|coton|polyester|zircon\w*|or \d+|titane)\b", re.I)
DIM = re.compile(r"\b\d+([,.]\d+)?\s?(cm|mm)\b|longueur|diam[eè]tre", re.I)
rows = []
for p in P:
    paras = [re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', x))).strip() for x in re.split(r'(?i)</p>|<br\s*/?>', p.get('body_html') or '')]
    own = [x for x in paras if len(x.split()) >= 8 and not any(m in x for m in MARKERS)]
    txt = ' '.join(own) + ' ' + p['title'] + ' ' + (p.get('product_type') or '')
    mat, dim = bool(MAT.search(txt)), bool(DIM.search(txt))
    missing = [k for k, ok in (('fiche courte', p['handle'] in copy or bool(own)), ('matière', mat), ('dimensions / longueur', dim), ('entretien', False)) if not ok]
    rows.append([p['handle'], p['title'].replace('\n', ' '), 'oui' if p['handle'] in copy else ('extrait de la description' if own else 'non'), sum(len(x.split()) for x in own), 'oui' if mat else 'non', 'oui' if dim else 'non', ' ; '.join(missing)])
os.makedirs(os.path.join(R, 'docs'), exist_ok=True)
with open(os.path.join(R, 'docs/fiches-a-completer.csv'), 'w', newline='') as f:
    w = csv.writer(f); w.writerow(['handle', 'titre', 'fiche courte', 'mots propres à la pièce', 'matière confirmée', 'dimensions confirmées', 'à fournir'])
    w.writerows(sorted(rows, key=lambda r: (r[2] != 'oui', r[0])))
print('snippet :', len(whens), 'fiches rédigées |', sum(1 for r in rows if r[2] != 'non'), '/', len(rows), 'produits avec un texte court |',
      sum(1 for r in rows if r[4] == 'oui'), 'avec matière |', sum(1 for r in rows if r[5] == 'oui'), 'avec dimensions')
