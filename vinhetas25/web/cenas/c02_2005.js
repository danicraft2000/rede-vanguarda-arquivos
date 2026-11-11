// 2 ANOS (2005) - vinheta perdida, RELEITURA no estilo da epoca (2004-2007):
// cromado azul-gelo do 1 ano + fita de luz arco-iris que orbita e desenha o "2".
import * as E from '../engine.js';
const { THREE } = E;

export async function build(ctx) {
  const dur = ctx.dur;
  const scene = new THREE.Scene();
  scene.background = E.gradientBg([[0, '#000000'], [0.5, '#010a12'], [0.82, '#06394f'], [1, '#0b6f86']], { angle: 90 });
  scene.environment = E.envPanels([
    { pos: [0, 4, 14], w: 26, h: 12, grad: ['#ffffff', '#e8fbff', '#9ec4cf', '#3b5560', '#bfe9f5'], i: 1.25 },
    { color: 0xffffff, pos: [0, 10, 2], w: 16, h: 4, i: 1.6 },
    { color: 0xff3080, pos: [-9, 3, 4], w: 1.2, h: 12, i: 2.5 },
    { color: 0x30ffb0, pos: [9, -3, 4], w: 1.2, h: 12, i: 2.5 },
    { color: 0xffd040, pos: [0, -9, 3], w: 14, h: 1.2, i: 2.2 },
    { color: 0x2060ff, pos: [0, 0, -12], w: 20, h: 8, i: 1.2 },
  ], { bg: 0x020409 });

  const ice = E.M.chrome({ color: 0xdff3f4, roughness: 0.18, iridescence: 1, iridescenceIOR: 2.0, iridescenceThicknessRange: [300, 1000] });
  const root = new THREE.Group(); scene.add(root);

  const txt = E.makeText(E.logo('VAN\nGUAR\nDA'), { size: 1.25, depth: 0.4, bevel: 0.034, bevelSeg: 4, align: 'right', lineHeight: 0.86, material: ice });
  txt.group.position.set(-1.9, 0.25, 0); root.add(txt.group);

  const two = E.glyphMesh('2', ice, { size: 4.6, depth: 0.7, bevel: 0.05, bevelSeg: 4, curveSeg: 24 });
  const twoPivot = new THREE.Group(); twoPivot.add(two); twoPivot.position.set(2.55, 0.35, 0); root.add(twoPivot);

  const anos = E.makeText(E.logo('ANOS'), { size: 0.62, depth: 0.16, bevel: 0.015, tracking: 0.32, material: E.M.chrome({ color: 0xe8fbff, roughness: 0.38 }) });
  anos.group.position.set(2.55, -2.25, 0.1); root.add(anos.group);

  // fita de luz arco-iris: orbita inclinada em volta do "2"
  const pts = [];
  for (let i = 0; i <= 64; i++) {
    const a = i / 64 * Math.PI * 2 * 1.35 - 0.6;
    const r = 3.0 + 0.25 * Math.sin(a * 2);
    pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r * 0.42 + Math.sin(a * 0.5) * 0.3, Math.sin(a) * r * 0.9));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const rgeo = E.ribbonGeo(curve, { width: 0.32, segs: 600, up: new THREE.Vector3(0, 1, 0.3).normalize(), twist: (u) => Math.sin(u * 9) * 0.5 });
  const cols = new Float32Array(rgeo.attributes.position.count * 3);
  for (let i = 0; i < cols.length / 3; i++) { const u = rgeo.attributes.uv.getX(i); const c = E.ramp(E.SPECTRUM, (u * 1.35) % 1).multiplyScalar(2.2); cols.set([c.r, c.g, c.b], i * 3); }
  rgeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const ribbon = new THREE.Mesh(rgeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
  const orbit = new THREE.Group(); orbit.add(ribbon); orbit.position.set(2.55, 0.35, 0); orbit.rotation.set(0.25, 0, -0.32); root.add(orbit);
  const total = rgeo.index.count;

  const glint = E.glints(scene, [
    { pos: [-4.0, 2.25, 0.4], t: 2.6, size: 1.6 }, { pos: [4.25, 2.6, 0.5], t: 3.1, size: 2.0 }, { pos: [0.6, -1.6, 0.4], t: 3.7, size: 1.4 },
  ]);
  const bok = E.bokeh(scene, { n: 70, z: -10, spread: [36, 20, 8], size: 0.35, colors: [0x6fd8ff, 0xffffff, 0x9fffe0], opacity: 0.35 });

  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.1, 200);
  function update(t) {
    for (const l of txt.letters) {
      const d = 0.6 + l.userData.line * 0.18 + l.userData.idx * 0.06; const e = E.easeOut(E.seg(t, d, d + 1.2), 4); const h = l.userData.home;
      l.position.set(h.x, h.y - (1 - e) * 3.5, h.z - (1 - e) * 4); l.rotation.set((1 - e) * -1.6, 0, 0); l.visible = e > 0.001;
    }
    const e2 = E.easeOut(E.seg(t, 0.2, 2.4), 3);
    two.rotation.y = (1 - e2) * Math.PI * 2; twoPivot.scale.setScalar(0.3 + 0.7 * E.easeOutBack(E.seg(t, 0.2, 1.4), 1.2));
    for (const l of anos.letters) { const d = 2.0 + l.userData.idx * 0.08; const e = E.easeOut(E.seg(t, d, d + 0.6)); l.scale.setScalar(e); }
    // a fita se desenha e depois gira devagar
    const draw = E.easeInOut(E.seg(t, 0.0, 2.2), 2);
    rgeo.setDrawRange(0, Math.floor(total * draw / 6) * 6);
    orbit.rotation.y = t * 0.35; ribbon.material.opacity = 0.95 * (1 - E.seg(t, dur - 0.6, dur));
    const c = E.easeInOut(E.seg(t, 0, 3.2), 3);
    camera.position.set(E.lerp(3.5, 0.2, c) + (t - 3) * 0.05, E.lerp(-1.5, 0.15, c), E.lerp(10, 12.6, c));
    camera.lookAt(0.3, 0.1, 0);
    const o = E.easeIn(E.seg(t, dur - 0.9, dur), 3); root.position.z = o * 8; root.rotation.y = o * 0.4;
    scene.environmentRotation.y = 0.4 - t * 0.25;
    glint(t); bok.userData.update(t);
  }
  return { scene, camera, update, dur, caption: ctx.info.caption, post: { bloom: 0.55, bloomRadius: 0.6, bloomThreshold: 0.75, exposure: 1.05 },
    postAt: (t) => ({ flash: 0.8 * E.easeIn(E.seg(t, dur - 0.35, dur), 2) }) };
}
