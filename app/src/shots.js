// Fixed scenes for screenshots: ?shot=editor shows the editor with the sample
// photos loaded; ?shot=cover shows one exported-style cover alone, full-bleed.
// Query params: photo (ignored — both samples load), caption, subtitle,
// layout, grade, size (1920x1080 / 1080x1080 / 1080x1350 / 1080x1920),
// titleStyle, titlePos, poster (0/1).
// window.__shotReady is set once the cover has painted twice, and
// document.body.dataset.shotReady is set too so headless dumps can see it.
import { parseSize } from './state.js';

export async function runShot(shot, query, state, load) {
  const layout = query.get('layout');
  if (layout) state.layout = layout;
  const grade = query.get('grade');
  if (grade) state.grade = grade;
  const size = query.get('size');
  if (size) state.size = size;
  const titleStyle = query.get('titleStyle');
  if (titleStyle) state.titleStyle = titleStyle;
  const subtitle = query.get('subtitle');
  if (subtitle !== null) state.subtitle = subtitle;
  const titlePos = query.get('titlePos');
  if (titlePos) state.titlePos = titlePos;
  const poster = query.get('poster');
  if (poster !== null) state.poster = poster !== '0';

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    // Cover scenes render at the export size itself, so the screenshot shows
    // the PNG the app would write, drawn by the app's own engine.
    const { width, height } = parseSize(state.size || '1920x1080');
    const canvas = document.getElementById('cover');
    canvas.width = width;
    canvas.height = height;
  }
  await load(null, query.get('caption') ?? 'VICE CITY NIGHTS');
  // Sync the visible controls with the scene, then paint twice so the
  // canvas is settled before the screenshot is taken.
  const layoutSel = document.getElementById('layout');
  if (layoutSel) layoutSel.value = state.layout;
  const sizeSel = document.getElementById('size');
  if (sizeSel) sizeSel.value = state.size;
  const titlePosSel = document.getElementById('titlePos');
  if (titlePosSel) titlePosSel.value = state.titlePos;
  document.querySelectorAll('#gradeRow .chip').forEach((c) => {
    c.classList.toggle('active', c.dataset.grade === state.grade);
  });
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
    document.body.dataset.shotReady = '1';
  }));
}
