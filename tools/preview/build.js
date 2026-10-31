/* Prévisualisation locale du thème : rend les VRAIS fichiers Liquid de theme/ avec LiquidJS et les données publiques officielles.
   node tools/preview/build.js --fetch   (relève breslevgang.com : produits, collections, journal → .cache/official)
   node tools/preview/build.js           (génère dist-preview/)
   python3 -m http.server 4180 --directory dist-preview
   Limites : simulation locale (panier, filtres, recherche et favoris servis par preview/shim.js) ; ne prouve pas le comportement Shopify connecté. */
'use strict';
const fs = require('fs'), path = require('path');
const { Liquid } = require('liquidjs');
const R = path.resolve(__dirname, '../..'), T = path.join(R, 'theme'), OUT = path.join(R, 'dist-preview'), CACHE = path.join(R, '.cache/official');
const SHOP = 'https://breslevgang.com', UA = { 'User-Agent': 'Mozilla/5.0 (BRUNFRAME preview builder)' };

async function fetchAll() {
  fs.mkdirSync(path.join(CACHE, 'collections'), { recursive: true });
  const get = async (u) => { for (let i = 0; i < 3; i++) { try { const r = await fetch(u, { headers: UA }); if (r.ok) return r; } catch (e) {} await new Promise(r => setTimeout(r, 800)); } throw new Error('fetch ' + u); };
  let products = [];
  for (let p = 1; p < 10; p++) { const j = await (await get(`${SHOP}/products.json?limit=250&page=${p}`)).json(); products = products.concat(j.products); if (j.products.length < 250) break; }
  fs.writeFileSync(path.join(CACHE, 'products.json'), JSON.stringify(products));
  const cols = (await (await get(`${SHOP}/collections.json?limit=250`)).json()).collections;
  fs.writeFileSync(path.join(CACHE, 'collections.json'), JSON.stringify(cols));
  for (const c of cols) {
    let ps = [];
    for (let p = 1; p < 10; p++) { const j = await (await get(`${SHOP}/collections/${encodeURIComponent(c.handle)}/products.json?limit=250&page=${p}`)).json(); ps = ps.concat(j.products.map(x => x.handle)); if (j.products.length < 250) break; }
    fs.writeFileSync(path.join(CACHE, 'collections', encodeURIComponent(c.handle) + '.json'), JSON.stringify(ps));
  }
  fs.writeFileSync(path.join(CACHE, 'blog.atom'), await (await get(`${SHOP}/blogs/news.atom`)).text());
  fs.writeFileSync(path.join(CACHE, 'meta.json'), JSON.stringify({ fetched: new Date().toISOString(), products: products.length, collections: cols.length }));
  console.log('relevé :', products.length, 'produits,', cols.length, 'collections');
}

