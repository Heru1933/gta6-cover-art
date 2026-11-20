// Vice Coast cover engine (round 3): draws a multi-panel GTA-style poster
// cover onto any 2D canvas. Everything is drawn in code — sunset skies, palm
// silhouettes, a layered city skyline, bold outlined lettering, halftone
// poster treatment — so the app works fully offline and uses no Rockstar
// artwork, logo or font. Photos are the user's own images.
//
// Round 3 changes over round 2:
//  - nine-panel 3x3 grid layout with a title block (elite tier).
//  - every panel gets a DISTINCT crop/zoom/grade treatment: no two panels
//    ever show the same crop of the same photo, and wide panels anchor
//    their crop to the upper third so faces are never cut at chin level.
//  - poster treatment: thick ink borders + duotone banding + halftone dots
//    on every panel, halftone sky in the title block.
//  - richer title block: two-layer skyline with lit windows, palm
//    silhouettes, a big gradient sun with a sea reflection, a badge ribbon
//    and a five-star heat meter.
//  - tilted snapshot panels are real polaroids now: white frame with a
//    deep bottom edge, tape strip, drop shadow.

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

export const LAYOUTS = ['hero', 'grid', 'strip', 'snapshots', 'nine'];

// Per-panel treatment: a deterministic, distinct variant for each panel
// index — different extra zoom, pan nudge, halftone density and duotone
// strength — so the same photo never repeats identically across panels.
export function panelVariant(i) {
  const table = [
    { zoom: 0, dx: 0, dy: 0, dots: 0.55, duo: 0.30 },
    { zoom: 14, dx: -12, dy: 8, dots: 0.85, duo: 0.55 },
    { zoom: 26, dx: 12, dy: -4, dots: 0.40, duo: 0.40 },
    { zoom: 8, dx: 6, dy: 10, dots: 0.70, duo: 0.65 },
    { zoom: 20, dx: -6, dy: -6, dots: 0.95, duo: 0.35 },
    { zoom: 34, dx: 14, dy: 6, dots: 0.50, duo: 0.60 },
    { zoom: 11, dx: -14, dy: 12, dots: 0.75, duo: 0.45 },
    { zoom: 30, dx: 8, dy: -2, dots: 0.60, duo: 0.50 },
    { zoom: 18, dx: -4, dy: 4, dots: 0.80, duo: 0.38 },
  ];
  return table[i % table.length];
}

// Panel rectangles in unit space (fractions of the cover), above the title band.
// The band occupies the bottom (or top) strip; panels fill the rest.
export function layoutPanels(layout, titlePos) {
  const band = 0.27;
  const top = titlePos === 'top' ? band : 0;
  const y0 = top + 0.018, y1 = (titlePos === 'top' ? 1 : 1 - band) - 0.012;
  const x0 = 0.018, x1 = 0.982, g = 0.012;
  const W = x1 - x0, H = y1 - y0;
  const third = (H - 2 * g) / 3;
  if (layout === 'nine') {
    const cw = (W - 2 * g) / 3, ch = (H - 2 * g) / 3;
    const out = [];
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 3; c += 1) {
        out.push({ x: x0 + c * (cw + g), y: y0 + r * (ch + g), w: cw, h: ch });
      }
    }
    return out;
  }
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
      { x: x0 + W * 0.06, y: y0 + H * 0.50, w: W * 0.36, h: H * 0.44, tilt: -0.07 },
      { x: x0 + W * 0.58, y: y0 + H * 0.54, w: W * 0.36, h: H * 0.44, tilt: 0.06 },
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

// Draws the photo into a panel rect, anchoring the crop to the SAFE ZONE:
// wide panels anchor to the upper third (anchor 0.28) so a subject's face
// near the top of the frame is never cut at chin level; tall panels use
// the middle (0.45). Pan then nudges inside the remaining slack, and the
// result is clamped so the photo always fully covers the panel.
function drawPhotoCover(ctx, img, rect, zoom, panX, panY) {
  const z = zoom / 100;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const base = Math.max(rect.w / iw, rect.h / ih) * z;
  const pw = iw * base, ph = ih * base;
  const aspect = rect.w / rect.h;
  const anchorX = 0.5;
  // Wide panels show almost the whole width of a photo, so their vertical
  // window is a thin slice: anchor it near the TOP (0.06) so a face near
  // the top of the frame stays in shot instead of being cut at chin level.
  const anchorY = aspect > 1.4 ? 0.06 : aspect > 0.9 ? 0.16 : 0.35;
  const ox = pw - rect.w, oy = ph - rect.h;
  let dx = rect.x - ox * anchorX + (panX / 50) * (ox * 0.22);
  let dy = rect.y - oy * anchorY + (panY / 50) * (oy * 0.22);
  dx = Math.min(rect.x, Math.max(rect.x - ox, dx));
  dy = Math.min(rect.y, Math.max(rect.y - oy, dy));
  ctx.drawImage(img, dx, dy, pw, ph);
}

