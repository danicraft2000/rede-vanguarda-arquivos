// 20 ANOS (2023): "20" feito de triangulos dourados (hexagonal) com raios de luz.
import * as E from '../engine.js';
const { THREE } = E;

export async function build(ctx) {
  const dur = ctx.dur;
  const scene = new THREE.Scene();
  scene.background = E.gradientBg([[0, '#3a2604'], [0.35, '#1a1002'], [1, '#000000']], { radial: true });
  scene.environment = E.envPanels([
    { pos: [0, 4, 14], w: 24, h: 10, grad: ['#fff4d8', '#ffd890', '#6a4a10', '#140c02'], i: 1.4 },
    { color: 0xffe0a0, pos: [-6, 8, 4], w: 6, h: 3, i: 3 }, { color: 0xffb040, pos: [8, -2, 3], w: 2, h: 10, i: 2 },
  ], { bg: 0x0a0602 });
  const key = new THREE.DirectionalLight(0xffe2b0, 2.0); key.position.set(-3, 5, 8); scene.add(key);

  // raios de luz atras
  const rayTex = E.canvasTex(1024, 1024, (g, w, h) => {
    g.translate(w / 2, h / 2); const rr = E.rng(23);
    for (let i = 0; i < 70; i++) { const a = rr() * Math.PI * 2, wd = 0.01 + rr() * 0.05; const lg = g.createRadialGradient(0, 0, 0, 0, 0, w / 2);
      lg.addColorStop(0, `rgba(255,200,110,${0.25 + rr() * 0.35})`); lg.addColorStop(1, 'rgba(255,170,60,0)'); g.fillStyle = lg;
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, w / 2, a, a + wd); g.closePath(); g.fill(); }
    const cg = g.createRadialGradient(0, 0, 0, 0, 0, w * 0.3); cg.addColorStop(0, 'rgba(255,220,150,0.9)'); cg.addColorStop(1, 'rgba(255,160,40,0)'); g.fillStyle = cg; g.fillRect(-w / 2, -h / 2, w, h);
  });
  const rays = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial({ map: rayTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  rays.position.set(0.3, 0.2, -6); scene.add(rays);
  const rays2 = rays.clone(); rays2.material = rays.material.clone(); rays2.position.z = -5.5; scene.add(rays2);

  // grade triangular: "2" (traco poligonal) e "0" (anel hexagonal)
  const a = 0.82, hh = a * Math.sqrt(3) / 2;
  const segDist = (px, py, ax, ay, bx, by) => { const vx = bx - ax, vy = by - ay; const tt = E.clamp(((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)); return Math.hypot(px - ax - vx * tt, py - ay - vy * tt); };
  const path2 = [[-4.6, 0.85], [-3.85, 2.15], [-2.25, 2.15], [-1.5, 0.85], [-2.35, -0.55], [-3.95, -1.85], [-1.4, -1.85]];
  const in2 = (x, y) => { let d = 1e9; for (let i = 0; i < path2.length - 1; i++) d = Math.min(d, segDist(x, y, ...path2[i], ...path2[i + 1])); return d < 0.5; };
  const c0 = [1.85, 0.12];
  const hexR = (x, y) => { const dx = Math.abs(x - c0[0]), dy = Math.abs(y - c0[1]); return Math.max(dx * Math.sqrt(3) / 2 + dy / 2, dy); };
  const in0 = (x, y) => { const h = hexR(x, y); return h > 1.15 && h < 2.15; };
  const tris = [];
  for (let row = -6; row <= 6; row++) for (let col = -16; col <= 14; col++) {
    const up = ((row + col) & 1) === 0; const cx = col * a / 2, cy = row * hh; const yc = up ? cy - hh / 6 : cy + hh / 6;
    if (in2(cx, yc) || in0(cx, yc)) tris.push({ x: cx, y: yc, up });
  }
  const gap = 0.05;
  const triGeo = (up) => { const s = a - gap * 1.7, h = s * Math.sqrt(3) / 2; const sh = up ? E.polyShape([[-s / 2, -h / 3], [s / 2, -h / 3], [0, 2 * h / 3]]) : E.polyShape([[-s / 2, h / 3], [0, -2 * h / 3], [s / 2, h / 3]]); return E.extrude([sh], { depth: 0.22, bevel: 0.06, bevelSeg: 3 }); };
  const gU = triGeo(true), gD = triGeo(false);
  const gold = E.M.metal(0xffc35a, { roughness: 0.22, clearcoat: 0.6, clearcoatRoughness: 0.1 });
  const root = new THREE.Group(); scene.add(root);
  const r = E.rng(2023);
  const meshes = tris.map((t) => { const m = new THREE.Mesh(t.up ? gU : gD, gold); m.userData = { home: new THREE.Vector3(t.x, t.y, 0), d: 0.2 + (t.x + 5) * 0.12 + r() * 0.25, s: (r() - 0.5) * 8 }; root.add(m); return m; });
  root.position.x = 0.9;
  const glint = E.glints(scene, [{ pos: [-2.5, 2.2, 1], t: 3.0, size: 1.8 }, { pos: [3.9, 1.3, 1], t: 3.6, size: 1.6 }, { pos: [-0.6, -1.9, 1], t: 4.2, size: 1.4 }]);

  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.1, 200);
  function update(t) {
    meshes.forEach((m) => { const u = m.userData; const p = E.seg(t, u.d, u.d + 1.0); const e = E.easeOut(p, 4);
      m.position.set(u.home.x, u.home.y, (1 - e) * 14); m.rotation.set((1 - e) * Math.PI * 2, (1 - e) * u.s, 0); m.scale.setScalar(Math.max(0.001, e)); });
    rays.rotation.z = t * 0.05; rays2.rotation.z = -t * 0.035 + 1; const ri = E.smooth(E.seg(t, 0.5, 2.5));
    rays.material.opacity = ri * (0.85 + 0.15 * Math.sin(t * 2)); rays2.material.opacity = ri * 0.6;
    root.rotation.set(Math.sin(t * 0.5) * 0.06, -0.3 * (1 - E.easeInOut(E.seg(t, 0, 3.6))) + Math.sin(t * 0.4) * 0.06, 0);
    camera.position.set(0, 0.1, E.lerp(16, 14, E.easeOut(E.seg(t, 0, 5)))); camera.lookAt(0, 0.1, 0);
    scene.environmentRotation.y = t * 0.4;
    const o = E.easeIn(E.seg(t, dur - 0.9, dur), 3); root.scale.setScalar(1 + o * 0.6); rays.scale.setScalar(1 + o * 2);
    glint(t);
  }
  return { scene, camera, update, dur, caption: ctx.info.caption,
    post: { bloom: 0.6, bloomRadius: 0.6, bloomThreshold: 0.72, exposure: 1.05 },
    postAt: (t) => ({ flash: 0.9 * E.easeIn(E.seg(t, dur - 0.35, dur), 2) }) };
}
