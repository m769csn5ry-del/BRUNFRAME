/* UI : intro courte (passable, jamais bloquante), menu mobile, révélations au scroll. */
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (_) { } }

  function intro() {
    var host = document.querySelector('[data-intro]');
    if (!host || reduce || ss('bg_intro')) { host && host.remove(); return; }
    ss('bg_intro', '1');
    host.hidden = false; requestAnimationFrame(function () { host.classList.add('is-on'); });
    function done() { host.classList.add('is-out'); setTimeout(function () { host.remove(); }, 700); }
    host.querySelector('[data-intro-skip]').addEventListener('click', done);
    setTimeout(done, 2200);
  }

  function menu() {
    var b = document.querySelector('[data-menu-toggle]'), n = document.querySelector('[data-menu]');
    if (!b || !n) return;
    b.addEventListener('click', function () { var o = n.classList.toggle('is-open'); b.setAttribute('aria-expanded', o); });
  }

  function reveal() {
    var els = document.querySelectorAll('[data-reveal]');
    if (reduce || !('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('is-in'); io.unobserve(x.target); } }); }, { threshold: .12 });
    els.forEach(function (e) { io.observe(e); });
  }

  function boot() { intro(); menu(); reveal(); }
  if (document.readyState !== 'loading') boot(); else document.addEventListener('DOMContentLoaded', boot);
})();
