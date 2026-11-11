// 25 ANOS (2028) - GRANDE FINAL: mosaico de 25 placas coloridas (uma para cada ano,
// de 2004 a 2028), "25" branco gigante com sombra e VANGUARDA no topo.
import * as E from '../engine.js';
const { THREE } = E;

export const GRID = [ // cores do mosaico original (linha a linha)
  ['#e010d8', '#f08a2c', '#2070c0', '#e01e28', '#a0551e'],
  ['#f8e440', '#e01e28', '#9cc23a', '#f08a2c', '#8a18e0'],
  ['#78bce8', '#20a070', '#0a3cf0', '#e010d8', '#2070c0'],
  ['#e010d8', '#a0551e', '#e01e28', '#20a070', '#78bce8'],
  ['#e01e28', '#2070c0', '#f08a2c', '#8a18e0', '#9cc23a'],
];

export async function build(ctx) {
  const dur = ctx.dur;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);
  scene.environment = E.envStudio(); scene.environmentIntensity = 0.55;
  const sunL = E.sun(scene, { pos: [-4, 6, 12], intensity: 2.2, size: 10, radius: 6, mapSize: 2048 });
  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const r = E.rng(2028);

  const TW = 3.1, TH = 1.95, gap = 0.0;
  const root = new THREE.Group(); scene.add(root);
  const tiles = [];
  const tileGeo = E.extrude([E.rectShape(TW - 0.02, TH - 0.02, 0, 0, 0.02)], { depth: 0.25, bevel: 0.01, bevelSeg: 2 });
  const yearMat = E.M.basic(0xffffff, { transparent: true });
  for (let row = 0; row < 5; row++) for (let col = 0; col < 5; col++) {
    const i = row * 5 + col;
    const g = new THREE.Group();
    const m = new THREE.Mesh(tileGeo, E.M.plastic(GRID[row][col], { roughness: 0.5, clearcoat: 0.25 })); m.receiveShadow = true; g.add(m);
    const yr = E.makeText(String(2004 + i), { size: 0.42, depth: 0.01, bevel: 0, tracking: 0.08, material: yearMat }); yr.group.position.z = 0.14; g.add(yr.group);
    g.userData = { home: new THREE.Vector3((col - 2) * (TW + gap), (2 - row) * (TH + gap), 0), i, row, col, yr: yr.group, d: 0.25 + (row + col) * 0.11 + r() * 0.08 };
    root.add(g); tiles.push(g);
  }
  // "25" e VANGUARDA brancos com sombra projetada nas placas
  const white = E.M.plastic(0xf6f7fb, { roughness: 0.35, clearcoat: 0.6 });
  const n25 = E.makeText('25', { size: 8.2, depth: 0.6, bevel: 0.04, bevelSeg: 3, tracking: -0.02, material: white });
  n25.group.position.set(0.15, -1.25, 1.1); root.add(n25.group);
  const vg = E.makeText(E.logo('VANGUARDA'), { size: 1.85, depth: 0.35, bevel: 0.02, material: white });
  vg.group.position.set(0.0, 3.85, 0.9); root.add(vg.group);
  const datas = E.makeText('2003  ·  2028', { size: 0.42, depth: 0.03, bevel: 0, tracking: 0.35, material: E.M.basic(0xffffff, { transparent: true }) });
  datas.group.position.set(0, -5.6, 1.2); root.add(datas.group);

  // confete
  const conf = [];
  const cg = new THREE.PlaneGeometry(0.16, 0.1);
  const flat = GRID.flat();
  for (let i = 0; i < 260; i++) {
    const m = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ color: flat[i % flat.length], side: THREE.DoubleSide, roughness: 0.5, emissive: new THREE.Color(flat[i % flat.length]).multiplyScalar(0.3) }));
    m.userData = { x: (r() - 0.5) * 20, y0: 8 + r() * 14, z: 1.5 + r() * 5, v: 0.9 + r() * 1.2, sp: r() * 8, ph: r() * 6 };
    scene.add(m); conf.push(m);
  }
  const glint = E.glints(scene, [{ pos: [-4.6, 3.0, 2], t: 6.2, size: 2.0 }, { pos: [5.0, 1.6, 2], t: 7.0, size: 2.2 }, { pos: [-1.0, -4.3, 2], t: 7.9, size: 1.6 }, { pos: [4.1, 4.4, 2], t: 10.5, size: 2.0 }, { pos: [-5.5, -2.5, 2], t: 11.4, size: 1.8 }]);

  const camera = new THREE.PerspectiveCamera(32, ctx.aspect, 0.1, 300);
  function update(t) {
    // placas: viram de costas (mostrando o ano) e assentam em onda
    tiles.forEach((g) => { const u = g.userData; const p = E.seg(t, u.d, u.d + 1.2); const e = E.easeOut(p, 4);
      const hit = 4.0; const wave = Math.max(0, Math.sin(Math.PI * E.seg(t, hit + Math.hypot(u.col - 2, u.row - 2) * 0.06, hit + 0.5 + Math.hypot(u.col - 2, u.row - 2) * 0.06)));
      g.position.set(u.home.x * (1 + (1 - e) * 0.4), u.home.y * (1 + (1 - e) * 0.4) + (1 - e) * 4, (1 - e) * -20 - wave * 0.8 + Math.sin(t * 1.2 + u.i) * 0.04 * E.seg(t, 6, 8));
      g.rotation.set((1 - e) * Math.PI * 1.0, (1 - e) * (u.col - 2) * 0.4, 0);
      u.yr.visible = t < 4.4; yearMat.opacity = 1 - E.smooth(E.seg(t, 3.6, 4.2)); });
    // o "25" chega de frente e bate (onda nas placas)
    const s = E.seg(t, 3.3, 4.0); const e25 = E.easeIn(s, 2);
    n25.group.position.z = E.lerp(28, 1.1, e25) + (t > 4.0 ? Math.sin((t - 4.0) * 20) * Math.exp(-(t - 4.0) * 8) * 0.25 : 0); n25.group.visible = t > 3.3;
    for (const l of vg.letters) { const d = 4.5 + l.userData.idx * 0.06; const k = E.easeOutBack(E.seg(t, d, d + 0.6), 1.7); l.scale.setScalar(Math.max(0.001, k)); l.position.y = l.userData.home.y + (1 - E.easeOut(E.seg(t, d, d + 0.6))) * 1.2; }
    for (const l of datas.letters) { const d = 9.0 + l.userData.idx * 0.04; l.scale.setScalar(Math.max(0.001, E.easeOut(E.seg(t, d, d + 0.5)))); }
    conf.forEach((m) => { const u = m.userData; const tt = t - 4.1; const vis = tt > 0; m.visible = vis; if (!vis) return;
      m.position.set(u.x + Math.sin(tt * 1.3 + u.ph) * 0.5, u.y0 - tt * u.v * 2.0 - 4, u.z); m.rotation.set(tt * u.sp, tt * u.sp * 0.7, u.ph); });
    // camera: de longe e de lado -> frente; depois respira e se afasta no fim
    const c = E.easeInOut(E.seg(t, 0, 5.0), 3);
    const ang = E.lerp(-0.5, 0, c) + Math.sin(t * 0.35) * 0.03 * E.seg(t, 5, 7);
    const dist = E.lerp(30, 20.5, c) - E.easeInOut(E.seg(t, 5, 12)) * 0.6 + E.easeInOut(E.seg(t, 12.5, dur)) * 6;
    camera.position.set(Math.sin(ang) * dist, E.lerp(-3, 0, c), Math.cos(ang) * dist); camera.lookAt(0, -0.2, 0);
    glint(t);
  }
  return { scene, camera, update, dur, caption: ctx.info.caption,
    post: { bloom: 0.2, bloomRadius: 0.5, bloomThreshold: 0.92, exposure: 1.0, toneMapping: THREE.NeutralToneMapping },
    postAt: (t) => ({ flash: Math.max(0.9 * Math.exp(-Math.max(0, t - 4.0) * 7) * (t > 4.0 ? 1 : 0), 0.9 * E.easeIn(E.seg(t, dur - 0.5, dur), 2)) }) };
}
