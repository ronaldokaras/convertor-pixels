window.PF = window.PF || {};

PF.updateGrid = function(w, h, ds) {
  const $ = PF.$, state = PF.state;
  const grid = $('gridOverlay');
  const show = $('showGrid').checked && state.artCanvas;
  if (!show) { grid.style.display = 'none'; return; }
  grid.width = w * ds; grid.height = h * ds;
  grid.style.display = 'block';
  grid.style.width = grid.width + 'px';
  grid.style.height = grid.height + 'px';

  const ctx = grid.getContext('2d');
  ctx.clearRect(0, 0, grid.width, grid.height);
  ctx.strokeStyle = 'rgba(232, 221, 208, 0.18)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x++) {
    const px = x * ds + 0.5;
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, grid.height); ctx.stroke();
  }
  for (let y = 0; y <= h; y++) {
    const py = y * ds + 0.5;
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(grid.width, py); ctx.stroke();
  }
};

PF.updateStats = function(w, h, colors) {
  const $ = PF.$, state = PF.state;
  if (!state.artCanvas) { $('stats').textContent = ''; return; }
  if (w === undefined) { w = state.lastW; h = state.lastH; colors = state.lastColors || '—'; }
  $('stats').textContent = `${w} × ${h} px  ·  ${colors} cores`;
};

PF.showOriginal = function() {
  const $ = PF.$, state = PF.state;
  if (!state.image || !state.artCanvas) return;
  const out = $('output');
  const octx = out.getContext('2d');
  octx.imageSmoothingEnabled = false;
  octx.clearRect(0, 0, out.width, out.height);
  octx.drawImage(state.image, 0, 0, out.width, out.height);
  $('stats').textContent = 'original';
  $('gridOverlay').style.display = 'none';
};

PF.hideOriginal = function() {
  const $ = PF.$, state = PF.state;
  if (!state.artCanvas) return;
  const out = $('output');
  const octx = out.getContext('2d');
  octx.imageSmoothingEnabled = false;
  octx.clearRect(0, 0, out.width, out.height);
  octx.drawImage(state.artCanvas, 0, 0, out.width, out.height);
  PF.updateStats();
  PF.updateGrid(state.lastW, state.lastH, out.width / state.lastW);
};