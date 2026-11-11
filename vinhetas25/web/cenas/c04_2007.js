// 4 ANOS (2007): fundo branco, disco prateado recortado formando um "4"
// e VAN/GUAR/DA em degrade arco-iris na frente.
import * as E from '../engine.js';
const { THREE } = E;

export async function build(ctx) {
  const dur = ctx.dur;
  const scene = new THREE.Scene();
  scene.background = E.gradientBg([[0, '#ffffff'], [0.7, '#f4f5f7'], [1, '#dfe2e7']], { radial: true });
  scene.backgroundIntensity = 1.0;
  scene.environment = E.envPanels([
    { pos: [0, 3, 14], w: 28, h: 14, grad: ['#ffffff', '#eef2f6', '#8a94a0', '#2e353d', '#d0d7df'], i: 1.25 },
    { color: 0xffffff, pos: [0, 10, 0], w: 20, h: 6, i: 2.0 },
    { color: 0xffffff, pos: [-10, 0, 4], w: 2, h: 14, i: 1.4 },
    { color: 0xdfe8f5, pos: [0, -3, -14], w: 30, h: 14, i: 1.0 },
  ], { bg: 0xd0d6dd });
  E.shadowCatcher(scene, { z: -0.5, opacity: 0.18 });
  E.sun(scene, { pos: [-3, 6, 10], intensity: 1.2, size: 6 });
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));

  const root = new THREE.Group(); scene.add(root);
  // pedacos do disco: circulo cortado por retas que desenham o "4"
  const R = 2.75, g = 0.1;
  const C = E.circlePoly(R, 160);
  const P = { // pontos do "4" (em unidades do disco)
    diagA: [-2.05, -0.55], diagB: [0.62, 2.6],  // perna inclinada
    stemL: 0.62, stemR: 1.45,                  // haste vertical
    barT: -0.55, barB: -1.3,                     // barra horizontal
  };
  const pieces = [];
  const add = (poly) => { if (poly.length > 2) pieces.push(poly); };
  const above = (p, y) => E.clipHalf(p, 0, 1, -(y + g / 2));
  const below = (p, y) => E.clipHalf(p, 0, -1, (y - g / 2));
  const leftOf = (p, x) => E.clipHalf(p, -1, 0, (x - g / 2));
  const rightOf = (p, x) => E.clipHalf(p, 1, 0, -(x + g / 2));
  const leftDiag = (p) => E.clipLine(p, P.diagA, P.diagB, g / 2, true);
  const rightDiag = (p) => E.clipLine(p, P.diagA, P.diagB, g / 2, false);
  add(leftDiag(leftOf(above(C, P.barT), P.stemL)));            // fora, em cima a esquerda
  add(rightDiag(leftOf(above(C, P.barT), P.stemL)));           // miolo do 4 (triangulo)
  add(rightOf(leftOf(C, P.stemR), P.stemL));                   // haste
  add(rightOf(C, P.stemR));                                     // lua da direita
  add(below(above(leftOf(C, P.stemL), P.barB), P.barT));       // barra
  add(below(leftOf(C, P.stemL), P.barB));                      // base
  const silver = E.M.chrome({ color: 0xedf1f6, roughness: 0.16 });
  const meshes = pieces.map((poly, i) => {
    const shape = E.polyShape(poly);
    const geo = E.extrude([shape], { depth: 0.35, bevel: 0.03, bevelSeg: 3 });
    const c = new THREE.Vector2(); poly.forEach((p) => { c.x += p[0]; c.y += p[1]; }); c.multiplyScalar(1 / poly.length);
    geo.translate(-c.x, -c.y, 0);
    const m = new THREE.Mesh(geo, silver); m.castShadow = m.receiveShadow = true;
    m.userData.home = new THREE.Vector3(c.x, c.y, 0); m.userData.dir = c.clone().normalize();
    root.add(m); return m;
  });

  const txt = E.makeText(E.logo('VAN\nGUAR\nDA'), { size: 1.12, depth: 0.32, bevel: 0.028, align: 'left', lineHeight: 0.86,
    material: E.M.plastic(0xffffff, { vertexColors: true, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.06 }) });
  E.colorize(txt.letters, (x, y) => E.ramp(['#e3001b', '#ff6a00', '#ffd400', '#3cc93c', '#00b4e6', '#1f3fd8', '#7a2be2'], (x - y * 1.1 + 2.6) / 5.4));
  const tg = new THREE.Group(); tg.add(txt.group); tg.position.set(-0.55, 0.45, 0.55); tg.rotation.z = 0.0; root.add(tg);

  const glint = E.glints(scene, [{ pos: [-1.9, 1.9, 0.5], t: 3.2 }, { pos: [2.6, 0.9, 0.5], t: 3.7, size: 1.2 }, { pos: [0.4, -2.6, 0.5], t: 4.2, size: 1.3 }]);
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.1, 200);
  function update(t) {
    meshes.forEach((m, i) => { const d = 0.15 + i * 0.12; const e = E.easeOut(E.seg(t, d, d + 1.3), 4); const h = m.userData.home; const dir = m.userData.dir;
      m.position.set(h.x + dir.x * (1 - e) * 7, h.y + dir.y * (1 - e) * 7, (1 - e) * (i % 2 ? 4 : -6)); m.rotation.set((1 - e) * 1.5, (1 - e) * (i % 2 ? -2 : 2), (1 - e) * 0.8); });
    for (const l of txt.letters) { const d = 1.5 + l.userData.gidx * 0.07; const p = E.seg(t, d, d + 0.8); const e = E.easeOutBack(p, 1.4); const h = l.userData.home;
      l.position.set(h.x - (1 - E.easeOut(p)) * 1.5, h.y + (1 - E.easeOut(p)) * 1.5, h.z + (1 - E.easeOut(p)) * 3); l.scale.setScalar(Math.max(0.001, e)); l.rotation.z = (1 - E.easeOut(p)) * 0.6; }
    root.rotation.set(Math.sin(t * 0.6) * 0.04 + (1 - E.easeOut(E.seg(t, 0, 3))) * 0.3, -0.35 * (1 - E.easeInOut(E.seg(t, 0, 3.4))) + (t - 3.4) * 0.025, 0);
    camera.position.set(0.1, 0.05, E.lerp(17, 14, E.easeOut(E.seg(t, 0, 4))));
    camera.lookAt(0, 0, 0);
    const o = E.easeIn(E.seg(t, dur - 0.8, dur), 3); root.scale.setScalar(1 + o * 1.5); root.rotation.z = o * 0.5;
    scene.environmentRotation.y = -0.8 + t * 0.32;
    glint(t);
  }
  return { scene, camera, update, dur, caption: ctx.info.caption, captionDark: true,
    post: { bloom: 0.2, bloomRadius: 0.4, bloomThreshold: 0.97, exposure: 1.0, vignette: 0.18, grain: 0.02, toneMapping: THREE.NeutralToneMapping } };
}
