/* Captures et démonstration reproductibles de la refonte (aperçu local rendu depuis le Liquid).
   Prérequis : node tools/preview/build.js && python3 -m http.server 4180 --directory dist-preview
   Usage : node tests/refonte-captures.js <dossier de sortie> [chemin de playwright] */
const OUT = process.argv[2], { chromium } = require(process.argv[3] || 'playwright'), B = 'http://localhost:4180';
const wait = (p, ms) => p.waitForTimeout(ms);
async function orbitAt(p, s) { await p.evaluate((s) => { const o = document.querySelector('[data-orbit]'); const y = o.getBoundingClientRect().top + scrollY; scrollTo(0, y + s * (o.offsetHeight - innerHeight)); }, s); await wait(p, 1400); }
(async () => {
  const br = await chromium.launch();
  const errors = [];
  async function ctx(o) { const c = await br.newContext(Object.assign({ deviceScaleFactor: 1, locale: 'fr-FR', colorScheme: 'dark' }, o)); await c.addInitScript(() => { try { localStorage.setItem('brg-orbit-test', '1'); } catch (e) {} }); return c; }
  async function page(c, url) { const p = await c.newPage(); p.on('pageerror', e => errors.push(url + ' :: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION_RESET|net::ERR/.test(m.text())) errors.push(url + ' :: ' + m.text()); }); await p.goto(B + url, { waitUntil: 'load' }); await wait(p, 1200); return p; }
  /* ordinateur, sombre */
  let c = await ctx({ viewport: { width: 1440, height: 900 } });
  let p = await page(c, '/');
  await p.evaluate(() => { const o = document.querySelector('[data-orbit]'); o.setAttribute('data-autorotate', 'false'); });
  await p.screenshot({ path: `${OUT}/d-01-hero.jpg`, quality: 88 });
  await p.evaluate(() => document.querySelector('[data-showcase]').scrollIntoView()); await wait(p, 1200); await p.screenshot({ path: `${OUT}/d-02-six-collections.jpg`, quality: 88 });
  await p.click('[data-show-nav="1"]'); await wait(p, 1300); await p.screenshot({ path: `${OUT}/d-02b-collection-suivante.jpg`, quality: 88 });
  await orbitAt(p, 0); await p.screenshot({ path: `${OUT}/d-03-orbit-1-galerie.jpg`, quality: 88 });
  await p.click('[data-o-next]'); await wait(p, 1600); await p.screenshot({ path: `${OUT}/d-03-orbit-1b-fleche-suivante.jpg`, quality: 88 });
  const sel = await p.$eval('.orbit__sel [data-o-name]', n => n.textContent);
  const steps = [[0.14, '2-isolation'], [0.3, '3-rapprochement'], [0.44, '4-detail'], [0.58, '5-detail-symbole'], [0.74, '6-recul'], [0.95, '7-sortie']];
  const names = [];
  for (const [s, n] of steps) { await orbitAt(p, s); await p.screenshot({ path: `${OUT}/d-03-orbit-${n}.jpg`, quality: 88 }); names.push(await p.$eval('.story-step.is-on [data-o-name], .story-step.is-on [data-o-family]', x => x.textContent).catch(() => '')); }
  await orbitAt(p, 0.3); await orbitAt(p, 0.02); await p.screenshot({ path: `${OUT}/d-03-orbit-8-retour-galerie.jpg`, quality: 88 });
  const selBack = await p.$eval('.orbit__sel [data-o-name]', n => n.textContent);
  const cta = await p.$eval('.orbit__sel [data-o-cta]', a => a.getAttribute('href'));
  await p.evaluate(() => document.querySelector('.group').scrollIntoView()); await wait(p, 1400); await p.screenshot({ path: `${OUT}/d-04-groupes.jpg`, quality: 88 });
  await p.evaluate(() => document.querySelector('[data-people]').scrollIntoView()); await wait(p, 1400); await p.screenshot({ path: `${OUT}/d-05-personnalites.jpg`, quality: 88 });
  await p.evaluate(() => document.querySelector('.meaning').scrollIntoView()); await wait(p, 1400); await p.screenshot({ path: `${OUT}/d-06-sens.jpg`, quality: 88 });
  await p.evaluate(() => scrollTo(0, document.body.scrollHeight)); await wait(p, 1200); await p.screenshot({ path: `${OUT}/d-07-pied.jpg`, quality: 88 });
  const groupsCount = await p.$$eval('.group', gs => gs.map(g => g.querySelectorAll('.card').length));
  p = await page(c, '/products/pull-modele-classic'); await p.screenshot({ path: `${OUT}/d-08-fiche.jpg`, quality: 88 });
  await p.click('input[data-opt="0"][value="Noir"]', { force: true }); await p.click('input[data-opt="1"][value="L"]', { force: true }); await wait(p, 300);
  const vid = await p.$eval('[name="id"]', i => i.value);
  await p.click('[data-buy-btn]'); await wait(p, 1500); await p.screenshot({ path: `${OUT}/d-09-panier-tiroir.jpg`, quality: 88 });
  const line = await p.$eval('#cart-drawer .line', l => l.innerText.replace(/\s+/g, ' '));
  p = await page(c, '/collections/petek-perles'); await p.screenshot({ path: `${OUT}/d-10-collection.jpg`, quality: 88 });
  p = await page(c, '/pages/le-sens-des-bijoux'); await p.screenshot({ path: `${OUT}/d-11-sens-des-bijoux.jpg`, quality: 88 });
  p = await page(c, '/pages/personnalites'); await p.click('.person__btn >> nth=0'); await wait(p, 900); await p.screenshot({ path: `${OUT}/d-12-portrait-agrandi.jpg`, quality: 88 });
  await c.close();
  /* ordinateur, clair */
  c = await ctx({ viewport: { width: 1440, height: 900 } }); await c.addInitScript(() => localStorage.setItem('brg-theme', 'light'));
  p = await page(c, '/'); await p.screenshot({ path: `${OUT}/l-01-hero.jpg`, quality: 88 }); await orbitAt(p, 0); await p.screenshot({ path: `${OUT}/l-02-orbit.jpg`, quality: 88 }); await orbitAt(p, 0.44); await p.screenshot({ path: `${OUT}/l-03-orbit-detail.jpg`, quality: 88 });
  p = await page(c, '/products/mezouza-pearl-black'); await p.screenshot({ path: `${OUT}/l-04-fiche.jpg`, quality: 88 });
  await c.close();
  /* téléphone */
  c = await ctx({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  p = await page(c, '/'); await p.screenshot({ path: `${OUT}/m-01-hero.jpg`, quality: 88 });
  for (const [s, n] of [[0, 'galerie'], [0.3, 'rapprochement'], [0.45, 'detail'], [0.95, 'sortie']]) { await orbitAt(p, s); await p.screenshot({ path: `${OUT}/m-02-orbit-${n}.jpg`, quality: 88 }); }
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  p = await page(c, '/products/mezouza-pearl-black'); await p.evaluate(() => scrollTo(0, 1400)); await wait(p, 900); await p.screenshot({ path: `${OUT}/m-03-fiche-barre-achat.jpg`, quality: 88 });
  await p.evaluate(() => scrollTo(0, 0)); await p.click('.hdr__burger'); await wait(p, 900); await p.screenshot({ path: `${OUT}/m-04-menu.jpg`, quality: 88 });
  await c.close();
  /* mouvement réduit */
  c = await ctx({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  p = await page(c, '/'); await p.evaluate(() => document.querySelector('#colliers').scrollIntoView()); await wait(p, 900); await p.screenshot({ path: `${OUT}/r-01-orbit-reduit.jpg`, quality: 88 });
  await p.click('[data-o-next]'); await wait(p, 300); const rmSel = await p.$eval('.orbit__sel [data-o-name]', n => n.textContent);
  const rmHeight = await p.$eval('[data-orbit]', o => Math.round(o.offsetHeight / innerHeight * 100) / 100);
  await c.close();
  /* démonstration vidéo de la séquence (aller et retour) */
  c = await ctx({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: OUT, size: { width: 1280, height: 800 } } });
  p = await page(c, '/#colliers'); await wait(p, 1200);
  await p.click('[data-o-next]'); await wait(p, 1400); await p.click('[data-o-next]'); await wait(p, 1400); await p.click('[data-o-prev]'); await wait(p, 1600);
  for (let i = 0; i < 46; i++) { await p.mouse.wheel(0, 120); await wait(p, 170); }
  await wait(p, 900);
  for (let i = 0; i < 46; i++) { await p.mouse.wheel(0, -120); await wait(p, 140); }
  await wait(p, 1500);
  const video = await p.video().path(); await c.close();
  await br.close();
  console.log(JSON.stringify({ selection: sel, storyNames: names, selectionAfterReturn: selBack, ctaHref: cta, groupsCount, variantNoirL: vid, cartLine: line, mobileOverflowPx: overflow, reducedMotion: { afterNext: rmSel, orbitHeightScreens: rmHeight }, video, errors }, null, 1));
})();
