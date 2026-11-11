// ENCERRAMENTO: o logotipo cromado de 2004 volta, agora com "25 ANOS" em arco-iris,
// fechando o ciclo. Agradecimento e fade para preto.
import * as E from '../engine.js';
const { THREE } = E;

export async function build(ctx) {
  const dur = ctx.dur;
  const scene = new THREE.Scene();
  scene.background = E.gradientBg([[0, '#000000'], [0.5, '#02030f'], [0.85, '#0d0f6a'], [1, '#2023b8']], { angle: 90 });
  scene.environment = E.envPanels([
    { pos: [0, 4, 14], w: 26, h: 12, grad: ['#ffffff', '#e6fbff', '#a9c6d2', '#4a6472', '#c4e9f7'], i: 1.25 },
    { color: 0xffffff, pos: [0, 10, 2], w: 16, h: 4, i: 1.8 },
    { color: 0xff3fa0, pos: [7, 5, -4], w: 1.0, h: 9, i: 3.0 }, { color: 0xffe14a, pos: [-7, -5, -4], w: 1.0, h: 9, i: 3.0 },
    { color: 0x2affd5, pos: [0, -9, 4], w: 12, h: 1.0, i: 2.5 }, { color: 0x1a2cff, pos: [0, -6, -8], w: 16, h: 4, i: 1.4 },
  ], { bg: 0x03040c });
  const key = new THREE.DirectionalLight(0xffffff, 1.0); key.position.set(-3, 5, 8); scene.add(key);

  const root = new THREE.Group(); scene.add(root);
  const ice = E.M.chrome({ color: 0xd7f1f2, roughness: 0.2, iridescence: 1, iridescenceIOR: 2.0, iridescenceThicknessRange: [300, 1000] });
  const logo = E.makeText(E.logo('VAN\nGUAR\nDA'), { size: 1.25, depth: 0.4, bevel: 0.034, bevelSeg: 4, align: 'right', lineHeight: 0.86, material: ice });
  logo.group.position.set(-2.4, 0.55, 0); root.add(logo.group);
  const n25 = E.makeText('25', { size: 3.6, depth: 0.5, bevel: 0.04, bevelSeg: 4, tracking: -0.03, material: E.M.plastic(0xffffff, { vertexColors: true, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.5 }) });
  n25.group.position.set(2.35, 0.95, 0); root.add(n25.group);
  E.colorize(n25.letters, (x, y) => E.ramp(['#ff1a3a', '#ff7a10', '#ffd21a', '#5ae02a', '#10b8ff', '#2a5aff', '#8a2aff', '#ff2ad0'], (x + 2.2 - y * 0.6 + 1) / 5.2));
  const anos = E.makeText(E.logo('ANOS'), { size: 0.85, depth: 0.2, bevel: 0.02, tracking: 0.35, material: ice });
  anos.group.position.set(2.35, -1.15, 0); root.add(anos.group);
  const thanks = E.makeText('OBRIGADO POR FAZER PARTE DESSA HISTÓRIA', { size: 0.34, depth: 0.02, bevel: 0, tracking: 0.22, material: E.M.basic(0xffffff, { transparent: true }) });
  thanks.group.position.set(0, -2.75, 0.2); root.add(thanks.group);
  const yrs = E.makeText('2003  —  2028', { size: 0.28, depth: 0.02, bevel: 0, tracking: 0.4, material: E.M.basic(0xbfd8ff, { transparent: true }) });
  yrs.group.position.set(0, -3.35, 0.2); root.add(yrs.group);
  const glint = E.glints(scene, [{ pos: [-5.0, 1.75, 0.5], t: 2.6, size: 1.6 }, { pos: [4.3, 2.2, 0.5], t: 3.3, size: 2.0 }, { pos: [-1.4, -1.0, 0.5], t: 4.0, size: 1.4 }, { pos: [3.7, -1.0, 0.5], t: 6.2, size: 1.4 }]);
  const bok = E.bokeh(scene, { n: 80, z: -10, spread: [36, 20, 8], size: 0.35, colors: [0x6fd8ff, 0xffffff, 0xff7ad0, 0xffe070], opacity: 0.3 });

  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.1, 200);
  function update(t) {
    for (const l of logo.letters) { const d = 0.2 + l.userData.line * 0.2 + l.userData.idx * 0.07; const e = E.easeOut(E.seg(t, d, d + 1.3), 4); const h = l.userData.home;
      l.position.set(h.x - (1 - e) * 3, h.y + (1 - e) * 1.2, (1 - e) * -18); l.rotation.set((1 - e) * 1.2, (1 - e) * -2.4, 0); }
    n25.letters.forEach((l, i) => { const d = 0.9 + i * 0.2; const e = E.easeOutBack(E.seg(t, d, d + 0.9), 1.4); l.scale.setScalar(Math.max(0.001, e)); l.rotation.y = (1 - E.easeOut(E.seg(t, d, d + 1.0))) * Math.PI * 2; });
    for (const l of anos.letters) { const d = 1.6 + l.userData.idx * 0.08; l.scale.setScalar(Math.max(0.001, E.easeOut(E.seg(t, d, d + 0.5)))); }
    thanks.letters.forEach((l, i) => { const d = 2.6 + i * 0.025; l.scale.setScalar(Math.max(0.001, E.easeOut(E.seg(t, d, d + 0.4)))); });
    for (const l of yrs.letters) { const d = 3.6 + l.userData.idx * 0.03; l.scale.setScalar(Math.max(0.001, E.easeOut(E.seg(t, d, d + 0.4)))); }
    const c = E.easeInOut(E.seg(t, 0, 3.0), 3);
    camera.position.set(E.lerp(-2.5, 0.0, c) + (t - 3) * 0.03, E.lerp(-1, -0.2, c), E.lerp(11, 14.2, c) + (t - 3) * 0.12); camera.lookAt(0, -0.25, 0);
    scene.environmentRotation.y = -0.6 + t * 0.22;
    glint(t); bok.userData.update(t);
  }
  return { scene, camera, update, dur,
    post: { bloom: 0.45, bloomRadius: 0.6, bloomThreshold: 0.8, exposure: 1.05 },
    postAt: (t) => ({ fade: Math.max(1 - E.smooth(E.seg(t, 0, 0.5)), E.smooth(E.seg(t, dur - 1.8, dur - 0.2))) }) };
}
