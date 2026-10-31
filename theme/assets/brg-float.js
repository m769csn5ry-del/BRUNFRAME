/* Breslev Gang — galerie de bijoux flottants, navigable horizontalement.
   Trois contrôleurs séparés, une seule écriture par image et par image d'animation :
   1. la piste (glisser, flèches, clavier, molette horizontale) : suit le doigt sans retard, inertie bornée,
      recalage par ressort sans rebond, résistance douce aux extrémités ;
   2. la séquence au défilement vertical : isolement → rapprochement → détails réels → recul → suite du catalogue,
      fonction pure de la position de défilement (réversible, même pièce à l'aller et au retour) ;
   3. le mouvement secondaire : dérive lente et balancement amorti, propres à chaque pièce (aucune synchronisation).
   Les pièces sont des photos officielles détourées en 2,5D : la chaîne pivote autour de l'anneau du pendentif,
   aucun étirement, aucune face cachée inventée. */
(function () {
  'use strict';
  var C = window.BRG;
  if (!C || !C.register) return;
  var clamp = C.clamp;
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var seg = function (p, r) { return clamp((p - r[0]) / (r[1] - r[0]), 0, 1); };
  var inout = function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  var out3 = function (x) { return 1 - Math.pow(1 - x, 3); };
  /* Jalons de la séquence (part de la hauteur de la section) */
  var K = { iso: [0.07, 0.19], app: [0.17, 0.36], in1: [0.34, 0.42], swap: [0.53, 0.59], out1: [0.68, 0.74], rec: [0.68, 0.82], type: [0.7, 0.78], back: [0.82, 0.94] };

  C.register('[data-float]', function (sec) {
    var data;
    try { data = JSON.parse(sec.querySelector('[data-float-data]').textContent); } catch (e) { data = []; }
    var n = data.length;
    if (!n) return;
    var q = function (s) { return sec.querySelector(s); };
    var qa = function (s) { return Array.prototype.slice.call(sec.querySelectorAll(s)); };
    var stage = q('[data-f-stage]'), trackEl = q('[data-f-track]'), plate = q('[data-f-plate]');
    var plateImgs = plate ? plate.querySelectorAll('img') : [];
    var strips = qa('[data-f-par]');
    var live = q('[data-f-live]');
    var reduce = C.reduce;
    var lite = reduce || (navigator.hardwareConcurrency || 8) <= 2 || (navigator.deviceMemory || 8) <= 2;
    var sway = clamp(parseFloat(sec.getAttribute('data-sway') || '1'), 0, 1.5);
    var drift = sec.getAttribute('data-drift') !== 'false';
    var zoomMax = clamp(parseFloat(sec.getAttribute('data-zoom') || '2.1'), 1.3, 3);
    var store = 'brg-float:' + location.pathname;
    var start = 0;
    try { start = clamp(parseInt(sessionStorage.getItem(store), 10) || 0, 0, n - 1); } catch (e) {}
    if (reduce) sec.classList.add('is-static');

    /* ---------- pièces ---------- */
    var P = data.map(function (d, i) {
      var w = d.w || 400, h = d.h || 1400;
      var split = !!(d.chain && d.pend);
      var mk = function (cls, src, ww, hh) {
        var im = document.createElement('img');
        im.className = 'flt__img ' + cls; im.alt = ''; im.draggable = false; im.decoding = 'async';
        im.width = ww; im.height = hh; im.style.width = ww + 'px'; im.style.height = hh + 'px';
        if (Math.abs(i - start) > 2) im.loading = 'lazy';
        im.src = src;
        im.addEventListener('error', function retry() { im.removeEventListener('error', retry); setTimeout(function () { im.src = src + (src.indexOf('?') < 0 ? '?' : '&') + 'r=1'; }, 800); });
        return im;
      };
      var hit = document.createElement('a');
      hit.className = 'flt__hit'; hit.href = d.url; hit.tabIndex = -1; hit.draggable = false;
      hit.setAttribute('data-i', i); hit.setAttribute('aria-label', d.title + ' — ' + d.price);
      hit.style.width = w + 'px'; hit.style.height = h + 'px';
      var shadow = document.createElement('span'); shadow.className = 'flt__shadow';
      var chain = mk('flt__img--chain', split ? d.chain : d.cut, w, h);
      var pw = 0, ph = 0, pend = null;
      if (split) {
        var x0 = Math.floor(d.pl * w + 1e-6), y0c = Math.floor(d.by * h + 1e-6);
        pw = Math.round(d.pr * w) - x0; ph = h - y0c;
        pend = mk('flt__img--pend', d.pend, pw, ph);
      }
      trackEl.appendChild(shadow); trackEl.appendChild(chain); if (pend) trackEl.appendChild(pend); trackEl.appendChild(hit);
      var r = function (k) { var x = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
      return {
        d: d, w: w, h: h, chain: chain, pend: pend, hit: hit, shadow: shadow,
        bx: d.bx * w, by: Math.floor(d.by * h + 1e-6), px: Math.floor(d.pl * w + 1e-6), fx: d.fx * w, fy: d.fy * h,
        art: split ? clamp(d.art == null ? 1 : d.art, 0, 1) : 0,
        /* paramètres propres : fréquences et phases différentes pour éviter tout mouvement synchronisé */
        wB: 5.6 * (0.88 + r(1) * 0.24), zB: 0.62, wC: 4.4 * (0.86 + r(2) * 0.28), zC: 0.5,
        T1: 4.6 + r(3) * 1.8, T2: 6.2 + r(4) * 2.4, f1: r(5) * 6.283, f2: r(6) * 6.283,
        tb: 0, vb: 0, tc: 0, vc: 0, yb: 0, vy: 0, cache: {}
      };
    });

    /* ---------- état ---------- */
    var pos = start, vel = 0, target = start, sel = start, dragging = null, suppress = 0;
    var W = 0, H = 0, mob = false, sp = 300, baseH = 600, y0 = 100, floorY = 0, cx = 0;
    var dimMin = 0.42, fadeMin = 1, prog = 0, iso = 0, visible = false, raf = 0, last = 0;
    var accHist = new Float32Array(16), accIdx = 0, prevVpx = 0, scrollV = 0, lastScrollY = scrollY, lastScrollT = 0;
    var slowFrames = 0, frames = 0;

    function themeVars() {
      var cs = getComputedStyle(sec);
      dimMin = parseFloat(cs.getPropertyValue('--flt-dim')) || 0.42;
      fadeMin = parseFloat(cs.getPropertyValue('--flt-fade')) || 1;
      P.forEach(function (p) { p.cache = {}; });
    }
    var selBox = q('.flt__sel');
    function measureSel() { if (selBox) sec.style.setProperty('--sel-h', selBox.offsetHeight + 'px'); }
    function layout() {
      W = stage.clientWidth; H = stage.clientHeight; cx = W / 2;
      mob = W < 760;
      baseH = H * (mob ? 0.5 : 0.62);
      y0 = H * (mob ? 0.16 : 0.15);
      sp = mob ? W * 0.42 : Math.min(W * 0.19, 300);
      floorY = y0 + baseH + H * (mob ? 0.05 : 0.07);
      themeVars();
      measureSel();
    }

    /* ---------- piste : ressort sans rebond, inertie bornée, résistance aux bords ---------- */
    var OMEGA = 10.5;
    function rubber(x) {
      if (x < 0) return -(1 - 1 / (-x * 0.55 / 0.32 + 1)) * 0.32;
      if (x > n - 1) return n - 1 + (1 - 1 / ((x - n + 1) * 0.55 / 0.32 + 1)) * 0.32;
      return x;
    }
    function settleTo(t, v0) {
      target = clamp(Math.round(t), 0, n - 1);
      var dist = target - pos;
      v0 = v0 || 0;
      /* vitesse initiale bornée : le ressort critique ne dépasse jamais la cible */
      if (dist !== 0 && v0 * dist > 0) v0 = Math.sign(dist) * Math.min(Math.abs(v0), OMEGA * Math.abs(dist) * 0.92);
      vel = clamp(v0, -14, 14);
      if (reduce) { pos = target; vel = 0; }
      kick();
    }
    function go(i) { if (!interactive()) return; settleTo(clamp(i, 0, n - 1), vel); }
    function step(dt) {
      if (dragging) return;
      var sub = 3, h = dt / sub;
      for (var k = 0; k < sub; k++) {
        var a = -OMEGA * OMEGA * (pos - target) - 2 * 1.05 * OMEGA * vel;
        vel += a * h; pos += vel * h;
      }
      if (Math.abs(pos - target) < 0.0008 && Math.abs(vel) < 0.002) { pos = target; vel = 0; }
    }
    function interactive() { return iso < 0.03 && !sec.classList.contains('is-busy'); }

    /* glisser : souris, stylet, tactile (le défilement vertical reste natif grâce à touch-action: pan-y) */
    function samplesVel(s) {
      if (s.length < 2) return 0;
      var a = s[0], b = s[s.length - 1];
      if (performance.now() - b.t > 70) return 0; // doigt arrêté avant de relâcher : pas d'élan
      var dt = (b.t - a.t) / 1000;
      return dt > 0.008 ? (b.p - a.p) / dt : 0;
    }
    function onDown(e) {
      if (e.button > 0 || !interactive()) return;
      dragging = { id: e.pointerId, x0: e.clientX, y0: e.clientY, p0: pos, mode: 0, s: [] };
    }
    function onMove(e) {
      var d = dragging;
      if (!d || e.pointerId !== d.id) return;
      var dx = e.clientX - d.x0, dy = e.clientY - d.y0;
      if (d.mode === 0) {
        if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy) * 1.15) {
          d.mode = 1; d.x0 = e.clientX; d.p0 = pos; vel = 0;
          try { stage.setPointerCapture(e.pointerId); } catch (err) {}
          sec.classList.add('is-drag');
        } else if (Math.abs(dy) > 9) { dragging = null; return; } else return;
        dx = 0;
      }
      var raw = d.p0 - dx / sp;
      pos = rubber(raw);
      var now = performance.now();
      d.s.push({ t: now, p: raw });
      while (d.s.length > 2 && now - d.s[0].t > 110) d.s.shift();
      kick();
    }
    function onUp(e) {
      var d = dragging;
      if (!d || e.pointerId !== d.id) return;
      dragging = null; sec.classList.remove('is-drag');
      if (d.mode !== 1) return;
      suppress = performance.now();
      var v = e.type === 'pointercancel' ? 0 : samplesVel(d.s);
      /* élan limité : un geste court ne fait jamais défiler plus de deux pièces */
      var proj = pos + clamp(v * 0.2, -2.2, 2.2);
      if (pos < 0 || pos > n - 1) proj = pos;
      settleTo(proj, v);
    }
    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup', onUp);
    stage.addEventListener('pointercancel', onUp);
    /* au tactile, la capture implicite passe de la cible à la scène : seule la perte de capture de la scène termine le geste */
    stage.addEventListener('lostpointercapture', function (e) { if (e.target === stage && dragging && dragging.mode === 1) onUp(e); });
    /* un relâchement après glissement n'ouvre jamais une fiche ; un clic sur une voisine la sélectionne */
    stage.addEventListener('click', function (e) {
      if (performance.now() - suppress < 400) { e.preventDefault(); e.stopPropagation(); return; }
      var a = e.target.closest('.flt__hit');
      if (!a) return;
      var i = +a.getAttribute('data-i');
      if (i !== sel || Math.abs(pos - sel) > 0.05) { e.preventDefault(); go(i); }
    }, true);
    stage.addEventListener('dragstart', function (e) { e.preventDefault(); });

    /* molette horizontale (pavé tactile) : bornée à deux pièces par geste, puis recalage */
    var wheel = null, wheelT = 0;
    stage.addEventListener('wheel', function (e) {
      if (!interactive() || Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 0.5) return;
      e.preventDefault();
      var now = performance.now();
      if (!wheel || now - wheel.t > 220) wheel = { p0: pos, raw: pos, s: [] };
      wheel.t = now;
      wheel.raw = clamp(wheel.raw + e.deltaX / sp, wheel.p0 - 2.2, wheel.p0 + 2.2);
      pos = rubber(wheel.raw); vel = 0; target = pos;
      wheel.s.push({ t: now, p: wheel.raw }); while (wheel.s.length > 2 && now - wheel.s[0].t > 110) wheel.s.shift();
      clearTimeout(wheelT);
      wheelT = setTimeout(function () { var v = samplesVel(wheel.s) * 0.5; wheel = null; settleTo(pos + clamp(v * 0.12, -0.6, 0.6), v); }, 110);
      kick();
    }, { passive: false });

    /* flèches et clavier */
    var prevBtn = q('[data-f-prev]'), nextBtn = q('[data-f-next]');
    function nudge(dir) { if (!interactive()) return; var base = Math.abs(pos - target) > 0.02 ? target : Math.round(pos); settleTo(clamp(base + dir, 0, n - 1), vel); }
    if (prevBtn) prevBtn.addEventListener('click', function () { nudge(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { nudge(1); });
    var dots = q('[data-f-dots]');
    if (dots) {
      dots.innerHTML = data.map(function (d, i) { return '<button type="button" data-f-dot="' + i + '" aria-label="' + C.esc(d.title) + '"></button>'; }).join('');
      dots.addEventListener('click', function (e) { var b = e.target.closest('[data-f-dot]'); if (b) go(+b.getAttribute('data-f-dot')); });
    }
    stage.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowRight' || k === 'ArrowLeft') { e.preventDefault(); nudge(k === 'ArrowRight' ? 1 : -1); }
      else if (k === 'Home') { e.preventDefault(); go(0); }
      else if (k === 'End') { e.preventDefault(); go(n - 1); }
      else if (k === 'Enter' && interactive()) { location.href = data[sel].url; }
    });
    var back = q('[data-f-back]');
    if (back) back.addEventListener('click', function () {
      var top = sec.getBoundingClientRect().top + scrollY;
      scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
    });

    /* ---------- sélection : photo, nom, prix et liens toujours ensemble ---------- */
    var nameEls = qa('[data-f-name]'), priceEls = qa('[data-f-price]'), famEls = qa('[data-f-family]'), ctaEls = qa('[data-f-cta]');
    var countEl = q('[data-f-count]'), textEl = q('[data-f-text]'), typeEl = q('[data-f-type]'), collEl = q('[data-f-coll]'), capEl = q('[data-f-caption]');
    var liveT = 0;
    function preload(i) {
      var d = data[i]; if (!d) return;
      (d.details || []).forEach(function (x) { var im = new Image(); im.decoding = 'async'; im.src = x.src; });
      [d.chain, d.pend, d.cut].forEach(function (s) { if (s) { var im = new Image(); im.src = s; } });
    }
    function setPlate(d) {
      if (!plate) return;
      var ds = d.details || [];
      for (var k = 0; k < plateImgs.length; k++) {
        var x = ds[k] || ds[0];
        var im = plateImgs[k];
        if (!x) { im.removeAttribute('src'); continue; }
        if (im.getAttribute('src') !== x.src) { im.src = x.src; }
        im.alt = x.alt || d.title;
        im.style.objectPosition = x.pos || '50% 50%';
        im.classList.toggle('is-crop', !!x.crop);
      }
      plate.setAttribute('data-count', Math.min(ds.length, 2));
    }
    function setSel(i, announce) {
      if (i === sel && !announce) return;
      var dir = i > sel ? 1 : -1;
      sel = i;
      var d = data[i];
      nameEls.forEach(function (el) { el.textContent = d.title; });
      priceEls.forEach(function (el) { el.textContent = d.price; });
      famEls.forEach(function (el) { el.textContent = d.family || ''; });
      ctaEls.forEach(function (el) { el.href = d.url; el.setAttribute('data-handle', d.handle); });
      if (collEl) collEl.href = d.coll_url || collEl.getAttribute('href');
      if (countEl) countEl.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0');
      if (textEl) textEl.textContent = d.text || '';
      if (typeEl) { typeEl.textContent = d.family || d.title; typeEl.style.setProperty('--chars', Math.max(6, (d.family || d.title).length)); }
      if (capEl) capEl.textContent = d.title;
      measureSel();
      if (dots) Array.prototype.forEach.call(dots.children, function (b, k) { b.setAttribute('aria-current', k === i ? 'true' : 'false'); });
      if (prevBtn) prevBtn.disabled = i === 0;
      if (nextBtn) nextBtn.disabled = i === n - 1;
      setPlate(d);
      preload(i + 1); preload(i - 1);
      try { sessionStorage.setItem(store, i); } catch (e) {}
      sec.setAttribute('data-sel', d.handle);
      /* lumière : impulsion sur la niche et petit élan secondaire de la pièce choisie */
      sec.classList.remove('is-pulse'); void sec.offsetWidth; sec.classList.add('is-pulse');
      var p = P[i]; if (!lite) { p.vb += dir * 0.14 * sway; p.vc -= dir * 0.1 * sway * p.art; }
      clearTimeout(liveT);
      liveT = setTimeout(function () { if (live) live.textContent = (i + 1) + ' / ' + n + ' : ' + d.title + ', ' + d.price; }, 450);
    }

    /* ---------- écriture des transformations ---------- */
    function m2(a, b, c, d, e, f) { return 'matrix(' + a.toFixed(5) + ',' + b.toFixed(5) + ',' + c.toFixed(5) + ',' + d.toFixed(5) + ',' + e.toFixed(2) + ',' + f.toFixed(2) + ')'; }
    function put(p, el, key, val, prop) { if (p.cache[key] !== val) { p.cache[key] = val; el.style[prop] = val; } }

    function render(t, dt) {
      /* progression verticale */
      var r = sec.getBoundingClientRect();
      var span = Math.max(1, r.height - H);
      prog = reduce ? 0 : clamp(-r.top / span, 0, 1);
      var eIso = inout(seg(prog, K.iso)), eBack = inout(seg(prog, K.back));
      iso = eIso * (1 - eBack);
      var eApp = inout(seg(prog, K.app)), eRec = inout(seg(prog, K.rec));
      var z = eApp * (1 - eRec);
      var plateIn = out3(seg(prog, K.in1)) * (1 - out3(seg(prog, K.out1)));
      var swap = seg(prog, K.swap);
      var type = seg(prog, K.type) * (1 - seg(prog, K.back));
      sec.style.setProperty('--iso', iso.toFixed(3));
      sec.style.setProperty('--z', z.toFixed(3));
      sec.style.setProperty('--plate', plateIn.toFixed(3));
      sec.style.setProperty('--swap', swap.toFixed(3));
      sec.style.setProperty('--type', type.toFixed(3));
      sec.style.setProperty('--exit', eBack.toFixed(3));
      var phase = iso < 0.03 ? (prog > 0.5 ? 'back' : 'gal') : plateIn > 0.5 ? 'det' : z > 0.05 ? 'app' : 'iso';
      if (sec.getAttribute('data-phase') !== phase) {
        sec.setAttribute('data-phase', phase);
        var act = phase === 'gal' || phase === 'back';
        [prevBtn, nextBtn].forEach(function (b) { if (b) b.setAttribute('aria-disabled', String(!act)); });
      }

      /* accélération de la piste (px/s²), mémorisée pour décaler la réponse des pièces éloignées */
      var vpx = vel * sp;
      var acc = dt > 0 ? (vpx - prevVpx) / dt : 0;
      prevVpx = vpx;
      if (dragging && dragging.s && dragging.s.length > 1) {
        var s = dragging.s, a1 = s[s.length - 1], a0 = s[Math.max(0, s.length - 3)];
        var dv = a1.t > a0.t ? (a1.p - a0.p) / ((a1.t - a0.t) / 1000) * sp : 0;
        acc = (dv - (dragging.lv || 0)) / Math.max(dt, 0.008); dragging.lv = dv;
      }
      accIdx = (accIdx + 1) % accHist.length; accHist[accIdx] = clamp(acc, -26000, 26000);

      var newSel = clamp(Math.round(pos), 0, n - 1);
      if (newSel !== sel) setSel(newSel);

      var ampY = mob ? 3 : 4.5, ampR = 0.0055;
      var tz = mob ? { x: W * 0.5, y: H * 0.34 } : { x: W * 0.34, y: H * 0.5 };
      var zMax = mob ? zoomMax * 0.82 : zoomMax;
      var scrollImp = clamp(scrollV, -3000, 3000);

      for (var i = 0; i < n; i++) {
        var p = P[i], dd = i - pos, ad = Math.abs(dd);
        /* profondeur mesurée : voisines plus petites, un peu plus hautes et plus sombres */
        var depth = 1 - (mob ? 0.2 : 0.16) * Math.min(ad, 2.4);
        var lift = -H * 0.025 * Math.min(ad, 2);
        var x = dd * sp * (1 - 0.05 * Math.min(ad, 3));
        /* isolement : les voisines s'écartent et s'effacent */
        var isSel = i === sel;
        if (!isSel) x += Math.sign(dd || 1) * iso * W * 0.42;
        var op = isSel ? 1 : 1 - iso;
        if (op < 0.01 && Math.abs(dd) > 0.5) { if (p.cache.hidden !== 1) { p.cache.hidden = 1; p.chain.style.visibility = p.hit.style.visibility = p.shadow.style.visibility = 'hidden'; if (p.pend) p.pend.style.visibility = 'hidden'; } continue; }
        if (p.cache.hidden !== 0) { p.cache.hidden = 0; p.chain.style.visibility = p.hit.style.visibility = p.shadow.style.visibility = ''; if (p.pend) p.pend.style.visibility = ''; }

        /* mouvement secondaire (réponse retardée selon la distance au centre) */
        var aIn = accHist[(accIdx - Math.min(accHist.length - 1, Math.round(ad * 2)) + accHist.length) % accHist.length];
        if (!lite && sway > 0) {
          var hh = Math.min(dt, 1 / 30) / 2;
          for (var k = 0; k < 2; k++) {
            var ab = -p.wB * p.wB * p.tb - 2 * p.zB * p.wB * p.vb - 3.6e-4 * sway * aIn;
            p.vb += ab * hh; p.tb = clamp(p.tb + p.vb * hh, -0.07, 0.07);
            var ac = -p.wC * p.wC * p.tc - 2 * p.zC * p.wC * p.vc - 1.6e-4 * sway * p.art * aIn;
            p.vc += ac * hh; p.tc = clamp(p.tc + p.vc * hh, -0.035 * p.art, 0.035 * p.art);
            var ay = -38 * p.yb - 2 * 0.55 * 6.2 * p.vy + 0.0016 * scrollImp * (isSel ? 1 : 0.6);
            p.vy += ay * hh; p.yb = clamp(p.yb + p.vy * hh, -9, 9);
          }
        }
        var fl = (!lite && drift) ? 1 : 0;
        var dy = fl * ampY * Math.sin(t / 1000 * 6.283 / p.T1 + p.f1) + p.yb;
        var dr = fl * ampR * Math.sin(t / 1000 * 6.283 / p.T2 + p.f2);

        var s = baseH / p.h * depth;
        var ax = cx + x - s * p.w / 2, ay = y0 + lift + dy;
        if (isSel && z > 0.001) {
          /* rapprochement : échelle uniforme autour du pendentif (la chaîne garde ses proportions) */
          var fx0 = ax + s * p.fx, fy0 = ay + s * p.fy;
          var s2 = s * lerp(1, zMax, z);
          var fxT = lerp(fx0, tz.x, z), fyT = lerp(fy0, tz.y, z);
          ax = fxT - s2 * p.fx; ay = fyT - s2 * p.fy; s = s2;
        }
        /* corps : rotation autour du centre de la pièce ; chaîne : rotation autour de l'anneau du pendentif */
        var th = p.tb + dr, co = Math.cos(th), si = Math.sin(th);
        var mx = p.w / 2, my = p.h / 2;
        var A = s * co, B = s * si, Cc = -s * si, D = s * co;
        var E = ax + s * (mx - co * mx + si * my), F = ay + s * (my - si * mx - co * my);
        if (p.pend) {
          put(p, p.pend, 'p', m2(A, B, Cc, D, A * p.px + Cc * p.by + E, B * p.px + D * p.by + F), 'transform');
          var tc = p.tc, c2 = Math.cos(tc), s2b = Math.sin(tc);
          var e2 = p.bx - c2 * p.bx + s2b * p.by, f2 = p.by - s2b * p.bx - c2 * p.by;
          put(p, p.chain, 'c', m2(A * c2 + Cc * s2b, B * c2 + D * s2b, -A * s2b + Cc * c2, -B * s2b + D * c2, A * e2 + Cc * f2 + E, B * e2 + D * f2 + F), 'transform');
        } else {
          put(p, p.chain, 'c', m2(A, B, Cc, D, E, F), 'transform');
        }
        var base = s / (baseH / p.h);
        put(p, p.hit, 'h', m2(s, 0, 0, s, ax, ay), 'transform');
        /* ombre portée au sol : plus diffuse quand la pièce flotte plus haut */
        var sx = p.w * s * 1.15, fyS = floorY + (base - 1) * H * 0.12;
        var shOp = (0.55 - dy * 0.015) * op * (1 - z * 0.7) * depth;
        put(p, p.shadow, 's', 'translate3d(' + (ax + p.w * s / 2 - sx / 2).toFixed(1) + 'px,' + fyS.toFixed(1) + 'px,0) scale(' + (sx / 100).toFixed(3) + ',' + (0.16 + 0.05 * depth).toFixed(3) + ')', 'transform');
        put(p, p.shadow, 'so', clamp(shOp, 0, 1).toFixed(2), 'opacity');
        /* lumière : la pièce choisie reçoit l'éclairage, les voisines restent dans la pénombre */
        var lit = 1 - Math.min(ad, 1.4) / 1.4;
        var bright = lerp(dimMin, 1, lit);
        if (isSel) bright = lerp(bright, 1, iso);
        var opv = lerp(fadeMin, 1, lit) * op;
        var f = lite ? '' : 'brightness(' + bright.toFixed(2) + ')';
        put(p, p.chain, 'f', f, 'filter'); put(p, p.chain, 'o', opv.toFixed(2), 'opacity');
        if (p.pend) { put(p, p.pend, 'pf', f, 'filter'); put(p, p.pend, 'po', opv.toFixed(2), 'opacity'); }
        var zi = 100 - Math.round(ad * 10);
        put(p, p.chain, 'z', String(zi), 'zIndex'); put(p, p.hit, 'hz', String(zi + 2), 'zIndex');
        if (p.pend) put(p, p.pend, 'pz', String(zi + 1), 'zIndex');
      }
      /* décor : les panneaux lumineux glissent en sens inverse, plus lentement (profondeur) */
      var par = -(pos - (n - 1) / 2) * sp * 0.16;
      strips.forEach(function (el, k) { var v = 'translate3d(' + (par * (k ? 1.3 : 1)).toFixed(1) + 'px,0,0)'; if (el.__t !== v) { el.__t = v; el.style.transform = v; } });
    }

    /* ---------- boucle : active seulement quand la section est visible et l'onglet affiché ---------- */
    function loop(t) {
      raf = 0;
      var dt = last ? Math.min((t - last) / 1000, 0.05) : 1 / 60;
      last = t;
      if (!lite && ++frames < 90 && dt > 0.034) { if (++slowFrames > 24) { lite = true; sec.classList.add('is-lite'); P.forEach(function (p) { p.cache = {}; }); } }
      var now = performance.now();
      if (now - lastScrollT > 120) scrollV *= 0.8;
      step(dt);
      render(t, dt);
      var moving = dragging || Math.abs(pos - target) > 0.0005 || Math.abs(vel) > 0.001 || P.some(function (p) { return Math.abs(p.vb) + Math.abs(p.vc) + Math.abs(p.vy) > 1e-3; });
      if (visible && !document.hidden && (moving || (drift && !lite) || now - lastScrollT < 300)) raf = requestAnimationFrame(loop);
      else last = 0;
    }
    function kick() { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop); }
    function onScroll() {
      var now = performance.now(), y = scrollY;
      if (lastScrollT) { var v = (y - lastScrollY) / Math.max((now - lastScrollT) / 1000, 0.008); scrollV = lerp(scrollV, v, 0.35); }
      lastScrollY = y; lastScrollT = now;
      kick();
    }
    var io = new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }, { rootMargin: '10% 0px' });
    io.observe(sec);
    var onResize = function () { layout(); P.forEach(function (p) { p.cache = {}; }); kick(); };
    var onVis = function () { if (!document.hidden) { last = 0; kick(); } };
    var onTheme = function () { themeVars(); kick(); };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVis);
    document.addEventListener('brg:theme', onTheme);
    /* éditeur de thème : sélectionner un bloc montre la pièce */
    var onBlock = function (e) { var i = qa('[data-f-block]').map(function (x) { return x.getAttribute('data-f-block'); }).indexOf(e.detail && e.detail.blockId); if (i > -1) settleTo(i, 0); };
    document.addEventListener('shopify:block:select', onBlock);

    layout();
    sel = -1; setSel(start, false);
    sec.classList.add('is-ready');
    render(performance.now(), 0);
    kick();

    C.float = C.float || { instances: 0 };
    C.float.instances++;
    C.float.state = function () { return { pos: pos, target: target, sel: sel, handle: data[sel].handle, phase: sec.getAttribute('data-phase'), lite: lite, prog: prog }; };

    return function destroy() {
      cancelAnimationFrame(raf); raf = 0; io.disconnect(); clearTimeout(wheelT); clearTimeout(liveT);
      removeEventListener('scroll', onScroll); removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis); document.removeEventListener('brg:theme', onTheme);
      document.removeEventListener('shopify:block:select', onBlock);
      trackEl.innerHTML = '';
      if (C.float) C.float.instances--;
    };
  });
  /* le cœur a déjà monté la page (scripts différés) : monter la galerie maintenant */
  if (C.mount && document.readyState !== 'loading') C.mount(document);
})();
