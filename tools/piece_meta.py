"""Mesure, sur un détourage officiel (RGBA), les deux attaches de la chaîne en haut et le centre du pendentif ; exporte le WebP du thème.
Usage : python tools/piece_meta.py <detourage.png|webp> <handle> <largeur_photo_source> <hauteur_photo_source> <dossier_assets>"""
import sys, json, numpy as np
from PIL import Image
src, handle, sw, sh, out = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
im = Image.open(src).convert('RGBA')
if im.height > 1600: im = im.resize((round(im.width * 1600 / im.height), 1600), Image.LANCZOS)
rgba = np.asarray(im).astype(np.float32); a = rgba[..., 3] / 255.0; H, W = a.shape
# le haut de chaîne était estompé par le détourage : on rend aux rangées leur opacité (gain borné), pour qu'elle rejoigne son support
mx = a.max(1); ref = np.median(mx[int(H * .1): int(H * .25)])
for y in range(int(H * .1)):
    if .12 < mx[y] < ref: a[y] = np.clip(a[y] * min(3, ref / mx[y]), 0, 1)
rgba[..., 3] = a * 255; im = Image.fromarray(rgba.astype(np.uint8), 'RGBA')
top = a[: max(6, H // 33)] > .4
cols = np.where(top.any(0))[0]
hookL, hookR = (cols.min() / W, cols.max() / W) if len(cols) else (.4, .6)
if hookR - hookL < .14: c = (hookL + hookR) / 2; hookL, hookR = max(0, c - .07), min(1, c + .07)
rows = np.where((a > .45).sum(1) > 0)[0]; yb = rows.max()
band = a[int(yb - H * .2): yb + 1] > .45
ys, xs = np.where(band)
# pendentif = zone la plus large en bas ; son centre sert de cible au rapprochement
w = band.sum(1); k = np.argsort(w)[-max(8, len(w) // 6):]
fy = (int(yb - H * .2) + np.median(k)) / H
fx = np.median(xs[np.isin(ys, k)]) / W
im.save(f'{out}/piece-{handle}.webp', quality=90, method=6)
scale = im.height / H
print(json.dumps({'handle': handle, 'asset': f'piece-{handle}.webp', 'w': W, 'h': H, 'hookL': round(hookL * 100), 'hookR': round(hookR * 100), 'fx': round(fx * 100), 'fy': round(fy * 100),
                  'detail_pos': f"{round(((sw - W * sh / max(sh, 1)) / 2 + fx * W) / sw * 100)}% {round(min(96, fy * H / sh * 100))}%"}))
