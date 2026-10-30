// Phase 1 : thème clair/sombre, navigation, recherche sur tout le catalogue, variantes natives. Usage: node tests/phase1.js
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const srv = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'text/plain' }); r.end(fs.readFileSync(f));
});
const results = []; const ok = (n, c, d = '') => { results.push(c); console.log((c ? 'PASS ' : 'FAIL ') + n + (d ? ' — ' + d : '')); };
const D = (() => { const s = fs.readFileSync(path.join(root, 'preview/data.js'), 'utf8'); return JSON.parse(s.slice(s.indexOf('=') + 1).trim().replace(/;$/, '')); })();
(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://localhost:' + srv.address().port + '/preview/';
  const browser = await chromium.launch();
  const mk = async (opts = {}) => { const ctx = await browser.newContext(Object.assign({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }, opts)); await ctx.route(/^https?:\/\/(?!localhost)/, r => r.abort()); return ctx; };

  // 1. intégrité des données
  const P = D.products;
  ok('données: 586 produits, handles uniques', P.length === 586 && new Set(P.map(p => p.h)).size === 586);
  const cnt = k => P.filter(p => p.k === k).length;
  ok('données: familles 186 / 286 / 69 / 16 / 29', cnt('Collier') === 186 && cnt('Petek') === 286 && cnt('Bijou') === 69 && cnt('Vetement') === 16 && cnt('Autre') === 29, [cnt('Collier'), cnt('Petek'), cnt('Bijou'), cnt('Vetement'), cnt('Autre')].join('/'));
  const vcount = P.reduce((n, p) => n + (p.v ? p.v.length : 1), 0);
  ok('données: 929 variantes, identifiants uniques', vcount === 929 && new Set(P.flatMap(p => p.v ? p.v.map(v => v.id) : [p.vid])).size === 929, 'variantes=' + vcount);
  ok('données: 17 structures de variantes natives (16 vêtements + carte cadeau)', P.filter(p => p.v).length === 17);
  ok('données: 13 fiches épuisées', P.filter(p => !p.a).length === 13, 'épuisées=' + P.filter(p => !p.a).length);

  // 2. thème clair / sombre
  let ctx = await mk({ colorScheme: 'light' }); let pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(base + 'index.html'); await pg.evaluate(() => sessionStorage.setItem('bg_intro', '1')); await pg.reload();
  ok('thème: préférence système claire appliquée avant peinture', await pg.evaluate(() => document.documentElement.dataset.theme) === 'light');
  const bgLight = await pg.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await pg.click('[data-theme-toggle]');
  ok('thème: bouton nommé selon son action', (await pg.getAttribute('[data-theme-toggle]', 'aria-label')) === 'Passer au thème clair');
  ok('thème: bascule vers sombre + fond change', await pg.evaluate(() => document.documentElement.dataset.theme) === 'dark' && await pg.evaluate(() => getComputedStyle(document.body).backgroundColor) !== bgLight);
  await pg.goto(base + 'collection.html?k=Petek');
  ok('thème: choix explicite conservé sur une autre page', await pg.evaluate(() => document.documentElement.dataset.theme) === 'dark');
  await pg.evaluate(() => localStorage.setItem('bg_theme', 'light')); await pg.reload();
  const ctr = await pg.evaluate(() => { const rgb = s => s.match(/\d+/g).slice(0, 3).map(Number); const L = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); }; const a = L(rgb(getComputedStyle(document.body).color)), b = L(rgb(getComputedStyle(document.body).backgroundColor)); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); });
  ok('thème clair: contraste texte/fond ≥ 7', ctr >= 7, ctr.toFixed(1));
  await pg.screenshot({ path: 'captures/p1-collection-light-mobile390.png' });
  await pg.goto(base + 'index.html'); await pg.waitForTimeout(1200); await pg.screenshot({ path: 'captures/p1-home-light-mobile390.png' });
  await pg.evaluate(() => localStorage.setItem('bg_theme', 'dark')); await pg.reload(); await pg.waitForTimeout(800); await pg.screenshot({ path: 'captures/p1-home-dark-mobile390.png' });
  ok('thème: aucune erreur JS', errs.length === 0, errs.join('|'));
  await ctx.close();

  // 3. navigation
  ctx = await mk({ viewport: { width: 1440, height: 900 }, hasTouch: false, isMobile: false }); pg = await ctx.newPage();
  await pg.goto(base + 'index.html');
  const nav = await pg.$$eval('.bg-nav a', as => as.map(a => a.textContent.trim()));
  ok('navigation: Colliers, Peteks, Bijoux, Collections, Univers, Vêtements, Plus de créations', ['Colliers', 'Peteks', 'Bijoux', 'Collections', 'Univers', 'Vêtements', 'Plus de créations'].every((t, i) => nav[i] === t), nav.join(' | '));
  const ov = await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  ok('navigation: pas de débordement à 1440', ov <= 1);
  await ctx.close();
  for (const w of [1180, 1280]) {
    ctx = await mk({ viewport: { width: w, height: 800 }, hasTouch: false, isMobile: false }); pg = await ctx.newPage(); await pg.goto(base + 'index.html');
    const o = await pg.evaluate(() => { const h = document.querySelector('.bg-header__in'), n = document.querySelector('.bg-nav'); const r = n.getBoundingClientRect(), t = document.querySelector('.bg-tools').getBoundingClientRect(), l = document.querySelector('.bg-logo').getBoundingClientRect(); return { over: document.documentElement.scrollWidth - innerWidth, clash: r.left < l.right - 1 || r.right > t.left + 1 }; });
    ok(`navigation: ${w}px sans chevauchement logo/outils`, o.over <= 1 && !o.clash, JSON.stringify(o)); await ctx.close();
  }

  // 4. collections par famille
  ctx = await mk(); pg = await ctx.newPage();
  for (const [k, n] of [['Collier', 186], ['Petek', 286], ['Bijou', 69], ['Vetement', 16], ['Autre', 29], ['Tout', 586]]) {
    await pg.goto(base + 'collection.html?k=' + k);
    const t = await pg.textContent('#count');
    ok(`collection ${k}: ${n} pièces`, new RegExp('^' + n + ' pièces').test(t), t);
  }
  await pg.goto(base + 'collections.html');
  ok('collections: index avec toutes les familles', (await pg.$$('.bg-index a')).length > 20);

  // 5. recherche sur tout le catalogue
  await pg.goto(base + 'search.html'); await pg.waitForSelector('#grid .bg-card');
  ok('recherche: vide = tout le catalogue', /586 pièces/.test(await pg.textContent('#count')));
  const res = async q => { await pg.fill('#sq', q); return Number((await pg.textContent('#count')).match(/^(\d+)/)[1]); };
  const hay = (re) => P.filter(p => re.test((p.t + ' ' + p.s + ' ' + p.f).toLowerCase())).length;
  const nHay = await res('Haï'), nHay2 = await res('hay'), nHay3 = await res('חי');
  ok('recherche: synonymes Hay / Haï / חי concordants', nHay > 0 && nHay === nHay2 && nHay2 === nHay3, [nHay, nHay2, nHay3].join('/'));
  ok('recherche: Aech = Aesh = Flamme', (await res('aech')) === (await res('flamme')) && (await res('aech')) > 20);
  ok('recherche: accents ignorés (Israël = israel)', (await res('Israël')) === (await res('israel')) && (await res('israel')) > 0);
  const kip = await res('kippa'); ok('recherche: référence hors sélection hero (kippot)', (await pg.$$('#grid .bg-card')).length > 0 || kip > 0, 'kippa=' + kip);
  const last = P[P.length - 1]; await res(last.t);
  ok('recherche: dernière fiche du catalogue retrouvable', (await pg.$$eval('#grid .bg-card__t', a => a.map(x => x.textContent))).includes(last.t), last.t);
  ok('recherche: états vide', (await res('zzzzxqj')) === 0 && !(await pg.$eval('#empty', e => e.hidden)));
  await pg.fill('#sq', 'carte cadeau');
  ok('recherche: carte cadeau trouvable', (await pg.$$eval('#grid .bg-card__t', a => a.length)) >= 1);
  const more = await (async () => { await pg.fill('#sq', ''); await pg.click('#more'); return (await pg.$$('#grid .bg-card')).length; })();
  ok('recherche: « Afficher plus » charge 24 de plus', more === 48, 'cartes=' + more);

  // 6. variantes natives (vêtements Couleur × Taille, carte cadeau)
  const sw = P.find(p => p.v && p.on.length === 2 && p.v.length === 24);
  await pg.goto(base + 'product.html?h=' + sw.h);
  const opts = await pg.$$eval('fieldset.bg-opts legend', l => l.map(x => x.textContent.split(':')[0].trim()));
  ok('variantes: options Couleur et Taille affichées', opts.join(',') === 'Couleur,Taille', opts.join(','));
  const target = sw.v.find(v => v.o[0] !== sw.v[0].o[0] && v.o[1] !== sw.v[0].o[1] && v.a) || sw.v[5];
  await pg.check(`input[data-option="0"][value="${target.o[0]}"]`, { force: true }); await pg.check(`input[data-option="1"][value="${target.o[1]}"]`, { force: true });
  ok('variantes: couleur + taille → bonne variante', Number(await pg.inputValue('input[name=id]')) === target.id, target.o.join(' / '));
  ok('variantes: prix de la variante affiché', (await pg.textContent('[data-v-price]')).replace(/\D/g, '') === String(target.p));
  await pg.click('form[data-add-form] [type=submit]'); await pg.waitForTimeout(500);
  const line = await pg.evaluate(() => window.BG_CART_ADAPTER.get().then(c => c.items.map(i => [i.id, i.variant_title])));
  ok('variantes: ajout panier avec libellé Couleur / Taille', line.length === 1 && line[0][0] === target.id && line[0][1] === target.o.join(' / '), JSON.stringify(line));
  const gc = P.find(p => p.k === 'Autre' && p.v);
  await pg.goto(base + 'product.html?h=' + gc.h);
  ok('carte cadeau: absence d’image explicite, aucune photo inventée', (await pg.textContent('.bg-gal__main')).includes('Visuel à fournir'));
  ok('carte cadeau: un bouton radio par montant', (await pg.$$('input[data-option="0"]')).length === gc.v.length, gc.v.length + ' montants');
  const sold = P.find(p => !p.a && !p.v);
  await pg.goto(base + 'product.html?h=' + sold.h);
  ok('épuisé: bouton désactivé', await pg.$eval('form[data-add-form] [type=submit]', b => b.disabled));
  const noQuick = await (async () => { await pg.goto(base + 'collection.html?k=Vetement'); return (await pg.$$('.bg-card__add')).length; })();
  ok('vêtements: pas d’ajout rapide sans choix de variante', noQuick === 0);
  await ctx.close();

  // 7. 404 + collisions mobiles : pas de débordement sur les nouvelles pages
  ctx = await mk(); pg = await ctx.newPage();
  for (const f of ['search.html', 'collections.html', 'collection.html?k=Vetement', 'collection.html?k=Autre']) {
    await pg.goto(base + f); await pg.waitForTimeout(500);
    ok('mobile390: ' + f + ' sans débordement', (await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 1);
  }
  await pg.goto(base + 'search.html?q=maguen'); await pg.waitForTimeout(500); await pg.screenshot({ path: 'captures/p1-search-mobile390.png' });
  await browser.close(); srv.close();
  const f = results.filter(x => !x).length; console.log('\n' + (results.length - f) + '/' + results.length + ' tests OK'); process.exit(f ? 1 : 0);
})();
