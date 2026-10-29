/* Silhouettes pendentifs DÉMO (vectorielles) + palettes métal. À remplacer par les vraies photos produit (item.image). */
window.BG = window.BG || {};
(function (BG) {
  function star() {
    var p = [];
    for (var i = 0; i < 12; i++) {
      var r = i % 2 ? 27.1 : 47, a = -Math.PI / 2 + i * Math.PI / 6;
      p.push((50 + r * Math.cos(a)).toFixed(1) + ' ' + (52 + r * Math.sin(a)).toFixed(1));
    }
    return 'M' + p.join('L') + 'ZM50 40A12 12 0 1 0 50.01 40Z';
  }
  BG.shapes = {
    maguen: star(),
    fire: 'M50 4C58 24 82 34 82 62C82 84 68 98 50 98C32 98 18 84 18 64C18 50 26 42 32 34C34 44 40 48 44 46C40 30 44 16 50 4Z',
    fire2: 'M50 4C58 24 82 34 82 62C82 84 68 98 50 98C32 98 18 84 18 64C18 50 26 42 32 34C34 44 40 48 44 46C40 30 44 16 50 4ZM50 50C56 62 64 68 64 78C64 88 58 92 50 92C42 92 36 88 36 80C36 70 46 62 50 50Z',
    petek: 'M22 8H78Q84 8 84 14V86Q84 92 78 92H22Q16 92 16 86V14Q16 8 22 8ZM28 20V80H72V20Z',
    disc: 'M50 10A40 40 0 1 0 50.01 10ZM50 24A26 26 0 1 1 49.99 24Z',
    bar: 'M32 6H68Q72 6 72 10V90Q72 94 68 94H32Q28 94 28 90V10Q28 6 32 6Z'
  };
  BG.palette = {
    chrome: ['#f6f8f7', '#8f9a95', '#dfe5e2', '#4a514e'],
    noir: ['#6a706e', '#1a1d1c', '#3d4240', '#0b0c0c'],
    vert: ['#d2ffe3', '#35c776', '#0f6b3c', '#86ffb4']
  };
  var cache = {};
  function path(s) { return cache[s] || (cache[s] = new Path2D(BG.shapes[s] || BG.shapes.disc)); }
  function stops(g, c) { var p = BG.palette[c] || BG.palette.chrome; [0, .38, .62, 1].forEach(function (o, i) { g.addColorStop(o, p[i]); }); }

  /* Dessine centré sur (0,0), taille `size` px. */
  BG.drawPendant = function (ctx, shape, color, size) {
    ctx.save();
    ctx.translate(-size / 2, -size / 2);
    ctx.scale(size / 100, size / 100);
    var g = ctx.createLinearGradient(10, 0, 90, 100);
    stops(g, color);
    ctx.fillStyle = g;
    ctx.shadowColor = 'rgba(0,0,0,.55)';
    ctx.shadowBlur = 10; ctx.shadowOffsetY = 5;
    ctx.fill(path(shape), 'evenodd');
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.stroke(path(shape));
    ctx.restore();
  };

  BG.pendantSVG = function (shape, color, opts) {
    opts = opts || {};
    var p = BG.palette[color] || BG.palette.chrome, id = 'g' + Math.random().toString(36).slice(2, 7);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 130" width="100%" height="100%">' +
      '<defs><linearGradient id="' + id + '" x1=".1" y1="0" x2=".9" y2="1">' +
      '<stop offset="0" stop-color="' + p[0] + '"/><stop offset=".38" stop-color="' + p[1] + '"/><stop offset=".62" stop-color="' + p[2] + '"/><stop offset="1" stop-color="' + p[3] + '"/></linearGradient>' +
      '<radialGradient id="' + id + 'b" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#1b2a23"/><stop offset="1" stop-color="#070a09"/></radialGradient></defs>' +
      '<rect width="100" height="130" fill="url(#' + id + 'b)"/>' +
      '<path d="M18 0Q50 70 82 0" fill="none" stroke="#aeb8b3" stroke-width="1.4" stroke-dasharray="2.2 1.4"/>' +
      '<g transform="translate(25 36) scale(.5)"><path d="' + BG.shapes[shape] + '" fill-rule="evenodd" fill="url(#' + id + ')" stroke="rgba(255,255,255,.4)" stroke-width="1.5"/></g>' +
      (opts.label === false ? '' : '<text x="50" y="124" text-anchor="middle" font-size="5" fill="#6f7b75" font-family="sans-serif" letter-spacing=".6">SILHOUETTE DÉMO</text>') +
      '</svg>';
  };
  BG.pendantURI = function (shape, color, opts) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(BG.pendantSVG(shape, color, opts));
  };
})(window.BG);
