/* Galerie orbitale de l'accueil, d'après la vidéo de référence : colliers en arc, swipe / flèches / clavier,
   puis, au défilement, isolation de la pièce choisie, fond propre à chaque collier, rapprochement, chapitres de texte,
   grande typographie, FAQ et retour de toute la ligne. Une seule pièce persistante, pilotée par un progrès de scroll.
   Détourages des photos officielles quand ils existent (champ cutout), sinon photo fondue. Pas de modèle 3D : rotations limitées à de faibles angles, jamais de faux dos.
   Données : <script type="application/json" data-orbit-items> [{ handle, title, kicker, priceLabel, url, variantId, available,
   photo, cutout?, fy?, tone: [c1, c2, c3], facts: [..] }]. Les textes et boutons restent dans le DOM. */
window.BG = window.BG || {};
(function (BG) {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var ss = function (a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  var bell = function (a, b, c, d, v) { return ss(a, b, v) * (1 - ss(c, d, v)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); };

  /* Poses de la pièce active selon le progrès (x, y en fraction de l'écran ; s = échelle ; rz/ry en degrés).
     Ce sont des choix de reconstruction calés sur la vidéo, pas des mesures. */
  var POSE_DESK = [
    [0.00, 0, 0, 1, -9, 0], [0.08, 0, 0, 1, -9, 0], [0.20, .17, .03, 1.75, -14, -8], [0.34, .19, .12, 2.7, -19, 10],
    [0.48, .15, .05, 2.05, 7, -12], [0.60, 0, .03, 1.85, 0, 0], [0.74, 0, .01, 1.7, 0, 0], [0.88, .2, .03, 1.3, 7, 0], [1, .2, -.02, 1.25, 7, 0]];
  var POSE_MOB = [
    [0.00, 0, 0, 1, -9, 0], [0.08, 0, 0, 1, -9, 0], [0.20, .02, -.13, 1.45, -12, -6], [0.34, 0, -.06, 2.2, -17, 8],
    [0.48, 0, -.12, 1.7, 6, -10], [0.60, 0, -.1, 1.6, 0, 0], [0.74, 0, -.04, 1.55, 0, 0], [0.88, 0, -.16, 1.15, 6, 0], [1, 0, -.2, 1.1, 6, 0]];
  function pose(tab, p) {
    for (var i = 1; i < tab.length; i++) if (p <= tab[i][0]) {
      var a = tab[i - 1], b = tab[i], t = ss(a[0], b[0], p);
      return [lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t), lerp(a[4], b[4], t), lerp(a[5], b[5], t)];
    }
    return tab[tab.length - 1].slice(1);
  }

  function Orbit(root) {
    var data = JSON.parse((root.querySelector('[data-orbit-items]') || {}).textContent || '[]');
    var n = data.length; if (!n) return;
    var pin = root.querySelector('[data-orbit-pin]'), stage = root.querySelector('[data-orbit-stage]');
    var label = root.querySelector('[data-orbit-label]'), live = root.querySelector('[data-orbit-live]');
    var bar = root.querySelector('[data-orbit-bar]'), word = root.querySelector('[data-orbit-word]'), faqT = root.querySelector('[data-orbit-faq]');
    var chapters = [].slice.call(root.querySelectorAll('[data-orbit-chapter]'));
    var gal = [].slice.call(root.querySelectorAll('[data-orbit-gallery]'));
    var aside = root.querySelector('[data-orbit-aside]');
    var isStatic = reduce || !('requestAnimationFrame' in window);
    root.classList.toggle('is-static', isStatic);

    stage.innerHTML = data.map(function (it, i) {
      /* Détourage transparent si fourni (pièce entière, suspendue, zoom centré sur le pendentif), sinon photo officielle fondue. */
      var cut = it.cutout, img = cut || it.photo;
      return '<button type="button" class="bg-orbit__item' + (cut ? ' is-cut' : '') + '" data-i="' + i + '" aria-label="' + esc(it.title) + '" style="--c1:' + it.tone[0] + (cut ? ';--fy:' + (it.fy || .9) : '') + '">' +
        '<img src="' + esc(img) + '" alt="" ' + (cut ? '' : 'width="600" height="750" ') + 'draggable="false"' + (i < 3 ? '' : ' loading="lazy"') + '></button>';
    }).join('');
    var els = [].slice.call(stage.children);
    bar.innerHTML = data.map(function (it, i) { return '<i style="--c1:' + it.tone[0] + '" data-i="' + i + '"></i>'; }).join('');
    var ticks = [].slice.call(bar.children);

    var pos = 0, target = 0, vel = 0, sel = 0, p = 0, drag = null, raf = 0, W = 1, H = 1, mobile = false;
    var wrapD = function (d) { d = ((d % n) + n) % n; return d > n / 2 ? d - n : d; };

    function measure() { W = pin.clientWidth || innerWidth; H = pin.clientHeight || innerHeight; mobile = W < 760; }
    function progress() {
      if (isStatic) return 0;
      var r = root.getBoundingClientRect(), span = root.offsetHeight - H;
      return span > 0 ? clamp(-r.top / span, 0, 1) : 0;
    }

    function select(i, announce) {
      i = ((i % n) + n) % n;
      if (i !== sel || announce) {
        sel = i; var it = data[i];
        root.style.setProperty('--c1', it.tone[0]); root.style.setProperty('--c2', it.tone[1]); root.style.setProperty('--c3', it.tone[2]);
        label.innerHTML = '<span class="bg-orbit__name">' + esc(it.title) + '</span><span class="bg-orbit__price">' + esc(it.priceLabel) + (it.available ? '' : ' · épuisé') + '</span>';
        chapters.forEach(function (c) { fill(c, it); });
        ticks.forEach(function (t, k) { t.classList.toggle('is-on', k === i); });
        els.forEach(function (e, k) { e.setAttribute('aria-pressed', k === i); e.tabIndex = k === i ? 0 : -1; });
        if (live) live.textContent = (i + 1) + ' sur ' + n + ' : ' + it.title + ', ' + it.priceLabel;
        root.dispatchEvent(new CustomEvent('orbit:select', { detail: { index: i, handle: it.handle } }));
      }
    }
    function fill(c, it) {
      var k = Number(c.dataset.orbitChapter);
      c.querySelectorAll('[data-o-title]').forEach(function (e) { e.textContent = it.title; });
      c.querySelectorAll('[data-o-kicker]').forEach(function (e) { e.textContent = it.kicker; });
      c.querySelectorAll('[data-o-price]').forEach(function (e) { e.textContent = it.priceLabel; });
      c.querySelectorAll('[data-o-head]').forEach(function (e) { e.textContent = (it.heads || [])[k - 1] || ''; });
      c.querySelectorAll('[data-o-fact]').forEach(function (e) { e.textContent = (it.facts || [])[k - 1] || ''; });
      c.querySelectorAll('[data-o-link]').forEach(function (e) { e.href = it.url; });
      c.querySelectorAll('[data-o-add]').forEach(function (e) {
        e.dataset.variantId = it.variantId; e.disabled = !it.available;
        e.textContent = it.available ? 'Ajouter au panier' : 'Épuisé';
      });
    }
    function go(i) { target = Math.round(pos) + wrapD(i - Math.round(pos)); kick(); }

    function render() {
      p = progress();
      var iso = ss(0.08, 0.2, p), P = pose(mobile ? POSE_MOB : POSE_DESK, p);
      var R = mobile ? W * .78 : Math.min(W * .42, 700), step = mobile ? .62 : .44;
      var itemW = els[0].offsetWidth || 200;
      els.forEach(function (e, i) {
        var d = wrapD(i - pos), a = d * step, active = i === sel;
        var x = Math.sin(a) * R, z = (Math.cos(a) - 1) * R * .9, y = -(1 - Math.cos(a)) * H * .1;
        var rz = -9 + d * 1.5, ry = -a * 22, s = 1, op = clamp(1.25 - Math.abs(d) * .22, 0, 1);
        var lit = clamp(1 - Math.abs(d), 0, 1);
        if (active) {
          x = lerp(x, P[0] * W, iso); y = lerp(y, P[1] * H, iso); z = lerp(z, 0, iso); s = lerp(1, P[2], iso);
          rz = lerp(rz, P[3], iso); ry = lerp(ry, P[4], iso);
        } else {
          x += (d < 0 ? -1 : 1) * iso * W * .7; op *= 1 - iso; z -= iso * 300;
        }
        e.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,' + z.toFixed(1) + 'px) rotateY(' + ry.toFixed(2) + 'deg) rotateZ(' + rz.toFixed(2) + 'deg) scale(' + s.toFixed(3) + ')';
        e.style.opacity = op.toFixed(3);
        e.style.zIndex = active ? 50 : Math.round(40 - Math.abs(d) * 5);
        e.style.setProperty('--lit', (active ? 1 : lit * .55 + .2).toFixed(3));
        e.style.visibility = op < .01 ? 'hidden' : '';
      });
      var color = ss(0.1, 0.22, p) * (1 - ss(0.66, 0.76, p));
      root.style.setProperty('--iso', iso.toFixed(3));
      root.style.setProperty('--color', color.toFixed(3));
      root.style.setProperty('--beam', ss(0.68, 0.8, p).toFixed(3));
      gal.forEach(function (g) { g.style.opacity = (1 - ss(0.04, 0.12, p)).toFixed(3); g.style.visibility = p > .12 ? 'hidden' : ''; });
      chapters.forEach(function (c) {
        var k = Number(c.dataset.orbitChapter), w = [[.17, .22, .32, .36], [.36, .4, .5, .54], [.52, .56, .63, .67]][k - 1];
        var o = bell(w[0], w[1], w[2], w[3], p); c.style.opacity = o.toFixed(3);
        c.style.transform = 'translateY(' + ((1 - o) * (p < w[1] ? 30 : -30)).toFixed(1) + 'px)';
        c.style.visibility = o < .02 ? 'hidden' : 'visible';
      });
      if (aside) { var ao = bell(.17, .22, .64, .7, p); aside.style.opacity = ao.toFixed(3); aside.style.visibility = ao < .02 ? 'hidden' : 'visible'; }
      var wo = bell(.64, .72, .84, .9, p); word.style.opacity = wo.toFixed(3);
      word.style.transform = 'translate(-50%,-50%) scale(' + lerp(1.35, 1, ss(.64, .8, p)).toFixed(3) + ')';
      var fo = ss(.84, .92, p); faqT.style.opacity = fo.toFixed(3); faqT.style.transform = 'translateY(' + ((1 - fo) * 40).toFixed(1) + 'px)';
      faqT.style.visibility = fo < .02 ? 'hidden' : 'visible';
      root.dataset.phase = p < .1 ? 'gallery' : p < .2 ? 'focus-transition' : p < .66 ? 'product-story' : p < .84 ? 'type-transition' : 'faq';
    }

    function tick() {
      raf = 0;
      if (!drag) {
        var f = target - pos; vel = vel * .78 + f * .09; pos += vel;
        if (Math.abs(f) < .0015 && Math.abs(vel) < .0015) { pos = target; vel = 0; }
      }
      var s = ((Math.round(pos) % n) + n) % n; if (s !== sel) select(s);
      render();
      if (drag || pos !== target) raf = requestAnimationFrame(tick);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(tick); }

    /* swipe : le scroll vertical reste natif (touch-action: pan-y) ; un glissé ne déclenche jamais de clic */
    var moved = false;
    stage.addEventListener('pointerdown', function (e) {
      if (p > .1 || (e.pointerType === 'mouse' && e.button !== 0)) return;
      drag = { x: e.clientX, y: e.clientY, pos: pos, t: performance.now(), lx: e.clientX, v: 0, axis: null }; moved = false;
    });
    addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.axis) { if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return; drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'; if (drag.axis === 'x') { stage.setPointerCapture && stage.setPointerCapture(e.pointerId); root.classList.add('is-drag'); } }
      if (drag.axis !== 'x') { drag = null; return; }
      moved = true;
      var span = (mobile ? W * .5 : Math.min(W * .2, 340)), now = performance.now();
      pos = drag.pos - dx / span;
      drag.v = (e.clientX - drag.lx) / Math.max(1, now - drag.t); drag.lx = e.clientX; drag.t = now;
      kick();
    }, { passive: true });
    function end() {
      if (!drag) return;
      var span = (mobile ? W * .5 : Math.min(W * .2, 340));
      var fling = clamp(-drag.v * 260 / span, -3, 3); /* geste rapide : peut traverser plusieurs pièces, inertie maîtrisée */
      target = Math.round(pos + fling); drag = null; root.classList.remove('is-drag'); kick();
    }
    addEventListener('pointerup', end); addEventListener('pointercancel', end);
    stage.addEventListener('click', function (e) {
      var b = e.target.closest('.bg-orbit__item'); if (!b) return;
      if (moved) { e.preventDefault(); moved = false; return; }
      var i = Number(b.dataset.i);
      if (i === sel && p < .1) enter(); else go(i);
    });
    /* « entrer » dans la pièce = défiler jusqu'au récit (même pièce, transition continue) */
    function enter() {
      if (isStatic) { var c = root.querySelector('[data-orbit-chapter="1"]'); if (c) c.scrollIntoView({ block: 'center' }); return; }
      var top = root.getBoundingClientRect().top + scrollY + (root.offsetHeight - H) * .22;
      scrollTo({ top: top, behavior: 'smooth' });
    }
    root.querySelectorAll('[data-orbit-prev]').forEach(function (b) { b.addEventListener('click', function () { go(sel - 1); }); });
    root.querySelectorAll('[data-orbit-next]').forEach(function (b) { b.addEventListener('click', function () { go(sel + 1); }); });
    root.querySelectorAll('[data-orbit-enter]').forEach(function (b) { b.addEventListener('click', enter); });
    bar.addEventListener('click', function (e) { var t = e.target.closest('[data-i]'); if (t) go(Number(t.dataset.i)); });
    root.addEventListener('keydown', function (e) {
      if (e.target.closest('input, textarea, select, details')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(sel + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(sel - 1); }
      else if (e.key === 'Enter' && e.target.closest('.bg-orbit__item')) { e.preventDefault(); enter(); }
    });
    root.addEventListener('click', function (e) {
      var a = e.target.closest('[data-o-add]'); if (!a || !BG.cart) return;
      BG.cart.add(a.dataset.variantId, 1, { title: data[sel].title });
    });

    var scrollRaf = 0;
    function onScroll() { if (!scrollRaf) scrollRaf = requestAnimationFrame(function () { scrollRaf = 0; render(); }); }
    if (!isStatic) addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', function () { measure(); render(); });
    if ('ResizeObserver' in window) new ResizeObserver(function () { measure(); render(); }).observe(pin);

    measure(); select(0, true); render();
    root.BGOrbit = { get state() { return { pos: pos, target: target, sel: sel, p: p, phase: root.dataset.phase }; }, go: go, enter: enter, items: data };
  }

  /* Retour collectif : la ligne revient en vol quand elle entre dans l'écran */
  function lineup() {
    document.querySelectorAll('[data-orbit-lineup]').forEach(function (l) {
      if (l.dataset.ready) return; l.dataset.ready = 1;
      if (reduce || !('IntersectionObserver' in window)) { l.classList.add('is-in'); return; }
      new IntersectionObserver(function (es, io) { if (es[0].isIntersecting) { l.classList.add('is-in'); io.disconnect(); } }, { threshold: .25 }).observe(l);
    });
  }

  BG.initOrbits = function () { document.querySelectorAll('[data-orbit]').forEach(function (r) { if (!r.BGOrbit) Orbit(r); }); lineup(); };
  if (document.readyState !== 'loading') BG.initOrbits(); else document.addEventListener('DOMContentLoaded', BG.initOrbits);
  document.addEventListener('shopify:section:load', BG.initOrbits);
})(window.BG);
