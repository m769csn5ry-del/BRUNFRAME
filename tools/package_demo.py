from pathlib import Path
import shutil
r=Path(__file__).resolve().parents[1]; d=r/'dist'
if d.exists(): shutil.rmtree(d)
shutil.copytree(r/'theme/assets',d/'theme/assets')
shutil.copytree(r/'preview',d/'preview')
(d/'index.html').write_text('<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta http-equiv="refresh" content="0;url=preview/index.html"><title>Breslev Gang — BRUNFRAME</title></head><body><a href="preview/index.html">Ouvrir Breslev Gang</a></body></html>')
(d/'robots.txt').write_text('User-agent: *\nDisallow: /\n')
(d/'_headers').write_text('/*\n  X-Robots-Tag: noindex, nofollow\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n')
print('Demo packaged:',len(list(d.rglob('*'))),'entries')
