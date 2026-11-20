// Vice Coast cover studio (round 3): wires the editor — photo uploads,
// panel picking, drag-to-pan and scroll-to-zoom on the preview, caption and
// grade controls, undo/redo, and PNG export in four sizes including the
// 1080x1920 story size. A `?shot=` query instead sets up a fixed scene for
// a screenshot (./shots.js). A `?selftest=1` query runs an in-page check
// (every layout renders, every export size draws, undo/redo round-trips)
// and reports the result in document.body.dataset.selftest for headless
// verification — no network, no extra tooling.
import { drawCover, panelRectsPx, LAYOUTS } from './cover.js';
import { runShot } from './shots.js';
import {
  createCoverState, panelCount, clampSlot, assignPhoto, dealPhotos,
  shufflePanels, parseSize, createHistory, historyPush, historyUndo,
  historyRedo, snapshotState,
} from './state.js';

const state = createCoverState();
const history = createHistory(state);
const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const $ = (id) => document.getElementById(id);

// Preview canvas always renders at the chosen export size, so what you see
// is exactly what the PNG will be; CSS scales it down to fit the page.
function syncCanvasSize() {
  const { width, height } = parseSize(state.size);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function redraw() {
  syncCanvasSize();
  drawCover(canvas, state);
  syncPanelControls();
  syncUndoButtons();
}

function syncUndoButtons() {
  $('undoBtn').disabled = history.past.length === 0;
  $('redoBtn').disabled = history.future.length === 0;
  $('undoBtn').textContent = `Undo${history.past.length ? ` (${history.past.length})` : ''}`;
  $('redoBtn').textContent = `Redo${history.future.length ? ` (${history.future.length})` : ''}`;
}

// --- panel selection -------------------------------------------------------

function syncPanelControls() {
  const count = panelCount(state.layout);
  if (state.selected >= count) state.selected = 0;
  const slot = state.panels[state.selected];
  $('panelLabel').textContent =
    `Panel ${state.selected + 1} of ${count} · click any panel in the preview to select it.`;
  const photoSel = $('panelPhoto');
  photoSel.innerHTML = '';
  state.photos.forEach((img, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `Photo ${i + 1}${img.dataset?.name ? ` · ${img.dataset.name}` : ''}`;
    photoSel.appendChild(opt);
  });
  if (!state.photos.length) {
    const opt = document.createElement('option');
    opt.textContent = 'No photo yet — add one above';
    photoSel.appendChild(opt);
  }
  photoSel.value = String(slot.photo);
  $('zoom').value = String(slot.zoom);
  $('zoomVal').textContent = `${slot.zoom}%`;
  $('panX').value = String(slot.x);
  $('panY').value = String(slot.y);
  $('titleSizeVal').textContent = `${state.titleSize}%`;
  const layoutSel = $('layout');
  if (layoutSel.value !== state.layout) layoutSel.value = state.layout;
  const sizeSel = $('size');
  if (sizeSel.value !== state.size) sizeSel.value = state.size;
  const titlePosSel = $('titlePos');
  if (titlePosSel.value !== state.titlePos) titlePosSel.value = state.titlePos;
  const captionEl = $('caption');
  if (captionEl.value !== state.title) captionEl.value = state.title;
  const subtitleEl = $('subtitle');
  if (subtitleEl.value !== state.subtitle) subtitleEl.value = state.subtitle;
  $('titleSize').value = String(state.titleSize);
  $('grain').checked = state.grain;
  $('artwork').checked = state.artwork;
  $('poster').checked = state.poster !== false;
  document.querySelectorAll('#gradeRow .chip').forEach((c) => {
    c.classList.toggle('active', c.dataset.grade === state.grade);
  });
  document.querySelectorAll('#styleRow .chip').forEach((c) => {
    c.classList.toggle('active', c.dataset.style === state.titleStyle);
  });
}

function selectPanel(i) {
  state.selected = i;
  syncPanelControls();
  redraw();
}

// Hit-test a point (in canvas pixels) against the panel rectangles.
function panelAt(cx, cy) {
  const rects = panelRectsPx(canvas, state);
  for (let i = rects.length - 1; i >= 0; i -= 1) {
    const r = rects[i];
    if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) return i;
  }
  return -1;
}

function canvasPoint(event) {
  const box = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - box.left) / box.width) * canvas.width,
    y: ((event.clientY - box.top) / box.height) * canvas.height,
  };
}

