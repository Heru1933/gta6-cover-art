// Vice Coast cover engine: draws a multi-panel GTA-style poster cover onto any
// 2D canvas. Everything is drawn in code — sunset skies, palm silhouettes, a
// city skyline, bold outlined lettering — so the app works fully offline and
// uses no Rockstar artwork, logo or font. Photos are the user's own images.

export const GRADES = {
  sunset: {
    sky: ['#2b1055', '#7b1e6e', '#e8435f', '#ff7a18', '#ffc46b'],
    sun: '#ffd166', sunGlow: 'rgba(255, 180, 80, 0.55)',
    tintTop: 'rgba(255, 122, 24, 0.10)', tintBottom: 'rgba(180, 20, 110, 0.38)',
    title: ['#fff3b0', '#ffb347', '#ff2e88'], titleStroke: '#1c0b2e',
    band: ['#1c0b2e', '#3d1155'],
  },
  neon: {
    sky: ['#0b0620', '#2a0a4a', '#7a1fa2', '#e0218a', '#22d3ee'],
    sun: '#ff5ce1', sunGlow: 'rgba(255, 92, 225, 0.5)',
    tintTop: 'rgba(34, 211, 238, 0.14)', tintBottom: 'rgba(224, 33, 138, 0.42)',
    title: ['#a5f3fc', '#22d3ee', '#ff2e88'], titleStroke: '#0b0620',
    band: ['#0b0620', '#1e0a3d'],
  },
  miami: {
    sky: ['#123a5c', '#1e6f8e', '#2ec4b6', '#ff9f1c', '#ffea8a'],
    sun: '#fff3b0', sunGlow: 'rgba(255, 234, 138, 0.5)',
    tintTop: 'rgba(46, 196, 182, 0.12)', tintBottom: 'rgba(255, 159, 28, 0.30)',
    title: ['#ffffff', '#a5f3fc', '#ff9f1c'], titleStroke: '#0a2540',
    band: ['#0a2540', '#123a5c'],
  },
  dusk: {
    sky: ['#0d0714', '#241636', '#4a2a6e', '#8a3b6e', '#ff6b6b'],
    sun: '#ff8e72', sunGlow: 'rgba(255, 107, 107, 0.45)',
    tintTop: 'rgba(124, 58, 237, 0.14)', tintBottom: 'rgba(13, 7, 20, 0.45)',
    title: ['#ffe8d6', '#ffb4a2', '#e07a5f'], titleStroke: '#0d0714',
    band: ['#0d0714', '#241636'],
  },
};

export const LAYOUTS = ['hero', 'grid', 'strip', 'snapshots'];

// Panel rectangles in unit space (fractions of the cover), above the title band.
// The band occupies the bottom (or top) strip; panels fill the rest.
export function layoutPanels(layout, titlePos) {
  const band = 0.27;
  const top = titlePos === 'top' ? band : 0;
  const y0 = top + 0.018, y1 = (titlePos === 'top' ? 1 : 1 - band) - 0.012;
  const x0 = 0.018, x1 = 0.982, g = 0.012;
  const W = x1 - x0, H = y1 - y0;
  const third = (H - 2 * g) / 3;
  if (layout === 'grid') {
    const hw = (W - g) / 2, hh = (H - g) / 2;
    return [
      { x: x0, y: y0, w: hw, h: hh },
      { x: x0 + hw + g, y: y0, w: hw, h: hh },
      { x: x0, y: y0 + hh + g, w: hw, h: hh },
      { x: x0 + hw + g, y: y0 + hh + g, w: hw, h: hh },
    ];
  }
  if (layout === 'strip') {
    const cw = (W - 2 * g) / 3;
    return [
      { x: x0, y: y0, w: cw, h: H },
      { x: x0 + cw + g, y: y0, w: cw, h: H },
      { x: x0 + 2 * (cw + g), y: y0, w: cw, h: H },
    ];
  }
  if (layout === 'snapshots') {
    return [
      { x: x0, y: y0, w: W, h: H, full: true },
      { x: x0 + W * 0.06, y: y0 + H * 0.52, w: W * 0.36, h: H * 0.42, tilt: -0.07 },
      { x: x0 + W * 0.58, y: y0 + H * 0.56, w: W * 0.36, h: H * 0.42, tilt: 0.06 },
    ];
  }
  // hero: one large panel + three stacked beside it.
  const heroW = W * 0.60;
  return [
    { x: x0, y: y0, w: heroW, h: H },
    { x: x0 + heroW + g, y: y0, w: W - heroW - g, h: third },
    { x: x0 + heroW + g, y: y0 + third + g, w: W - heroW - g, h: third },
    { x: x0 + heroW + g, y: y0 + 2 * (third + g), w: W - heroW - g, h: third },
  ];
}

export function titleBandRect(titlePos) {
  return titlePos === 'top'
    ? { x: 0, y: 0, w: 1, h: 0.27 }
    : { x: 0, y: 0.73, w: 1, h: 0.27 };
}

