/* Sélecteur de variantes : synchronise id, prix, SKU, stock et image avec la variante choisie. Données = JSON du produit Shopify. */
window.BG = window.BG || {};
(function (BG) {
  function init(root) {
    var js = root.querySelector('[data-product-json]'); if (!js || root.dataset.ready) return;
    root.dataset.ready = 1;
    var P = JSON.parse(js.textContent), form = root.querySelector('[data-add-form]');
    var state = P.variants.filter(function (v) { return String(v.id) === String(P.selected); })[0] ||
      P.variants.filter(function (v) { return v.available; })[0] || P.variants[0];
    function find(opts) { return P.variants.filter(function (v) { return opts.every(function (o, i) { return v.options[i] === o; }); })[0]; }
    function apply(v) {
      state = v;
      form.querySelector('[name=id]').value = v.id;
      root.querySelectorAll('[data-v-price]').forEach(function (n) { n.textContent = BG.money(v.price); });
      var cmp = root.querySelector('[data-v-compare]'); if (cmp) { cmp.hidden = !(v.compare_at_price > v.price); cmp.textContent = BG.money(v.compare_at_price || 0); }
      var sku = root.querySelector('[data-v-sku]'); if (sku) sku.textContent = v.sku || '—';
      var btn = form.querySelector('[type=submit]'); btn.disabled = !v.available;
      var status=root.querySelector('[data-v-status]');if(status)status.textContent=v.available?'Disponible au relevé public':'Épuisé au relevé public';
      v.options.forEach(function(o,i){var r=root.querySelector('[data-option="'+i+'"][value="'+CSS.escape(o)+'"]');if(r)r.checked=true});
      if(v.title_full){document.title=v.title_full+' — Breslev Gang';var meta=document.querySelector('meta[name=description]');if(meta)meta.content=v.title_full+' · '+BG.money(v.price)+' · Photos et variantes Breslev Gang.';}
      if(v.handle){root.querySelectorAll('[data-official-product]').forEach(function(a){a.href='https://breslevgang.com/products/'+encodeURIComponent(v.handle)})}
      btn.querySelector('span').textContent = v.available ? btn.dataset.add : btn.dataset.sold;
      try { var url = new URL(location.href); url.searchParams.set('variant', v.id); history.replaceState(null, '', url); } catch (_) { }
      if (v.image) { var img = root.querySelector('[data-main-img]'); if (img) { img.src = v.image; img.srcset = ''; } }
      var tt = root.querySelector('[data-v-title]'); if (tt && v.title_full) tt.textContent = v.title_full;
      var th = root.querySelector('[data-thumbs]');
      if (th && v.images) th.innerHTML = v.images.map(function (u, i) { return '<button type="button" data-thumb="' + u + '" aria-label="Photo ' + (i + 1) + '"' + (i ? '' : ' aria-current="true"') + '><img src="' + u.replace(/width=\d+/, 'width=160') + '" alt=""></button>'; }).join('');
      var opt = root.querySelector('[data-v-opt]'); if (opt) opt.textContent = v.options.join(' / ');
      root.querySelectorAll('[data-v-optname]').forEach(function (n) { n.textContent = v.options[Number(n.dataset.vOptname)] || ''; });
      BG.track && BG.track('select_item', { variant_id: v.id });
      root.dispatchEvent(new CustomEvent('bg:variant', { detail: v, bubbles: true }));
    }
    root.addEventListener('change', function (e) {
      if (!e.target.matches('[data-option]')) return;
      var opts = P.options.map(function (_, i) { var c = root.querySelector('[data-option="' + i + '"]:checked'); return c && c.value; });
      var v = find(opts); if (v) apply(v); else {form.querySelector('[name=id]').value='';form.querySelector('[type=submit]').disabled=true;form.querySelector('[type=submit] span').textContent='Combinaison indisponible';}
    });
    var q = new URL(location.href).searchParams.get('variant');
    var start = q && P.variants.filter(function (v) { return String(v.id) === q; })[0];
    if (start) {
      state = start;
      start.options.forEach(function (o, i) { var r = root.querySelector('[data-option="' + i + '"][value="' + CSS.escape(o) + '"]'); if (r) r.checked = true; });
    }
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-thumb]'); if (!b) return;
      var img = root.querySelector('[data-main-img]'); if (img) { img.src = b.dataset.thumb; img.srcset = ''; }
      root.querySelectorAll('[data-thumb]').forEach(function (x) { x.removeAttribute('aria-current'); }); b.setAttribute('aria-current', 'true');
    });
    var z = root.querySelector('[data-zoom]');
    if (z) {
      z.tabIndex=0;z.setAttribute('role','button');z.setAttribute('aria-label','Agrandir la photographie');z.setAttribute('aria-pressed','false');
      function zoom(){var on=z.classList.toggle('is-zoom');z.setAttribute('aria-pressed',String(on));z.setAttribute('aria-label',on?'Réduire la photographie':'Agrandir la photographie')}
      z.addEventListener('click',zoom);z.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();zoom()}if(e.key==='Escape'){z.classList.remove('is-zoom');z.setAttribute('aria-pressed','false')}});
      z.addEventListener('mousemove', function (e) { var r = z.getBoundingClientRect(); z.style.setProperty('--zx', ((e.clientX - r.left) / r.width * 100) + '%'); z.style.setProperty('--zy', ((e.clientY - r.top) / r.height * 100) + '%'); });
      z.addEventListener('mouseleave', function () { z.classList.remove('is-zoom'); });
    }
    apply(state);
    BG.track && BG.track('view_item', { handle: P.handle });
  }
  BG.initProducts = function () { document.querySelectorAll('[data-product]').forEach(init); };
  if (document.readyState !== 'loading') BG.initProducts(); else document.addEventListener('DOMContentLoaded', BG.initProducts);
  document.addEventListener('shopify:section:load', BG.initProducts);
})(window.BG = window.BG || {});
