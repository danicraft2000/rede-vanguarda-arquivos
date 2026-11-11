// 5 ANOS (2008): esfera de vidro com VAN/GUAR/DA cromado dentro; uma fita
// arco-iris (azul -> roxo -> vermelho -> laranja -> amarelo) desenha o "5" em volta.
import * as E from '../engine.js';
const { THREE } = E;

export async function build(ctx) {
  const dur = ctx.dur;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.environment = E.envPanels([
    { pos: [0, 5, 14], w: 24, h: 10, grad: ['#ffffff', '#dfe8ff', '#7a8ab0', '#1a2440'], i: 1.4 },
    { color: 0xffffff, pos: [-6, 8, 4], w: 6, h: 3, i: 3.0 },
    { color: 0x8a5cff, pos: [9, 2, 0], w: 2, h: 10, i: 1.5 },
    { color: 0xff6a20, pos: [0, -9, 3], w: 12, h: 2, i: 1.2 },
  ], { bg: 0x000000 });

  const root = new THREE.Group(); scene.add(root);
  const R = 2.05;
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), new THREE.MeshPhysicalMaterial({ color: 0xa8bcf0, roughness: 0.2, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.03, transparent: true, opacity: 0.72, depthWrite: false, iridescence: 0.5, iridescenceIOR: 1.4 }));
  sphere.renderOrder = 2;
  const core = new THREE.Mesh(new THREE.SphereGeometry(R * 0.985, 64, 48), new THREE.MeshBasicMaterial({ color: 0x1c2a66 })); root.add(core);
  root.add(sphere);
  // letras cromadas azuladas, atravessando a esfera
  const txt = E.makeText(E.logo('VAN\nGUAR\nDA'), { size: 1.3, depth: 0.45, bevel: 0.03, bevelSeg: 3, align: 'center', lineHeight: 0.86,
    material: E.M.chrome({ color: 0xe6edff, roughness: 0.2, iridescence: 0.6, iridescenceIOR: 1.6 }) });
  for (const l of txt.letters) { if (l.userData.line === 2) { l.position.x += 0.35; l.userData.home.x += 0.35; } }
  const tg = new THREE.Group(); tg.add(txt.group); tg.rotation.set(0.1, -0.22, 0.05); tg.position.set(0.25, 0.15, 2.25); root.add(tg);
  // o "D" e o "A" de baixo ganham um tom alaranjado (reflexo da fita, como no original)
  const warm = E.M.chrome({ color: 0xffb070, roughness: 0.15 });
  txt.letters.filter((l) => l.userData.line === 2).forEach((l) => { l.material = warm; });

  // fita que forma o "5"
  const P = (x, y, z) => new THREE.Vector3(x, y, z);
  const curve = new THREE.CatmullRomCurve3([
    P(-0.6, 2.9, 0.5), P(-1.8, 2.55, 0.6), P(-3.0, 2.15, 0.7),     // barra do topo (azul)
    P(-3.25, 1.2, 0.9), P(-3.0, -0.4, 1.2),                           // descida (roxo)
    P(-2.35, -1.95, 1.6), P(-0.8, -2.95, 1.9), P(1.0, -2.85, 1.7),    // barriga (vermelho/laranja)
    P(2.45, -1.6, 1.2), P(2.95, 0.15, 0.4), P(2.4, 1.55, -0.8),       // sobe pela direita (amarelo/verde)
    P(1.1, 2.15, -1.9), P(-0.4, 2.0, -2.4),                           // passa por tras
  ], false, 'centripetal');
  const rgeo = E.ribbonGeo(curve, { width: 0.85, segs: 700, up: new THREE.Vector3(0, 0, 1), widthFn: (u) => 0.75 + 0.35 * Math.sin(Math.min(1, u * 1.2) * Math.PI) * (u < 0.2 ? 1.2 : 1) });
  const cols = new Float32Array(rgeo.attributes.position.count * 3);
  const pal = ['#2a3cff', '#3b2bd8', '#7a1fd0', '#c21aa0', '#e8202a', '#ff5a10', '#ff9a00', '#ffd21a', '#c8e81a', '#8fd82a'];
  for (let i = 0; i < cols.length / 3; i++) { const u = rgeo.attributes.uv.getX(i); const c = E.ramp(pal, u); cols.set([c.r, c.g, c.b], i * 3); }
  rgeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const ribbon = new THREE.Mesh(rgeo, new THREE.MeshPhysicalMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.25, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.1, emissive: 0xffffff, emissiveIntensity: 0.0 }));
  // emissao leve usando a propria cor
  ribbon.material.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance = vColor.rgb * 0.55;'); };
  root.add(ribbon);
  const total = rgeo.index.count;

  const ano = E.makeText(E.logo('ANO'), { size: 0.62, depth: 0.12, bevel: 0.01, material: E.M.basic(0xffffff) });
  ano.group.position.set(-2.35, 3.25, 0.7); ano.group.rotation.z = 0.32; root.add(ano.group);

  const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(-3, 5, 6); scene.add(key);
  const glint = E.glints(scene, [{ pos: [-1.0, 1.3, 2.2], t: 2.8, size: 1.4 }, { pos: [1.6, 1.2, 1.8], t: 3.4, size: 1.8 }, { pos: [-3.0, 2.2, 0.9], t: 4.0, size: 1.2 }]);
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.1, 200);
  function update(t) {
    const s = E.spring(E.seg(t, 0.3, 2.2) * 1.6, 9, 4.5); sphere.scale.setScalar(Math.max(0.001, s));
    for (const l of txt.letters) { const d = 0.9 + l.userData.gidx * 0.06; const e = E.easeOutBack(E.seg(t, d, d + 0.7), 1.8); l.scale.setScalar(Math.max(0.001, e)); l.rotation.x = (1 - E.seg(t, d, d + 0.7)) * 2; }
    rgeo.setDrawRange(0, Math.floor(total * E.easeInOut(E.seg(t, 0.4, 2.6), 2) / 6) * 6);
    for (const l of ano.letters) { const d = 2.4 + l.userData.idx * 0.1; const e = E.easeOut(E.seg(t, d, d + 0.5)); l.scale.setScalar(Math.max(0.001, e)); }
    root.rotation.y = -0.5 * (1 - E.easeInOut(E.seg(t, 0, 3.5))) + Math.sin(t * 0.5) * 0.05;
    tg.rotation.y = -0.22 + Math.sin(t * 0.8) * 0.06;
    camera.position.set(E.lerp(-2.5, -0.1, E.easeInOut(E.seg(t, 0, 3.5))), 0.25, E.lerp(13, 17.5, E.easeOut(E.seg(t, 0, 4))));
    camera.lookAt(-0.2, 0.15, 0);
    const o = E.easeIn(E.seg(t, dur - 0.8, dur), 3); root.position.z = o * 10;
    scene.environmentRotation.y = t * 0.25;
    glint(t);
  }
  return { scene, camera, update, dur, caption: ctx.info.caption,
    post: { bloom: 0.5, bloomRadius: 0.55, bloomThreshold: 0.8, exposure: 1.1 },
    postAt: (t) => ({ fade: E.easeIn(E.seg(t, dur - 0.4, dur), 2) }) };
}
