// Exterior: céu, rua, prédios vizinhos, estacionamento decorado com o arco-íris Vanguarda, fachada e cobertura.
import * as THREE from 'three';
import { Batch, M, std, glow, box, boxAt, cyl, blob, panel, unitSphere, roundBox, signTex } from './kit.js';
import { L } from './layout.js';
import { canvasTex, brickTex, paverTex, grassTex, curtainTex, rainbowTex } from '../lib/textures.js';
import { RAINBOW, rng } from '../lib/util.js';

export function buildExterior(A) {
  const G = { ext: new THREE.Group(), facade: new THREE.Group(), roof: new THREE.Group(), decor: new THREE.Group() };
  const b = new Batch(G.ext), bf = new Batch(G.facade), br = new Batch(G.roof), bd = new Batch(G.decor);
  const anim = [];

  // ---------- céu (fim de tarde) ----------
  const skyTex = canvasTex(16, 512, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#20366e'); grd.addColorStop(0.38, '#4f78b8'); grd.addColorStop(0.47, '#9fb9d8'); grd.addColorStop(0.5, '#f3c08e'); grd.addColorStop(0.53, '#a39a92'); grd.addColorStop(1, '#3d3a37');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(420, 32, 24), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, toneMapped: false, fog: false }));
  G.ext.add(sky);
  const r = rng(42);
  const cloudTex = canvasTex(256, 128, (g, w, h) => {
    for (let i = 0; i < 26; i++) { const x = 30 + r() * 196, y = 50 + r() * 40, rr = 18 + r() * 34; const grd = g.createRadialGradient(x, y, 0, x, y, rr); grd.addColorStop(0, 'rgba(255,246,236,0.55)'); grd.addColorStop(1, 'rgba(255,240,230,0)'); g.fillStyle = grd; g.fillRect(0, 0, w, h); }
  });
  for (let i = 0; i < 14; i++) {
    const a = r() * Math.PI * 2, d = 360, y = 60 + r() * 90;
    const s = new THREE.Mesh(new THREE.PlaneGeometry(90 + r() * 80, 28 + r() * 20), new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.38 }));
    s.position.set(Math.cos(a) * d, y, Math.sin(a) * d); s.lookAt(0, y, 0); G.ext.add(s);
  }

  // ---------- chão, rua e calçada ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), std('#56544e', { roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; G.ext.add(ground);
  const asphalt = std('#2e3033', { roughness: 0.92 });
  boxAt(b, asphalt, -300, 300, -0.02, 0.0, 42.5, 54);
  const lane = canvasTex(256, 16, (g, w, h) => { g.fillStyle = '#2e3033'; g.fillRect(0, 0, w, h); g.fillStyle = '#d9d2a0'; g.fillRect(0, 6, w * 0.55, 4); }, { repeat: [120, 1] });
  const laneM = new THREE.Mesh(new THREE.PlaneGeometry(600, 0.6), new THREE.MeshStandardMaterial({ map: lane, roughness: 0.9 }));
  laneM.rotation.x = -Math.PI / 2; laneM.position.set(0, 0.005, 48.2); G.ext.add(laneM);
  boxAt(b, std('#a5a19a', { roughness: 0.95 }), -300, 300, 0, 0.15, 40.3, 42.5);                // calçada
  boxAt(b, std('#7d7a74'), -300, 300, 0, 0.18, 42.35, 42.55);                                       // meio-fio
  // terreno vizinho e muros laterais
  boxAt(b, std('#6e665c', { roughness: 0.95 }), L.park.x0 - 0.3, L.park.x0, 0, 2.4, -34, 40);
  boxAt(b, std('#6e665c', { roughness: 0.95 }), L.park.x1, L.park.x1 + 0.3, 0, 2.4, -34, 40);

  // ---------- prédios residenciais ao fundo (como na foto) ----------
  const winTex = (seed) => canvasTex(256, 512, (g, w, h) => {
    const rr = rng(seed); g.fillStyle = '#cfcac0'; g.fillRect(0, 0, w, h);
    for (let y = 8; y < h; y += 26) for (let x = 10; x < w; x += 40) { g.fillStyle = rr() < 0.3 ? '#f5d9a0' : '#5c6b7c'; g.fillRect(x, y, 28, 14); }
  });
  const towers = [[-40, -110, 16, 70], [-5, -150, 18, 88], [30, -120, 16, 64], [70, -160, 20, 92], [-80, -170, 18, 76], [110, -120, 16, 58]];
  towers.forEach(([x, z, w, h], i) => {
    const t = winTex(10 + i); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / 8, h / 16);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * 0.8), new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }));
    m.position.set(x, h / 2, z); G.ext.add(m);
    boxAt(b, M.darkGray, x - w / 2 - 0.2, x + w / 2 + 0.2, h, h + 1.2, z - w * 0.4 - 0.2, z + w * 0.4 + 0.2);
  });
  // galpões vizinhos baixos
  [[-60, -10, 30, 9, 60], [80, -10, 30, 8, 60], [-62, 70, 34, 7, 18], [10, 72, 60, 10, 20], [90, 72, 40, 12, 20]].forEach(([x, z, w, h, d]) =>
    boxAt(b, std(['#8f8478', '#7c8288', '#a49a8c'][Math.abs(x) % 3], { roughness: 0.95 }), x - w / 2, x + w / 2, 0, h, z - d / 2, z + d / 2));

  // ---------- estacionamento ----------
  const pav = new THREE.Mesh(new THREE.PlaneGeometry(L.park.x1 - L.park.x0, L.park.z1 - L.park.z0), new THREE.MeshStandardMaterial({ map: paverTex([24, 7]), roughness: 0.85 }));
  pav.rotation.x = -Math.PI / 2; pav.position.set((L.park.x0 + L.park.x1) / 2, 0.01, (L.park.z0 + L.park.z1) / 2); G.ext.add(pav);
  // faixa de grama + cerca viva junto ao gradil
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(L.park.x1 - L.park.x0, 1.6), new THREE.MeshStandardMaterial({ map: grassTex([40, 1]), roughness: 1 }));
  grass.rotation.x = -Math.PI / 2; grass.position.set((L.park.x0 + L.park.x1) / 2, 0.04, 39.1); G.ext.add(grass);
  const hedge = std('#2f5e25', { roughness: 0.95 });
  boxAt(b, hedge, L.park.x0, L.gate.x0 - 1.8, 0, 0.55, 38.6, 39.6); boxAt(b, hedge, L.gate.x1 + 1.8, L.park.x1, 0, 0.55, 38.6, 39.6);
  boxAt(b, std('#9b968e'), L.park.x0, L.gate.x0, 0, 0.22, 39.6, 40.0); boxAt(b, std('#9b968e'), L.gate.x1, L.park.x1, 0, 0.22, 39.6, 40.0);
  // vagas pintadas
  const lineM = std('#e8e6df', { roughness: 0.8 });
  for (let x = -22; x <= -7; x += 2.7) boxAt(b, lineM, x - 0.05, x + 0.05, 0.012, 0.02, 22, 27);
  for (let x = 7; x <= 42; x += 2.7) boxAt(b, lineM, x - 0.05, x + 0.05, 0.012, 0.02, 22, 27);
  for (let x = -22; x <= -7; x += 2.7) boxAt(b, lineM, x - 0.05, x + 0.05, 0.012, 0.02, 32, 37);
  for (let x = 7; x <= 42; x += 2.7) boxAt(b, lineM, x - 0.05, x + 0.05, 0.012, 0.02, 32, 37);

  // gradil (textura com recorte) e portão aberto
  const fenceTex = canvasTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = '#2b2d30';
    for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 5, h);
    g.fillRect(0, 0, w, 10); g.fillRect(0, h - 26, w, 10);
  }, { repeat: [1, 1] });
  fenceTex.wrapS = THREE.RepeatWrapping;
  const fenceMat = (len) => { const t = fenceTex.clone(); t.needsUpdate = true; t.repeat.set(len / 1.6, 1); return new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.5, transparent: false, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.5 }); };
  for (const [x0, x1] of [[L.park.x0, L.gate.x0 - 0.2], [L.gate.x1 + 0.2, L.park.x1]]) {
    const len = x1 - x0, f = new THREE.Mesh(new THREE.PlaneGeometry(len, 1.9), fenceMat(len));
    f.position.set((x0 + x1) / 2, 1.17, 39.85); G.ext.add(f);
    for (let x = x0; x <= x1 + 0.01; x += 2.5) box(b, M.truss, 0.1, 2.1, 0.1, x, 1.05, 39.85);
  }
  const gateLeaf = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 1.9), fenceMat(7.6)); gateLeaf.position.set(L.gate.x1 + 4.1, 1.17, 39.55); G.ext.add(gateLeaf);
  boxAt(b, M.truss, L.gate.x0 - 0.25, L.gate.x0 + 0.05, 0, 2.3, 39.7, 40.0); boxAt(b, M.truss, L.gate.x1 - 0.05, L.gate.x1 + 0.25, 0, 2.3, 39.7, 40.0);

  // árvores (copas low-poly) e o cipreste ao lado do pórtico
  const trunk = std('#5a4632', { roughness: 0.9 }), leafA = std('#3d6b2a', { roughness: 0.9 }), leafB = std('#2c5422', { roughness: 0.9 });
  const ico = new THREE.IcosahedronGeometry(1, 1);
  const tree = (x, z, s = 1) => {
    cyl(b, trunk, 0.18 * s, 4.2 * s, x, 2.1 * s, z, 8);
    for (let i = 0; i < 6; i++) { const a = i * 1.1 + x; b.add(ico, i % 2 ? leafA : leafB, [x + Math.cos(a) * 1.3 * s, (4.6 + (i % 3) * 0.7) * s, z + Math.sin(a) * 1.1 * s], [i, i * 2, 0], [1.7 * s, 1.4 * s, 1.7 * s]); }
    blob(b, x, z, 5 * s);
  };
  [[-22, 38.4, 1.15], [-14, 38.6, 1.0], [-7.5, 38.8, 0.85], [10, 38.8, 0.9], [17, 38.6, 1.1], [26, 38.5, 1.0], [35, 38.6, 1.2], [43, 38.4, 0.95]].forEach((t) => tree(...t));
  const cyp = new THREE.ConeGeometry(1, 1, 10);
  for (let i = 0; i < 4; i++) b.add(cyp, leafB, [8.5, 2.2 + i * 1.6, 23.2], [0, i, 0], [2.2 - i * 0.4, 3.4, 2.2 - i * 0.4]);
  cyl(b, trunk, 0.2, 1.4, 8.5, 0.7, 23.2, 8);
  // palmeiras à direita (como na foto)
  for (const [x, z] of [[40, 23], [44.5, 27]]) {
    cyl(b, std('#7a6a55'), 0.22, 11, x, 5.5, z, 8);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; b.add(new THREE.ConeGeometry(0.5, 4, 4), leafA, [x + Math.cos(a) * 1.8, 10.6, z + Math.sin(a) * 1.8], [Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2 + Math.PI / 2 * 0], [1, 1, 0.25]); }
  }

  // carros dos convidados
  const carColors = ['#8d8f93', '#202226', '#e8e8ea', '#7b2028', '#2d4a7a', '#b9bcc2', '#3f4a3c', '#1d1e22'].map((c) => std(c, { metalness: 0.6, roughness: 0.32 }));
  const glassCar = std('#141a22', { metalness: 0.4, roughness: 0.08 }), tire = std('#141414', { roughness: 0.9 }), lamp = glow('#fff2d6', 1.2), tail = glow('#ff2a1a', 1.2);
  const carBody = roundBox(1.82, 0.72, 4.35, 0.2), cabin = roundBox(1.62, 0.62, 2.3, 0.18);
  const tireG = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 16);
  const car = (x, z, ry, mi) => {
    const grp = new THREE.Object3D(); grp.position.set(x, 0, z); grp.rotation.y = ry; grp.updateMatrixWorld();
    const add = (geo, mat, p, rot = [0, 0, 0], s = [1, 1, 1]) => { const o = new THREE.Object3D(); o.position.set(...p); o.rotation.set(...rot); o.scale.set(...s); grp.add(o); o.updateMatrixWorld(); b.addM(geo, mat, o.matrixWorld); grp.remove(o); };
    add(carBody, carColors[mi % carColors.length], [0, 0.66, 0]);
    add(cabin, glassCar, [0, 1.2, -0.2]);
    for (const [dx, dz] of [[-0.82, 1.35], [0.82, 1.35], [-0.82, -1.35], [0.82, -1.35]]) add(tireG, tire, [dx, 0.34, dz], [0, 0, Math.PI / 2]);
    for (const dx of [-0.6, 0.6]) { add(unitSphere(8), lamp, [dx, 0.75, 2.16], [0, 0, 0], [0.3, 0.12, 0.05]); add(unitSphere(8), tail, [dx, 0.8, -2.16], [0, 0, 0], [0.32, 0.1, 0.05]); }
    blob(b, x, z, 2.6, 5.0);
  };
  let k = 0;
  for (let x = -20.65; x <= -8; x += 2.7) { if (r() < 0.8) car(x, 24.6, Math.PI + (r() - 0.5) * 0.06, k++); if (r() < 0.75) car(x, 34.6, (r() - 0.5) * 0.06, k++); }
  for (let x = 8.35; x <= 42; x += 2.7) { if (r() < 0.7) car(x, 24.6, Math.PI + (r() - 0.5) * 0.06, k++); if (r() < 0.65) car(x, 34.6, (r() - 0.5) * 0.06, k++); }

  // ---------- decoração arco-íris Vanguarda no estacionamento ----------
  // passarela arco-íris do portão até o pórtico
  const path = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 17.5), new THREE.MeshStandardMaterial({ map: rainbowTex({ w: 512, h: 8 }), roughness: 0.55, emissive: '#ffffff', emissiveIntensity: 0.12, emissiveMap: rainbowTex({ w: 512, h: 8 }) }));
  path.rotation.x = -Math.PI / 2; path.position.set(0, 0.03, 31.6); G.decor.add(path);
  boxAt(bd, M.silver, -1.75, -1.6, 0.0, 0.06, 22.8, 40); boxAt(bd, M.silver, 1.6, 1.75, 0.0, 0.06, 22.8, 40);
  // arco-íris de entrada sobre o portão (9 tubos concêntricos)
  const arch = new THREE.Group(); arch.position.set(0, 0, 40.4); G.decor.add(arch);
  RAINBOW.forEach((c, i) => {
    const rr = 5.6 - i * 0.16;
    const t = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.075, 10, 80, Math.PI), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.9, roughness: 0.3 }));
    arch.add(t);
  });
  for (const s of [-1, 1]) { const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.5, 24), M.chrome); base.position.set(s * 4.95, 0.25, 0); arch.add(base); }
  // totens: logo de 2003 (à esquerda) e logo atual (à direita)
  const totemTex = (img, title, sub, dark) => canvasTex(512, 1280, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, dark ? '#0d0f14' : '#f4f5f7'); grd.addColorStop(1, dark ? '#1b1f29' : '#d9dde3');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    const rb = g.createLinearGradient(0, 0, w, 0); RAINBOW.forEach((c, i) => rb.addColorStop(i / 8, c)); g.fillStyle = rb; g.fillRect(0, 0, w, 26); g.fillRect(0, h - 26, w, 26);
    const s = Math.min((w - 70) / img.width, 520 / img.height); g.drawImage(img, (w - img.width * s) / 2, 260 - img.height * s / 2 + 120, img.width * s, img.height * s);
    g.fillStyle = dark ? '#fff' : '#111'; g.textAlign = 'center'; g.font = '700 120px AvantGarde'; g.fillText(title, w / 2, 860);
    g.font = '500 40px Inter'; g.globalAlpha = 0.8; sub.split('\n').forEach((ln, i) => g.fillText(ln, w / 2, 950 + i * 54)); g.globalAlpha = 1;
  });
  const totem = (x, tex) => { boxAt(bd, M.chrome, x - 0.68, x + 0.68, 0, 0.12, 37.6, 38.4); const p = panel(G.decor, tex, 1.2, 3.0, [x, 1.62, 38.22], 0, { emissive: true, intensity: 1.0 }); boxAt(bd, M.silver, x - 0.64, x + 0.64, 0.1, 3.16, 37.85, 38.2); return p; };
  totem(-6.2, totemTex(A.img.logo2003w, '2003', 'Rede Vanguarda\nnasce o arco-íris', false));
  totem(6.2, totemTex(A.img.logoAtual, 'HOJE', 'Vanguarda\nmarca atual', true));
  // mastros com bandeiras verticais alternando a marca de 2003 e a atual
  const flagTex = (img, flip) => canvasTex(256, 768, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h); (flip ? [...RAINBOW].reverse() : RAINBOW).forEach((c, i) => grd.addColorStop(i / 8, c)); g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.92)'; g.beginPath(); g.roundRect(18, 80, w - 36, w - 36, 22); g.fill();
    const s = Math.min((w - 70) / img.width, (w - 70) / img.height); g.drawImage(img, (w - img.width * s) / 2, 80 + (w - 36) / 2 - img.height * s / 2, img.width * s, img.height * s);
    g.fillStyle = '#fff'; g.font = '700 46px AvantGarde'; g.textAlign = 'center'; g.save(); g.translate(w / 2, 560); g.fillText('DANIEL', 0, 0); g.fillText('20 ANOS', 0, 60); g.restore();
  });
  const flagA = flagTex(A.img.logo2003w, false), flagB = flagTex(A.img.logoAtual, true);
  const flags = [];
  for (const z of [25, 29, 33, 36.6]) for (const s of [-1, 1]) {
    cyl(bd, M.chrome, 0.05, 4.6, s * 3.0, 2.3, z, 10);
    cyl(bd, M.chrome, 0.16, 0.12, s * 3.0, 0.06, z, 16);
    const f = panel(G.decor, (z + s) % 2 ? flagA : flagB, 0.85, 2.55, [s * 3.0 - s * 0.47, 3.15, z], s > 0 ? -Math.PI / 2 : Math.PI / 2, { rough: 0.7, side: THREE.DoubleSide });
    f.geometry = new THREE.PlaneGeometry(0.85, 2.55, 8, 1); flags.push(f);
  }
  // balizadores de luz ao longo da passarela
  const bolls = [];
  for (let z = 23.5, i = 0; z < 39.5; z += 1.6, i++) for (const s of [-1, 1]) {
    cyl(bd, M.darkGray, 0.09, 0.75, s * 2.05, 0.375, z, 12);
    const col = new THREE.Color(RAINBOW[i % RAINBOW.length]);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.16, 12), new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(2), toneMapped: false }));
    m.position.set(s * 2.05, 0.82, z); G.decor.add(m); bolls.push([m, i]);
  }
  anim.push((t) => {
    bolls.forEach(([m, i]) => { const c = new THREE.Color(RAINBOW[(i + Math.floor(t * 4)) % RAINBOW.length]); m.material.color.copy(c).multiplyScalar(2.2); });
    flags.forEach((f, i) => { const p = f.geometry.attributes.position; for (let v = 0; v < p.count; v++) { const x = p.getX(v); p.setZ(v, Math.sin(t * 3 + x * 5 + i) * 0.06 * (x + 0.425)); } p.needsUpdate = true; });
  });
  // varal de lâmpadas sobre o estacionamento
  const bulbM = RAINBOW.map((c) => glow(c, 2.4));
  for (const z of [27, 31, 35]) for (let i = 0; i < 26; i++) {
    const x = -16 + i * 1.28, sag = Math.sin((i / 25) * Math.PI) * 0.6;
    b.add(unitSphere(8), bulbM[i % 9], [x, 5.0 - sag, z], [0, 0, 0], [0.14, 0.18, 0.14]);
  }
  for (const z of [27, 31, 35]) { cyl(b, M.truss, 0.06, 5.3, -16.4, 2.65, z, 8); cyl(b, M.truss, 0.06, 5.3, 16.4, 2.65, z, 8); }

  // ---------- fachada (tijolo + painéis escuros + pórtico cinza com cortina preta) ----------
  const brick = new THREE.MeshStandardMaterial({ map: brickTex([22, 3]), roughness: 0.92 });
  const brickSide = new THREE.MeshStandardMaterial({ map: brickTex([16, 3]), roughness: 0.92 });
  const panelDark = std('#2c2f33', { roughness: 0.5, metalness: 0.3 }), frameGray = std('#5d6166', { roughness: 0.7 });
  // faixa de tijolo
  boxAt(bf, brick, L.bx0, L.portico.x0, 0, L.wallH, L.bz1 - 0.3, L.bz1);
  boxAt(bf, brick, L.portico.x1, L.bx1, 0, L.wallH, L.bz1 - 0.3, L.bz1);
  // janelas escuras em módulos (em cima e embaixo, como na foto)
  for (const [x0, x1] of [[-21, -14], [-12, -6], [7, 13], [15, 21], [24, 31], [33, 41]]) {
    boxAt(bf, panelDark, x0, x1, 4.2, 6.6, L.bz1, L.bz1 + 0.06);
    boxAt(bf, panelDark, x0, x1, 1.3, 3.6, L.bz1, L.bz1 + 0.06);
    boxAt(bf, frameGray, x0 - 0.15, x1 + 0.15, 3.6, 4.2, L.bz1, L.bz1 + 0.12);
  }
  boxAt(bf, frameGray, L.bx0, L.bx1, L.wallH, L.wallH + 0.5, L.bz1 - 0.3, L.bz1 + 0.1);  // platibanda
  // pórtico
  const P = L.portico, pg = std('#8b8f93', { roughness: 0.75 });
  boxAt(bf, pg, P.x0, P.x0 + 0.7, 0, P.h, P.z0, P.z1); boxAt(bf, pg, P.x1 - 0.7, P.x1, 0, P.h, P.z0, P.z1);
  boxAt(bf, pg, P.x0, P.x1, P.h - 1.1, P.h, P.z0, P.z1);
  boxAt(bf, std('#6f7377'), P.x0 - 0.2, P.x1 + 0.2, P.h, P.h + 0.25, P.z0, P.z1 + 0.2);
  boxAt(bf, panelDark, P.x0 + 0.7, P.x1 - 0.7, 0, P.h - 1.1, P.z0 - 0.05, P.z0 + 0.05);
  const curtain = new THREE.Mesh(new THREE.PlaneGeometry(P.x1 - P.x0 - 1.4, P.h - 1.2), new THREE.MeshStandardMaterial({ map: curtainTex([4, 1]), roughness: 0.95, transparent: true, opacity: 1 }));
  curtain.position.set(0, (P.h - 1.2) / 2, P.z0 + 0.6); G.facade.add(curtain);
  // letreiro iluminado sobre o pórtico
  const plaque = panel(G.facade, signTex('DANIEL 20 ANOS', 'ESPAÇO ARMAZÉM · 2029', { w: 1024, h: 256, bg: '#101114', titleSize: 120 }), 5.2, 1.3, [0, P.h - 0.55, P.z1 + 0.02], 0, { emissive: true, intensity: 1.15 });
  void plaque;
  // luzes arco-íris lavando a fachada de tijolo
  const washTex = canvasTex(64, 256, (g, w, h) => { const grd = g.createLinearGradient(0, h, 0, 0); grd.addColorStop(0, 'rgba(255,255,255,0.9)'); grd.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = grd; g.fillRect(0, 0, w, h); const gx = g.createLinearGradient(0, 0, w, 0); gx.addColorStop(0, 'rgba(0,0,0,1)'); gx.addColorStop(0.5, 'rgba(0,0,0,0)'); gx.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = gx; g.fillRect(0, 0, w, h); });
  const washes = [];
  [-22.5, -18, -13, -8.5, 6, 10.5, 14, 18.5, 23, 27.5, 32, 36.5, 41].forEach((x, i) => {
    const c = new THREE.Color(RAINBOW[i % 9]);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 6.5), new THREE.MeshBasicMaterial({ map: washTex, color: c.clone().multiplyScalar(0.7), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    m.position.set(x, 3.25, L.bz1 + 0.13); G.facade.add(m); washes.push([m, i]);
    box(bf, M.black, 0.4, 0.18, 0.3, x, 0.09, L.bz1 + 0.35);
  });
  anim.push((t) => washes.forEach(([m, i]) => { m.material.opacity = 0.75 + 0.25 * Math.sin(t * 2 + i); }));
  // paredes laterais e de fundo (lado de fora)
  boxAt(bf, brickSide, L.bx0 - 0.3, L.bx0, 0, L.wallH, L.bz0, L.bz1);
  boxAt(bf, brickSide, L.bx1, L.bx1 + 0.3, 0, L.wallH, L.bz0, L.bz1);
  boxAt(bf, brickSide, L.bx0 - 0.3, L.bx1 + 0.3, 0, L.wallH, L.bz0 - 0.3, L.bz0);
  boxAt(bf, frameGray, L.bx0 - 0.4, L.bx0, L.wallH, L.wallH + 0.5, L.bz0 - 0.4, L.bz1);
  boxAt(bf, frameGray, L.bx1, L.bx1 + 0.4, L.wallH, L.wallH + 0.5, L.bz0 - 0.4, L.bz1);
  boxAt(bf, frameGray, L.bx0 - 0.4, L.bx1 + 0.4, L.wallH, L.wallH + 0.5, L.bz0 - 0.4, L.bz0);

  // ---------- cobertura ----------
  boxAt(br, std('#4a4d52', { roughness: 0.9 }), L.bx0, L.bx1, L.wallH, L.wallH + 0.25, L.bz0, L.bz1 - 0.3);
  for (const [x, z] of [[-10, -10], [0, -18], [12, -6], [30, -12], [36, 2]]) { boxAt(br, M.gray, x - 1.2, x + 1.2, L.wallH + 0.25, L.wallH + 1.3, z - 0.8, z + 0.8); }

  b.flush(); bf.flush(); br.flush(); bd.flush();
  return { groups: G, anim, curtain };
}
