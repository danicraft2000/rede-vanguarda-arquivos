// 6 ANOS (2009): "6" cinza com rastro arco-iris (roxo, vermelho, laranja, amarelo,
// verde, azul) saindo para tras e selo branco com VAN/GUAR/DA preto.
import * as E from '../engine.js';
const { THREE } = E;

export async function build(ctx) {
  const dur = ctx.dur;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.environment = E.envStudio();
  scene.environmentIntensity = 0.35;
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 4, 9); scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.6); fill.position.set(-6, -2, 4); scene.add(fill);

  const root = new THREE.Group(); scene.add(root);
  const S = 6.4;
  const colors = ['#8a1fd6', '#d4161e', '#ef7a12', '#e8c21a', '#2fa52a', '#1a2ad8'];
  const layers = [];
  const gray = E.M.plastic(0xa9a9ad, { roughness: 0.55, clearcoat: 0.2 });
  const front = E.glyphMesh('6', gray, { size: S, depth: 0.5, bevel: 0.04, bevelSeg: 3, curveSeg: 32 });
  root.add(front);
  colors.forEach((c, i) => {
    const m = E.glyphMesh('6', E.M.plastic(c, { roughness: 0.5, clearcoat: 0.3 }), { size: S, depth: 0.5, bevel: 0.03, curveSeg: 32 });
    root.add(m); layers.push(m);
  });
  // selo: disco branco levemente abaulado com o nome em preto (letras normais da Avant Garde)
  const badge = new THREE.Group();
  const disc = new THREE.Mesh(E.extrude([E.circleShape(1.05)], { depth: 0.12, bevel: 0.06, bevelSeg: 6, curveSeg: 64 }), E.M.plastic(0xfafafa, { roughness: 0.3, clearcoat: 1 }));
  badge.add(disc);
  const nm = E.makeText('VAN\nGUAR\nDA', { size: 0.58, depth: 0.04, bevel: 0, align: 'left', lineHeight: 0.84, material: E.M.basic(0x0a0a0a) });
  for (const l of nm.letters) { if (l.userData.line === 0) { l.position.x -= 0.02; } if (l.userData.line === 2) { l.position.x += 0.2; } }
  nm.group.position.z = 0.17; nm.group.rotation.z = -0.12; badge.add(nm.group);
  // posicao do selo: centro da barriga do 6
  badge.position.set(0.35, -0.95, 0.42); root.add(badge);
  const shadowDisc = new THREE.Mesh(new THREE.CircleGeometry(1.25, 64), new THREE.MeshBasicMaterial({ map: E.softDotTex('0,0,0'), transparent: true, opacity: 0.6, depthWrite: false }));
  shadowDisc.position.set(0.5, -1.1, 0.27); root.add(shadowDisc);

  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.1, 200);
  function update(t) {
    const e0 = E.easeOut(E.seg(t, 0.0, 1.4), 4);
    front.position.set(0, (1 - e0) * -9, 0); front.rotation.set(0, (1 - e0) * -1.2, 0);
    // as camadas saem de tras do 6, uma de cada vez, para cima-esquerda
    layers.forEach((m, i) => { const d = 0.9 + i * 0.12; const e = E.easeOutBack(E.seg(t, d, d + 0.9), 1.3); const k = (i + 1) * e;
      m.position.set(-0.36 * k + front.position.x, 0.1 * k + front.position.y, -0.55 * (i + 1)); m.rotation.copy(front.rotation); m.visible = t > d; });
    const b = E.spring(E.seg(t, 1.9, 3.4) * 1.5, 11, 5);
    badge.scale.setScalar(Math.max(0.001, b)); badge.rotation.z = (1 - E.easeOut(E.seg(t, 1.9, 3.2))) * -2.5; shadowDisc.material.opacity = 0.6 * E.seg(t, 2.0, 2.6);
    root.rotation.y = 0.35 * (1 - E.easeInOut(E.seg(t, 0, 3.6))) - 0.06 + Math.sin(t * 0.5) * 0.03;
    root.rotation.x = 0.08 * (1 - E.easeInOut(E.seg(t, 0, 3.6)));
    camera.position.set(0.0, 0.2, E.lerp(15.5, 13.8, E.easeOut(E.seg(t, 0, 5))));
    camera.lookAt(-0.5, 0.1, 0);
    const o = E.easeIn(E.seg(t, dur - 0.9, dur), 3);
    layers.forEach((m, i) => { m.position.x -= o * (i + 1) * 1.2; m.position.y += o * (i + 1) * 0.4; });
    root.position.z = o * 4;
  }
  return { scene, camera, update, dur, caption: ctx.info.caption,
    post: { bloom: 0.25, bloomRadius: 0.4, bloomThreshold: 0.9, exposure: 1.0 } };
}
