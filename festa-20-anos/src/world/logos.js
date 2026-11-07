// Logotipos da Rede Vanguarda modelados em 3D.
import * as THREE from 'three';
import { text3D } from '../lib/brand.js';
import { lerp } from '../lib/util.js';

const RING_COLORS = ['#3a1fe0', '#2a52ff', '#2b8ee8', '#1fc7d4', '#1fd84a', '#e8e81c', '#ffb31a', '#ff7a1a', '#ff3b30', '#ff2d8a'];

// ----- Anel 2003: cilindro prateado com recorte em "V" e degraus arco-íris por dentro -----
export function ring2003({ R = 1, h = 1.05, th = 0.13 } = {}) {
  const grp = new THREE.Group();
  const aTop = 0.62, aBot = 0.105;           // meia-abertura do "V" (rad) no topo e na base
  const NU = 120, NV = 16;
  const pos = [], nor = [], idx = [];
  const push = (p, n) => { pos.push(...p); nor.push(...n); return pos.length / 3 - 1; };
  const ang = (v) => lerp(aBot, aTop, v);
  // superfície externa e interna
  for (const side of [1, -1]) {
    const r = side > 0 ? R : R - th, base = pos.length / 3;
    for (let j = 0; j <= NV; j++) {
      const v = j / NV, y = v * h - h / 2, a = ang(v);
      for (let i = 0; i <= NU; i++) {
        const th2 = a + (Math.PI * 2 - 2 * a) * (i / NU);
        push([r * Math.sin(th2), y, r * Math.cos(th2)], [side * Math.sin(th2), 0, side * Math.cos(th2)]);
      }
    }
    for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
      const a = base + j * (NU + 1) + i, b = a + 1, c = a + NU + 1, d = c + 1;
      if (side > 0) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
    }
  }
  // faces do corte (as faixas inclinadas mais claras do logo)
  for (const s of [1, -1]) {
    const base = pos.length / 3;
    for (let j = 0; j <= NV; j++) {
      const v = j / NV, y = v * h - h / 2, a = s > 0 ? ang(v) : Math.PI * 2 - ang(v);
      const n = [s * Math.cos(a) * -1, 0, s * Math.sin(a)];       // tangente para fora do recorte
      push([R * Math.sin(a), y, R * Math.cos(a)], [-n[0], 0, -n[2]]);
      push([(R - th) * Math.sin(a), y, (R - th) * Math.cos(a)], [-n[0], 0, -n[2]]);
    }
    for (let j = 0; j < NV; j++) { const a = base + j * 2; if (s > 0) idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); else idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  // tampa de cima e de baixo (anel)
  for (const [y, a, up] of [[h / 2, aTop, 1], [-h / 2, aBot, -1]]) {
    const base = pos.length / 3;
    for (let i = 0; i <= NU; i++) {
      const t = a + (Math.PI * 2 - 2 * a) * (i / NU);
      push([R * Math.sin(t), y, R * Math.cos(t)], [0, up, 0]);
      push([(R - th) * Math.sin(t), y, (R - th) * Math.cos(t)], [0, up, 0]);
    }
    for (let i = 0; i < NU; i++) { const k = base + i * 2; if (up > 0) idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); else idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setIndex(idx);
  const shellMat = new THREE.MeshStandardMaterial({ color: '#dfe4ec', metalness: 0.92, roughness: 0.24, side: THREE.DoubleSide });
  grp.add(new THREE.Mesh(geo, shellMat));
  // degraus arco-íris (funil) por dentro
  const n = RING_COLORS.length;
  for (let k = 0; k < n; k++) {
    const y = h / 2 - 0.05 - k * (h * 0.86 / n);
    const r = lerp(R - th - 0.03, R * 0.3, k / (n - 1));
    const col = new THREE.Color(RING_COLORS[k]);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.985, h * 0.62 / n, 64, 1, true),
      new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.4, roughness: 0.35, side: THREE.DoubleSide }));
    band.position.y = y; grp.add(band);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 6, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').multiplyScalar(1.15), toneMapped: false }));
    lip.rotation.x = Math.PI / 2; lip.position.y = y + h * 0.31 / n; grp.add(lip);
    const shelf = new THREE.Mesh(new THREE.RingGeometry(r * 0.9, r, 64), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.25, side: THREE.DoubleSide }));
    shelf.rotation.x = -Math.PI / 2; shelf.position.y = y - h * 0.31 / n; grp.add(shelf);
  }
  const floor = new THREE.Mesh(new THREE.CircleGeometry(R * 0.3, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.6, 1.7), toneMapped: false }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -h / 2 + 0.01; grp.add(floor);
  return grp;
}

