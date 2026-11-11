// 21 ANOS (2024): o "V" da marca e uma janela recortada numa parede clara; atras dela
// gira um redemoinho de triangulos coloridos. "21" em azul-indigo ao lado.
import * as E from '../engine.js';
const { THREE } = E;

export async function build(ctx) {
  const dur = ctx.dur;
  const BG = 0xe9e9ec;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.environment = E.envStudio(); scene.environmentIntensity = 0.8;
  const key = new THREE.DirectionalLight(0xffffff, 2.0); key.position.set(-2, 4, 6); scene.add(key);
  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const r = E.rng(2024);

  // parede com o V vazado (tres pecas)
  const sc = 1.25, ox = -1.75, oy = 0.05;
  const P = (pts) => pts.map(([x, y]) => [x * sc + ox, y * sc + oy]);
  const vL = P([[-2.0, 1], [-1.45, 1], [-0.2, -1], [-0.75, -1]]);
  const vM = P([[-1.2, 1], [1.2, 1], [0, -0.92]]);
  const vR = P([[1.45, 1], [2.0, 1], [0.75, -1], [0.2, -1]]);
  const wall = E.rectShape(60, 40, 0, 0);
  for (const p of [vL, vM, vR]) wall.holes.push(new THREE.Path(p.slice().reverse().map(([x, y]) => new THREE.Vector2(x, y))));
  const wallGeo = new THREE.ExtrudeGeometry(wall, { depth: 0.35, bevelEnabled: false, curveSegments: 4 });
  const wallMesh = new THREE.Mesh(wallGeo, [new THREE.MeshBasicMaterial({ color: BG, toneMapped: false }), E.M.matte(0xd8d8de, { roughness: 0.6 })]);
  wallMesh.position.z = -0.35; scene.add(wallMesh);

  // redemoinho de triangulos atras da parede
  const vortex = new THREE.Group(); vortex.position.set(ox, oy, -0.6); scene.add(vortex);
  const pal = ['#ff1a2a', '#ff6a10', '#ffcf10', '#4ad21e', '#10b86a', '#10b8e8', '#2a5af0', '#6a2ae8', '#e81aa0', '#ffffff'];
  const tg = new THREE.ShapeGeometry(E.polyShape([[-0.5, -0.29], [0.5, -0.29], [0, 0.58]]));
  const tris = [];
  for (let i = 0; i < 520; i++) {
    const c = new THREE.Color(pal[Math.floor(r() * pal.length)]).multiplyScalar(0.55 + r() * 0.5);
    const m = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
    const z = -0.3 - r() * 10, rad = 0.1 + Math.pow(r(), 0.7) * (3.0 + -z * 0.25), ang = r() * Math.PI * 2;
    m.userData = { z, rad, ang, sp: 0.4 + r() * 0.8, s: 0.15 + r() * 0.45, rot: r() * 6 };
    vortex.add(m); tris.push(m);
  }
  
  const n21 = E.makeText('21', { size: 3.3, depth: 0.25, bevel: 0.015, tracking: -0.02, material: E.M.plastic(0x3a3ab4, { roughness: 0.45 }) });
  n21.group.position.set(3.15, 0.0, 0.05); scene.add(n21.group);

  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.1, 200);
  function update(t) {
    tris.forEach((m) => { const u = m.userData; const a = u.ang + t * u.sp * (1.6 - Math.min(1, t / 3) * 0.8);
      m.position.set(Math.cos(a) * u.rad, Math.sin(a) * u.rad, u.z + ((t * 1.2) % 14 + 14) % 14 * 0); m.rotation.set(t * 0.5 + u.rot, t * 0.7, a + u.rot); m.scale.setScalar(u.s); });
    vortex.rotation.z = -t * 0.3;
    // camera sai de dentro do V (bem perto) e recua
    const c = E.easeInOut(E.seg(t, 0, 3.0), 3);
    camera.position.set(E.lerp(ox + 0.4, 0.2, c), E.lerp(oy + 0.3, 0.05, c), E.lerp(4.2, 14.5, c));
    camera.lookAt(E.lerp(ox, 0.25, c), oy, -1);
    for (const l of n21.letters) { const d = 2.2 + l.userData.idx * 0.15; const e = E.easeOutBack(E.seg(t, d, d + 0.7), 1.5); l.scale.setScalar(Math.max(0.001, e)); l.position.x = l.userData.home.x + (1 - E.easeOut(E.seg(t, d, d + 0.7))) * 2; }
    const o = E.easeIn(E.seg(t, dur - 0.9, dur), 3); camera.position.z -= o * 10; camera.position.x += (ox - 0.2) * o; camera.lookAt(E.lerp(0.25, ox, o), oy, -1);
  }
  return { scene, camera, update, dur, caption: ctx.info.caption, captionDark: true,
    post: { bloom: 0.2, bloomRadius: 0.5, bloomThreshold: 0.95, exposure: 1.0, vignette: 0.15, grain: 0.02, toneMapping: THREE.NeutralToneMapping } };
}