// Seeded pseudo-random so grain is stable between redraws of the same cover.
export function seededRandom(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function drawPhotoCover(ctx, img, rect, zoom, panX, panY) {
  const z = zoom / 100;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const base = Math.max(rect.w / iw, rect.h / ih) * z;
  const pw = iw * base, ph = ih * base;
  // Pan moves the photo within its own overflow only (pan +/-50 reaches the
  // edge of the slack), so a crop can never expose the background behind it.
  const dx = rect.x + (rect.w - pw) / 2 + (panX / 50) * ((pw - rect.w) / 2);
  const dy = rect.y + (rect.h - ph) / 2 + (panY / 50) * ((ph - rect.h) / 2);
  ctx.drawImage(img, dx, dy, pw, ph);
}

function gradeWash(ctx, rect, grade) {
  const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  wash.addColorStop(0, grade.tintTop);
  wash.addColorStop(1, grade.tintBottom);
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = 'soft-light';
  const glow = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  glow.addColorStop(0, 'rgba(255, 140, 60, 0.35)');
  glow.addColorStop(1, 'rgba(120, 40, 200, 0.35)');
  ctx.fillStyle = glow;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = 'source-over';
}

function drawPalm(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(10, -55, 26, -95);
  ctx.stroke();
  // Fronds fanning from the crown.
  for (let i = 0; i < 7; i += 1) {
    const a = (-0.15 - i * 0.38) * Math.PI;
    const tx = 26 + Math.cos(a) * 52;
    const ty = -95 + Math.sin(a) * 34;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(26, -95);
    ctx.quadraticCurveTo(26 + Math.cos(a) * 30, -95 + Math.sin(a) * 18 - 14, tx, ty + 16);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(30, -90, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSkyline(ctx, rect, grade) {
  const { x, y, w, h } = rect;
  const sky = ctx.createLinearGradient(x, y, x, y + h);
  grade.sky.forEach((c, i) => sky.addColorStop(i / (grade.sky.length - 1), c));
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  // Low sun with a soft glow, kept high in the band so it never sits behind
  // the title lettering — the title lives in the band's lower half.
  const sunR = h * 0.20;
  const sunX = x + w * 0.5, sunY = y + h * 0.24;
  const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 2.4);
  glow.addColorStop(0, grade.sunGlow);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = grade.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  // Sun stripes (retro synthwave cut).
  ctx.fillStyle = grade.sky[0];
  for (let i = 0; i < 3; i += 1) {
    const sy = sunY + sunR * (0.15 + i * 0.28);
    ctx.fillRect(sunX - sunR, sy, sunR * 2, sunR * 0.07);
  }
  // Distant skyline silhouette.
  const base = y + h * 0.82;
  ctx.fillStyle = 'rgba(20, 8, 36, 0.85)';
  const rnd = seededRandom(20261119);
  let bx = x;
  while (bx < x + w) {
    const bw = w * (0.05 + rnd() * 0.07);
    const bh = h * (0.25 + rnd() * 0.4);
    ctx.fillRect(bx, base - bh, bw, bh);
    if (rnd() > 0.6) ctx.fillRect(bx + bw * 0.3, base - bh - h * 0.08, bw * 0.4, h * 0.08);
    bx += bw + w * 0.012;
  }
  // Lit windows.
  ctx.fillStyle = 'rgba(255, 209, 102, 0.9)';
  const wrnd = seededRandom(77);
  for (let i = 0; i < Math.floor(w / 14); i += 1) {
    if (wrnd() < 0.45) {
      ctx.fillRect(x + wrnd() * w, base - wrnd() * h * 0.55, 3, 4);
    }
  }
  // Ocean shimmer at the foot.
  const sea = ctx.createLinearGradient(x, base, x, y + h);
  sea.addColorStop(0, 'rgba(255, 122, 24, 0.35)');
  sea.addColorStop(1, 'rgba(10, 20, 60, 0.9)');
  ctx.fillStyle = sea;
  ctx.fillRect(x, base, w, y + h - base);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = 1.5;
  const srnd = seededRandom(9);
  for (let i = 0; i < 8; i += 1) {
    const sy = base + (y + h - base) * (0.15 + i * 0.1);
    ctx.beginPath();
    const sx = x + w * srnd() * 0.5;
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + w * (0.08 + srnd() * 0.2), sy);
    ctx.stroke();
  }
  // Palms framing the band.
  drawPalm(ctx, x + w * 0.07, y + h * 0.98, h / 210, '#12081f');
  drawPalm(ctx, x + w * 0.94, y + h * 0.98, h / 260, '#12081f');
}

function fitFont(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `900 ${size}px system-ui, sans-serif`;
  while (ctx.measureText(text).width > maxWidth && size > 10) {
    size -= 2;
    ctx.font = `900 ${size}px system-ui, sans-serif`;
  }
  return size;
}

function drawTitleBlock(ctx, canvas, state, grade) {
  const { width: W, height: H } = canvas;
  const band = titleBandRect(state.titlePos);
  const bx = band.x * W, by = band.y * H, bw = band.w * W, bh = band.h * H;
  if (state.artwork) {
    drawSkyline(ctx, { x: bx, y: by, w: bw, h: bh }, grade);
  } else {
    const bg = ctx.createLinearGradient(bx, by, bx, by + bh);
    bg.addColorStop(0, grade.band[0]);
    bg.addColorStop(1, grade.band[1]);
    ctx.fillStyle = bg;
    ctx.fillRect(bx, by, bw, bh);
  }
  // Divider line between panels and band.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(bx, state.titlePos === 'top' ? by + bh - 4 : by, bw, 4);

  const title = (state.title || 'VICE CITY NIGHTS').trim().toUpperCase();
  const sub = (state.subtitle || '').trim();
  const cx = bx + bw / 2;
  const titleSize = fitFont(ctx, title, bw * 0.92, (H * 0.115) * (state.titleSize / 100));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const titleY = by + bh * (sub ? 0.56 : 0.58);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = titleSize * 0.18;
  ctx.shadowOffsetY = titleSize * 0.06;
  if (state.titleStyle === 'neon') {
    ctx.lineWidth = Math.max(2, titleSize * 0.09);
    ctx.strokeStyle = grade.title[2];
    ctx.strokeText(title, cx, titleY);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, cx, titleY);
  } else if (state.titleStyle === 'white') {
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, cx, titleY);
  } else {
    const grad = ctx.createLinearGradient(cx - bw * 0.4, titleY, cx + bw * 0.4, titleY);
    grad.addColorStop(0, grade.title[0]);
    grad.addColorStop(0.55, grade.title[1]);
    grad.addColorStop(1, grade.title[2]);
    ctx.lineWidth = Math.max(3, titleSize * 0.10);
    ctx.strokeStyle = grade.titleStroke;
    ctx.lineJoin = 'round';
    ctx.strokeText(title, cx, titleY);
    ctx.fillStyle = grad;
    ctx.fillText(title, cx, titleY);
  }
  ctx.restore();
  if (sub) {
    const subSize = Math.max(14, H * 0.032);
    ctx.font = `italic 700 ${subSize}px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6;
    ctx.fillText(sub.toUpperCase(), cx, by + bh * 0.87);
    ctx.shadowBlur = 0;
  }
}

function drawGrain(ctx, canvas) {
  const rnd = seededRandom(4242);
  const { width: W, height: H } = canvas;
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = '#ffffff';
  const n = Math.floor((W * H) / 9000);
  for (let i = 0; i < n; i += 1) {
    ctx.fillRect(rnd() * W, rnd() * H, 1.6, 1.6);
  }
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#000000';
  for (let i = 0; i < n; i += 1) {
    ctx.fillRect(rnd() * W, rnd() * H, 1.6, 1.6);
  }
  ctx.restore();
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

// Draws the whole cover. `state` carries photos, panels, layout, grade, title
// and style choices; `canvas` sets the export size.
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: W, height: H } = canvas;
  const grade = GRADES[state.grade] || GRADES.sunset;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = grade.band[0];
  ctx.fillRect(0, 0, W, H);

  const panels = layoutPanels(state.layout, state.titlePos);
  const border = Math.max(4, Math.round(Math.min(W, H) * 0.008));
  panels.forEach((p, i) => {
    const rect = { x: p.x * W, y: p.y * H, w: p.w * W, h: p.h * H };
    const slot = state.panels[i] || { photo: 0, zoom: 100, x: 0, y: 0 };
    const img = state.photos[slot.photo];
    ctx.save();
    if (p.tilt) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(p.tilt);
      ctx.translate(-rect.w / 2, -rect.h / 2);
    }
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (img) {
      drawPhotoCover(ctx, img, rect, slot.zoom, slot.x, slot.y);
      gradeWash(ctx, rect, grade);
    } else {
      drawSkyline(ctx, rect, grade);
    }
    ctx.restore();
    // White poster border + soft drop shadow around each panel.
    ctx.save();
    if (p.tilt) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(p.tilt);
      ctx.translate(-rect.w / 2, -rect.h / 2);
    }
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = border * 2;
    ctx.shadowOffsetY = border;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = border;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  });

  drawTitleBlock(ctx, canvas, state, grade);
  if (state.grain) drawGrain(ctx, canvas);

  // Thin outer frame, poster style.
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(3, Math.min(W, H) * 0.004);
  ctx.strokeRect(2, 2, W - 4, H - 4);
}

// Panel rectangles in canvas pixels, for hit-testing clicks and drags.
export function panelRectsPx(canvas, state) {
  const { width: W, height: H } = canvas;
  return layoutPanels(state.layout, state.titlePos).map((p) => ({
    x: p.x * W, y: p.y * H, w: p.w * W, h: p.h * H, tilt: p.tilt || 0,
  }));
}
