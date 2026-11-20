// Cover state: the photos, one crop slot per panel, and every editor choice.
// A panel slot says which photo fills it and how that photo is cropped
// (zoom + pan). Layouts decide how many panels exist; slots beyond the
// layout's panel count are kept so switching layouts never loses a crop.
//
// Round 3: nine panel slots, each with a DISTINCT default crop (different
// zoom and pan, alternating photos) so no two panels ever start out showing
// the same crop; pan values are small and pull toward the upper third,
// matching the safe-zone anchor in cover.js.

export function defaultPanels() {
  // Pan y is POSITIVE: positive pan moves the photo down, showing its
  // upper part — both sample photos have their subjects near the top, so
  // positive y pulls faces into the wide, short panels.
  return [
    { photo: 0, zoom: 105, x: 0, y: 12 },
    { photo: 1, zoom: 118, x: -10, y: 18 },
    { photo: 0, zoom: 132, x: 12, y: 10 },
    { photo: 1, zoom: 110, x: 6, y: 22 },
    { photo: 0, zoom: 124, x: -6, y: 8 },
    { photo: 1, zoom: 140, x: 10, y: 16 },
    { photo: 0, zoom: 115, x: -12, y: 14 },
    { photo: 1, zoom: 128, x: 8, y: 6 },
    { photo: 0, zoom: 120, x: 0, y: 20 },
  ];
}

export function createCoverState() {
  return {
    photos: [],
    panels: defaultPanels(),
    selected: 0,
    layout: 'hero',
    grade: 'sunset',
    grain: true,
    artwork: true,
    poster: true,
    title: 'VICE CITY NIGHTS',
    subtitle: 'One last ride down Ocean Drive',
    titleSize: 100,
    titlePos: 'bottom',
    titleStyle: 'sunset',
    size: '1920x1080',
  };
}

// How many panels the current layout shows.
export function panelCount(layout) {
  if (layout === 'strip') return 3;
  if (layout === 'snapshots') return 3;
  if (layout === 'nine') return 9;
  return 4;
}

// Clamp a panel slot's crop values to their slider ranges.
export function clampSlot(slot) {
  slot.zoom = Math.min(260, Math.max(100, slot.zoom || 100));
  slot.x = Math.min(50, Math.max(-50, slot.x || 0));
  slot.y = Math.min(50, Math.max(-50, slot.y || 0));
  return slot;
}

// Point the panel at a different photo, keeping its crop.
export function assignPhoto(state, panelIndex, photoIndex) {
  if (!state.panels[panelIndex]) return;
  if (photoIndex < 0 || photoIndex >= state.photos.length) return;
  state.panels[panelIndex].photo = photoIndex;
}

// Spread the loaded photos across the panels in turn, and give every panel
// a distinct crop: alternating zoom steps and pan nudges so the same photo
// never repeats identically in two panels.
export function dealPhotos(state) {
  const n = state.photos.length;
  if (!n) return;
  const zooms = [105, 118, 132, 110, 124, 140, 115, 128, 120];
  const pans = [[0, 12], [-10, 18], [12, 10], [6, 22], [-6, 8], [10, 16], [-12, 14], [8, 6], [0, 20]];
  state.panels.forEach((slot, i) => {
    slot.photo = i % n;
    slot.zoom = zooms[i % zooms.length];
    slot.x = pans[i % pans.length][0];
    slot.y = pans[i % pans.length][1];
  });
}

// Shuffle which photo each panel shows (same photos, new arrangement).
export function shufflePanels(state) {
  const n = state.photos.length;
  if (!n) return;
  const order = state.panels.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  state.panels.forEach((slot, i) => { slot.photo = order[i] % n; });
}

// Parse a "1920x1080" size label into pixels.
export function parseSize(label) {
  const [w, h] = label.split('x').map(Number);
  return { width: w || 1080, height: h || 1080 };
}

// --- undo / redo -----------------------------------------------------------
// A snapshot is the plain editor state (photos are Image objects and are
// shared, never copied). Serialising through JSON keeps snapshots cheap
// and independent of the live panels array.
export function snapshotState(state) {
  return JSON.stringify({
    panels: state.panels,
    selected: state.selected,
    layout: state.layout,
    grade: state.grade,
    grain: state.grain,
    artwork: state.artwork,
    poster: state.poster,
    title: state.title,
    subtitle: state.subtitle,
    titleSize: state.titleSize,
    titlePos: state.titlePos,
    titleStyle: state.titleStyle,
    size: state.size,
  });
}

export function restoreSnapshot(state, json) {
  const s = JSON.parse(json);
  state.panels = s.panels;
  state.selected = s.selected;
  state.layout = s.layout;
  state.grade = s.grade;
  state.grain = s.grain;
  state.artwork = s.artwork;
  state.poster = s.poster !== undefined ? s.poster : true;
  state.title = s.title;
  state.subtitle = s.subtitle;
  state.titleSize = s.titleSize;
  state.titlePos = s.titlePos;
  state.titleStyle = s.titleStyle;
  state.size = s.size;
}

export function createHistory(state) {
  return { past: [], future: [], last: snapshotState(state) };
}

export function historyPush(history, state) {
  const now = snapshotState(state);
  if (now === history.last) return;
  history.past.push(history.last);
  if (history.past.length > 60) history.past.shift();
  history.future = [];
  history.last = now;
}

export function historyUndo(history, state) {
  if (!history.past.length) return false;
  history.future.push(history.last);
  history.last = history.past.pop();
  restoreSnapshot(state, history.last);
  return true;
}

export function historyRedo(history, state) {
  if (!history.future.length) return false;
  history.past.push(history.last);
  history.last = history.future.pop();
  restoreSnapshot(state, history.last);
  return true;
}
