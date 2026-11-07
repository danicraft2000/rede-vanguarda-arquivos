// Interior: paredes internas, entrada, sala de estar + Vanguarda Especial, banheiros e playground.
import * as THREE from 'three';
import { Batch, M, std, glow, box, boxAt, cyl, blob, panel, unitSphere, roundBox, signTex } from './kit.js';
import { L } from './layout.js';
import { canvasTex, tileTex, woodTex, curtainTex, rainbowTex } from '../lib/textures.js';
import { RAINBOW, rng } from '../lib/util.js';

export const ESPECIAIS = [
  'Aparecida', 'Mazzaropi', 'Alcatrazes', 'Monteiro Lobato', 'Via Dutra', 'Futuros da Cidade 1', 'Vida Zen', 'Cassiano Ricardo',
  '100 Anos de Aviação', 'Sabores e Temperos da Terra', 'Futuros da Cidade 2', 'Antártida', 'Futuros da Cidade 3', '300 Anos de Aparecida', '15 Anos da Rede Vanguarda',
];

function wrapLines(g, text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}

export function especialPoster(img, n, title) {
  return canvasTex(600, 800, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#120a06'); grd.addColorStop(0.55, '#2a1308'); grd.addColorStop(1, '#0c0c10');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.drawImage(img, 20, 0, 600, 450, 0, 0, w, 450);               // vinheta "Vanguarda Especial"
    const fade = g.createLinearGradient(0, 330, 0, 452); fade.addColorStop(0, 'rgba(18,10,6,0)'); fade.addColorStop(1, 'rgba(22,11,6,1)');
    g.fillStyle = fade; g.fillRect(0, 330, w, 122);
    const rb = g.createLinearGradient(40, 0, w - 40, 0); RAINBOW.forEach((c, i) => rb.addColorStop(i / 8, c)); g.fillStyle = rb; g.fillRect(40, 470, w - 80, 8);
    g.fillStyle = '#f2c46a'; g.font = '700 34px AvantGarde'; g.textAlign = 'left'; g.fillText(`Nº ${String(n).padStart(2, '0')}`, 40, 528);
    g.fillStyle = '#ffffff'; let s = 66; g.font = `700 ${s}px AvantGarde`;
    let lines = wrapLines(g, title.toUpperCase(), w - 80);
    while ((lines.length > 3 || lines.some((l) => g.measureText(l).width > w - 80)) && s > 30) { s -= 3; g.font = `700 ${s}px AvantGarde`; lines = wrapLines(g, title.toUpperCase(), w - 80); }
    lines.forEach((l, i) => g.fillText(l, 40, 600 + i * s * 1.05));
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.font = '500 24px Inter'; g.fillText('Documentário · Rede Vanguarda', 40, h - 34);
  });
}

