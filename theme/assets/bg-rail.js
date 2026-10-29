/* Tringle de colliers — Canvas 2D + Verlet, zéro dépendance.
   Chaque collier = chaîne de particules épinglée par deux anneaux qui glissent sur une barre fixe.
   Au centre : la pièce, rendue avec (par ordre de priorité) un détourage PNG réel, sinon la photo officielle
   dans un cadre chromé, sinon une plaque neutre (aucune fausse silhouette de bijou).
   Drag/swipe (inertie, rebond), voisins qui se repoussent, clavier, reduced-motion, adaptation à l'appareil. */
window.BG = window.BG || {};
(function (BG) {
  var mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var SEG = 10, GRAV = .5, DAMP = .992;
  var LOW = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4 ||
    !!(navigator.connection && navigator.connection.saveData);

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function chromeGrad(ctx, x0, y0, x1, y1, gold) {
    var g = ctx.createLinearGradient(x0, y0, x1, y1), s = gold ? ['#5b4a2a', '#f3e2b4', '#a88a52', '#3a2f1c', '#d8bf86'] : ['#2f3634', '#f4f7f6', '#9aa5a1', '#252b29', '#c9d1ce'];
    [0, .28, .5, .72, 1].forEach(function (o, i) { g.addColorStop(o, s[i]); });
    return g;
  }

  function Rail(root) {
    var cv = root.querySelector('canvas');
    var ctx = cv && cv.getContext && cv.getContext('2d');
    var data = root.querySelector('[data-rail-items]');
    if (!ctx || !data) { root.classList.add('is-fallback'); return; }
    var items = JSON.parse(data.textContent), N = items.length;
    if (!N) return;
    var panel = root.querySelector('[data-rail-panel]');
    var stage = root.closest('[data-stage]') || root;
    var para = stage.querySelector('[data-parallax]');
    var reduce = mq.matches, ITER = LOW ? 8 : 14;
    var W, H, dpr, spacing, base, minOff, hw, mw, mh, by, sag, lp, floorY;
    var off = 0, vel = 0, target = null, dragging = false, moved = 0, lastX = 0;
    var sel = -1, hover = -1, visible = true, running = false;
    var chains = [], imgs = {};

    items.forEach(function (it, i) {
      it.ci = 0;
      it.gold = /\b(gold|or)\b/i.test(it.title);
      load(i);
    });
    function load(i) {
      var it = items[i], v = it.colors && it.colors[it.ci], src = it.cutout || (v && v.photo) || it.photo;
      if (!src) return;
      var im = new Image();
      im.decoding = 'async';
      im.onload = function () { imgs[i] = { im: im, cut: !!it.cutout }; if (reduce) redraw(); };
      im.src = src;
    }

    function cx(i) { return base + spacing * (i + .5) + off; }

    function build() {
      var r = cv.getBoundingClientRect();
      dpr = Math.min(LOW ? 1.25 : 2, window.devicePixelRatio || 1);
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      lp = W >= 900 ? Math.round(W * .36) : 0; /* colonne éditoriale à gauche en desktop */
      var area = W - lp, vis = W < 520 ? 1.75 : W < 900 ? 2.6 : 3.3;
      spacing = Math.max(170, area / vis);
      base = lp + Math.max(0, (area - N * spacing) / 2);
      minOff = Math.min(0, area - N * spacing);
      hw = spacing * .27;
      mw = Math.max(92, Math.min(176, spacing * .56)); mh = mw * 1.25;
      by = Math.max(40, H * .08);
      floorY = H * .965;
      sag = Math.max(46, Math.min(H * .3, H * .9 - by - 26 - mh));
      if (!reduce) { off = spacing * .55; target = 0; } else off = 0;
      chains = items.map(function (_, i) { return makeChain(cx(i)); });
      if (reduce) { settle(); redraw(); }
    }

    function makeChain(x) {
      var p = [], links = [], n = SEG * 2 + 1, i;
      for (i = 0; i < n; i++) {
        var side = i <= SEG ? i / SEG : (n - 1 - i) / SEG;
        var px = i <= SEG ? x - hw + hw * side : x + hw - hw * side;
        var py = by + 3 + sag * Math.sin(side * Math.PI / 2);
        p.push({ x: px, y: py, px: px, py: py, pin: i === 0 || i === n - 1 });
      }
      for (i = 0; i < n - 1; i++) links.push([i, i + 1, Math.hypot(p[i + 1].x - p[i].x, p[i + 1].y - p[i].y) * 1.04 + 1]);
      var c = p[SEG];
      var a = { x: c.x, y: c.y + 10, px: c.x, py: c.y + 10 }, b = { x: c.x, y: a.y + mh * .5, px: c.x, py: a.y + mh * .5 };
      p.push(a, b);
      links.push([SEG, n, 10], [n, n + 1, mh * .5]);
      return { p: p, links: links, hi: n + 1, ax: x };
    }

    function step(t) {
      var i, k, j, c, q;
      for (i = 0; i < N; i++) {
        c = chains[i];
        var ax = cx(i), ddx = ax - c.ax; c.ax = ax;
        if (ddx > 40) ddx = 40; else if (ddx < -40) ddx = -40;
        var wind = reduce ? 0 : Math.sin(t * .0008 + i * 1.9) * .03;
        for (j = 0; j < c.p.length; j++) {
          q = c.p[j];
          if (q.pin) { q.x = q.px = ax + (j === 0 ? -hw : hw); q.y = q.py = by + 3; continue; }
          var w = Math.max(0, 1 - (q.y - by) / (sag * 1.4)) * .85; /* la chaîne suit la barre, la pièce traîne */
          q.x += ddx * w; q.px += ddx * w;
          var dm = j >= c.hi - 1 ? .965 : DAMP; /* amortissement angulaire de la pièce : balancement crédible, pas de toupie */
          var vx = (q.x - q.px) * dm, vy = (q.y - q.py) * dm;
          q.px = q.x; q.py = q.y; q.x += vx + wind; q.y += vy + GRAV;
        }
      }
      for (k = 0; k < ITER; k++) {
        for (i = 0; i < N; i++) {
          c = chains[i];
          for (j = 0; j < c.links.length; j++) {
            var L = c.links[j], a = c.p[L[0]], b = c.p[L[1]];
            var dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || .0001, f = (d - L[2]) / d;
            var wa = a.pin ? 0 : (b.pin ? 1 : .5), wb = b.pin ? 0 : (a.pin ? 1 : .5);
            a.x += dx * f * wa; a.y += dy * f * wa; b.x -= dx * f * wb; b.y -= dy * f * wb;
          }
        }
        for (i = 0; i < N - 1; i++) { /* voisins : les pièces se repoussent au lieu de se traverser */
          var A = chains[i].p[chains[i].hi], B = chains[i + 1].p[chains[i + 1].hi];
          var gx = B.x - A.x, min = mw * 1.06;
          if (gx < min && Math.abs(B.y - A.y) < mh) { var push = (min - gx) * .5; A.x -= push; B.x += push; }
        }
      }
    }
    function settle() { for (var i = 0; i < 260; i++) step(0); }

    function plate(c) { /* repère de la pièce : origine = bélière, angle = pendule bélière→centre */
      var a = c.p[c.hi - 1], b = c.p[c.hi];
      return { x: a.x, y: a.y, cx: b.x, cy: b.y, ang: Math.atan2(b.y - a.y, b.x - a.x) - Math.PI / 2, sw: b.x - b.px };
    }
    function hit(mx, my) {
      var best = -1, bd = 1e9;
      chains.forEach(function (c, i) {
        var P = plate(c), d = Math.hypot(P.cx - mx, P.cy - my);
        if (d < Math.max(mw, mh) * .62 && d < bd) { bd = d; best = i; }
      });
      return best;
    }

    function drawChain(c, gold) {
      ctx.beginPath(); ctx.moveTo(c.p[0].x, c.p[0].y);
      for (var j = 1; j <= SEG * 2; j++) ctx.lineTo(c.p[j].x, c.p[j].y);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 3.6; ctx.setLineDash([]); ctx.stroke();
      ctx.strokeStyle = gold ? '#b89a5e' : '#8d9894'; ctx.lineWidth = 2.4; ctx.setLineDash([2.6, 1.1]); ctx.stroke();
      if (!LOW) { ctx.strokeStyle = gold ? '#fff1c9' : '#f3f6f5'; ctx.lineWidth = .9; ctx.setLineDash([1.1, 2.6]); ctx.lineDashOffset = 1; ctx.stroke(); ctx.lineDashOffset = 0; }
      ctx.setLineDash([]);
    }

    function drawPlate(i, c) {
      var P = plate(c), it = items[i], on = sel === i || hover === i, sc = sel === i ? 1.1 : hover === i ? 1.04 : 1;
      var squash = Math.max(.78, 1 - Math.min(.22, Math.abs(P.sw) * .03)); /* rotation 3D suggérée pendant le balancement */
      ctx.save();
      ctx.translate(P.x, P.y); ctx.rotate(P.ang); ctx.scale(sc * squash, sc);
      /* bélière */
      ctx.beginPath(); ctx.ellipse(0, -2, 4.5, 6, 0, 0, 6.3); ctx.lineWidth = 2; ctx.strokeStyle = chromeGrad(ctx, -5, -8, 5, 4, it.gold); ctx.stroke();
      var x = -mw / 2, y = 4, im = imgs[i];
      if (im && im.cut) {
        var cw = mw * 1.1, ch = cw * im.im.height / im.im.width;
        ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 10;
        ctx.drawImage(im.im, -cw / 2, y, cw, ch);
        ctx.restore(); return;
      }
      ctx.shadowColor = 'rgba(0,0,0,.65)'; ctx.shadowBlur = LOW ? 8 : 26; ctx.shadowOffsetY = LOW ? 4 : 14;
      rr(ctx, x - 3, y - 3, mw + 6, mh + 6, 7); ctx.fillStyle = chromeGrad(ctx, x, y, x + mw, y + mh, it.gold); ctx.fill();
      ctx.shadowColor = 'transparent';
      rr(ctx, x, y, mw, mh, 4); ctx.fillStyle = '#0b0d0d'; ctx.fill();
      ctx.save(); rr(ctx, x, y, mw, mh, 4); ctx.clip();
      if (im) {
        var iw = im.im.width, ih = im.im.height, s = Math.max(mw / iw, mh / ih), dw = iw * s, dh = ih * s;
        var fy = it.focusY == null ? .62 : it.focusY;
        ctx.drawImage(im.im, x + (mw - dw) / 2, y + Math.min(0, Math.max(mh - dh, mh / 2 - dh * fy)), dw, dh);
      } else {
        var g0 = ctx.createLinearGradient(x, y, x + mw, y + mh); g0.addColorStop(0, '#1a1f1e'); g0.addColorStop(1, '#090b0b');
        ctx.fillStyle = g0; ctx.fillRect(x, y, mw, mh);
        ctx.fillStyle = 'rgba(232,238,235,.75)'; ctx.font = '300 ' + Math.round(mw * .15) + 'px "Cormorant", Georgia, serif'; ctx.textAlign = 'center';
        wrap(it.title, 0, y + mh * .46, mw * .82, mw * .17);
        ctx.font = '500 ' + Math.max(8, Math.round(mw * .055)) + 'px Manrope, system-ui, sans-serif'; ctx.fillStyle = 'rgba(200,210,206,.45)';
        ctx.fillText('PHOTO OFFICIELLE', 0, y + mh * .86);
      }
      /* verre fumé : vignettage + reflet qui glisse avec la position sur la tringle */
      var v = ctx.createLinearGradient(0, y, 0, y + mh); v.addColorStop(0, 'rgba(0,0,0,.25)'); v.addColorStop(.35, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)');
      ctx.fillStyle = v; ctx.fillRect(x, y, mw, mh);
      if (!LOW) {
        var gx = x + mw * (1.4 - 1.8 * (P.cx / Math.max(W, 1))), gl = ctx.createLinearGradient(gx - mw * .5, y, gx + mw * .5, y + mh);
        gl.addColorStop(0, 'rgba(255,255,255,0)'); gl.addColorStop(.48, 'rgba(255,255,255,.0)'); gl.addColorStop(.5, 'rgba(255,255,255,.13)'); gl.addColorStop(.56, 'rgba(255,255,255,0)');
        ctx.fillStyle = gl; ctx.fillRect(x, y, mw, mh);
      }
      ctx.restore();
      ctx.lineWidth = 1; ctx.strokeStyle = on ? 'rgba(170,230,205,.6)' : 'rgba(0,0,0,.6)'; rr(ctx, x + .5, y + .5, mw - 1, mh - 1, 4); ctx.stroke();
      ctx.restore();
    }
    function wrap(t, x, y, max, lh) {
      var w = t.split(' '), line = '', lines = [];
      w.forEach(function (s) { var tt = line ? line + ' ' + s : s; if (ctx.measureText(tt).width > max && line) { lines.push(line); line = s; } else line = tt; });
      lines.push(line); lines = lines.slice(0, 3);
      lines.forEach(function (l, k) { ctx.fillText(l, x, y + (k - (lines.length - 1) / 2) * lh); });
    }

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      var i, c;
      /* ombres de contact au sol */
      for (i = 0; i < N; i++) {
        var P = plate(chains[i]), d = Math.max(0, floorY - (P.cy + mh / 2)), a = Math.max(.08, .5 - d / (H * 1.2));
        var sh = ctx.createRadialGradient(P.cx, floorY, 0, P.cx, floorY, mw * .8);
        sh.addColorStop(0, 'rgba(0,0,0,' + a + ')'); sh.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sh; ctx.fillRect(P.cx - mw, floorY - 14, mw * 2, 28);
      }
      /* anneaux (moitié arrière) puis barre */
      chains.forEach(function (c) { [c.p[0], c.p[SEG * 2]].forEach(function (q) { ring(q.x, false); }); });
      [W * .035, W * .965].forEach(function (x) { /* tiges de suspension fixes */
        ctx.fillStyle = chromeGrad(ctx, x - 3, 0, x + 3, 0); ctx.fillRect(x - 2, 0, 4, by - 4);
        rr(ctx, x - 7, by - 9, 14, 18, 3); ctx.fillStyle = chromeGrad(ctx, x - 7, by - 9, x + 7, by + 9); ctx.fill();
      });
      var g = ctx.createLinearGradient(0, by - 5, 0, by + 5);
      g.addColorStop(0, '#3b4240'); g.addColorStop(.3, '#f5f8f7'); g.addColorStop(.5, '#a3ada9'); g.addColorStop(.75, '#262c2a'); g.addColorStop(1, '#6f7976');
      ctx.fillStyle = g; ctx.fillRect(0, by - 5, W, 10);
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, by + 5, W, 4);
      for (i = 0; i < N; i++) {
        c = chains[i];
        ctx.globalAlpha = sel >= 0 && sel !== i ? .34 : 1;
        if (sel === i) { /* lumière d'atelier froide sur la pièce choisie */
          var P2 = plate(c), r = mh * 1.25, sp = ctx.createRadialGradient(P2.cx, P2.cy, 0, P2.cx, P2.cy, r);
          sp.addColorStop(0, 'rgba(210,235,226,.16)'); sp.addColorStop(1, 'rgba(210,235,226,0)');
          ctx.fillStyle = sp; ctx.fillRect(P2.cx - r, P2.cy - r, r * 2, r * 2);
        }
        drawChain(c, items[i].gold);
        drawPlate(i, c);
      }
      ctx.globalAlpha = 1;
      chains.forEach(function (c) { [c.p[0], c.p[SEG * 2]].forEach(function (q) { ring(q.x, true); }); });
      if (para) para.style.transform = 'translate3d(' + (off * .14).toFixed(1) + 'px,0,0)';
    }
    function ring(x, front) {
      ctx.beginPath();
      if (front) ctx.ellipse(x, by, 3.6, 8, 0, .15 * Math.PI, .85 * Math.PI); else ctx.ellipse(x, by, 3.6, 8, 0, 0, 6.3);
      ctx.lineWidth = 2.2; ctx.strokeStyle = chromeGrad(ctx, x - 4, by - 8, x + 4, by + 8); ctx.stroke();
    }

    function redraw() { if (reduce) { settle(); draw(); } }

    function frame(t) {
      if (!visible || document.hidden) { running = false; return; }
      if (!dragging) {
        if (target !== null) { off += (target - off) * .05; if (Math.abs(target - off) < .4) target = null; }
        else {
          off += vel; vel *= .945;
          if (off > 0) { off += (0 - off) * .16; vel *= .8; }
          if (off < minOff) { off += (minOff - off) * .16; vel *= .8; }
        }
      }
      step(t); draw();
      requestAnimationFrame(frame);
    }
    function wake() { if (!reduce && !running) { running = true; requestAnimationFrame(frame); } }

    /* sélection + panneau d'information (HTML réel, lisible par lecteur d'écran) */
    function select(i, center) {
      sel = i;
      if (i >= 0 && center !== false) target = Math.max(minOff, Math.min(0, lp + (W - lp) / 2 - base - spacing * (i + .5)));
      renderPanel();
      if (i >= 0) document.dispatchEvent(new CustomEvent('bg:track', { detail: { name: 'select_item', payload: { handle: items[i].handle } } }));
      if (reduce) { if (target !== null) off = target; target = null; redraw(); }
      wake();
    }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
    function renderPanel() {
      if (!panel) return;
      root.classList.toggle('has-selection', sel >= 0);
      if (sel < 0) { panel.hidden = true; return; }
      var it = items[sel], v = it.colors && it.colors[it.ci];
      panel.hidden = false;
      panel.querySelector('[data-p-title]').textContent = (v && v.title) || it.title;
      panel.querySelector('[data-p-price]').textContent = (v && v.priceLabel) || it.priceLabel || '';
      var ph = panel.querySelector('[data-p-photos]');
      if (ph) ph.innerHTML = ((v && v.photos) || it.photos || []).slice(0, 3).map(function (u, k) {
        return '<img src="' + esc(u) + '" alt="' + esc(it.title) + ' — photo ' + (k + 1) + '" width="72" height="90" loading="lazy">';
      }).join('');
      var sw = panel.querySelector('[data-p-colors]'); sw.innerHTML = '';
      (it.colors || []).forEach(function (c, ci) {
        if ((it.colors || []).length < 2) return;
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'bg-chip bg-chip--sm'; b.textContent = c.name;
        b.setAttribute('aria-pressed', ci === it.ci);
        b.onclick = function () { it.ci = ci; load(sel); renderPanel(); redraw(); };
        sw.appendChild(b);
      });
      panel.querySelector('[data-p-link]').href = (v && v.url) || it.url;
      var add = panel.querySelector('[data-p-add]');
      if (add) { var id = (v && v.variantId) || it.variantId; add.dataset.variantId = id || ''; add.hidden = !id; }
      var live = panel.querySelector('[data-p-live]'); if (live) live.textContent = it.title + ', ' + (it.priceLabel || '');
    }
    if (panel) {
      var add = panel.querySelector('[data-p-add]');
      if (add) add.addEventListener('click', function () {
        if (BG.cart && add.dataset.variantId) BG.cart.add(add.dataset.variantId, 1, items[sel]);
      });
      var close = panel.querySelector('[data-p-close]'); if (close) close.onclick = function () { select(-1); root.focus(); };
      var pv = panel.querySelector('[data-p-prev]'), nx = panel.querySelector('[data-p-next]');
      if (pv) pv.onclick = function () { select((sel + N - 1) % N); };
      if (nx) nx.onclick = function () { select((sel + 1) % N); };
    }

    /* pointeur : drag horizontal, le scroll vertical reste au navigateur (touch-action: pan-y) */
    function pos(e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    if (!reduce) {
      cv.addEventListener('pointerdown', function (e) {
        dragging = true; moved = 0; lastX = e.clientX; vel = 0; target = null;
        try { cv.setPointerCapture(e.pointerId); } catch (_) { }
        root.classList.add('is-dragging'); wake();
      });
      cv.addEventListener('pointermove', function (e) {
        if (dragging) {
          var dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx);
          off += dx * (off > 0 || off < minOff ? .35 : 1); vel = dx * .9;
        } else if (e.pointerType === 'mouse') {
          var p = pos(e), h = hit(p[0], p[1]);
          if (h !== hover) {
            hover = h; cv.style.cursor = h >= 0 ? 'pointer' : 'grab';
            if (h >= 0) { var q = chains[h].p[chains[h].hi]; q.x += 3; }
          }
        }
      });
      var end = function (e) {
        if (!dragging) return; dragging = false; root.classList.remove('is-dragging');
        if (moved < 6) { var p = pos(e), h = hit(p[0], p[1]); select(h === sel ? -1 : h); }
      };
      cv.addEventListener('pointerup', end);
      cv.addEventListener('pointercancel', function () { dragging = false; root.classList.remove('is-dragging'); });
      cv.addEventListener('pointerleave', function () { hover = -1; });
      cv.addEventListener('wheel', function (e) {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); off -= e.deltaX; vel = -e.deltaX * .3; target = null; }
      }, { passive: false });
    } else {
      cv.addEventListener('click', function (e) { var p = pos(e), h = hit(p[0], p[1]); select(h === sel ? -1 : h); });
    }
    root.addEventListener('keydown', function (e) {
      if (e.target !== root) return;
      var k = e.key;
      if (k === 'ArrowRight') { select(sel < 0 ? 0 : (sel + 1) % N); e.preventDefault(); }
      else if (k === 'ArrowLeft') { select(sel < 0 ? N - 1 : (sel + N - 1) % N); e.preventDefault(); }
      else if (k === 'Escape') select(-1);
      else if (k === 'Enter' && sel >= 0) location.href = items[sel].url;
    });

    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) wake(); }).observe(root);
    document.addEventListener('visibilitychange', wake);
    var rt, lastW = 0;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        var w = cv.getBoundingClientRect().width; if (Math.abs(w - lastW) < 2) return; /* iOS : la barre d'adresse ne reconstruit pas la scène */
        lastW = w; var s = sel; build(); if (s >= 0) renderPanel(); wake();
      }, 150);
    });
    build(); lastW = W; wake();
    root.BGRail = { select: select, items: items, get state() { return { off: off, vel: vel, sel: sel, minOff: minOff, low: LOW }; }, chains: function () { return chains; } };
  }

  BG.initRails = function () { document.querySelectorAll('[data-bg-rail]').forEach(function (r) { if (!r.BGRail) Rail(r); }); };
  if (document.readyState !== 'loading') BG.initRails(); else document.addEventListener('DOMContentLoaded', BG.initRails);
  document.addEventListener('shopify:section:load', BG.initRails);
})(window.BG);
