// 13 ANOS (2016): borboleta de asas arco-iris (com nervuras pretas) batendo asas,
// VAN/GUAR/DA e "13" brancos no centro.
import * as E from '../engine.js';
const { THREE } = E;

function wingTex() {
  // asa direita (o corpo fica na borda esquerda da textura)
  return E.canvasTex(1024, 1280, (g, w, h) => {
    const P = (x, y) => [x * w, y * h];
    const path = new Path2D();
    path.moveTo(...P(0.02, 0.47));
    path.bezierCurveTo(...P(0.2, 0.2), ...P(0.45, 0.02), ...P(0.72, 0.02));     // borda de cima
    path.bezierCurveTo(...P(0.92, 0.02), ...P(1.0, 0.1), ...P(0.95, 0.24));
    path.bezierCurveTo(...P(0.9, 0.38), ...P(0.75, 0.45), ...P(0.62, 0.5));      // ponta
    path.bezierCurveTo(...P(0.82, 0.58), ...P(0.9, 0.72), ...P(0.82, 0.86));     // asa de baixo
    path.bezierCurveTo(...P(0.74, 0.99), ...P(0.5, 1.0), ...P(0.32, 0.94));
    path.bezierCurveTo(...P(0.16, 0.86), ...P(0.06, 0.66), ...P(0.02, 0.53));
    path.closePath();
    g.save(); g.clip(path);
    const lg = g.createLinearGradient(0, 0, 0, h);
    [['#d0101a', 0], ['#ff3a10', 0.12], ['#ff9a10', 0.24], ['#ffe020', 0.36], ['#7ad62a', 0.48], ['#10c060', 0.58], ['#10c8c8', 0.68], ['#1080f0', 0.8], ['#2030d0', 0.9], ['#3a10a0', 1]].forEach(([c, p]) => lg.addColorStop(p, c));
    g.fillStyle = lg; g.fillRect(0, 0, w, h);
    // sombra perto do corpo
    const sg = g.createLinearGradient(0, 0, w * 0.35, 0); sg.addColorStop(0, 'rgba(0,0,0,0.35)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sg; g.fillRect(0, 0, w, h);
    // nervuras
    g.strokeStyle = 'rgba(10,10,10,0.95)'; g.lineCap = 'round';
    const veins = [[0.66, 0.06], [0.82, 0.08], [0.93, 0.18], [0.85, 0.36], [0.62, 0.5], [0.85, 0.66], [0.8, 0.84], [0.6, 0.97], [0.38, 0.95], [0.48, 0.12], [0.3, 0.2]];
    veins.forEach(([x, y], i) => { g.lineWidth = 5 - (i % 3); g.beginPath(); g.moveTo(...P(0.03, 0.5)); g.quadraticCurveTo(...P(x * 0.55, 0.5 + (y - 0.5) * 0.35), ...P(x, y)); g.stroke(); });
    g.lineWidth = 3; g.beginPath(); g.moveTo(...P(0.2, 0.36)); g.bezierCurveTo(...P(0.4, 0.4), ...P(0.5, 0.42), ...P(0.6, 0.48)); g.stroke();
    g.beginPath(); g.moveTo(...P(0.2, 0.64)); g.bezierCurveTo(...P(0.4, 0.6), ...P(0.55, 0.6), ...P(0.66, 0.6)); g.stroke();
    // borda preta com pintinhas
    g.restore(); g.lineWidth = 26; g.strokeStyle = '#0a0a0a'; g.stroke(path);
    g.save(); g.clip(path); g.fillStyle = '#0a0a0a';
    g.beginPath(); g.ellipse(...P(0.84, 0.07), w * 0.16, h * 0.05, 0.3, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ff5a10'; for (const [x, y] of [[0.74, 0.08], [0.82, 0.06], [0.89, 0.1]]) { g.beginPath(); g.ellipse(...P(x, y), 14, 10, 0.3, 0, Math.PI * 2); g.fill(); }
    g.restore();
  });
}

export async function build(ctx) {
  const dur = ctx.dur;
  const scene = new THREE.Scene();
  scene.background = E.gradientBg([[0, '#fbfbfc'], [0.6, '#eceef1'], [1, '#c9ced6']], { radial: true });
  scene.environment = E.envStudio(); scene.environmentIntensity = 0.6;
  E.shadowCatcher(scene, { z: -1.6, opacity: 0.14 });
  E.sun(scene, { pos: [-2, 5, 10], intensity: 1.6, size: 7 });
  scene.add(new THREE.AmbientLight(0xffffff, 0.8));

  const root = new THREE.Group(); scene.add(root);
  const fly = new THREE.Group(); root.add(fly);
  const tex = wingTex();
  const wingMat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 });
  const WW = 4.2, WH = 5.25;
  const mkWing = (s) => { const geo = new THREE.PlaneGeometry(WW, WH, 24, 1); geo.translate(WW / 2, 0, 0); const m = new THREE.Mesh(geo, wingMat); m.castShadow = true; const piv = new THREE.Group(); piv.add(m); piv.scale.x = s; fly.add(piv); return piv; };
  const right = mkWing(1), left = mkWing(-1);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 2.2, 8, 16), E.M.plastic(0x111111, { roughness: 0.4 })); body.castShadow = true; fly.add(body);

  const white = E.M.plastic(0xffffff, { roughness: 0.4 });
  const n13 = E.makeText('13', { size: 3.0, depth: 0.25, bevel: 0.025, tracking: -0.03, material: white });
  n13.group.position.set(0.95, -0.05, 0.6); root.add(n13.group);
  const vg = E.makeText(E.logo('VAN\nGUAR\nDA'), { size: 0.62, depth: 0.08, bevel: 0.01, align: 'left', lineHeight: 0.86, material: white });
  vg.group.position.set(-1.5, -0.25, 0.75); root.add(vg.group);

  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.1, 200);
  function update(t) {
    // bate asas rapido e vai acalmando ate abrir
    const calm = E.easeInOut(E.seg(t, 0.6, 3.2), 2);
    const flap = Math.sin(t * 13) * (1 - calm) * 1.1 + Math.sin(t * 2.2) * 0.06 * calm;
    const open = E.lerp(1.2, 0.0, E.easeOut(E.seg(t, 0, 0.6)));
    right.rotation.y = -(Math.max(0, flap) * 0.9 + open) - 0.12 * calm; left.rotation.y = (Math.max(0, flap) * 0.9 + open) + 0.12 * calm;
    fly.position.set((1 - E.easeOut(E.seg(t, 0, 2.6), 3)) * -9, (1 - E.easeOut(E.seg(t, 0, 2.6), 3)) * -3 + Math.sin(t * 1.6) * 0.06, 0);
    fly.rotation.set(0.1 * (1 - calm), 0, (1 - E.easeOut(E.seg(t, 0, 2.6))) * 0.5);
    const e = E.easeOutBack(E.seg(t, 2.2, 3.0), 1.5); n13.group.scale.setScalar(Math.max(0.001, e));
    for (const l of vg.letters) { const d = 2.5 + l.userData.gidx * 0.06; l.scale.setScalar(Math.max(0.001, E.easeOutBack(E.seg(t, d, d + 0.5), 1.6))); }
    camera.position.set(Math.sin(t * 0.3) * 0.4, 0.1, E.lerp(15.5, 14, E.easeOut(E.seg(t, 0, 5)))); camera.lookAt(0, 0, 0);
    const o = E.easeIn(E.seg(t, dur - 1.0, dur), 2);
    if (o > 0) { const f = Math.sin((t - (dur - 1)) * 14) * o; right.rotation.y -= Math.max(0, f) * 1.2; left.rotation.y += Math.max(0, f) * 1.2; fly.position.y += o * 6; fly.position.x += o * 4; }
    n13.group.position.z = 0.6 + o * 4; vg.group.position.z = 0.75 + o * 4;
  }
  return { scene, camera, update, dur, caption: ctx.info.caption, captionDark: true,
    post: { bloom: 0.15, bloomRadius: 0.4, bloomThreshold: 0.98, exposure: 1.0, vignette: 0.15, grain: 0.02, toneMapping: THREE.NeutralToneMapping } };
}