/* ---------- objets façon Shopify ---------- */
const cents = (s) => Math.round(parseFloat(s || 0) * 100);
const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function img(i, alt) { if (!i) return null; return { id: i.id, src: i.src, url: i.src, width: i.width || 1200, height: i.height || 1500, alt: i.alt || alt || '', aspect_ratio: (i.width || 1200) / (i.height || 1500), media_type: 'image', toString() { return this.src; } }; }
function buildProducts(raw) {
  const byHandle = {};
  for (const p of raw) {
    const images = p.images.map(i => img(i, p.title));
    const media = images.map(i => ({ id: i.id, media_type: 'image', alt: i.alt, preview_image: i }));
    const optNames = p.options.map(o => o.name);
    const variants = p.variants.map(v => {
      const fi = v.featured_image ? img(v.featured_image, p.title) : null;
      return { id: v.id, title: v.title, option1: v.option1, option2: v.option2, option3: v.option3, options: [v.option1, v.option2, v.option3].filter(x => x != null),
        price: cents(v.price), compare_at_price: v.compare_at_price ? cents(v.compare_at_price) : null, available: !!v.available, sku: v.sku || '',
        featured_image: fi, featured_media: fi ? { id: fi.id, preview_image: fi } : null, product_id: p.id, url: `/products/${p.handle}?variant=${v.id}` };
    });
    const sel = variants.find(v => v.available) || variants[0];
    const prices = variants.map(v => v.price);
    const only = variants.length === 1 && variants[0].title === 'Default Title';
    byHandle[p.handle] = {
      id: p.id, title: p.title, handle: p.handle, url: `/products/${p.handle}`, description: p.body_html || '', content: p.body_html || '',
      type: p.product_type || '', vendor: p.vendor, tags: p.tags, available: variants.some(v => v.available), created_at: p.created_at, published_at: p.published_at,
      price: Math.min(...prices), price_min: Math.min(...prices), price_max: Math.max(...prices), price_varies: Math.min(...prices) !== Math.max(...prices),
      compare_at_price: sel.compare_at_price, featured_image: images[0] || null, featured_media: media[0] || null, images, media, variants,
      options: optNames, options_with_values: optNames.map((n, k) => ({ name: n, position: k + 1, values: [...new Set(variants.map(v => v.options[k]))], selected_value: sel.options[k] })),
      has_only_default_variant: only, selected_or_first_available_variant: sel, first_available_variant: sel, selected_variant: null, collections: [], template_suffix: null
    };
  }
  return byHandle;
}
const SORTS = [['manual', 'En vedette'], ['best-selling', 'Meilleures ventes'], ['title-ascending', 'Alphabétique, de A à Z'], ['title-descending', 'Alphabétique, de Z à A'], ['price-ascending', 'Prix : faible à élevé'], ['price-descending', 'Prix : élevé à faible'], ['created-ascending', 'Date : ancien(ne) à récent(e)'], ['created-descending', 'Date : récent(e) à ancien(ne)']].map(([value, name]) => ({ value, name }));
function filtersFor(c) {
  const ps = c.products, base = c.url;
  const avail = { label: 'Disponibilité', type: 'list', param_name: 'filter.v.availability', active_values: [], values: [
    { label: 'En stock', value: '1', count: ps.filter(p => p.available).length, active: false, param_name: 'filter.v.availability', url_to_remove: base },
    { label: 'En rupture de stock', value: '0', count: ps.filter(p => !p.available).length, active: false, param_name: 'filter.v.availability', url_to_remove: base }] };
  const max = Math.max(0, ...ps.map(p => p.price_max));
  const price = { label: 'Prix', type: 'price_range', range_max: max, url_to_remove: base, min_value: { param_name: 'filter.v.price.gte', value: null }, max_value: { param_name: 'filter.v.price.lte', value: null }, active_values: [] };
  const out = [avail, price];
  /* options réelles uniquement (vêtements : Couleur, Taille) */
  const names = new Set(); ps.forEach(p => { if (!p.has_only_default_variant) p.options.forEach(n => names.add(n)); });
  for (const n of names) {
    const vals = {}; ps.forEach(p => { const k = p.options.indexOf(n); if (k < 0) return; p.variants.forEach(v => { vals[v.options[k]] = (vals[v.options[k]] || new Set()).add(p.handle); }); });
    const pn = 'filter.v.option.' + slug(n);
    out.push({ label: n, type: 'list', param_name: pn, active_values: [], values: Object.keys(vals).map(v => ({ label: v, value: v, count: vals[v].size, active: false, param_name: pn, url_to_remove: base })) });
  }
  return out;
}

