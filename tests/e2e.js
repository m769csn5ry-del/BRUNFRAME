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
const block = async ctx => { await ctx.route(/^https?:\/\/(?!localhost)/, r => r.abort()); return ctx; };
const results = []; const ok = (n, c, d = '') => { results.push([c, n, d]); console.log((c ? 'PASS ' : 'FAIL ') + n + (d ? ' — ' + d : '')); };
(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://localhost:' + srv.address().port + '/preview/';
  const browser = await chromium.launch();
  const sizes = [['mobile360', 360, 740, true], ['mobile390', 390, 844, true], ['tablet768', 768, 1024, false], ['laptop1280', 1280, 800, false], ['desktop1440', 1440, 900, false]];
  for (const [name, w, h, touch] of sizes) {
    const ctx = await block(await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch }));
    const pg = await ctx.newPage(); const errs = [];
    pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
    await pg.goto(base + 'index.html'); await pg.evaluate(() => sessionStorage.setItem('bg_intro', '1')); await pg.reload();
    await pg.waitForTimeout(2500);
    const ov = await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    ok(`${name}: pas de débordement horizontal`, ov <= 1, 'delta=' + ov);
    ok(`${name}: aucune erreur console`, errs.length === 0, errs.join('|'));
    await pg.screenshot({ path: `captures/home-${name}.png` });
    if (name === 'desktop1440') {
      const O = () => pg.evaluate(() => document.querySelector('[data-orbit]').BGOrbit.state);
      const items = await pg.evaluate(() => document.querySelector('[data-orbit]').BGOrbit.items.map(i => ({ t: i.title, c: i.tone[0] })));
      ok('orbite: ≥3 colliers réels', items.length >= 3, items.map(i => i.t).join(' | '));
      const s0 = await O(), box = await pg.locator('[data-orbit-stage]').boundingBox();
      await pg.mouse.move(box.x + box.width * .62, box.y + box.height * .45); await pg.mouse.down();
      for (let i = 1; i <= 12; i++) await pg.mouse.move(box.x + box.width * .62 - i * 30, box.y + box.height * .45 + i, { steps: 1 });
      const mid = await O(); await pg.screenshot({ path: 'captures/orbit-drag-desktop1440.png' });
      ok('orbite: le glissé fait tourner la galerie', Math.abs(mid.pos - s0.pos) > .3, `pos ${s0.pos.toFixed(2)}→${mid.pos.toFixed(2)}`);
      await pg.mouse.up(); await pg.waitForTimeout(1400);
      const s1 = await O();
      ok('orbite: inertie maîtrisée, arrêt sur une sélection lisible', s1.pos === s1.target && Number.isInteger(s1.target) && s1.sel !== s0.sel, `sel ${s0.sel}→${s1.sel}`);
      ok('orbite: le glissé ne déclenche pas de clic (reste en galerie)', s1.phase === 'gallery' && (await pg.evaluate(() => scrollY)) === 0);
      ok('orbite: nom affiché = pièce sélectionnée', (await pg.textContent('[data-orbit-label] .bg-orbit__name')) === items[s1.sel].t, items[s1.sel].t);
      const hex = h => 'rgb(' + [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(', ') + ')';
      await pg.waitForTimeout(1000);
      ok('orbite: fond propre au collier sélectionné', (await pg.evaluate(() => getComputedStyle(document.querySelector('[data-orbit]')).getPropertyValue('--c1').trim())) === hex(items[s1.sel].c), items[s1.sel].c);
      await pg.focus('.bg-orbit__item[aria-pressed=true]'); await pg.keyboard.press('ArrowRight'); await pg.waitForTimeout(900);
      ok('orbite: clavier → pièce suivante', (await O()).sel === (s1.sel + 1) % items.length);
      await pg.evaluate(() => document.querySelector('[data-orbit]').BGOrbit.go(0)); await pg.waitForTimeout(1200);
      await pg.click('[data-orbit-enter]'); await pg.waitForTimeout(1800);
      const s2 = await O();
      ok('orbite: « Découvrir » isole la même pièce et ouvre le récit', s2.phase === 'product-story' && s2.sel === 0 && (await pg.textContent('[data-orbit-chapter="1"] h2')) === items[0].t, s2.phase + ' p=' + s2.p.toFixed(2));
      ok('orbite: voisins masqués pendant le récit', (await pg.$$eval('.bg-orbit__item', es => es.filter(e => e.getAttribute('aria-pressed') !== 'true' && getComputedStyle(e).visibility !== 'hidden' && +getComputedStyle(e).opacity > .05).length)) === 0);
      await pg.screenshot({ path: 'captures/orbit-story-desktop1440.png' });
      await pg.click('[data-orbit-chapter="1"] [data-o-add]'); await pg.waitForSelector('.bg-drawer.is-open');
      ok('panier: ajout depuis le récit de la galerie + tiroir', (await pg.textContent('[data-cart-count]')) === '1');
      await pg.screenshot({ path: 'captures/cart-desktop1440.png' });
      await pg.click('[data-q][data-d="1"]'); await pg.waitForTimeout(100);
      ok('panier: quantité +1', (await pg.textContent('.bg-qty output')) === '2');
      ok('panier: sous-total réel', /180/.test(await pg.textContent('[data-cart-subtotal]')), await pg.textContent('[data-cart-subtotal]'));
      ok('panier: progression livraison offerte (seuil dépassé)', /Livraison offerte/.test(await pg.textContent('.bg-ship')));
      await pg.click('[data-q][data-d="-999"]'); await pg.waitForTimeout(100);
      ok('panier: retrait → panier vide élégant', /vide/.test(await pg.textContent('[data-cart-body]')));
    }
    await ctx.close();
  }
  /* mobile : drag tactile sans bloquer le scroll vertical */
  { const ctx = await block(await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })); const pg = await ctx.newPage();
    await pg.goto(base + 'index.html'); await pg.evaluate(() => sessionStorage.setItem('bg_intro', '1')); await pg.reload(); await pg.waitForTimeout(800);
    const ta = await pg.evaluate(() => getComputedStyle(document.querySelector('[data-orbit-stage]')).touchAction);
    ok('mobile: touch-action pan-y (scroll vertical conservé)', ta === 'pan-y', ta);
    const cdp = await ctx.newCDPSession(pg); const sel0 = await pg.evaluate(() => document.querySelector('[data-orbit]').BGOrbit.state.sel);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 300, y: 360 }] });
    for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 300 - 18 * i, y: 362 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await pg.waitForTimeout(1200);
    const st = await pg.evaluate(() => document.querySelector('[data-orbit]').BGOrbit.state);
    ok('mobile: swipe tactile change de collier', st.sel !== sel0 && st.pos === st.target, `sel ${sel0}→${st.sel}`);
    await pg.screenshot({ path: 'captures/home-mobile-top.png' }); await ctx.close(); }
  /* produit + variantes */
  { const ctx = await block(await browser.newContext({ viewport: { width: 1280, height: 800 } })); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.goto(base + 'product.html?h=necklace-fire-pearl-blue'); await pg.waitForTimeout(300);
    const id1 = await pg.inputValue('[name=id]'), img1 = await pg.getAttribute('[data-main-img]', 'src'), t1 = await pg.textContent('[data-v-title]');
    await pg.check('.bg-opt:nth-child(2) input', { force: true }); await pg.waitForTimeout(100);
    const id2 = await pg.inputValue('[name=id]'), img2 = await pg.getAttribute('[data-main-img]', 'src'), t2 = await pg.textContent('[data-v-title]');
    ok('fiche: coloris regroupé change id + image + titre', id1 !== id2 && img1 !== img2 && t1 !== t2 && id2 !== '', `${t1}→${t2}`);
    await pg.screenshot({ path: 'captures/product-desktop1280.png' });
    await pg.goto(base + 'product.html?h=petek-croco-1-1-vert'); await pg.waitForTimeout(200);
    ok('fiche: pièce épuisée → bouton désactivé', await pg.isDisabled('[data-add-form] [type=submit]'));
    await pg.goto(base + 'collection.html?k=Collier'); await pg.waitForTimeout(200);
    const c0 = await pg.textContent('#count'); await pg.click('#filters >> text=/Maguen David/');
    const c1 = await pg.textContent('#count'); ok('collection: filtre famille', parseInt(c1) < parseInt(c0), `${c0} → ${c1}`);
    await pg.click('#filters >> text=/Maguen David/'); await pg.selectOption('#sort', 'pa');
    const pr = await pg.$$eval('.bg-card__p', n => n.slice(0, 6).map(x => parseFloat(x.textContent.replace(/[^0-9,]/g, '').replace(',', '.'))));
    ok('collection: tri prix croissant', pr.every((v, i) => !i || v >= pr[i - 1]), pr.join(' ≤ '));
    await pg.check('#grp'); const c2 = await pg.textContent('#count'); ok('collection: regroupement 1 modèle = 1 fiche', parseInt(c2) < parseInt(c0), c2);
    await pg.screenshot({ path: 'captures/collection-desktop1280.png' });
    await pg.goto(base + '404.html'); ok('404 présent', await pg.isVisible('.bg-404'));
    ok('fiche/collection: aucune erreur JS', errs.length === 0, errs.join('|')); await ctx.close(); }
  /* reduced-motion : pas d'animation continue, rendu statique */
  { const ctx = await block(await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' })); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.goto(base + 'index.html'); await pg.waitForTimeout(600);
    ok('reduced-motion: intro absente', (await pg.locator('[data-intro]').count()) === 0);
    const st = await pg.evaluate(() => ({ s: document.querySelector('[data-orbit]').classList.contains('is-static'), h: document.querySelector('[data-orbit]').offsetHeight, ch: getComputedStyle(document.querySelector('[data-orbit-chapter="1"]')).visibility }));
    ok('reduced-motion: galerie stable, récit lisible sans défilement imposé', st.s && st.h < 3 * 800 && st.ch === 'visible', JSON.stringify(st));
    await pg.click('[data-orbit-next]'); await pg.waitForTimeout(300);
    ok('reduced-motion: changement de collier possible', (await pg.evaluate(() => document.querySelector('[data-orbit]').BGOrbit.state.sel)) === 1);
    await pg.screenshot({ path: 'captures/home-reduced-motion.png' });
    ok('reduced-motion: aucune erreur', errs.length === 0, errs.join('|')); await ctx.close(); }
  /* fallback : liste de liens et cartes accessibles sans dépendre de l'animation */
  { const ctx = await block(await browser.newContext({ viewport: { width: 1280, height: 800 } })); const pg = await ctx.newPage();
    await pg.goto(base + 'index.html'); await pg.waitForTimeout(500);
    ok('fallback: liens des colliers + cartes produit dans le DOM', (await pg.locator('#orbit-list a').count()) >= 3 && (await pg.locator('#best .bg-card').count()) >= 3 && (await pg.locator('.bg-faq details').count()) >= 3);
    await ctx.close(); }
  await browser.close(); srv.close();
  const f = results.filter(r => !r[0]); console.log(`\n${results.length - f.length}/${results.length} tests OK`); process.exit(f.length ? 1 : 0);
})();
