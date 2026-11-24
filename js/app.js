window.PF = window.PF || {};

PF.updateStyleUI = function() {
  const $ = PF.$;
  const isNatural = $('style').value === 'natural';
  $('outlineControl').style.display = isNatural ? 'none' : '';
  $('ditherToggle').classList.toggle('disabled', !isNatural);
};

PF.applyPreset = function(name) {
  const p = PF.PRESETS[name];
  if (!p) return;
  const $ = PF.$;
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
  PF.updateStyleUI();

  document.querySelectorAll('.preset').forEach(b => b.classList.toggle('active', b.dataset.preset === name));

  PF.scheduleProcess();
  PF.saveSettings();
  PF.toast(`Preset: ${name}`);
};

PF.reset = function() {
  const $ = PF.$, state = PF.state;
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
};

PF.bind = function() {
  const $ = PF.$;

  PF.loadSettings();

  $('pixelSizeVal').textContent = $('pixelSize').value;
  $('colorCountVal').textContent = $('colorCount').value;
  $('outlineVal').textContent = $('outline').value;
  $('scaleVal').textContent = $('scale').value + '×';
  $('brightnessVal').textContent = $('brightness').value;
  $('contrastVal').textContent = $('contrast').value;
  $('saturationVal').textContent = $('saturation').value;
  $('colorCountControl').style.display = $('palette').value === 'auto' ? '' : 'none';
  PF.updateStyleUI();

  /* Tooltips */
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

  /* Upload */
  $('uploadBtn').addEventListener('click', () => $('fileInput').click());
  $('emptyState').addEventListener('click', () => $('fileInput').click());
  $('fileInput').addEventListener('change', e => {
    if (e.target.files[0]) PF.loadFile(e.target.files[0]);
  });

  /* Presets */
  document.querySelectorAll('.preset').forEach(b => {
    b.addEventListener('click', () => {
      PF.applyPreset(b.dataset.preset);
      b.blur();
    });
  });

  /* Sliders */
  const bindRange = (id, valId, fmt, cb) => {
    const el = $(id);
    el.addEventListener('input', () => {
      $(valId).textContent = fmt(el.value);
      cb && cb();
      PF.saveSettings();
    });
  };
  bindRange('pixelSize', 'pixelSizeVal', v => v, PF.scheduleProcess);
  bindRange('colorCount', 'colorCountVal', v => v, PF.scheduleProcess);
  bindRange('outline', 'outlineVal', v => v, PF.scheduleProcess);
  bindRange('scale', 'scaleVal', v => v + '×');
  bindRange('brightness', 'brightnessVal', v => v, PF.scheduleProcess);
  bindRange('contrast', 'contrastVal', v => v, PF.scheduleProcess);
  bindRange('saturation', 'saturationVal', v => v, PF.scheduleProcess);

  $('outlineColor').addEventListener('input', () => { PF.scheduleProcess(); PF.saveSettings(); });

  /* Selects / toggles */
  $('style').addEventListener('change', () => { PF.updateStyleUI(); PF.scheduleProcess(); PF.saveSettings(); });
  $('resample').addEventListener('change', () => { PF.scheduleProcess(); PF.saveSettings(); });
  $('palette').addEventListener('change', () => {
    $('colorCountControl').style.display = $('palette').value === 'auto' ? '' : 'none';
    PF.scheduleProcess(); PF.saveSettings();
  });
  $('dither').addEventListener('change', () => { PF.scheduleProcess(); PF.saveSettings(); });
  $('showGrid').addEventListener('change', () => {
    if (PF.state.artCanvas) {
      const ds = $('output').width / PF.state.lastW;
      PF.updateGrid(PF.state.lastW, PF.state.lastH, ds);
    }
    PF.saveSettings();
  });
  $('transparentBg').addEventListener('change', () => { PF.scheduleProcess(); PF.saveSettings(); });

  /* Botões */
  $('exportBtn').addEventListener('click', PF.exportPNG);
  $('copyBtn').addEventListener('click', PF.copyPNG);
  $('shareBtn').addEventListener('click', PF.sharePNG);
  $('resetBtn').addEventListener('click', PF.reset);

  /* Drag & drop */
  const area = $('canvasArea');
  ['dragenter','dragover'].forEach(ev =>
    area.addEventListener(ev, e => { e.preventDefault(); area.classList.add('drag-over'); })
  );
  ['dragleave','drop'].forEach(ev =>
    area.addEventListener(ev, e => { e.preventDefault(); area.classList.remove('drag-over'); })
  );
  area.addEventListener('drop', e => {
    const file = e.dataTransfer.files[0];
    if (file) PF.loadFile(file);
  });

  /* Atalhos */
  let comparing = false;
  const formTags = ['INPUT','SELECT','BUTTON','TEXTAREA','A'];
  document.addEventListener('keydown', e => {
    const inForm = formTags.includes(e.target.tagName);

    if (e.code === 'Space' && PF.state.image && !comparing && !inForm) {
      e.preventDefault(); comparing = true; PF.showOriginal(); return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault(); if (PF.state.artCanvas) PF.exportPNG(); return;
    }
    if (!inForm && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (e.key === 'r' || e.key === 'R') {
        if (PF.state.artCanvas) { e.preventDefault(); PF.reset(); }
      } else if (e.key === 'e' || e.key === 'E') {
        if (PF.state.artCanvas) { e.preventDefault(); PF.exportPNG(); }
      }
    }
  });
  document.addEventListener('keyup', e => {
    if (e.code === 'Space' && comparing) { e.preventDefault(); comparing = false; PF.hideOriginal(); }
  });
};

/* Bootstrap */
PF.bind();