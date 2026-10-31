/* Recette de la galerie flottante (aperçu local) : glisser, inertie, flèches, clavier, tactile, clics, thème, défilement.
   Usage : node tests/float-interactions.js <chemin vers le module playwright> [url]
   Sortie : JSON des contrôles (ok/échec) et des mesures de fluidité. */
const { chromium } = require(process.argv[2]);
const URL = process.argv[3] || 'http://localhost:4180/';
const results = [];
const check = (name, ok, info) => { results.push({ name, ok: !!ok, info }); };
const state = (p) => p.evaluate(() => Object.assign(window.BRG.float.state(), {
  name: document.querySelector('[data-f-name]').textContent,
  cta: document.querySelector('[data-f-cta]').getAttribute('href'),
  inst: window.BRG.float.instances
}));
const settle = (p) => p.waitForFunction(() => { const s = window.BRG.float.state(); return Math.abs(s.pos - s.target) < 0.001 && s.pos === Math.round(s.pos); }, null, { timeout: 4000 }).catch(() => {});
const consistent = async (p, label) => {
  const s = await state(p);
  const d = await p.evaluate(() => JSON.parse(document.querySelector('[data-float-data]').textContent));
  const ok = d[s.sel] && d[s.sel].title === s.name && d[s.sel].url === s.cta && s.handle === d[s.sel].handle && s.pos === s.sel;
  check(label, ok, s);
  return s;
};

