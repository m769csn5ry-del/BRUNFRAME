"""Prépare les détourages de la galerie flottante.

1. Nettoie les résidus sombres et fins laissés par la segmentation (filaments, morceaux de fond),
   sans toucher au métal, aux perles ni au cuir : un pixel sombre n'est retiré que s'il est fin,
   loin de tout métal clair et hors des masses épaisses (perles, étuis).
2. Mesure l'articulation réelle : le pendentif (masse épaisse du bas) et son point d'attache.
   La couture chaîne/pendentif passe par l'anneau, si bien qu'une légère rotation de la chaîne
   autour de ce point ne sépare jamais les deux parties.

Usage : python tools/piece_rig.py theme/assets [--write] [--debug dossier]
"""
import sys, os, glob, json
import numpy as np
from PIL import Image
from scipy import ndimage as nd


def disk(r):
    y, x = np.ogrid[-r:r + 1, -r:r + 1]
    return x * x + y * y <= r * r


def clean(rgba, conf):
    """Nettoyage ciblé, réglé pièce par pièce (voir CLEAN) : rien n'est retiré ailleurs."""
    a = rgba[..., 3].astype(np.float32) / 255
    rgb = rgba[..., :3].astype(np.float32) / 255
    lum = rgb @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    H, W = a.shape
    solid = a > 0.5
    bright = nd.binary_dilation(solid & (lum > 0.5), structure=disk(1))
    drop = np.zeros_like(solid)
    if 'beads' in conf:
        # filaments gris collés aux rangs de perles : plus fins qu'un disque de 5 px et sans métal clair
        x0, y0, x1, y1 = conf['beads']
        reg = np.zeros_like(solid); reg[int(y0 * H):int(y1 * H), int(x0 * W):int(x1 * W)] = True
        kept = nd.binary_dilation(nd.binary_opening(solid, structure=disk(2)), structure=disk(1)) | bright
        drop |= reg & (a > 0.05) & ~kept
        # fragments restés isolés après ce retrait (sans métal clair)
        rest = (a > 0.05) & ~drop
        lab, n = nd.label(rest)
        if n > 1:
            sizes = nd.sum(rest, lab, range(1, n + 1))
            metal = nd.sum(bright & rest, lab, range(1, n + 1))
            bad = 1 + np.where((sizes < rest.size * 0.002) & (metal < 4))[0]
            drop |= reg & np.isin(lab, bad)
    if conf.get('haze'):
        # voile d'ombre : pixels translucides à plus de 2 px du cœur opaque de la chaîne
        core = nd.binary_dilation(a > 0.85, structure=disk(2))
        drop |= (a > 0.02) & (a < 0.85) & ~core
    out = rgba.copy()
    out[..., 3] = np.where(drop, 0, rgba[..., 3])
    return out, int(drop.sum())


def rig(rgba):
    a = rgba[..., 3] > 30
    H, W = a.shape
    r = max(6, int(W * 0.04))
    body = nd.binary_opening(a, structure=disk(r))
    lab, n = nd.label(body)
    best = None
    for k in range(1, n + 1):
        ys, xs = np.where(lab == k)
        if ys.mean() < H * 0.6:
            continue
        if best is None or len(ys) > best[0]:
            best = (len(ys), ys, xs)
    if best is None:
        return None
    _, ys, xs = best
    top = ys.min()
    band = xs[ys < top + max(3, int(H * 0.012))]
    bx = float(np.median(band))
    seam = max(0, top - int(H * 0.012))
    x0, x1 = xs.min(), xs.max()
    pad = (x1 - x0) * 0.08 + 4
    return {
        'bail_x': round(bx / W * 100, 1), 'bail_y': round(seam / H * 100, 1),
        'pend_l': round(max(0, x0 - pad) / W * 100, 1), 'pend_r': round(min(W, x1 + pad) / W * 100, 1),
        'focus_x': round(xs.mean() / W * 100, 1), 'focus_y': round(ys.mean() / H * 100, 1),
    }


