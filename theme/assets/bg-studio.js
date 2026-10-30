/* Studio Breslev : galerie circulaire en profondeur, au-dessus d'un relief minéral noir.
   Pièces : silhouette réelle tirée du détourage officiel (contour + trous), extrudée avec un biseau fin ; épaisseur estimée.
   Chaque pièce reste face caméra : ni revers inventé montré, ni pancarte sur la tranche. Sans gabarit 3D : photo détourée à plat.
   État A (galerie suspendue) → état B (détail du pendentif au-dessus du relief) piloté par le défilement de la section.
   Un seul propriétaire par transformation : rotation de galerie = geste ; caméra = défilement ; balancement = pendule local.
   Données : window.BG_STUDIO = [{ handle, title, option, priceLabel, available, url, cutout, fy }] */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const asset = n => new URL(n, import.meta.url).href;   // même dossier que ce script (assets Shopify ou ../theme/assets en prévisualisation)

/* Gabarits relevés sur les photos officielles : largeur de planche commune → proportions relatives respectées. */
const META = { 'necklace-maguen-chrome': { cw: 139, ch: 144, bailX: .529 }, 'necklace-chrome-fire-26': { cw: 88, ch: 159, bailX: .511 }, 'petek-croco-black-x-hay-new-season-26': { cw: 224, ch: 258, bailX: .52 },
  'mezouza-pearl-black': { cw: 64, ch: 253, bailX: .414 }, 'necklace-fire-2-0': { cw: 115, ch: 148, bailX: .513 }, 'charm-tag': { cw: 102, ch: 79 }, 'charm-hay': { cw: 62, ch: 88 } };
const RIG = {
  'necklace-maguen-chrome': { src: 1048, chain: 'box', thick: .2 },
  'necklace-chrome-fire-26': { src: 1155, chain: 'box', thick: .18 },
  'petek-croco-black-x-hay-new-season-26': { src: 1200, chain: 'cable', thick: .9, dark: true, left: { charm: 'charm-hay', at: .3 }, right: { beads: .48 } },
  'mezouza-pearl-black': { src: 1200, chain: 'cable', lathe: true, left: { beads: .42 }, right: { beads: .42, charm: 'charm-tag', at: .58 } },
  'necklace-fire-2-0': { src: 1166, chain: 'box', thick: .2 }
};
const BOARD = 24, DROP = 13, SPREAD = 2.6;

