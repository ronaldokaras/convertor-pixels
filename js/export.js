window.PF = window.PF || {};

PF.getScaledBlob = function(callback) {
  const $ = PF.$, state = PF.state;
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
};

PF.exportPNG = function() {
  const state = PF.state;
  PF.getScaledBlob((blob, w, h, scale) => {
    const a = document.createElement('a');
    const base = (state.filename.replace(/\.[^.]+$/, '') || 'pixel-art');
    a.href = URL.createObjectURL(blob);
    a.download = `${base}_${w}x${h}@${scale}x.png`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    PF.toast('PNG exportado');
  });
};

PF.copyPNG = function() {
  PF.getScaledBlob(async (blob) => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      PF.toast('Copiado pra área de transferência');
    } catch { PF.toast('Seu navegador bloqueou a cópia'); }
  });
};

PF.sharePNG = function() {
  const state = PF.state;
  PF.getScaledBlob(async (blob, w, h, scale) => {
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
    PF.toast('Download iniciado');
  });
};