// Drag pans the photo inside its panel; the wheel zooms it.
let dragging = null;
canvas.addEventListener('pointerdown', (event) => {
  const p = canvasPoint(event);
  const i = panelAt(p.x, p.y);
  if (i < 0) return;
  selectPanel(i);
  dragging = { x: p.x, y: p.y, moved: false };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  const p = canvasPoint(event);
  const slot = state.panels[state.selected];
  const rect = panelRectsPx(canvas, state)[state.selected];
  slot.x = Math.min(50, Math.max(-50, slot.x + ((p.x - dragging.x) / rect.w) * 70));
  slot.y = Math.min(50, Math.max(-50, slot.y + ((p.y - dragging.y) / rect.h) * 70));
  if (Math.abs(p.x - dragging.x) + Math.abs(p.y - dragging.y) > 4) dragging.moved = true;
  dragging.x = p.x;
  dragging.y = p.y;
  clampSlot(slot);
  redraw();
});
canvas.addEventListener('pointerup', () => {
  if (dragging?.moved) historyPush(history, state);
  dragging = null;
});
canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  const p = canvasPoint(event);
  const i = panelAt(p.x, p.y);
  if (i < 0) return;
  selectPanel(i);
  const slot = state.panels[state.selected];
  slot.zoom = Math.min(260, Math.max(100, slot.zoom - Math.sign(event.deltaY) * 12));
  clampSlot(slot);
  historyPush(history, state);
  redraw();
}, { passive: false });

// --- undo / redo -----------------------------------------------------------

function doUndo() {
  if (historyUndo(history, state)) {
    redraw();
    status.textContent = 'Undid that change.';
  }
}
function doRedo() {
  if (historyRedo(history, state)) {
    redraw();
    status.textContent = 'Redid that change.';
  }
}
$('undoBtn').addEventListener('click', doUndo);
$('redoBtn').addEventListener('click', doRedo);
document.addEventListener('keydown', (event) => {
  const mod = event.ctrlKey || event.metaKey;
  if (!mod) return;
  if (event.key.toLowerCase() === 'z' && !event.shiftKey) {
    event.preventDefault();
    doUndo();
  } else if (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey)) {
    event.preventDefault();
    doRedo();
  }
});

// --- photo loading ---------------------------------------------------------

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function refreshTray() {
  const tray = $('photoTray');
  tray.innerHTML = '';
  state.photos.forEach((img, i) => {
    const thumb = document.createElement('img');
    thumb.src = img.src;
    thumb.alt = `Photo ${i + 1}`;
    thumb.title = `Photo ${i + 1} — click to put it in the selected panel`;
    thumb.addEventListener('click', () => {
      assignPhoto(state, state.selected, i);
      historyPush(history, state);
      redraw();
    });
    tray.appendChild(thumb);
  });
  syncPanelControls();
}

async function addPhotoFiles(files) {
  const list = [...files].filter((f) => f.type.startsWith('image/')).slice(0, 4 - state.photos.length);
  for (const file of list) {
    const img = await loadImage(URL.createObjectURL(file));
    img.dataset.name = file.name;
    state.photos.push(img);
  }
  if (state.photos.length) dealPhotos(state);
  historyPush(history, state);
  refreshTray();
  redraw();
  status.textContent = state.photos.length
    ? `${state.photos.length} photo${state.photos.length > 1 ? 's' : ''} loaded — pick a layout, then Export PNG.`
    : 'No photos yet.';
}

$('photos').addEventListener('change', (e) => addPhotoFiles(e.target.files));

$('sampleBtn').addEventListener('click', async () => {
  state.photos = [];
  for (const name of ['boulevard', 'pier']) {
    const img = await loadImage(`samples/${name}.jpg`);
    img.dataset.name = `${name}.jpg`;
    state.photos.push(img);
  }
  dealPhotos(state);
  historyPush(history, state);
  refreshTray();
  redraw();
  status.textContent = 'Sample photos loaded — try a layout, then Export PNG.';
});

$('shuffleBtn').addEventListener('click', () => {
  shufflePanels(state);
  historyPush(history, state);
  redraw();
  status.textContent = 'Panels shuffled.';
});

// --- controls --------------------------------------------------------------

$('layout').addEventListener('change', (e) => {
  state.layout = e.target.value;
  historyPush(history, state);
  redraw();
});

$('gradeRow').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-grade]');
  if (!btn) return;
  state.grade = btn.dataset.grade;
  historyPush(history, state);
  document.querySelectorAll('#gradeRow .chip').forEach((c) => c.classList.toggle('active', c === btn));
  redraw();
});

$('styleRow').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-style]');
  if (!btn) return;
  state.titleStyle = btn.dataset.style;
  historyPush(history, state);
  document.querySelectorAll('#styleRow .chip').forEach((c) => c.classList.toggle('active', c === btn));
  redraw();
});