/* contour d'un détourage : marching squares, lissage Chaikin, simplification, trous et îlots */
function contour(img, w, h) {
  const sc = Math.min(1, 260 / Math.max(img.width, img.height)), GW = Math.max(8, Math.round(img.width * sc)), GH = Math.max(8, Math.round(img.height * sc));
  const c = document.createElement('canvas'); c.width = GW; c.height = GH; const x2 = c.getContext('2d'); x2.drawImage(img, 0, 0, GW, GH); const d = x2.getImageData(0, 0, GW, GH).data;
  const W2 = GW + 2, H2 = GH + 2, A = new Uint8Array(W2 * H2);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) A[(y + 1) * W2 + x + 1] = d[(y * GW + x) * 4 + 3] > 110 ? 1 : 0;
  const adj = new Map(), add = (a, b) => { (adj.get(a) || adj.set(a, []).get(a)).push(b); (adj.get(b) || adj.set(b, []).get(b)).push(a); };
  for (let y = 0; y < H2 - 1; y++) for (let x = 0; x < W2 - 1; x++) {
    const T = (y * W2 + x) * 2, B = ((y + 1) * W2 + x) * 2, L = (y * W2 + x) * 2 + 1, R = (y * W2 + x + 1) * 2 + 1;
    switch (A[y * W2 + x] * 8 + A[y * W2 + x + 1] * 4 + A[(y + 1) * W2 + x + 1] * 2 + A[(y + 1) * W2 + x]) {
      case 1: case 14: add(L, B); break; case 2: case 13: add(B, R); break; case 3: case 12: add(L, R); break;
      case 4: case 11: add(T, R); break; case 6: case 9: add(T, B); break; case 7: case 8: add(L, T); break;
      case 5: add(T, R); add(L, B); break; case 10: add(L, T); add(B, R); break;
    }
  }
  const P2 = k => { const i = k >> 1, cy = Math.floor(i / W2), cx = i % W2; const px = k & 1 ? cx : cx + .5, py = k & 1 ? cy + .5 : cy; return new THREE.Vector2(((px - 1) / GW - .5) * w, -((py - 1) / GH) * h); };
  const seen = new Set(), loops = [];
  for (const k of adj.keys()) { if (seen.has(k)) continue; const loop = [k]; let prev = -1, cur = k; seen.add(k);
    for (;;) { const nb = adj.get(cur), nx = nb[0] !== prev ? nb[0] : nb[1]; if (nx === undefined || nx === k || seen.has(nx)) break; seen.add(nx); loop.push(nx); prev = cur; cur = nx; }
    if (loop.length > 6) loops.push(loop.map(P2)); }
  const eps = w / GW * .28;
  const chaikin = (p, n) => { for (let r = 0; r < n; r++) { const q = []; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; q.push(a.clone().lerp(b, .25), a.clone().lerp(b, .75)); } p = q; } return p; };
  const ds = (p, a, b) => { const l = a.distanceToSquared(b); if (!l) return p.distanceTo(a); const t = clamp(((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l, 0, 1); return Math.hypot(p.x - a.x - t * (b.x - a.x), p.y - a.y - t * (b.y - a.y)); };
  const rdp = pts => { let m = 0, j = 0; for (let i = 1; i < pts.length - 1; i++) { const q = ds(pts[i], pts[0], pts[pts.length - 1]); if (q > m) { m = q; j = i; } } return m > eps ? rdp(pts.slice(0, j + 1)).slice(0, -1).concat(rdp(pts.slice(j))) : [pts[0], pts[pts.length - 1]]; };
  const area = p => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i].x * q.y - q.x * p[i].y; } return Math.abs(a / 2); };
  const inside = (pt, p) => { let o = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i].y > pt.y) !== (p[j].y > pt.y) && pt.x < (p[j].x - p[i].x) * (pt.y - p[i].y) / (p[j].y - p[i].y) + p[i].x) o = !o; return o; };
  const L2 = loops.map(l => { l = chaikin(l, 2); let far = 0, fi = 0; l.forEach((p, i) => { const q = p.distanceToSquared(l[0]); if (q > far) { far = q; fi = i; } });
    return rdp(l.slice(0, fi + 1)).slice(0, -1).concat(rdp(l.slice(fi).concat([l[0]])).slice(0, -1)); })
    .filter(l => l.length > 2).map(p => ({ p, a: area(p) })).filter(o => o.a > w * h * .0025).sort((x, y) => y.a - x.a);
  L2.forEach((o, i) => { o.par = L2.slice(0, i).filter(q => inside(o.p[0], q.p)); o.depth = o.par.length; });
  const big = L2.length ? L2[0].a : 0, shapes = [];   // îlots minuscules = restes de détourage, pas la pièce
  L2.forEach(o => { if (o.depth % 2 === 0 && o.a > big * .03) { o.shape = new THREE.Shape(o.p); shapes.push(o.shape); } });
  L2.forEach(o => { if (o.depth % 2) { const pa = o.par.filter(q => q.depth === o.depth - 1).pop(); if (pa && pa.shape) pa.shape.holes.push(new THREE.Path(o.p)); } });
  return shapes;
}