(async () => {
  const b = await chromium.launch();
  /* ---------- ordinateur ---------- */
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { sessionStorage.clear(); localStorage.setItem('brg-theme', 'dark'); } catch (e) {} });
  await p.goto(URL, { waitUntil: 'load' });
  await p.evaluate(() => { const s = document.querySelector('[data-float]'); scrollTo(0, s.getBoundingClientRect().top + scrollY); });
  await p.waitForTimeout(600);
  const cx = 720, cy = 420;
  /* fluidité pendant un geste rapide : intervalles entre images */
  await p.evaluate(() => { window.__f = []; let l = 0; const tick = (t) => { if (l) window.__f.push(t - l); l = t; if (window.__f.length < 240) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  // geste rapide vers la gauche : élan limité
  await p.mouse.move(cx, cy); await p.mouse.down();
  for (let i = 1; i <= 8; i++) { await p.mouse.move(cx - i * 40, cy); await p.waitForTimeout(12); }
  await p.mouse.up(); await settle(p);
  let s = await consistent(p, 'geste rapide : photo, nom, prix et lien synchronisés');
  check('geste rapide : élan limité (1 à 3 pièces)', s.sel >= 1 && s.sel <= 3, s.sel);
  check('relâchement après glisser : aucune fiche ouverte', (await p.url()) === URL, await p.url());
  // geste lent et court : au plus une pièce
  const before = s.sel;
  await p.mouse.move(cx, cy); await p.mouse.down();
  for (let i = 1; i <= 6; i++) { await p.mouse.move(cx - i * 8, cy); await p.waitForTimeout(40); }
  await p.waitForTimeout(150); await p.mouse.up(); await settle(p);
  s = await consistent(p, 'geste court : état cohérent');
  check('geste court : au plus une pièce', Math.abs(s.sel - before) <= 1, [before, s.sel]);
  // changements de direction rapides dans un même geste
  await p.mouse.move(cx, cy); await p.mouse.down();
  for (const dx of [-60, -140, -60, 60, 160, 90, -30]) { await p.mouse.move(cx + dx, cy); await p.waitForTimeout(25); }
  await p.mouse.up(); await settle(p);
  await consistent(p, 'allers-retours rapides : aucun saut, état cohérent');
  // résistance aux extrémités
  await p.click('[data-f-prev]'); await p.click('[data-f-prev]'); await p.click('[data-f-prev]'); await p.click('[data-f-prev]'); await settle(p);
  await p.mouse.move(cx, cy); await p.mouse.down();
  for (let i = 1; i <= 10; i++) { await p.mouse.move(cx + i * 40, cy); await p.waitForTimeout(16); }
  const over = await p.evaluate(() => window.BRG.float.state().pos);
  await p.mouse.up(); await settle(p);
  s = await consistent(p, 'extrémité : retour souple sur la première pièce');
  check('extrémité : résistance (dépassement limité)', over < 0 && over > -0.4 && s.sel === 0, over);
  // flèches répétées rapidement
  for (let i = 0; i < 3; i++) await p.click('[data-f-next]', { delay: 10 });
  await settle(p);
  s = await consistent(p, 'flèches rapides ×3 : état cohérent');
  check('flèches rapides ×3 : trois pièces', s.sel === 3, s.sel);
  await p.click('[data-f-prev]'); await settle(p);
  s = await consistent(p, 'flèche précédente');
  // clavier
  await p.focus('[data-f-stage]'); await p.keyboard.press('ArrowRight'); await settle(p);
  s = await consistent(p, 'clavier : flèche droite');
  check('clavier : +1', s.sel === 3, s.sel);
  await p.keyboard.press('Home'); await settle(p);
  check('clavier : Début', (await state(p)).sel === 0);
  // clic sur une voisine : la sélectionne sans ouvrir la fiche
  const hit = await p.evaluate(() => { const h = document.querySelector('.flt__hit[data-i="1"]').getBoundingClientRect(); return { x: h.left + h.width / 2, y: h.top + h.height * 0.6 }; });
  await p.mouse.click(hit.x, hit.y); await settle(p);
  s = await consistent(p, 'clic sur une voisine : sélection');
  check('clic sur une voisine : pas de navigation', (await p.url()) === URL && s.sel === 1, [await p.url(), s.sel]);
  // changement de thème en cours d'utilisation : sélection conservée, aucune instance de plus
  await p.evaluate(() => document.querySelector('[data-theme-toggle]') && document.querySelector('[data-theme-toggle]').click());
  await p.waitForTimeout(400);
  s = await consistent(p, 'thème clair : sélection conservée');
  check('thème : une seule instance de la galerie', s.inst === 1, s.inst);
  check('thème : clair appliqué', (await p.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'light');
  for (let i = 0; i < 2; i++) await p.click('[data-f-next]');
  await settle(p);
  await consistent(p, 'thème clair : flèches fonctionnelles');
  await p.evaluate(() => document.querySelector('[data-theme-toggle]').click());
  await p.waitForTimeout(300);
  // séquence au défilement : même pièce à l'aller et au retour
  const chosen = (await state(p)).handle;
  const span = await p.evaluate(() => { const s = document.querySelector('[data-float]'); return { top: s.getBoundingClientRect().top + scrollY, h: s.offsetHeight - innerHeight }; });
  const seen = [];
  for (const pr of [0.1, 0.3, 0.45, 0.6, 0.75, 0.9, 0.98, 0.75, 0.45, 0.2, 0]) {
    await p.evaluate(y => scrollTo(0, y), span.top + span.h * pr); await p.waitForTimeout(260);
    const st = await state(p); seen.push(st.phase + ':' + st.handle.slice(0, 14));
    if (st.handle !== chosen) { check('défilement : même pièce', false, [pr, st.handle, chosen]); break; }
  }
  check('défilement aller-retour : même pièce à chaque phase', seen.every(x => x.endsWith(chosen.slice(0, 14))), seen);
  // fiche accessible pendant le détail
  await p.evaluate(y => scrollTo(0, y), span.top + span.h * 0.48); await p.waitForTimeout(400);
  const ctaVisible = await p.evaluate(() => { const a = document.querySelector('[data-f-cta]'); const r = a.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return el === a || a.contains(el); });
  check('détail : bouton de la fiche cliquable', ctaVisible);
  const frames = await p.evaluate(() => window.__f.slice(2));
  frames.sort((a, b) => a - b);
  const pct = (q) => frames[Math.min(frames.length - 1, Math.floor(frames.length * q))];
  check('fluidité : image p95 (ms)', pct(0.95) < 34, { median: +pct(0.5).toFixed(1), p95: +pct(0.95).toFixed(1), n: frames.length });
  check('ordinateur : aucune erreur JavaScript', errs.length === 0, errs);
  await ctx.close();

  /* ---------- téléphone, tactile ---------- */
  const m = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const q = await m.newPage();
  const errs2 = []; q.on('pageerror', e => errs2.push(e.message));
  await q.addInitScript(() => { try { sessionStorage.clear(); } catch (e) {} });
  await q.goto(URL, { waitUntil: 'load' });
  await q.evaluate(() => { const s = document.querySelector('[data-float]'); scrollTo(0, s.getBoundingClientRect().top + scrollY); });
  await q.waitForTimeout(500);
  const cdp = await m.newCDPSession(q);
  const swipe = async (x0, y0, x1, y1, steps, dt) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
    for (let i = 1; i <= steps; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * i / steps, y: y0 + (y1 - y0) * i / steps }] }); await q.waitForTimeout(dt); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  await swipe(300, 420, 120, 424, 8, 14);
  await settle(q);
  let t = await consistent(q, 'tactile : balayage horizontal, état cohérent');
  check('tactile : balayage horizontal sélectionne la suivante', t.sel >= 1 && t.sel <= 2, t.sel);
  const y0 = await q.evaluate(() => scrollY);
  await swipe(200, 600, 204, 300, 10, 16);
  await q.waitForTimeout(500);
  const y1 = await q.evaluate(() => scrollY);
  const t2 = await state(q);
  check('tactile : balayage vertical fait défiler la page sans changer de pièce', y1 > y0 + 100 && t2.sel === t.sel, { y0, y1, sel: t2.sel });
  const ovf = await q.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check('téléphone : aucun débordement horizontal', ovf <= 0, ovf);
  check('téléphone : aucune erreur JavaScript', errs2.length === 0, errs2);
  await m.close();
  await b.close();
  console.log(JSON.stringify({ ok: results.filter(r => r.ok).length, total: results.length, results }, null, 1));
})();
