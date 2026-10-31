/* Captures et preuve vidéo du correctif « bijoux flottants » (aperçu local).
   Usage : node tests/correctif-captures.js <dossier de sortie> <chemin du module playwright> [url]
   Produit : d-* (ordinateur sombre), l-* (clair), m-* (téléphone sombre), n-* (téléphone clair), video/*.webm, mesures.json */
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2];
const { chromium } = require(process.argv[3]);
const URL = (process.argv[4] || 'http://localhost:4180').replace(/\/$/, '');
fs.mkdirSync(path.join(OUT, 'video'), { recursive: true });
const report = { cadrages: {}, fluidite: {}, erreurs: {} };
const shot = (p, name) => p.screenshot({ path: path.join(OUT, name + '.jpg'), quality: 82 });
const toFloat = (p, pr) => p.evaluate((pr) => { const s = document.querySelector('[data-float]'); const top = s.getBoundingClientRect().top + scrollY; scrollTo(0, top + (s.offsetHeight - innerHeight) * pr); }, pr);
const settle = (p) => p.waitForFunction(() => { const s = window.BRG.float.state(); return Math.abs(s.pos - s.target) < 0.001; }, null, { timeout: 4000 }).catch(() => {});
const framing = (p) => p.evaluate(() => {
  const sel = '.card__media img, .gallery__item img, .compo__item img, .person__btn img, .line__img img, .coll-tile img, .flt__plate img:not(.is-crop)';
  const imgs = Array.from(document.querySelectorAll(sel)).filter(i => i.offsetParent);
  const bad = imgs.filter(i => getComputedStyle(i).objectFit !== 'contain');
  return { images: imgs.length, recadrees: bad.length, exemples: bad.slice(0, 3).map(i => i.className + ' ' + (i.currentSrc || '').slice(-40)) };
});

async function home(ctx, tag, mobile) {
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '/', { waitUntil: 'load' });
  await p.waitForTimeout(900);
  await shot(p, `${tag}-01-ouverture`);
  await toFloat(p, 0); await p.waitForTimeout(900);
  await shot(p, `${tag}-02-galerie`);
  if (!mobile) {
    await p.click('[data-f-next]'); await p.click('[data-f-next]'); await settle(p); await p.waitForTimeout(500);
    await shot(p, `${tag}-03-galerie-fleches`);
  } else {
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 300, y: 420 }] });
    for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 300 - i * 24, y: 421 }] }); await p.waitForTimeout(14); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await settle(p); await p.waitForTimeout(500);
    await shot(p, `${tag}-03-galerie-balayage`);
  }
  for (const [pr, n] of [[0.14, '04-isolement'], [0.3, '05-rapprochement'], [0.47, '06-detail'], [0.62, '07-detail-2'], [0.78, '08-recul'], [0.96, '09-retour-galerie']]) {
    await toFloat(p, pr); await p.waitForTimeout(700); await shot(p, `${tag}-${n}`);
  }
  const fr = await p.evaluate(async () => {
    const s = document.querySelector('[data-float]'); const top = s.getBoundingClientRect().top + scrollY, span = s.offsetHeight - innerHeight;
    const f = []; let l = 0, run = true; const tick = (t) => { if (l) f.push(t - l); l = t; if (run) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
    for (let k = 0; k <= 90; k++) { scrollTo(0, top + span * k / 90); await new Promise(r => setTimeout(r, 16)); }
    run = false; f.sort((a, b) => a - b); return { median: +f[f.length >> 1].toFixed(1), p95: +f[Math.floor(f.length * 0.95)].toFixed(1), images: f.length };
  });
  report.fluidite[tag + ' défilement de la séquence'] = fr;
  for (const [id, n] of [['groups', '10-familles'], ['others', '11-autres-univers'], ['people', '12-portraits']]) {
    await p.evaluate((id) => { const s = document.getElementById('shopify-section-' + id) || document.querySelector('[id$="' + id + '"]'); (s || document.body).scrollIntoView(); }, id);
    await p.waitForTimeout(800); await shot(p, `${tag}-${n}`);
  }
  report.cadrages[tag + ' accueil'] = await framing(p);
  report.erreurs[tag + ' accueil'] = errs;
  await p.close();
}