export function initStudio(root) {
  const data = window.BG_STUDIO || []; const N = data.length; if (!N) return;
  const stage = root.querySelector('[data-studio]'), canvas = root.querySelector('[data-studio-canvas]'), poster = root.querySelector('[data-studio-poster]');
  const $ = s => root.querySelector(s), live = $('[data-studio-live]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let sel = 0, pos = 0, target = 0, vel = 0, drag = null, renderer = null, settledAt = -1, progress = 0;
  const wrap = i => ((i % N) + N) % N, wrapD = x => { x = wrap(x); return x > N / 2 ? x - N : x; };

  function sync(i, announce) {
    sel = wrap(i); const d = data[sel];
    $('[data-s-name]').textContent = d.title; $('[data-s-opt]').textContent = d.option || '';
    $('[data-s-price]').textContent = d.priceLabel + (d.available ? '' : ' · épuisé');
    $('[data-s-link]').href = d.url; $('[data-s-link]').setAttribute('aria-label', 'Voir cette pièce : ' + d.title + ', ' + d.priceLabel);
    root.querySelectorAll('[data-s-dot]').forEach((b, k) => b.setAttribute('aria-current', String(k === sel)));
    if (d.cutout) { poster.src = d.cutout; poster.alt = d.title; }
    if (announce && live) live.textContent = d.title + ', ' + d.priceLabel + (d.option ? ', ' + d.option : '');
  }
  // sans WebGL ou en mouvement réduit : changement immédiat, sans animation ; sinon la boucle 3D amortit le passage
  const still = () => !renderer || reduce;
  const settle = () => { if (still()) { pos = target; vel = 0; sync(wrap(target), true); } else kick(); };
  const go = dir => { target = Math.round(target) + dir; settle(); };
  root.querySelector('[data-s-prev]').addEventListener('click', () => go(-1));
  root.querySelector('[data-s-next]').addEventListener('click', () => go(1));
  root.querySelectorAll('[data-s-dot]').forEach((b, k) => b.addEventListener('click', () => { target = Math.round(target) + wrapD(k - wrap(Math.round(target))); settle(); }));
  stage.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } });
  const hdr = () => root.style.setProperty('--hdr', ((document.querySelector('header') || {}).offsetHeight || 0) + 'px'); hdr(); addEventListener('resize', hdr);
  sync(0, false);

  /* ── WebGL (sinon : affiche + mêmes commandes) ── */
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); } catch (e) { renderer = null; }
  if (!renderer || reduce) { root.classList.add('is-static'); if (!renderer) return; }
  const isMob = () => innerWidth < 760;
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMob() ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const HAZE = 0x111316, scene = new THREE.Scene(); scene.background = new THREE.Color(HAZE); scene.fog = new THREE.FogExp2(HAZE, .009);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(renderer), .04).texture;
  const cam = new THREE.PerspectiveCamera(34, 1, .1, 800);
  const mgr = new THREE.LoadingManager(), tl = new THREE.TextureLoader(mgr), aniso = renderer.capabilities.getMaxAnisotropy();
  const tex = (u, srgb = true) => { const t = tl.load(asset(u)); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; };

  /* fond : relief minéral noir à grain fin, fondu dans un anthracite flou */
  const grainN = (() => { const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), im = g.createImageData(S, S), h = new Float32Array(S * S);
    for (let i = 0; i < h.length; i++) h[i] = Math.random();
    for (let p = 0; p < 2; p++) { const t = h.slice(); for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { let q = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) q += t[((y + dy + S) % S) * S + ((x + dx + S) % S)]; h[y * S + x] = q / 9; } }
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const i = y * S + x, gx = (h[y * S + (x + 1) % S] - h[y * S + (x - 1 + S) % S]) * 7, gy = (h[((y + 1) % S) * S + x] - h[((y - 1 + S) % S) * S + x]) * 7, l = Math.hypot(gx, gy, 1);
      im.data[i * 4] = (-gx / l * .5 + .5) * 255; im.data[i * 4 + 1] = (-gy / l * .5 + .5) * 255; im.data[i * 4 + 2] = (1 / l * .5 + .5) * 255; im.data[i * 4 + 3] = 255; }
    g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(60, 60); return t; })();
  const nz = (x, y) => Math.sin(x * .09 + Math.sin(y * .07) * 2) * Math.cos(y * .08 - Math.sin(x * .05) * 1.6) * 2.2 + Math.sin(x * .23 + y * .19) * Math.cos(y * .21 - x * .13) * .9 + Math.sin(x * .61 - y * .47) * .28 + Math.sin(x * 1.3 + y * 1.1) * .08;
  const rg = new THREE.PlaneGeometry(420, 320, isMob() ? 180 : 280, isMob() ? 140 : 210), rp = rg.attributes.position;
  for (let i = 0; i < rp.count; i++) { const x = rp.getX(i), y = rp.getY(i), far = Math.max(0, y - 30) * .06; rp.setZ(i, nz(x, y) * (1 + far * .8) + far * 3); }
  rg.computeVertexNormals();
  const relief = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ color: 0x17191c, roughness: .94, metalness: .06, normalMap: grainN, normalScale: new THREE.Vector2(1.1, 1.1), envMapIntensity: .25 }));
  relief.rotation.x = -Math.PI / 2; relief.position.y = -27; scene.add(relief);
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(330, 48, 24), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'varying vec3 vP; void main(){ float h = vP.y; vec3 c = mix(vec3(.067,.075,.086), vec3(.024,.027,.031), smoothstep(-.02, .55, h)); c += vec3(.012) * exp(-pow(vP.x * 2.2, 2.)) * smoothstep(.45, 0., abs(h - .08)); gl_FragColor = vec4(c, 1.); }' })));
  // lumière : rasante sur le relief, douce sur la pièce ; reflets calibrés, sans bloom
  const spot = new THREE.SpotLight(0xfff8f0, 380, 90, .5, 1, 1.6); spot.position.set(0, 10, 30); scene.add(spot, spot.target);
  const graze = new THREE.DirectionalLight(0xfff1e4, 1.5); graze.position.set(-60, 9, 20); scene.add(graze);
  const rimL = new THREE.DirectionalLight(0xc8d6ff, 1.1); rimL.position.set(-30, 10, -20); scene.add(rimL);
  const rimR = new THREE.DirectionalLight(0xffffff, .9); rimR.position.set(30, 4, -10); scene.add(rimR);
  scene.add(new THREE.HemisphereLight(0x8d969f, 0x050607, .32));

  /* matériaux */
  const chrome = new THREE.MeshStandardMaterial({ color: 0xdfe4e9, metalness: 1, roughness: .16, envMapIntensity: 1.05 });
  const chrome2 = new THREE.MeshStandardMaterial({ color: 0xd4d9de, metalness: 1, roughness: .24, envMapIntensity: .95 });
  const beadMat = new THREE.MeshPhysicalMaterial({ color: 0x141414, roughness: .62, metalness: .05, clearcoat: .35, clearcoatRoughness: .55, envMapIntensity: .8 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0x5d636a, metalness: .9, roughness: .42, envMapIntensity: .45, transparent: true });

  // rail circulaire fin, mat, plus discret que les bijoux
  const R = 19, rail = new THREE.Mesh(new THREE.TorusGeometry(R, .075, 10, 240), railMat); rail.rotation.x = Math.PI / 2; scene.add(rail);

  /* ── fabrication d'un collier ── */
  const boxLink = new THREE.TorusGeometry(.07, .022, 5, 4); boxLink.rotateZ(Math.PI / 4);
  const linkGeo = { box: boxLink, cable: new THREE.TorusGeometry(.19, .046, 8, 18) };
  const bead = new THREE.SphereGeometry(.3, 18, 14), spacer = new THREE.SphereGeometry(.13, 12, 10), ZF = .3;
  const strandCurve = (sx, bx, by) => new THREE.CatmullRomCurve3([   // brin passé sur le rail puis descendant vers la bélière
    new THREE.Vector3(sx, -.45, -.22), new THREE.Vector3(sx, .05, -.12), new THREE.Vector3(sx, .12, 0), new THREE.Vector3(sx, .05, .12),
    new THREE.Vector3(sx * .985, -1.2, ZF * .7), new THREE.Vector3(lerp(sx, bx, .5), by * .55, ZF), new THREE.Vector3(lerp(sx, bx, .86), by * .9, ZF), new THREE.Vector3(bx, by, ZF)], false, 'centripetal');
  const m4 = new THREE.Matrix4(), v3 = new THREE.Vector3(), up = new THREE.Vector3(0, 0, 1), side = new THREE.Vector3(1, 0, 0);
  function linksOn(curve, u0, u1, type, out) {
    const L = curve.getLength() * (u1 - u0), step = type === 'box' ? .098 : .4, n = Math.max(2, Math.floor(L / step)), sx = type === 'box' ? 1 : 1.45;
    for (let i = 0; i <= n; i++) {
      const u = u0 + (u1 - u0) * i / n, p = curve.getPointAt(u), t = curve.getTangentAt(u).normalize();
      let nrm = new THREE.Vector3().crossVectors(t, Math.abs(t.z) < .9 ? up : side).normalize(); if (i % 2) nrm = new THREE.Vector3().crossVectors(t, nrm).normalize();
      const b = new THREE.Vector3().crossVectors(t, nrm); m4.makeBasis(t, nrm, b).scale(v3.set(sx, 1, 1)).setPosition(p); out.push(m4.clone());
    }
  }
  function beadsOn(curve, u0, u1, outB, outS) {
    const L = curve.getLength() * (u1 - u0), n = Math.floor(L / .78);
    for (let i = 0; i <= n; i++) { const u = u0 + (u1 - u0) * i / n; outB.push(new THREE.Matrix4().setPosition(curve.getPointAt(u))); if (i < n) outS.push(new THREE.Matrix4().setPosition(curve.getPointAt(u + (u1 - u0) / n / 2))); }
  }
  const inst = (geo, mat, arr) => { const m = new THREE.InstancedMesh(geo, mat, arr.length); arr.forEach((x, i) => m.setMatrixAt(i, x)); m.instanceMatrix.needsUpdate = true; return m; };
  const capMat = (name, dark) => new THREE.MeshStandardMaterial({ map: tex(`n3d-${name}-front.webp`), metalness: 1, roughness: 1, metalnessMap: tex(`n3d-${name}-mr.webp`, false), roughnessMap: tex(`n3d-${name}-mr.webp`, false),
    normalMap: tex(`n3d-${name}-n.webp`, false), normalScale: new THREE.Vector2(dark ? 1.1 : .7, dark ? 1.1 : .7), alphaTest: .5, envMapIntensity: dark ? .85 : 1.1 });
  const pending = [];   // silhouettes en cours de calcul : la scène n'est « prête » qu'une fois toutes posées
  function slab(name, k, thick, dark) {
    const m = META[name], w = m.cw * k, h = m.ch * k, g = new THREE.Group(), cap = capMat(name, dark), edge = dark ? new THREE.MeshStandardMaterial({ color: 0x121314, roughness: .7, metalness: .1 }) : chrome2;
    pending.push(new Promise(done => { const img = new Image(); img.onerror = done; img.src = asset(`n3d-${name}-front.webp`);
      img.onload = () => {
        const shapes = contour(img, w, h); if (!shapes.length) return done();
        // bord : on retire la frange sombre du fond photo et on prolonge la couleur du métal jusqu'au biseau
        const A = document.createElement('canvas'); A.width = img.width; A.height = img.height; const ax = A.getContext('2d'); ax.drawImage(img, 0, 0);
        const id = ax.getImageData(0, 0, A.width, A.height); for (let i = 3; i < id.data.length; i += 4) if (id.data[i] < 235) id.data[i] = 0; ax.putImageData(id, 0, 0);
        const B = document.createElement('canvas'); B.width = A.width; B.height = A.height; const bx = B.getContext('2d'); bx.drawImage(A, 0, 0); bx.globalCompositeOperation = 'destination-over';
        for (let r = 1; r <= 6; r++) for (let a = 0; a < 8; a++) bx.drawImage(A, Math.round(Math.cos(a * Math.PI / 4) * r), Math.round(Math.sin(a * Math.PI / 4) * r));
        bx.fillStyle = dark ? '#151617' : '#a9aeb3'; bx.fillRect(0, 0, B.width, B.height);
        const ct = new THREE.CanvasTexture(B); ct.colorSpace = THREE.SRGBColorSpace; ct.anisotropy = aniso; cap.map = ct; cap.alphaTest = 0; cap.needsUpdate = true;
        const bev = Math.min(thick * .3, .05), geo = new THREE.ExtrudeGeometry(shapes, { depth: Math.max(.02, thick - bev * 2), bevelEnabled: true, bevelThickness: bev, bevelSize: Math.min(.016, w * .005), bevelSegments: 2, curveSegments: 1, steps: 1 });
        geo.translate(0, 0, -(thick - bev * 2) / 2);
        const ps = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < ps.count; i++) uv.setXY(i, ps.getX(i) / w + .5, 1 + ps.getY(i) / h);
        g.add(new THREE.Mesh(geo, [cap, edge])); done();
      }; }));
    g.userData = { w, h, bailX: m.bailX ?? .5 }; return g;
  }
  function lathePendant(name, k) {   // mezouza : pièce de révolution, profil lu sur la photo
    const m = META[name], w = m.cw * k, h = m.ch * k, cap = capMat(name, false), g = new THREE.Group();
    pending.push(new Promise(done => { const img = new Image(); img.onerror = done; img.src = asset(`n3d-${name}-front.webp`);
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data;
        const pts = [], RS = 40; for (let r = 0; r <= RS; r++) { const y = Math.min(c.height - 1, Math.round(r / RS * (c.height - 1))); let l = -1, rr = -1; for (let i = 0; i < c.width; i++) if (d[(y * c.width + i) * 4 + 3] > 120) { if (l < 0) l = i; rr = i; } pts.push(new THREE.Vector2(Math.max(.02, l < 0 ? 0 : (rr - l + 1) / 2 / c.width * w), -r / RS * h)); }
        for (const t of [cap.map, cap.normalMap, cap.metalnessMap]) { t.wrapS = THREE.MirroredRepeatWrapping; t.repeat.set(2, 1); t.offset.set(.5, 0); t.needsUpdate = true; }
        g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 64), cap)); done();
      }; }));
    g.userData = { w, h, bailX: .5 }; return g;
  }
  function necklace(rig) {
    const k = BOARD / rig.src, body = new THREE.Group(), by = -DROP, links = [], beadsM = [], spacersM = [];
    const curves = [-1, 1].map(s => strandCurve(s * SPREAD, s * .16, by));
    [rig.left, rig.right].forEach((cfg, si) => {
      const c = curves[si], b = cfg?.beads || 0;
      if (b) { linksOn(c, 0, .08, rig.chain, links); beadsOn(c, .1, b, beadsM, spacersM); linksOn(c, b + .01, 1, rig.chain, links); } else linksOn(c, 0, 1, rig.chain, links);
      if (cfg?.charm) { const ch = slab(cfg.charm, k, .1, false), pt = c.getPointAt(cfg.at); ch.position.set(pt.x + (si ? .1 : -.1), pt.y - .15, pt.z + .1); body.add(ch); }
    });
    body.add(inst(linkGeo[rig.chain], rig.chain === 'box' ? chrome : chrome2, links));
    if (beadsM.length) { body.add(inst(bead, beadMat, beadsM), inst(spacer, chrome, spacersM)); }
    const pend = rig.lathe ? lathePendant(rig.handle, k) : slab(rig.handle, k, rig.thick, rig.dark), ud = pend.userData;
    pend.position.set((.5 - ud.bailX) * ud.w, by + .05, ZF); body.add(pend);
    return { body, h: DROP + ud.h, center: by - ud.h * .5, w: 2 * SPREAD + 1 };
  }
  function photoCard(d) {   // repli sans gabarit 3D : photo officielle détourée, à plat
    const body = new THREE.Group(), out = { body, h: 18, center: -16, w: 6 };
    if (d.cutout) pending.push(new Promise(done => tl.load(d.cutout, t => { t.colorSpace = THREE.SRGBColorSpace; const k = 16.5 / 1000, w = t.image.width * k, h = t.image.height * k;
      const geo = new THREE.PlaneGeometry(w, h); geo.translate(0, -h / 2, 0); body.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: .03, depthWrite: false, toneMapped: false })));
      Object.assign(out, { h, center: -h * (d.fy || .9), w }); done(); }, undefined, done)));
    return out;
  }

  const cards = data.map((d, i) => {
    const g = new THREE.Group(), rig = RIG[d.handle]; scene.add(g);
    const n = rig ? necklace({ ...rig, handle: d.handle }) : photoCard(d); g.add(n.body);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(n.w, n.h + 1, 2), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = -n.h / 2; hit.userData.i = i; g.add(hit);
    return { g, n, hit, swing: 0, sv: 0 };
  });
  let ready = false; const whenReady = () => Promise.all(pending).then(() => { ready = true; root.classList.add('is-ready'); kick(); });
  mgr.onLoad = whenReady; setTimeout(() => { if (!ready) whenReady(); }, 9000);

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const pick = (cx, cy) => { const r = canvas.getBoundingClientRect(); ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, cam); const h = ray.intersectObjects(cards.map(c => c.hit), false)[0]; return h ? h.object.userData.i : -1; };

  /* geste : suivi direct, seuil 8 px, inertie temporelle plafonnée, retour amorti */
  const SPAN = () => (isMob() ? innerWidth * .55 : 300);
  stage.addEventListener('pointerdown', e => { if (e.button !== 0) return; drag = { x: e.clientX, y: e.clientY, p0: pos, moved: false, id: e.pointerId, hist: [[performance.now(), e.clientX]] }; });
  stage.addEventListener('pointermove', e => {
    if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved) { if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { drag = null; return; } if (Math.abs(dx) < 8) return; drag.moved = true; stage.setPointerCapture(drag.id); root.classList.add('is-drag'); }
    pos = drag.p0 - dx / SPAN(); target = pos; drag.hist.push([performance.now(), e.clientX]); if (drag.hist.length > 6) drag.hist.shift(); kick();
  });
  const end = (e, cancel) => {
    if (!drag) return; const d = drag; drag = null; root.classList.remove('is-drag');
    if (d.moved) { const [t0, x0] = d.hist[0], [t1, x1] = d.hist[d.hist.length - 1], dt = Math.max(16, t1 - t0);
      vel = clamp(-(x1 - x0) / SPAN() / (dt / 1000), -6, 6); target = clamp(Math.round(pos + vel * .22), Math.round(pos) - 2, Math.round(pos) + 2); kick(); return; }
    if (cancel) return; const i = pick(e.clientX, e.clientY); if (i < 0) return;
    if (i === sel && progress < .1) location.href = data[sel].url; else { target = Math.round(target) + wrapD(i - wrap(Math.round(target))); kick(); }
  };
  stage.addEventListener('pointerup', e => end(e, false)); stage.addEventListener('pointercancel', e => end(e, true));
  addEventListener('blur', () => { if (drag) { drag = null; target = Math.round(pos); kick(); } });

  /* défilement : état A → B */
  const onScroll = () => { const r = root.getBoundingClientRect(), span = root.offsetHeight - innerHeight; progress = span > 0 ? clamp(-r.top / span, 0, 1) : 0; kick(); };
  addEventListener('scroll', onScroll, { passive: true });

  let raf = 0, last = 0, visible = true, pShow = 0;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); }).observe(root);
  document.addEventListener('visibilitychange', () => { last = 0; if (!document.hidden) kick(); });
  function resize() { const w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); kick(); }
  addEventListener('resize', resize); resize();
  function kick() { if (!raf && renderer) raf = requestAnimationFrame(frame); }
  const pend = new THREE.Vector3();
  function frame(now) {
    raf = 0; const dt = last ? Math.min(.05, (now - last) / 1000) : 1 / 60; last = now; let busy = false;
    if (!drag) { const a = 80 * (target - pos) - 2 * Math.sqrt(80) * vel; vel += a * dt; pos += vel * dt; if (Math.abs(target - pos) < .0008 && Math.abs(vel) < .002) { pos = target; vel = 0; } else busy = true; } else busy = true;
    const r = wrap(Math.round(pos)); if (r !== sel) sync(r, false);
    if (!drag && pos === target && settledAt !== r) { settledAt = r; sync(r, true); }
    pShow = lerp(pShow, reduce ? 0 : progress, .14); if (Math.abs(pShow - progress) > .0005) busy = true;
    const B = ss(.05, .85, pShow), mob = isMob();
    cards.forEach((c, i) => {
      const d = wrapD(i - pos), a = d * (Math.PI * 2 / N), x = Math.sin(a) * R, z = Math.cos(a) * R, other = i !== sel;
      c.g.position.set(x, other ? B * B * 34 : 0, z);                                    // en détail, les autres pièces remontent hors champ
      c.g.rotation.y = Math.atan2(cam.position.x - x, cam.position.z - z);               // toujours face caméra : jamais sur la tranche
      c.sv += (-70 * c.swing - 9 * c.sv - vel * Math.cos(a) * .9) * dt; c.swing = clamp(c.swing + c.sv * dt, -.044, .044); if (Math.abs(c.sv) > .0005) busy = true;
      c.n.body.rotation.z = c.swing;
    });
    railMat.opacity = 1 - B * .9;
    const A = mob ? { p: [0, -5, 84], t: [0, -12, 0] } : { p: [0, -4.5, 62], t: [0, -11, 0] };
    pend.set(0, cards[sel].n.center, R);
    const Bp = mob ? [0, pend.y + 2, R + 20] : [2.5, pend.y + 2.5, R + 21], Bt = [mob ? 0 : -1.5, pend.y + 1.6, R];
    cam.position.set(lerp(A.p[0], Bp[0], B), lerp(A.p[1], Bp[1], B), lerp(A.p[2], Bp[2], B));
    cam.lookAt(lerp(A.t[0], Bt[0], B), lerp(A.t[1], Bt[1], B), lerp(A.t[2], Bt[2], B));
    spot.target.position.set(0, lerp(-12, pend.y, B), R); spot.intensity = 380 * (.7 + .3 * B);
    root.style.setProperty('--b', B.toFixed(3));
    renderer.render(scene, cam);
    if ((busy || drag) && visible && !document.hidden) raf = requestAnimationFrame(frame); else last = 0;
  }
  onScroll(); kick();
}
