// 14 ANOS (2017): "14" gigante com degrade multicolorido, VANGUARDA branco em 3D
// por cima e ANOS em cinza, fundo branco.
import * as E from '../engine.js';
const { THREE } = E;

export async function build(ctx) {
  const dur = ctx.dur;
  const scene = new THREE.Scene();
  scene.background = E.gradientBg([[0, '#ffffff'], [0.8, '#f8f9fb'], [1, '#eceef3']], { radial: true });
  scene.environment = E.envPanels([{ pos: [0, 5, 12], w: 22, h: 8, color: 0xffffff, i: 1.5 }, { pos: [0, -4, 10], w: 22, h: 4, color: 0x9098a8, i: 0.8 }, { pos: [-10, 0, 4], w: 2, h: 10, color: 0xffffff, i: 1 }], { bg: 0xb8bec8 });
  E.shadowCatcher(scene, { z: -0.9, opacity: 0.1 });
  E.sun(scene, { pos: [-3, 6, 10], intensity: 1.3, size: 7 });
  scene.add(new THREE.AmbientLight(0xffffff, 0.75));

  const root = new THREE.Group(); scene.add(root);
  const S = 5.4;
  const sh = E.textShapes('14', S, { tracking: -0.06 });
  const bb = new THREE.Box2(); sh.shapes.forEach((s) => s.getPoints(8).forEach((p) => bb.expandByPoint(p)));
  const tex = E.canvasTex(1024, 1024, (g, w, h) => {
    const cg = g.createConicGradient(-Math.PI / 2, w * 0.62, h * 0.52);
    const st = ['#00e0ff', '#00ff90', '#a0ff20', '#ffe000', '#ff8a00', '#ff2020', '#ff0a8a', '#e000ff', '#8a20ff', '#2040ff', '#1060ff', '#00e0ff'];
    st.forEach((c, i) => cg.addColorStop(i / (st.length - 1), c)); g.fillStyle = cg; g.fillRect(0, 0, w, h);
    const lg = g.createLinearGradient(0, 0, w * 0.4, 0); lg.addColorStop(0, 'rgba(60,40,255,0.55)'); lg.addColorStop(1, 'rgba(60,40,255,0)'); g.fillStyle = lg; g.fillRect(0, 0, w, h);
  });
  E.planarMap(tex, bb.min.x, bb.min.y, bb.max.x - bb.min.x, bb.max.y - bb.min.y);
  const g14 = E.extrude(sh.shapes, { depth: 0.6, bevel: 0.04, bevelSeg: 3, curveSeg: 24 });
  const n14 = new THREE.Mesh(g14, new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.5 }));
  n14.castShadow = true; n14.receiveShadow = true;
  const p14 = new THREE.Group(); p14.add(n14); p14.position.set(0.3, 0.15, 0); root.add(p14);
  tex.offset0 = tex.offset.clone();

  const pearl = E.M.plastic(0xf4f4fb, { roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 });
  const side = E.M.plastic(0xb8b8d0, { roughness: 0.5 });
  const vg = E.makeText(E.logo('VANGUARDA'), { size: 1.32, depth: 0.45, bevel: 0.03, material: [pearl, side] });
  vg.group.position.set(-0.25, 0.42, 0.85); root.add(vg.group);
  const anos = E.makeText(E.logo('ANOS'), { size: 0.62, depth: 0.08, bevel: 0.005, tracking: 0.18, material: E.M.plastic(0xa0a4ae, { roughness: 0.5 }) });
  anos.group.position.set(3.2, -2.22, 0.5); root.add(anos.group);

  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.1, 200);
  function update(t) {
    const e = E.easeOut(E.seg(t, 0.0, 1.8), 4);
    p14.rotation.set((1 - e) * -0.8, (1 - e) * 1.6, 0); p14.position.z = (1 - e) * -12; p14.scale.setScalar(0.6 + 0.4 * e);
    tex.rotation = 0; tex.center.set(0.5, 0.5);
    for (const l of vg.letters) { const d = 1.2 + l.userData.idx * 0.06; const p = E.seg(t, d, d + 0.8); const k = E.easeOut(p, 4); const h = l.userData.home;
      l.position.set(h.x - (1 - k) * 10, h.y, h.z + (1 - k) * 2); l.rotation.y = (1 - k) * -1.2; l.visible = p > 0; }
    for (const l of anos.letters) { const d = 2.4 + l.userData.idx * 0.08; l.scale.setScalar(Math.max(0.001, E.easeOut(E.seg(t, d, d + 0.5)))); }
    root.rotation.y = Math.sin(t * 0.45) * 0.06 - 0.03; root.rotation.x = Math.sin(t * 0.33) * 0.03;
    camera.position.set(0, 0.0, E.lerp(17, 15, E.easeOut(E.seg(t, 0, 5)))); camera.lookAt(0.2, 0.1, 0);
    const o = E.easeIn(E.seg(t, dur - 0.9, dur), 3); root.position.x = o * -14;
    scene.environmentRotation.y = -0.4 + t * 0.25;
  }
  // material duplo: tampa perolada + lateral lilas acinzentada
  return { scene, camera, update, dur, caption: ctx.info.caption, captionDark: true,
    post: { bloom: 0.12, bloomRadius: 0.4, bloomThreshold: 0.98, exposure: 1.0, vignette: 0.12, grain: 0.02, toneMapping: THREE.NeutralToneMapping },
    postAt: (t) => ({ fade: E.easeIn(E.seg(t, dur - 0.35, dur), 2), fadeColor: 0x000000 }) };
}
