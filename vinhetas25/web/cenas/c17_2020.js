// 17 ANOS (2020) - RELEITURA pedida: triangulos coloridos (estilo dos 20 e 21 anos)
// voam num redemoinho e se encaixam numa grade triangular formando o "17".
import * as E from '../engine.js';
const { THREE } = E;

export async function build(ctx) {
  const dur = ctx.dur;
  const scene = new THREE.Scene();
  scene.background = E.gradientBg([[0, '#1a2470'], [0.55, '#0d1240'], [1, '#04061a']], { radial: true });
  scene.environment = E.envPanels([
    { pos: [0, 4, 14], w: 24, h: 10, grad: ['#ffffff', '#cfd8ff', '#40486a'], i: 1.2 },
    { color: 0xffffff, pos: [-6, 8, 4], w: 6, h: 3, i: 2.5 }, { color: 0xff40a0, pos: [9, 0, 2], w: 2, h: 10, i: 1.5 }, { color: 0x40c0ff, pos: [-9, -2, 2], w: 2, h: 10, i: 1.5 },
  ], { bg: 0x05070f });
  const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(-3, 5, 8); scene.add(key);
  scene.add(new THREE.AmbientLight(0xffffff, 0.3));
  const r = E.rng(2020);

  // grade triangular dentro do contorno do "17"
  const S = 5.6;
  const ts = E.textShapes('17', S, { tracking: -0.02 });
  const polys = ts.shapes.map((s) => ({ pts: s.getPoints(16), holes: s.holes.map((h) => h.getPoints(16)) }));
  const inside = (x, y) => polys.some((p) => E.inShape(new THREE.Vector2(x, y), p.pts, p.holes));
  const a = 0.36, hh = a * Math.sqrt(3) / 2;
  const tris = [];
  for (let row = -14; row <= 14; row++) {
    for (let col = -26; col <= 26; col++) {
      const up = ((row + col) & 1) === 0;
      const cx = col * a / 2, cy = row * hh;
      const cyc = up ? cy - hh / 6 : cy + hh / 6; // centroide
      const ok = inside(cx, cyc) && inside(cx, cyc + (up ? hh * 0.45 : -hh * 0.45)) && inside(cx - a * 0.28, up ? cy - hh / 2 + 0.03 : cy + hh / 2 - 0.03) && inside(cx + a * 0.28, up ? cy - hh / 2 + 0.03 : cy + hh / 2 - 0.03);
      if (ok) tris.push({ cx, cy, up });
    }
  }
  const g = 0.035; // folga entre triangulos
  const triShape = (up) => { const s = a - g * 1.7, h = s * Math.sqrt(3) / 2; return up ? E.polyShape([[-s / 2, -h / 3], [s / 2, -h / 3], [0, 2 * h / 3]]) : E.polyShape([[-s / 2, h / 3], [0, -2 * h / 3], [s / 2, h / 3]]); };
  const geoUp = E.extrude([triShape(true)], { depth: 0.16, bevel: 0.02, bevelSeg: 2 }), geoDn = E.extrude([triShape(false)], { depth: 0.16, bevel: 0.02, bevelSeg: 2 });
  const pal = ['#ff2a4a', '#ff7a1a', '#ffd21a', '#7ad62a', '#1ac87a', '#18c8e8', '#2a7af0', '#5a3af0', '#b03ae8', '#ff2ab0'];
  const mats = pal.map((c) => E.M.plastic(c, { roughness: 0.22, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05, emissive: new THREE.Color(c), emissiveIntensity: 0.12 }));
  const root = new THREE.Group(); scene.add(root);
  const xs = tris.map((t) => t.cx); const xmin = Math.min(...xs), xmax = Math.max(...xs);
  const meshes = tris.map((tr, i) => {
    const u = (tr.cx - xmin) / (xmax - xmin);
    const idx = Math.min(pal.length - 1, Math.max(0, Math.floor(u * pal.length + (r() - 0.5) * 2.2)));
    const m = new THREE.Mesh(tr.up ? geoUp : geoDn, mats[idx]);
    const ang = r() * Math.PI * 2, rad = 9 + r() * 10;
    m.userData = { home: new THREE.Vector3(tr.cx, tr.cy + (tr.up ? -hh / 6 : hh / 6), 0), from: new THREE.Vector3(Math.cos(ang) * rad, Math.sin(ang) * rad * 0.6, -6 - r() * 18), spin: new THREE.Vector3((r() - 0.5) * 12, (r() - 0.5) * 12, (r() - 0.5) * 12), d: 0.2 + u * 1.3 + r() * 0.5, ang };
    root.add(m); return m;
  });
  const white = E.M.plastic(0xffffff, { roughness: 0.35 });
  const vg = E.makeText(E.logo('VANGUARDA'), { size: 0.95, depth: 0.15, bevel: 0.012, material: white });
  vg.group.position.set(0, -2.95, 0.2); root.add(vg.group);
  const anos = E.makeText(E.logo('ANOS'), { size: 0.5, depth: 0.05, bevel: 0, tracking: 0.6, material: E.M.basic(0xffffff) });
  anos.group.position.set(0, 2.85, 0.2); root.add(anos.group);
  const bok = E.bokeh(scene, { n: 60, z: -12, spread: [40, 24, 8], size: 0.45, colors: [0x4060ff, 0xff40a0, 0x40e0ff], opacity: 0.3 });

  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.1, 200);
  const tmp = new THREE.Vector3();
  function update(t) {
    meshes.forEach((m) => { const u = m.userData; const p = E.seg(t, u.d, u.d + 1.4); const e = E.easeOut(p, 4);
      // redemoinho: o caminho gira em volta do centro
      const sw = (1 - e) * 2.2;
      tmp.copy(u.from).lerp(u.home, e); const x = tmp.x * Math.cos(sw) - tmp.y * Math.sin(sw), y = tmp.x * Math.sin(sw) + tmp.y * Math.cos(sw);
      m.position.set(x, y, tmp.z); m.rotation.set(u.spin.x * (1 - e), u.spin.y * (1 - e), u.spin.z * (1 - e)); m.visible = p > 0; });
    for (const l of vg.letters) { const d = 2.6 + l.userData.idx * 0.05; const e = E.easeOut(E.seg(t, d, d + 0.6), 3); l.scale.setScalar(Math.max(0.001, e)); l.position.y = l.userData.home.y - (1 - e) * 0.6; }
    for (const l of anos.letters) { const d = 2.9 + l.userData.idx * 0.08; l.scale.setScalar(Math.max(0.001, E.easeOut(E.seg(t, d, d + 0.4)))); }
    root.rotation.set(Math.sin(t * 0.5) * 0.06, -0.35 * (1 - E.easeInOut(E.seg(t, 0, 3.6))) + Math.sin(t * 0.4) * 0.05, 0);
    camera.position.set(0, 0, E.lerp(18, 15.5, E.easeOut(E.seg(t, 0, 5)))); camera.lookAt(0, 0, 0);
    const o = E.easeIn(E.seg(t, dur - 1.0, dur), 2);
    if (o > 0) meshes.forEach((m) => { const u = m.userData; m.position.z += o * (4 + 10 * Math.sin(u.ang * 3) ** 2); m.rotation.x += o * u.spin.x * 0.3; });
    vg.group.position.z = 0.2 + o * 6; anos.group.position.z = 0.2 + o * 6;
    scene.environmentRotation.y = t * 0.3; bok.userData.update(t);
  }
  return { scene, camera, update, dur, caption: ctx.info.caption,
    post: { bloom: 0.45, bloomRadius: 0.55, bloomThreshold: 0.8, exposure: 1.05 },
    postAt: (t) => ({ fade: E.easeIn(E.seg(t, dur - 0.35, dur), 2) }) };
}
