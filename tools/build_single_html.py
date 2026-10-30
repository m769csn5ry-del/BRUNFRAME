"""Assemble UN SEUL fichier HTML autonome de la démo (CSS, JS, données publiques inclus ; images = CDN officiel).
Routeur à hash : #/  #/collection?k=Collier  #/product?h=<handle>  #/404. Sortie : dist-single/breslev-gang-demo.html"""
import re, json, os, sys
ARTIFACT = '--artifact' in sys.argv
R = lambda p: open(p, encoding='utf-8').read()
def rw(s):  # liens multi-pages -> routes à hash
    s = re.sub(r"product\.html\?", "#/product?", s)
    s = re.sub(r"collection\.html\?", "#/collection?", s)
    s = s.replace("collection.html", "#/collection?k=Collier")
    s = s.replace("collections.html", "#/collections").replace("search.html", "#/search")
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
views = {n: view(n) for n in ('index', 'collection', 'collections', 'search', 'product', '404')}
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
  BG.preview.header('', { intro: first === 'index' }); BG.preview.footer(); if (window.BGTheme) BGTheme.sync();
  window.addEventListener('hashchange', route); route();
})();
""" % json.dumps(views, ensure_ascii=False).replace('</', '<\\/')
head = ('<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
 '<meta name="theme-color" content="#111315"><meta name="robots" content="noindex,nofollow"><title>Breslev Gang — Prévisualisation BRUNFRAME</title>'
 '<script>document.documentElement.classList.add("js")</script><script>' + R('theme/assets/bg-theme.js') + '</script>'
 '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
 '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Manrope:wght@400;500;600&display=swap">'
 '<link rel="preconnect" href="https://cdn.shopify.com"><style>' + css + '</style></head><body><main id="app"></main>')
if ARTIFACT:
    router = router.replace("BG.q = function () { var h = location.hash.split('?')[1] || ''; return new URLSearchParams(h); };",
      "var cur = (location.hash.replace(/^#\\/?/, '')) || 'index'; BG.q = function () { return new URLSearchParams(cur.split('?')[1] || ''); };")
    router = router.replace("var r = (location.hash.replace(/^#\\/?/, '').split('?')[0]) || 'index';", "var r = cur.split('?')[0] || 'index';")
    router = router.replace("var first = (location.hash.replace(/^#\\/?/, '').split('?')[0]) || 'index';", "var first = cur.split('?')[0] || 'index';")
    router = router.replace("window.addEventListener('hashchange', route); route();",
      "document.addEventListener('click', function (e) { var a = e.target.closest('a[href^=\"#/\"]'); if (!a) return; e.preventDefault(); cur = a.getAttribute('href').slice(2); try { history.replaceState(null, '', '#' + cur.split('?')[0].replace(/[^a-z0-9-]/g, '')); } catch (_) { } route(); }); route();")
out = head + '<script>' + js.replace('</script', '<\\/script') + router + '</script></body></html>'
os.makedirs('dist-single', exist_ok=True)
if ARTIFACT:
    m = re.search(r'<style>(.*?)</style>', out, re.S)
    body = out[out.index('<main id="app">'):out.rindex('</body>')]
    art = ('<title>Breslev Gang 2100</title><meta name="robots" content="noindex">'
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Manrope:wght@400;500;600&display=swap">'
      '<script>' + R('theme/assets/bg-theme.js') + '</script><style>html{background:var(--bg-0)}' + m.group(1) + '\nbody{background:var(--bg-0);color:var(--ink)}</style><script>document.documentElement.classList.add("js")</script>' + body)
    open(sys.argv[sys.argv.index('--artifact') + 1], 'w', encoding='utf-8').write(art)
else:
    open('dist-single/breslev-gang-demo.html', 'w', encoding='utf-8').write(out)
print(len(out) // 1024, 'Ko')
