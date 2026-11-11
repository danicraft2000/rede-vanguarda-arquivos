// 3 ANOS (2006) - vinheta perdida, RELEITURA: ponte entre o cromado de 2004/05
// e o fundo branco com letras arco-iris de 2007. O "3" prateado e fatiado em 3 partes
// que giram como um cofre ate alinhar; letras arco-iris ao lado.
import * as E from '../engine.js';
const { THREE } = E;

export async function build(ctx) {
  const dur = ctx.dur;
  ctx.renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  scene.background = E.gradientBg([[0, '#f7f9fc'], [0.55, '#e3e8ef'], [1, '#aeb8c6']], { radial: true });
  scene.environment = E.envPanels([
    { pos: [0, 3, 14], w: 26, h: 12, grad: ['#ffffff', '#f0f4f8', '#7d8794', '#20262e', '#c8d0da'], i: 1.2 },
    { color: 0x000000, pos: [-8, 0, 8], w: 4, h: 14, i: 1 }, { color: 0x000000, pos: [8, 0, 8], w: 3, h: 14, i: 1 },
    { color: 0xffffff, pos: [0, 10, 0], w: 18, h: 6, i: 1.8 },
    { color: 0xff2a3a, pos: [-9, 4, 2], w: 1.0, h: 10, i: 2.2 },
    { color: 0xffd400, pos: [-9, -3, 2], w: 1.0, h: 10, i: 2.2 },
    { color: 0x20c060, pos: [9, 4, 2], w: 1.0, h: 10, i: 2.2 },
    { color: 0x1f6fff, pos: [9, -3, 2], w: 1.0, h: 10, i: 2.2 },
    { color: 0xe8ecf2, pos: [0, -2, -14], w: 30, h: 14, i: 1.0 },
  ], { bg: 0x9aa3ae });
  E.shadowCatcher(scene, { z: -2.2, opacity: 0.06 });
  E.sun(scene, { pos: [-4, 7, 9], intensity: 1.4, size: 7 });
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));

  const root = new THREE.Group(); scene.add(root);
  const silver = E.M.chrome({ color: 0xf2f5fa, roughness: 0.14, side: THREE.DoubleSide });
  // tres fatias do "3": a mesma geometria com planos de recorte diferentes
  const cuts = [-10, -0.75, 0.75, 10];
  const slices = [];
  const threeGroup = new THREE.Group(); threeGroup.position.set(-2.2, 0, 0); root.add(threeGroup);
  for (let k = 0; k < 3; k++) {
    const mat = silver.clone();
    mat.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 1, 0), -cuts[k] - 0.025), new THREE.Plane(new THREE.Vector3(0, -1, 0), cuts[k + 1] - 0.025)];
    const m = E.glyphMesh('3', mat, { size: 5.2, depth: 0.9, bevel: 0.06, bevelSeg: 4, curveSeg: 28 });
    const piv = new THREE.Group(); piv.add(m); threeGroup.add(piv); slices.push(piv);
  }
  // planos de recorte sao em coordenada de mundo: atualizamos com a posicao do grupo
  function updateClip() {
    threeGroup.updateMatrixWorld(true);
    const y0 = threeGroup.getWorldPosition(new THREE.Vector3()).y;
    slices.forEach((s, k) => { const pl = s.children[0].material.clippingPlanes; pl[0].constant = -(y0 + cuts[k]) - 0.025; pl[1].constant = (y0 + cuts[k + 1]) - 0.025; });
  }

  // letras com degrade arco-iris na diagonal
  const txt = E.makeText(E.logo('VAN\nGUAR\nDA'), { size: 1.3, depth: 0.32, bevel: 0.03, align: 'left', lineHeight: 0.86,
    material: E.M.plastic(0xffffff, { vertexColors: true, roughness: 0.4, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.35 }) });
  E.colorize(txt.letters, (x, y) => E.ramp(['#e3001b', '#ff7a00', '#ffd400', '#46c832', '#00a8e8', '#2a3fd0', '#8a2be2'], (x + 2.6 - y * 0.9 + 1.4) / 7.2));
  txt.group.position.set(2.05, 0.35, 0.2); root.add(txt.group);
  const anos = E.makeText(E.logo('ANOS'), { size: 0.6, depth: 0.14, bevel: 0.012, tracking: 0.3, material: E.M.plastic(0x3a4250, { roughness: 0.3, envMapIntensity: 0.6 }) });
  anos.group.position.set(2.05, -2.15, 0.2); root.add(anos.group);

  // aneis de vidro colorido girando atras
  const rings = [];
  ['#ff3048', '#ffc21a', '#1aa8ff'].forEach((c, i) => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(3.0 + i * 0.32, 0.06, 24, 160), E.M.plastic(c, { roughness: 0.1, transmission: 0.3, emissive: new THREE.Color(c), emissiveIntensity: 0.25 }));
    r.position.set(-2.2, 0, -0.6); r.castShadow = true; root.add(r); rings.push(r);
  });

  const glint = E.glints(scene, [{ pos: [-3.6, 2.5, 0.6], t: 3.0, size: 1.6 }, { pos: [-0.6, -2.3, 0.6], t: 3.5, size: 1.3 }, { pos: [4.6, 1.2, 0.4], t: 4.0, size: 1.2 }]);
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.1, 200);
  function update(t) {
    // as fatias giram em sentidos alternados e travam em sequencia
    slices.forEach((s, k) => { const lock = 1.6 + k * 0.35; const p = E.seg(t, 0, lock); const e = E.spring(E.seg(t, lock - 0.9, lock + 1.4) * 1.0, 10, 5.5);
      s.rotation.y = (k % 2 ? -1 : 1) * (1 - E.easeOut(p, 2)) * Math.PI * (3 + k) + (1 - e) * 0.06 * (k % 2 ? 1 : -1); });
    threeGroup.position.z = -6 * (1 - E.easeOut(E.seg(t, 0, 1.4), 3));
    updateClip();
    for (const l of txt.letters) { const d = 1.4 + l.userData.gidx * 0.07; const e = E.easeOutBack(E.seg(t, d, d + 0.7), 1.6); const h = l.userData.home;
      l.position.set(h.x + (1 - e) * 2.5, h.y, h.z); l.scale.setScalar(Math.max(0.001, e)); l.rotation.y = (1 - E.seg(t, d, d + 0.7)) * -1.2; }
    for (const l of anos.letters) { const d = 2.6 + l.userData.idx * 0.07; l.scale.setScalar(Math.max(0.001, E.easeOut(E.seg(t, d, d + 0.5)))); }
    rings.forEach((r, i) => { const e = E.easeOut(E.seg(t, 0.3 + i * 0.25, 2.2 + i * 0.25), 3); r.scale.setScalar(0.2 + 0.8 * e);
      r.rotation.set(1.1 + Math.sin(t * 0.7 + i) * 0.3, t * (0.6 + i * 0.25) + i, 0); r.material.opacity = e; r.material.transparent = true; });
    const c = E.easeInOut(E.seg(t, 0, 3.4), 3);
    camera.position.set(E.lerp(-4.5, 0.4, c) + (t - 3.4) * 0.06, E.lerp(1.8, 0.3, c), E.lerp(11, 14.2, c));
    camera.lookAt(0, -0.05, 0);
    const o = E.easeIn(E.seg(t, dur - 0.9, dur), 3); root.position.x = -o * 3; root.position.z = o * 6;
    scene.environmentRotation.y = -0.5 + t * 0.3;
    glint(t);
  }
  return { scene, camera, update, dur, caption: ctx.info.caption, captionDark: true,
    post: { bloom: 0.2, bloomRadius: 0.4, bloomThreshold: 0.97, exposure: 1.0, vignette: 0.25, grain: 0.02, toneMapping: THREE.NeutralToneMapping },
    dispose: () => { ctx.renderer.localClippingEnabled = false; } };
}