# réglages vérifiés à l'œil quand la mesure automatique échoue (voile d'ombre trop large)
MANUAL = {
    'mezouza-pearl-black': {'bail_x': 51.8, 'bail_y': 84.3, 'pend_l': 44.1, 'pend_r': 60.1, 'focus_x': 52.5, 'focus_y': 92.6, 'art': 1},
    'necklace-chrome-fire-26': {'bail_x': 48.0, 'bail_y': 86.7, 'pend_l': 32.8, 'pend_r': 62.9, 'focus_x': 47.9, 'focus_y': 93.7, 'art': 1},
    'necklace-fire-2-0': {'bail_x': 50.0, 'bail_y': 89.8, 'pend_l': 31.1, 'pend_r': 67.5, 'focus_x': 50.0, 'focus_y': 94.9, 'art': 1},
    'necklace-maguen-chrome': {'bail_x': 50.8, 'bail_y': 84.6, 'pend_l': 24.0, 'pend_r': 78.0, 'focus_x': 51.0, 'focus_y': 92.0, 'art': 1},
    # deux attaches (chaîne à gauche, perles à droite) : articulation réduite pour ne jamais décoller un brin
    'petek-croco-black-x-hay-new-season-26': {'bail_x': 22.6, 'bail_y': 80.4, 'pend_l': 13.3, 'pend_r': 74.5, 'focus_x': 45.0, 'focus_y': 90.9, 'art': 0.3},
}
CLEAN = {
    'mezouza-pearl-black': {'beads': (0, 0, 1, 0.62)},
    'petek-croco-black-x-hay-new-season-26': {'beads': (0, 0, 1, 0.8)},
}
SKIP = {'petek-real-croco-black'}  # étui absent du détourage, fond croco collé : exclu de la galerie


def split(out, rg, base):
    H, W = out.shape[:2]
    x0, x1 = int(rg['pend_l'] * W / 100), int(round(rg['pend_r'] * W / 100))
    y0 = int(rg['bail_y'] * H / 100)
    chain = out.copy(); chain[y0:, x0:x1, 3] = 0
    Image.fromarray(chain).save(base + '-chain.webp', 'WEBP', quality=90, method=6)
    Image.fromarray(out[y0:, x0:x1]).save(base + '-pend.webp', 'WEBP', quality=92, method=6)
    rg['pend_w'], rg['pend_h'] = x1 - x0, H - y0
    rg['w'], rg['h'] = W, H


def main():
    d = sys.argv[1]
    write = '--write' in sys.argv
    dbg = sys.argv[sys.argv.index('--debug') + 1] if '--debug' in sys.argv else None
    res = {}
    for f in sorted(glob.glob(os.path.join(d, 'piece-*.webp'))):
        h = os.path.basename(f)[6:-5]
        if h in SKIP or h.endswith('-chain') or h.endswith('-pend'):
            continue
        rgba = np.asarray(Image.open(f).convert('RGBA'))
        out, removed = clean(rgba, CLEAN.get(h, {}))
        rg = rig(out) or {}
        rg.update(MANUAL.get(h, {}))
        rg['removed_px'] = removed
        res[h] = rg
        if write:
            Image.fromarray(out).save(f, 'WEBP', quality=92, method=6)
            split(out, rg, f[:-5])
        if dbg:
            H, W = out.shape[:2]
            tiles = []
            for bg in ((238, 240, 243), (16, 18, 22)):
                t = Image.new('RGB', (W, H), bg)
                t.paste(Image.fromarray(out), (0, 0), Image.fromarray(out))
                if rg.get('bail_y') is not None:
                    from PIL import ImageDraw
                    dr = ImageDraw.Draw(t)
                    y = rg['bail_y'] * H / 100
                    dr.rectangle([rg['pend_l'] * W / 100, y, rg['pend_r'] * W / 100, H - 1], outline=(220, 40, 40), width=3)
                    bx = rg['bail_x'] * W / 100
                    dr.ellipse([bx - 7, y - 7, bx + 7, y + 7], outline=(40, 120, 255), width=3)
                tiles.append(t)
            s = Image.new('RGB', (W * 2 + 10, H), (90, 90, 90))
            s.paste(tiles[0], (0, 0)); s.paste(tiles[1], (W + 10, 0))
            s.thumbnail((700, 1100))
            s.save(os.path.join(dbg, h + '.jpg'), quality=80)
    if write:
        json.dump(res, open(os.path.join(os.path.dirname(__file__), 'pieces_rig.json'), 'w'), indent=1)
    print(json.dumps(res, indent=1))


if __name__ == '__main__':
    main()
