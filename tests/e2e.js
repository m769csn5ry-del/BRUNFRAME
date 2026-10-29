// Tests e2e de la prévisualisation locale (Playwright préinstallé). Usage: node tests/e2e.js
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const srv = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'text/plain' }); r.end(fs.readFileSync(f));
});
const results = []; const ok = (n, c, d = '') => { results.push([c, n, d]); console.log((c ? 'PASS ' : 'FAIL ') + n + (d ? ' — ' + d : '')); };
(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://localhost:' + srv.address().port + '/preview/';
  const browser = await chromium.launch();
  const sizes = [['mobile360', 360, 740, true], ['mobile390', 390, 844, true], ['tablet768', 768, 1024, false], ['laptop1280', 1280, 800, false], ['desktop1440', 1440, 900, false]];
  for (const [name, w, h, touch] of sizes) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch });
    const pg = await ctx.newPage(); const errs = [];
    pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await pg.goto(base + 'index.html'); await pg.evaluate(() => sessionStorage.setItem('bg_intro', '1')); await pg.reload();
    await pg.waitForTimeout(2500);
    const ov = await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    ok(`${name}: pas de débordement horizontal`, ov <= 1, 'delta=' + ov);
    ok(`${name}: aucune erreur console`, errs.length === 0, errs.join('|'));
    await pg.screenshot({ path: `captures/home-${name}.png` });
    if (name === 'desktop1440') {
      const s0 = await pg.evaluate(() => document.querySelector('[data-bg-rail]').BGRail.state);
      const box = await pg.locator('.bg-rail canvas').boundingBox();
      await pg.mouse.move(box.x + 300, box.y + 40); await pg.mouse.down();
      for (let i = 0; i < 12; i++) await pg.mouse.move(box.x + 300 - i * 25, box.y + 40 + i, { steps: 1 });
      const mid = await pg.evaluate(() => document.querySelector('[data-bg-rail]').BGRail.chains().map(c => c.p[c.hi].x));
      await pg.screenshot({ path: 'captures/rail-drag-desktop1440.png' });
      await pg.mouse.up(); await pg.waitForTimeout(150);
      const s1 = await pg.evaluate(() => document.querySelector('[data-bg-rail]').BGRail.state);
      ok('rail: drag déplace la tringle', Math.abs(s1.off - s0.off) > 20, `off ${s0.off.toFixed(0)}→${s1.off.toFixed(0)}`);
      await pg.waitForTimeout(700);
      const s2 = await pg.evaluate(() => document.querySelector('[data-bg-rail]').BGRail.state);
      ok('rail: inertie après relâchement', Math.abs(s2.off - s1.off) > 3 || Math.abs(s1.vel) > .5, `vel=${s1.vel.toFixed(1)} Δ=${(s2.off - s1.off).toFixed(0)}`);
      const x1 = await pg.evaluate(() => document.querySelector('[data-bg-rail]').BGRail.chains().map(c => Math.round(c.p[c.hi].x - c.p[0].x)));
      await pg.waitForTimeout(2500);
      const x2 = await pg.evaluate(() => document.querySelector('[data-bg-rail]').BGRail.chains().map(c => Math.round(c.p[c.hi].x - c.p[0].x)));
      ok('rail: pendentifs en mouvement puis amortis (balancement)', JSON.stringify(x1) !== JSON.stringify(x2), JSON.stringify(x1) + ' → ' + JSON.stringify(x2));
      ok('rail: ≥3 colliers', (await pg.evaluate(() => document.querySelector('[data-bg-rail]').BGRail.items.length)) >= 3);
      /* clavier + panneau */
      await pg.focus('[data-bg-rail]'); await pg.keyboard.press('ArrowRight'); await pg.waitForTimeout(900);
      ok('rail: clavier ouvre le panneau', await pg.isVisible('[data-rail-panel]'), await pg.textContent('[data-p-title]'));
      await pg.screenshot({ path: 'captures/rail-selected-desktop1440.png' });
      await pg.click('[data-p-add]'); await pg.waitForSelector('.bg-drawer.is-open');
      ok('panier: ajout depuis la tringle + tiroir', (await pg.textContent('[data-cart-count]')) === '1');
      await pg.screenshot({ path: 'captures/cart-desktop1440.png' });
      await pg.click('[data-q][data-d="1"]'); await pg.waitForTimeout(100);
      ok('panier: quantité +1', (await pg.textContent('.bg-qty output')) === '2');
      ok('panier: sous-total réel', /158/.test(await pg.textContent('[data-cart-subtotal]')), await pg.textContent('[data-cart-subtotal]'));
      ok('panier: progression livraison offerte (seuil dépassé)', /Livraison offerte/.test(await pg.textContent('.bg-ship')));
      await pg.click('[data-q][data-d="-999"]'); await pg.waitForTimeout(100);
      ok('panier: retrait → panier vide élégant', /vide/.test(await pg.textContent('[data-cart-body]')));
    }
    await ctx.close();
  }
  /* mobile : drag tactile sans bloquer le scroll vertical */
  { const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const pg = await ctx.newPage();
    await pg.goto(base + 'index.html'); await pg.evaluate(() => sessionStorage.setItem('bg_intro', '1')); await pg.waitForTimeout(500);
    const ta = await pg.evaluate(() => getComputedStyle(document.querySelector('.bg-rail canvas')).touchAction);
    ok('mobile: touch-action pan-y (scroll vertical conservé)', ta === 'pan-y', ta);
    await pg.screenshot({ path: 'captures/home-mobile-top.png' }); await ctx.close(); }
  /* produit + variantes */
  { const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.goto(base + 'product.html?h=necklace-maguen-chrome'); await pg.waitForTimeout(300);
    const sku1 = await pg.textContent('[data-v-sku]'), img1 = await pg.getAttribute('[data-main-img]', 'src');
    await pg.click('.bg-opt:nth-child(2) .bg-swatch', { force: true }); await pg.waitForTimeout(100);
    const sku2 = await pg.textContent('[data-v-sku]'), img2 = await pg.getAttribute('[data-main-img]', 'src');
    ok('fiche: variante change SKU + image + id', sku1 !== sku2 && img1 !== img2 && (await pg.inputValue('[name=id]')) !== '', `${sku1}→${sku2}`);
    await pg.screenshot({ path: 'captures/product-desktop1280.png' });
    await pg.goto(base + 'product.html?h=necklace-fire-2-0'); await pg.waitForTimeout(200);
    await pg.click('.bg-opt:nth-child(2) .bg-swatch', { force: true });
    ok('fiche: variante épuisée → bouton désactivé', await pg.isDisabled('[data-add-form] [type=submit]'));
    await pg.goto(base + 'collection.html'); await pg.waitForTimeout(200);
    const n0 = await pg.locator('.bg-card').count(); await pg.click('#filters >> text=Petek');
    ok('collection: filtre type', (await pg.locator('.bg-card').count()) < n0, `${n0}→${await pg.locator('.bg-card').count()}`);
    await pg.click('#filters >> text=Petek'); await pg.selectOption('#sort', 'pa');
    const first = await pg.textContent('.bg-card .bg-card__p'); ok('collection: tri prix croissant', /49/.test(first), first);
    await pg.screenshot({ path: 'captures/collection-desktop1280.png' });
    await pg.goto(base + '404.html'); ok('404 présent', await pg.isVisible('.bg-404'));
    ok('fiche/collection: aucune erreur JS', errs.length === 0, errs.join('|')); await ctx.close(); }
  /* reduced-motion : pas d'animation continue, rendu statique */
  { const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.goto(base + 'index.html'); await pg.waitForTimeout(600);
    ok('reduced-motion: intro absente', (await pg.locator('[data-intro]').count()) === 0);
    const a = await pg.evaluate(() => document.querySelector('[data-bg-rail]').BGRail.chains().map(c => c.p[c.hi].y.toFixed(2)).join());
    await pg.waitForTimeout(700);
    const b = await pg.evaluate(() => document.querySelector('[data-bg-rail]').BGRail.chains().map(c => c.p[c.hi].y.toFixed(2)).join());
    ok('reduced-motion: tringle statique (aucune boucle)', a === b);
    await pg.click('[data-bg-rail] canvas', { position: { x: 640, y: 300 } }).catch(() => { });
    await pg.screenshot({ path: 'captures/home-reduced-motion.png' });
    ok('reduced-motion: aucune erreur', errs.length === 0, errs.join('|')); await ctx.close(); }
  /* fallback sans canvas 2D */
  { const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const pg = await ctx.newPage();
    await pg.addInitScript(() => { HTMLCanvasElement.prototype.getContext = () => null; });
    await pg.goto(base + 'index.html'); await pg.waitForTimeout(500);
    ok('fallback sans canvas: cartes produit accessibles + pas de crash', (await pg.locator('#featured .bg-card').count()) >= 3 && (await pg.locator('.bg-rail.is-fallback').count()) === 1);
    await ctx.close(); }
  await browser.close(); srv.close();
  const f = results.filter(r => !r[0]); console.log(`\n${results.length - f.length}/${results.length} tests OK`); process.exit(f.length ? 1 : 0);
})();
