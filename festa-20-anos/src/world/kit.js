// Kit de modelagem: materiais, lote de geometrias estáticas (menos draw calls), primitivas e placas.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { blobTex, canvasTex } from '../lib/textures.js';

export { THREE };
const _o = new THREE.Object3D();

export function std(color, o = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...o }); }
export function basic(color, o = {}) { return new THREE.MeshBasicMaterial({ color, ...o }); }
export function glow(color, intensity = 2) { const c = new THREE.Color(color).multiplyScalar(intensity); return new THREE.MeshBasicMaterial({ color: c, toneMapped: false }); }

export const M = {
  chrome: std('#e9edf3', { metalness: 1, roughness: 0.16 }),
  silver: std('#c9ced6', { metalness: 0.85, roughness: 0.3 }),
  steel: std('#b8bec6', { metalness: 0.9, roughness: 0.38 }),
  black: std('#111214', { roughness: 0.55 }),
  blackGloss: std('#0c0c0e', { roughness: 0.18, metalness: 0.2 }),
  truss: std('#18191b', { roughness: 0.5, metalness: 0.6 }),
  white: std('#f1efea', { roughness: 0.75 }),
  wall: std('#e6e3dc', { roughness: 0.9 }),
  gray: std('#8c9094', { roughness: 0.8 }),
  darkGray: std('#3b3f44', { roughness: 0.7 }),
  glass: new THREE.MeshPhysicalMaterial({ color: '#dff3ff', metalness: 0, roughness: 0.05, transmission: 0, transparent: true, opacity: 0.18, envMapIntensity: 1.5, depthWrite: false }),
  cloth: std('#f7f6f2', { roughness: 0.95 }),
  plastic: std('#1d1e21', { roughness: 0.45 }),
};

// Agrupa geometrias estáticas por material e funde tudo no final (performance no SwiftShader)
export class Batch {
  constructor(group) { this.group = group; this.items = new Map(); }
  add(geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1]) {
    _o.position.set(...pos); _o.rotation.set(...rot); _o.scale.set(...scl); _o.updateMatrix();
    return this.addM(geo, mat, _o.matrix);
  }
  addM(geo, mat, matrix) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(matrix);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!this.items.has(mat)) this.items.set(mat, []);
    this.items.get(mat).push(g);
    return this;
  }
  flush() {
    for (const [mat, list] of this.items) {
      const m = new THREE.Mesh(mergeGeometries(list), mat);
      m.matrixAutoUpdate = false; m.updateMatrix();
      this.group.add(m);
    }
    this.items.clear();
  }
}

const GEO = new Map();
const cached = (k, f) => (GEO.has(k) ? GEO.get(k) : (GEO.set(k, f()), GEO.get(k)));
export const unitBox = () => cached('box', () => new THREE.BoxGeometry(1, 1, 1));
export const unitCyl = (n = 24) => cached('cyl' + n, () => new THREE.CylinderGeometry(0.5, 0.5, 1, n));
export const unitSphere = (n = 16) => cached('sph' + n, () => new THREE.SphereGeometry(0.5, n, Math.max(8, n >> 1)));
export const roundBox = (w, h, d, r = 0.05, s = 3) => cached(`rb${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, s, r));

// caixa em coordenadas de canto: x0..x1, y0..y1, z0..z1
export function boxAt(b, mat, x0, x1, y0, y1, z0, z1) {
  return b.add(unitBox(), mat, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [0, 0, 0], [Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)]);
}
export function box(b, mat, w, h, d, x, y, z, ry = 0) { return b.add(unitBox(), mat, [x, y, z], [0, ry, 0], [w, h, d]); }
export function cyl(b, mat, r, h, x, y, z, n = 24, rot = [0, 0, 0]) { return b.add(unitCyl(n), mat, [x, y, z], rot, [r * 2, h, r * 2]); }

// sombra de contato (mancha escura no chão)
let BLOB_M;
export function blob(b, x, z, w, d = w, y = 0.012) {
  BLOB_M ??= new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  return b.add(cached('plane', () => new THREE.PlaneGeometry(1, 1)), BLOB_M, [x, y, z], [-Math.PI / 2, 0, 0], [w, d, 1]);
}

// plano com textura (placas, quadros, telas). emissive = brilha (telas de LED)
export function panel(group, tex, w, h, pos, rotY = 0, { emissive = false, intensity = 1, rough = 0.5, transparent = false, side = THREE.FrontSide } = {}) {
  const mat = emissive
    ? new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(intensity, intensity, intensity), toneMapped: false, transparent, side })
    : new THREE.MeshStandardMaterial({ map: tex, roughness: rough, transparent, side });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(...pos); m.rotation.y = rotY;
  group.add(m);
  return m;
}

// textura de placa com título e subtítulo
export function signTex(title, sub = '', { w = 1024, h = 256, bg = '#111216', fg = '#ffffff', accent = true, titleSize = 110, subSize = 46, font = 'AvantGarde' } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    if (accent) {
      const grd = g.createLinearGradient(0, 0, w, 0);
      ['#ff2d8a', '#ff1a1a', '#ff7a00', '#ffd400', '#3ad83a', '#00c8d8', '#1e6cff', '#5a2dff', '#c000ff'].forEach((c, i) => grd.addColorStop(i / 8, c));
      g.fillStyle = grd; g.fillRect(0, h - h * 0.07, w, h * 0.07);
    }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    let s = titleSize; g.font = `700 ${s}px ${font}`;
    while (g.measureText(title).width > w * 0.92 && s > 10) { s -= 2; g.font = `700 ${s}px ${font}`; }
    g.fillText(title, w / 2, sub ? h * 0.4 : h * 0.47);
    if (sub) { g.font = `500 ${subSize}px Inter`; g.globalAlpha = 0.85; g.fillText(sub, w / 2, h * 0.74); g.globalAlpha = 1; }
  });
}

export function loadTex(url, srgb = true) {
  return new Promise((res, rej) => new THREE.TextureLoader().load(url, (t) => { if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; res(t); }, undefined, rej));
}
export function loadImg(url) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; }); }
