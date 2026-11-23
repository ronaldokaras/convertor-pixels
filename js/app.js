(() => {
  'use strict';

  const MAX_INPUT_DIM = 2048;
  const STORAGE_KEY = 'pixel-forge-settings-v1';

  const PALETTES = {
    pico8: [
      [0,0,0],[29,43,83],[126,37,83],[0,135,81],[171,82,54],[95,87,79],[194,195,199],[255,241,232],
      [255,0,77],[255,163,0],[255,236,39],[0,228,54],[41,173,255],[131,118,156],[255,119,168],[255,204,170]
    ],
    gameboy: [[15,56,15],[48,98,48],[139,172,15],[155,188,15]],
    sweetie16: [
      [26,28,44],[93,39,93],[177,62,83],[239,125,87],[255,205,117],[167,240,112],[56,183,100],[37,113,121],
      [41,54,111],[59,93,201],[65,166,246],[115,239,247],[244,244,244],[148,176,194],[86,108,134],[51,60,87]
    ],
    endesga32: [
      [190,74,47],[215,118,67],[234,212,170],[228,166,114],[184,111,80],[115,62,57],[62,39,49],[162,38,51],
      [228,59,68],[247,118,34],[254,174,52],[254,231,97],[99,199,77],[62,137,72],[38,92,66],[25,60,62],
      [18,78,137],[0,153,219],[44,232,245],[255,255,255],[192,203,220],[139,155,180],[90,105,136],[58,68,102],
      [38,43,68],[24,20,37],[255,0,68],[104,56,108],[181,80,136],[246,117,122],[232,183,150],[194,133,105]
    ],
    db16: [
      [20,12,28],[68,36,52],[48,52,109],[78,74,78],[133,76,48],[52,101,36],[208,70,72],[117,113,97],
      [89,125,206],[210,125,44],[133,149,161],[109,170,44],[210,170,153],[109,194,202],[218,212,94],[222,238,214]
    ],
    db32: [
      [0,0,0],[34,32,52],[69,40,60],[102,57,49],[143,86,59],[223,113,38],[217,160,102],[238,195,154],
      [251,242,54],[153,229,80],[106,190,48],[55,148,110],[75,105,47],[82,75,36],[50,60,57],[63,63,116],
      [48,96,130],[91,110,225],[99,155,255],[95,205,228],[203,219,252],[255,255,255],[155,173,183],[132,126,135],
      [105,106,106],[89,86,82],[118,66,138],[172,50,50],[217,87,99],[215,123,186],[143,151,74],[138,111,48]
    ],
    apollo: [
      [23,19,28],[40,29,39],[60,40,52],[87,56,62],[118,76,70],[150,98,78],[183,124,86],[216,153,94],
      [244,184,106],[255,214,140],[255,236,184],[255,248,224],[230,220,188],[190,185,150],[140,140,110],[95,100,80],
      [60,70,60],[40,50,50],[30,40,45],[25,30,40],[40,50,70],[60,80,110],[90,120,160],[130,170,210],
      [170,210,240],[200,230,250],[220,240,255],[180,200,220],[140,160,180],[100,120,140],[70,90,110],[50,65,85]
    ],
    '1bit': [[0,0,0],[255,255,255]]
  };

  const PRESETS = {
    sprite:  { pixelSize: 6,  style: '2d',      outline: 40, dither: false, palette: 'auto',       colorCount: 12, transparentBg: false },
    icon:    { pixelSize: 4,  style: '2d',      outline: 55, dither: false, palette: 'sweetie16',  colorCount: 16, transparentBg: false },
    retro:   { pixelSize: 10, style: 'natural', outline: 30, dither: true,  palette: 'pico8',      colorCount: 16, transparentBg: false },
    gb:      { pixelSize: 8,  style: 'natural', outline: 30, dither: true,  palette: 'gameboy',    colorCount: 4,  transparentBg: false },
    cartoon: { pixelSize: 6,  style: 'cartoon', outline: 45, dither: false, palette: 'db32',       colorCount: 32, transparentBg: false }
  };

  const state = {
    image: null,
    filename: '',
    artCanvas: null,
    workCanvas: document.createElement('canvas'),
    lastW: 0,
    lastH: 0,
    lastColors: 0
  };

  const $ = id => document.getElementById(id);

  /* ==============================================
     SETTINGS (localStorage)
     ============================================== */
  function saveSettings() {
    const data = {
      pixelSize: $('pixelSize').value,
      resample: $('resample').value,
      style: $('style').value,
      outline: $('outline').value,
      outlineColor: $('outlineColor').value,
      brightness: $('brightness').value,
      contrast: $('contrast').value,
      saturation: $('saturation').value,
      palette: $('palette').value,
      colorCount: $('colorCount').value,
      dither: $('dither').checked,
      showGrid: $('showGrid').checked,
      scale: $('scale').value,
      transparentBg: $('transparentBg').checked
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.pixelSize) $('pixelSize').value = data.pixelSize;
      if (data.resample) $('resample').value = data.resample;
      if (data.style) $('style').value = data.style;
      if (data.outline) $('outline').value = data.outline;
      if (data.outlineColor) $('outlineColor').value = data.outlineColor;
      if (data.brightness) $('brightness').value = data.brightness;
      if (data.contrast) $('contrast').value = data.contrast;
      if (data.saturation) $('saturation').value = data.saturation;
      if (data.palette) $('palette').value = data.palette;
      if (data.colorCount) $('colorCount').value = data.colorCount;
      if (typeof data.dither === 'boolean') $('dither').checked = data.dither;
      if (typeof data.showGrid === 'boolean') $('showGrid').checked = data.showGrid;
      if (data.scale) $('scale').value = data.scale;
      if (typeof data.transparentBg === 'boolean') $('transparentBg').checked = data.transparentBg;
    } catch {}
  }

  /* ==============================================
     COR / PALETA
     ============================================== */
  function hexToRgb(hex) {
    const m = hex.replace('#','').match(/.{2}/g);
    return m ? m.map(h => parseInt(h, 16)) : [15, 12, 10];
  }

  function nearestColor(rgb, palette) {
    let best = palette[0], bestDist = Infinity;
    for (const c of palette) {
      const dr = rgb[0]-c[0], dg = rgb[1]-c[1], db = rgb[2]-c[2];
      const d = dr*dr + dg*dg + db*db;
      if (d < bestDist) { bestDist = d; best = c; }
    }
    return best;
  }

  function medianCut(pixels, n) {
    if (!pixels.length) return [[0,0,0]];
    if (pixels.length <= n) return pixels.slice();
    let work = pixels;
    if (work.length > 4000) {
      const step = Math.ceil(work.length / 4000);
      work = work.filter((_, i) => i % step === 0);
    }
    let boxes = [work];
    while (boxes.length < n) {
      let idx = -1, maxLen = 0;
      for (let i = 0; i < boxes.length; i++) {
        if (boxes[i].length > 1 && boxes[i].length > maxLen) { maxLen = boxes[i].length; idx = i; }
      }
      if (idx < 0) break;
      const box = boxes.splice(idx, 1)[0];
      const ranges = [0,1,2].map(c => {
        let mn = 255, mx = 0;
        for (const p of box) { if (p[c] < mn) mn = p[c]; if (p[c] > mx) mx = p[c]; }
        return mx - mn;
      });
      const ch = ranges.indexOf(Math.max(...ranges));
      box.sort((a,b) => a[ch] - b[ch]);
      const mid = Math.floor(box.length / 2);
      boxes.push(box.slice(0, mid), box.slice(mid));
    }
    return boxes.map(box => {
      let r = 0, g = 0, b = 0;
      for (const p of box) { r += p[0]; g += p[1]; b += p[2]; }
      const l = box.length;
      return [Math.round(r/l), Math.round(g/l), Math.round(b/l)];
    });
  }

  function buildAutoPalette(data, n) {
    const seen = new Set(), pixels = [];
    for (let i = 0; i < data.length; i += 4) {
      if (data[i+3] < 128) continue;
      const r = data[i], g = data[i+1], b = data[i+2];
      const k = (r << 16) | (g << 8) | b;
      if (!seen.has(k)) { seen.add(k); pixels.push([r,g,b]); }
    }
    return medianCut(pixels, n);
  }

  function applyPalette(imageData, palette) {
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i+3] < 128) { d[i+3] = 0; continue; }
      const c = nearestColor([d[i], d[i+1], d[i+2]], palette);
      d[i] = c[0]; d[i+1] = c[1]; d[i+2] = c[2]; d[i+3] = 255;
    }
  }

  function ditherImage(imageData, w, h, palette) {
    const d = imageData.data;
    const buf = new Float32Array(d.length);
    for (let i = 0; i < d.length; i++) buf[i] = d[i];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (buf[i+3] < 128) { buf[i+3] = 0; continue; }
        const oR = buf[i], oG = buf[i+1], oB = buf[i+2];
        const near = nearestColor([oR, oG, oB], palette);
        buf[i] = near[0]; buf[i+1] = near[1]; buf[i+2] = near[2]; buf[i+3] = 255;

        const eR = oR - near[0], eG = oG - near[1], eB = oB - near[2];
        const push = (dx, dy, f) => {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) return;
          const ni = (ny * w + nx) * 4;
          if (buf[ni+3] < 128) return;
          buf[ni] += eR * f; buf[ni+1] += eG * f; buf[ni+2] += eB * f;
        };
        push(1, 0, 7/16); push(-1, 1, 3/16); push(0, 1, 5/16); push(1, 1, 1/16);
      }
    }
    for (let i = 0; i < d.length; i++) d[i] = Math.max(0, Math.min(255, Math.round(buf[i])));
  }

  /* ==============================================
     AJUSTES / 2D / SOBEL
     ============================================== */
  function applyAdjustments(imageData, brightness, contrast, saturation) {
    if (brightness === 0 && contrast === 0 && saturation === 0) return;
    const b = (brightness + 100) / 100;
    const c = (contrast + 100) / 100;
    const s = (saturation + 100) / 100;
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i+3] < 128) continue;
      let r = d[i] * b;
      let g = d[i+1] * b;
      let bl = d[i+2] * b;
      r = (r - 128) * c + 128;
      g = (g - 128) * c + 128;
      bl = (bl - 128) * c + 128;
      const lum = 0.299*r + 0.587*g + 0.114*bl;
      r = lum + (r - lum) * s;
      g = lum + (g - lum) * s;
      bl = lum + (bl - lum) * s;
      d[i]   = Math.max(0, Math.min(255, r));
      d[i+1] = Math.max(0, Math.min(255, g));
      d[i+2] = Math.max(0, Math.min(255, bl));
    }
  }

  function makeTransparent(imageData, tolerance) {
    const d = imageData.data;
    const t2 = tolerance * tolerance * 3;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i+3] < 128) { d[i+3] = 0; continue; }
      const dr = 255 - d[i], dg = 255 - d[i+1], db = 255 - d[i+2];
      if (dr*dr + dg*dg + db*db < t2) d[i+3] = 0;
    }
  }

  function posterize(imageData, levels) {
    const d = imageData.data;
    const step = 255 / (levels - 1);
    for (let i = 0; i < d.length; i += 4) {
      if (d[i+3] < 128) continue;
      d[i]   = Math.round(Math.round(d[i]   / step) * step);
      d[i+1] = Math.round(Math.round(d[i+1] / step) * step);
      d[i+2] = Math.round(Math.round(d[i+2] / step) * step);
    }
  }

  function applyOutlines(imageData, strength, thickness, colorRGB) {
    thickness = thickness || 1;
    const w = imageData.width, h = imageData.height, d = imageData.data;

    const lum = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      if (d[i*4+3] < 128) { lum[i] = 0; continue; }
      lum[i] = 0.299*d[i*4] + 0.587*d[i*4+1] + 0.114*d[i*4+2];
    }

    const gx = [-1,0,1,-2,0,2,-1,0,1];
    const gy = [-1,-2,-1,0,0,0,1,2,1];
    const mags = new Float32Array(w * h);
    for (let y = 1; y < h-1; y++) {
      for (let x = 1; x < w-1; x++) {
        const i = y*w + x;
        if (d[i*4+3] < 128) continue;
        let sx = 0, sy = 0, k = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const rowOff = (y+dy)*w;
          for (let dx = -1; dx <= 1; dx++) {
            const l = lum[rowOff + x + dx];
            sx += l * gx[k];
            sy += l * gy[k];
            k++;
          }
        }
        mags[i] = Math.sqrt(sx*sx + sy*sy);
      }
    }

    const threshold = Math.max(80, 950 - strength * 7);
    const [cr, cg, cb] = colorRGB;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y*w + x;
        if (mags[idx] > threshold && d[idx*4+3] >= 128) {
          for (let dy = -thickness + 1; dy < thickness; dy++) {
            for (let dx = -thickness + 1; dx < thickness; dx++) {
              const nx = x + dx, ny = y + dy;
              if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
              const ni = (ny*w + nx) * 4;
              if (d[ni+3] < 128) continue;
              d[ni]   = cr;
              d[ni+1] = cg;
              d[ni+2] = cb;
              d[ni+3] = 255;
            }
          }
        }
      }
    }
  }

  /* ==============================================
     PIPELINE PRINCIPAL
     ============================================== */
  let scheduled = false;
  function scheduleProcess() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; process(); });
  }

  function process() {
    if (!state.image) return;

    document.body.classList.add('processing');

    const pixelSize = +$('pixelSize').value;
    const resample = $('resample').value;
    const style = $('style').value;
    const outlineStrength = +$('outline').value;
    const outlineRGB = hexToRgb($('outlineColor').value);
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

    applyAdjustments(imageData, brightness, contrast, saturation);
    if (transparentBg) makeTransparent(imageData, 32);
    if (style === 'cartoon') posterize(imageData, 4);

    let palette = paletteKey === 'auto'
      ? buildAutoPalette(imageData.data, colorCount)
      : PALETTES[paletteKey];
    if (!palette || !palette.length) palette = [[255,0,255]];

    if (dither) ditherImage(imageData, w, h, palette);
    else applyPalette(imageData, palette);

    if (style === '2d') {
      applyOutlines(imageData, outlineStrength, 1, outlineRGB);
    } else if (style === 'cartoon') {
      applyOutlines(imageData, outlineStrength, 2, outlineRGB);
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

    updateGrid(w, h, ds);

    out.style.display = 'block';
    $('emptyState').style.display = 'none';
    $('exportBtn').disabled = false;
    $('copyBtn').disabled = false;
    $('shareBtn').disabled = false;
    $('resetBtn').disabled = false;
    updateStats(w, h, palette.length);

    document.body.classList.remove('processing');
    saveSettings();
  }

  /* ==============================================
     RENDER
     ============================================== */
  function updateGrid(w, h, ds) {
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
  }

  function updateStats(w, h, colors) {
    if (!state.artCanvas) { $('stats').textContent = ''; return; }
    if (w === undefined) { w = state.lastW; h = state.lastH; colors = state.lastColors || '—'; }
    $('stats').textContent = `${w} × ${h} px  ·  ${colors} cores`;
  }

  function showOriginal() {
    if (!state.image || !state.artCanvas) return;
    const out = $('output');
    const octx = out.getContext('2d');
    octx.imageSmoothingEnabled = false;
    octx.clearRect(0, 0, out.width, out.height);
    octx.drawImage(state.image, 0, 0, out.width, out.height);
    $('stats').textContent = 'original';
    $('gridOverlay').style.display = 'none';
  }

  function hideOriginal() {
    if (!state.artCanvas) return;
    const out = $('output');
    const octx = out.getContext('2d');
    octx.imageSmoothingEnabled = false;
    octx.clearRect(0, 0, out.width, out.height);
    octx.drawImage(state.artCanvas, 0, 0, out.width, out.height);
    updateStats();
    updateGrid(state.lastW, state.lastH, out.width / state.lastW);
  }

  /* ==============================================
     CARREGAR ARQUIVO
     ============================================== */
  function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) { toast('Formato não suportado'); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let finalImg = img;
      if (img.width > MAX_INPUT_DIM || img.height > MAX_INPUT_DIM) {
        const scale = Math.min(MAX_INPUT_DIM / img.width, MAX_INPUT_DIM / img.height);
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
          process();
          toast(`Imagem reduzida para ${cw}×${ch}`);
        };
        finalImg.src = c.toDataURL();
        return;
      }
      state.image = img;
      state.filename = file.name;
      $('filename').textContent = file.name;
      URL.revokeObjectURL(url);
      process();
    };
    img.onerror = () => { toast('Não foi possível abrir a imagem'); URL.revokeObjectURL(url); };
    img.src = url;
  }

  /* ==============================================
     EXPORT / COPY / SHARE
     ============================================== */
  function getScaledBlob(callback) {
    if (!state.artCanvas) return;
    const scale = +$('scale').value;
    const w = state.artCanvas.width, h = state.artCanvas.height;
    const out = document.createElement('canvas');
    out.width = w * scale;
    out.height = h * scale;
    const ctx = out.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(state.artCanvas, 0, 0, out.width, out.height);
    out.toBlob(blob => callback(blob, w, h, scale), 'image/png');
  }

  function exportPNG() {
    getScaledBlob((blob, w, h, scale) => {
      const a = document.createElement('a');
      const base = (state.filename.replace(/\.[^.]+$/, '') || 'pixel-art');
      a.href = URL.createObjectURL(blob);
      a.download = `${base}_${w}x${h}@${scale}x.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
      toast('PNG exportado');
    });
  }

  async function copyPNG() {
    getScaledBlob(async (blob) => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        toast('Copiado pra área de transferência');
      } catch { toast('Seu navegador bloqueou a cópia'); }
    });
  }

  async function sharePNG() {
    getScaledBlob(async (blob, w, h, scale) => {
      const base = (state.filename.replace(/\.[^.]+$/, '') || 'pixel-art');
      const file = new File([blob], `${base}_${w}x${h}@${scale}x.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Pixel Forge', text: 'Pixel art gerada com Pixel Forge' });
          return;
        } catch (err) { if (err.name === 'AbortError') return; }
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = file.name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
      toast('Download iniciado');
    });
  }

  function reset() {
    state.image = null; state.filename = ''; state.artCanvas = null;
    state.lastW = 0; state.lastH = 0; state.lastColors = 0;
    $('filename').textContent = 'Nenhuma imagem carregada';
    $('stats').textContent = '';
    $('output').style.display = 'none';
    $('gridOverlay').style.display = 'none';
    $('emptyState').style.display = 'flex';
    $('exportBtn').disabled = true;
    $('copyBtn').disabled = true;
    $('shareBtn').disabled = true;
    $('resetBtn').disabled = true;
    $('fileInput').value = '';
  }

  /* ==============================================
     TOAST
     ============================================== */
  let toastTimer = null;
  function toast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2000);
  }

  /* ==============================================
     UI HELPERS
     ============================================== */
  function updateStyleUI() {
    const isNatural = $('style').value === 'natural';
    $('outlineControl').style.display = isNatural ? 'none' : '';
    $('ditherToggle').classList.toggle('disabled', !isNatural);
  }

  function applyPreset(name) {
    const p = PRESETS[name];
    if (!p) return;
    if ('pixelSize' in p) $('pixelSize').value = p.pixelSize;
    if ('style' in p) $('style').value = p.style;
    if ('outline' in p) $('outline').value = p.outline;
    if ('dither' in p) $('dither').checked = p.dither;
    if ('palette' in p) $('palette').value = p.palette;
    if ('colorCount' in p) $('colorCount').value = p.colorCount;
    if ('transparentBg' in p) $('transparentBg').checked = p.transparentBg;

    $('pixelSizeVal').textContent = $('pixelSize').value;
    $('outlineVal').textContent = $('outline').value;
    $('colorCountVal').textContent = $('colorCount').value;
    $('colorCountControl').style.display = $('palette').value === 'auto' ? '' : 'none';
    updateStyleUI();

    document.querySelectorAll('.preset').forEach(b => b.classList.toggle('active', b.dataset.preset === name));

    scheduleProcess();
    saveSettings();
    toast(`Preset: ${name}`);
  }

  /* ==============================================
     BIND / INICIALIZAÇÃO
     ============================================== */
  function bind() {
    loadSettings();

    $('pixelSizeVal').textContent = $('pixelSize').value;
    $('colorCountVal').textContent = $('colorCount').value;
    $('outlineVal').textContent = $('outline').value;
    $('scaleVal').textContent = $('scale').value + '×';
    $('brightnessVal').textContent = $('brightness').value;
    $('contrastVal').textContent = $('contrast').value;
    $('saturationVal').textContent = $('saturation').value;
    $('colorCountControl').style.display = $('palette').value === 'auto' ? '' : 'none';
    updateStyleUI();

    // Tooltips
    document.querySelectorAll('.info').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const was = el.classList.contains('active');
        document.querySelectorAll('.info').forEach(i => i.classList.remove('active'));
        if (!was) el.classList.add('active');
      });
    });
    document.addEventListener('click', () => {
      document.querySelectorAll('.info').forEach(i => i.classList.remove('active'));
    });

    // Upload
    $('uploadBtn').addEventListener('click', () => $('fileInput').click());
    $('emptyState').addEventListener('click', () => $('fileInput').click());
    $('fileInput').addEventListener('change', e => {
      if (e.target.files[0]) loadFile(e.target.files[0]);
    });

    // Presets
    document.querySelectorAll('.preset').forEach(b => {
      b.addEventListener('click', () => {
        applyPreset(b.dataset.preset);
        b.blur();
      });
    });

    // Sliders
    const bindRange = (id, valId, fmt, cb) => {
      const el = $(id);
      el.addEventListener('input', () => {
        $(valId).textContent = fmt(el.value);
        cb && cb();
        saveSettings();
      });
    };
    bindRange('pixelSize', 'pixelSizeVal', v => v, scheduleProcess);
    bindRange('colorCount', 'colorCountVal', v => v, scheduleProcess);
    bindRange('outline', 'outlineVal', v => v, scheduleProcess);
    bindRange('scale', 'scaleVal', v => v + '×');
    bindRange('brightness', 'brightnessVal', v => v, scheduleProcess);
    bindRange('contrast', 'contrastVal', v => v, scheduleProcess);
    bindRange('saturation', 'saturationVal', v => v, scheduleProcess);

    $('outlineColor').addEventListener('input', () => { scheduleProcess(); saveSettings(); });

    // Selects / toggles
    $('style').addEventListener('change', () => { updateStyleUI(); scheduleProcess(); saveSettings(); });
    $('resample').addEventListener('change', () => { scheduleProcess(); saveSettings(); });
    $('palette').addEventListener('change', () => {
      $('colorCountControl').style.display = $('palette').value === 'auto' ? '' : 'none';
      scheduleProcess(); saveSettings();
    });
    $('dither').addEventListener('change', () => { scheduleProcess(); saveSettings(); });
    $('showGrid').addEventListener('change', () => {
      if (state.artCanvas) {
        const ds = $('output').width / state.lastW;
        updateGrid(state.lastW, state.lastH, ds);
      }
      saveSettings();
    });
    $('transparentBg').addEventListener('change', () => { scheduleProcess(); saveSettings(); });

    // Botões
    $('exportBtn').addEventListener('click', exportPNG);
    $('copyBtn').addEventListener('click', copyPNG);
    $('shareBtn').addEventListener('click', sharePNG);
    $('resetBtn').addEventListener('click', reset);

    // Drag & drop
    const area = $('canvasArea');
    ['dragenter','dragover'].forEach(ev =>
      area.addEventListener(ev, e => { e.preventDefault(); area.classList.add('drag-over'); })
    );
    ['dragleave','drop'].forEach(ev =>
      area.addEventListener(ev, e => { e.preventDefault(); area.classList.remove('drag-over'); })
    );
    area.addEventListener('drop', e => {
      const file = e.dataTransfer.files[0];
      if (file) loadFile(file);
    });

    // Atalhos
    let comparing = false;
    const formTags = ['INPUT','SELECT','BUTTON','TEXTAREA','A'];
    document.addEventListener('keydown', e => {
      const inForm = formTags.includes(e.target.tagName);

      if (e.code === 'Space' && state.image && !comparing && !inForm) {
        e.preventDefault(); comparing = true; showOriginal(); return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault(); if (state.artCanvas) exportPNG(); return;
      }
      if (!inForm && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === 'r' || e.key === 'R') {
          if (state.artCanvas) { e.preventDefault(); reset(); }
        } else if (e.key === 'e' || e.key === 'E') {
          if (state.artCanvas) { e.preventDefault(); exportPNG(); }
        }
      }
    });
    document.addEventListener('keyup', e => {
      if (e.code === 'Space' && comparing) { e.preventDefault(); comparing = false; hideOriginal(); }
    });
  }

  bind();
})();