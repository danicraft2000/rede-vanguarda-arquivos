// 8 ANOS (2011): flor de rosquinhas coloridas em volta de um "8" cinza-claro,
// selo preto com VAN/GUAR/DA branco, sobre uma vista aerea de avenida (feita em 3D).
import * as E from '../engine.js';
const { THREE } = E;

function cityScene(scene, r) {
  // vista aerea: asfalto, faixas, calcada, gramado, arvores e carros
  const city = new THREE.Group(); scene.add(city);
  const g = (w, h, c, x, y, z = 0, rough = 0.95) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), E.M.matte(c, { roughness: rough })); m.position.set(x, y, z); m.receiveShadow = true; city.add(m); return m; };
  g(200, 200, 0x9a8a5a, 0, 0, -0.02);                 // terra/gramado seco
  for (let i = 0; i < 260; i++) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.6 + r() * 2.4, 12), E.M.matte(new THREE.Color().setHSL(0.16 + r() * 0.1, 0.35, 0.28 + r() * 0.15))); m.position.set((r() - 0.5) * 90, (r() - 0.5) * 60, -0.015); city.add(m); }
  g(200, 13, 0x4a4b4f, 0, 10, 0, 0.85);                // avenida
  g(200, 0.6, 0xc9c4b8, 0, 16.8, 0.01);                // meio-fio
  g(200, 0.6, 0xc9c4b8, 0, 3.2, 0.01);
  g(200, 3.5, 0x9e8e80, 0, 1.0, 0.0);                  // calcada (tijolinho)
  for (let x = -100; x < 100; x += 4) { g(2.2, 0.18, 0xf2f2f2, x + 1, 12.2, 0.02, 0.6); g(2.2, 0.18, 0xf2f2f2, x + 1, 7.8, 0.02, 0.6); }
  g(200, 0.16, 0xe8c020, 0, 10, 0.02, 0.6);
  g(200, 4, 0x3c3c40, 0, 20, 0.0);                     // mureta / sombra
  const trees = [];
  for (let i = 0; i < 26; i++) {
    const t = new THREE.Group(); const k = 1 + r() * 1.3;
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4 * k, 1), E.M.matte(new THREE.Color().setHSL(0.22 + r() * 0.06, 0.45, 0.2 + r() * 0.08)));
    crown.position.z = 2.5 * k; crown.castShadow = true; t.add(crown);
    t.position.set(-60 + i * 4.8 + r() * 2, -3 - r() * 10, 0); city.add(t); trees.push(t);
  }
  const cars = [];
  const cc = [0xffffff, 0xc0c0c8, 0x202024, 0xb01818, 0x1e3c8a, 0xe8e8e8];
  for (let i = 0; i < 14; i++) {
    const car = new THREE.Group(); const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.95, 0.6), E.M.plastic(cc[i % cc.length], { roughness: 0.3, clearcoat: 1 })); body.position.z = 0.35; body.castShadow = true; car.add(body);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 0.35), E.M.plastic(0x101418, { roughness: 0.1 })); top.position.set(-0.1, 0, 0.75); car.add(top);
    const lane = [5.8, 8.6, 11.4, 14.2][i % 4]; const dir = lane > 10 ? -1 : 1; car.userData = { lane, dir, x0: (r() - 0.5) * 120, v: 4 + r() * 3 };
    if (dir < 0) car.rotation.z = Math.PI;
    city.add(car); cars.push(car);
  }
  const sunL = E.sun(scene, { pos: [-20, -10, 40], intensity: 2.0, size: 40, mapSize: 2048, target: [0, 5, 0] });
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x6a5a3a, 1.0));
  city.userData.update = (t) => cars.forEach((c) => { const u = c.userData; let x = u.x0 + u.dir * u.v * t; x = ((x + 70) % 140 + 140) % 140 - 70; c.position.set(x, u.lane, 0); });
  return city;
}

