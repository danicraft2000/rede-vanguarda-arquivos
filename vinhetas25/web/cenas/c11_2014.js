// 11 ANOS (2014): dois "1" cromados com rastros arco-iris em camadas indo para
// tras e para cima; ANOS e VANGUARDA cromados embaixo, fundo azul-marinho.
import * as E from '../engine.js';
const { THREE } = E;

export async function build(ctx) {
  const dur = ctx.dur;
  const scene = new THREE.Scene();
  scene.background = E.gradientBg([[0, '#2b2d86'], [0.55, '#1c1d5c'], [1, '#0d0d2e']], { radial: true });
  scene.environment = E.envPanels([
    { pos: [0, 4, 14], w: 26, h: 12, grad: ['#ffffff', '#ffffff', '#b8bcc8', '#30343e', '#8a90a0'], i: 1.25 },
    { color: 0xffffff, pos: [0, 10, 0], w: 18, h: 4, i: 2.0 },
    { color: 0xa0b0ff, pos: [-10, 0, 3], w: 2, h: 12, i: 1.2 },
  ], { bg: 0x05060f });
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(-2, 5, 8); scene.add(key);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));

  const root = new THREE.Group(); scene.add(root);
  const chrome = E.M.chrome({ color: 0xf4f6fa, roughness: 0.1 });
  const pal = ['#e5207e', '#ea2a3a', '#ee5a1e', '#f39a1a', '#f6d21c', '#a6d22a', '#3dbf3a', '#1fbf9a', '#1db6d8', '#2496f0', '#2a6cf0', '#2a4af0'];
  const N = 15, S = 5.0;
  const ones = [];
  [-1.55, 1.25].forEach((x0, k) => {
    const g = new THREE.Group(); g.position.set(x0, 0.75, 0); root.add(g);
    const front = E.glyphMesh('1', chrome, { size: S, depth: 0.32, bevel: 0.045, bevelSeg: 4 }); g.add(front);
    const trail = [];
    for (let i = 1; i <= N; i++) {
      const c = E.ramp(pal, (i - 1) / (N - 1));
      const m = E.glyphMesh('1', E.M.plastic(c, { roughness: 0.3, clearcoat: 0.6, emissive: c, emissiveIntensity: 0.25 }), { size: S, depth: 0.28, bevel: 0.02 });
      m.userData.i = i; g.add(m); trail.push(m);
    }
    ones.push({ g, front, trail, k });
  });
  const chromeTxt = E.M.chrome({ color: 0xeef1f8, roughness: 0.28 });
  const anos = E.makeText(E.logo('ANOS'), { size: 0.95, depth: 0.25, bevel: 0.03, material: chromeTxt });
  anos.group.position.set(2.75, -1.75, 0.3); root.add(anos.group);
  const vg = E.makeText(E.logo('VANGUARDA'), { size: 1.05, depth: 0.28, bevel: 0.035, material: chromeTxt });
  vg.group.position.set(0.55, -2.9, 0.3); root.add(vg.group);

  const glint = E.glints(scene, [{ pos: [-2.2, 3.2, 0.6], t: 3.2, size: 1.5 }, { pos: [4.6, -2.6, 0.6], t: 3.8, size: 1.5 }, { pos: [1.6, 3.2, 0.6], t: 4.4, size: 1.2 }]);
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.1, 200);
  function update(t) {
    ones.forEach(({ g, front, trail, k }) => {
      const d = 0.15 + k * 0.25; const e = E.easeOut(E.seg(t, d, d + 1.2), 4);
      front.rotation.y = (1 - e) * Math.PI * 2; g.position.y = 0.75 + (1 - e) * 8;
      const ext = E.easeOut(E.seg(t, d + 0.6, d + 2.1), 3);
      trail.forEach((m) => { const i = m.userData.i; const kk = i * ext; m.position.set(0.105 * kk, 0.13 * kk, -0.3 * kk - 0.01); m.rotation.y = front.rotation.y; m.visible = ext > 0.001; });
    });
    for (const l of anos.letters) { const d = 1.9 + l.userData.idx * 0.07; const e = E.easeOut(E.seg(t, d, d + 0.6)); l.scale.setScalar(Math.max(0.001, e)); }
    for (const l of vg.letters) { const d = 2.1 + l.userData.idx * 0.05; const e = E.easeOut(E.seg(t, d, d + 0.8), 4); const h = l.userData.home; l.position.set(h.x + (1 - e) * 6, h.y, h.z); l.rotation.y = (1 - e) * -1.5; l.visible = e > 0.001; }
    const c = E.easeInOut(E.seg(t, 0, 3.6), 3);
    camera.position.set(E.lerp(3, 0.6, c) + (t - 3.6) * 0.05, E.lerp(-2, -0.2, c), E.lerp(12.5, 15.8, c)); camera.lookAt(0.65, -0.05, 0);
    const o = E.easeIn(E.seg(t, dur - 0.9, dur), 3); root.position.z = o * 8; root.rotation.y = -o * 0.4;
    scene.environmentRotation.y = 0.6 - t * 0.3;
    glint(t);
  }
  return { scene, camera, update, dur, caption: ctx.info.caption,
    post: { bloom: 0.4, bloomRadius: 0.5, bloomThreshold: 0.85, exposure: 1.05 },
    postAt: (t) => ({ flash: 0.8 * E.easeIn(E.seg(t, dur - 0.35, dur), 2) }) };
}
