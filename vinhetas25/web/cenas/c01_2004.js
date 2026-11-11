// 1 ANO (2004): VAN/GUAR/DA cromado azul-gelo + "1" gigante com "ANO" vazado em pe,
// bordas iridescentes (arco-iris) e fundo preto -> azul royal.
import * as E from '../engine.js';
const { THREE } = E;

export async function build(ctx) {
  const dur = ctx.dur;
  const scene = new THREE.Scene();
  scene.background = E.gradientBg([[0, '#000000'], [0.45, '#02030f'], [0.8, '#0d0f6a'], [1, '#2023b8']], { angle: 90 });
  scene.environment = E.envPanels([
    { pos: [0, 4, 14], w: 26, h: 12, grad: ['#ffffff', '#e6fbff', '#a9c6d2', '#4a6472', '#c4e9f7'], i: 1.25 },   // softbox frontal (face prateada)
    { color: 0xffffff, pos: [0, 10, 2], w: 16, h: 4, i: 1.8 },
    { color: 0xbfefff, pos: [-9, 2, 6], w: 3, h: 12, i: 1.3 },
    { color: 0x6fa8ff, pos: [9, -2, 5], w: 3, h: 10, i: 1.0 },
    { color: 0xff3fa0, pos: [7, 5, -4], w: 1.0, h: 9, i: 3.0 },
    { color: 0xffe14a, pos: [-7, -5, -4], w: 1.0, h: 9, i: 3.0 },
    { color: 0x2affd5, pos: [0, -9, 4], w: 12, h: 1.0, i: 2.5 },
    { color: 0x1a2cff, pos: [0, -6, -8], w: 16, h: 4, i: 1.4 },
  ], { bg: 0x03040c });
  scene.environmentIntensity = 1.0;

  const ice = E.M.chrome({ color: 0xd7f1f2, roughness: 0.2, iridescence: 1, iridescenceIOR: 2.0, iridescenceThicknessRange: [300, 1000] });
  const root = new THREE.Group(); scene.add(root);

  // VAN / GUAR / DA (alinhado a direita, como no original)
  const txt = E.makeText(E.logo('VAN\nGUAR\nDA'), { size: 1.38, depth: 0.42, bevel: 0.035, bevelSeg: 4, align: 'right', lineHeight: 0.85, material: ice });
  // a primeira linha termina antes da bandeira do "1"
  for (const l of txt.letters) if (l.userData.line === 0) { l.position.x -= 0.95; l.userData.home.x -= 0.95; }
  txt.group.position.set(-1.05, -0.05, 0);
  root.add(txt.group);

  // "1" com ANO vazado (furos), em pe
  const one = E.textShapes('1', 4.3).shapes[0];
  const bb = new THREE.Box2(); one.getPoints(8).forEach((p) => bb.expandByPoint(p));
  const ano = E.textShapes(E.logo('ANO'), 1.0, { tracking: 0.04 }).shapes;
  const span = E.spanAtY(one, bb.min.y + (bb.max.y - bb.min.y) * 0.3);
  const stemCx = (span[0] + span[1]) / 2, stemCy = bb.min.y + (bb.max.y - bb.min.y) * 0.42;
  const rot = (v) => new THREE.Vector2(-v.y + stemCx, v.x + stemCy); // gira 90 graus
  const islands = [];
  const outer = new THREE.Shape(one.getPoints(24));
  for (const s of ano) {
    outer.holes.push(new THREE.Path(s.getPoints(12).map(rot)));
    for (const h of s.holes) islands.push(new THREE.Shape(h.getPoints(12).map(rot)));
  }
  const oneGeo = E.extrude([outer, ...islands], { depth: 0.62, bevel: 0.045, bevelSeg: 4, curveSeg: 24 });
  oneGeo.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, 0);
  const oneMesh = new THREE.Mesh(oneGeo, ice);
  const onePivot = new THREE.Group(); onePivot.add(oneMesh);
  onePivot.position.set(2.95, 0.02, -0.05);
  root.add(onePivot);
  // fundo escuro dentro do vazado (para o ANO ler como gravado)
  const back = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 3.4), E.M.metal(0x05060c, { roughness: 0.5 }));
  back.position.set(stemCx - (bb.min.x + bb.max.x) / 2, stemCy - (bb.min.y + bb.max.y) / 2, -0.36);
  oneMesh.add(back);

  // brilhos (estrelas) que passam pelas quinas
  const star = E.starTex();
  const stars = [];
  for (let i = 0; i < 3; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: star, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); scene.add(s); stars.push(s); }

  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.1, 200);
  const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(-3, 5, 8); scene.add(key);

  function update(t) {
    // entrada das letras: vem do fundo girando, em cascata
    for (const l of txt.letters) {
      const d = 0.25 + l.userData.line * 0.22 + l.userData.idx * 0.07;
      const p = E.seg(t, d, d + 1.3);
      const e = E.easeOut(p, 4);
      const h = l.userData.home;
      l.position.set(h.x - (1 - e) * 3, h.y + (1 - e) * 1.2, (1 - e) * -18);
      l.rotation.set((1 - e) * 1.2, (1 - e) * -2.4, 0);
    }
    // "1" entra girando em pe
    const p1 = E.easeOut(E.seg(t, 0.55, 2.2), 4);
    onePivot.rotation.set(0, (1 - p1) * Math.PI * 1.25, 0);
    onePivot.position.set(2.95 + (1 - p1) * 4, 0.02, -0.05 - (1 - p1) * 10);
    // camera: aproxima e assenta, com leve deriva
    const c = E.easeInOut(E.seg(t, 0, 3.0), 3);
    const drift = (t - 3) * 0.04;
    camera.position.set(E.lerp(-3.5, 0.3, c) + drift, E.lerp(-1.2, 0.05, c), E.lerp(9, 12.4, c) - drift * 2);
    camera.lookAt(0.2, -0.05, 0);
    // saida: avanca e clareia
    const o = E.easeIn(E.seg(t, dur - 0.9, dur), 3);
    root.position.z = o * 9; root.rotation.y = o * -0.5;
    scene.environmentRotation.y = -0.6 + t * 0.22;
    scene.environmentRotation.x = Math.sin(t * 0.5) * 0.15;
    // estrelas
    const pts = [[-3.95, 2.05, 0.4], [4.05, 2.3, 0.5], [1.15, -2.05, 0.4]];
    stars.forEach((s, i) => {
      const tt = 2.4 + i * 0.55; const k = Math.sin(Math.PI * E.seg(t, tt, tt + 0.7));
      s.position.set(...pts[i]); s.scale.setScalar(1.6 * k + 0.001); s.material.opacity = k; s.material.rotation = t * 0.8;
    });
  }
  return {
    scene, camera, update, dur, caption: ctx.info.caption,
    post: { bloom: 0.45, bloomRadius: 0.6, bloomThreshold: 0.8, exposure: 1.05 },
    postAt: (t) => ({ flash: Math.max(0, 1 - t / 0.35) * 0.0 + 0.85 * E.easeIn(E.seg(t, dur - 0.35, dur), 2) }),
  };
}
