// 18 ANOS (2021): persianas verticais arco-iris, "I8" branco, linha e "21 DE AGOSTO".
import * as E from '../engine.js';
const { THREE } = E;

export async function build(ctx) {
  const dur = ctx.dur;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.environment = E.envStudio(); scene.environmentIntensity = 0.35;
  const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(-6, 2, 6); scene.add(key);
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));

  const root = new THREE.Group(); scene.add(root);
  const H = 4.2, n = 18, w = 0.44, x0 = -9.4, x1 = -1.85;
  const pal = ['#e8141e', '#e8381a', '#f07a14', '#f2c414', '#c8e01a', '#7ad21e', '#2ec62e', '#1ac860', '#16c8a0', '#14c0d8', '#14a8e8', '#1a86e8', '#1e66e0', '#2448d8', '#2c34c8', '#3a2ab4', '#4a22a0', '#58208c'];
  const slats = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, H, 0.04), E.M.plastic(pal[i], { roughness: 0.4, clearcoat: 0.3 }));
    m.geometry.translate(-w / 2, 0, 0); // dobradica na borda direita
    m.position.set(x0 + (i + 1) * (x1 - x0) / n, 0, 0); root.add(m); slats.push(m);
  }
  const white = E.M.plastic(0xe8e8e8, { roughness: 0.55, clearcoat: 0 });
  const bar = new THREE.Mesh(E.extrude([E.rectShape(1.15, H, 0, 0, 0)], { depth: 0.2, bevel: 0.01 }), white); bar.position.set(-1.05, 0, 0); root.add(bar);
  const eight = E.glyphMesh('8', white, { size: 5.85, depth: 0.2, bevel: 0.01, curveSeg: 32 });
  const p8 = new THREE.Group(); p8.add(eight); p8.position.set(1.35, 0, 0); root.add(p8);
  const line = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 4.6), E.M.basic(0xffffff)); line.position.set(3.55, 0, 0); root.add(line);
  const d21 = E.makeText('21', { size: 0.62, depth: 0.02, bevel: 0, tracking: 0.12, material: E.M.basic(0xffffff) });
  d21.group.position.set(5.6, 0.32, 0); root.add(d21.group);
  const dag = E.makeText('DE AGOSTO', { size: 0.45, depth: 0.02, bevel: 0, tracking: 0.2, material: E.M.basic(0xffffff) });
  dag.group.position.set(5.6, -0.42, 0); root.add(dag.group);

  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.1, 200);
  function update(t) {
    // persianas abrem em onda da direita para a esquerda
    slats.forEach((m, i) => { const d = 0.2 + (n - 1 - i) * 0.06; const e = E.easeOutBack(E.seg(t, d, d + 1.0), 1.2);
      m.rotation.y = E.lerp(Math.PI / 2, -0.62, e); m.position.z = 0; m.visible = t > d; });
    const eb = E.easeOut(E.seg(t, 0.9, 1.7), 4); bar.scale.set(1, Math.max(0.001, eb), 1);
    const e8 = E.easeOutBack(E.seg(t, 1.1, 1.9), 1.5); p8.scale.setScalar(Math.max(0.001, e8)); p8.rotation.y = (1 - E.easeOut(E.seg(t, 1.1, 2.0))) * -1.5;
    line.scale.y = Math.max(0.001, E.easeInOut(E.seg(t, 1.8, 2.5)));
    [...d21.letters, ...dag.letters].forEach((l, i) => { const d = 2.3 + i * 0.06; const e = E.easeOut(E.seg(t, d, d + 0.4)); l.scale.setScalar(Math.max(0.001, e)); l.position.x = l.userData.home.x + (1 - e) * 0.5; });
    root.rotation.y = 0.18 * (1 - E.easeInOut(E.seg(t, 0, 3.4))) + Math.sin(t * 0.4) * 0.025;
    camera.position.set(-0.4 + (t - 3.5) * 0.08, 0.05, E.lerp(17.5, 16.0, E.easeOut(E.seg(t, 0, 5)))); camera.lookAt(-0.4 + (t - 3.5) * 0.08, 0, 0);
    const o = E.easeIn(E.seg(t, dur - 1.0, dur), 3);
    slats.forEach((m, i) => { if (o > 0) m.rotation.y = E.lerp(-0.62, Math.PI / 2, E.seg(o * 1.6 - (n - 1 - i) * 0.03, 0, 1)); });
    p8.position.y = o * 0.0; root.position.x = -o * 1.5;
  }
  return { scene, camera, update, dur, caption: ctx.info.caption,
    post: { bloom: 0.12, bloomRadius: 0.4, bloomThreshold: 0.98, exposure: 1.0, toneMapping: THREE.NeutralToneMapping },
    postAt: (t) => ({ fade: E.easeIn(E.seg(t, dur - 0.3, dur), 2) }) };
}
