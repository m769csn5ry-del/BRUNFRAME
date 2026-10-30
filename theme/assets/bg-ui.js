/* UI : intro courte (passable, 1re visite de la session seulement), révélations, menu, pièce en lumière, carrousels. */
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var body = document.body;
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (_) { } }
  function ready() { body.classList.add('bg-ready'); }

  function intro() {
    var host = document.querySelector('[data-intro]');
    if (!host || reduce || ss('bg_intro')) { if (host) host.remove(); ready(); return; }
    ss('bg_intro', '1');
    host.hidden = false;
    requestAnimationFrame(function () { requestAnimationFrame(function () { host.classList.add('is-on'); }); });
    var t = setTimeout(done, 1900), finished = false;
    function done() {
      if (finished) return; finished = true; clearTimeout(t);
      host.classList.add('is-out'); setTimeout(ready, 250); setTimeout(function () { host.remove(); }, 1100);
    }
    host.querySelector('[data-intro-skip]').addEventListener('click', done);
    document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { done(); document.removeEventListener('keydown', k); } });
  }

  function menu() {
    var b = document.querySelector('[data-menu-toggle]'), n = document.querySelector('[data-menu]');
    if (!b || !n) return;
    b.setAttribute('aria-controls','bg-mobile-menu');n.id='bg-mobile-menu';
    b.addEventListener('click', function () { var o = n.classList.toggle('is-open'); b.setAttribute('aria-expanded', o); if(o){var a=n.querySelector('a');if(a)a.focus()} });
    n.addEventListener('click',function(e){if(e.target.closest('a')){n.classList.remove('is-open');b.setAttribute('aria-expanded','false')}});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&n.classList.contains('is-open')){n.classList.remove('is-open');b.setAttribute('aria-expanded','false');b.focus()}});
  }

  function reveal() {
    var els = document.querySelectorAll('[data-reveal], .bg-section .bg-l');
    if (reduce || !('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('is-in'); io.unobserve(x.target); } }); }, { threshold: .15, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  /* Pièce en lumière : un faisceau suit le curseur/le doigt ; dérive lente quand personne n'interagit. */
  function spot() {
    document.querySelectorAll('[data-spot]').forEach(function (el) {
      var touched = false, visible = false, raf = 0;
      function set(x, y) { el.style.setProperty('--mx', x + '%'); el.style.setProperty('--my', y + '%'); }
      el.addEventListener('pointermove', function (e) {
        touched = true; var r = el.getBoundingClientRect();
        set(((e.clientX - r.left) / r.width * 100).toFixed(1), ((e.clientY - r.top) / r.height * 100).toFixed(1));
      });
      if (reduce) return;
      function drift(t) {
        if (touched || !visible) { raf = 0; return; }
        set((52 + Math.sin(t / 2400) * 18).toFixed(1), (60 + Math.cos(t / 3100) * 14).toFixed(1));
        raf = requestAnimationFrame(drift);
      }
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible && !raf) raf = requestAnimationFrame(drift); }).observe(el);
    });
  }

  var quickBound = false;
  function tracks() {
    document.querySelectorAll('[data-track-nav]').forEach(function (nav) {
      var tr = document.getElementById(nav.dataset.trackNav); if (!tr) return;
      nav.querySelectorAll('button').forEach(function (b) {
        b.addEventListener('click', function () { tr.scrollBy({ left: Number(b.dataset.dir) * tr.clientWidth * .8, behavior: reduce ? 'auto' : 'smooth' }); });
      });
    });
    if (quickBound) return; quickBound = true;
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-quick-add]'); if (!b) return;
      e.preventDefault(); if (window.BG && BG.cart) BG.cart.add(b.dataset.quickAdd, 1, { title: b.dataset.title });
    });
  }

  window.BG = window.BG || {}; BG.uiRefresh = function () { reveal(); spot(); tracks(); };
  function boot() { document.documentElement.classList.add('js'); intro(); menu(); reveal(); spot(); tracks(); }
  if (document.readyState !== 'loading') boot(); else document.addEventListener('DOMContentLoaded', boot);
})();
