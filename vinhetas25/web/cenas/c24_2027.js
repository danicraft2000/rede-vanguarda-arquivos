// 24 ANOS (2027) - INEDITA (ainda nao produzida): 24 barras de luz do espectro
// sobem como um equalizador (uma para cada ano) e um "24" de cristal entra na frente,
// refratando as cores. VANGUARDA e ANOS em branco.
import * as E from '../engine.js';
const { THREE } = E;

export async function build(ctx) {
  const dur = ctx.dur;
  const scene = new THREE.Scene();
  scene.background = E.gradientBg([[0, '#101a4a'], [0.5, '#070b24'], [1, '#010208']], { radial: true });
  scene.environment = E.envPanels([
    { pos: [0, 4, 14], w: 26, h: 10, grad: ['#ffffff', '#d8e0ff', '#303860'], i: 1.4 },
    { color: 0xffffff, pos: [0, 10, 0], w: 16, h: 4, i: 2.0 },
    { color: 0xff2a6a, pos: [-10, 0, 0], w: 2, h: 10, i: 2.0 }, { color: 0x2affd0, pos: [10, 0, 0], w: 2, h: 10, i: 2.0 },
  ], { bg: 0x020308 });
  const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(-3, 5, 8); scene.add(key);

  const root = new THREE.Group(); scene.add(root);
  // 24 barras de luz
  const bars = [];
  const N = 24, span = 11.5;
  for (let i = 0; i < N; i++) {
    const c = E.ramp(['#ff1a3a', '#ff7a10', '#ffd21a', '#5ae02a', '#10d0a0', '#10b8ff', '#2a5aff', '#8a2aff', '#ff2ad0'], i / (N - 1));
    const m = new THREE.Mesh(E.extrude([E.rectShape(0.3, 1, 0, 0.5, 0.0)], { depth: 0.1, bevel: 0.0 }), new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(1.8) }));
    m.position.set(-span / 2 + i * span / (N - 1), -3.2, -2.6); m.userData = { i, ph: i * 0.55 }; root.add(m); bars.push(m);
    const refl = m.clone(); refl.material = new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(0.35), transparent: true, opacity: 0.5 }); refl.scale.y = -1; m.userData.refl = refl; refl.position.copy(m.position); root.add(refl);
  }
  // "24" de cristal com dispersao (franjas de arco-iris)
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xeef4ff, metalness: 0, roughness: 0.32, transmission: 1, thickness: 1.6, ior: 1.6, dispersion: 4, iridescence: 0.35, iridescenceIOR: 1.4, specularIntensity: 1, clearcoat: 1, envMapIntensity: 1.3 });
  const n24 = E.makeText('24', { size: 5.6, depth: 1.0, bevel: 0.09, bevelSeg: 5, curveSeg: 28, tracking: -0.03, material: glass });
  n24.group.position.set(0, 0.55, 0); root.add(n24.group);
  const white = E.M.chrome({ color: 0xffffff, roughness: 0.25 });
  const vg = E.makeText(E.logo('VANGUARDA'), { size: 0.95, depth: 0.2, bevel: 0.015, material: white });
  vg.group.position.set(0, -2.55, 0.6); root.add(vg.group);
  const anos = E.makeText(E.logo('ANOS'), { size: 0.5, depth: 0.05, bevel: 0, tracking: 0.6, material: E.M.basic(0xffffff) });
  anos.group.position.set(0, 3.55, 0.3); root.add(anos.group);
  const glint = E.glints(scene, [{ pos: [-2.6, 2.9, 1.2], t: 3.2, size: 1.8 }, { pos: [2.9, -0.7, 1.2], t: 3.8, size: 1.5 }]);

  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.1, 200);
  function update(t) {
    bars.forEach((m) => { const u = m.userData; const rise = E.easeOutBack(E.seg(t, 0.1 + u.i * 0.04, 0.9 + u.i * 0.04), 1.6);
      const eq = 0.65 + 0.35 * Math.sin(t * 3.1 + u.ph) * Math.sin(t * 1.7 + u.ph * 0.7);
      const hgt = Math.max(0.001, rise * (2.2 + 4.2 * Math.pow(Math.sin(Math.PI * (u.i + 0.5) / N), 0.8) * eq) * (1 - E.easeIn(E.seg(t, dur - 0.8, dur), 2)));
      m.scale.y = hgt; u.refl.scale.y = -hgt * 0.45; });
    n24.letters.forEach((l, i) => { const d = 1.0 + i * 0.25; const e = E.easeOut(E.seg(t, d, d + 1.4), 4); const h = l.userData.home;
      l.position.set(h.x + (1 - e) * (i ? 9 : -9), h.y, h.z + (1 - e) * 3); l.rotation.y = (1 - e) * (i ? -2.5 : 2.5) + Math.sin(t * 0.8 + i) * 0.06; });
    for (const l of vg.letters) { const d = 2.3 + l.userData.idx * 0.05; const e = E.easeOut(E.seg(t, d, d + 0.6)); l.scale.setScalar(Math.max(0.001, e)); }
    for (const l of anos.letters) { const d = 2.6 + l.userData.idx * 0.08; l.scale.setScalar(Math.max(0.001, E.easeOut(E.seg(t, d, d + 0.4)))); }
    const c = E.easeInOut(E.seg(t, 0, 4), 3);
    camera.position.set(E.lerp(-2, 0.3, c) + (t - 4) * 0.05, E.lerp(-1.2, 0.2, c), E.lerp(13, 15.5, c)); camera.lookAt(0, 0.3, 0);
    scene.environmentRotation.y = t * 0.35;
    const o = E.easeIn(E.seg(t, dur - 0.9, dur), 3); n24.group.position.z = o * 8; vg.group.position.z = 0.6 + o * 8;
    glint(t);
  }
  return { scene, camera, update, dur, caption: ctx.info.caption,
    post: { bloom: 0.7, bloomRadius: 0.6, bloomThreshold: 0.7, exposure: 1.05 },
    postAt: (t) => ({ flash: 0.9 * E.easeIn(E.seg(t, dur - 0.35, dur), 2) }) };
}