async function product(ctx, tag, mobile) {
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '/products/necklace-chrome-fire-26', { waitUntil: 'load' }); await p.waitForTimeout(700);
  await shot(p, `${tag}-20-fiche`);
  await p.evaluate(() => document.querySelectorAll('.acc details').forEach(d => { d.open = true; }));
  await p.evaluate(() => document.querySelector('.acc').scrollIntoView({ block: 'center' })); await p.waitForTimeout(400);
  await shot(p, `${tag}-21-fiche-accordeons`);
  report.cadrages[tag + ' fiche'] = await framing(p);
  // variante : bon média, cadrage entier
  await p.goto(URL + '/products/pull-modele-classic', { waitUntil: 'load' }); await p.waitForTimeout(600);
  const opt = await p.$$('.opt__btn');
  if (opt.length > 2) { await opt[2].click(); await p.waitForTimeout(500); }
  await shot(p, `${tag}-22-fiche-vetement-variante`);
  // zoom volontaire et réinitialisation
  await p.goto(URL + '/products/mezouza-pearl-black', { waitUntil: 'load' }); await p.waitForTimeout(500);
  await p.click('.gallery__item'); await p.waitForTimeout(700);
  await shot(p, `${tag}-23-visionneuse`);
  await p.click('[data-lb-zoom]'); await p.waitForTimeout(500);
  await shot(p, `${tag}-24-visionneuse-zoom`);
  const zoomed = await p.evaluate(() => getComputedStyle(document.querySelector('.lightbox__stage img')).transform);
  await p.click('[data-lb-reset]'); await p.waitForTimeout(400);
  const reset = await p.evaluate(() => getComputedStyle(document.querySelector('.lightbox__stage img')).transform);
  report.cadrages[tag + ' zoom'] = { zoom: zoomed, apres_reinitialisation: reset };
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  // panier : produit ajouté identique à la fiche
  await p.goto(URL + '/products/necklace-fire-2-0', { waitUntil: 'load' }); await p.waitForTimeout(400);
  await p.click('[data-add-form] [data-buy-btn]'); await p.waitForTimeout(1200);
  const line = await p.evaluate(() => { const l = document.querySelector('.drawer .line__title, [data-cart-lines] .line__title'); return l ? l.textContent.trim() : null; });
  report.cadrages[tag + ' panier'] = { ligne: line, attendu: 'Necklace fire 2.0' };
  await shot(p, `${tag}-25-panier`);
  if (!mobile) {
    await p.goto(URL + '/collections/types?q=Petek%20%C3%A0%20chaine', { waitUntil: 'load' }); await p.waitForTimeout(700);
    await shot(p, `${tag}-26-famille-peteks-chaine`);
    report.cadrages[tag + ' collection'] = await framing(p);
  }
  report.erreurs[tag + ' fiches'] = errs;
  await p.close();
}

(async () => {
  const b = await chromium.launch();
  const confs = [['d', 1440, 900, false, 'dark'], ['l', 1440, 900, false, 'light'], ['m', 390, 844, true, 'dark'], ['n', 390, 844, true, 'light']];
  for (const [tag, w, h, mobile, theme] of confs) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 2 : 1, hasTouch: mobile, isMobile: mobile });
    await ctx.addInitScript((t) => { try { localStorage.setItem('brg-theme', t); sessionStorage.clear(); localStorage.removeItem('brg-preview-cart'); } catch (e) {} }, theme);
    await home(ctx, tag, mobile);
    await product(ctx, tag, mobile);
    await ctx.close();
  }
  /* preuve vidéo : glisser avec élan, recalage, mouvement de chaîne, flèches, rapprochement au défilement, changement de thème */
  const vctx = await b.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: path.join(OUT, 'video'), size: { width: 1280, height: 800 } } });
  await vctx.addInitScript(() => { try { localStorage.setItem('brg-theme', 'dark'); sessionStorage.clear(); } catch (e) {} });
  const v = await vctx.newPage();
  await v.goto(URL + '/', { waitUntil: 'load' }); await v.waitForTimeout(1200);
  await toFloat(v, 0); await v.waitForTimeout(1200);
  const drag = async (dx, steps, dt) => { await v.mouse.move(640, 400); await v.mouse.down(); for (let i = 1; i <= steps; i++) { await v.mouse.move(640 + dx * i / steps, 401); await v.waitForTimeout(dt); } await v.mouse.up(); };
  await drag(-260, 8, 14); await v.waitForTimeout(1400);
  await drag(-120, 10, 30); await v.waitForTimeout(1300);
  await drag(380, 9, 14); await v.waitForTimeout(1500);
  await v.click('[data-f-next]'); await v.waitForTimeout(500); await v.click('[data-f-next]'); await v.waitForTimeout(1300);
  await v.click('[data-f-prev]'); await v.waitForTimeout(1200);
  await v.evaluate(() => document.querySelector('[data-theme-toggle]').click()); await v.waitForTimeout(1200);
  await drag(-200, 8, 16); await v.waitForTimeout(1300);
  await v.evaluate(() => document.querySelector('[data-theme-toggle]').click()); await v.waitForTimeout(900);
  for (let k = 0; k <= 60; k++) { await toFloat(v, k / 60); await v.waitForTimeout(70); }
  await v.waitForTimeout(600);
  for (let k = 60; k >= 0; k -= 2) { await toFloat(v, k / 60); await v.waitForTimeout(45); }
  await v.waitForTimeout(1200);
  await vctx.close();
  fs.writeFileSync(path.join(OUT, 'mesures.json'), JSON.stringify(report, null, 1));
  console.log(JSON.stringify(report, null, 1));
  await b.close();
})();
