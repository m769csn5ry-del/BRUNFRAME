/* PRÉVISUALISATION UNIQUEMENT — n'est jamais copié dans le thème.
   Remplace, dans l'aperçu statique, ce que fait Shopify côté serveur : API panier (mêmes formats JSON), filtres, recherche.
   Tests d'erreur : localStorage.setItem('brg-preview-offline','1') simule une coupure réseau. */
(function () {
  'use strict';
  var KEY = 'brg-preview-cart', vindex = null, nativeFetch = window.fetch.bind(window);
  function idx() { return vindex ? Promise.resolve(vindex) : nativeFetch('/preview/variants.json').then(function (r) { return r.json(); }).then(function (j) { vindex = j; return j; }); }
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function save(l) { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) {} }
  function cartJSON(v) {
    var items = load().map(function (l) {
      var x = v[l.id]; if (!x) return null;
      return { id: Number(l.id), variant_id: Number(l.id), key: l.id + ':preview', quantity: l.q, title: x.product_title + (x.only ? '' : ' - ' + x.title), product_title: x.product_title, variant_title: x.only ? null : x.title,
        product_id: x.product_id, product_has_only_default_variant: x.only, options_with_values: x.only ? [] : x.options, price: x.price, original_price: x.price, final_price: x.price,
        line_price: x.price * l.q, original_line_price: Math.max(x.price, x.compare || 0) * l.q, final_line_price: x.price * l.q, image: x.image, url: x.url, handle: x.handle };
    }).filter(Boolean);
    var total = items.reduce(function (s, i) { return s + i.final_line_price; }, 0);
    return { token: 'preview', note: null, attributes: {}, currency: 'EUR', item_count: items.reduce(function (s, i) { return s + i.quantity; }, 0), items: items, total_price: total, items_subtotal_price: total, total_discount: 0, requires_shipping: true };
  }
  function res(body, status) { return new Response(JSON.stringify(body), { status: status || 200, headers: { 'Content-Type': 'application/json' } }); }
  function err(desc) { return res({ status: 422, message: 'Cart Error', description: desc }, 422); }
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : input.url, u = new URL(url, location.href), p = u.pathname;
    if (!/^\/cart(\/(add|change|update|clear))?\.js$/.test(p)) return nativeFetch(input, init);
    if (localStorage.getItem('brg-preview-offline') === '1') return new Promise(function (_, rej) { setTimeout(function () { rej(new TypeError('Failed to fetch')); }, 300); });
    var body = init && init.body ? JSON.parse(init.body) : {};
    return new Promise(function (r) { setTimeout(r, 260); }).then(idx).then(function (v) {
      var l = load();
      if (p === '/cart.js') return res(cartJSON(v));
      if (p === '/cart/clear.js') { save([]); return res(cartJSON(v)); }
      if (p === '/cart/add.js') {
        var it = (body.items || [{ id: body.id, quantity: body.quantity }])[0], x = v[it.id];
        if (!x) return err('Variante introuvable.');
        if (!x.available) return err('Le produit « ' + x.product_title + ' » est épuisé.');
        var line = l.filter(function (y) { return String(y.id) === String(it.id); })[0];
        if (line) line.q += Number(it.quantity) || 1; else l.push({ id: String(it.id), q: Number(it.quantity) || 1 });
        save(l);
        return res({ items: [cartJSON(v).items.filter(function (y) { return String(y.id) === String(it.id); })[0]] });
      }
      if (p === '/cart/change.js') {
        var id = String(body.id || '').split(':')[0], q = Number(body.quantity);
        if (q > 20) return err('Vous ne pouvez pas ajouter plus de 20 exemplaires de cette pièce (limite de l\'aperçu).');
        l = l.map(function (y) { if (y.id === id) y.q = q; return y; }).filter(function (y) { return y.q > 0; });
        save(l); return res(cartJSON(v));
      }
      return res(cartJSON(v));
    });
  };
  /* paiement : renvoie vers Shopify, impossible dans l'aperçu */
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f.querySelector('[name="checkout"]')) { e.preventDefault(); alert('Aperçu local : le paiement se fait sur le checkout Shopify de la boutique. Aucune commande n\'est passée ici.'); }
    if (f.querySelector('[name="form_type"][value="contact"]')) { e.preventDefault(); f.insertAdjacentHTML('afterbegin', '<p class="note full" role="status">Aperçu local : le message n\'est pas envoyé (formulaire Shopify sur la boutique).</p>'); }
  }, true);

  (function () { /* script différé : le document est déjà analysé */
    var B = window.BRG || (window.BRG = {});
    /* filtres de collection : même URL que Shopify, filtrage local des cartes */
    var data = document.getElementById('preview-collection');
    if (data) {
      var rows = JSON.parse(data.textContent), byH = {}; rows.forEach(function (r, i) { r.i = i; byH[r.h] = r; });
      B.filterAdapter = function (el, params) {
        var grid = el.querySelector('[data-coll-results] .grid'); if (!grid) return;
        var cards = Array.prototype.slice.call(grid.children), av = params.getAll('filter.v.availability'), gte = parseFloat(params.get('filter.v.price.gte')), lte = parseFloat(params.get('filter.v.price.lte')), sort = params.get('sort_by') || 'manual', n = 0;
        var opts = {}; params.forEach(function (v, k) { if (k.indexOf('filter.v.option.') === 0) (opts[k] = opts[k] || []).push(v); });
        cards.forEach(function (c) {
          var b = c.querySelector('[data-fav]'), r = b && byH[b.getAttribute('data-fav')]; if (!r) return;
          var ok = (!av.length || av.indexOf(r.a ? '1' : '0') > -1) && (isNaN(gte) || r.p >= gte * 100) && (isNaN(lte) || r.p <= lte * 100);
          Object.keys(opts).forEach(function (k) { if (!(r.o[k] || []).some(function (v) { return opts[k].indexOf(v) > -1; })) ok = false; });
          c.hidden = !ok; c.__r = r; if (ok) n++;
        });
        var cmp = { 'title-ascending': function (a, b) { return a.t.localeCompare(b.t, 'fr'); }, 'title-descending': function (a, b) { return b.t.localeCompare(a.t, 'fr'); }, 'price-ascending': function (a, b) { return a.p - b.p; }, 'price-descending': function (a, b) { return b.p - a.p; }, 'created-ascending': function (a, b) { return a.c < b.c ? -1 : 1; }, 'created-descending': function (a, b) { return a.c > b.c ? -1 : 1; } }[sort] || function (a, b) { return a.i - b.i; };
        cards.filter(function (c) { return c.__r; }).sort(function (a, b) { return cmp(a.__r, b.__r); }).forEach(function (c) { grid.appendChild(c); });
        var cnt = el.querySelector('[data-coll-count]'); if (cnt) cnt.textContent = n + (n > 1 ? ' pièces' : ' pièce');
        var chips = el.querySelector('[data-chips]');
        if (chips) { var h = ''; params.forEach(function (v, k) { if (k === 'sort_by' || v === '') return; var q = new URLSearchParams(params); q.delete(k); var lab = { 'filter.v.availability': v === '1' ? 'En stock' : 'En rupture', 'filter.v.price.gte': 'Prix dès ' + v + ' €', 'filter.v.price.lte': 'Prix jusqu\'à ' + v + ' €' }[k] || v; h += '<a class="chip" data-filter-link href="?' + q + '">' + lab + ' <span aria-hidden="true">×</span></a>'; }); chips.innerHTML = h; }
        var empty = el.querySelector('[data-preview-empty]'); if (!n && !empty) grid.insertAdjacentHTML('afterend', '<p class="empty" data-preview-empty>Aucune pièce ne correspond à ces filtres.</p>'); else if (n && empty) empty.remove();
      };
    }
    /* recherche : même balisage que le snippet product-card */
    var box = document.querySelector('[data-search-results]'), q = new URLSearchParams(location.search).get('q');
    if (box && q) {
      var h1 = document.querySelector('.page-head .h1'); if (h1) h1.textContent = 'Résultats pour « ' + q + ' »';
      var input = document.getElementById('q'); if (input) input.value = q;
      nativeFetch('/preview/search.json').then(function (r) { return r.json(); }).then(function (list) {
        var norm = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }, toks = norm(q).split(/\s+/).filter(Boolean);
        var hits = list.filter(function (p) { var hay = norm(p.t + ' ' + p.k); return toks.every(function (t) { return hay.indexOf(t) > -1; }); });
        var money = function (c) { return (c / 100).toFixed(2).replace('.', ',') + ' €'; };
        box.innerHTML = hits.length ? '<div class="grid">' + hits.slice(0, 48).map(function (p) {
          return '<article class="card"><a class="card__media" href="/products/' + p.h + '" tabindex="-1" aria-hidden="true">' + (p.i ? '<img src="' + p.i + (p.i.indexOf('?') < 0 ? '?' : '&') + 'width=640" alt="' + p.t.replace(/"/g, '&quot;') + '" width="' + p.w + '" height="' + p.hh + '" loading="lazy">' : '') + '</a>' +
            (p.a ? '' : '<span class="card__badge">Épuisé</span>') + '<button class="fav" type="button" data-fav="' + p.h + '" aria-pressed="false" aria-label="Ajouter aux favoris : ' + p.t.replace(/"/g, '&quot;') + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"/></svg></button>' +
            '<div class="card__meta"><a class="card__title" href="/products/' + p.h + '">' + p.t + '</a><span class="card__price">' + money(p.p) + '</span></div></article>';
        }).join('') + '</div>' : '<p class="empty">Aucun résultat pour « ' + q + ' ».</p>';
        if (B.favs) B.favs.paint();
      });
    }
    document.body.insertAdjacentHTML('beforeend', '<p class="preview-badge">Aperçu local · données publiques du 31/10/2026 · panier simulé</p>');
  })();
})();
