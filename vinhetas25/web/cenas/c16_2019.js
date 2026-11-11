// 16 ANOS (2019): "16" branco gigante sobre placas translucidas coloridas que se
// sobrepoem (efeito de multiplicacao), selo colorido com VAN/GUAR/DA.
import * as E from '../engine.js';
const { THREE } = E;

export async function build(ctx) {
  const dur = ctx.dur;
  const scene = new THREE.Scene();
  scene.background = E.gradientBg([[0, '#f6f8fb'], [0.6, '#e6eaf2'], [1, '#c6cede']], { radial: true });
  scene.environment = E.envStudio(); scene.environmentIntensity = 0.5;
  E.shadowCatcher(scene, { z: -1.2, opacity: 0.12 });
  E.sun(scene, { pos: [-2, 4, 10], intensity: 1.2, size: 8 });
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const r = E.rng(2019);

  const root = new THREE.Group(); scene.add(root);
  const mult = (c) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).lerp(new THREE.Color(0xffffff), 0.3), transparent: true, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.DstColorFactor, blendDst: THREE.ZeroFactor, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const cols = ['#5fd6f2', '#8c2a3a', '#e14b4b', '#f2d22a', '#5cc93a', '#3a6ae6', '#7080ea', '#e8642a', '#4ad0ea', '#2fa84a'];
  const panels = [];
  for (let i = 0; i < 13; i++) {
    const c = cols[i % cols.length]; const isCircle = i % 6 === 5;
    const geo = isCircle ? new THREE.CircleGeometry(1.3 + r() * 0.9, 64) : new THREE.PlaneGeometry(1.6 + r() * 1.8, 2.0 + r() * 2.4);
    const m = new THREE.Mesh(geo, mult(c));
    const a = r() * Math.PI * 2, rr = 1.0 + r() * 2.4;
    m.userData = { home: new THREE.Vector3(Math.cos(a) * rr * 1.2, Math.sin(a) * rr * 0.75, -0.4 - i * 0.03), rot: (r() - 0.5) * 1.6, spin: (r() - 0.5) * 6, i };
    m.renderOrder = 1; root.add(m); panels.push(m);
  }
  const white = E.M.plastic(0xffffff, { roughness: 0.35, clearcoat: 0.5 });
  const n16 = E.makeText('16', { size: 6.4, depth: 0.5, bevel: 0.035, tracking: -0.04, material: white });
  n16.group.position.set(0, -0.1, 0.4); root.add(n16.group);
  for (const l of n16.letters) l.renderOrder = 2;
  const six = n16.letters[1];
  const badgeTex = E.canvasTex(512, 512, (g, w, h) => {
    const cc = ['#2fa84a', '#e14b4b', '#f2d22a', '#7a2a1a', '#3a9a3a', '#e8642a'];
    g.fillStyle = '#2f8a2a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) { g.save(); g.globalAlpha = 0.75; g.fillStyle = cc[i % cc.length]; g.translate(r() * w, r() * h); g.rotate(r() * 6); g.fillRect(-90, -60, 180 + r() * 120, 120); g.restore(); }
  });
  const badge = new THREE.Group(); badge.position.set(six.position.x + 0.28, six.position.y - 0.9, 0.75); n16.group.add(badge);
  const disc = new THREE.Mesh(E.extrude([E.circleShape(0.98)], { depth: 0.04, bevel: 0.01, curveSeg: 64 }), new THREE.MeshPhysicalMaterial({ map: badgeTex, roughness: 0.4 }));
  E.geoUVtoXY(disc.geometry); badgeTex.repeat.set(1 / 2, 1 / 2); badgeTex.offset.set(0.5, 0.5); badge.add(disc);
  const nm = E.makeText(E.logo('VAN\nGUAR\nDA'), { size: 0.5, depth: 0.04, bevel: 0.004, lineHeight: 0.86, material: E.M.plastic(0xffffff, { roughness: 0.4 }) });
  nm.group.position.z = 0.08; nm.group.rotation.z = 0.2; badge.add(nm.group);

  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.1, 200);
  function update(t) {
    panels.forEach((m) => { const u = m.userData; const d = 0.1 + u.i * 0.06; const e = E.easeOut(E.seg(t, d, d + 1.5), 4);
      m.position.set(u.home.x * (0.2 + 0.8 * e) + Math.sin(t * 0.6 + u.i) * 0.06, u.home.y * (0.2 + 0.8 * e) + Math.cos(t * 0.5 + u.i) * 0.06, u.home.z);
      m.rotation.set(0, 0, u.rot + (1 - e) * u.spin + t * 0.03 * (u.i % 2 ? 1 : -1)); m.scale.setScalar(Math.max(0.001, e)); });
    n16.letters.forEach((l, i) => { const d = 0.8 + i * 0.18; const e = E.easeOutBack(E.seg(t, d, d + 0.8), 1.4); l.scale.setScalar(Math.max(0.001, e)); l.rotation.y = (1 - E.easeOut(E.seg(t, d, d + 0.9))) * 1.4; });
    const b = E.spring(E.seg(t, 1.9, 3.3) * 1.5, 11, 5); badge.scale.setScalar(Math.max(0.001, b)); badge.rotation.z = (1 - E.easeOut(E.seg(t, 1.9, 3.1))) * -3;
    badgeTex.rotation = t * 0.15; badgeTex.center.set(0.5, 0.5);
    root.rotation.set(Math.sin(t * 0.4) * 0.04, Math.sin(t * 0.33) * 0.06, 0);
    camera.position.set(0, 0, E.lerp(17.5, 15.5, E.easeOut(E.seg(t, 0, 5)))); camera.lookAt(0, 0, 0);
    const o = E.easeIn(E.seg(t, dur - 0.9, dur), 3);
    panels.forEach((m) => { m.position.multiplyScalar(1 + o * 2.5); }); n16.group.position.z = 0.4 + o * 9;
  }
  return { scene, camera, update, dur, caption: ctx.info.caption, captionDark: true,
    post: { bloom: 0.1, bloomRadius: 0.4, bloomThreshold: 0.98, exposure: 1.0, vignette: 0.15, grain: 0.02, toneMapping: THREE.NeutralToneMapping },
    postAt: (t) => ({ fade: E.easeIn(E.seg(t, dur - 0.35, dur), 2) }) };
}