function gradeWash(ctx, rect, grade, strength = 1) {
  const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  wash.addColorStop(0, grade.tintTop);
  wash.addColorStop(1, grade.tintBottom);
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.55 + 0.45 * strength;
  const glow = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  glow.addColorStop(0, 'rgba(255, 140, 60, 0.35)');
  glow.addColorStop(1, 'rgba(120, 40, 200, 0.35)');
  ctx.fillStyle = glow;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

// Halftone dot screen over a rect: dots grow toward the bottom of the
// panel, the classic comic/poster banding. Density 0..1 scales the dots.
function drawHalftone(ctx, rect, density, color = 'rgba(10, 4, 24, 0.20)') {
  const step = Math.max(9, rect.w / 46);
  ctx.save();
  ctx.fillStyle = color;
  for (let y = rect.y + step / 2; y < rect.y + rect.h; y += step) {
    const rowT = (y - rect.y) / rect.h;
    for (let x = rect.x + step / 2; x < rect.x + rect.w; x += step) {
      const r = step * 0.10 * density * (0.4 + rowT * 1.5);
      if (r < 0.4) continue;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
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

function drawStar(ctx, x, y, r, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Two-layer skyline: a hazy far layer and a near layer with varied heights,
// rooftop details and a grid of lit windows, so the silhouette reads as a
// city instead of flat black rectangles.
function drawSkylineLayer(ctx, rect, seed, baseY, minH, maxH, color) {
  const { x, y, w, h } = rect;
  const rnd = seededRandom(seed);
  ctx.fillStyle = color;
  let bx = x;
  while (bx < x + w) {
    const bw = w * (0.035 + rnd() * 0.065);
    const bh = h * (minH + rnd() * (maxH - minH));
    ctx.fillRect(bx, baseY - bh, bw, bh);
    if (rnd() > 0.55) {
      // Rooftop antenna or water tower.
      ctx.fillRect(bx + bw * 0.42, baseY - bh - h * 0.07, bw * 0.16, h * 0.07);
    }
    if (rnd() > 0.7) {
      // Setback top floor.
      ctx.fillRect(bx + bw * 0.18, baseY - bh - h * 0.05, bw * 0.64, h * 0.05);
    }
    bx += bw + w * 0.010;
  }
}

function drawSkyline(ctx, rect, grade) {
  const { x, y, w, h } = rect;
  const sky = ctx.createLinearGradient(x, y, x, y + h);
  grade.sky.forEach((c, i) => sky.addColorStop(i / (grade.sky.length - 1), c));
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  // Halftone sky in the upper half — poster print texture.
  drawHalftone(ctx, { x, y, w, h: h * 0.5 }, 0.5, 'rgba(255,255,255,0.10)');
  // Big gradient sun with a soft glow, kept high and small so it clears
  // the title lettering — the title lives in the band's lower half.
  const sunR = h * 0.15;
  const sunX = x + w * 0.5, sunY = y + h * 0.19;
  const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 2.6);
  glow.addColorStop(0, grade.sunGlow);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x, y, w, h);
  const sunGrad = ctx.createLinearGradient(sunX, sunY - sunR, sunX, sunY + sunR);
  sunGrad.addColorStop(0, '#fff7cc');
  sunGrad.addColorStop(0.55, grade.sun);
  sunGrad.addColorStop(1, grade.title[2]);
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  // Sun stripes (retro synthwave cut).
  ctx.fillStyle = grade.sky[0];
  for (let i = 0; i < 3; i += 1) {
    const sy = sunY + sunR * (0.15 + i * 0.28);
    ctx.fillRect(sunX - sunR, sy, sunR * 2, sunR * 0.07);
  }
  // Far + near skyline layers.
  const base = y + h * 0.82;
  drawSkylineLayer(ctx, rect, 20261120, base - h * 0.06, 0.16, 0.34, 'rgba(58, 24, 92, 0.85)');
  drawSkylineLayer(ctx, rect, 20261119, base, 0.25, 0.62, 'rgba(16, 6, 30, 0.95)');
  // Lit windows on the near layer: a jittered grid clipped to the skyline.
  const wrnd = seededRandom(77);
  ctx.fillStyle = 'rgba(255, 209, 102, 0.92)';
  for (let wx = x + 4; wx < x + w - 4; wx += 15) {
    for (let wy = base - h * 0.55; wy < base - 4; wy += 17) {
      if (wrnd() < 0.13) ctx.fillRect(wx, wy, 3, 4);
    }
  }
  // Ocean shimmer at the foot, with the sun's reflection streaking down.
  const sea = ctx.createLinearGradient(x, base, x, y + h);
  sea.addColorStop(0, 'rgba(255, 122, 24, 0.35)');
  sea.addColorStop(1, 'rgba(10, 20, 60, 0.9)');
  ctx.fillStyle = sea;
  ctx.fillRect(x, base, w, y + h - base);
  const srnd = seededRandom(9);
  for (let i = 0; i < 10; i += 1) {
    const sy = base + (y + h - base) * (0.12 + i * 0.09);
    const sw = w * (0.05 + srnd() * 0.16);
    const sx = sunX - sw / 2 + (srnd() - 0.5) * w * 0.06;
    ctx.fillStyle = `rgba(255, 214, 130, ${0.5 - i * 0.04})`;
    ctx.fillRect(sx, sy, sw, 2.5);
  }
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i += 1) {
    const sy = base + (y + h - base) * (0.2 + i * 0.12);
    ctx.beginPath();
    const sx = x + w * srnd() * 0.5;
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + w * (0.08 + srnd() * 0.2), sy);
    ctx.stroke();
  }
  // Palms framing the band, plus a smaller one mid-left.
  drawPalm(ctx, x + w * 0.07, y + h * 0.98, h / 210, '#12081f');
  drawPalm(ctx, x + w * 0.94, y + h * 0.98, h / 260, '#12081f');
  drawPalm(ctx, x + w * 0.16, y + h * 0.99, h / 380, 'rgba(18, 8, 31, 0.9)');
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
  const titleY = by + bh * (sub ? 0.52 : 0.56);
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
    // Clean white with a hard pink offset shadow — poster print style.
    ctx.shadowColor = grade.title[2];
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = titleSize * 0.05;
    ctx.shadowOffsetY = titleSize * 0.05;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, cx, titleY);
  } else {
    const grad = ctx.createLinearGradient(cx - bw * 0.4, titleY, cx + bw * 0.4, titleY);
    grad.addColorStop(0, grade.title[0]);
    grad.addColorStop(0.55, grade.title[1]);
    grad.addColorStop(1, grade.title[2]);
    // Double outline: thick dark ink, then a thin hot-pink echo below.
    ctx.lineWidth = Math.max(3, titleSize * 0.10);
    ctx.strokeStyle = grade.titleStroke;
    ctx.lineJoin = 'round';
    ctx.strokeText(title, cx, titleY);
    ctx.fillStyle = grad;
    ctx.fillText(title, cx, titleY);
    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(1.5, titleSize * 0.03);
    ctx.strokeStyle = 'rgba(255,46,136,0.85)';
    ctx.strokeText(title, cx + titleSize * 0.03, titleY + titleSize * 0.04);
  }
  ctx.restore();
  if (sub) {
    const subSize = Math.max(14, H * 0.030);
    ctx.font = `italic 700 ${subSize}px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6;
    ctx.fillText(sub.toUpperCase(), cx, by + bh * 0.80);
    ctx.shadowBlur = 0;
  }
  // Five-star heat meter under the subtitle (or under the title).
  const starR = Math.max(7, bh * 0.055);
  const starGap = starR * 2.6;
  const starY = by + bh * (sub ? 0.93 : 0.86);
  const starX0 = cx - (2 * starGap);
  ctx.save();
  ctx.shadowColor = 'rgba(255, 209, 102, 0.8)';
  ctx.shadowBlur = starR * 0.9;
  for (let i = 0; i < 5; i += 1) {
    drawStar(ctx, starX0 + i * starGap, starY, starR, '#ffd166');
  }
  ctx.restore();
  // Badge ribbon, top-right of the band: "VICE COAST" on a pink slant.
  const badgeH = Math.max(18, bh * 0.13);
  const badgeW = badgeH * 6.4;
  const badgeX = bx + bw - badgeW - bw * 0.02;
  const badgeY = by + bh * 0.07;
  ctx.save();
  ctx.translate(badgeX + badgeW / 2, badgeY + badgeH / 2);
  ctx.rotate(0.03);
  ctx.fillStyle = '#ff2e88';
  ctx.fillRect(-badgeW / 2, -badgeH / 2, badgeW, badgeH);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(-badgeW / 2, -badgeH / 2, badgeW, badgeH * 0.28);
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.round(badgeH * 0.52)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★ VICE COAST ★', 0, badgeH * 0.05);
  ctx.restore();
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
    const variant = panelVariant(i);
    // Wide panels already crop a photo hard vertically, so extra zoom
    // there only cuts faces further: scale the variant zoom down by aspect.
    const aspect = rect.w / rect.h;
    const zoomScale = aspect > 1.4 ? 0.25 : aspect > 0.9 ? 0.5 : 1;
    const zoom = Math.min(260, (slot.zoom || 100) + variant.zoom * zoomScale);
    const panX = Math.max(-50, Math.min(50, (slot.x || 0) + variant.dx));
    const panY = Math.max(-50, Math.min(50, (slot.y || 0) + variant.dy));
    const isPolaroid = Boolean(p.tilt);
    // Polaroid frame: photo sits inside a white frame with a deep bottom.
    const frame = isPolaroid ? Math.max(10, rect.w * 0.05) : 0;
    // Tilted panels draw in LOCAL coordinates: after translating to the
    // panel centre and rotating, the panel's own top-left is (0, 0) — using
    // absolute rect.x/rect.y here would shift the polaroid off its frame.
    const L = isPolaroid
      ? { x: 0, y: 0, w: rect.w, h: rect.h }
      : rect;
    const photoRect = isPolaroid
      ? { x: frame, y: frame, w: rect.w - frame * 2, h: rect.h - frame * 2.4 }
      : rect;
    const applyTilt = (c) => {
      if (!p.tilt) return;
      c.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      c.rotate(p.tilt);
      c.translate(-rect.w / 2, -rect.h / 2);
    };
    ctx.save();
    applyTilt(ctx);
    if (isPolaroid) {
      // Drop shadow under the polaroid.
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = border * 3;
      ctx.shadowOffsetY = border * 1.5;
      ctx.fillStyle = '#fdf6ec';
      ctx.fillRect(L.x, L.y, L.w, L.h);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }
    ctx.beginPath();
    ctx.rect(photoRect.x, photoRect.y, photoRect.w, photoRect.h);
    ctx.clip();
    if (img) {
      drawPhotoCover(ctx, img, photoRect, zoom, panX, panY);
      gradeWash(ctx, photoRect, grade, variant.duo);
    } else {
      drawSkyline(ctx, photoRect, grade);
    }
    // Poster treatment: halftone dots + a duotone band across the panel.
    if (state.poster !== false) {
      drawHalftone(ctx, photoRect, variant.dots * 0.8);
      const bandGrad = ctx.createLinearGradient(photoRect.x, photoRect.y, photoRect.x, photoRect.y + photoRect.h);
      bandGrad.addColorStop(0, 'rgba(255, 46, 136, 0.0)');
      bandGrad.addColorStop(0.72, 'rgba(255, 46, 136, 0.0)');
      bandGrad.addColorStop(1, `rgba(20, 8, 46, ${0.28 * variant.duo})`);
      ctx.fillStyle = bandGrad;
      ctx.fillRect(photoRect.x, photoRect.y, photoRect.w, photoRect.h);
    }
    ctx.restore();
    // Borders: thick dark INK line + a thin white inner line (poster print).
    ctx.save();
    applyTilt(ctx);
    if (isPolaroid) {
      // Tape strip across the top of the polaroid.
      ctx.fillStyle = 'rgba(255, 209, 102, 0.75)';
      ctx.fillRect(L.x + L.w * 0.32, L.y - border * 0.9, L.w * 0.36, border * 1.8);
      ctx.strokeStyle = 'rgba(20, 8, 31, 0.9)';
      ctx.lineWidth = Math.max(3, border * 0.7);
      ctx.strokeRect(L.x, L.y, L.w, L.h);
    } else {
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = border * 2;
      ctx.shadowOffsetY = border;
      ctx.strokeStyle = state.poster === false ? '#ffffff' : '#14081f';
      ctx.lineWidth = border * (state.poster === false ? 1 : 1.7);
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = Math.max(2, border * 0.45);
      ctx.strokeRect(rect.x + border * 1.1, rect.y + border * 1.1, rect.w - border * 2.2, rect.h - border * 2.2);
    }
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
