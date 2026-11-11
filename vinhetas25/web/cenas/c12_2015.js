// 12 ANOS (2015): relogio-roda de cores (degrade conico), marcas das 3, 6 e 9,
// "12" no topo e circulo translucido com ANOS e VAN/GUAR/DA.
import * as E from '../engine.js';
const { THREE } = E;

export async function build(ctx) {
  const dur = ctx.dur;
  const scene = new THREE.Scene();
  scene.background = E.gradientBg([[0, '#ffffff'], [0.8, '#f7f8fa'], [1, '#e9ebf0']], { radial: true });
  scene.environment = E.envPanels([{ pos: [0, 5, 12], w: 20, h: 8, color: 0xffffff, i: 1.6 }, { pos: [0, -5, 10], w: 20, h: 4, color: 0x808890, i: 0.8 }], { bg: 0xb0b6be });
  E.shadowCatcher(scene, { z: -0.8, opacity: 0.12 });
  E.sun(scene, { pos: [-2, 6, 10], intensity: 1.0, size: 6 });
  scene.add(new THREE.AmbientLight(0xffffff, 0.8));

  const R = 3.0;
  const root = new THREE.Group(); scene.add(root);
  const wheelTex = E.canvasTex(1024, 1024, (g, w, h) => {
    // degrade conico: verde a direita, azul em cima, magenta a esquerda, vermelho/laranja embaixo
    const cg = g.createConicGradient(0, w / 2, h / 2);
    const st = ['#00ff2a', '#a8ff00', '#ffe600', '#ff8a00', '#ff1a1a', '#ff0a60', '#ff00d0', '#c000ff', '#5a00ff', '#1a10ff', '#00a0ff', '#00f0ff', '#00ff2a'];
    st.forEach((c, i) => cg.addColorStop(i / (st.length - 1), c));
    g.fillStyle = cg; g.fillRect(0, 0, w, h);
    // clareia levemente o miolo (como no original)
    const rg = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    rg.addColorStop(0, 'rgba(255,255,255,0.35)'); rg.addColorStop(0.55, 'rgba(255,255,255,0.05)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(0, 0, w, h);
  });
  const wheelMat = new THREE.MeshPhysicalMaterial({ map: wheelTex, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 0.4 });
  const wheel = new THREE.Mesh(new THREE.CircleGeometry(R, 256), wheelMat); wheel.castShadow = true; root.add(wheel);
  const back = new THREE.Mesh(E.extrude([E.circleShape(R)], { depth: 0.2, bevel: 0.02, curveSeg: 128 }), E.M.plastic(0xffffff)); back.position.z = -0.26; back.castShadow = true; root.add(back);
  const ticks = [];
  for (const a of [0, -Math.PI / 2, Math.PI]) { // 3, 6 e 9 horas
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.07), E.M.basic(0xffffff)); const rr = R - 0.36;
    m.position.set(Math.cos(a) * rr, Math.sin(a) * rr, 0.02); m.rotation.z = a; root.add(m); ticks.push(m);
  }
  const inner = new THREE.Mesh(new THREE.CircleGeometry(R * 0.58, 128), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, toneMapped: false }));
  inner.position.set(0, -0.05, 0.03); root.add(inner);
  const white = E.M.plastic(0xffffff, { roughness: 0.35 });
  const twelve = E.makeText('12', { size: 1.9, depth: 0.2, bevel: 0.02, tracking: -0.04, material: white });
  twelve.group.position.set(0, R - 0.55, 0.15); root.add(twelve.group);
  const anos = E.makeText(E.logo('ANOS'), { size: 0.36, depth: 0.03, bevel: 0, tracking: 0.75, material: E.M.basic(0xffffff) });
  anos.group.position.set(0.05, 1.07, 0.1); root.add(anos.group);
  const vg = E.makeText(E.logo('VAN\nGUAR\nDA'), { size: 0.95, depth: 0.1, bevel: 0.01, align: 'right', lineHeight: 0.84, material: white });
  vg.group.position.set(0.15, -0.55, 0.1); root.add(vg.group);

  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.1, 200);
  let lastSweep = -1;
  function update(t) {
    // "varredura" de relogio revelando a roda
    const sw = E.easeInOut(E.seg(t, 0.1, 1.6), 2);
    if (Math.abs(sw - lastSweep) > 1e-4) { wheel.geometry.dispose(); const L = Math.max(1e-3, sw) * Math.PI * 2; wheel.geometry = new THREE.CircleGeometry(R, 256, Math.PI / 2 - L, L); lastSweep = sw; }
    back.scale.setScalar(Math.max(0.001, E.easeOutBack(E.seg(t, 0.0, 0.6), 1.5)));
    wheel.rotation.z = (1 - E.easeOut(E.seg(t, 0, 2.5))) * 0.8;
    ticks.forEach((m, i) => { const e = E.easeOut(E.seg(t, 1.3 + i * 0.12, 1.7 + i * 0.12)); m.scale.set(Math.max(0.001, e), 1, 1); });
    const e12 = E.spring(E.seg(t, 1.5, 3.0) * 1.4, 10, 5); twelve.group.position.y = R - 0.55 + (1 - e12) * 3; twelve.group.scale.setScalar(Math.max(0.001, Math.min(1.2, e12)));
    inner.scale.setScalar(Math.max(0.001, E.easeOutBack(E.seg(t, 1.2, 1.9), 1.4)));
    for (const l of anos.letters) { const d = 2.0 + l.userData.idx * 0.08; l.scale.setScalar(Math.max(0.001, E.easeOut(E.seg(t, d, d + 0.4)))); }
    for (const l of vg.letters) { const d = 1.9 + l.userData.gidx * 0.06; const e = E.easeOutBack(E.seg(t, d, d + 0.6), 1.6); l.scale.setScalar(Math.max(0.001, e)); }
    root.rotation.set(Math.sin(t * 0.5) * 0.05, -0.25 * (1 - E.easeInOut(E.seg(t, 0, 3.5))) + Math.sin(t * 0.4) * 0.04, 0);
    camera.position.set(0, 0.2, E.lerp(17, 15, E.easeOut(E.seg(t, 0, 5)))); camera.lookAt(0, 0.1, 0);
    const o = E.easeIn(E.seg(t, dur - 0.9, dur), 3); root.rotation.z = -o * 2.5; root.scale.setScalar(1 - o * 0.9);
  }
  return { scene, camera, update, dur, caption: ctx.info.caption, captionDark: true,
    post: { bloom: 0.15, bloomRadius: 0.4, bloomThreshold: 0.98, exposure: 1.0, vignette: 0.12, grain: 0.02, toneMapping: THREE.NeutralToneMapping } };
}
