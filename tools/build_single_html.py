"""Assemble UN SEUL fichier HTML autonome de la démo (CSS, JS, données publiques inclus ; images = CDN officiel).
Routeur à hash : #/  #/collection?k=Collier  #/product?h=<handle>  #/404. Sortie : dist-single/breslev-gang-demo.html"""
import re, json, os
R = lambda p: open(p, encoding='utf-8').read()
def rw(s):  # liens multi-pages -> routes à hash
    s = re.sub(r"product\.html\?", "#/product?", s)
    s = re.sub(r"collection\.html\?", "#/collection?", s)
    s = s.replace("collection.html", "#/collection?k=Collier")
    s = re.sub(r"index\.html#([a-z-]+)", r"#/index?s=\1", s)
    s = s.replace("index.html", "#/")
    return s
def view(name):
    h = R(f'preview/{name}.html')
    main = re.search(r'<main>(.*?)</main>', h, re.S).group(1)
    scripts = re.findall(r'<script>(.*?)</script>', h, re.S)
    run = scripts[-1] if name != '404' else ''
    run = run.replace("P.footer();", "").replace("BG.preview.footer();", "")
    run = re.sub(r"BG\.preview\.header\([^;]*\);", "", run).replace("new URLSearchParams(location.search)", "BG.q()")
    main = re.sub(r'<script src[^>]*></script>', '', main)
    return {'html': rw(main), 'run': rw(run)}
views = {n: view(n) for n in ('index', 'collection', 'product', '404')}
css = R('theme/assets/bg-tokens.css') + '\n' + R('theme/assets/bg-base.css')
js = '\n;\n'.join([R('preview/data.js'), R('theme/assets/bg-cart.js'), rw(R('preview/bg-preview.js')), R('theme/assets/bg-product.js'), R('theme/assets/bg-rail.js'), R('theme/assets/bg-ui.js')])
router = """
;(function(){
  var V = %s, app = document.getElementById('app');
  BG.q = function () { var h = location.hash.split('?')[1] || ''; return new URLSearchParams(h); };
  function route() {
    var r = (location.hash.replace(/^#\\/?/, '').split('?')[0]) || 'index';
    if (!V[r]) r = '404';
    app.innerHTML = V[r].html;
    try { new Function(V[r].run)(); } catch (e) { console.error(e); }
    if (BG.initRails) BG.initRails(); if (BG.initProducts) BG.initProducts(); if (BG.uiRefresh) BG.uiRefresh();
    document.querySelectorAll('.bg-nav a').forEach(function (a) { a.removeAttribute('aria-current'); });
    var s = BG.q().get('s'), el = s && document.getElementById(s);
    if (el) el.scrollIntoView(); else scrollTo(0, 0);
    document.body.classList.remove('bg-lock');
    var nav = document.querySelector('[data-menu]'); if (nav) nav.classList.remove('is-open');
  }
  var first = (location.hash.replace(/^#\\/?/, '').split('?')[0]) || 'index';
  BG.preview.header('', { intro: first === 'index' }); BG.preview.footer();
  window.addEventListener('hashchange', route); route();
})();
""" % json.dumps(views, ensure_ascii=False).replace('</', '<\\/')
head = ('<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
 '<meta name="theme-color" content="#050606"><meta name="robots" content="noindex,nofollow"><title>Breslev Gang — Prévisualisation BRUNFRAME</title>'
 '<script>document.documentElement.classList.add("js")</script>'
 '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
 '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Manrope:wght@400;500;600&display=swap">'
 '<link rel="preconnect" href="https://cdn.shopify.com"><style>' + css + '</style></head><body><main id="app"></main>')
out = head + '<script>' + js.replace('</script', '<\\/script') + router + '</script></body></html>'
os.makedirs('dist-single', exist_ok=True)
open('dist-single/breslev-gang-demo.html', 'w', encoding='utf-8').write(out)
print(len(out) // 1024, 'Ko')
