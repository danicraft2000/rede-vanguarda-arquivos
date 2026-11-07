// Tipografia da marca: ITC Avant Garde Gothic Bold (com o "A" alternativo inclinado) em 2D e 3D.
import * as THREE from 'three';
import opentype from 'three/addons/libs/opentype.module.js';
import { TTFLoader } from 'three/addons/loaders/TTFLoader.js';
import { Font } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

export const FONT_URL = '/assets/ITCAvantGardeStd-Bold.ttf';
export let OT = null;       // fonte opentype (para desenhar com glifos alternativos)
export let FONT3D = null;   // fonte three.js (para letras 3D extrudadas)
let ALT_A = null;

export async function loadBrand() {
  const buf = await (await fetch(FONT_URL)).arrayBuffer();
  OT = opentype.parse(buf);
  for (let i = 0; i < OT.glyphs.length; i++) { const g = OT.glyphs.get(i); if (g.name === 'A.alt01') ALT_A = g; }
  const loader = new TTFLoader();
  FONT3D = new Font(loader.parse(buf));
  // também como fonte CSS para o canvas 2D
  const ff = new FontFace('AvantGarde', buf);
  await ff.load(); document.fonts.add(ff);
  await Promise.all([
    document.fonts.load('700 40px AvantGarde'),
    document.fonts.load('400 40px Inter'), document.fonts.load('500 40px Inter'), document.fonts.load('600 40px Inter'),
    document.fonts.load('700 40px Inter'), document.fonts.load('800 40px Inter'), document.fonts.load('300 40px Inter'),
  ]);
}

function glyphsFor(text, altA) {
  return [...text].map((ch) => ((ch === 'A' && altA) ? ALT_A : OT.charToGlyph(ch)));
}

// Mede/desenha texto da marca. align: 'left' | 'center' | 'right'. track em fração do tamanho.
export function brandLayout(text, size, { altA = true, track = 0 } = {}) {
  const gl = glyphsFor(text, altA), sc = size / OT.unitsPerEm;
  const xs = []; let x = 0;
  gl.forEach((g, i) => {
    xs.push(x); x += g.advanceWidth * sc + track * size;
    if (i < gl.length - 1) x += OT.getKerningValue(g, gl[i + 1]) * sc;
  });
  return { gl, xs, width: x - track * size, sc };
}

export function drawBrand(ctx, text, x, y, size, { align = 'left', altA = true, track = 0, fill = null, stroke = null, lineWidth = 2 } = {}) {
  const L = brandLayout(text, size, { altA, track });
  const ox = align === 'center' ? x - L.width / 2 : align === 'right' ? x - L.width : x;
  ctx.beginPath();
  L.gl.forEach((g, i) => {
    const p = g.getPath(ox + L.xs[i], y, size);
    for (const c of p.commands) {
      if (c.type === 'M') ctx.moveTo(c.x, c.y);
      else if (c.type === 'L') ctx.lineTo(c.x, c.y);
      else if (c.type === 'Q') ctx.quadraticCurveTo(c.x1, c.y1, c.x, c.y);
      else if (c.type === 'C') ctx.bezierCurveTo(c.x1, c.y1, c.x2, c.y2, c.x, c.y);
      else if (c.type === 'Z') ctx.closePath();
    }
  });
  if (fill !== null) { if (fill) ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
  return L.width;
}

// Geometria 3D de texto (letras cromadas estilo vinhetas Vanguarda)
export function text3D(text, size, depth, { bevel = true, curve = 6 } = {}) {
  const g = new TextGeometry(text, {
    font: FONT3D, size, depth, curveSegments: curve,
    bevelEnabled: bevel, bevelThickness: depth * 0.18, bevelSize: size * 0.025, bevelSegments: 3,
  });
  g.computeBoundingBox();
  return g;
}
