"""Exporte la taxonomie de l'audit (classeur CATALOGUE_BRESLEV_GANG.xlsx, onglet Catalogue) vers docs/research/taxonomy.json.
Usage : python3 tools/export_taxonomy.py <classeur.xlsx>   (nécessite openpyxl, lecture seule)"""
import sys, json, openpyxl
wb = openpyxl.load_workbook(sys.argv[1], read_only=True)
rows = list(wb['Catalogue'].iter_rows(min_row=6, values_only=True))
out = {str(r[0]): {'famille': r[2], 'segment': r[3], 'sous_famille': r[4], 'confiance': r[19]} for r in rows if r[0]}
json.dump(out, open('docs/research/taxonomy.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0, sort_keys=True)
print(len(out), 'fiches')
