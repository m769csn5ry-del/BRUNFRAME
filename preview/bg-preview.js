/* PRÉVISUALISATION — colle entre les données publiques relevées (data.js) et les composants du thème.
   Photos, titres et prix = breslevgang.com (relevé public 29/10/2026). Panier = adaptateur LOCAL fictif, aucun checkout. */
window.BG = window.BG || {};
(function (BG) {
  var D = window.BG_DATA || { products: [], best: [], rail: [] };
  var byH = {}, groups = {};
  D.products.forEach(function (p) { byH[p.h] = p; if (p.g) (groups[p.g] = groups[p.g] || []).push(p); });
  BG.byHandle = function (h) { return byH[h]; };
  BG.group = function (p) { return p && p.g && groups[p.g] && groups[p.g].length > 1 ? groups[p.g] : null; };
  BG.img = function (u, w) { return u ? u + (u.indexOf('?') < 0 ? '?' : '&') + 'width=' + (w || 600) : ''; };
  BG.url = function (p) { return 'product.html?h=' + encodeURIComponent(p.h); };
  BG.official = function (p) { return 'https://breslevgang.com/products/' + encodeURIComponent(p.h); };
  var money = function (c) { return BG.money(c, 'EUR'); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); };
  BG.esc = esc;

  /* ---- panier local (même interface que l'API Ajax Shopify, cf. bg-cart.js) ---- */
  var KEY = 'bg_demo_cart_v2', byV = {};
  D.products.forEach(function (p) { byV[p.vid] = p; });
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (_) { return {}; } }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (_) { } }
  function cartJSON() {
    var o = load(), items = [], total = 0, count = 0;
    Object.keys(o).forEach(function (id) {
      var p = byV[id], q = o[id]; if (!p || !q) return;
      items.push({ key: String(id), id: Number(id), quantity: q, product_title: p.t, title: p.t, variant_title: p.gl || '', url: BG.url(p), image: BG.img(p.img[0], 200), final_line_price: p.p * q });
      total += p.p * q; count += q;
    });
    return { items: items, total_price: total, item_count: count, currency: 'EUR' };
  }
  window.BG_CART_ADAPTER = {
    get: function () { return Promise.resolve(cartJSON()); },
    add: function (id, qty) {
      var p = byV[id];
      if (!p) return Promise.reject(new Error('Variante inconnue'));
      if (!p.a) return Promise.reject(new Error('Cette pièce est épuisée.'));
      var o = load(); o[id] = (o[id] || 0) + qty; save(o); return Promise.resolve(cartJSON());
    },
    change: function (key, qty) { var o = load(); if (qty <= 0) delete o[key]; else o[key] = qty; save(o); return Promise.resolve(cartJSON()); }
  };

  var LOGO = D.logo ? BG.img(D.logo, 600) : '';
  function logo(cls) {
    return LOGO ? '<img class="' + (cls || '') + '" src="' + LOGO + '" alt="Breslev Gang" width="300" height="90" onerror="this.outerHTML=\'<span class=&quot;bg-display&quot;>Breslev Gang</span>\'">' : '<span class="bg-display">Breslev Gang</span>';
  }
  var ICON = {
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 5 5"/></svg>',
    bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h16M4 15h16"/></svg>'
  };

  BG.preview = {
    /* header() est appelé juste après <body> (pas de décalage de mise en page), footer() en fin de page. */
    shell: function (active, o) { BG.preview.header(active, o); BG.preview.footer(); },
    header: function (active, o) {
      o = o || {};
      var nav = [['Colliers', 'collection.html?k=Collier'], ['Peteks', 'collection.html?k=Petek'], ['Best-sellers', 'index.html#best-sellers'], ['La maison', 'index.html#maison']];
      document.body.insertAdjacentHTML('afterbegin',
        '<a class="bg-skip" href="#main">Aller au contenu</a>' +
        (o.intro ? '<div class="bg-intro" data-intro hidden><div class="bg-intro__inner"><div class="bg-intro__logo">' + logo() + '</div><div class="bg-intro__line"></div></div><button class="bg-btn bg-btn--ghost bg-btn--sm bg-intro__skip" data-intro-skip type="button">Passer</button></div>' : '') +
        '<div class="bg-announce"><span>Livraison offerte dès 120 € d’achats · France</span><span>Prévisualisation BRUNFRAME · panier fictif</span></div>' +
        '<header class="bg-header"><div class="bg-wrap bg-header__in">' +
        '<a class="bg-logo" href="index.html" aria-label="Breslev Gang — accueil">' + logo() + '</a>' +
        '<nav class="bg-nav" data-menu aria-label="Principal">' + nav.map(function (n) { return '<a href="' + n[1] + '"' + (n[0] === active ? ' aria-current="page"' : '') + '>' + n[0] + '</a>'; }).join('') + '</nav>' +
        '<div class="bg-tools"><a class="bg-icon-btn" href="collection.html?k=Collier" aria-label="Rechercher">' + ICON.search + '</a>' +
        '<button class="bg-icon-btn" type="button" data-cart-open aria-label="Panier">' + ICON.bag + '<span class="bg-badge" data-cart-count hidden>0</span></button>' +
        '<button class="bg-icon-btn bg-menu-btn" type="button" data-menu-toggle aria-expanded="false" aria-label="Menu">' + ICON.menu + '</button></div></div></header>');
    },
    footer: function () {
      document.body.insertAdjacentHTML('beforeend',
        '<footer class="bg-footer"><div class="bg-wrap">' +
        '<div class="bg-footer__brand">' + logo() + '<q>Not Just Necklace it’s a Protection</q></div>' +
        '<div class="bg-footer__cols">' +
        '<div><h3>Colliers</h3><ul><li><a href="collection.html?k=Collier&f=Flamme">Flamme · Aech Cheli</a></li><li><a href="collection.html?k=Collier&f=Maguen%20David">Maguen David</a></li><li><a href="collection.html?k=Collier&f=Hay">Hay · חי</a></li><li><a href="collection.html?k=Collier&f=Mezouza">Mezouza</a></li></ul></div>' +
        '<div><h3>Peteks</h3><ul><li><a href="collection.html?k=Petek">Tous les Peteks</a></li><li><a href="collection.html?k=Petek&q=croco">Cuir exotique</a></li><li><a href="collection.html?k=Petek&q=perle">À perles</a></li></ul></div>' +
        '<div><h3>Maison</h3><ul><li><a href="https://www.instagram.com/breslev_gang/" rel="noopener">Instagram</a></li><li><a href="https://tiktok.com/@breslevgang" rel="noopener">TikTok</a></li><li><a href="https://breslevgang.com/pages/contact" rel="noopener">Contact</a></li></ul></div>' +
        '<div><h3>Paiement</h3><ul class="bg-pay"><li>CB</li><li>Visa</li><li>Mastercard</li><li>Amex</li><li>Apple Pay</li><li>Google Pay</li><li>PayPal</li><li>Klarna</li><li>Shop Pay</li><li>Bancontact</li></ul></div>' +
        '</div><div class="bg-legal"><span>© 2026 Breslev Gang · Mentions légales, CGV, confidentialité : pages Shopify officielles</span><span>Concept BRUNFRAME — données publiques relevées le 29/10/2026</span></div></div></footer>' +
        '<div class="bg-drawer" data-cart-drawer hidden role="dialog" aria-modal="true" aria-labelledby="bg-cart-title" data-threshold="12000" data-collection-url="collection.html?k=Collier"><div class="bg-drawer__veil" data-cart-close></div><div class="bg-drawer__panel">' +
        '<div class="bg-drawer__head"><h2 class="bg-display" id="bg-cart-title">Votre panier</h2><button class="bg-icon-btn" type="button" data-cart-close aria-label="Fermer">✕</button></div><div class="bg-drawer__body" data-cart-body></div>' +
        '<div class="bg-drawer__foot" data-cart-foot hidden><p class="bg-sub"><span>Sous-total</span><strong data-cart-subtotal></strong></p><p class="bg-dim">Taxes incluses ; livraison et réductions calculées au paiement.</p><p data-cart-msg role="alert"></p>' +
        '<button class="bg-btn" type="button" disabled>Paiement Shopify — désactivé en démo</button></div></div></div>');
      var m = document.querySelector('main'); if (m) m.id = 'main';
    },
    card: function (p, o) {
      o = o || {};
      var g = o.grouped ? BG.group(p) : null;
      return '<article class="bg-card-wrap" style="position:relative"><a class="bg-card" href="' + BG.url(p) + '">' +
        '<div class="bg-card__img">' + (p.a ? '' : '<span class="bg-card__tag">Épuisé</span>') +
        '<img src="' + BG.img(p.img[0], 640) + '" alt="' + esc(p.t) + '" loading="' + (o.eager ? 'eager' : 'lazy') + '" width="640" height="800">' +
        (p.img[1] ? '<img src="' + BG.img(p.img[1], 640) + '" alt="" loading="lazy" width="640" height="800">' : '') + '</div>' +
        '<div class="bg-card__meta"><span class="bg-card__f">' + esc(p.k === 'Collier' ? p.f : 'Petek') + '</span><span class="bg-card__t">' + esc(o.title || p.t) + '</span><span class="bg-card__p">' + money(p.p) + '</span>' +
        (g ? '<span class="bg-card__v">' + g.length + ' coloris · regroupement proposé</span>' : '') + '</div></a>' +
        (p.a ? '<button class="bg-card__add" type="button" data-quick-add="' + p.vid + '" data-title="' + esc(p.t) + '" aria-label="Ajouter ' + esc(p.t) + ' au panier">+</button>' : '') + '</article>';
    },
    railItems: function () {
      return D.rail.filter(function (h) { return byH[h]; }).map(function (h) {
        var p = byH[h], g = BG.group(p) || [p];
        return {
          handle: p.h, title: p.t, priceLabel: money(p.p), url: BG.url(p), variantId: p.vid,
          photo: BG.img(p.img[0], 520), photos: p.img.map(function (u) { return BG.img(u, 200); }), focusY: .64,
          colors: g.map(function (m) { return { name: m.gl || 'Standard', title: m.t, priceLabel: money(m.p), url: BG.url(m), variantId: m.vid, photo: BG.img(m.img[0], 520), photos: m.img.map(function (u) { return BG.img(u, 200); }) }; })
        };
      });
    },
    product: function (p) {
      var g = BG.group(p) || [p];
      var opts = g.length > 1 ? '<fieldset class="bg-opts"><legend>Coloris : <span data-v-opt></span></legend><div class="bg-opts__row">' + g.map(function (m) {
        return '<label class="bg-opt"><input type="radio" name="opt0" value="' + esc(m.gl) + '" data-option="0"' + (m.h === p.h ? ' checked' : '') + '><span class="bg-pill"><img src="' + BG.img(m.img[0], 120) + '" alt="" width="34" height="42">' + esc(m.gl) + '</span></label>';
      }).join('') + '</div></fieldset><p class="bg-note bg-group-note">Regroupement proposé : ces coloris sont aujourd’hui ' + g.length + ' fiches séparées sur la boutique.</p>' : '';
      var json = { handle: p.h, selected: p.vid, options: ['Coloris'], variants: g.map(function (m) { return { id: m.vid, title_full: m.t, handle: m.h, options: [m.gl || 'Standard'], price: m.p, compare_at_price: m.c, sku: m.sku, available: m.a, image: BG.img(m.img[0], 1200), images: m.img.map(function (u) { return BG.img(u, 1200); }) }; }) };
      var rec = D.products.filter(function (x) { return x.k === p.k && x.f === p.f && x.h !== p.h && (!p.g || x.g !== p.g); }).slice(0, 4);
      return '<div class="bg-wrap"><p class="bg-crumbs"><a href="index.html">Accueil</a> / <a href="collection.html?k=' + p.k + '">' + (p.k === 'Collier' ? 'Colliers' : 'Peteks') + '</a> / ' + esc(p.f) + '</p></div>' +
        '<div class="bg-wrap" data-product><div class="bg-pdp"><div class="bg-gal"><div class="bg-gal__main" data-zoom><img data-main-img src="' + BG.img(p.img[0], 1200) + '" alt="' + esc(p.t) + '" width="1200" height="1500" fetchpriority="high"></div>' +
        '<div class="bg-gal__thumbs" data-thumbs>' + p.img.map(function (u, i) { return '<button type="button" data-thumb="' + BG.img(u, 1200) + '" aria-label="Photo ' + (i + 1) + '"' + (i ? '' : ' aria-current="true"') + '><img src="' + BG.img(u, 160) + '" alt=""></button>'; }).join('') + '</div></div>' +
        '<div class="bg-pdp__info"><p class="bg-kicker">' + esc(p.k === 'Collier' ? 'Collier · ' + p.f : 'Petek') + '</p><h1 class="bg-display" data-v-title>' + esc(p.t) + '</h1>' +
        '<p class="bg-price"><span data-v-price></span> <s data-v-compare hidden></s></p><p class="bg-note bg-pdp__klarna">Prix public relevé le 29/10/2026 · Paiement en plusieurs fois avec Klarna dès 120 € (mention officielle)</p>' +
        '<form data-add-form data-title="' + esc(p.t) + '"><input type="hidden" name="id" value="">' + opts +
        '<input type="hidden" name="quantity" value="1"><button class="bg-btn" type="submit" style="width:100%" data-add="Ajouter au panier" data-sold="Épuisé"><span>Ajouter au panier</span></button><p data-cart-msg role="alert"></p></form>' +
        '<p class="bg-meta">Réf. variante <span data-v-sku></span> · <a href="' + BG.official(p) + '" rel="noopener">Voir la fiche officielle</a></p>' +
        '<div class="bg-info"><details open><summary>Description</summary><div>Description, matière et dimensions : reprises automatiquement depuis Shopify à l’intégration. Rien n’est affirmé ici sans la fiche réelle.</div></details>' +
        '<details><summary>Livraison & retours</summary><div>Livraison offerte dès 120 € d’achats en France (bandeau officiel). Les règles varient selon le pays : elles seront lues dans Shopify. Retours : politique officielle de la boutique.</div></details>' +
        '<details><summary>Paiement</summary><div>Checkout Shopify officiel : CB, Apple Pay, Google Pay, PayPal, Klarna, Shop Pay…</div></details></div></div></div>' +
        '<script type="application/json" data-product-json>' + JSON.stringify(json).replace(/</g, '\\u003c') + '<\/script></div>' +
        (rec.length ? '<section class="bg-section bg-section--tight"><div class="bg-wrap"><div class="bg-section__head"><div><p class="bg-kicker">Même famille</p><h2 class="bg-display">À porter aussi</h2></div></div><div class="bg-grid">' + rec.map(function (x) { return BG.preview.card(x); }).join('') + '</div></div></section>' : '');
    }
  };
})(window.BG);
