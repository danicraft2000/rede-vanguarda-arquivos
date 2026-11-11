// 22 ANOS (2025): "22" prateado-branco bem extrudado, em pe num estudio claro,
// com VANGUARDA prateado embaixo; camera gira de lado para frente.
import * as E from '../engine.js';
const { THREE } = E;

export async function build(ctx) {
  const dur = ctx.dur;
  const scene = new THREE.Scene();
  scene.background = E.gradientBg([[0, '#a6a8b0'], [0.45, '#d9dbe0'], [0.75, '#f2f3f5'], [1, '#e4e5e9']], { angle: 90 });
  scene.environment = E.envPanels([
    { pos: [0, 9, 4], w: 22, h: 10, color: 0xffffff, i: 2.2 },
    { pos: [-11, 3, 6], w: 4, h: 12, color: 0xffffff, i: 1.6 },
    { pos: [11, 3, 6], w: 4, h: 12, color: 0xffffff, i: 1.0 },
    { pos: [0, 2, 14], w: 26, h: 10, grad: ['#f8f8fa', '#c8cad0', '#4a4c54'], i: 1.0 },
  ], { bg: 0x60626a });
  const floorY = -2.05;
  E.shadowCatcher(scene, { y: floorY, opacity: 0.32 });
  E.sun(scene, { pos: [-4, 10, 7], intensity: 2.2, size: 8, radius: 8 });
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));

  const root = new THREE.Group(); scene.add(root);
  const silver = new THREE.MeshPhysicalMaterial({ color: 0xf8f9fc, metalness: 0.35, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 });
  const n22 = E.makeText('22', { size: 5.0, depth: 1.3, bevel: 0.07, bevelSeg: 5, curveSeg: 32, tracking: 0.0, material: silver });
  n22.group.position.set(0, floorY + n22.capH / 2 + 1.35, 0); root.add(n22.group);
  const vg = E.makeText(E.logo('VANGUARDA'), { size: 1.12, depth: 0.5, bevel: 0.03, material: new THREE.MeshPhysicalMaterial({ color: 0xd8dae0, metalness: 0.6, roughness: 0.28, clearcoat: 0.6 }) });
  vg.group.position.set(0, floorY + 0.42, 0.9); root.add(vg.group);

  const camera = new THREE.PerspectiveCamera(28, ctx.aspect, 0.1, 200);
  function update(t) {
    n22.letters.forEach((l, i) => { const d = 0.15 + i * 0.25; const e = E.easeOutBack(E.seg(t, d, d + 1.0), 1.2); const h = l.userData.home;
      l.position.set(h.x, h.y + (1 - E.easeOut(E.seg(t, d, d + 1.0), 4)) * 7, h.z); l.rotation.y = (1 - e) * 1.2; });
    for (const l of vg.letters) { const d = 1.4 + l.userData.idx * 0.06; const e = E.easeOut(E.seg(t, d, d + 0.7), 4); const h = l.userData.home; l.position.set(h.x, h.y, h.z + (1 - e) * 5); l.rotation.x = (1 - e) * -1.4; l.visible = e > 0.001; }
    // orbita: de lado (direita) para frente
    const c = E.easeInOut(E.seg(t, 0, 4.2), 3);
    const ang = E.lerp(0.95, 0.05, c) - (t - 4.2) * 0.012, rad = E.lerp(13, 17, c);
    camera.position.set(Math.sin(ang) * rad, E.lerp(0.4, 1.0, c), Math.cos(ang) * rad); camera.lookAt(0, -0.25, 0);
    const o = E.easeIn(E.seg(t, dur - 0.9, dur), 3); camera.position.y += o * 6; camera.lookAt(0, -0.25 + o * 2, 0);
    scene.environmentRotation.y = 0.3 - t * 0.12;
  }
  return { scene, camera, update, dur, caption: ctx.info.caption, captionDark: true,
    post: { bloom: 0.12, bloomRadius: 0.4, bloomThreshold: 0.98, exposure: 1.12, vignette: 0.2, grain: 0.02, toneMapping: THREE.NeutralToneMapping } };
}