// ----- Cone 1998: cone prateado invertido com fenda e bordas arco-íris -----
export function cone1998({ R = 1, H = 1.7 } = {}) {
  const grp = new THREE.Group();
  const gap = 0.32, start = Math.PI * 0.5 + 0.45;   // fenda virada para a frente-esquerda
  const outer = new THREE.Mesh(new THREE.ConeGeometry(R, H, 128, 8, true, start + gap, Math.PI * 2 - gap),
    new THREE.MeshStandardMaterial({ color: '#e3e7ee', metalness: 0.95, roughness: 0.2, side: THREE.DoubleSide }));
  outer.rotation.x = Math.PI; grp.add(outer);
  const inner = new THREE.Mesh(new THREE.ConeGeometry(R * 0.965, H * 0.965, 128, 8, true, start + gap, Math.PI * 2 - gap),
    new THREE.MeshStandardMaterial({ color: '#8d939c', metalness: 0.9, roughness: 0.3, side: THREE.BackSide }));
  inner.rotation.x = Math.PI; inner.position.y = H * 0.0175; grp.add(inner);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R * 0.985, 0.022 * R, 8, 128, Math.PI * 2 - gap), new THREE.MeshStandardMaterial({ color: '#f2f4f8', metalness: 1, roughness: 0.12 }));
  rim.rotation.x = -Math.PI / 2; rim.rotation.z = -(start + gap) + Math.PI / 2; rim.position.y = H / 2; grp.add(rim);
  // bordas da fenda com gradiente arco-íris (fitas finas do aro até a ponta)
  // ConeGeometry: x = r*sin(theta), z = r*cos(theta). Após girar 180° em X, z inverte.
  const thA = start + gap, thB = start + Math.PI * 2;
  const mk = (th, colors, flip) => {
    const N = 40, w = 0.13 * R, pos = [], col = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, y = H / 2 - u * H, r = R * (1 - u) * 1.006;
      const x = r * Math.sin(th), z = -r * Math.cos(th);
      const tx = Math.cos(th) * flip, tz = Math.sin(th) * flip;
      const c = new THREE.Color(); const f = u * (colors.length - 1), k = Math.min(colors.length - 2, Math.floor(f));
      c.lerpColors(new THREE.Color(colors[k]), new THREE.Color(colors[k + 1]), f - k).multiplyScalar(1.7);
      const ww = w * (1 - u * 0.8);
      pos.push(x, y, z, x + tx * ww, y, z + tz * ww);
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
    return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, toneMapped: false }));
  };
  grp.add(mk(thA, ['#ff2d8a', '#ff1a1a', '#ff7a00', '#ffd400'], -1));
  grp.add(mk(thB, ['#ffd400', '#3ad83a', '#00c8d8', '#1e6cff', '#5a2dff'], 1));
  grp.userData.height = H;
  return grp;
}

// ----- Letras cromadas "VAN / GUAR / DA" inclinadas (vinhetas e estúdio) -----
export function vanguardaLetters({ size = 1, depth = 0.3, mat = null, tv = false } = {}) {
  const grp = new THREE.Group();
  const m = mat ?? new THREE.MeshStandardMaterial({ color: '#e8ecf2', metalness: 1, roughness: 0.17 });
  const lines = [['VAN', 0.0, 0], ['GUAR', -0.12, -1.02], ['DA', 1.15, -2.04]];
  for (const [txt, dx, dy] of lines) {
    const g = text3D(txt, size, depth); g.translate(0, 0, -depth / 2);
    const mesh = new THREE.Mesh(g, m); mesh.position.set(dx * size, dy * size, 0); grp.add(mesh);
  }
  if (tv) { const g = text3D('TV', size * 0.8, depth); const t = new THREE.Mesh(g, m); t.position.set(-1.55 * size, 0.1 * size, 0); grp.add(t); }
  // centraliza e inclina ~27° (como na marca)
  const bb = new THREE.Box3().setFromObject(grp), c = bb.getCenter(new THREE.Vector3());
  grp.children.forEach((ch) => ch.position.sub(c));
  const wrap = new THREE.Group(); wrap.add(grp); grp.rotation.z = 0.47;
  return wrap;
}
