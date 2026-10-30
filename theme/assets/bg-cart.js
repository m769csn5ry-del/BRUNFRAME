/* Panier : Shopify Ajax Cart API (locale-aware). L'adaptateur est remplaçable (window.BG_CART_ADAPTER) pour la démo locale. */
window.BG = window.BG || {};
(function (BG) {
  var root = (window.Shopify && Shopify.routes && Shopify.routes.root) || '/';
  function j(url, body) {
    return fetch(root + url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) } : { headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) return r.json().then(function (e) { throw new Error(e.description || e.message || 'Erreur panier'); }); return r.json(); });
  }
  var shopify = {
    get: function () { return j('cart.js'); },
    add: function (id, qty) { return j('cart/add.js', { items: [{ id: Number(id), quantity: qty }] }).then(function () { return j('cart.js'); }); },
    change: function (key, qty) { return j('cart/change.js', { id: key, quantity: qty }); },
    discount: null /* codes promo : saisis au checkout natif Shopify (aucune logique ici) */
  };
  var A = function () { return window.BG_CART_ADAPTER || shopify; };
  var cart = null, drawer, lastFocus, closeTimer, pending=Promise.resolve();
  function enqueue(fn) { var next=pending.then(fn); pending=next.catch(function(){}); return next; }
  function background(lock) { document.querySelectorAll("body > header, body > main, body > footer").forEach(function(n){n.inert=lock}); }

  function money(cents, cur) {
    var c = cur || (window.Shopify && Shopify.currency && Shopify.currency.active) || 'EUR';
    try { return new Intl.NumberFormat(document.documentElement.lang || 'fr', { style: 'currency', currency: c }).format(cents / 100); }
    catch (_) { return (cents / 100).toFixed(2) + ' ' + c; }
  }
  BG.money = money;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }

  function render() {
    if (!drawer || !cart) return;
    var body = drawer.querySelector('[data-cart-body]'), foot = drawer.querySelector('[data-cart-foot]');
    var thr = Number(drawer.dataset.threshold || 0), left = Math.max(0, thr - cart.total_price);
    document.querySelectorAll('[data-cart-count]').forEach(function (n) { n.textContent = cart.item_count; n.hidden = !cart.item_count; });
    if (!cart.items.length) {
      body.innerHTML = '<div class="bg-cart-empty"><p class="bg-display">Votre panier est vide.</p><a class="bg-btn" href="' + esc(drawer.dataset.collectionUrl) + '">Découvrir les colliers</a></div>';
      foot.hidden = true; return;
    }
    var pct = thr ? Math.min(100, Math.round(cart.total_price / thr * 100)) : 0;
    var ship = thr ? '<div class="bg-ship"><p>' + (left > 0 ? 'Plus que <strong>' + money(left, cart.currency) + '</strong> pour la livraison offerte' : '<strong>Livraison offerte</strong> sur cette commande') +
      '</p><div class="bg-ship__bar" role="progressbar" aria-label="Progression vers le seuil de livraison offerte" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div>' +
      '<small>Conditions confirmées sur la boutique officielle.</small></div>' : '';
    body.innerHTML = ship + '<ul class="bg-lines">' + cart.items.map(function (it) {
      return '<li class="bg-line"><a class="bg-line__img" href="' + esc(it.url) + '"><img src="' + esc(it.image || '') + '" alt="' + esc(it.title) + '" width="72" height="72"></a>' +
        '<div><a href="' + esc(it.url) + '" class="bg-line__t">' + esc(it.product_title || it.title) + '</a><p class="bg-dim">' + esc(it.variant_title || '') + '</p>' +
        '<div class="bg-qty" role="group" aria-label="Quantité"><button type="button" data-q="' + esc(it.key) + '" data-d="-1" aria-label="Moins">−</button><output>' + it.quantity + '</output><button type="button" data-q="' + esc(it.key) + '" data-d="1" aria-label="Plus">+</button></div></div>' +
        '<div class="bg-line__p">' + money(it.final_line_price, cart.currency) + '<button type="button" class="bg-link" data-q="' + esc(it.key) + '" data-d="-999">Retirer</button></div></li>';
    }).join('') + '</ul>';
    foot.hidden = false;
    foot.querySelector('[data-cart-subtotal]').textContent = money(cart.total_price, cart.currency);
    var checkout=foot.querySelector('[data-checkout]');
    if(checkout) checkout.href='https://breslevgang.com/cart/'+cart.items.map(function(it){return it.id+':'+it.quantity}).join(',')+'?storefront=true';
  }

  function set(c) { cart = c; render(); document.dispatchEvent(new CustomEvent('bg:cart:updated', { detail: c })); return c; }
  function toast(msg) { var t = drawer && drawer.querySelector('[data-cart-msg]'); if (t) { t.textContent = msg; } }

  BG.cart = {
    refresh: function () { return A().get().then(set); },
    add: function (id, qty, meta) {
      toast(''); return enqueue(function(){return A().add(id, qty || 1)}).then(set).then(function (c) {
        BG.track && BG.track('add_to_cart', { variant_id: id, title: meta && meta.title });
        BG.cart.open(); return c;
      }).catch(function (e) { BG.cart.open(); toast(e.message); });
    },
    change: function (key, qty) { toast(''); return enqueue(function(){return A().change(key, Math.max(0, qty))}).then(set).catch(function (e) { toast(e.message); }); },
    open: function () { if (!drawer) return; clearTimeout(closeTimer); if(drawer.hidden) lastFocus = document.activeElement; drawer.hidden = false; background(true); document.body.classList.add('bg-lock'); requestAnimationFrame(function () { drawer.classList.add('is-open'); var c = drawer.querySelector('[data-cart-close]'); c && c.focus(); }); },
    close: function () { if (!drawer) return; drawer.classList.remove('is-open'); document.body.classList.remove('bg-lock'); background(false); closeTimer=setTimeout(function () { drawer.hidden = true; }, 280); lastFocus && lastFocus.focus && lastFocus.focus(); }
  };

  BG.track = function (name, payload) { /* événements internes ; branchement analytics soumis au consentement (Customer Privacy API) */
    document.dispatchEvent(new CustomEvent('bg:track', { detail: { name: name, payload: payload } }));
  };

  function init() {
    drawer = document.querySelector('[data-cart-drawer]');
    if (!drawer) return;
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-cart-open],[data-cart-close],[data-q]');
      if (!t) return;
      if (t.hasAttribute('data-cart-open')) { e.preventDefault(); BG.cart.open(); }
      else if (t.hasAttribute('data-cart-close')) BG.cart.close();
      else if (t.dataset.q) {
        var it = cart.items.filter(function (i) { return String(i.key) === t.dataset.q; })[0];
        if (it) { drawer.setAttribute('aria-busy','true'); drawer.querySelectorAll('[data-q]').forEach(function(b){b.disabled=true}); BG.cart.change(it.key, it.quantity + Number(t.dataset.d)).finally(function(){drawer.removeAttribute('aria-busy');drawer.querySelectorAll('[data-q]').forEach(function(b){b.disabled=false});var replacement=Array.from(drawer.querySelectorAll('[data-q]')).find(function(b){return b.dataset.q===t.dataset.q&&b.dataset.d===t.dataset.d});if(replacement)replacement.focus();else drawer.querySelector('[data-cart-close]').focus()}); }
      }
    });
    drawer.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') BG.cart.close();
      if(e.key!=='Tab')return;
      var nodes=Array.from(drawer.querySelectorAll('button:not([disabled]),a[href],input:not([disabled])')).filter(function(n){return n.getClientRects().length&&!n.closest('[hidden]')});
      var first=nodes[0],last=nodes[nodes.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
    });
    document.addEventListener('submit', function (e) {
      var f = e.target.closest('[data-add-form]'); if (!f) return;
      e.preventDefault();
      var btn = f.querySelector('[type=submit]'); btn && (btn.disabled = true);
      BG.cart.add(f.querySelector('[name=id]').value, Number((f.querySelector('[name=quantity]') || {}).value || 1), { title: f.dataset.title }).then(function () { btn && (btn.disabled = false); });
    });
    BG.cart.refresh().catch(function () { });
  }
  if (document.readyState !== 'loading') init(); else document.addEventListener('DOMContentLoaded', init);
})(window.BG);
