// Motor de render das vinhetas: three.js + pos-producao (bloom, grao, vinheta,
// aberracao cromatica). Tudo e deterministico: cada quadro depende so do tempo t,
// entao da para renderizar qualquer quadro em qualquer ordem.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Font } from 'three/addons/loaders/FontLoader.js';
import * as BGU from 'three/addons/utils/BufferGeometryUtils.js';

export { THREE };
export const W = 1920, H = 1080;

// ---------------------------------------------------------------- matematica
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const smoother = (x) => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
export const easeOut = (x, p = 3) => 1 - Math.pow(1 - clamp(x), p);
export const easeIn = (x, p = 3) => Math.pow(clamp(x), p);
export const easeInOut = (x, p = 3) => { x = clamp(x); return x < 0.5 ? Math.pow(2 * x, p) / 2 : 1 - Math.pow(2 - 2 * x, p) / 2; };
export const easeOutBack = (x, s = 1.70158) => { x = clamp(x) - 1; return x * x * ((s + 1) * x + s) + 1; };
export const easeOutElastic = (x, amp = 1, per = 0.35) => {
  x = clamp(x); if (x === 0 || x === 1) return x;
  return Math.pow(2, -10 * x) * Math.sin((x - per / 4) * (2 * Math.PI) / per) * amp + 1;
};
// mola amortecida (0 -> 1), boa para "assentar" objetos
export const spring = (x, k = 9, d = 5) => { x = Math.max(0, x); return 1 - Math.exp(-d * x) * Math.cos(k * x); };
export function rng(seed) { // mulberry32
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const hsl = (h, s, l) => new THREE.Color().setHSL(((h % 1) + 1) % 1, s, l);
export const col = (c) => new THREE.Color(c);

// ---------------------------------------------------------------- renderer
const canvas = document.getElementById('c');
canvas.width = W; canvas.height = H;
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(1);
composer.setSize(W, H);
const renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
const bloomPass = new UnrealBloomPass(new THREE.Vector2(W, H), 0.6, 0.5, 0.85);
const outputPass = new OutputPass();
const finishPass = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: 0.035 }, uVignette: { value: 0.35 },
    uCA: { value: 0.0015 }, uFade: { value: 0 }, uFadeColor: { value: new THREE.Color(0, 0, 0) },
    uFlash: { value: 0 }, uRes: { value: new THREE.Vector2(W, H) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime,uGrain,uVignette,uCA,uFade,uFlash; uniform vec3 uFadeColor; uniform vec2 uRes;
    varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec2 d = vUv-0.5; float r2 = dot(d,d);
      vec2 o = d*uCA*(1.0+4.0*r2);
      vec3 c;
      c.r = texture2D(tDiffuse, vUv+o).r;
      c.g = texture2D(tDiffuse, vUv).g;
      c.b = texture2D(tDiffuse, vUv-o).b;
      c *= mix(1.0, smoothstep(0.85, 0.15, r2*1.6), uVignette);
      float n = h(vUv*uRes + fract(uTime*7.31)*vec2(311.7,183.3)) + h(vUv*uRes*1.37 + fract(uTime*3.17)*vec2(97.1,421.9)) - 1.0;
      c += n*uGrain*(0.6+0.4*(1.0-dot(c,vec3(0.333))));
      c = mix(c, uFadeColor, uFade);
      c = mix(c, vec3(1.0), uFlash);
      gl_FragColor = vec4(c,1.0);
    }`,
});
composer.addPass(renderPass);
composer.addPass(bloomPass);
composer.addPass(outputPass);
composer.addPass(finishPass);

// HUD (legenda do ano), desenhada por cima de tudo
const hudScene = new THREE.Scene();
const hudCam = new THREE.OrthographicCamera(0, W, H, 0, -10, 10);

// ---------------------------------------------------------------- fonte
let FONT = null, KERN = {};
export async function loadFont() {
  const j = await (await fetch('/build/fonte.json')).json();
  KERN = j.kern || {};
  FONT = new Font(j);
}
export const SV = '', SA = '';
// troca V e A pelos glifos estilizados do logotipo
export const logo = (s) => s.replace(/V/g, SV).replace(/A/g, SA);

const geoCache = new Map();
function glyphGeo(ch, o) {
  const key = [ch, o.size, o.depth, o.bevel, o.bevelSeg, o.curveSeg, o.flat].join('|');
  if (geoCache.has(key)) return geoCache.get(key);
  const shapes = FONT.generateShapes(ch, o.size);
  let g;
  if (!shapes.length) g = null;
  else if (o.flat) g = new THREE.ShapeGeometry(shapes, o.curveSeg);
  else g = new THREE.ExtrudeGeometry(shapes, {
    depth: o.depth, curveSegments: o.curveSeg, bevelEnabled: o.bevel > 0,
    bevelThickness: o.bevel, bevelSize: o.bevel * 0.9, bevelSegments: o.bevelSeg,
  });
  if (g) { g.computeBoundingBox(); if (!o.flat) g.translate(0, 0, -o.depth / 2); }
  geoCache.set(key, g);
  return g;
}
export function advance(ch, size) { const g = FONT.data.glyphs[ch]; return g ? g.ha * size / FONT.data.resolution : size * 0.3; }
export function kern(a, b, size) { return (KERN[a + b] || 0) * size / FONT.data.resolution; }
export function textWidth(str, size, tracking = 0) {
  let w = 0; for (let i = 0; i < str.length; i++) { w += advance(str[i], size) + (i < str.length - 1 ? kern(str[i], str[i + 1], size) + tracking * size : 0); }
  return w;
}

// Texto 3D: cada letra vira um Mesh separado (pivo no centro da letra),
// assim da para animar letra por letra.
// opts: size, depth, bevel, bevelSeg, curveSeg, flat, material, align('left'|'center'|'right'),
//       lineHeight, tracking, anchor ('center' | 'baseline')
export function makeText(str, opts = {}) {
  const o = Object.assign({ size: 1, depth: 0.25, bevel: 0.02, bevelSeg: 3, curveSeg: 10, flat: false,
    align: 'center', lineHeight: 0.92, tracking: 0, anchor: 'center', material: null }, opts);
  const group = new THREE.Group();
  const lines = str.split('\n');
  const letters = [];
  const capH = 0.72 * o.size; // altura das maiusculas na Avant Garde (~720/1000)
  const widths = lines.map((l) => textWidth(l, o.size, o.tracking));
  const maxW = Math.max(...widths);
  const totalH = capH + (lines.length - 1) * o.lineHeight * o.size;
  let li = 0, gi = 0;
  for (const line of lines) {
    let x = o.align === 'left' ? -maxW / 2 : o.align === 'right' ? maxW / 2 - widths[li] : -widths[li] / 2;
    const y = (o.anchor === 'center' ? totalH / 2 - capH : 0) - li * o.lineHeight * o.size;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      const g = glyphGeo(ch, o);
      if (g) {
        const bb = g.boundingBox; const cx = (bb.min.x + bb.max.x) / 2, cy = (bb.min.y + bb.max.y) / 2;
        const gg = g.clone(); gg.translate(-cx, -cy, 0);
        const mat = typeof o.material === 'function' ? o.material(ch, li, i, gi) : o.material;
        const m = new THREE.Mesh(gg, mat);
        m.position.set(x + cx, y + cy, 0);
        m.userData = { home: m.position.clone(), ch, line: li, idx: i, gidx: gi, w: bb.max.x - bb.min.x, h: bb.max.y - bb.min.y };
        m.castShadow = true; m.receiveShadow = true;
        group.add(m); letters.push(m); gi++;
      }
      x += advance(ch, o.size) + (i < line.length - 1 ? kern(ch, line[i + 1], o.size) + o.tracking * o.size : 0);
    }
    li++;
  }
  return { group, letters, width: maxW, height: totalH, capH };
}
// Formas 2D (THREE.Shape) do texto, ja posicionadas, para recortar/extrudar juntas
export function textShapes(str, size, { align = 'center', tracking = 0, lineHeight = 0.92 } = {}) {
  const out = [];
  const lines = str.split('\n'); const capH = 0.72 * size;
  const widths = lines.map((l) => textWidth(l, size, tracking)); const maxW = Math.max(...widths);
  const totalH = capH + (lines.length - 1) * lineHeight * size;
  lines.forEach((line, li) => {
    let x = align === 'left' ? -maxW / 2 : align === 'right' ? maxW / 2 - widths[li] : -widths[li] / 2;
    const y = totalH / 2 - capH - li * lineHeight * size;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      for (const s of FONT.generateShapes(ch, size)) { out.push(translateShape(s, x, y)); }
      x += advance(ch, size) + (i < line.length - 1 ? kern(ch, line[i + 1], size) + tracking * size : 0);
    }
  });
  return { shapes: out, width: maxW, height: totalH };
}
export function translateShape(s, dx, dy) {
  const pts = s.getPoints(12).map((p) => new THREE.Vector2(p.x + dx, p.y + dy));
  const ns = new THREE.Shape(pts);
  ns.holes = s.holes.map((h) => new THREE.Path(h.getPoints(12).map((p) => new THREE.Vector2(p.x + dx, p.y + dy))));
  return ns;
}
// um glifo so (ex.: numero grande), centralizado no proprio bounding box
export function glyphMesh(ch, material, o = {}) {
  const t = makeText(ch, Object.assign({ material, align: 'center' }, o));
  const m = t.letters[0]; m.position.set(0, 0, 0); return m;
}
// extrusao de formas genericas, centralizada em z
export function extrude(shapes, { depth = 0.2, bevel = 0.02, bevelSeg = 3, curveSeg = 32 } = {}) {
  const g = new THREE.ExtrudeGeometry(shapes, { depth, curveSegments: curveSeg, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.9, bevelSegments: bevelSeg });
  g.translate(0, 0, -depth / 2);
  return g;
}
export function merge(geos) { return BGU.mergeGeometries(geos, false); }
export function centerGeo(g) { g.computeBoundingBox(); const c = new THREE.Vector3(); g.boundingBox.getCenter(c); g.translate(-c.x, -c.y, -c.z); return g; }

// ---------------------------------------------------------------- formas
export function circleShape(r, x = 0, y = 0, segs = 96) { const s = new THREE.Shape(); s.absarc(x, y, r, 0, Math.PI * 2, false); return s; }
export function ringShape(r1, r2, x = 0, y = 0) { const s = circleShape(r2, x, y); const h = new THREE.Path(); h.absarc(x, y, r1, 0, Math.PI * 2, true); s.holes.push(h); return s; }
export function rectShape(w, h, x = 0, y = 0, r = 0) {
  const s = new THREE.Shape(); const x0 = x - w / 2, y0 = y - h / 2;
  if (!r) { s.moveTo(x0, y0); s.lineTo(x0 + w, y0); s.lineTo(x0 + w, y0 + h); s.lineTo(x0, y0 + h); s.closePath(); return s; }
  s.moveTo(x0 + r, y0); s.lineTo(x0 + w - r, y0); s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
  s.lineTo(x0 + w, y0 + h - r); s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
  s.lineTo(x0 + r, y0 + h); s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0); return s;
}
export function spanAtY(shape, y) { // [xmin, xmax] do contorno externo na altura y
  const pts = shape.getPoints(24); const xs = [];
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length];
    if ((a.y - y) * (b.y - y) <= 0 && a.y !== b.y) xs.push(a.x + (y - a.y) / (b.y - a.y) * (b.x - a.x)); }
  return [Math.min(...xs), Math.max(...xs)];
}
export function shapeBox(shape) { const bb = new THREE.Box2(); shape.getPoints(12).forEach((p) => bb.expandByPoint(p)); return bb; }
export function polyShape(pts) { const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]); s.closePath(); return s; }

// ---------------------------------------------------------------- materiais
export const M = {
  chrome: (o = {}) => new THREE.MeshPhysicalMaterial(Object.assign({ color: 0xffffff, metalness: 1, roughness: 0.12, envMapIntensity: 1.0 }, o)),
  metal: (color, o = {}) => new THREE.MeshPhysicalMaterial(Object.assign({ color, metalness: 1, roughness: 0.25 }, o)),
  plastic: (color, o = {}) => new THREE.MeshPhysicalMaterial(Object.assign({ color, metalness: 0, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.15 }, o)),
  matte: (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, metalness: 0, roughness: 0.8 }, o)),
  glass: (o = {}) => new THREE.MeshPhysicalMaterial(Object.assign({ color: 0xffffff, metalness: 0, roughness: 0.03, transmission: 1, thickness: 0.6, ior: 1.5, transparent: true }, o)),
  basic: (color, o = {}) => new THREE.MeshBasicMaterial(Object.assign({ color, toneMapped: false }, o)),
  glow: (color, intensity = 3, o = {}) => new THREE.MeshBasicMaterial(Object.assign({ color: new THREE.Color(color).multiplyScalar(intensity), toneMapped: true }, o)),
};

// ---------------------------------------------------------------- ambientes (reflexos)
const pmrem = new THREE.PMREMGenerator(renderer);
export function envStudio(intensity = 1) {
  const room = new RoomEnvironment();
  const tex = pmrem.fromScene(room, 0.04).texture;
  return tex;
}
// ambiente com paineis de luz (cor, posicao, tamanho) dentro de uma caixa escura
export function envPanels(panels, { bg = 0x050608, blur = 0.02 } = {}) {
  const s = new THREE.Scene(); s.background = new THREE.Color(bg);
  const box = new THREE.Mesh(new THREE.BoxGeometry(80, 80, 80), new THREE.MeshBasicMaterial({ color: bg, side: THREE.BackSide }));
  s.add(box);
  for (const p of panels) {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(p.color ?? 0xffffff).multiplyScalar(p.i || 1), side: THREE.DoubleSide });
    if (p.grad) { // gradiente vertical (topo -> base)
      mat.map = canvasTex(4, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); p.grad.forEach((c, k) => gr.addColorStop(k / (p.grad.length - 1), c)); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(p.w || 2, p.h || 2), mat);
    m.position.set(...p.pos); m.lookAt(0, 0, 0); if (p.rot) m.rotateZ(p.rot);
    if (p.ring) { m.geometry = new THREE.RingGeometry(p.ring[0], p.ring[1], 64); }
    s.add(m);
  }
  return pmrem.fromScene(s, blur).texture;
}

// ---------------------------------------------------------------- texturas de canvas
export function canvasTex(w, h, draw, { srgb = true, repeat = false } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.userData.canvas = c; t.userData.ctx = g;
  return t;
}
export function gradientBg(stops, { radial = false, angle = 90 } = {}) {
  return canvasTex(512, 288, (g, w, h) => {
    let gr;
    if (radial) gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.hypot(w, h) / 2);
    else { const a = angle * Math.PI / 180; const dx = Math.cos(a) * w / 2, dy = Math.sin(a) * h / 2; gr = g.createLinearGradient(w / 2 - dx, h / 2 - dy, w / 2 + dx, h / 2 + dy); }
    for (const [p, c] of stops) gr.addColorStop(p, c);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}
// cores do arco-iris "de emissora" (vermelho -> violeta)
export const RAINBOW = ['#e8202a', '#f26a1b', '#f7c51e', '#7cc242', '#11a3d8', '#2c4fb8', '#7a3fb0'];
export function rainbow(x) { // 0..1 -> cor suave
  const c = new THREE.Color(); c.setHSL((0.0 + 0.83 * clamp(x)) % 1, 0.9, 0.55); return c;
}


// ---------------------------------------------------------------- estudio / luz
export function shadowCatcher(scene, { z = -0.6, opacity = 0.22, size = 80, y = null } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.ShadowMaterial({ opacity, transparent: true }));
  if (y !== null) { m.rotation.x = -Math.PI / 2; m.position.y = y; } else m.position.z = z;
  m.receiveShadow = true; scene.add(m); return m;
}
export function sun(scene, { pos = [3, 6, 10], intensity = 2, color = 0xffffff, shadow = true, size = 8, mapSize = 2048, target = [0, 0, 0], radius = 4, bias = -0.0004 } = {}) {
  const l = new THREE.DirectionalLight(color, intensity); l.position.set(...pos);
  if (shadow) {
    l.castShadow = true; l.shadow.mapSize.set(mapSize, mapSize);
    const c = l.shadow.camera; c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.near = 0.5; c.far = 80;
    l.shadow.radius = radius; l.shadow.bias = bias; l.shadow.normalBias = 0.02;
  }
  l.target.position.set(...target); scene.add(l); scene.add(l.target); return l;
}

// ---------------------------------------------------------------- brilhos
export function starTex() {
  return canvasTex(256, 256, (g, w, h) => {
    const cx = w / 2, cy = h / 2;
    const rg = g.createRadialGradient(cx, cy, 0, cx, cy, w / 2);
    rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.08, 'rgba(255,255,255,0.8)'); rg.addColorStop(0.25, 'rgba(180,220,255,0.15)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'lighter';
    for (const [a, len, wd] of [[0, 1, 3], [Math.PI / 2, 1, 3], [Math.PI / 4, 0.45, 2], [-Math.PI / 4, 0.45, 2]]) {
      g.save(); g.translate(cx, cy); g.rotate(a);
      const lg = g.createLinearGradient(-w / 2 * len, 0, w / 2 * len, 0);
      lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,0.95)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = lg; g.fillRect(-w / 2 * len, -wd / 2, w * len, wd); g.restore();
    }
  });
}
export function softDotTex(color = '255,255,255') {
  return canvasTex(128, 128, (g, w, h) => {
    const rg = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    rg.addColorStop(0, `rgba(${color},1)`); rg.addColorStop(0.35, `rgba(${color},0.45)`); rg.addColorStop(1, `rgba(${color},0)`);
    g.fillStyle = rg; g.fillRect(0, 0, w, h);
  });
}
// glints: [{pos:[x,y,z], t: inicio, len: duracao, size}]
export function glints(parent, list) {
  const tex = starTex();
  const sp = list.map((g) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false })); s.position.set(...g.pos); parent.add(s); return s; });
  return (t) => sp.forEach((s, i) => { const g = list[i]; const k = Math.sin(Math.PI * seg(t, g.t, g.t + (g.len || 0.7))); s.scale.setScalar((g.size || 1.5) * k + 1e-4); s.material.opacity = k; s.material.rotation = t * 0.7 + i; });
}
// raio de luz anamorfico (risco horizontal)
export function streak(parent, { color = 0x9fd8ff, w = 12, h = 0.08 } = {}) {
  const tex = canvasTex(512, 32, (g, ww, hh) => { const lg = g.createLinearGradient(0, 0, ww, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,1)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = lg; g.fillRect(0, 0, ww, hh); const vg = g.createLinearGradient(0, 0, 0, hh); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  parent.add(m); return m;
}
// particulas (bokeh) flutuando
export function bokeh(parent, { n = 120, spread = [30, 18, 20], z = -8, size = 0.25, colors = [0xffffff], seed = 7, opacity = 0.5 } = {}) {
  const r = rng(seed); const tex = softDotTex();
  const group = new THREE.Group(); parent.add(group);
  const items = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: colors[i % colors.length], transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    const base = new THREE.Vector3((r() - 0.5) * spread[0], (r() - 0.5) * spread[1], z + (r() - 0.5) * spread[2]);
    const sc = size * (0.4 + r() * 1.6); m.scale.setScalar(sc); group.add(m); items.push({ m, base, ph: r() * 6.28, sp: 0.2 + r() * 0.5 });
  }
  group.userData.update = (t) => items.forEach((it) => { it.m.position.set(it.base.x + Math.sin(t * it.sp + it.ph) * 0.4, it.base.y + Math.cos(t * it.sp * 0.8 + it.ph) * 0.3 + t * 0.05, it.base.z); it.m.material.opacity = opacity * (0.6 + 0.4 * Math.sin(t * 1.3 + it.ph)); });
  return group;
}

// ---------------------------------------------------------------- cor por vertice
// pinta cada vertice com fn(x,y,z em coordenadas do grupo) -> THREE.Color
export function colorize(meshes, fn) {
  const v = new THREE.Vector3();
  for (const m of meshes) {
    const g = m.geometry; const pos = g.attributes.position; const c = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); v.add(m.position); const k = fn(v.x, v.y, v.z); c[i * 3] = k.r; c[i * 3 + 1] = k.g; c[i * 3 + 2] = k.b; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  }
}
// textura no plano XY da forma (as tampas da extrusao usam UV = x,y)
export function planarMap(tex, x0, y0, w, h) { tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.repeat.set(1 / w, 1 / h); tex.offset.set(-x0 / w, -y0 / h); return tex; }
export function geoUVtoXY(geo) { // UV planar = x,y para qualquer geometria
  const p = geo.attributes.position; const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i); uv[i * 2 + 1] = p.getY(i); }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return geo;
}

// ---------------------------------------------------------------- recorte de poligonos convexos
// poly: [[x,y],...]; mantem o lado onde a*x + b*y + c >= 0
export function clipHalf(poly, a, b, c) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const dp = a * p[0] + b * p[1] + c, dq = a * q[0] + b * q[1] + c;
    if (dp >= 0) out.push(p);
    if ((dp >= 0) !== (dq >= 0)) { const k = dp / (dp - dq); out.push([p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k]); }
  }
  return out;
}
export function circlePoly(r, n = 128, cx = 0, cy = 0) { const o = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; }
// semiplano pela reta que passa por p1->p2, mantendo o lado esquerdo, afastado 'gap'
export function clipLine(poly, p1, p2, gap = 0, keepLeft = true) {
  let a = -(p2[1] - p1[1]), b = p2[0] - p1[0]; const L = Math.hypot(a, b); a /= L; b /= L;
  let c = -(a * p1[0] + b * p1[1]); if (!keepLeft) { a = -a; b = -b; c = -c; }
  return clipHalf(poly, a, b, c - gap);
}
// ponto dentro de forma (com furos)
export function inShape(pt, shapePts, holes = []) {
  const inside = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if (((a.y > p.y) !== (b.y > p.y)) && (p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x)) c = !c; } return c; };
  if (!inside(pt, shapePts)) return false;
  for (const h of holes) if (inside(pt, h)) return false;
  return true;
}

// ---------------------------------------------------------------- fita (ribbon) ao longo de uma curva
export function ribbonGeo(curve, { width = 0.6, segs = 400, up = new THREE.Vector3(0, 0, 1), twist = () => 0, widthFn = () => 1 } = {}) {
  const pos = [], uv = [], idx = [];
  const frames = curve.computeFrenetFrames(segs, false);
  for (let i = 0; i <= segs; i++) {
    const u = i / segs; const p = curve.getPointAt(u); const tn = curve.getTangentAt(u);
    let side = new THREE.Vector3().crossVectors(tn, up).normalize();
    const tw = twist(u); if (tw) side.applyAxisAngle(tn, tw);
    const w = width * widthFn(u) / 2;
    pos.push(p.x - side.x * w, p.y - side.y * w, p.z - side.z * w, p.x + side.x * w, p.y + side.y * w, p.z + side.z * w);
    uv.push(u, 0, u, 1);
    if (i < segs) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// rampa de cores: ramp(['#f00','#0f0','#00f'], 0.5)
export function ramp(colors, t) {
  t = clamp(t) * (colors.length - 1); const i = Math.min(colors.length - 2, Math.floor(t));
  return new THREE.Color(colors[i]).lerp(new THREE.Color(colors[i + 1]), t - i);
}
export const SPECTRUM = ['#e3001b', '#ff6a00', '#ffd400', '#3cc93c', '#00b4e6', '#1f3fd8', '#8a2be2'];

// ---------------------------------------------------------------- legenda (HUD)
let hud = null;
export function setCaption(lines, dark = false) {
  if (hud) { hudScene.remove(hud.group); hud = null; }
  if (!lines) return;
  const tex = canvasTex(1024, 160, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.font = '700 64px AvantGarde'; g.fillStyle = dark ? '#1b1d2a' : '#ffffff'; g.textBaseline = 'alphabetic';
    g.shadowColor = dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)'; g.shadowBlur = 10;
    g.fillText(lines[0], 26, 78);
    g.font = '700 30px AvantGarde'; g.fillStyle = dark ? 'rgba(27,29,42,0.9)' : 'rgba(255,255,255,0.92)';
    if (lines[1]) g.fillText(lines[1], 28, 128);
  });
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthTest: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(512, 80), mat);
  const bar = new THREE.Mesh(new THREE.PlaneGeometry(6, 64), new THREE.MeshBasicMaterial({ color: dark ? 0x1b1d2a : 0xffffff, transparent: true, toneMapped: false, depthTest: false }));
  const group = new THREE.Group(); group.add(mesh); group.add(bar);
  hudScene.add(group);
  hud = { group, mesh, bar, mat };
}
function updateCaption(t, dur) {
  if (!hud) return;
  const a = smooth(seg(t, 0.7, 1.3)) * (1 - smooth(seg(t, dur - 1.2, dur - 0.6)));
  const x = 96 + 40 * (1 - easeOut(seg(t, 0.7, 1.5)));
  hud.mesh.position.set(x + 256 + 14, 120, 0); hud.mat.opacity = a;
  hud.bar.position.set(x, 120, 0); hud.bar.material.opacity = a; hud.bar.scale.y = easeOut(seg(t, 0.6, 1.2));
}

// ---------------------------------------------------------------- ciclo de cena
let current = null;
export const ctx = { renderer, W, H, aspect: W / H };
export async function loadScene(mod) {
  if (current && current.dispose) current.dispose();
  geoCache.clear();
  const def = await mod.build(ctx);
  def.post = Object.assign({ bloom: 0.5, bloomRadius: 0.5, bloomThreshold: 0.85, exposure: 1.0, grain: 0.03, vignette: 0.35, ca: 0.0012, toneMapping: THREE.ACESFilmicToneMapping }, def.post || {});
  current = def;
  setCaption(def.caption || null, !!def.captionDark);
  return { dur: def.dur };
}
export function renderAt(t) {
  const d = current; const p = d.post;
  d.update(t);
  renderPass.scene = d.scene; renderPass.camera = d.camera;
  const pp = d.postAt ? Object.assign({}, p, d.postAt(t)) : p;
  bloomPass.strength = pp.bloom; bloomPass.radius = pp.bloomRadius; bloomPass.threshold = pp.bloomThreshold;
  renderer.toneMapping = pp.toneMapping; renderer.toneMappingExposure = pp.exposure;
  const u = finishPass.uniforms; u.uTime.value = t; u.uGrain.value = pp.grain; u.uVignette.value = pp.vignette; u.uCA.value = pp.ca;
  u.uFade.value = pp.fade || 0; u.uFadeColor.value.set(pp.fadeColor || 0x000000); u.uFlash.value = pp.flash || 0;
  composer.render();
  updateCaption(t, d.dur);
  if (hud && !d.noCaption) { renderer.autoClear = false; const tm = renderer.toneMapping; renderer.toneMapping = THREE.NoToneMapping; renderer.render(hudScene, hudCam); renderer.toneMapping = tm; renderer.autoClear = true; }
}
