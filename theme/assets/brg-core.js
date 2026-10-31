/* Breslev Gang — cœur du thème. Composants enregistrés par sélecteur : init(el) renvoie un destroy() appelé au déchargement
   d'une section dans l'éditeur (aucun écouteur, minuteur ou animation ne s'accumule). Une seule boucle d'animation au scroll. */
(function () {
  'use strict';
  var C = window.BRG = window.BRG || {};
  var cfg = C.config || {};
  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || cfg.animations === false;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var t = function (k, fb) { return (cfg.strings && cfg.strings[k]) || fb || k; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); };
  C.$ = $; C.$$ = $$; C.clamp = clamp; C.esc = esc; C.reduce = reduce;
  root.classList.add(reduce ? 'rm' : 'anim');
  root.style.setProperty('--amp', String(cfg.intensity == null ? 1 : cfg.intensity));

  /* ---------- argent ---------- */
  C.money = function (cents, fmt) {
    fmt = fmt || cfg.moneyFormat || '{{amount_with_comma_separator}} €';
    cents = Math.round(Number(cents) || 0);
    var f = function (n, d, ts, ds) { d = d == null ? 2 : d; var s = (n / 100).toFixed(d).split('.'); return s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ts == null ? ',' : ts) + (s[1] ? (ds || '.') + s[1] : ''); };
    return fmt.replace(/\{\{\s*(\w+)\s*\}\}/, function (_, k) {
      return { amount: f(cents, 2), amount_no_decimals: f(cents, 0), amount_with_comma_separator: f(cents, 2, '.', ','), amount_no_decimals_with_comma_separator: f(cents, 0, '.', ','), amount_with_apostrophe_separator: f(cents, 2, "'", '.'), amount_with_space_separator: f(cents, 2, ' ', ',') }[k] || f(cents, 2);
    });
  };

  /* ---------- registre de composants ---------- */
  var registry = [];
  C.register = function (sel, init) { registry.push({ sel: sel, init: init }); };
  function mount(scope) {
    registry.forEach(function (c) {
      var els = scope.matches && scope.matches(c.sel) ? [scope] : [];
      els = els.concat($$(c.sel, scope));
      els.forEach(function (el) { if (el.__brg && el.__brg[c.sel]) return; el.__brg = el.__brg || {}; el.__brg[c.sel] = c.init(el) || function () {}; });
    });
    Anim.scan();
  }
  function unmount(scope) {
    [scope].concat($$('*', scope)).forEach(function (el) { if (!el.__brg) return; Object.keys(el.__brg).forEach(function (k) { try { el.__brg[k](); } catch (e) {} }); el.__brg = null; });
    Anim.scan();
  }
  C.mount = mount;

  /* ---------- moteur : progression des blocs dans l'écran (réversible) ---------- */
  var Anim = (function () {
    var items = [], active = new Set(), dirty = true, raf = 0, io = null, vh = innerHeight;
    var ease = function (x) { return 1 - Math.pow(1 - x, 3); };
    function scan() {
      if (io) io.disconnect();
      items = $$('[data-anim], [data-hero]');
      active.clear();
      if (reduce) { items.forEach(function (el) { el.style.setProperty('--e', '1'); }); return; }
      io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) active.add(e.target); else active.delete(e.target); }); kick(); }, { rootMargin: '25% 0px 25% 0px' });
      items.forEach(function (el) { io.observe(el); });
      kick();
    }
    function frame() {
      raf = 0; if (!dirty) return; dirty = false;
      active.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (el.hasAttribute('data-hero')) { el.style.setProperty('--e-out', clamp(-r.top / (r.height * 0.85), 0, 1).toFixed(3)); return; }
        var kind = el.getAttribute('data-anim');
        if (kind === 'drift') { el.style.setProperty('--c', clamp(((r.top + r.height / 2) - vh / 2) / vh, -1, 1).toFixed(3)); return; }
        var start = vh * 0.96, end = vh * (kind === 'reveal' ? 0.45 : 0.62);
        var p = clamp((start - r.top) / (start - end), 0, 1);
        var d = parseFloat(el.getAttribute('data-anim-delay') || 0);
        if (d) p = clamp((p - d) / (1 - d), 0, 1);
        var v = ease(p).toFixed(3);
        if (el.__e !== v) { el.__e = v; el.style.setProperty('--e', v); }
      });
    }
    function kick() { dirty = true; if (!raf) raf = requestAnimationFrame(frame); }
    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', function () { vh = innerHeight; kick(); });
    return { scan: scan, kick: kick };
  })();
  C.anim = Anim;

  /* ---------- en-tête : masqué en descendant, visible en remontant ---------- */
  C.register('[data-header]', function (hdr) {
    var last = scrollY, ticking = false, over = hdr.classList.contains('hdr--over');
    function upd() {
      ticking = false;
      var y = scrollY, dy = y - last;
      hdr.classList.toggle('is-solid', y > (over ? innerHeight * 0.6 : 8));
      if (Math.abs(dy) > 6) {
        var hide = dy > 0 && y > 200 && !root.classList.contains('has-modal');
        hdr.classList.toggle('is-hidden', hide);
        document.body.classList.toggle('hdr-visible', !hide && y > 8);
        last = y;
      }
    }
    var on = function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } };
    addEventListener('scroll', on, { passive: true }); upd();
    return function () { removeEventListener('scroll', on); };
  });

  /* ---------- tiroirs (menu, panier, filtres) : focus contenu puis restauré, Échap, pas de verrou persistant ---------- */
  var openDrawer = null, lastFocus = null;
  function focusables(el) { return $$('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])', el).filter(function (x) { return x.offsetParent !== null || x === document.activeElement; }); }
  C.openDrawer = function (id, opener) {
    var d = document.getElementById(id); if (!d) return;
    if (openDrawer && openDrawer !== d) C.closeDrawer(true);
    lastFocus = opener || document.activeElement; openDrawer = d;
    d.hidden = false; d.getBoundingClientRect();
    d.classList.add('is-open'); root.classList.add('has-modal');
    $$('[aria-controls="' + id + '"]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    setTimeout(function () { var f = $('[data-autofocus]', d) || focusables(d)[0]; if (f) f.focus({ preventScroll: true }); }, 60);
  };
  C.closeDrawer = function (silent) {
    var d = openDrawer; if (!d) return; openDrawer = null;
    d.classList.remove('is-open'); root.classList.remove('has-modal');
    $$('[aria-controls="' + d.id + '"]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    setTimeout(function () { if (!d.classList.contains('is-open')) d.hidden = true; }, 560);
    if (!silent && lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  };
  document.addEventListener('click', function (e) {
    var o = e.target.closest('[data-drawer-open]');
    if (o) { e.preventDefault(); C.openDrawer(o.getAttribute('data-drawer-open'), o); return; }
    if (e.target.closest('[data-drawer-close]')) { e.preventDefault(); C.closeDrawer(); }
  });
  document.addEventListener('keydown', function (e) {
    if (!openDrawer) return;
    if (e.key === 'Escape') { e.preventDefault(); C.closeDrawer(); return; }
    if (e.key === 'Tab') {
      var f = focusables(openDrawer); if (!f.length) return;
      var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  });

  /* ---------- thème clair / sombre ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-theme-toggle]'); if (!b) return;
    var next = root.dataset.theme === 'light' ? 'dark' : 'light';
    if (!reduce) { root.classList.add('theme-fade'); setTimeout(function () { root.classList.remove('theme-fade'); }, 650); }
    root.dataset.theme = next;
    try { localStorage.setItem('brg-theme', next); } catch (err) {}
    $$('[data-theme-toggle]').forEach(function (x) { x.setAttribute('aria-pressed', String(next === 'light')); });
    document.dispatchEvent(new CustomEvent('brg:theme', { detail: { theme: next } }));
    var m = $('meta[name="theme-color"]'); if (m && cfg.themeColors) m.content = cfg.themeColors[next];
  });

  /* ---------- panier (API Ajax Shopify) ---------- */
  var Cart = C.cart = {
    state: null, busy: false,
    req: function (url, body) {
      var o = body ? { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) } : { headers: { Accept: 'application/json' } };
      return fetch((cfg.routes && cfg.routes.root || '/') + url.replace(/^\//, ''), o).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { var err = new Error(j.description || j.message || t('cart_error')); err.status = r.status; throw err; } return j; });
      });
    },
    get: function () { return Cart.req('cart.js').then(function (c) { Cart.render(c); return c; }); },
    add: function (id, qty, props) { return Cart.req('cart/add.js', { items: [{ id: Number(id), quantity: qty || 1, properties: props || {} }] }); },
    change: function (key, qty) { return Cart.req('cart/change.js', { id: key, quantity: qty }).then(function (c) { Cart.render(c); return c; }); },
    render: function (c) {
      Cart.state = c;
      $$('[data-cart-count]').forEach(function (n) { var was = n.textContent; n.textContent = c.item_count; n.toggleAttribute('data-zero', !c.item_count); if (was !== String(c.item_count) && !reduce) { n.classList.remove('bump'); void n.offsetWidth; n.classList.add('bump'); } });
      $$('[data-cart-lines]').forEach(function (box) { box.innerHTML = c.items.length ? '<ul class="lines">' + c.items.map(Cart.line).join('') + '</ul>' : '<p class="empty">' + esc(t('cart_empty')) + '</p>'; });
      $$('[data-cart-subtotal]').forEach(function (n) { n.textContent = C.money(c.total_price); });
      $$('[data-cart-foot]').forEach(function (n) { n.hidden = !c.items.length; });
    },
    line: function (i) {
      var opts = i.product_has_only_default_variant ? '' : (i.options_with_values || []).map(function (o) { return esc(o.name) + ' : ' + esc(o.value); }).join(' · ');
      var img = i.image ? '<img src="' + esc(i.image) + (i.image.indexOf('?') < 0 ? '?' : '&') + 'width=200" alt="" width="84" height="105" loading="lazy">' : '';
      return '<li class="line" data-key="' + esc(i.key) + '"><a class="line__img" href="' + esc(i.url) + '" tabindex="-1">' + img + '</a><div><a class="line__title" href="' + esc(i.url) + '">' + esc(i.product_title) + '</a>' +
        (opts ? '<p class="line__opts">' + opts + '</p>' : '<p class="line__opts"></p>') +
        '<div class="qty" role="group" aria-label="' + esc(t('quantity')) + '"><button type="button" data-q="-1" aria-label="' + esc(t('decrease')) + '">−</button><input type="number" inputmode="numeric" min="0" value="' + i.quantity + '" aria-label="' + esc(t('quantity')) + '" data-q-input><button type="button" data-q="1" aria-label="' + esc(t('increase')) + '">+</button></div>' +
        ' <button type="button" class="line__remove" data-remove>' + esc(t('remove')) + '</button></div><p class="line__price">' + C.money(i.final_line_price) + (i.original_line_price > i.final_line_price ? '<br><s class="muted">' + C.money(i.original_line_price) + '</s>' : '') + '</p></li>';
    },
    open: function (opener, okText) {
      var ok = $('[data-cart-ok]');
      if (ok) { ok.hidden = !okText; if (okText) $('[data-cart-ok-text]', ok).textContent = okText; }
      if (cfg.cartType === 'page') { location.href = cfg.routes.cart_url; return; }
      C.openDrawer('cart-drawer', opener);
    }
  };
  document.addEventListener('click', function (e) {
    var line = e.target.closest('.line'); if (!line) return;
    var key = line.getAttribute('data-key'), input = $('[data-q-input]', line), q;
    if (e.target.closest('[data-remove]')) q = 0;
    else if (e.target.closest('[data-q]')) q = Math.max(0, Number(input.value) + Number(e.target.closest('[data-q]').getAttribute('data-q')));
    else return;
    lineUpdate(line, key, q);
  });
  document.addEventListener('change', function (e) {
    if (!e.target.matches('[data-q-input]')) return;
    var line = e.target.closest('.line'); lineUpdate(line, line.getAttribute('data-key'), Math.max(0, parseInt(e.target.value, 10) || 0));
  });
  function lineUpdate(line, key, q) {
    if (line.__busy) return; line.__busy = true;
    if (q === 0 && !reduce) line.classList.add('is-removing');
    Cart.change(key, q).catch(function (err) {
      line.__busy = false; line.classList.remove('is-removing');
      var e = $('.line__err', line) || line.appendChild(Object.assign(document.createElement('p'), { className: 'line__err' }));
      e.textContent = err.message || t('cart_error');
      Cart.get().catch(function () {});
    });
  }
  /* formulaires d'ajout : succès seulement après la réponse du service */
  document.addEventListener('submit', function (e) {
    var f = e.target.closest('form[data-add-form]'); if (!f) return;
    e.preventDefault();
    var btn = $('[type="submit"]', f), msg = $('[data-form-msg]', f) || $('[data-form-msg]', f.closest('[data-product]') || document);
    var id = f.querySelector('[name="id"]').value, qty = parseInt((f.querySelector('[name="quantity"]') || {}).value || 1, 10) || 1;
    if (!id) { if (msg) { msg.dataset.tone = 'error'; msg.textContent = t('choose_options'); } return; }
    if (f.__busy) return; f.__busy = true;
    var label = btn.innerHTML; btn.setAttribute('aria-busy', 'true'); btn.innerHTML = '<span class="spinner" aria-hidden="true"></span><span>' + esc(t('adding')) + '</span>';
    if (msg) { msg.textContent = ''; delete msg.dataset.tone; }
    Cart.add(id, qty).then(function (res) {
      var it = res.items && res.items[0];
      return Cart.get().then(function () { Cart.open(btn, it ? it.product_title + (it.product_has_only_default_variant ? '' : ' — ' + it.variant_title) : t('added')); });
    }).catch(function (err) {
      if (msg) { msg.dataset.tone = 'error'; msg.textContent = err.status ? err.message : t('network_error'); }
    }).then(function () { f.__busy = false; btn.removeAttribute('aria-busy'); btn.innerHTML = label; });
  });

  /* ---------- favoris (sur cet appareil ; synchronisation compte : voir docs) ---------- */
  var FKEY = 'brg-favs';
  var Fav = C.favs = {
    list: function () { try { return JSON.parse(localStorage.getItem(FKEY)) || []; } catch (e) { return []; } },
    save: function (l) { try { localStorage.setItem(FKEY, JSON.stringify(l)); } catch (e) {} Fav.paint(); },
    toggle: function (h) { var l = Fav.list(), i = l.indexOf(h); if (i < 0) l.unshift(h); else l.splice(i, 1); Fav.save(l); return i < 0; },
    paint: function () {
      var l = Fav.list();
      $$('[data-fav]').forEach(function (b) { b.setAttribute('aria-pressed', String(l.indexOf(b.getAttribute('data-fav')) > -1)); });
      $$('[data-fav-count]').forEach(function (n) { n.textContent = l.length; n.toggleAttribute('data-zero', !l.length); });
    }
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-fav]'); if (!b) return;
    e.preventDefault();
    var on = Fav.toggle(b.getAttribute('data-fav'));
    if (!reduce) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
    var live = $('[data-live]'); if (live) live.textContent = on ? t('fav_added') : t('fav_removed');
  });
  C.register('[data-favorites-page]', function (el) {
    var box = $('[data-fav-results]', el), l = Fav.list();
    if (!l.length) { box.innerHTML = '<p class="empty">' + esc(t('fav_empty')) + '</p>'; return; }
    box.innerHTML = '<p class="muted small">' + esc(t('loading')) + '</p>';
    Promise.all(l.map(function (h) { return fetch((cfg.routes.root || '/') + 'products/' + encodeURIComponent(h) + '.js').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); })).then(function (ps) {
      ps = ps.filter(Boolean);
      box.innerHTML = ps.length ? '<div class="grid">' + ps.map(function (p) {
        var img = p.featured_image ? (p.featured_image.indexOf('//') === 0 ? 'https:' + p.featured_image : p.featured_image) : '';
        return '<article class="card"><a class="card__media" href="' + esc(p.url) + '" tabindex="-1">' + (img ? '<img src="' + esc(img) + (img.indexOf('?') < 0 ? '?' : '&') + 'width=600" alt="' + esc(p.title) + '" loading="lazy" width="600" height="750">' : '') + '</a>' +
          '<button class="fav" type="button" data-fav="' + esc(p.handle) + '" aria-pressed="true" aria-label="' + esc(t('fav_toggle')) + ' ' + esc(p.title) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"/></svg></button>' +
          '<div class="card__meta"><a class="card__title" href="' + esc(p.url) + '">' + esc(p.title) + '</a><span class="card__price">' + C.money(p.price) + '</span>' + (p.available ? '' : '<span class="card__sub">' + esc(t('sold_out')) + '</span>') + '</div></article>';
      }).join('') + '</div>' : '<p class="empty">' + esc(t('fav_empty')) + '</p>';
      Fav.paint(); mount(box);
    });
  });

  /* ---------- fiche produit : variantes nommées, média, prix, ID vendable, barre d'achat mobile ---------- */
  C.register('[data-product]', function (el) {
    var data = JSON.parse(($('[data-product-json]', el) || {}).textContent || 'null'); if (!data) return;
    var form = $('form[data-add-form]', el), idIn = form && $('[name="id"]', form);
    var variants = data.variants, nOpt = data.options.length;
    var current = variants.filter(function (v) { return String(v.id) === String(data.selected); })[0] || variants.filter(function (v) { return v.available; })[0] || variants[0];
    function chosen() { return data.options.map(function (_, i) { var c = $('input[data-opt="' + i + '"]:checked', el); return c ? c.value : null; }); }
    function find(vals) { return variants.filter(function (v) { return v.options.every(function (o, i) { return o === vals[i]; }); })[0]; }
    function paintOptions(vals) {
      $$('.opt__btn', el).forEach(function (b) {
        var input = $('input', b), i = Number(input.getAttribute('data-opt')), test = vals.slice(); test[i] = input.value;
        var exists = variants.filter(function (v) { return v.options.every(function (o, k) { return k === i ? o === input.value : (test[k] == null || o === test[k]); }); });
        b.classList.toggle('is-impossible', !exists.length);
        b.classList.toggle('is-out', exists.length > 0 && !exists.some(function (v) { return v.available; }));
      });
      $$('[data-opt-value]', el).forEach(function (n) { n.textContent = vals[Number(n.getAttribute('data-opt-value'))] || ''; });
    }
    function apply(v, push) {
      var vals = chosen();
      if (!v) {
        if (idIn) idIn.value = '';
        $$('[data-buy-btn]', el.ownerDocument).forEach(function (b) { b.disabled = true; b.querySelector('span').textContent = t('unavailable_combo'); });
        paintOptions(vals); return;
      }
      current = v; if (idIn) idIn.value = v.id;
      $$('[data-price]', el.ownerDocument).forEach(function (n) { n.textContent = C.money(v.price); });
      $$('[data-compare]', el).forEach(function (n) { n.hidden = !(v.compare_at_price > v.price); n.textContent = C.money(v.compare_at_price || 0); });
      $$('[data-stock]', el).forEach(function (n) { n.dataset.state = v.available ? 'in' : 'out'; n.textContent = v.available ? t('in_stock') : t('sold_out'); });
      $$('[data-buy-btn]', el.ownerDocument).forEach(function (b) { b.disabled = !v.available; b.querySelector('span').textContent = v.available ? t('add_to_cart') : t('sold_out'); });
      $$('[data-sku]', el).forEach(function (n) { n.textContent = v.sku || '—'; });
      $$('[data-sticky-variant]', el.ownerDocument).forEach(function (n) { n.textContent = nOpt && !data.only_default ? v.title + ' · ' + C.money(v.price) : C.money(v.price); });
      paintOptions(v.options);
      if (v.media_id) {
        var m = $('[data-media-id="' + v.media_id + '"]', el);
        $$('.gallery__item', el).forEach(function (g) { g.classList.toggle('is-variant', g === m); });
        if (m) { var g = m.parentElement; if (g && getComputedStyle(g).display === 'flex') { if (push) g.scrollTo({ left: m.offsetLeft - 16, behavior: reduce ? 'auto' : 'smooth' }); } else if (push && g && g.firstElementChild !== m) g.insertBefore(m, g.firstElementChild); }
      }
      if (push) { try { var u = new URL(location.href); u.searchParams.set('variant', v.id); history.replaceState(history.state, '', u); } catch (e) {} }
    }
    function onChange(e) { if (!e.target.matches('input[data-opt]')) return; var v = find(chosen()); apply(v, true); }
    el.addEventListener('change', onChange);
    var vq = new URL(location.href).searchParams.get('variant');
    if (vq) { var vv = variants.filter(function (v) { return String(v.id) === vq; })[0]; if (vv) current = vv; }
    current.options.forEach(function (o, i) { var r = $$('input[data-opt="' + i + '"]', el).filter(function (x) { return x.value === o; })[0]; if (r) r.checked = true; });
    apply(current, false);
    /* quantité */
    function qtyClick(e) { var b = e.target.closest('[data-qty-step]'); if (!b) return; var i = $('[data-qty]', el); i.value = Math.max(1, (parseInt(i.value, 10) || 1) + Number(b.getAttribute('data-qty-step'))); }
    el.addEventListener('click', qtyClick);
    /* barre d'achat mobile : visible quand le bouton principal sort de l'écran ; renvoie aux options requises */
    var sticky = $('[data-sticky-buy]'), mainBtn = $('[data-buy-btn]', form || el), io;
    if (sticky && mainBtn) {
      io = new IntersectionObserver(function (es) { sticky.classList.toggle('is-on', !es[0].isIntersecting && es[0].boundingClientRect.top < 0); }, { threshold: 0 });
      io.observe(mainBtn);
      var sb = $('[data-sticky-submit]', sticky);
      var onSticky = function () {
        if (!idIn.value) { var o = $('.opt', el); if (o) { o.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); var first = $('input[data-opt]', o); if (first) first.focus({ preventScroll: true }); } return; }
        form.requestSubmit ? form.requestSubmit(mainBtn) : mainBtn.click();
      };
      sb.addEventListener('click', onSticky);
    }
    return function () { el.removeEventListener('change', onChange); el.removeEventListener('click', qtyClick); if (io) io.disconnect(); if (sb) sb.removeEventListener('click', onSticky); };
  });

  /* ---------- galerie fiche : points mobiles + agrandissement ---------- */
  C.register('[data-gallery]', function (g) {
    var items = $$('.gallery__item', g), dots = $$('.gallery__dots i', g.parentElement), io;
    if (dots.length) {
      io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting && e.intersectionRatio > .6) { var i = items.indexOf(e.target); dots.forEach(function (d, k) { d.classList.toggle('on', k === i); }); } }); }, { root: g, threshold: [.6] });
      items.forEach(function (i) { io.observe(i); });
    }
    function click(e) { var it = e.target.closest('.gallery__item'); if (!it) return; C.lightbox.open(items.map(function (x) { var im = $('img', x); return { src: im.getAttribute('data-full') || im.currentSrc || im.src, alt: im.alt }; }), items.indexOf(it), it); }
    g.addEventListener('click', click);
    return function () { if (io) io.disconnect(); g.removeEventListener('click', click); };
  });

  /* ---------- visionneuse (photos entières) ---------- */
  C.lightbox = (function () {
    var box, img, list = [], idx = 0, origin = null, cap, z = 1, tx = 0, ty = 0, moved = false;
    function pan(x, y) {
      var r = img.getBoundingClientRect(), w = r.width / z, h = r.height / z;
      var mx = Math.max(0, (w * z - innerWidth) / 2 + 24), my = Math.max(0, (h * z - innerHeight) / 2 + 24);
      tx = clamp(x, -mx, mx); ty = clamp(y, -my, my);
      img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + z + ')';
    }
    function zoom(nz, fx, fy) {
      var prev = z; z = nz;
      if (z === 1) { tx = 0; ty = 0; img.style.transform = ''; }
      else { var k = z / prev; pan(fx != null ? -(fx * (k - 1)) + tx * k : tx, fy != null ? -(fy * (k - 1)) + ty * k : ty); }
      img.classList.toggle('is-zoom', z > 1); img.parentElement.classList.toggle('is-zoomed', z > 1);
      var zb = $('[data-lb-zoom]', box), rb = $('[data-lb-reset]', box);
      if (zb) zb.setAttribute('aria-pressed', String(z > 1)); if (rb) rb.hidden = z === 1;
    }
    function build() {
      box = document.createElement('div'); box.className = 'lightbox'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', t('viewer')); box.hidden = true;
      box.innerHTML = '<div class="lightbox__bar"><span class="small" data-lb-count></span><div class="lightbox__zoom"><button class="btn btn--ghost btn--sm" type="button" data-lb-zoom aria-pressed="false">' + esc(t('zoom', 'Zoom')) + '</button><button class="btn btn--ghost btn--sm" type="button" data-lb-reset hidden>' + esc(t('zoom_reset', 'Réinitialiser')) + '</button></div><button class="icon-btn" type="button" data-lb-close aria-label="' + esc(t('close')) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg></button></div><div class="lightbox__stage"><img alt=""></div><div class="lightbox__nav"><button class="arrow" type="button" data-lb="-1" aria-label="' + esc(t('previous')) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button><button class="arrow" type="button" data-lb="1" aria-label="' + esc(t('next')) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button></div>';
      document.body.appendChild(box); img = $('img', box); cap = $('[data-lb-count]', box);
      box.addEventListener('click', function (e) {
        if (e.target === img) { if (moved) { moved = false; return; } var r = img.getBoundingClientRect(); zoom(z > 1 ? 1 : 2.4, e.clientX - (r.left + r.width / 2) + tx, e.clientY - (r.top + r.height / 2) + ty); return; }
        if (e.target.closest('[data-lb-zoom]')) { zoom(z > 1 ? 1 : 2.4, 0, 0); return; }
        if (e.target.closest('[data-lb-reset]')) { zoom(1); return; }
        if (e.target.closest('[data-lb-close]') || e.target === box || e.target.classList.contains('lightbox__stage')) close();
        var n = e.target.closest('[data-lb]'); if (n) show(idx + Number(n.getAttribute('data-lb')));
      });
      /* zoom volontaire : clic ou bouton, déplacement au glisser, réinitialisation ; borné aux limites de la photo */
      var drag = null;
      img.addEventListener('pointerdown', function (e) { if (z <= 1) return; drag = { x: e.clientX, y: e.clientY, tx: tx, ty: ty }; moved = false; img.setPointerCapture(e.pointerId); });
      img.addEventListener('pointermove', function (e) { if (!drag) return; var dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) moved = true; pan(drag.tx + dx, drag.ty + dy); });
      img.addEventListener('pointerup', function () { drag = null; });
      img.addEventListener('pointercancel', function () { drag = null; });
      document.addEventListener('keydown', function (e) { if (box.hidden) return; if (e.key === '+' || e.key === '=') zoom(2.4, 0, 0); if (e.key === '-' || e.key === '0') zoom(1); if (e.key === 'Escape') { if (z > 1) { zoom(1); return; } close(); } if (e.key === 'ArrowRight') show(idx + 1); if (e.key === 'ArrowLeft') show(idx - 1); if (e.key === 'Tab') { var f = focusables(box), a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } } });
    }
    function show(i) { if (z !== 1) zoom(1); idx = (i + list.length) % list.length; var it = list[idx]; img.style.opacity = '0'; var n = new Image(); n.onload = n.onerror = function () { img.src = it.src; img.alt = it.alt || ''; img.style.opacity = '1'; }; n.src = it.src; cap.textContent = (idx + 1) + ' / ' + list.length; $$('[data-lb]', box).forEach(function (b) { b.hidden = list.length < 2; }); }
    function open(items, i, from) {
      if (!box) build(); list = items; origin = from || document.activeElement;
      box.hidden = false; root.classList.add('has-modal'); show(i || 0);
      if (!reduce && from) { var r = from.getBoundingClientRect(); img.style.transition = 'none'; img.style.transform = 'translate(' + (r.left + r.width / 2 - innerWidth / 2) + 'px,' + (r.top + r.height / 2 - innerHeight / 2) + 'px) scale(.35)'; img.getBoundingClientRect(); img.style.transition = ''; requestAnimationFrame(function () { img.style.transform = ''; }); }
      requestAnimationFrame(function () { box.classList.add('is-open'); $('[data-lb-close]', box).focus(); });
    }
    function close() { if (z !== 1) zoom(1); box.classList.remove('is-open'); root.classList.remove('has-modal'); setTimeout(function () { box.hidden = true; }, 360); if (origin && origin.focus) origin.focus({ preventScroll: true }); }
    return { open: open, close: close };
  })();

  /* ---------- personnalités : galerie manuelle ---------- */
  C.register('[data-people]', function (el) {
    var track = $('.people__track', el), btns = $$('.person__btn', el);
    function nav(e) { var b = e.target.closest('[data-people-nav]'); if (!b) return; var w = track.firstElementChild ? track.firstElementChild.getBoundingClientRect().width + 16 : 300; track.scrollBy({ left: Number(b.getAttribute('data-people-nav')) * w * (innerWidth < 750 ? 1 : 2), behavior: reduce ? 'auto' : 'smooth' }); }
    function open(e) { var b = e.target.closest('.person__btn'); if (!b) return; C.lightbox.open(btns.map(function (x) { var im = $('img', x); return { src: x.getAttribute('data-full'), alt: im.alt }; }), btns.indexOf(b), b); }
    el.addEventListener('click', nav); el.addEventListener('click', open);
    return function () { el.removeEventListener('click', nav); el.removeEventListener('click', open); };
  });

  /* ---------- six collections : une grande composition à la fois ---------- */
  C.register('[data-showcase]', function (el) {
    var track = $('.showcase__track', el), slides = $$('.slide', el), tabs = $$('[data-tab]', el), i = 0, sx = null, sy = 0;
    function go(n, dir) {
      i = (n + slides.length) % slides.length;
      track.style.transform = 'translate3d(' + (-100 * i) + '%,0,0)';
      slides.forEach(function (s, k) { s.classList.toggle('is-active', k === i); s.style.setProperty('--dir', dir || 1); s.setAttribute('aria-hidden', String(k !== i)); $$('a, button', s).forEach(function (a) { a.tabIndex = k === i ? 0 : -1; }); });
      tabs.forEach(function (b, k) { b.setAttribute('aria-selected', String(k === i)); b.tabIndex = k === i ? 0 : -1; });
    }
    function click(e) { var a = e.target.closest('[data-show-nav]'), b = e.target.closest('[data-tab]'); if (a) go(i + Number(a.getAttribute('data-show-nav')), Number(a.getAttribute('data-show-nav'))); if (b) go(tabs.indexOf(b), tabs.indexOf(b) > i ? 1 : -1); }
    function key(e) { if (!e.target.closest('[role="tablist"]')) return; if (e.key === 'ArrowRight') { go(i + 1, 1); tabs[i].focus(); } if (e.key === 'ArrowLeft') { go(i - 1, -1); tabs[i].focus(); } }
    function down(e) { sx = e.clientX; sy = e.clientY; }
    function up(e) { if (sx == null) return; var dx = e.clientX - sx, dy = e.clientY - sy; sx = null; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(i + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); }
    el.addEventListener('click', click); el.addEventListener('keydown', key); track.addEventListener('pointerdown', down); addEventListener('pointerup', up);
    go(0);
    return function () { el.removeEventListener('click', click); el.removeEventListener('keydown', key); track.removeEventListener('pointerdown', down); removeEventListener('pointerup', up); };
  });

  /* ---------- collection : filtres et tri sans rechargement (Section Rendering API), état gardé dans l'URL ---------- */
  C.register('[data-collection]', function (el) {
    var sid = el.getAttribute('data-section-id');
    function params() { var f = $('form[data-filters]', document), p = new URLSearchParams(f ? new FormData(f) : undefined); var s = $('[data-sort]', el); if (s && s.value) p.set('sort_by', s.value); Array.from(p.keys()).forEach(function (k) { if (p.get(k) === '') p.delete(k); }); return p; }
    function load(p, push) {
      var qs = p.toString(), url = location.pathname + (qs ? '?' + qs : '');
      if (C.filterAdapter) { C.filterAdapter(el, p); if (push) history.pushState({ brg: 1 }, '', url); return; }
      var res = $('[data-coll-results]', el); res.classList.add('is-loading');
      fetch(url + (qs ? '&' : '?') + 'section_id=' + sid).then(function (r) { return r.text(); }).then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        ['[data-coll-results]', '[data-filters-body]', '[data-coll-count]', '[data-chips]'].forEach(function (s) { var a = $(s, el) || $(s), b = $(s, doc); if (a && b) a.innerHTML = b.innerHTML; });
        if (push) history.pushState({ brg: 1 }, '', url);
        mount(el); Fav.paint();
      }).catch(function () { location.href = url; }).then(function () { res.classList.remove('is-loading'); });
    }
    function change(e) { if (e.target.closest('form[data-filters]') || e.target.matches('[data-sort]')) load(params(), true); }
    function click(e) { var c = e.target.closest('[data-filter-link]'); if (!c) return; e.preventDefault(); var u = new URL(c.href, location.href); var p = u.searchParams; if (C.filterAdapter) { $$('form[data-filters] input', document).forEach(function (i) { if (i.type === 'checkbox') i.checked = p.getAll(i.name).indexOf(i.value) > -1; else i.value = p.get(i.name) || ''; }); } load(p, true); }
    function pop() { var p = new URLSearchParams(location.search); if (C.filterAdapter) { $$('form[data-filters] input', document).forEach(function (i) { if (i.type === 'checkbox') i.checked = p.getAll(i.name).indexOf(i.value) > -1; else i.value = p.get(i.name) || ''; }); var s = $('[data-sort]', el); if (s) s.value = p.get('sort_by') || s.getAttribute('data-default'); } load(p, false); }
    document.addEventListener('change', change); el.addEventListener('click', click); addEventListener('popstate', pop);
    if (C.filterAdapter && location.search) pop();
    return function () { document.removeEventListener('change', change); el.removeEventListener('click', click); removeEventListener('popstate', pop); };
  });

  /* ---------- vidéo d'ouverture : bouton pause, arrêt hors écran / onglet masqué, pas de lecture si mouvement réduit ---------- */
  C.register('[data-hero]', function (el) {
    var v = $('video', el), b = $('[data-video-toggle]', el); if (!v) { if (b) b.hidden = true; return; }
    var user = reduce ? 'paused' : 'playing', inView = true;
    function sync() { var play = user === 'playing' && inView && !document.hidden; if (play) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause();
      if (b) { b.setAttribute('aria-pressed', String(user === 'paused')); b.setAttribute('aria-label', user === 'paused' ? b.getAttribute('data-label-play') : b.getAttribute('data-label-pause')); $('[data-icon-pause]', b).hidden = user === 'paused'; $('[data-icon-play]', b).hidden = user !== 'paused'; } }
    function click() { user = user === 'playing' ? 'paused' : 'playing'; sync(); }
    if (reduce) v.removeAttribute('autoplay');
    if (b) b.addEventListener('click', click);
    var io = new IntersectionObserver(function (es) { inView = es[0].isIntersecting; sync(); }); io.observe(el);
    document.addEventListener('visibilitychange', sync); sync();
    return function () { io.disconnect(); document.removeEventListener('visibilitychange', sync); if (b) b.removeEventListener('click', click); };
  });

  /* ---------- démarrage ---------- */
  function start() {
    mount(document);
    Fav.paint();
    Cart.get().catch(function () {});
    var hero = $('[data-hero]'); if (hero) hero.classList.add('hero-in');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  document.addEventListener('shopify:section:load', function (e) { mount(e.target); Fav.paint(); });
  document.addEventListener('shopify:section:unload', function (e) { unmount(e.target); });
  addEventListener('pageshow', function (e) { if (e.persisted) { Cart.get().catch(function () {}); Fav.paint(); C.closeDrawer(true); } });
})();