export async function build(ctx) {
  const dur = ctx.dur;
  const r = E.rng(2011);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8fa0b0);
  scene.environment = E.envStudio(); scene.environmentIntensity = 0.6;
  const city = cityScene(scene, r);
  city.rotation.x = -0.15;

  // logo flutuando na frente da camera (grupo preso a camera)
  const camera = new THREE.PerspectiveCamera(35, ctx.aspect, 0.1, 400);
  const logo = new THREE.Group(); camera.add(logo); scene.add(camera);
  logo.position.set(0, 0, -16);
  const L = new THREE.DirectionalLight(0xffffff, 1.6); L.position.set(-2, 3, 4); camera.add(L); L.target = logo;
  const petals = [];
  const pc = [['#8ec63f', 135], ['#ffd700', 45], ['#f7941d', 0], ['#ef4136', -45], ['#e6198a', -100], ['#a49dd8', -150], ['#3ab0e8', 180]];
  pc.forEach(([c, ang], i) => {
    const a = ang * Math.PI / 180; const m = new THREE.Mesh(E.extrude([E.ringShape(0.48, 1.55)], { depth: 0.2, bevel: 0.05, bevelSeg: 4, curveSeg: 64 }), E.M.plastic(c, { roughness: 0.45, clearcoat: 0.4 }));
    m.userData = { a, r: 2.2 }; logo.add(m); petals.push(m);
  });
  const eight = E.glyphMesh('8', E.M.plastic(0xd8dde3, { roughness: 0.45, clearcoat: 0.3 }), { size: 6.0, depth: 0.45, bevel: 0.04, curveSeg: 32 });
  eight.position.z = 0.5; logo.add(eight);
  // furo de cima (preto) e selo de baixo (preto com o nome)
  // preenche o furo de cima do 8 com preto (forma exata do furo)
  const s8 = E.textShapes('8', 6.0).shapes[0]; const b8 = E.shapeBox(s8); const c8 = b8.getCenter(new THREE.Vector2());
  const holes = s8.holes.map((h) => { const bb = new THREE.Box2(); h.getPoints(8).forEach((p) => bb.expandByPoint(p)); return { h, cy: bb.getCenter(new THREE.Vector2()).y }; }).sort((a, b) => b.cy - a.cy);
  const hole = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(holes[0].h.getPoints(24)), 24).translate(-c8.x, -c8.y, 0), E.M.basic(0x050505)); hole.position.set(0, 0, 0.45); logo.add(hole);
  const hole2 = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(holes[1].h.getPoints(24)), 24).translate(-c8.x, -c8.y, 0), E.M.basic(0x050505)); hole2.position.set(0, 0, 0.45); logo.add(hole2);
  const hb = new THREE.Box2(); holes[1].h.getPoints(8).forEach((p) => hb.expandByPoint(p)); const hc = hb.getCenter(new THREE.Vector2());
  const badge = new THREE.Group(); badge.position.set(hc.x - c8.x, hc.y - c8.y, 0.8); logo.add(badge);
  badge.add(new THREE.Mesh(E.extrude([E.circleShape(1.15)], { depth: 0.08, bevel: 0.03, curveSeg: 64 }), E.M.plastic(0x0a0a0a, { roughness: 0.3, clearcoat: 1 })));
  const nm = E.makeText('VAN\nGUAR\nDA', { size: 0.62, depth: 0.03, bevel: 0, align: 'center', lineHeight: 0.84, material: E.M.basic(0xf2f2f2) });
  nm.group.position.z = 0.1; nm.group.rotation.z = -0.1; badge.add(nm.group);

  function update(t) {
    city.userData.update(t);
    // camera: desce do alto, olhando a avenida, e desliza
    const c = E.easeInOut(E.seg(t, 0, dur), 2);
    camera.position.set(E.lerp(-6, 6, c), E.lerp(-26, -22, c), E.lerp(48, 40, c));
    camera.lookAt(E.lerp(-4, 4, c), 6, 0);
    // flor abrindo: petalas saem de tras do 8
    petals.forEach((p, i) => { const d = 0.5 + i * 0.09; const e = E.easeOutBack(E.seg(t, d, d + 0.9), 1.6); const rr = p.userData.r * e;
      p.position.set(Math.cos(p.userData.a) * rr, Math.sin(p.userData.a) * rr - 0.05, -0.1 - i * 0.02); p.scale.setScalar(Math.max(0.001, 0.4 + 0.6 * e)); p.rotation.z = (1 - e) * 1.5; });
    const e8 = E.easeOutBack(E.seg(t, 0.2, 1.1), 1.4); eight.scale.setScalar(Math.max(0.001, e8)); eight.rotation.y = (1 - E.easeOut(E.seg(t, 0.2, 1.4))) * Math.PI;
    hole.scale.setScalar(Math.max(0.001, e8)); hole2.scale.setScalar(Math.max(0.001, e8)); hole.rotation.y = hole2.rotation.y = eight.rotation.y;
    const b = E.spring(E.seg(t, 1.3, 3.0) * 1.5, 11, 5); badge.scale.setScalar(Math.max(0.001, b)); badge.rotation.z = (1 - E.easeOut(E.seg(t, 1.3, 2.6))) * 3;
    logo.rotation.set(Math.sin(t * 0.7) * 0.05, Math.sin(t * 0.5) * 0.12, 0);
    const o = E.easeIn(E.seg(t, dur - 0.9, dur), 3); logo.position.z = -16 + o * 12; logo.rotation.z = o * 0.6;
  }
  return { scene, camera, update, dur, caption: ctx.info.caption,
    post: { bloom: 0.15, bloomRadius: 0.4, bloomThreshold: 0.95, exposure: 1.05, toneMapping: THREE.NeutralToneMapping, vignette: 0.3 },
    postAt: (t) => ({ fade: E.easeIn(E.seg(t, dur - 0.35, dur), 2) }) };
}