/* ---------- moteur Liquid ---------- */
const locale = JSON.parse(fs.readFileSync(path.join(T, 'locales/fr.default.json'), 'utf8'));
function tr(key, vars) {
  let v = key.split('.').reduce((o, k) => (o ? o[k] : undefined), locale);
  if (v && typeof v === 'object') v = Number(vars.count) === 1 ? v.one : v.other;
  if (v == null) return `translation missing: fr.${key}`;
  return String(v).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] != null ? vars[k] : ''));
}
const kw = (args) => { const o = {}; args.forEach(a => { if (Array.isArray(a)) o[a[0]] = a[1]; }); return o; };
const fmtMoney = (c, dec = 2) => (Number(c || 0) / 100).toFixed(dec).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
function engine() {
  /* système de fichiers qui prépare chaque fichier Liquid lu (snippets inclus) */
  const pfs = { readFileSync: (f) => prep(fs.readFileSync(f, 'utf8')), readFile: async (f) => prep(fs.readFileSync(f, 'utf8')), existsSync: (f) => fs.existsSync(f), exists: async (f) => fs.existsSync(f),
    resolve: (root, file, ext) => path.resolve(root, path.extname(file) ? file : file + ext), contains: (root, file) => path.resolve(file).startsWith(path.resolve(root)), dirname: path.dirname, sep: path.sep };
  const liquid = new Liquid({ fs: pfs, root: [path.join(T, 'sections'), path.join(T, 'snippets'), path.join(T, 'layout')], partials: path.join(T, 'snippets'), extname: '.liquid', cache: true, jsTruthy: false, strictFilters: true, ownPropertyOnly: false });
  const f = (n, fn) => liquid.registerFilter(n, fn);
  f('asset_url', (n) => '/assets/' + n);
  f('image_url', (i, ...args) => { if (!i) return ''; const o = kw(args); let u = typeof i === 'string' ? i : (i.src || i.url || ''); if (!u) return ''; if (u.startsWith('/assets/') || u.startsWith('/media/')) return u; const q = []; if (o.width) q.push('width=' + o.width); if (o.height) q.push('height=' + o.height); if (o.crop) q.push('crop=' + o.crop); return q.length ? u + (u.includes('?') ? '&' : '?') + q.join('&') : u; });
  f('stylesheet_tag', (u) => `<link href="${u}" rel="stylesheet" type="text/css" media="all">`);
  f('script_tag', (u) => `<script src="${u}" type="text/javascript"></script>`);
  f('money', (c) => fmtMoney(c) + ' €');
  f('money_without_currency', (c) => fmtMoney(c));
  f('money_without_trailing_zeros', (c) => (Number(c) % 100 ? fmtMoney(c) : fmtMoney(c, 0)) + ' €');
  f('json', (v) => JSON.stringify(v === undefined ? null : v).replace(/</g, '\\u003c').replace(/>/g, '\\u003e'));
  f('t', (k, ...args) => tr(k, kw(args)));
  f('placeholder_svg_tag', () => '<svg class="placeholder" viewBox="0 0 400 500" aria-hidden="true"><rect width="400" height="500" fill="currentColor" opacity=".06"/></svg>');
  f('payment_type_svg_tag', (t) => `<svg viewBox="0 0 38 24" role="img" aria-label="${t}"><rect width="38" height="24" rx="3" fill="currentColor" opacity=".08"/><text x="19" y="15" font-size="6.5" text-anchor="middle" fill="currentColor" font-family="Arial">${t.replace(/_/g, ' ').slice(0, 9)}</text></svg>`);
  f('video_tag', () => '');
  f('default_errors', () => '');
  f('handleize', slug); f('handle', slug);
  f('within', (u) => u);
  f('preload_tag', (u, ...args) => { const o = kw(args); return `<link rel="preload" href="${u}"${Object.keys(o).map(k => ` ${k}="${o[k]}"`).join('')}>`; });
  return liquid;
}

function readSchema(src) { const m = src.match(/{%-?\s*schema\s*-?%}([\s\S]*?){%-?\s*endschema\s*-?%}/); return m ? JSON.parse(m[1]) : {}; }
function prep(src) {
  return src.replace(/{%-?\s*schema\s*-?%}[\s\S]*?{%-?\s*endschema\s*-?%}/g, '')
    .replace(/{%-?\s*style\s*-?%}/g, '<style>').replace(/{%-?\s*endstyle\s*-?%}/g, '</style>')
    .replace(/{%-?\s*form\s+'contact'\s*,\s*class:\s*'([^']*)'\s*-?%}/g, '<form method="post" action="/contact#contact_form" class="$1" accept-charset="UTF-8"><input type="hidden" name="form_type" value="contact"><input type="hidden" name="utf8" value="✓">')
    .replace(/{%-?\s*endform\s*-?%}/g, '</form>')
    .replace(/form\.posted_successfully\?/g, 'form.posted_successfully')
    .replace(/{%-?\s*paginate\s+[^%]+?-?%}/g, '{%- assign paginate = __paginate -%}').replace(/{%-?\s*endpaginate\s*-?%}/g, '')
    .replace(/{%-?\s*sections\s+'([^']+)'\s*-?%}/g, (_, n) => `{{ __group_${n.replace(/-/g, '_')} }}`);
}

