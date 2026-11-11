// 10 ANOS (2013): "1" (barra) e "0" (circulo) feitos de 10 listras horizontais
// brilhantes, do azul ao magenta, sobre fundo branco.
import * as E from '../engine.js';
const { THREE } = E;

export async function build(ctx) {
  const dur = ctx.dur;
  const scene = new THREE.Scene();
  scene.background = E.gradientBg([[0, '#ffffff'], [0.75, '#f6f7f9'], [1, '#e4e7ec']], { radial: true });
  scene.environment = E.envPanels([
    { pos: [0, 6, 12], w: 26, h: 6, color: 0xffffff, i: 2.2 },
    { pos: [0, -2, 14], w: 26, h: 10, grad: ['#ffffff', '#9aa0a8', '#202428'], i: 0.9 },
    { pos: [-10, 0, 3], w: 2, h: 12, color: 0xffffff, i: 1.2 },
  ], { bg: 0x9aa0a8 });
  E.shadowCatcher(scene, { z: -0.7, opacity: 0.16 });
  E.sun(scene, { pos: [2, 7, 10], intensity: 1.4, size: 7 });
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));

  const cols = ['#18208f', '#1b3f9e', '#175a83', '#146a6c', '#13873a', '#8f9616', '#c8901a', '#cc5f17', '#b8291b', '#b0164f'];
  const R = 2.45, n = 10, h = (2 * R) / n, gap = 0.035;
  const barW = 1.3, barX = -3.25, circX = 1.05;
  const root = new THREE.Group(); scene.add(root);
  const stripes = [];
  for (let i = 0; i < n; i++) {
    const y1 = R - i * h - gap / 2, y0 = R - (i + 1) * h + gap / 2;
    const mat = E.M.plastic(cols[i], { roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.04 });
    // barra do "1"
    const b = new THREE.Mesh(E.extrude([E.rectShape(barW, y1 - y0, 0, 0, 0.02)], { depth: 0.3, bevel: 0.035, bevelSeg: 4 }), mat);
    b.userData = { home: new THREE.Vector3(barX, (y0 + y1) / 2, 0), side: i % 2 ? 1 : -1, i };
    // fatia do circulo do "0"
    let poly = E.circlePoly(R, 160, 0, 0); poly = E.clipHalf(poly, 0, 1, -y0); poly = E.clipHalf(poly, 0, -1, y1);
    const sh = E.polyShape(poly); const g = E.extrude([sh], { depth: 0.3, bevel: 0.035, bevelSeg: 4 }); g.translate(0, -(y0 + y1) / 2, 0);
    const c = new THREE.Mesh(g, mat);
    c.userData = { home: new THREE.Vector3(circX, (y0 + y1) / 2, 0), side: i % 2 ? -1 : 1, i };
    for (const m of [b, c]) { m.castShadow = m.receiveShadow = true; root.add(m); stripes.push(m); }
  }
  const glint = E.glints(scene, [{ pos: [barX - 0.55, R - 0.1, 0.4], t: 3.0, size: 1.4 }, { pos: [circX + 1.6, 1.7, 0.4], t: 3.5, size: 1.8 }, { pos: [circX - 0.4, -2.3, 0.4], t: 4.1, size: 1.2 }]);
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.1, 200);
  function update(t) {
    for (const m of stripes) { const u = m.userData; const d = 0.2 + u.i * 0.11 + (u.home.x < 0 ? 0 : 0.05); const e = E.easeOut(E.seg(t, d, d + 1.1), 4);
      m.position.set(u.home.x + u.side * (1 - e) * 16, u.home.y, (1 - e) * 2); m.rotation.set((1 - e) * Math.PI * (u.side > 0 ? 1 : -1), 0, 0); }
    root.rotation.set(-0.12 * (1 - E.easeInOut(E.seg(t, 0, 3.5))), 0.3 * (1 - E.easeInOut(E.seg(t, 0, 3.5))) - 0.02 + Math.sin(t * 0.6) * 0.03, 0);
    camera.position.set(-0.6, 0.1, E.lerp(16, 14.2, E.easeOut(E.seg(t, 0, 5)))); camera.lookAt(-0.6, 0, 0);
    const o = E.easeIn(E.seg(t, dur - 0.9, dur), 3);
    for (const m of stripes) { m.position.x += m.userData.side * o * 14; }
    scene.environmentRotation.y = -0.6 + t * 0.28;
    glint(t);
  }
  return { scene, camera, update, dur, caption: ctx.info.caption, captionDark: true,
    post: { bloom: 0.15, bloomRadius: 0.4, bloomThreshold: 0.97, exposure: 1.0, vignette: 0.15, grain: 0.02, toneMapping: THREE.NeutralToneMapping } };
}
