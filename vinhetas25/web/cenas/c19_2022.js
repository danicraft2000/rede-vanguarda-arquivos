// 19 ANOS (2022): "19" geometrico - barra magenta, anel laranja, quarto de anel
// azul e perna verde-agua, montados em pecas solidas.
import * as E from '../engine.js';
const { THREE } = E;

function ringSector(cx, cy, r1, r2, a0, a1, n = 96) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push([cx + Math.cos(a) * r2, cy + Math.sin(a) * r2]); }
  for (let i = n; i >= 0; i--) { const a = a0 + (a1 - a0) * i / n; pts.push([cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]); }
  return pts;
}

export async function build(ctx) {
  const dur = ctx.dur;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.environment = E.envStudio(); scene.environmentIntensity = 0.3;
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-4, 5, 9); scene.add(key);
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));

  const k = 0.009, X = (x) => (x - 800) * k, Y = (y) => -(y - 453) * k;
  const cx = X(940), cy = Y(330), R = 260 * k, r = 118 * k, yCut = Y(440);
  const pieces = [];
  const mk = (poly, color, from) => {
    const sh = E.polyShape(poly); const g = E.extrude([sh], { depth: 0.5, bevel: 0.025, bevelSeg: 3 });
    const m = new THREE.Mesh(g, E.M.plastic(color, { roughness: 0.55, clearcoat: 0.2 })); m.userData.from = from; pieces.push(m); return m;
  };
  const root = new THREE.Group(); scene.add(root);
  root.add(mk([[X(395), Y(92)], [X(622), Y(92)], [X(622), Y(815)], [X(395), Y(815)]], '#c8146e', [0, -9, 0]));
  // perna (paralelogramo)
  const leg = [[X(935), yCut], [X(1170), yCut], [X(920), Y(815)], [X(675), Y(815)]];
  // azul: metade direita do anel, acima do corte
  let blue = ringSector(cx, cy, r, R, -0.6, Math.PI / 2); blue = E.clipHalf(blue, 0, 1, -yCut); blue = E.clipHalf(blue, 1, 0, -cx);
  // laranja: metade esquerda do anel, ate a borda da perna
  let orange = ringSector(cx, cy, r, R, Math.PI / 2, Math.PI * 1.75, 120);
  orange = E.clipHalf(orange, -1, 0, cx);
  orange = E.clipLine(orange, leg[3], leg[0], 0, true);
  root.add(mk(orange, '#f57a0a', [-8, 2, 0]));
  root.add(mk(blue, '#1010f0', [6, 7, 0]));
  root.add(mk(leg, '#10d6b6', [5, -8, 0]));

  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.1, 200);
  function update(t) {
    pieces.forEach((m, i) => { const d = 0.15 + i * 0.22; const e = E.easeOutBack(E.seg(t, d, d + 0.9), 1.3); const f = m.userData.from;
      m.position.set(f[0] * (1 - e), f[1] * (1 - e), f[2] * (1 - e)); m.rotation.z = (1 - E.easeOut(E.seg(t, d, d + 0.9))) * (i % 2 ? 0.8 : -0.8); });
    const sw = E.easeInOut(E.seg(t, 1.6, 3.6), 3);
    root.rotation.set(Math.sin(sw * Math.PI) * 0.25, Math.sin(sw * Math.PI) * -0.45 + Math.sin(t * 0.4) * 0.03, 0);
    camera.position.set(0, 0, E.lerp(17, 15.5, E.easeOut(E.seg(t, 0, 5)))); camera.lookAt(0, 0, 0);
    const o = E.easeIn(E.seg(t, dur - 0.9, dur), 3);
    pieces.forEach((m, i) => { const f = m.userData.from; m.position.x += -f[0] * o * 1.2; m.position.y += -f[1] * o * 1.2; });
  }
  return { scene, camera, update, dur, caption: ctx.info.caption,
    post: { bloom: 0.15, bloomRadius: 0.4, bloomThreshold: 0.95, exposure: 1.0, toneMapping: THREE.NeutralToneMapping } };
}
