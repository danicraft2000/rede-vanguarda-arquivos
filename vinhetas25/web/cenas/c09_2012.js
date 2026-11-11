// 9 ANOS (2012): "NOVE ANOS" em placas pretas (letreiro de virar) sobre uma faixa
// de luz arco-iris desfocada.
import * as E from '../engine.js';
const { THREE } = E;

export async function build(ctx) {
  const dur = ctx.dur;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.environment = E.envPanels([{ pos: [0, 6, 12], w: 20, h: 6, color: 0xffffff, i: 1.2 }, { pos: [0, -6, 8], w: 20, h: 3, color: 0xff60c0, i: 0.6 }], { bg: 0x000000 });

  // brilho arco-iris: textura desfocada pintada no canvas e animada por deslocamento
  const glowTex = E.canvasTex(1024, 256, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.filter = 'blur(28px)';
    const blobs = [['#c8c000', 0.08], ['#e85020', 0.28], ['#ff3060', 0.4], ['#ff9020', 0.55], ['#d040c0', 0.72], ['#7040ff', 0.86], ['#20c0c0', 0.98], ['#c8c000', 1.08]];
    for (const [c, x] of blobs) { g.fillStyle = c; g.beginPath(); g.ellipse(x * w, h * 0.5, w * 0.12, h * 0.24, 0, 0, Math.PI * 2); g.fill(); }
  }, { repeat: true });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(36, 9), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  glow.position.z = -3; scene.add(glow);

  const root = new THREE.Group(); scene.add(root);
  const word = 'NOVE ANOS';
  const tiles = [];
  const tileMat = E.M.plastic(0x050505, { roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05 });
  const letterMat = E.M.plastic(0xffffff, { roughness: 0.35 });
  const size = 1.15, step = 1.32;
  [...word].forEach((ch, i) => {
    const g = new THREE.Group();
    const tile = new THREE.Mesh(E.extrude([E.rectShape(1.22, 1.45, 0, 0, 0.04)], { depth: 0.18, bevel: 0.02 }), tileMat); g.add(tile);
    if (ch !== ' ') { const m = E.glyphMesh(ch, letterMat, { size, depth: 0.06, bevel: 0.006 }); m.position.z = 0.13; g.add(m); }
    // borda clara fininha (como no original)
    const edge = new THREE.Mesh(E.extrude([E.rectShape(1.27, 1.5, 0, 0, 0.05)], { depth: 0.12, bevel: 0 }), E.M.matte(0x2a2a2a)); edge.position.z = -0.04; g.add(edge);
    g.position.set((i - (word.length - 1) / 2) * step, 0, 0);
    root.add(g); tiles.push(g);
  });
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.1, 200);
  function update(t) {
    tiles.forEach((g, i) => {
      const d = 0.35 + i * 0.13; const p = E.seg(t, d, d + 1.1);
      // vira como placa de aeroporto: varias voltas e trava com mola
      g.rotation.x = (1 - E.easeOut(p, 3)) * Math.PI * 4 + (1 - E.spring(E.seg(t, d + 0.8, d + 2.0) * 1.2, 14, 6)) * 0.12 * (p >= 1 ? 1 : 0);
      g.scale.setScalar(Math.max(0.001, E.easeOut(E.seg(t, d - 0.2, d + 0.25))));
    });
    glowTex.offset.x = t * 0.035; glow.material.opacity = E.smooth(E.seg(t, 0.0, 1.5)) * (0.9 + 0.1 * Math.sin(t * 2));
    glow.scale.y = 0.8 + 0.2 * Math.sin(t * 0.9);
    const c = E.easeInOut(E.seg(t, 0, dur), 2);
    camera.position.set(E.lerp(-1.2, 1.2, c), E.lerp(0.6, 0.0, c), E.lerp(12.5, 13.5, c));
    camera.lookAt(0, 0, 0);
    const o = E.easeIn(E.seg(t, dur - 0.9, dur), 3);
    tiles.forEach((g, i) => { g.position.z = o * (8 + i); });
  }
  return { scene, camera, update, dur, caption: ctx.info.caption,
    post: { bloom: 0.6, bloomRadius: 0.8, bloomThreshold: 0.55, exposure: 1.0 },
    postAt: (t) => ({ flash: 0.8 * E.easeIn(E.seg(t, dur - 0.35, dur), 2) }) };
}