$('grain').addEventListener('change', (e) => { state.grain = e.target.checked; historyPush(history, state); redraw(); });
$('artwork').addEventListener('change', (e) => { state.artwork = e.target.checked; historyPush(history, state); redraw(); });
$('poster').addEventListener('change', (e) => { state.poster = e.target.checked; historyPush(history, state); redraw(); });
$('caption').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('caption').addEventListener('change', () => historyPush(history, state));
$('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
$('subtitle').addEventListener('change', () => historyPush(history, state));
$('titlePos').addEventListener('change', (e) => { state.titlePos = e.target.value; historyPush(history, state); redraw(); });
$('titleSize').addEventListener('input', (e) => {
  state.titleSize = Number(e.target.value);
  redraw();
});
$('titleSize').addEventListener('change', () => historyPush(history, state));
$('size').addEventListener('change', (e) => { state.size = e.target.value; historyPush(history, state); redraw(); });

$('panelPhoto').addEventListener('change', (e) => {
  assignPhoto(state, state.selected, Number(e.target.value));
  historyPush(history, state);
  redraw();
});
$('zoom').addEventListener('input', (e) => {
  state.panels[state.selected].zoom = Number(e.target.value);
  clampSlot(state.panels[state.selected]);
  redraw();
});
$('zoom').addEventListener('change', () => historyPush(history, state));
$('panX').addEventListener('input', (e) => {
  state.panels[state.selected].x = Number(e.target.value);
  redraw();
});
$('panX').addEventListener('change', () => historyPush(history, state));
$('panY').addEventListener('input', (e) => {
  state.panels[state.selected].y = Number(e.target.value);
  redraw();
});
$('panY').addEventListener('change', () => historyPush(history, state));

// --- export ----------------------------------------------------------------

$('export').addEventListener('click', () => {
  const { width, height } = parseSize(state.size);
  const off = document.createElement('canvas');
  off.width = width;
  off.height = height;
  drawCover(off, state);
  off.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-coast-cover-${width}x${height}.png`;
    a.click();
    status.textContent = `Saved vice-coast-cover-${width}x${height}.png (${width} × ${height}).`;
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
});

// --- in-page self test (?selftest=1) ---------------------------------------

async function runSelfTest() {
  const results = {};
  try {
    for (const name of ['boulevard', 'pier']) {
      const img = await loadImage(`samples/${name}.jpg`);
      img.dataset.name = `${name}.jpg`;
      state.photos.push(img);
    }
    dealPhotos(state);
    // Every layout renders at every export size without throwing.
    const sizes = ['1920x1080', '1080x1080', '1080x1350', '1080x1920'];
    const off = document.createElement('canvas');
    for (const layout of LAYOUTS) {
      state.layout = layout;
      for (const size of sizes) {
        const { width, height } = parseSize(size);
        off.width = width;
        off.height = height;
        drawCover(off, state);
        const px = off.getContext('2d').getImageData(0, 0, 1, 1).data;
        if (px[3] !== 255) throw new Error(`blank pixel ${layout} ${size}`);
      }
    }
    results.layouts = LAYOUTS.join(',');
    results.sizes = sizes.join(',');
    // Distinct crops: no two panel slots share photo+zoom+pan.
    const keys = state.panels.map((s) => `${s.photo}:${s.zoom}:${s.x}:${s.y}`);
    results.distinctCrops = new Set(keys).size === keys.length;
    // Undo/redo round-trip on the title. Sync the history baseline to the
    // current state first (the layout loop above mutated state directly).
    history.past = [];
    history.future = [];
    history.last = snapshotState(state);
    const before = snapshotState(state);
    state.title = 'SELFTEST TITLE';
    historyPush(history, state);
    const changed = state.title === 'SELFTEST TITLE';
    const undid = historyUndo(history, state);
    const backToBefore = snapshotState(state) === before;
    const redid = historyRedo(history, state);
    const backToChanged = state.title === 'SELFTEST TITLE';
    historyUndo(history, state);
    results.undoRedo = changed && undid && backToBefore && redid && backToChanged;
    // Export path produces a real PNG blob at story size.
    state.size = '1080x1920';
    const story = document.createElement('canvas');
    story.width = 1080;
    story.height = 1920;
    drawCover(story, state);
    const blob = await new Promise((resolve) => story.toBlob(resolve, 'image/png'));
    results.exportStoryBytes = blob ? blob.size : 0;
    results.pass = results.distinctCrops && results.undoRedo && results.exportStoryBytes > 10000;
    state.layout = 'nine';
    state.size = '1920x1080';
    state.title = 'VICE CITY NIGHTS';
  } catch (err) {
    results.pass = false;
    results.error = String(err && err.message ? err.message : err);
  }
  document.body.dataset.selftest = JSON.stringify(results);
  document.title = `selftest:${results.pass ? 'PASS' : 'FAIL'}`;
  refreshTray();
  redraw();
}

// --- shots / first paint ----------------------------------------------------

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (params.get('selftest') === '1') {
  runSelfTest();
} else if (shot) {
  runShot(shot, params, state, async (sample, text) => {
    state.photos = [];
    for (const name of ['boulevard', 'pier']) {
      const img = await loadImage(`samples/${name}.jpg`);
      img.dataset.name = `${name}.jpg`;
      state.photos.push(img);
    }
    dealPhotos(state);
    if (text) state.title = text;
    refreshTray();
    redraw();
  });
} else {
  // First paint already shows a finished-looking cover from the samples,
  // so the fast path is: change the caption, hit Export.
  loadImage('samples/boulevard.jpg').then(async (b) => {
    b.dataset.name = 'boulevard.jpg';
    const p = await loadImage('samples/pier.jpg');
    p.dataset.name = 'pier.jpg';
    state.photos = [b, p];
    dealPhotos(state);
    refreshTray();
    redraw();
  }).catch(() => redraw());
  redraw();
}
