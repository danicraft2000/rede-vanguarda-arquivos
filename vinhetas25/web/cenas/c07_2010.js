// 7 ANOS (2010): painel lilas com "7" branco, faixa roxa diagonal com VANGUARDA
// e listras roxo-escuras a direita.
import * as E from '../engine.js';
const { THREE } = E;

export async function build(ctx) {
  const dur = ctx.dur;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1c0838);
  scene.environment = E.envStudio(); scene.environmentIntensity = 0.25;
  const key = E.sun(scene, { pos: [-5, 4, 10], intensity: 2.2, size: 9, radius: 6 });
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));

  const root = new THREE.Group(); scene.add(root);
  const tilt = new THREE.Group(); tilt.rotation.z = -0.40; root.add(tilt); // faixa inclinada
  const mk = (w, h, color, z, r = 0) => { const m = new THREE.Mesh(E.extrude([E.rectShape(w, h, 0, 0, r)], { depth: 0.12, bevel: 0.015, bevelSeg: 2 }), E.M.matte(color, { roughness: 0.65 })); m.position.z = z; m.castShadow = m.receiveShadow = true; return m; };
  const lav = mk(14, 26, 0x9893de, 0.0); lav.position.x = -7.95; tilt.add(lav);
  const band = mk(1.9, 26, 0x6c28c4, 0.18); tilt.add(band);
  const stripes = [];
  const sc = [0x4a1a98, 0x3b1580, 0x34126e, 0x2c0f5e, 0x260c52, 0x200a46];
  sc.forEach((c, i) => { const s = mk(1.6, 26, c, 0.06 - i * 0.02); s.position.x = 1.55 + i * 1.45; tilt.add(s); stripes.push(s); });
  // VANGUARDA subindo pela faixa
  const vg = E.makeText(E.logo('VANGUARDA'), { size: 1.05, depth: 0.12, bevel: 0.012, material: E.M.plastic(0xffffff, { roughness: 0.4 }) });
  vg.group.rotation.z = Math.PI / 2; vg.group.position.set(0.05, 0.4, 0.42); tilt.add(vg.group);
  // o "7" fica em pe, sobre o painel lilas
  const seven = E.glyphMesh('7', E.M.plastic(0xffffff, { roughness: 0.35, clearcoat: 0.5 }), { size: 5.6, depth: 0.35, bevel: 0.03 });
  const sp = new THREE.Group(); sp.add(seven); sp.position.set(-4.3, 1.25, 0.55); root.add(sp);

  const camera = new THREE.PerspectiveCamera(32, ctx.aspect, 0.1, 200);
  function update(t) {
    lav.position.y = (1 - E.easeOut(E.seg(t, 0.0, 1.2), 4)) * -26;
    band.position.y = (1 - E.easeOut(E.seg(t, 0.25, 1.4), 4)) * 26;
    stripes.forEach((s, i) => { s.position.y = (1 - E.easeOut(E.seg(t, 0.35 + i * 0.08, 1.4 + i * 0.08), 4)) * (i % 2 ? 26 : -26); });
    for (const l of vg.letters) { const d = 1.2 + l.userData.idx * 0.07; const e = E.easeOut(E.seg(t, d, d + 0.5), 3); l.scale.setScalar(Math.max(0.001, e)); l.position.y = l.userData.home.y - (1 - e) * 0.8; }
    const s7 = E.easeOutBack(E.seg(t, 1.0, 1.9), 1.5); sp.scale.setScalar(Math.max(0.001, s7)); sp.rotation.set(0, (1 - E.easeOut(E.seg(t, 1.0, 2.1))) * Math.PI, 0);
    // camera: comeca inclinada e assenta
    const c = E.easeInOut(E.seg(t, 0, 3.4), 3);
    camera.position.set(E.lerp(-4, -0.9, c) + (t - 3.4) * 0.06, E.lerp(-3, 0.2, c), E.lerp(13, 15.5, c));
    camera.lookAt(-1.2, 0.3, 0);
    const o = E.easeIn(E.seg(t, dur - 0.9, dur), 3);
    tilt.position.set(o * 14 * Math.sin(0.4), o * 14 * Math.cos(0.4), 0); sp.position.x = -4.3 - o * 9;
  }
  return { scene, camera, update, dur, caption: ctx.info.caption,
    post: { bloom: 0.15, bloomRadius: 0.4, bloomThreshold: 0.95, exposure: 1.0, toneMapping: THREE.NeutralToneMapping, vignette: 0.3 } };
}