async function main() {
  if (process.argv.includes('--fetch')) await fetchAll();
  if (!fs.existsSync(path.join(CACHE, 'products.json'))) { console.error('Aucun relevé : lancez d\'abord avec --fetch'); process.exit(1); }
  const meta = JSON.parse(fs.readFileSync(path.join(CACHE, 'meta.json'), 'utf8'));
  const P = buildProducts(JSON.parse(fs.readFileSync(path.join(CACHE, 'products.json'), 'utf8')));
  const rawCols = JSON.parse(fs.readFileSync(path.join(CACHE, 'collections.json'), 'utf8'));
  const C = {};
  for (const c of rawCols) {
    const hs = JSON.parse(fs.readFileSync(path.join(CACHE, 'collections', encodeURIComponent(c.handle) + '.json'), 'utf8'));
    const products = hs.map(h => P[h]).filter(Boolean);
    C[c.handle] = { id: c.id, title: c.title, handle: c.handle, url: `/collections/${c.handle}`, description: c.description || '', image: c.image ? img(c.image, c.title) : null,
      products, products_count: products.length, all_products_count: products.length, sort_options: SORTS, sort_by: '', default_sort_by: 'manual' };
    products.forEach(p => p.collections.push(C[c.handle]));
  }
  const all = Object.values(P);
  C.all = { id: 0, title: 'Tous les bijoux', handle: 'all', url: '/collections/all', description: '', image: null, products: all, products_count: all.length, all_products_count: all.length, sort_options: SORTS, sort_by: '', default_sort_by: 'manual' };
  /* /collections/types?q=… : collection automatique Shopify d'un type de produit (famille « Peteks chaîne ») */
  const chain = all.filter(p => p.type === 'Petek à chaine');
  C.types = { id: -1, title: 'Petek à chaine', handle: 'types', url: '/collections/types', description: '', image: null, products: chain, products_count: chain.length, all_products_count: chain.length, sort_options: SORTS, sort_by: '', default_sort_by: 'manual' };
  Object.values(C).forEach(c => { c.filters = filtersFor(c); });

  const schema = JSON.parse(fs.readFileSync(path.join(T, 'config/settings_schema.json'), 'utf8'));
  const settings = {};
  schema.forEach(g => (g.settings || []).forEach(s => { if (s.default !== undefined) settings[s.id] = s.default; }));
  Object.assign(settings, JSON.parse(fs.readFileSync(path.join(T, 'config/settings_data.json'), 'utf8')).current);
  /* aperçu : logo officiel de la boutique (dans le thème installé, il se choisit dans l'éditeur) */
  settings.logo = { src: 'https://breslevgang.com/cdn/shop/files/WhatsApp_July_24_copie.png?v=1698640604', width: 872, height: 286, alt: 'Breslev Gang' };

  const atom = fs.readFileSync(path.join(CACHE, 'blog.atom'), 'utf8');
  const articles = [...atom.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => {
    const e = m[1], get = (re) => { const x = e.match(re); return x ? x[1] : ''; };
    const html = get(/<content[^>]*>([\s\S]*?)<\/content>/).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/<!\[CDATA\[|\]\]>/g, '');
    const url = get(/<link[^>]*href="([^"]+)"/); const handle = url.split('/').pop();
    return { title: get(/<title>([\s\S]*?)<\/title>/).replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&'), handle, url: `/blogs/news/${handle}`, content: html, excerpt_or_content: html, published_at: get(/<published>(.*?)<\/published>/) };
  });
  const blog = { title: 'Journal', handle: 'news', url: '/blogs/news', articles };

  const pages = {
    'le-sens-des-bijoux': { title: 'Le sens des bijoux', handle: 'le-sens-des-bijoux', content: '' },
    personnalites: { title: 'Breslev Gang, à leur manière', handle: 'personnalites', content: '' },
    favoris: { title: 'Favoris', handle: 'favoris', content: '' },
    contact: { title: 'Contact', handle: 'contact', content: '<p>Pour une question sur une pièce, une commande ou un échange, écrivez à la maison.</p>' }
  };
  Object.values(pages).forEach(p => { p.url = `/pages/${p.handle}`; });
  const policies = [['Politique de remboursement', 'refund-policy'], ['Politique de confidentialité', 'privacy-policy'], ['Conditions d\'utilisation', 'terms-of-service'], ['Mentions légales', 'legal-notice'], ['Politique d\'expédition', 'shipping-policy']].map(([title, h]) => ({ title, url: `${SHOP}/policies/${h}` }));
  const shop = { name: 'Breslev Gang', description: 'Colliers et Peteks Breslev Gang.', money_format: '{{amount_with_comma_separator}} €', customer_accounts_enabled: true,
    enabled_payment_types: ['visa', 'master', 'american_express', 'paypal', 'apple_pay', 'google_pay', 'shopify_pay', 'bancontact', 'klarna'], policies, refund_policy: policies[0], url: SHOP };
  const routes = { root_url: '/', cart_url: '/cart', cart_add_url: '/cart/add', cart_change_url: '/cart/change', collections_url: '/collections', all_products_collection_url: '/collections/all', search_url: '/search', account_url: `${SHOP}/account`, account_login_url: `${SHOP}/account/login` };
  const liquid = engine();
  const cache = {};
  const tpl = (file) => { if (!cache[file]) { const src = fs.readFileSync(file, 'utf8'); cache[file] = { schema: readSchema(src), tpl: liquid.parse(prep(src), file) }; } return cache[file]; };
  const globals = { shop, routes, settings, linklists: {}, collections: Object.values(C).filter(c => c.handle !== 'all' && c.handle !== 'types'), cart: { item_count: 0, items: [], total_price: 0, currency: { iso_code: 'EUR' } }, pages, blogs: { news: blog }, request: { locale: { iso_code: 'fr' }, design_mode: false, origin: 'http://localhost:4180' } };

  function resolveSetting(def, val) {
    if (val === undefined || val === null || val === '') return def && def.type === 'product_list' ? [] : (val === undefined ? (def ? def.default : undefined) : val);
    switch (def && def.type) {
      case 'product': return P[val] || null;
      case 'product_list': return (val || []).map(h => P[h]).filter(Boolean);
      case 'collection': return C[val] || null;
      case 'image_picker': case 'video': return null;
      case 'link_list': return val;
      default: return val;
    }
  }
  function sectionObject(id, data, schema) {
    const defs = {}; (schema.settings || []).forEach(s => { defs[s.id] = s; });
    const settings = {};
    Object.keys(defs).forEach(k => { settings[k] = resolveSetting(defs[k], data.settings ? data.settings[k] : undefined); });
    const blocks = (data.block_order || Object.keys(data.blocks || {})).map(bid => {
      const b = data.blocks[bid], bdef = (schema.blocks || []).find(x => x.type === b.type) || { settings: [] };
      const bs = {}; (bdef.settings || []).forEach(s => { bs[s.id] = resolveSetting(s, b.settings ? b.settings[s.id] : undefined); });
      return { id: bid, type: b.type, settings: bs, shopify_attributes: '' };
    });
    return { id, settings, blocks };
  }
  async function renderSection(id, data, ctx) {
    const file = path.join(T, 'sections', data.type + '.liquid'), t = tpl(file);
    if (data.type === 'hero-video') { data = JSON.parse(JSON.stringify(data)); data.settings = Object.assign({}, data.settings, { video_url: '/media/hero-1080.mp4', video_url_mobile: '/media/hero-mobile.mp4' }); }
    const section = sectionObject(id, data, t.schema);
    const html = await liquid.render(t.tpl, Object.assign({}, ctx, { section }), { globals });
    return `<div id="shopify-section-${id}" class="shopify-section">${html}</div>`;
  }
  async function renderGroup(name, ctx) {
    const g = JSON.parse(fs.readFileSync(path.join(T, 'sections', name + '.json'), 'utf8'));
    let out = ''; for (const k of g.order) out += await renderSection(`sections--${name}__${k}`, g.sections[k], ctx); return out;
  }
  const layout = tpl(path.join(T, 'layout/theme.liquid'));
  const shim = `<meta name="robots" content="noindex,nofollow"><script src="/preview/shim.js" defer></script><link rel="stylesheet" href="/preview/preview.css">`;
  async function page(urlPath, templateName, ctx, extra) {
    const [name, suffix] = templateName.split('.');
    const tjson = JSON.parse(fs.readFileSync(path.join(T, 'templates', templateName + '.json'), 'utf8'));
    const full = Object.assign({ template: { name, suffix: suffix || null }, __paginate: { pages: 1, current_page: 1, parts: [] }, form: { posted_successfully: false, errors: null } }, ctx);
    let body = ''; for (const k of tjson.order) body += await renderSection(`template--${templateName}__${k}`, tjson.sections[k], full);
    const groups = { __group_header_group: await renderGroup('header-group', full), __group_footer_group: await renderGroup('footer-group', full) };
    const html = await liquid.render(layout.tpl, Object.assign({}, full, groups, { content_for_layout: body + (extra || ''), content_for_header: shim, canonical_url: SHOP + urlPath, page_title: ctx.page_title || 'Breslev Gang', page_description: ctx.page_description || shop.description, current_page: 1 }), { globals });
    const dir = path.join(OUT, decodeURI(urlPath)); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(urlPath === '/404' ? path.join(OUT, '404.html') : path.join(dir, 'index.html'), html);
  }

  if (!process.argv.some(x => x.startsWith('--only='))) fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  fs.cpSync(path.join(T, 'assets'), path.join(OUT, 'assets'), { recursive: true });
  fs.mkdirSync(path.join(OUT, 'media'), { recursive: true });
  ['hero-1080.mp4', 'hero-mobile.mp4', 'hero-poster.jpg'].forEach(f => { const s = path.join(R, 'preview/media', f); if (fs.existsSync(s)) fs.copyFileSync(s, path.join(OUT, 'media', f)); });
  fs.cpSync(path.join(R, 'tools/preview/static'), path.join(OUT, 'preview'), { recursive: true });

  /* index des variantes (panier simulé), produits .js (favoris), index de recherche */
  const vindex = {}, sindex = [];
  for (const p of all) {
    p.variants.forEach(v => { vindex[v.id] = { product_id: p.id, product_title: p.title, handle: p.handle, title: v.title, price: v.price, compare: v.compare_at_price || 0, available: v.available, image: (v.featured_image || p.featured_image || {}).src || null, url: `/products/${p.handle}?variant=${v.id}`, only: p.has_only_default_variant, options: p.options.map((n, k) => ({ name: n, value: v.options[k] })) }; });
    sindex.push({ h: p.handle, t: p.title, p: p.price, a: p.available, i: p.featured_image ? p.featured_image.src : null, w: p.featured_image ? p.featured_image.width : 0, hh: p.featured_image ? p.featured_image.height : 0, k: (p.tags || []).join(' ') + ' ' + p.collections.map(c => c.title).join(' ') });
    fs.mkdirSync(path.join(OUT, 'products'), { recursive: true });
    fs.writeFileSync(path.join(OUT, 'products', p.handle + '.js'), JSON.stringify({ id: p.id, title: p.title, handle: p.handle, url: p.url, price: p.price, available: p.available, featured_image: p.featured_image ? p.featured_image.src : null }));
  }
  fs.writeFileSync(path.join(OUT, 'preview', 'variants.json'), JSON.stringify(vindex));
  fs.writeFileSync(path.join(OUT, 'preview', 'search.json'), JSON.stringify(sindex));

  const only = process.argv.find(a => a.startsWith('--only='));
  const want = (k) => !only || only.slice(7).split(',').includes(k);
  if (want('index')) await page('/', 'index', { page_title: 'Breslev Gang — Colliers et Peteks', request: Object.assign({}, globals.request, { page_type: 'index' }) });
  if (want('pages')) {
    await page('/collections', 'list-collections', { page_title: 'Toutes les collections' });
    await page('/cart', 'cart', { page_title: 'Panier' });
    await page('/search', 'search', { page_title: 'Recherche', search: { performed: false, terms: '', results: [], results_count: 0 } });
    await page('/404', '404', { page_title: 'Page introuvable' });
    for (const [h, tname] of [['le-sens-des-bijoux', 'page.le-sens-des-bijoux'], ['personnalites', 'page.personnalites'], ['favoris', 'page.favoris'], ['contact', 'page.contact']]) await page(`/pages/${h}`, tname, { page: pages[h], page_title: pages[h].title });
    await page('/blogs/news', 'blog', { blog, page_title: 'Journal' });
    for (const a of articles) await page(a.url, 'article', { blog, article: a, page_title: a.title });
  }
  if (want('collections')) for (const c of Object.values(C)) {
    const data = c.products.map(p => ({ h: p.handle, p: p.price, a: p.available, o: p.has_only_default_variant ? {} : Object.fromEntries(p.options.map((n, k) => ['filter.v.option.' + slug(n), [...new Set(p.variants.map(v => v.options[k]))]])), t: p.title, c: p.created_at }));
    await page(c.url, 'collection', { collection: c, page_title: c.title }, `<script type="application/json" id="preview-collection">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`);
  }
  if (want('products')) for (const p of all) await page(p.url, 'product', { product: p, collection: null, page_title: p.title, page_description: (p.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 160), request: Object.assign({}, globals.request, { page_type: 'product' }) });
  fs.writeFileSync(path.join(OUT, 'preview', 'meta.json'), JSON.stringify(Object.assign({}, meta, { built: new Date().toISOString() })));
  console.log('aperçu généré :', OUT, '| relevé du', meta.fetched.slice(0, 10), '|', all.length, 'produits,', Object.keys(C).length, 'collections');
}
main().catch(e => { console.error(e); process.exit(1); });
