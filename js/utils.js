window.PF = window.PF || {};

PF.$ = id => document.getElementById(id);

PF.hexToRgb = function(hex) {
  const m = hex.replace('#','').match(/.{2}/g);
  return m ? m.map(h => parseInt(h, 16)) : [15, 12, 10];
};

PF.nearestColor = function(rgb, palette) {
  let best = palette[0], bestDist = Infinity;
  for (const c of palette) {
    const dr = rgb[0]-c[0], dg = rgb[1]-c[1], db = rgb[2]-c[2];
    const d = dr*dr + dg*dg + db*db;
    if (d < bestDist) { bestDist = d; best = c; }
  }
  return best;
};

PF.toast = (() => {
  let timer = null;
  return function(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(() => t.classList.remove('show'), 2000);
  };
})();