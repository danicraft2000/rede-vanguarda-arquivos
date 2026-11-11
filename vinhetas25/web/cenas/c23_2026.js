// 23 ANOS (2026): fundo azul royal, "23" preenchido por listras de blocos coloridos
// e VANGUARDA branco em italico por cima.
import * as E from '../engine.js';
const { THREE } = E;

export async function build(ctx) {
  const dur = ctx.dur;
  const scene = new THREE.Scene();
  scene.background = E.gradientBg([[0, '#1a24f0'], [0.7, '#0b14d6'], [1, '#0710b0']], { radial: true });
  scene.environment = E.envStudio(); scene.environmentIntensity = 0.45;
  E.shadowCatcher(scene, { z: -1.0, opacity: 0.25 });
  E.sun(scene, { pos: [-3, 5, 10], intensity: 1.4, size: 8 });
  scene.add(new THREE.AmbientLight(0xffffff, 0.8));

  const S = 6.6;
  const sh = E.textShapes('23', S, { tracking: -0.04 });
  const bb = new THREE.Box2(); sh.shapes.forEach((s) => s.getPoints(8).forEach((p) => bb.expandByPoint(p)));
  const rows = [
    [['#ffae00', 0.42], ['#ffe600', 0.36], ['#fff07a', 0.22]],
    [['#b44aff', 0.18], ['#ffae00', 0.22], ['#ffe600', 0.38], ['#fff59a', 0.22]],
    [['#b44aff', 0.2], ['#22e4ff', 0.48], ['#7ad8ff', 0.32]],
    [['#22e4ff', 0.32], ['#3a8aff', 0.18], ['#22e4ff', 0.3], ['#7ad8ff', 0.2]],
    [['#88ffcc', 0.45], ['#22e4ff', 0.2], ['#88ffcc', 0.35]],
    [['#2a7aff', 0.5], ['#3a5aff', 0.5]],
    [['#ff4ad8', 0.38], ['#2a7aff', 0.32], ['#ff4ad8', 0.3]],
    [['#2a6aff', 0.6], ['#ff7ae0', 0.4]],
  ];
  const tex = E.canvasTex(1024, 1024, (g, w, h) => {
    const rh = h / rows.length;
    rows.forEach((row, i) => { let x = 0; row.forEach(([c, f]) => { g.fillStyle = c; g.fillRect(x, i * rh, f * w + 1, rh + 1); x += f * w; }); });
  }, { repeat: true });
  E.planarMap(tex, bb.min.x, bb.min.y, bb.max.x - bb.min.x, bb.max.y - bb.min.y); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const ofs0 = tex.offset.clone();
  const n23 = new THREE.Mesh(E.extrude(sh.shapes, { depth: 0.5, bevel: 0.03, bevelSeg: 3, curveSeg: 24 }), [new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.35, clearcoat: 0.6 }), E.M.plastic(0x2a3ad8, { roughness: 0.5 })]);
  n23.castShadow = true;
  const root = new THREE.Group(); scene.add(root);
  const p23 = new THREE.Group(); p23.add(n23); p23.position.y = -0.1; root.add(p23);
  const vg = E.makeText(E.logo('VANGUARDA'), { size: 1.55, depth: 0.3, bevel: 0.02, material: E.M.plastic(0xffffff, { roughness: 0.35 }) });
  vg.group.position.set(0.1, 0.0, 0.8); root.add(vg.group);

  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.1, 200);
  function update(t) {
    // listras "rolam" e assentam
    const sc = 1 - E.easeOut(E.seg(t, 0, 2.6), 3);
    tex.offset.set(ofs0.x, ofs0.y + sc * 3.0);
    const e = E.easeOut(E.seg(t, 0.0, 1.5), 4); p23.position.z = (1 - e) * -10; p23.scale.setScalar(0.5 + 0.5 * e);
    for (const l of vg.letters) { const d = 1.3 + l.userData.idx * 0.05; const k = E.easeOutBack(E.seg(t, d, d + 0.6), 1.8); const h = l.userData.home; l.scale.setScalar(Math.max(0.001, k)); l.position.set(h.x, h.y, h.z + (1 - E.easeOut(E.seg(t, d, d + 0.6))) * 4); }
    root.rotation.set(Math.sin(t * 0.45) * 0.05, -0.25 * (1 - E.easeInOut(E.seg(t, 0, 3.4))) + Math.sin(t * 0.35) * 0.05, 0);
    camera.position.set(0, 0, E.lerp(17.5, 15.5, E.easeOut(E.seg(t, 0, 5)))); camera.lookAt(0, -0.05, 0);
    const o = E.easeIn(E.seg(t, dur - 0.9, dur), 3); root.position.y = o * 9; tex.offset.y += o * 2;
  }
  return { scene, camera, update, dur, caption: ctx.info.caption,
    post: { bloom: 0.15, bloomRadius: 0.4, bloomThreshold: 0.95, exposure: 1.0, toneMapping: THREE.NeutralToneMapping } };
}
