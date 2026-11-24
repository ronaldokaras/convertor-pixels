window.PF = window.PF || {};

/* ---------- MEDIAN CUT ---------- */
PF.medianCut = function(pixels, n) {
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
};

PF.buildAutoPalette = function(data, n) {
  const seen = new Set(), pixels = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i+3] < 128) continue;
    const r = data[i], g = data[i+1], b = data[i+2];
    const k = (r << 16) | (g << 8) | b;
    if (!seen.has(k)) { seen.add(k); pixels.push([r,g,b]); }
  }
  return PF.medianCut(pixels, n);
};

/* ---------- QUANTIZAÇÃO ---------- */
PF.applyPalette = function(imageData, palette) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i+3] < 128) { d[i+3] = 0; continue; }
    const c = PF.nearestColor([d[i], d[i+1], d[i+2]], palette);
    d[i] = c[0]; d[i+1] = c[1]; d[i+2] = c[2]; d[i+3] = 255;
  }
};

PF.ditherImage = function(imageData, w, h, palette) {
  const d = imageData.data;
  const buf = new Float32Array(d.length);
  for (let i = 0; i < d.length; i++) buf[i] = d[i];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (buf[i+3] < 128) { buf[i+3] = 0; continue; }
      const oR = buf[i], oG = buf[i+1], oB = buf[i+2];
      const near = PF.nearestColor([oR, oG, oB], palette);
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
};

/* ---------- AJUSTES ---------- */
PF.applyAdjustments = function(imageData, brightness, contrast, saturation) {
  if (brightness === 0 && contrast === 0 && saturation === 0) return;
  const b = (brightness + 100) / 100;
  const c = (contrast + 100) / 100;
  const s = (saturation + 100) / 100;
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i+3] < 128) continue;
    let r = d[i] * b, g = d[i+1] * b, bl = d[i+2] * b;
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
};

/* ---------- 2D / CARTOON ---------- */
PF.makeTransparent = function(imageData, tolerance) {
  const d = imageData.data;
  const t2 = tolerance * tolerance * 3;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i+3] < 128) { d[i+3] = 0; continue; }
    const dr = 255 - d[i], dg = 255 - d[i+1], db = 255 - d[i+2];
    if (dr*dr + dg*dg + db*db < t2) d[i+3] = 0;
  }
};

PF.posterize = function(imageData, levels) {
  const d = imageData.data;
  const step = 255 / (levels - 1);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i+3] < 128) continue;
    d[i]   = Math.round(Math.round(d[i]   / step) * step);
    d[i+1] = Math.round(Math.round(d[i+1] / step) * step);
    d[i+2] = Math.round(Math.round(d[i+2] / step) * step);
  }
};

PF.applyOutlines = function(imageData, strength, thickness, colorRGB) {
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
};