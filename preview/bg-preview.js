/* PRÉVISUALISATION LOCALE — fixtures DÉMO. Aucune donnée Shopify réelle. Prix, handles et stocks sont fictifs/à confirmer.
   Réutilise les mêmes CSS/JS que le thème (../theme/assets). */
window.BG = window.BG || {};
(function (BG) {
  var COL = { chrome: { name: 'Chrome', key: 'chrome', hex: '#cfd6d2' }, noir: { name: 'Noir', key: 'noir', hex: '#1b1e1d' }, vert: { name: 'Vert', key: 'vert', hex: '#36d483' } };
  function mk(handle, title, type, shape, price, cols, avail) {
    return {
      handle: handle, title: title, type: type, shape: shape, price: price,
      variants: cols.map(function (c, i) {
        return { id: handle.length * 1000 + i + 1, title: COL[c].name, options: [COL[c].name], color: c, sku: 'DEMO-' + handle.slice(0, 6).toUpperCase() + '-' + (i + 1), price: price, available: avail ? avail[i] !== false : true };
      })
    };
  }
  BG.fixtures = [
    mk('necklace-maguen-chrome', 'Necklace Maguen Chrome', 'Collier', 'maguen', 7900, ['chrome', 'noir', 'vert']),
    mk('collier-breslev-necklace-fire', 'Collier Breslev Necklace Fire', 'Collier', 'fire', 8900, ['vert', 'chrome', 'noir']),
    mk('necklace-fire-2-0', 'Necklace fire 2.0', 'Collier', 'fire2', 9400, ['chrome', 'vert'], [true, false]),
    mk('modele-demo-04', 'Modèle démo 04', 'Collier', 'disc', 6900, ['chrome', 'noir']),
    mk('petek-demo', 'Petek démo', 'Petek', 'petek', 4900, ['chrome'])
  ];
  BG.byHandle = function (h) { return BG.fixtures.filter(function (p) { return p.handle === h; })[0]; };
  BG.img = function (p, v) { return BG.pendantURI(p.shape, (v || p.variants[0]).color); };
  BG.url = function (p) { return 'product.html?h=' + p.handle; };
  var fmt = function (c) { return BG.money(c); };

  /* ---- adaptateur panier démo (même interface que l'API Ajax Shopify) ---- */
  var KEY = 'bg_demo_cart';
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (_) { return {}; } }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (_) { } }
  function cartJSON() {
    var o = load(), items = [], total = 0, count = 0;
    BG.fixtures.forEach(function (p) {
      p.variants.forEach(function (v) {
        var q = o[v.id]; if (!q) return;
        items.push({ key: String(v.id), id: v.id, quantity: q, product_title: p.title, title: p.title, variant_title: v.title, url: BG.url(p) + '&variant=' + v.id, image: BG.pendantURI(p.shape, v.color, { label: false }), final_line_price: v.price * q });
        total += v.price * q; count += q;
      });
    });
    return { items: items, total_price: total, item_count: count, currency: 'EUR' };
  }
  window.BG_CART_ADAPTER = {
    get: function () { return Promise.resolve(cartJSON()); },
    add: function (id, qty) {
      var v = null; BG.fixtures.forEach(function (p) { p.variants.forEach(function (x) { if (String(x.id) === String(id)) v = x; }); });
      if (!v) return Promise.reject(new Error('Variante inconnue'));
      if (!v.available) return Promise.reject(new Error('Cette variante est épuisée.'));
      var o = load(); o[v.id] = (o[v.id] || 0) + qty; save(o); return Promise.resolve(cartJSON());
    },
    change: function (key, qty) { var o = load(); if (qty <= 0) delete o[key]; else o[key] = qty; save(o); return Promise.resolve(cartJSON()); }
  };

  /* ---- shell : en-tête, pied, tiroir (équivalent des sections Liquid) ---- */
  BG.preview = {
    shell: function (active, o) {
      o = o || {};
      var nav = [['Colliers', 'collection.html'], ['Peteks', 'collection.html?type=Petek'], ['Histoire', 'index.html#histoire'], ['Contact', '#']];
      document.body.insertAdjacentHTML('afterbegin',
        '<a class="bg-skip" href="#main">Aller au contenu</a>' + (o.intro ? '<div class="bg-intro" data-intro hidden><div class="bg-intro__word">Breslev Gang</div><button class="bg-btn bg-btn--ghost bg-intro__skip" data-intro-skip type="button">Passer</button></div>' : '') +
        '<header class="bg-header"><div class="bg-announce">Livraison offerte dès 120 € · <span style="opacity:.7">PRÉVISUALISATION DÉMO — données fictives</span></div><div class="bg-wrap bg-header__in">' +
        '<a class="bg-logo" href="index.html">Breslev Gang</a><nav class="bg-nav" data-menu aria-label="Principal">' + nav.map(function (n) { return '<a href="' + n[1] + '"' + (n[0] === active ? ' aria-current="page"' : '') + '>' + n[0] + '</a>'; }).join('') + '</nav>' +
        '<div class="bg-tools"><a class="bg-icon-btn" href="collection.html" aria-label="Rechercher"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 5 5"/></svg></a>' +
        '<button class="bg-icon-btn" data-cart-open aria-label="Panier"><svg viewBox="0 0 24 24"><path d="M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2"/></svg><span class="bg-badge" data-cart-count hidden>0</span></button>' +
        '<button class="bg-icon-btn bg-menu-btn" data-menu-toggle aria-expanded="false" aria-label="Menu"><svg viewBox="0 0 24 24"><path d="M4 8h16M4 16h16"/></svg></button></div></div></header>');
      document.body.insertAdjacentHTML('beforeend',
        '<footer class="bg-footer"><div class="bg-wrap"><div class="bg-footer__cols"><div><p class="bg-logo">Breslev Gang</p><p class="bg-dim" style="max-width:34ch;margin-top:12px">[Phrase de marque à rédiger avec Ysahar]</p></div>' +
        '<div><h3>Boutique</h3><ul><li><a href="collection.html">Colliers</a></li><li><a href="collection.html?type=Petek">Peteks</a></li></ul></div><div><h3>Aide</h3><ul><li><a href="#">Livraison</a></li><li><a href="#">Retours</a></li><li><a href="#">Contact</a></li></ul></div>' +
        '<div><h3>Légal</h3><ul><li><a href="#">Confidentialité</a></li><li><a href="#">CGV</a></li><li><a href="#">Mentions légales</a></li></ul></div></div>' +
        '<div class="bg-legal"><span>© 2026 Breslev Gang</span><span>[Raison sociale / SIRET — à compléter]</span></div></div></footer>' +
        '<div class="bg-drawer" data-cart-drawer hidden role="dialog" aria-modal="true" aria-labelledby="bg-cart-title" data-threshold="12000" data-collection-url="collection.html"><div class="bg-drawer__veil" data-cart-close></div><div class="bg-drawer__panel">' +
        '<div class="bg-drawer__head"><h2 class="bg-display" id="bg-cart-title">Votre panier</h2><button class="bg-icon-btn" data-cart-close aria-label="Fermer">✕</button></div><div class="bg-drawer__body" data-cart-body></div>' +
        '<div class="bg-drawer__foot" data-cart-foot hidden><p class="bg-sub"><span>Sous-total</span><strong data-cart-subtotal></strong></p><p class="bg-dim">Taxes et livraison calculées au paiement.</p><p data-cart-msg role="alert"></p>' +
        '<button class="bg-btn" type="button" disabled title="Démo : le checkout réel est fourni par Shopify">Passer au paiement (démo)</button></div></div></div>');
      var m = document.querySelector('main'); if (m) m.id = 'main';
    },
    card: function (p, tag) {
      return '<a class="bg-card" href="' + BG.url(p) + '"><div class="bg-card__img"><span class="bg-card__tag">' + (tag || 'Démo') + '</span><img src="' + BG.img(p) + '" alt="' + p.title + ' (silhouette démo)" loading="lazy"></div>' +
        '<div class="bg-card__meta"><span class="bg-card__t">' + p.title + '</span><span class="bg-card__p">' + fmt(p.price) + '</span></div>' +
        '<div class="bg-card__sw">' + p.variants.map(function (v) { return '<i style="--sw:' + COL[v.color].hex + '" title="' + v.title + '"></i>'; }).join('') + '</div></a>';
    },
    railItems: function () {
      return BG.fixtures.map(function (p) {
        return { handle: p.handle, title: p.title, priceLabel: fmt(p.price) + ' (démo)', url: BG.url(p), shape: p.shape, variantId: p.variants[0].id,
          colors: p.variants.map(function (v) { return { name: v.title, key: v.color, hex: COL[v.color].hex, variantId: v.id }; }) };
      });
    },
    product: function (p) {
      var opts = p.variants.map(function (v, i) { return '<label class="bg-opt"><input type="radio" name="opt0" value="' + v.title + '" data-option="0"' + (i === 0 ? ' checked' : '') + '><span class="bg-swatch" style="--sw:' + COL[v.color].hex + '" title="' + v.title + '"></span></label>'; }).join('');
      var json = { handle: p.handle, options: ['Couleur'], variants: p.variants.map(function (v) { return { id: v.id, options: v.options, price: v.price, compare_at_price: 0, sku: v.sku, available: v.available, image: BG.img(p, v) }; }) };
      return '<div class="bg-wrap" data-product><div class="bg-pdp"><div class="bg-gal"><div class="bg-gal__main" data-zoom><img data-main-img src="' + BG.img(p) + '" alt="' + p.title + ' — silhouette démo"></div>' +
        '<div class="bg-gal__thumbs">' + p.variants.map(function (v) { return '<button type="button" data-thumb="' + BG.img(p, v) + '" aria-label="' + v.title + '"><img src="' + BG.img(p, v) + '" alt=""></button>'; }).join('') + '</div></div>' +
        '<div class="bg-pdp__info"><p class="bg-kicker">' + p.type + ' <span class="bg-demo-tag">démo</span></p><h1 class="bg-display">' + p.title + '</h1>' +
        '<p class="bg-price"><span data-v-price></span> <s data-v-compare hidden></s></p>' +
        '<form data-add-form data-title="' + p.title + '"><input type="hidden" name="id" value=""><fieldset class="bg-opts"><legend>Couleur : <span data-v-opt></span></legend><div class="bg-opts__row">' + opts + '</div></fieldset>' +
        '<input type="hidden" name="quantity" value="1"><button class="bg-btn" type="submit" style="width:100%" data-add="Ajouter au panier" data-sold="Épuisé"><span>Ajouter au panier</span></button><p data-cart-msg role="alert"></p></form>' +
        '<p class="bg-meta">SKU : <span data-v-sku></span> · prix, stock et SKU fictifs</p>' +
        '<div class="bg-info"><details open><summary>Description</summary><div>[Description réelle à importer depuis Shopify. Aucune matière ni dimension affirmée.]</div></details><details><summary>Livraison &amp; retours</summary><div>Livraison offerte dès 120 € (affichage public actuel — à vérifier en back-office). [Délais et retours à renseigner.]</div></details></div></div></div>' +
        '<script type="application/json" data-product-json>' + JSON.stringify(json) + '<\/script></div>';
    }
  };
})(window.BG);
