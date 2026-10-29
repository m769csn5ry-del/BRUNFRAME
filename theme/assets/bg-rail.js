/* Tringle de colliers — Canvas 2D + Verlet. Zéro dépendance.
   Chaque collier = chaîne de particules épinglée aux deux bouts sur la barre, pendentif suspendu au centre.
   Drag/swipe horizontal (inertie + rebond), voisins qui se repoussent, clavier, reduced-motion. */
window.BG = window.BG || {};
(function (BG) {
  var mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var SEG = 9, GRAV = .5, DAMP = .993, ITER = 14;

  function Rail(root) {
    var cv = root.querySelector('canvas');
    var ctx = cv && cv.getContext && cv.getContext('2d');
    var data = root.querySelector('[data-rail-items]');
    if (!ctx || !data) { root.classList.add('is-fallback'); return; }
    var items = JSON.parse(data.textContent), N = items.length;
    if (!N) return;
    var panel = root.querySelector('[data-rail-panel]');
    var reduce = mq.matches;
    var W, H, dpr, spacing, base, minOff, hw, pend, by, drop, lp;
    var off = 0, vel = 0, target = null, dragging = false, moved = 0, lastX = 0;
    var sel = -1, hover = -1, visible = true, running = false, t0 = performance.now();
    var chains = [], imgs = {};
    items.forEach(function (it, i) {
      it.ci = 0;
      if (it.image) { var im = new Image(); im.onload = function () { imgs[i] = im; if (reduce) redraw(); }; im.src = it.image; }
    });

    function cx(i) { return base + spacing * (i + .5) + off; }

    function build() {
      var r = cv.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      lp = W >= 900 ? Math.round(W * .38) : 0; /* colonne texte à gauche en desktop */
      var area = W - lp, vis = W < 520 ? 1.7 : W < 900 ? 3 : 3.4;
      spacing = Math.max(150, area / vis);
      base = lp + Math.max(0, (area - N * spacing) / 2);
      minOff = Math.min(0, area - N * spacing);
      hw = spacing * .36;
      pend = Math.max(58, Math.min(112, spacing * .46));
      by = Math.max(46, H * .09);
      drop = Math.max(130, Math.min(380, H * .5));
      if (!reduce) { off = spacing * .9; target = 0; } else off = 0;
      chains = items.map(function (_, i) { return makeChain(cx(i)); });
      if (reduce) { settle(); redraw(); }
    }

    function makeChain(x) {
      var p = [], links = [], n = SEG * 2 + 1, i;
      for (i = 0; i < n; i++) {
        var side = i <= SEG ? i / SEG : (n - 1 - i) / SEG;
        var px = i <= SEG ? x - hw + hw * side : x + hw - hw * side;
        var py = by + 4 + (drop * .55) * Math.sin(side * Math.PI / 2);
        p.push({ x: px, y: py, px: px, py: py, pin: i === 0 || i === n - 1 });
      }
      for (i = 0; i < n - 1; i++) links.push([i, i + 1, Math.hypot(p[i + 1].x - p[i].x, p[i + 1].y - p[i].y) * 1.05 + 1.2]);
      var c = p[SEG];
      var a = { x: c.x, y: c.y + 14, px: c.x, py: c.y + 14 }, b = { x: c.x, y: c.y + 14 + pend * .55, px: c.x, py: c.y + 14 + pend * .55 };
      p.push(a, b);
      links.push([SEG, n, 14], [n, n + 1, pend * .55]);
      return { p: p, links: links, hi: n + 1, ax: x };
    }

    function step(t) {
      var i, k, j, c, q;
      for (i = 0; i < N; i++) {
        c = chains[i];
        var ax = cx(i), ddx = ax - c.ax; c.ax = ax;
        if (ddx > 40) ddx = 40; else if (ddx < -40) ddx = -40;
        var wind = reduce ? 0 : Math.sin(t * .0009 + i * 1.7) * .035;
        for (j = 0; j < c.p.length; j++) {
          q = c.p[j];
          if (q.pin) {
            var left = j === 0; q.x = q.px = ax + (left ? -hw : hw); q.y = q.py = by + 4;
            continue;
          }
          var w = Math.max(0, 1 - (q.y - by) / (drop * 1.3)) * .85;
          q.x += ddx * w; q.px += ddx * w;
          var vx = (q.x - q.px) * DAMP, vy = (q.y - q.py) * DAMP;
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
        for (i = 0; i < N - 1; i++) { /* voisins : les pendentifs se repoussent */
          var A = chains[i].p[chains[i].hi], B = chains[i + 1].p[chains[i + 1].hi];
          var gx = B.x - A.x, gy = Math.abs(B.y - A.y), min = pend * 1.02;
          if (gx < min && gy < pend * .9) {
            var push = (min - gx) * .5;
            A.x -= push; B.x += push;
            var A1 = chains[i].p[chains[i].hi - 1], B1 = chains[i + 1].p[chains[i + 1].hi - 1];
            A1.x -= push * .5; B1.x += push * .5;
          }
        }
      }
    }

    function settle() { for (var i = 0; i < 240; i++) step(0); }

    function hit(mx, my) {
      var best = -1, bd = 1e9, rad = Math.max(46, pend * .85);
      chains.forEach(function (c, i) {
        var q = c.p[c.hi], d = Math.hypot(q.x - mx, q.y - my);
        if (d < rad && d < bd) { bd = d; best = i; }
      });
      return best;
    }

    function chainPath(c) {
      ctx.beginPath(); ctx.moveTo(c.p[0].x, c.p[0].y);
      for (var j = 1; j <= SEG * 2; j++) ctx.lineTo(c.p[j].x, c.p[j].y);
    }

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      /* barre */
      var g = ctx.createLinearGradient(0, by - 4, 0, by + 5);
      g.addColorStop(0, '#f1f5f3'); g.addColorStop(.45, '#8d9894'); g.addColorStop(1, '#2a302e');
      ctx.fillStyle = g; ctx.fillRect(0, by - 4, W, 9);
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, by + 5, W, 3);
      chains.forEach(function (c, i) {
        var dim = sel >= 0 && sel !== i ? .5 : 1;
        ctx.globalAlpha = dim;
        /* chaîne : maillons simulés par pointillé */
        chainPath(c);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.strokeStyle = '#0a0c0b'; ctx.lineWidth = 3.8; ctx.setLineDash([]); ctx.stroke();
        ctx.strokeStyle = '#c9d2cd'; ctx.lineWidth = 2.2; ctx.setLineDash([3, 2]); ctx.stroke(); ctx.setLineDash([]);
        /* anneaux d'accroche */
        [c.p[0], c.p[SEG * 2]].forEach(function (q) {
          ctx.beginPath(); ctx.arc(q.x, by, 5, 0, 6.3); ctx.strokeStyle = '#dfe6e3'; ctx.lineWidth = 2; ctx.stroke();
        });
        /* pendentif */
        var a = c.p[c.hi - 1], b = c.p[c.hi], ang = Math.atan2(b.y - a.y, b.x - a.x) - Math.PI / 2;
        var on = sel === i || hover === i, sc = on ? 1.18 : 1;
        if (on) {
          var r = pend * 1.3, gl = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
          gl.addColorStop(0, 'rgba(54,212,131,.38)'); gl.addColorStop(1, 'rgba(54,212,131,0)');
          ctx.fillStyle = gl; ctx.fillRect(b.x - r, b.y - r, r * 2, r * 2);
        }
        ctx.save();
        ctx.translate(b.x, b.y); ctx.rotate(ang); ctx.scale(sc, sc);
        var it = items[i];
        if (imgs[i]) {
          var im = imgs[i], w = pend * 1.2, h = w * im.height / im.width;
          ctx.drawImage(im, -w / 2, -h / 2, w, h);
        } else {
          BG.drawPendant(ctx, it.shape, (it.colors && it.colors[it.ci] && it.colors[it.ci].key) || 'chrome', pend);
        }
        ctx.restore();
        ctx.globalAlpha = 1;
      });
    }

    function redraw() { if (reduce) { settle(); draw(); } }

    function frame(t) {
      if (!visible || document.hidden) { running = false; return; }
      if (!dragging) {
        if (target !== null) { off += (target - off) * .09; if (Math.abs(target - off) < .4) target = null; }
        else {
          off += vel; vel *= .94;
          if (off > 0) { off += (0 - off) * .16; vel *= .8; }
          if (off < minOff) { off += (minOff - off) * .16; vel *= .8; }
        }
      }
      step(t); draw();
      requestAnimationFrame(frame);
    }
    function wake() { if (!reduce && !running) { running = true; requestAnimationFrame(frame); } }

    /* sélection + panneau d'info (HTML réel, lisible par lecteur d'écran) */
    function select(i, center) {
      sel = i;
      if (i >= 0 && center !== false) target = Math.max(minOff, Math.min(0, lp + (W - lp) / 2 - base - spacing * (i + .5)));
      renderPanel();
      if (reduce) { off = target !== null ? target : off; target = null; redraw(); }
      wake();
    }
    function renderPanel() {
      if (!panel) return;
      if (sel < 0) { panel.hidden = true; return; }
      var it = items[sel]; panel.hidden = false;
      panel.querySelector('[data-p-title]').textContent = it.title;
      panel.querySelector('[data-p-price]').textContent = it.priceLabel || '';
      var sw = panel.querySelector('[data-p-colors]'); sw.innerHTML = '';
      (it.colors || []).forEach(function (c, ci) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'bg-swatch' + (ci === it.ci ? ' is-on' : ''); b.style.setProperty('--sw', c.hex);
        b.setAttribute('aria-label', 'Couleur ' + c.name); b.setAttribute('aria-pressed', ci === it.ci);
        b.onclick = function () { it.ci = ci; renderPanel(); redraw(); };
        sw.appendChild(b);
      });
      panel.querySelector('[data-p-link]').href = it.url;
      var add = panel.querySelector('[data-p-add]');
      if (add) {
        var v = (it.colors && it.colors[it.ci] && it.colors[it.ci].variantId) || it.variantId;
        add.dataset.variantId = v || ''; add.hidden = !v;
      }
      var live = panel.querySelector('[data-p-live]'); if (live) live.textContent = it.title + ', ' + (it.priceLabel || '');
    }
    if (panel) {
      var add = panel.querySelector('[data-p-add]');
      if (add) add.addEventListener('click', function () {
        if (BG.cart && add.dataset.variantId) BG.cart.add(add.dataset.variantId, 1, items[sel]);
      });
      var close = panel.querySelector('[data-p-close]'); if (close) close.onclick = function () { select(-1); };
      var pv = panel.querySelector('[data-p-prev]'), nx = panel.querySelector('[data-p-next]');
      if (pv) pv.onclick = function () { select((sel + N - 1) % N); };
      if (nx) nx.onclick = function () { select((sel + 1) % N); };
    }

    /* pointeur */
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
          var over = off > 0 || off < minOff;
          off += dx * (over ? .35 : 1); vel = dx * .9;
        } else {
          var p = pos(e), h = hit(p[0], p[1]);
          if (h !== hover) {
            hover = h; cv.style.cursor = h >= 0 ? 'pointer' : 'grab';
            if (h >= 0) { var q = chains[h].p[chains[h].hi]; q.x += 4; }
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
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { var s = sel; build(); if (s >= 0) renderPanel(); wake(); }, 150); });
    build(); wake();
    root.BGRail = { select: select, items: items, get state() { return { off: off, vel: vel, sel: sel, minOff: minOff }; }, chains: function () { return chains; } };
  }

  BG.initRails = function () { document.querySelectorAll('[data-bg-rail]').forEach(function (r) { if (!r.BGRail) Rail(r); }); };
  if (document.readyState !== 'loading') BG.initRails(); else document.addEventListener('DOMContentLoaded', BG.initRails);
  document.addEventListener('shopify:section:load', BG.initRails);
})(window.BG);
