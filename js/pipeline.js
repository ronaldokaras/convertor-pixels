window.PF = window.PF || {};

let scheduled = false;

PF.scheduleProcess = function() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => { scheduled = false; PF.process(); });
};

PF.process = function() {
  const $ = PF.$, state = PF.state;
  if (!state.image) return;

  document.body.classList.add('processing');

  const pixelSize = +$('pixelSize').value;
  const resample = $('resample').value;
  const style = $('style').value;
  const outlineStrength = +$('outline').value;
  const outlineRGB = PF.hexToRgb($('outlineColor').value);
  const paletteKey = $('palette').value;
  const colorCount = +$('colorCount').value;
  const dither = $('dither').checked && style === 'natural';
  const brightness = +$('brightness').value;
  const contrast = +$('contrast').value;
  const saturation = +$('saturation').value;
  const transparentBg = $('transparentBg').checked;

  const img = state.image;
  const w = Math.max(1, Math.floor(img.width / pixelSize));
  const h = Math.max(1, Math.floor(img.height / pixelSize));

  const small = state.workCanvas;
  small.width = w;
  small.height = h;
  const sctx = small.getContext('2d', { willReadFrequently: true });
  sctx.imageSmoothingEnabled = resample !== 'nearest';
  sctx.imageSmoothingQuality = 'high';
  sctx.clearRect(0, 0, w, h);
  sctx.drawImage(img, 0, 0, w, h);

  const imageData = sctx.getImageData(0, 0, w, h);

  PF.applyAdjustments(imageData, brightness, contrast, saturation);
  if (transparentBg) PF.makeTransparent(imageData, 32);
  if (style === 'cartoon') PF.posterize(imageData, 4);

  let palette = paletteKey === 'auto'
    ? PF.buildAutoPalette(imageData.data, colorCount)
    : PF.PALETTES[paletteKey];
  if (!palette || !palette.length) palette = [[255,0,255]];

  if (dither) PF.ditherImage(imageData, w, h, palette);
  else PF.applyPalette(imageData, palette);

  if (style === '2d') {
    PF.applyOutlines(imageData, outlineStrength, 1, outlineRGB);
  } else if (style === 'cartoon') {
    PF.applyOutlines(imageData, outlineStrength, 2, outlineRGB);
  }

  sctx.putImageData(imageData, 0, 0);

  state.artCanvas = small;
  state.lastW = w;
  state.lastH = h;
  state.lastColors = palette.length;

  const maxDim = 720;
  let ds = Math.min(Math.floor(maxDim / w), Math.floor(maxDim / h));
  ds = Math.max(1, Math.min(ds, 16));

  const out = $('output');
  out.width = w * ds;
  out.height = h * ds;
  const octx = out.getContext('2d');
  octx.imageSmoothingEnabled = false;
  octx.clearRect(0, 0, out.width, out.height);
  octx.drawImage(small, 0, 0, out.width, out.height);

  PF.updateGrid(w, h, ds);

  out.style.display = 'block';
  $('emptyState').style.display = 'none';
  $('exportBtn').disabled = false;
  $('copyBtn').disabled = false;
  $('shareBtn').disabled = false;
  $('resetBtn').disabled = false;
  PF.updateStats(w, h, palette.length);

  document.body.classList.remove('processing');
  PF.saveSettings();
};

PF.loadFile = function(file) {
  const $ = PF.$, state = PF.state;
  if (!file || !file.type.startsWith('image/')) { PF.toast('Formato não suportado'); return; }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    let finalImg = img;
    if (img.width > PF.MAX_INPUT_DIM || img.height > PF.MAX_INPUT_DIM) {
      const scale = Math.min(PF.MAX_INPUT_DIM / img.width, PF.MAX_INPUT_DIM / img.height);
      const cw = Math.floor(img.width * scale);
      const ch = Math.floor(img.height * scale);
      const c = document.createElement('canvas');
      c.width = cw; c.height = ch;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, cw, ch);
      finalImg = new Image();
      finalImg.onload = () => {
        state.image = finalImg;
        state.filename = file.name;
        $('filename').textContent = file.name + ' (reduzida)';
        URL.revokeObjectURL(url);
        PF.process();
        PF.toast(`Imagem reduzida para ${cw}×${ch}`);
      };
      finalImg.src = c.toDataURL();
      return;
    }
    state.image = img;
    state.filename = file.name;
    $('filename').textContent = file.name;
    URL.revokeObjectURL(url);
    PF.process();
  };
  img.onerror = () => { PF.toast('Não foi possível abrir a imagem'); URL.revokeObjectURL(url); };
  img.src = url;
};