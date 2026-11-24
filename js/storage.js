window.PF = window.PF || {};

PF.saveSettings = function() {
  const $ = PF.$;
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
  try { localStorage.setItem(PF.STORAGE_KEY, JSON.stringify(data)); } catch {}
};

PF.loadSettings = function() {
  try {
    const raw = localStorage.getItem(PF.STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    const $ = PF.$;
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
};