export function buildInterior(A) {
  const G = { shell: new THREE.Group(), ceil: new THREE.Group(), foyer: new THREE.Group(), lounge: new THREE.Group(), baths: new THREE.Group(), kids: new THREE.Group() };
  const bs = new Batch(G.shell), bc = new Batch(G.ceil), bfo = new Batch(G.foyer), blo = new Batch(G.lounge), bba = new Batch(G.baths), bk = new Batch(G.kids);
  const anim = [], anchors = {};
  const H = L.wallH, T = 0.25;
  const wall = M.wall, brickish = std('#9c4f35', { roughness: 0.9 });

  // ---------- pisos ----------
  const floor = (x0, x1, z0, z1, mat) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), mat); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0.005, (z0 + z1) / 2); G.shell.add(m); };
  floor(L.foyer.x0, L.foyer.x1, L.foyer.z0, L.foyer.z1, new THREE.MeshStandardMaterial({ map: tileTex([5, 4.5]), roughness: 0.3 }));
  floor(L.lounge.x0, L.lounge.x1, L.lounge.z0, L.lounge.z1, new THREE.MeshStandardMaterial({ map: woodTex([6, 3], [150, 104, 66]), roughness: 0.45 }));
  floor(L.baths.x0, L.baths.x1, L.baths.z0, L.baths.z1, new THREE.MeshStandardMaterial({ map: tileTex([8, 5], { color: '#eeeeec', line: '#c9c9c6' }), roughness: 0.25 }));

  // ---------- paredes internas ----------
  const wallX = (x, z0, z1, h = H, mat = wall) => boxAt(bs, mat, x - T / 2, x + T / 2, 0, h, z0, z1);
  const wallZ = (z, x0, x1, h = H, mat = wall) => boxAt(bs, mat, x0, x1, 0, h, z - T / 2, z + T / 2);
  // revestimento interno das paredes externas
  boxAt(bs, wall, L.bx0, L.bx0 + 0.06, 0, H, L.bz0, L.bz1 - 0.3);
  boxAt(bs, wall, L.bx1 - 0.06, L.bx1, 0, H, L.bz0, L.bz1 - 0.3);
  boxAt(bs, wall, L.bx0, L.bx1, 0, H, L.bz0, L.bz0 + 0.06);
  boxAt(bs, wall, L.bx0, L.portico.x0 + 0.7, 0, H, L.bz1 - 0.36, L.bz1 - 0.3);
  boxAt(bs, wall, L.portico.x1 - 0.7, L.bx1, 0, H, L.bz1 - 0.36, L.bz1 - 0.3);
  boxAt(bs, wall, -2.9, 2.9, 5.5, H, L.bz1 - 0.36, L.bz1 - 0.3);
  // z = 11: salão principal x (entrada | sala | banheiros); abertura central para o salão
  wallZ(L.hall.z1, L.bx0, -2.6); wallZ(L.hall.z1, 2.6, L.baths.x1);
  boxAt(bs, wall, -2.6, 2.6, 2.7, H, L.hall.z1 - T / 2, L.hall.z1 + T / 2);
  // entrada x banheiros (passagem pelo corredor dos banheiros)
  wallX(L.foyer.x1, L.baths.hallZ, L.bz1 - 0.3);
  boxAt(bs, wall, L.foyer.x1 - T / 2, L.foyer.x1 + T / 2, 3.2, H, L.hall.z1, L.baths.hallZ);
  // entrada x sala de estar: pilares e viga (vão largo)
  boxAt(bs, wall, L.foyer.x0 - T / 2, L.foyer.x0 + T / 2, 0, H, L.hall.z1, 12.2);
  boxAt(bs, wall, L.foyer.x0 - T / 2, L.foyer.x0 + T / 2, 0, H, 18.8, L.bz1 - 0.3);
  boxAt(bs, wall, L.foyer.x0 - T / 2, L.foyer.x0 + T / 2, 3.4, H, 12.2, 18.8);
  // banheiros x playground
  wallX(L.baths.x1, L.baths.hallZ, L.bz1 - 0.3);
  boxAt(bs, wall, L.baths.x1 - T / 2, L.baths.x1 + T / 2, 3.2, H, L.hall.z1, L.baths.hallZ);
  // salão principal x museu (porta larga) e museu x playground
  wallX(L.hall.x1, L.bz0, -6.5); wallX(L.hall.x1, -1.5, L.hall.z1);
  boxAt(bs, wall, L.hall.x1 - T / 2, L.hall.x1 + T / 2, 4.0, H, -6.5, -1.5);
  wallZ(L.museum.z1, L.hall.x1, 26); wallZ(L.museum.z1, 30, L.bx1);
  boxAt(bs, wall, 26, 30, 3.6, H, L.museum.z1 - T / 2, L.museum.z1 + T / 2);
  // cortina preta na passagem entrada -> salão
  const cur = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.7), new THREE.MeshStandardMaterial({ map: curtainTex([4, 1]), roughness: 0.95, side: THREE.DoubleSide }));
  cur.position.set(0, 1.35, L.hall.z1); G.foyer.add(cur);
  panel(G.foyer, signTex('SALÃO PRINCIPAL', 'palco · telões · buffet', { w: 1024, h: 220, titleSize: 96, subSize: 40 }), 3.6, 0.77, [0, 3.13, L.hall.z1 + T / 2 + 0.02], 0, { emissive: true, intensity: 1.0 });

  // ---------- forros rebaixados (somem na vista de maquete) ----------
  const ceilM = std('#f4f3ef', { roughness: 0.95 });
  boxAt(bc, ceilM, L.lounge.x0, L.foyer.x1, 3.6, 3.7, L.hall.z1, L.bz1 - 0.3);
  boxAt(bc, ceilM, L.baths.x0, L.baths.x1, 3.2, 3.3, L.hall.z1, L.bz1 - 0.3);
  const dl = glow('#fff6e6', 2.2);
  for (let x = -22; x <= 3; x += 3) for (const z of [13, 17.8]) cyl(bc, dl, 0.12, 0.02, x, 3.59, z, 16);
  for (let x = 6.5; x <= 19; x += 2.5) cyl(bc, dl, 0.1, 0.02, x, 3.19, 12.5, 16);
  boxAt(bc, std('#0d0d0f', { roughness: 0.9 }), L.bx0, L.bx1, H - 0.05, H, L.bz0, L.hall.z1);
  boxAt(bc, std('#0d0d0f', { roughness: 0.9 }), L.kids.x0, L.bx1, H - 0.05, H, L.hall.z1, L.bz1 - 0.3);
  boxAt(bc, std('#0d0d0f', { roughness: 0.9 }), L.museum.x0, L.bx1, H - 0.05, H, L.museum.z1, L.hall.z1);

  // ---------- ENTRADA: caixa de presentes + balcão de lembrancinhas ----------
  // tapete arco-íris de boas-vindas
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(3, 7.5), new THREE.MeshStandardMaterial({ map: rainbowTex({ w: 512, h: 8 }), roughness: 0.9 }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.012, 15.6); G.foyer.add(rug);
  // caixa de presentes (cubo embrulhado em arco-íris com laço prateado e fenda)
  const giftTex = canvasTex(512, 512, (g, w, h) => {
    const grd = g.createLinearGradient(0, h, w, 0); RAINBOW.forEach((c, i) => grd.addColorStop(i / 8, c)); g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.globalAlpha = 0.18; g.fillStyle = '#fff'; g.font = '700 54px AvantGarde'; g.save(); g.translate(w / 2, h / 2); g.rotate(-0.47);
    for (let y = -400; y < 400; y += 70) for (let x = -500; x < 500; x += 230) g.fillText(((y / 70) & 1) ? 'GUAR DA' : 'VAN', x + (y % 140 ? 60 : 0), y);
    g.restore(); g.globalAlpha = 1;
  });
  const giftM = new THREE.MeshStandardMaterial({ map: giftTex, roughness: 0.35 });
  const gx = -2.7, gz = 14.8;
  boxAt(bfo, M.chrome, gx - 0.9, gx + 0.9, 0, 0.12, gz - 0.9, gz + 0.9);
  bfo.add(roundBox(1.3, 1.3, 1.3, 0.04), giftM, [gx, 0.77, gz]);
  boxAt(bfo, M.chrome, gx - 0.12, gx + 0.12, 0.12, 1.43, gz - 0.66, gz + 0.66); boxAt(bfo, M.chrome, gx - 0.66, gx + 0.66, 0.12, 1.43, gz - 0.12, gz + 0.12);
  boxAt(bfo, M.black, gx - 0.4, gx + 0.4, 1.42, 1.44, gz - 0.06, gz + 0.06);
  const bow = new THREE.TorusGeometry(0.22, 0.06, 8, 24);
  bfo.add(bow, M.chrome, [gx - 0.2, 1.55, gz], [0, 0, 0.5], [1, 0.7, 1]); bfo.add(bow, M.chrome, [gx + 0.2, 1.55, gz], [0, 0, -0.5], [1, 0.7, 1]);
  // presentes já entregues ao redor
  const r = rng(77);
  for (let i = 0; i < 7; i++) {
    const s = 0.28 + r() * 0.25, a = i * 0.9, x = gx + Math.cos(a) * 1.25, z = gz + Math.sin(a) * 1.25;
    const m = std(RAINBOW[i % 9], { roughness: 0.4 }); bfo.add(roundBox(s, s * 0.8, s, 0.02), m, [x, s * 0.4, z], [0, a, 0]);
    boxAt(bfo, M.white, x - 0.025, x + 0.025, 0, s * 0.81, z - s / 2 - 0.005, z + s / 2 + 0.005);
  }
  blob(bfo, gx, gz, 3.4);
  panel(G.foyer, signTex('PRESENTES', 'deixe seu presente aqui', { w: 1024, h: 256, titleSize: 120 }), 2.0, 0.5, [gx, 2.25, gz], Math.PI / 2 * 0.0, { emissive: true }).lookAt(0, 2.25, 22);
  anchors.gift = new THREE.Vector3(gx, 1.5, gz);
  // balcão de lembrancinhas com mini-fitas VHS "Daniel 20 Anos"
  const cx = 3.1, cz = 14.9;
  bfo.add(roundBox(1.0, 1.05, 3.4, 0.04), M.white, [cx, 0.525, cz]);
  boxAt(bfo, std('#b9885a', { roughness: 0.4 }), cx - 0.56, cx + 0.56, 1.05, 1.1, cz - 1.75, cz + 1.75);
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.12), new THREE.MeshBasicMaterial({ map: rainbowTex(), toneMapped: false }));
  strip.position.set(cx - 0.505, 0.85, cz); strip.rotation.y = -Math.PI / 2; G.foyer.add(strip);
  const vhsLabel = canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#141416'; g.fillRect(0, 0, w, h);
    const grd = g.createLinearGradient(0, 0, w, 0); RAINBOW.forEach((c, i) => grd.addColorStop(i / 8, c)); g.fillStyle = grd; g.fillRect(14, 18, w - 28, 54);
    g.fillStyle = '#fff'; g.font = '700 30px AvantGarde'; g.textAlign = 'center'; g.fillText('DANIEL 20 ANOS', w / 2, 56);
    g.fillStyle = '#9aa0a8'; g.font = '600 18px Inter'; g.fillText('lembrança · 2029', w / 2, 100);
  });
  const vhsM = [M.plastic, M.plastic, M.plastic, M.plastic, new THREE.MeshStandardMaterial({ map: vhsLabel, roughness: 0.4 }), M.plastic];
  const vhsGeo = new THREE.BoxGeometry(0.19, 0.105, 0.03);
  const inst = new THREE.InstancedMesh(vhsGeo, vhsM, 60); let k = 0; const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let row = 0; row < 3; row++) for (let i = 0; i < 20 && k < 60; i++) {
    e.set(-0.25, -Math.PI / 2, 0); q.setFromEuler(e);
    mx.compose(new THREE.Vector3(cx - 0.3 + row * 0.22, 1.16 + 0.0, cz - 1.55 + i * 0.163), q, new THREE.Vector3(1, 1, 1)); inst.setMatrixAt(k++, mx);
  }
  G.foyer.add(inst);
  panel(G.foyer, signTex('LEMBRANCINHAS', 'mini-fita VHS · Daniel 20 Anos', { w: 1024, h: 256, titleSize: 104 }), 2.4, 0.6, [cx + 0.7, 2.4, cz], -Math.PI / 2, { emissive: true });
  boxAt(bfo, M.chrome, cx + 0.68, cx + 0.72, 0, 2.1, cz - 0.05, cz + 0.05);
  blob(bfo, cx, cz, 2.0, 4.4);
  anchors.souvenir = new THREE.Vector3(cx, 1.3, cz);
  // painel de boas-vindas (frente de quem entra) - logo 2003
  panel(G.foyer, A.tex.logo2003, 1.9, 1.45, [0, 5.1, 19.5], Math.PI, { emissive: true, intensity: 1.0 });

  // ---------- SALA DE ESTAR (corredor) + exposição Vanguarda Especial ----------
  const posters = ESPECIAIS.map((t, i) => especialPoster(A.img.especial, i + 1, t));
  const frameM = std('#1b1b1d', { roughness: 0.4, metalness: 0.4 }), frameIn = M.chrome;
  const pic = (x, z, ry, tex, n) => {
    const grp = new THREE.Group(); grp.position.set(x, 1.85, z); grp.rotation.y = ry; G.lounge.add(grp);
    const fr = new THREE.Mesh(roundBox(1.06, 1.38, 0.06, 0.015), frameM); grp.add(fr);
    const inner = new THREE.Mesh(new THREE.BoxGeometry(0.94, 1.26, 0.02), frameIn); inner.position.z = 0.025; grp.add(inner);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.87, 1.16), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.18 }));
    p.position.z = 0.04; grp.add(p);
    // luminária de quadro
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 10), M.chrome); lamp.rotation.z = Math.PI / 2; lamp.position.set(0, 0.86, 0.16); grp.add(lamp);
    const lg = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.03), glow('#fff3d6', 2.5)); lg.position.set(0, 0.84, 0.17); lg.rotation.x = Math.PI / 2; grp.add(lg);
    // cone de luz suave sobre o quadro
    const wash = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.7), new THREE.MeshBasicMaterial({ map: A.tex.washDown, color: new THREE.Color('#ffe8c0').multiplyScalar(0.35), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    wash.position.set(0, 0, -0.01); grp.add(wash);
    anchors['esp' + n] = grp;
    return grp;
  };
  for (let i = 0; i < 8; i++) pic(-22.4 + i * 2.26, L.hall.z1 + T / 2 + 0.04, 0, posters[i], i + 1);
  for (let i = 0; i < 7; i++) pic(-7.7 - i * 2.26, L.bz1 - 0.4, Math.PI, posters[8 + i], 9 + i);
  // título da exposição na parede do fundo da sala
  panel(G.lounge, A.tex.especialTitle, 3.2, 2.4, [L.bx0 + 0.1, 2.1, 15.5], Math.PI / 2, { emissive: true, intensity: 0.95 });
  // sofás, mesas de centro, tapetes, plantas, luminárias
  const sofaM = std('#4b4f56', { roughness: 0.9 }), cushionM = RAINBOW.map((c) => std(c, { roughness: 0.85 }));
  const sofa = (x, z, ry) => {
    const o = new THREE.Object3D(); o.position.set(x, 0, z); o.rotation.y = ry; o.updateMatrixWorld();
    const add = (geo, mat, p, s = [1, 1, 1], rr = [0, 0, 0]) => { const c = new THREE.Object3D(); c.position.set(...p); c.scale.set(...s); c.rotation.set(...rr); o.add(c); c.updateMatrixWorld(); blo.addM(geo, mat, c.matrixWorld); o.remove(c); };
    add(roundBox(2.2, 0.42, 0.9, 0.08), sofaM, [0, 0.33, 0]); add(roundBox(2.2, 0.55, 0.22, 0.08), sofaM, [0, 0.72, -0.4]);
    add(roundBox(0.2, 0.5, 0.9, 0.06), sofaM, [-1.1, 0.5, 0]); add(roundBox(0.2, 0.5, 0.9, 0.06), sofaM, [1.1, 0.5, 0]);
    for (let i = 0; i < 3; i++) add(roundBox(0.42, 0.4, 0.13, 0.05), cushionM[(i * 3 + Math.abs(Math.round(x))) % 9], [-0.6 + i * 0.6, 0.72, -0.25], [1, 1, 1], [-0.2, 0, 0]);
    for (const dx of [-1, 1]) for (const dz of [-0.35, 0.35]) add(unitSphere(6), M.chrome, [dx * 1.05, 0.06, dz], [0.06, 0.12, 0.06]);
  };
  for (const x of [-20, -14.5, -9]) {
    sofa(x, 13.1, 0); sofa(x, 17.9, Math.PI);
    const rugM = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 4.6), std('#d8d3c8', { roughness: 1 })); rugM.rotation.x = -Math.PI / 2; rugM.position.set(x, 0.01, 15.5); G.lounge.add(rugM);
    cyl(blo, std('#1b1b1d', { roughness: 0.3 }), 0.55, 0.05, x, 0.42, 15.5, 32); cyl(blo, M.chrome, 0.06, 0.4, x, 0.2, 15.5, 10);
    blo.add(new THREE.TorusGeometry(0.15, 0.04, 8, 20), cushionM[(Math.abs(x) * 2) % 9], [x, 0.48, 15.5], [Math.PI / 2, 0, 0]);
    blob(blo, x, 13.1, 2.8, 1.4); blob(blo, x, 17.9, 2.8, 1.4);
  }
  const pot = std('#e9e6df', { roughness: 0.6 }), leaf = std('#2f6b2a', { roughness: 0.8 }), ico = new THREE.IcosahedronGeometry(0.5, 1);
  for (const [x, z] of [[-23.2, 12.2], [-23.2, 19], [-5.9, 12.2], [-5.9, 19.2]]) { cyl(blo, pot, 0.28, 0.6, x, 0.3, z, 16); blo.add(ico, leaf, [x, 1.1, z], [0, x, 0], [1.1, 1.4, 1.1]); }

  // ---------- 4 BANHEIROS temáticos ----------
  const B = L.baths, bw = (B.x1 - B.x0) / 4;
  wallZ(B.hallZ, B.x0, B.x1, 3.2);
  boxAt(bba, wall, B.x0, B.x1, 3.2, H, B.hallZ - T / 2, B.hallZ + T / 2);
  const names = [['MASCULINO', 'banheiro 1'], ['FEMININO', 'banheiro 2'], ['FAMÍLIA', 'trocador infantil'], ['ACESSÍVEL', 'PcD']];
  const tileRb = canvasTex(512, 64, (g, w, h) => { RAINBOW.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * w / 9, 0, w / 9 + 1, h); }); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 3; for (let x = 0; x <= w; x += w / 18) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } }, { repeat: [1, 1] });
  for (let i = 0; i < 4; i++) {
    const x0 = B.x0 + i * bw, x1 = x0 + bw, xc = (x0 + x1) / 2;
    if (i > 0) wallX(x0, B.hallZ, L.bz1 - 0.3, 3.2);
    // porta (cor do arco-íris) + placa
    const doorM = std(RAINBOW[[0, 6, 3, 4][i]], { roughness: 0.4 });
    boxAt(bba, doorM, xc - 0.55, xc + 0.55, 0, 2.2, B.hallZ - T / 2 - 0.04, B.hallZ - T / 2);
    boxAt(bba, M.chrome, xc + 0.38, xc + 0.46, 1.0, 1.1, B.hallZ - T / 2 - 0.1, B.hallZ - T / 2 - 0.04);
    panel(G.baths, signTex(names[i][0], names[i][1], { w: 640, h: 240, titleSize: 84, subSize: 40 }), 1.25, 0.47, [xc, 2.62, B.hallZ - T / 2 - 0.02], Math.PI, { emissive: true });
    // por dentro: faixa arco-íris, bancada com cuba, espelho com moldura cromada e "V"
    const band = new THREE.Mesh(new THREE.PlaneGeometry(bw - 0.3, 0.35), new THREE.MeshStandardMaterial({ map: tileRb, roughness: 0.2 }));
    band.position.set(xc, 1.35, L.bz1 - 0.38); band.rotation.y = Math.PI; G.baths.add(band);
    boxAt(bba, std('#2a2c30', { roughness: 0.15, metalness: 0.3 }), x0 + 0.4, x1 - 0.4, 0.82, 0.88, L.bz1 - 0.95, L.bz1 - 0.36);
    cyl(bba, M.white, 0.2, 0.06, xc, 0.9, L.bz1 - 0.65, 20); cyl(bba, M.chrome, 0.02, 0.3, xc, 1.0, L.bz1 - 0.42, 8);
    boxAt(bba, M.chrome, x0 + 0.5, x1 - 0.5, 1.6, 2.7, L.bz1 - 0.38, L.bz1 - 0.34);
    boxAt(bba, std('#cfe3ee', { metalness: 1, roughness: 0.04 }), x0 + 0.56, x1 - 0.56, 1.66, 2.64, L.bz1 - 0.385, L.bz1 - 0.33);
    panel(G.baths, A.tex.logoAtualT, 0.5, 0.28, [xc, 2.92, L.bz1 - 0.37], Math.PI, { emissive: true, transparent: true });
    // cabine do vaso
    boxAt(bba, std('#d9d6cf'), x0 + 0.15, x0 + 0.2, 0.15, 2.1, B.hallZ + 1.0, B.hallZ + 3.2);
    cyl(bba, M.white, 0.22, 0.42, x0 + 0.65, 0.21, B.hallZ + 2.3, 16);
    boxAt(bba, M.white, x0 + 0.25, x0 + 0.45, 0.4, 1.0, B.hallZ + 2.05, B.hallZ + 2.55);
    if (i === 3) { boxAt(bba, M.chrome, x1 - 0.5, x1 - 0.45, 0.75, 0.8, B.hallZ + 1, B.hallZ + 3); }
    if (i === 2) { boxAt(bba, std('#ffd400'), x1 - 1.1, x1 - 0.2, 0.85, 0.95, B.hallZ + 1.2, B.hallZ + 2.0); }
  }
  // corredor dos banheiros: listra arco-íris no rodapé
  const rbStrip = new THREE.Mesh(new THREE.PlaneGeometry(B.x1 - B.x0, 0.14), new THREE.MeshBasicMaterial({ map: rainbowTex(), toneMapped: false }));
  rbStrip.position.set((B.x0 + B.x1) / 2, 2.98, B.hallZ - T / 2 - 0.02); rbStrip.rotation.y = Math.PI; G.baths.add(rbStrip);
  anchors.baths = new THREE.Vector3((B.x0 + B.x1) / 2, 2.6, B.hallZ);

  // ---------- PLAYGROUND (Espaço Kids) ----------
  const K = L.kids;
  const evaTex = canvasTex(512, 512, (g, w, h) => { const c = ['#ff8fb8', '#ffb07a', '#ffe27a', '#9ee89a', '#8fe0ea', '#9fb6ff', '#c9a2ff']; const s = w / 8; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = c[(i + j * 3) % 7]; g.fillRect(i * s, j * s, s, s); } g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 3; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); } }, { repeat: [4, 2] });
  const kf = new THREE.Mesh(new THREE.PlaneGeometry(K.x1 - K.x0, K.z1 - K.z0), new THREE.MeshStandardMaterial({ map: evaTex, roughness: 0.85 }));
  kf.rotation.x = -Math.PI / 2; kf.position.set((K.x0 + K.x1) / 2, 0.006, (K.z0 + K.z1) / 2); G.kids.add(kf);
  // torre com escorregador
  const tx = 24, tz = 15;
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(bk, std(RAINBOW[6]), 0.08, 2.6, tx + dx, 1.3, tz + dz, 12);
  boxAt(bk, std('#ffd400', { roughness: 0.5 }), tx - 1.1, tx + 1.1, 1.5, 1.62, tz - 1.1, tz + 1.1);
  bk.add(new THREE.ConeGeometry(1.5, 0.9, 4), std(RAINBOW[1], { roughness: 0.5 }), [tx, 3.05, tz], [0, Math.PI / 4, 0]);
  const slideLen = 3.6, ang = 0.42;
  bk.add(new THREE.BoxGeometry(slideLen, 0.08, 0.9), std('#00b8d8', { roughness: 0.3 }), [tx + 1.1 + Math.cos(ang) * slideLen / 2, 1.55 - Math.sin(ang) * slideLen / 2, tz], [0, 0, -ang]);
  for (const dz of [-0.47, 0.47]) bk.add(new THREE.BoxGeometry(slideLen, 0.22, 0.05), std('#1e6cff', { roughness: 0.4 }), [tx + 1.1 + Math.cos(ang) * slideLen / 2, 1.64 - Math.sin(ang) * slideLen / 2, tz + dz], [0, 0, -ang]);
  for (let i = 0; i < 5; i++) boxAt(bk, std(RAINBOW[i * 2]), tx - 1.1 - 0.05, tx - 1.0, 0.25 + i * 0.3, 0.3 + i * 0.3, tz - 0.5, tz + 0.5);
  // balanços
  const sx = 31, sz = 16.5;
  for (const dx of [-2, 2]) { bk.add(new THREE.CylinderGeometry(0.07, 0.07, 3.0, 10), std(RAINBOW[2]), [sx + dx, 1.4, sz - 0.6], [0.35, 0, 0]); bk.add(new THREE.CylinderGeometry(0.07, 0.07, 3.0, 10), std(RAINBOW[2]), [sx + dx, 1.4, sz + 0.6], [-0.35, 0, 0]); }
  cyl(bk, std(RAINBOW[0]), 0.08, 4.2, sx, 2.85, sz, 12, [0, 0, Math.PI / 2]);
  const swings = [];
  for (const dx of [-1, 1]) {
    const sw = new THREE.Group(); sw.position.set(sx + dx, 2.85, sz); G.kids.add(sw);
    for (const ox of [-0.25, 0.25]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 2.2, 6), M.steel); c.position.set(ox, -1.1, 0); sw.add(c); }
    const seat = new THREE.Mesh(roundBox(0.6, 0.06, 0.28, 0.02), std(RAINBOW[dx > 0 ? 5 : 3], { roughness: 0.4 })); seat.position.y = -2.2; sw.add(seat);
    swings.push(sw);
  }
  anim.push((t) => swings.forEach((s, i) => { s.rotation.x = Math.sin(t * 2.2 + i * 1.7) * 0.35; }));
  // piscina de bolinhas
  const px = 38.5, pz = 15;
  for (const [x0, x1, z0, z1] of [[px - 2.2, px + 2.2, pz - 2.2, pz - 2.0], [px - 2.2, px + 2.2, pz + 2.0, pz + 2.2], [px - 2.2, px - 2.0, pz - 2.2, pz + 2.2], [px + 2.0, px + 2.2, pz - 2.2, pz + 2.2]]) bk.add(roundBox(x1 - x0, 0.7, z1 - z0, 0.05), std('#2b6cff', { roughness: 0.5 }), [(x0 + x1) / 2, 0.35, (z0 + z1) / 2]);
  const balls = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshStandardMaterial({ roughness: 0.35 }), 900);
  const rr = rng(9), m4 = new THREE.Matrix4(), col = new THREE.Color();
  for (let i = 0; i < 900; i++) { m4.makeTranslation(px - 1.9 + rr() * 3.8, 0.1 + rr() * 0.45, pz - 1.9 + rr() * 3.8); balls.setMatrixAt(i, m4); balls.setColorAt(i, col.set(RAINBOW[i % 9])); }
  G.kids.add(balls);
  // cama elástica
  const tr = [31, 10.6];
  cyl(bk, std('#1d1e22'), 1.4, 0.06, tr[0], 0.55, tr[1], 40); bk.add(new THREE.TorusGeometry(1.45, 0.08, 8, 40), std(RAINBOW[4]), [tr[0], 0.58, tr[1]], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; cyl(bk, M.steel, 0.04, 0.58, tr[0] + Math.cos(a) * 1.4, 0.29, tr[1] + Math.sin(a) * 1.4, 8); cyl(bk, M.steel, 0.025, 1.6, tr[0] + Math.cos(a) * 1.48, 1.4, tr[1] + Math.sin(a) * 1.48, 6); }
  // blocos de espuma e casinha
  for (let i = 0; i < 10; i++) bk.add(roundBox(0.5, 0.5, 0.5, 0.06), std(RAINBOW[i % 9], { roughness: 0.8 }), [21 + (i % 5) * 0.62, 0.25 + Math.floor(i / 5) * 0.5, 9.6 + (i % 2) * 0.1], [0, i * 0.2, 0]);
  const hx = 38.5, hz = 10.3;
  boxAt(bk, std('#fff3c4'), hx - 1.2, hx + 1.2, 0, 1.7, hz - 1.0, hz + 1.0);
  bk.add(new THREE.ConeGeometry(1.75, 1.0, 4), std(RAINBOW[0]), [hx, 2.2, hz], [0, Math.PI / 4, 0]);
  boxAt(bk, std('#3a2a1c'), hx - 0.35, hx + 0.35, 0, 1.2, hz + 1.0, hz + 1.03);
  // cerquinha e placa
  for (let x = K.x0 + 1; x < K.x1; x += 0.5) if (x < 22 || x > 24) cyl(bk, std(RAINBOW[Math.floor(x * 2) % 9]), 0.04, 0.8, x, 0.4, K.z0 + 0.6, 8);
  boxAt(bk, M.white, K.x0 + 1, K.x1 - 0.5, 0.75, 0.82, K.z0 + 0.55, K.z0 + 0.65);
  panel(G.kids, signTex('ESPAÇO KIDS', 'playground para os pequenos convidados', { w: 1024, h: 256, titleSize: 118 }), 4.0, 1.0, [31, 4.6, L.bz1 - 0.4], Math.PI, { emissive: true });
  // varal de lâmpadas coloridas
  const bulbs = RAINBOW.map((c) => glow(c, 2.4));
  for (const z of [11, 14, 17]) for (let i = 0; i < 30; i++) bk.add(unitSphere(8), bulbs[i % 9], [19.5 + i * 0.8, 5.6 - Math.sin(i / 29 * Math.PI) * 0.5, z], [0, 0, 0], [0.12, 0.15, 0.12]);
  anchors.kids = new THREE.Vector3(31, 1.5, 14);

  bs.flush(); bc.flush(); bfo.flush(); blo.flush(); bba.flush(); bk.flush();
  return { groups: G, anim, anchors, posters };
}
