// Captures visuelles locales. cdn.shopify.com et breslevgang.com étant bloqués dans le sandbox,
// leurs images sont remplacées par tests/fixtures/substitute.jpg (QA de mise en page uniquement).
// Usage : node tests/visual.js [prefix]
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const sub = fs.readFileSync(path.join(__dirname, 'fixtures/substitute.jpg')), pre = process.argv[2] || 'v';
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'text/plain' }); r.end(fs.readFileSync(f)); });
(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://localhost:' + srv.address().port + '/preview/';
  const b = await chromium.launch();
  const shots = [['index.html', 1440, 900, 'home-desktop'], ['index.html', 390, 844, 'home-iphone'], ['collection.html?k=Collier', 1280, 800, 'collection'], ['product.html?h=necklace-fire-pearl-blue', 390, 844, 'product-iphone'], ['product.html?h=necklace-fire-pearl-blue', 1440, 900, 'product-desktop']];
  for (const [u, w, h, name] of shots) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 500 ? 2 : 1, hasTouch: w < 500, isMobile: w < 500 });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.route(/cdn\.shopify\.com|breslevgang\.com\/cdn/, r => r.request().resourceType() === 'image' ? r.fulfill({ body: sub, contentType: 'image/jpeg' }) : r.abort());
    await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await p.addInitScript(() => sessionStorage.setItem('bg_intro', '1'));
    await p.goto(base + u); await p.waitForTimeout(3200);
    await p.screenshot({ path: `captures/${pre}-${name}.png` });
    if (name === 'home-desktop' || name === 'home-iphone') { for (let y = 0; y < 12000; y += h * .7) { await p.evaluate(v => scrollTo(0, v), y); await p.waitForTimeout(160); } await p.waitForTimeout(1300); await p.evaluate(() => scrollTo(0, 0)); await p.screenshot({ path: `captures/${pre}-${name}-full.png`, fullPage: true }); }
    if (name.startsWith('home')) { await p.evaluate(() => scrollTo(0, 0)); await p.focus('[data-bg-rail]'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(1500);
      if (w < 500) await p.evaluate(() => document.querySelector('[data-rail-panel]').scrollIntoView({ block: 'end' }));
      await p.waitForTimeout(300); await p.screenshot({ path: `captures/${pre}-${name}-selected.png` }); }
    console.log(name, errs.length ? errs : 'ok'); await ctx.close();
  }
  await b.close(); srv.close();
})();
