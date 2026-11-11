// 15 ANOS (2018): "ESPECIAL", "15" branco e selo azul com VAN/GUAR/DA,
// cercados de bolinhas coloridas sobre fundo preto.
import * as E from '../engine.js';
const { THREE } = E;

export async function build(ctx) {
  const dur = ctx.dur;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020202);
  scene.environment = E.envStudio(); scene.environmentIntensity = 0.7;
  const key = new THREE.DirectionalLight(0xffffff, 1.8); key.position.set(-3, 5, 8); scene.add(key);
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));

  const root = new THREE.Group(); scene.add(root);
  const k = 0.0078; // pixels da referencia -> unidades
  const dots = [
    [500, 280, 85, '#f2c414', 1], [365, 415, 70, '#ef3524', 1], [530, 510, 80, '#ff7f0f', 1], [365, 655, 85, '#d91c12', 1], [550, 710, 72, '#e8481b', 1],
    [715, 320, 80, '#1f9a3a', -1], [880, 290, 72, '#2448e8', -1], [1080, 355, 88, '#1b1bd8', 1], [1220, 530, 88, '#a838f0', 1], [1080, 580, 70, '#3b20d8', -1],
    [1175, 690, 75, '#6a3ae8', 1], [735, 690, 70, '#1a9a50', -1], [925, 710, 85, '#18b8c0', -1], [700, 545, 60, '#76c81e', -1],
  ];
  const balls = dots.map(([x, y, r, c, front], i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r * k, 48, 32), E.M.plastic(c, { roughness: 0.55, clearcoat: 0.3 }));
    m.scale.z = 0.45; m.userData = { home: new THREE.Vector3((x - 800) * k, -(y - 500) * k, front > 0 ? 0.0 : -0.6), i };
    root.add(m); return m;
  });
  const white = E.M.plastic(0xffffff, { roughness: 0.4, clearcoat: 0.4 });
  const n15 = E.makeText('15', { size: 4.6, depth: 0.45, bevel: 0.03, tracking: -0.05, material: white });
  n15.group.position.set(0.0, -0.05, 0.4); root.add(n15.group);
  // selo azul na barriga do 5
  const five = n15.letters[1];
  const badge = new THREE.Group(); badge.position.set(five.position.x + 0.32, five.position.y - 0.62, 0.72); n15.group.add(badge);
  badge.add(new THREE.Mesh(E.extrude([E.circleShape(0.62)], { depth: 0.06, bevel: 0.02, curveSeg: 64 }), E.M.plastic(0x1561c4, { roughness: 0.35, clearcoat: 1 })));
  const nm = E.makeText(E.logo('VAN\nGUAR\nDA'), { size: 0.36, depth: 0.02, bevel: 0, lineHeight: 0.86, material: E.M.basic(0xffffff) });
  nm.group.position.z = 0.06; nm.group.rotation.z = 0.12; badge.add(nm.group);
  const esp = E.makeText('ESPECIAL', { size: 0.42, depth: 0.03, bevel: 0, tracking: 0.55, material: E.M.basic(0xffffff) });
  esp.group.position.set(0.1, 2.33, 0.4); root.add(esp.group);

  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.1, 200);
  function update(t) {
    balls.forEach((m) => { const u = m.userData; const d = 0.15 + u.i * 0.07; const s = E.spring(E.seg(t, d, d + 1.6) * 1.5, 12, 5.5);
      m.scale.set(Math.max(0.001, s), Math.max(0.001, s), Math.max(0.001, s) * 0.45);
      m.position.set(u.home.x * (0.4 + 0.6 * E.easeOut(E.seg(t, d, d + 0.8))) + Math.sin(t * 0.8 + u.i) * 0.03, u.home.y * (0.4 + 0.6 * E.easeOut(E.seg(t, d, d + 0.8))) + Math.cos(t * 0.7 + u.i) * 0.03, u.home.z); });
    n15.letters.forEach((l, i) => { const d = 0.9 + i * 0.15; const e = E.easeOutBack(E.seg(t, d, d + 0.7), 1.6); const h = l.userData.home; l.position.set(h.x, h.y + (1 - E.easeOut(E.seg(t, d, d + 0.7))) * -5, h.z); l.scale.setScalar(Math.max(0.001, e)); });
    const b = E.spring(E.seg(t, 1.8, 3.2) * 1.5, 11, 5); badge.scale.setScalar(Math.max(0.001, b)); badge.rotation.z = (1 - E.easeOut(E.seg(t, 1.8, 3))) * 4;
    for (const l of esp.letters) { const d = 2.2 + l.userData.idx * 0.05; const e = E.easeOut(E.seg(t, d, d + 0.5)); l.scale.setScalar(Math.max(0.001, e)); }
    root.rotation.set(Math.sin(t * 0.5) * 0.05, -0.3 * (1 - E.easeInOut(E.seg(t, 0, 3.3))) + Math.sin(t * 0.37) * 0.05, 0);
    camera.position.set(0, 0.1, E.lerp(16.5, 15, E.easeOut(E.seg(t, 0, 5)))); camera.lookAt(0, 0.0, 0);
    const o = E.easeIn(E.seg(t, dur - 0.9, dur), 3);
    balls.forEach((m) => { m.position.multiplyScalar(1 + o * 3); }); n15.group.scale.setScalar(1 - o * 0.95); esp.group.scale.setScalar(1 - o * 0.95);
  }
  return { scene, camera, update, dur, caption: ctx.info.caption,
    post: { bloom: 0.2, bloomRadius: 0.45, bloomThreshold: 0.92, exposure: 1.0 } };
}
