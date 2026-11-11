// ABERTURA: voo por um tunel com as 25 placas (2004 -> 2028) e o titulo do especial.
import * as E from '../engine.js';
import { GRID } from './c25_2028.js';
const { THREE } = E;

export async function build(ctx) {
  const dur = ctx.dur;
  const scene = new THREE.Scene();
  scene.background = E.gradientBg([[0, '#0f1a5a'], [0.5, '#060a26'], [1, '#000000']], { radial: true });
  scene.environment = E.envPanels([
    { pos: [0, 0.5, 14], w: 26, h: 12, grad: ['#ffffff', '#f0f6ff', '#b0c0dc', '#5a6a8a', '#d0dcf5'], i: 1.2 },
    { color: 0xffffff, pos: [0, 10, 2], w: 16, h: 4, i: 1.8 },
    { color: 0xff3fa0, pos: [8, 4, -4], w: 1, h: 9, i: 2.5 }, { color: 0x6fa8ff, pos: [-8, -4, -4], w: 1, h: 9, i: 2.5 }, { color: 0xffd040, pos: [0, -9, 4], w: 12, h: 1, i: 2 },
  ], { bg: 0x02030a });
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-3, 5, 8); scene.add(key);
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));

  // tunel de placas
  const tunnel = new THREE.Group(); scene.add(tunnel);
  const flat = GRID.flat();
  const tileGeo = E.extrude([E.rectShape(3.1, 1.95, 0, 0, 0.03)], { depth: 0.2, bevel: 0.015 });
  const tiles = [];
  for (let i = 0; i < 25; i++) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(tileGeo, E.M.plastic(flat[i], { roughness: 0.4, clearcoat: 0.6, emissive: new THREE.Color(flat[i]), emissiveIntensity: 0.15 })));
    const yr = E.makeText(String(2004 + i), { size: 0.62, depth: 0.04, bevel: 0, tracking: 0.06, material: E.M.basic(0xffffff) }); yr.group.position.z = 0.15; g.add(yr.group);
    const a = i * 0.95; const rad = 3.3;
    g.position.set(Math.cos(a) * rad, Math.sin(a) * rad * 0.62, -i * 6);
    g.rotation.set(0, -Math.cos(a) * 0.35, Math.sin(a) * 0.15);
    tunnel.add(g); tiles.push(g);
  }
  const streaks = [];
  const r = E.rng(5);
  for (let i = 0; i < 90; i++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 2.5 + r() * 5), new THREE.MeshBasicMaterial({ color: new THREE.Color(flat[i % 25]).multiplyScalar(2), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.rotation.x = Math.PI / 2; const a = r() * Math.PI * 2, rr = 4 + r() * 6; s.userData = { x: Math.cos(a) * rr, y: Math.sin(a) * rr * 0.65, z0: -r() * 160 }; scene.add(s); streaks.push(s); }

  // titulo
  const title = new THREE.Group(); scene.add(title);
  const chrome = E.M.chrome({ color: 0xeef6ff, metalness: 0.75, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1, iridescence: 0.45, iridescenceIOR: 1.9, iridescenceThicknessRange: [300, 1000] });
  const vg = E.makeText(E.logo('VANGUARDA'), { size: 2.0, depth: 0.45, bevel: 0.035, bevelSeg: 4, material: chrome });
  vg.group.position.y = 0.55; title.add(vg.group);
  const esp = E.makeText('ESPECIAL', { size: 0.5, depth: 0.05, bevel: 0, tracking: 0.9, material: E.M.basic(0xffffff) });
  esp.group.position.y = 2.35; title.add(esp.group);
  const sub = E.makeText('25 ' + E.logo('ANOS') + ' DE VINHETAS', { size: 0.62, depth: 0.08, bevel: 0.006, tracking: 0.12, material: E.M.plastic(0xffffff, { roughness: 0.35 }) });
  sub.group.position.y = -1.05; title.add(sub.group);
  const yrs = E.makeText('2004  —  2028', { size: 0.4, depth: 0.03, bevel: 0, tracking: 0.35, material: E.M.basic(0xffffff) });
  yrs.group.position.y = -2.25; title.add(yrs.group);
  // linha do espectro
  const lineTex = E.canvasTex(1024, 8, (g, w, h) => { const lg = g.createLinearGradient(0, 0, w, 0); flat.slice(0, 7).concat(['#e8202a', '#ff7a10', '#ffd21a', '#5ae02a', '#10b8ff', '#2a5aff', '#8a2aff']).slice(7).forEach((c, i, a) => lg.addColorStop(i / (a.length - 1), c)); g.fillStyle = lg; g.fillRect(0, 0, w, h); });
  const line = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 0.06), new THREE.MeshBasicMaterial({ map: lineTex, toneMapped: false })); line.position.y = -1.7; title.add(line);
  const glint = E.glints(scene, [{ pos: [-5.6, 1.9, 0.6], t: 5.6, size: 1.8 }, { pos: [5.4, -0.2, 0.6], t: 6.3, size: 1.6 }, { pos: [0.8, 1.9, 0.6], t: 7.0, size: 1.3 }]);

  const camera = new THREE.PerspectiveCamera(34, ctx.aspect, 0.1, 400);
  function update(t) {
    // 0 a 4 s: voo pelo tunel
    const f = E.easeInOut(E.seg(t, 0, 4.0), 2);
    const z = E.lerp(14, -25 * 6 + 10, f);
    tunnel.visible = t < 4.0;
    camera.position.set(Math.sin(t * 0.8) * 0.6, Math.cos(t * 0.6) * 0.4, z); camera.lookAt(Math.sin(t * 0.8) * 0.3, 0, z - 20);
    camera.rotation.z += Math.sin(t * 0.5) * 0.08;
    tiles.forEach((g, i) => { g.rotation.y = -Math.cos(i * 0.95) * 0.35 + Math.sin(t * 1.5 + i) * 0.1; });
    streaks.forEach((s) => { const u = s.userData; s.position.set(u.x, u.y, camera.position.z - 10 + ((u.z0 + t * 60) % 160 + 160) % 160 * -1 + 40); s.visible = t < 4.0; });
    // 4.2 s em diante: titulo
    title.visible = t >= 4.0;
    if (t >= 4.0) {
      const tt = t - 4.0;
      camera.position.set(Math.sin(tt * 0.3) * 0.5, 0.1, E.lerp(10, 13, E.easeOut(E.seg(tt, 0, 3.5)))); camera.lookAt(0, 0, 0); camera.rotation.z = 0;
      for (const l of vg.letters) { const d = 0.1 + l.userData.idx * 0.06; const e = E.easeOut(E.seg(tt, d, d + 1.0), 4); const h = l.userData.home; l.position.set(h.x, h.y, h.z + (1 - e) * 12); l.rotation.y = (1 - e) * 2; l.visible = e > 0.001; }
      for (const l of esp.letters) { const d = 0.9 + l.userData.idx * 0.05; l.scale.setScalar(Math.max(0.001, E.easeOut(E.seg(tt, d, d + 0.4)))); }
      for (const l of sub.letters) { const d = 1.1 + l.userData.idx * 0.035; const e = E.easeOut(E.seg(tt, d, d + 0.5)); l.scale.setScalar(Math.max(0.001, e)); }
      for (const l of yrs.letters) { const d = 1.6 + l.userData.idx * 0.03; l.scale.setScalar(Math.max(0.001, E.easeOut(E.seg(tt, d, d + 0.4)))); }
      line.scale.x = Math.max(0.001, E.easeInOut(E.seg(tt, 0.8, 1.8)));
      const o = E.easeIn(E.seg(t, dur - 0.9, dur), 3); title.position.z = o * 9;
    }
    scene.environmentRotation.y = t * 0.3;
    glint(t);
  }
  return { scene, camera, update, dur,
    post: { bloom: 0.4, bloomRadius: 0.6, bloomThreshold: 0.85, exposure: 1.05 },
    postAt: (t) => ({ flash: Math.max(0.95 * Math.sin(Math.PI * E.seg(t, 3.75, 4.35)), 0.9 * E.easeIn(E.seg(t, dur - 0.35, dur), 2)), fade: 1 - E.smooth(E.seg(t, 0, 0.6)) }) };
}
