/* Thème clair/sombre : sombre par défaut (direction « sombre minéral »), quel que soit le réglage système ; le choix explicite du visiteur est conservé, appliqué avant la peinture.
   Ce fichier est chargé dans <head> (sans defer) pour éviter tout flash. */
(function () {
  var KEY = 'bg_theme', root = document.documentElement, meta;
  function read() { try { return localStorage.getItem(KEY); } catch (_) { return null; } }
  function write(v) { try { localStorage.setItem(KEY, v); } catch (_) { } }
  function apply(t) {
    root.setAttribute('data-theme', t);
    meta = meta || document.querySelector('meta[name=theme-color]');
    if (meta) meta.setAttribute('content', t === 'light' ? '#f4f4f1' : '#111315');
    var b = document.querySelector('[data-theme-toggle]');
    if (b) { b.setAttribute('aria-pressed', t === 'light'); b.setAttribute('aria-label', t === 'light' ? 'Passer au thème sombre' : 'Passer au thème clair'); }
  }
  var current = read() === 'light' || read() === 'dark' ? read() : 'dark';
  apply(current);
  window.BGTheme = {
    get: function () { return current; },
    toggle: function () { current = current === 'light' ? 'dark' : 'light'; write(current); apply(current); return current; },
    sync: function () { apply(current); }
  };
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('[data-theme-toggle]')) window.BGTheme.toggle();
  });
})();
