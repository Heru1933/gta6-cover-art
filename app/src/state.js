// Cover state: the photos, one crop slot per panel, and every editor choice.
// A panel slot says which photo fills it and how that photo is cropped
// (zoom + pan). Layouts decide how many panels exist; slots beyond the
// layout's panel count are kept so switching layouts never loses a crop.

export function defaultPanels() {
  // Default crops favour the faces: both sample photos have their subjects
  // near the top of the frame, so the slots start panned down (positive y)
  // to pull faces into the wide, short panels.
  return [
    { photo: 0, zoom: 105, x: 0, y: 30 },
    { photo: 1, zoom: 105, x: 0, y: 30 },
    { photo: 0, zoom: 115, x: 0, y: 22 },
    { photo: 1, zoom: 110, x: 0, y: 30 },
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

// Spread the loaded photos across the panels in turn.
export function dealPhotos(state) {
  const n = state.photos.length;
  if (!n) return;
  state.panels.forEach((slot, i) => { slot.photo = i % n; });
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
