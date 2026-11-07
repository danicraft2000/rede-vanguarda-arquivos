// Salão principal: palco + 3 telões, iluminação de show, mesas com agradecimento, buffet e bar.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Batch, M, std, glow, box, boxAt, cyl, blob, panel, unitSphere, unitBox, roundBox, signTex } from './kit.js';
import { L } from './layout.js';
import { canvasTex, tileTex, brickTex, rainbowTex } from '../lib/textures.js';
import { RAINBOW, rng, beatPulse, PHRASE, BEAT0 } from '../lib/util.js';
import { drawBrand } from '../lib/brand.js';

export const PIZZAS = [
  ['Mussarela', 'mus'], ['Calabresa', 'cal'], ['Margherita', 'mar'], ['Portuguesa', 'por'], ['Frango com Catupiry', 'fra'],
  ['Quatro Queijos', '4q'], ['Pepperoni', 'pep'], ['Bacon com Milho', 'bac'], ['Chocolate com Morango', 'cho'], ['Banana com Canela', 'ban'],
];

function pizzaTex(kind) {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rng(kind.length * 31 + kind.charCodeAt(0)), c = w / 2;
    const disc = (x, y, rad, col) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill(); };
    disc(c, c, 126, '#c8893f'); disc(c, c, 112, '#e2a75a');
    const sweet = kind === 'cho' || kind === 'ban';
    disc(c, c, 104, sweet ? (kind === 'cho' ? '#4a2614' : '#f3e2b8') : '#c43b1f');
    if (!sweet) for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = r() * 90; disc(c + Math.cos(a) * d, c + Math.sin(a) * d, 16 + r() * 16, kind === '4q' ? ['#fff6d8', '#f6d77a', '#ffffff', '#e8c45a'][i % 4] : '#f8e3a2'); }
    const scatter = (n, f) => { for (let i = 0; i < n; i++) { const a = r() * 6.28, d = 12 + r() * 82; f(c + Math.cos(a) * d, c + Math.sin(a) * d, i); } };
    if (kind === 'cal') scatter(16, (x, y) => { disc(x, y, 13, '#a8322a'); disc(x, y, 9, '#c4473a'); disc(x + 3, y - 2, 2, '#f2d0b0'); });
    if (kind === 'pep') scatter(18, (x, y) => { disc(x, y, 12, '#8e1f1a'); disc(x - 2, y - 2, 3, '#b23a2c'); });
    if (kind === 'mar') scatter(9, (x, y, i) => { disc(x, y, 15, '#fbfaf2'); if (i % 2) { g.fillStyle = '#2f8a2a'; g.beginPath(); g.ellipse(x + 10, y + 6, 8, 4, r() * 3, 0, 7); g.fill(); } });
    if (kind === 'por') scatter(22, (x, y, i) => { g.fillStyle = ['#f0a7a0', '#2c2c2c', '#3b8f2e', '#fff', '#f6c21c'][i % 5]; g.fillRect(x - 5, y - 5, 10, 10); });
    if (kind === 'fra') { scatter(40, (x, y) => { g.fillStyle = '#e9d2a6'; g.fillRect(x - 6, y - 2, 12, 4); }); g.strokeStyle = '#fffdf4'; g.lineWidth = 9; g.beginPath(); for (let a = 0; a < 18; a += 0.2) g.lineTo(c + Math.cos(a) * a * 5, c + Math.sin(a) * a * 5); g.stroke(); }
    if (kind === '4q') scatter(10, (x, y) => disc(x, y, 6, '#7b8fa6'));
    if (kind === 'bac') scatter(36, (x, y, i) => { if (i % 2) { g.fillStyle = '#8b3a22'; g.fillRect(x - 9, y - 3, 18, 6); } else disc(x, y, 4, '#ffd33a'); });
    if (kind === 'cho') scatter(14, (x, y) => { disc(x, y, 11, '#d61f35'); disc(x - 2, y - 3, 2, '#ffd6dc'); });
    if (kind === 'ban') { scatter(14, (x, y) => { disc(x, y, 12, '#f5dc6c'); disc(x, y, 4, '#d9b84a'); }); scatter(80, (x, y) => disc(x, y, 1.6, '#7a4320')); }
    g.strokeStyle = 'rgba(80,40,10,0.35)'; g.lineWidth = 2; for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(i * Math.PI / 4) * 112, c + Math.sin(i * Math.PI / 4) * 112); g.stroke(); }
  });
}

export function buildHall(A) {
  const G = { ceilHall: null, hall: new THREE.Group(), stage: new THREE.Group(), tables: new THREE.Group(), food: new THREE.Group(), fx: new THREE.Group() };
  const b = new Batch(G.hall), bs = new Batch(G.stage), bt = new Batch(G.tables), bf = new Batch(G.food);
  const anim = [], anchors = {};
  const H = L.hall, S = L.stage, Y = L.wallH;

  // ---------- piso, pilastras de tijolo, colunas ----------
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(H.x1 - H.x0, H.z1 - H.z0), new THREE.MeshStandardMaterial({ map: tileTex([14, 14]), roughness: 0.28, envMapIntensity: 0.9 }));
  fl.rotation.x = -Math.PI / 2; fl.position.set((H.x0 + H.x1) / 2, 0.004, (H.z0 + H.z1) / 2); G.hall.add(fl);
  const dance = new THREE.Mesh(new THREE.PlaneGeometry(22, 6.5), std('#0b0b0d', { roughness: 0.12, metalness: 0.4 }));
  dance.rotation.x = -Math.PI / 2; dance.position.set(0, 0.008, -21.7); G.hall.add(dance);
  const brick = new THREE.MeshStandardMaterial({ map: brickTex([1.2, 6]), roughness: 0.9 });
  for (const z of [-28, -20, -12, -4, 4]) { boxAt(b, brick, H.x0, H.x0 + 0.35, 0, Y, z - 0.7, z + 0.7); if (z !== -4) boxAt(b, brick, H.x1 - 0.48, H.x1 - 0.12, 0, Y, z - 0.7, z + 0.7); }
  for (const x of [-18, -6, 6]) boxAt(b, brick, x - 0.7, x + 0.7, 0, Y, H.z1 - 0.48, H.z1 - 0.12);
  const colM = std('#8f9396', { roughness: 0.75 });
  for (const x of [-14.5, 14.5]) boxAt(b, colM, x - 0.55, x + 0.55, 0, Y, -25.6, -24.5);
  // ar-condicionado nas paredes (detalhe das fotos)
  for (const z of [-16, 0]) { box(b, M.white, 0.25, 0.32, 1.1, H.x0 + 0.2, 5.6, z); box(b, M.white, 0.25, 0.32, 1.1, H.x1 - 0.3, 5.6, z); }

  // ---------- treliças pretas no teto ----------
  const bceil = new Batch(G.ceilHall = new THREE.Group());
  for (let x = -21; x <= 15; x += 6) boxAt(bceil, M.truss, x - 0.1, x + 0.1, 6.7, 6.9, H.z0, H.z1);
  for (let z = -29; z <= 9; z += 6) boxAt(bceil, M.truss, H.x0, H.x1, 6.75, 6.85, z - 0.07, z + 0.07);
  boxAt(b, M.truss, -12.5, 12.5, 6.2, 6.6, -24.4, -24.0); boxAt(b, M.truss, -12.5, 12.5, 6.2, 6.6, -26.4, -26.0);
  for (const x of [-12.3, 12.3]) for (const z of [-24.2, -26.2]) boxAt(b, M.truss, x - 0.2, x + 0.2, 1.0, 6.6, z - 0.2, z + 0.2);
  const spotM = glow('#fff4dc', 2.0);
  for (let x = -20; x <= 16; x += 4) for (let z = -18; z <= 8; z += 6.5) cyl(bceil, spotM, 0.1, 0.03, x, 6.65, z, 12);
  bceil.flush();

  // ---------- palco ----------
  boxAt(bs, std('#141416', { roughness: 0.85 }), S.x0, S.x1, 0, S.h, S.z0, S.z1);
  const fascia = new THREE.Mesh(new THREE.PlaneGeometry(S.x1 - S.x0, 0.14), new THREE.MeshBasicMaterial({ map: rainbowTex(), color: new THREE.Color(1.8, 1.8, 1.8), toneMapped: false }));
  fascia.position.set(0, S.h - 0.12, S.z1 + 0.01); G.stage.add(fascia);
  for (let i = 0; i < 4; i++) boxAt(bs, std('#1c1c1f'), -2 , 2, 0, S.h - i * 0.25, S.z1, S.z1 + 0.35 * (4 - i)); // escada central
  // DJ
  boxAt(bs, M.black, -1.6, 1.6, S.h, S.h + 1.05, -29.2, -28.2);
  const djTex = canvasTex(1024, 300, (g, w, h) => { const grd = g.createLinearGradient(0, 0, w, 0); RAINBOW.forEach((c, i) => grd.addColorStop(i / 8, c)); g.fillStyle = grd; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '700 150px AvantGarde'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('DJ · 20', w / 2, h / 2 + 8); });
  panel(G.stage, djTex, 3.2, 0.94, [0, S.h + 0.53, -28.18], 0, { emissive: true, intensity: 1.1 });
  // caixas de som (line array) e subwoofers
  for (const s of [-1, 1]) {
    for (let i = 0; i < 6; i++) box(bs, M.black, 1.1, 0.34, 0.6, s * 12.6, 5.9 - i * 0.36, -23.4, 0);
    for (let i = 0; i < 2; i++) box(bs, M.black, 1.2, 0.8, 0.9, s * 12.4, 0.4 + i * 0.8, -23.6, 0);
  }

  // ---------- 3 telões: DANIEL | arco-íris | 20 ANOS ----------
  const ban = A.img.banner20;
  const sideTex = (sx, label) => canvasTex(1024, 600, (g, w, h) => {
    // fundo cinza do painel do banner + recorte do próprio banner (fita prateada, faixa arco-íris e texto)
    g.fillStyle = '#5f7377'; g.fillRect(0, 0, w, h);
    const src = sx < 640 ? [0, 262, 442, 260] : [838, 262, 442, 260];
    g.drawImage(ban, ...src, 0, 0, w, h);
    // cobre o branco que sobra acima/abaixo das pontas curvas
    const id = g.getImageData(0, 0, w, h), d = id.data;
    for (let i = 0; i < d.length; i += 4) if (d[i] > 235 && d[i + 1] > 235 && d[i + 2] > 235) { d[i] = 14; d[i + 1] = 16; d[i + 2] = 20; }
    g.putImageData(id, 0, 0);
    void label;
  });
  const centerTex = canvasTex(1024, 576, () => {}, { mips: false });
  const drawCenter = (t) => {
    const g = centerTex.userData.ctx, w = 1024, h = 576;
    const off = (t * 90) % w;
    const grd = g.createLinearGradient(-off, 0, w * 2 - off, 0);
    const list = [...RAINBOW, ...RAINBOW];
    list.forEach((c, i) => grd.addColorStop(i / (list.length - 1), c));
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.save(); g.translate(w / 2, h / 2); g.rotate(-0.47); g.fillStyle = 'rgba(255,255,255,0.38)';
    const sh = (t * 40) % 160;
    for (let y = -560; y < 560; y += 80) for (let x = -900; x < 900; x += 240) {
      const k = Math.round((y + 560) / 80) % 3, word = ['VAN', 'GUAR', 'DA'][k];
      drawBrand(g, word, x + (k === 2 ? 80 : k === 1 ? -10 : 0) + sh, y, 64, { fill: null, altA: false });
      g.fill();
    }
    g.restore();
    const p = beatPulse(t, 5); g.fillStyle = `rgba(255,255,255,${0.12 * p})`; g.fillRect(0, 0, w, h);
    centerTex.needsUpdate = true;
  };
  drawCenter(0);
  const scr = (tex, w, h, x, y, z, ry, frame = true) => {
    const grp = new THREE.Group(); grp.position.set(x, y, z); grp.rotation.y = ry; G.stage.add(grp);
    if (frame) { const f = new THREE.Mesh(new THREE.BoxGeometry(w + 0.24, h + 0.24, 0.2), M.black); f.position.z = -0.11; grp.add(f); }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.05, 1.05, 1.05), toneMapped: false }));
    grp.add(m); return grp;
  };
  const scL = scr(sideTex(0), 5.4, 3.18, -8.6, 4.15, -30.2, 0.2);
  const scC = scr(centerTex, 9.2, 5.18, 0, 4.25, -31.2, 0);
  const scR = scr(sideTex(1000), 5.4, 3.18, 8.6, 4.15, -30.2, -0.2);
  anchors.screenL = scL; anchors.screenC = scC; anchors.screenR = scR;
  G.stage.userData.drawCenter = drawCenter;

  // ---------- luzes de show: moving heads com fachos (aditivos) ----------
  const beamTex = canvasTex(64, 256, (g, w, h) => {
    const gy = g.createLinearGradient(0, 0, 0, h); gy.addColorStop(0, 'rgba(255,255,255,0.9)'); gy.addColorStop(0.15, 'rgba(255,255,255,0.45)'); gy.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gy; g.fillRect(0, 0, w, h);
    const gx = g.createLinearGradient(0, 0, w, 0); gx.addColorStop(0, 'rgba(0,0,0,1)'); gx.addColorStop(0.5, 'rgba(0,0,0,0)'); gx.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = gx; g.fillRect(0, 0, w, h);
  }, { srgb: false });
  const beamGeo = new THREE.CylinderGeometry(0.06, 0.9, 9, 20, 1, true); beamGeo.translate(0, -4.5, 0);
  const heads = [];
  const headGeo = mergeGeometries([new THREE.BoxGeometry(0.34, 0.3, 0.3).toNonIndexed(), new THREE.CylinderGeometry(0.16, 0.13, 0.42, 12).translate(0, -0.2, 0).toNonIndexed()].map((g) => { g.deleteAttribute('uv'); return g; }));
  const mkHead = (x, y, z, i) => {
    const yoke = new THREE.Group(); yoke.position.set(x, y, z); G.fx.add(yoke);
    const hm = new THREE.Mesh(headGeo, M.black); yoke.add(hm);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), glow('#ffffff', 3)); lens.position.y = -0.42; lens.rotation.x = Math.PI / 2; yoke.add(lens);
    const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ map: beamTex, color: '#ffffff', transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    beam.position.y = -0.4; yoke.add(beam);
    heads.push({ yoke, beam, lens, i });
  };
  for (let i = 0; i < 8; i++) mkHead(-10.5 + i * 3, 6.05, -24.2, i);
  for (let i = 0; i < 4; i++) mkHead(-7.5 + i * 5, 6.4, -17, 8 + i);
  // poças de luz no chão da pista
  const poolTex = A.tex.glow;
  const pools = [];
  for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.35 })); p.rotation.x = -Math.PI / 2; p.position.y = 0.02; G.fx.add(p); pools.push(p); }
  const colTmp = new THREE.Color();
  anim.push((t) => {
    const ph = Math.floor((t - BEAT0) / PHRASE), bp = beatPulse(t, 4);
    heads.forEach((h, k) => {
      const pan = Math.sin(t * 0.9 + k * 0.7) * 0.55 + (k % 2 ? 0.25 : -0.25);
      const tilt = 0.35 + Math.sin(t * 1.3 + k) * 0.28;
      h.yoke.rotation.set(tilt, 0, pan, 'YXZ'); h.yoke.rotation.z = pan; h.yoke.rotation.x = tilt;
      colTmp.set(RAINBOW[(k + ph * 2) % 9]);
      h.beam.material.color.copy(colTmp); h.beam.material.opacity = 0.2 + 0.16 * bp;
      h.lens.material.color.copy(colTmp).multiplyScalar(3);
    });
    pools.forEach((p, k) => { p.position.set(-7.5 + k * 3 + Math.sin(t * 0.8 + k) * 1.5, 0.02, -21.5 + Math.cos(t * 0.7 + k * 2) * 2); p.material.color.set(RAINBOW[(k * 2 + ph) % 9]); p.material.opacity = 0.25 + 0.2 * bp; });
  });

  // ---------- mesas com cartão de agradecimento ----------
  const card = canvasTex(512, 320, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    const grd = g.createLinearGradient(0, 0, w, 0); RAINBOW.forEach((c, i) => grd.addColorStop(i / 8, c)); g.fillStyle = grd; g.fillRect(0, 0, w, 22);
    g.fillStyle = '#16161a'; g.textAlign = 'center'; g.font = '700 54px AvantGarde'; g.fillText('OBRIGADO', w / 2, 112); g.fillText('POR VIR!', w / 2, 170);
    g.font = '500 25px Inter'; g.fillStyle = '#444'; g.fillText('Sua presença faz a minha festa', w / 2, 220); g.fillText('ficar ainda mais especial.', w / 2, 252);
    g.fillStyle = '#16161a'; drawBrand(g, 'DANIEL 20 ANOS', w / 2, 298, 28, { align: 'center', fill: '#16161a' });
  });
  A.tex.thankCard = card;
  const tableXs = [-14, -9, -4, 1, 6, 11], tableZs = [-16, -11, -6, -1, 4];
  const tables = []; tableXs.forEach((x) => tableZs.forEach((z) => tables.push([x, z])));
  const clothM = std('#f6f5f1', { roughness: 0.92 });
  // toalha + tampo
  const clothGeo = new THREE.CylinderGeometry(0.92, 0.98, 0.76, 32, 1, false); clothGeo.translate(0, 0.38, 0);
  const tops = new THREE.InstancedMesh(clothGeo, clothM, tables.length);
  // cadeiras tiffany (geometria única instanciada)
  const chairParts = [];
  const cp = (geo, p, s = [1, 1, 1], r = [0, 0, 0]) => { const o = new THREE.Object3D(); o.position.set(...p); o.scale.set(...s); o.rotation.set(...r); o.updateMatrix(); const g = geo.clone().toNonIndexed(); g.applyMatrix4(o.matrix); g.deleteAttribute('uv'); chairParts.push(g); };
  cp(new THREE.BoxGeometry(0.42, 0.05, 0.4), [0, 0.46, 0]);
  for (const [x, z] of [[-0.18, -0.17], [0.18, -0.17], [-0.18, 0.17], [0.18, 0.17]]) cp(new THREE.CylinderGeometry(0.018, 0.015, 0.46, 6), [x, 0.23, z]);
  for (const x of [-0.18, 0.18]) cp(new THREE.CylinderGeometry(0.018, 0.018, 0.5, 6), [x, 0.72, -0.18]);
  for (let i = 0; i < 4; i++) cp(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 5), [0, 0.6 + i * 0.1, -0.18], [1, 1, 1], [0, 0, Math.PI / 2]);
  const chairGeo = mergeGeometries(chairParts);
  const chairs = new THREE.InstancedMesh(chairGeo, std('#3b2416', { roughness: 0.45, metalness: 0.1 }), tables.length * 8);
  const plateGeo = new THREE.CylinderGeometry(0.13, 0.11, 0.02, 20);
  const plates = new THREE.InstancedMesh(plateGeo, std('#ffffff', { roughness: 0.25 }), tables.length * 8);
  const glassGeo = new THREE.CylinderGeometry(0.035, 0.03, 0.13, 10, 1, true);
  const glasses = new THREE.InstancedMesh(glassGeo, new THREE.MeshStandardMaterial({ color: '#d8f0ff', transparent: true, opacity: 0.45, roughness: 0.05, metalness: 0.2 }), tables.length * 8);
  // cartão em "tenda"
  const tentGeo = (() => { const a = new THREE.PlaneGeometry(0.26, 0.16); a.rotateX(-0.25); a.translate(0, 0.08, 0.02); const bgeo = new THREE.PlaneGeometry(0.26, 0.16); bgeo.rotateY(Math.PI); bgeo.rotateX(0.25); bgeo.translate(0, 0.08, -0.02); return mergeGeometries([a, bgeo]); })();
  const tents = new THREE.InstancedMesh(tentGeo, new THREE.MeshStandardMaterial({ map: card, roughness: 0.6, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: card, emissiveIntensity: 0.15 }), tables.length);
  const vaseGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.3, 24, 1, true);
  const vases = new THREE.InstancedMesh(vaseGeo, new THREE.MeshStandardMaterial({ map: rainbowTex({ w: 256, h: 8 }), emissive: '#ffffff', emissiveMap: rainbowTex({ w: 256, h: 8 }), emissiveIntensity: 0.6, roughness: 0.3, side: THREE.DoubleSide }), tables.length);
  const flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.16, 1), std('#ffffff', { roughness: 0.9 }), tables.length);
  const o = new THREE.Object3D(); let ci = 0;
  tables.forEach(([x, z], ti) => {
    o.position.set(x, 0, z); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); o.updateMatrix(); tops.setMatrixAt(ti, o.matrix);
    o.position.set(x, 0.775, z + 0.12); o.rotation.set(0, (ti % 4) * 0.4 - 0.2 + Math.PI * 0.0, 0); o.updateMatrix(); tents.setMatrixAt(ti, o.matrix);
    o.position.set(x, 0.92, z - 0.32); o.rotation.set(0, 0, 0); o.updateMatrix(); vases.setMatrixAt(ti, o.matrix);
    o.position.set(x, 1.1, z - 0.32); o.scale.set(0.75, 0.6, 0.75); o.updateMatrix(); flowers.setMatrixAt(ti, o.matrix); o.scale.set(1, 1, 1);
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * Math.PI * 2 + 0.2;
      o.position.set(x + Math.sin(a) * 1.28, 0, z + Math.cos(a) * 1.28); o.rotation.set(0, a + Math.PI, 0); o.updateMatrix(); chairs.setMatrixAt(ci, o.matrix);
      o.position.set(x + Math.sin(a) * 0.68, 0.775, z + Math.cos(a) * 0.68); o.rotation.set(0, 0, 0); o.updateMatrix(); plates.setMatrixAt(ci, o.matrix);
      o.position.set(x + Math.sin(a + 0.3) * 0.62, 0.84, z + Math.cos(a + 0.3) * 0.62); o.updateMatrix(); glasses.setMatrixAt(ci, o.matrix);
      ci++;
    }
    blob(bt, x, z, 3.4);
  });
  [tops, chairs, plates, glasses, tents, vases, flowers].forEach((m) => G.tables.add(m));
  anchors.table = new THREE.Vector3(1, 0.9, 4); anchors.card = new THREE.Vector3(1, 0.86, 4.12);

  // ---------- buffet ----------
  const counterTop = std('#f4f2ee', { roughness: 0.3 }), counterFront = std('#121214', { roughness: 0.5 });
  const counter = (z0, z1, x0 = -23.7, x1 = -22.6) => {
    boxAt(bf, counterFront, x0, x1, 0, 0.88, z0, z1); boxAt(bf, counterTop, x0 - 0.03, x1 + 0.05, 0.88, 0.94, z0, z1);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, 0.08), new THREE.MeshBasicMaterial({ map: rainbowTex(), color: new THREE.Color(1.6, 1.6, 1.6), toneMapped: false }));
    s.position.set(x1 + 0.006, 0.8, (z0 + z1) / 2); s.rotation.y = Math.PI / 2; G.food.add(s);
    boxAt(bf, M.glass, x1 - 0.05, x1 + 0.02, 1.25, 1.3, z0, z1);
    for (let z = z0 + 0.1; z <= z1; z += 2) boxAt(bf, M.chrome, x1 - 0.04, x1 + 0.01, 0.94, 1.27, z - 0.02, z + 0.02);
    blob(bf, (x0 + x1) / 2 + 0.3, (z0 + z1) / 2, 2.2, z1 - z0 + 0.6);
  };
  const wallSign = (title, sub, z, w = 4.8) => panel(G.food, signTex(title, sub, { w: 1280, h: 300, titleSize: 128, subSize: 50 }), w, w * 300 / 1280, [H.x0 + 0.42, 3.05, z], Math.PI / 2, { emissive: true, intensity: 1.05 });
  // PIZZA 16:00
  counter(-21, -13);
  PIZZAS.forEach(([name, kind], i) => {
    const z = -20.6 + i * 0.8, x = -23.15;
    cyl(bf, M.steel, 0.02, 0.12, x, 1.0, z, 8); cyl(bf, M.steel, 0.27, 0.015, x, 1.06, z, 24);
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.03, 32), [std('#d39a52'), new THREE.MeshStandardMaterial({ map: pizzaTex(kind), roughness: 0.6 }), std('#d39a52')]);
    p.position.set(x, 1.09, z); G.food.add(p);
    void name;
  });
  wallSign('PIZZAS · 16H', 'self-service · 8 salgadas + 2 doces', -17);
  anchors.pizza = new THREE.Vector3(-23.1, 1.1, -17);
  // SUBWAY ARTESANAL 18:30
  counter(-11, 1.5);
  const breadCols = ['#d9a25a', '#e3b15e', '#cf9a52', '#8a5a33'];
  for (let i = 0; i < 4; i++) {
    const z = -10.6 + i * 0.75; boxAt(bf, std('#6b4a2c', { roughness: 0.8 }), -23.45, -22.85, 0.94, 1.04, z - 0.3, z + 0.3);
    for (let k = 0; k < 4; k++) bf.add(new THREE.CapsuleGeometry(0.045, 0.16, 4, 8), std(breadCols[i], { roughness: 0.7 }), [-23.3 + k * 0.1, 1.08, z], [Math.PI / 2, 0, 0]);
  }
  const pan = (z, col, n = 1, w = 0.5) => { boxAt(bf, M.steel, -23.45, -22.85, 0.94, 1.02, z - w / 2, z + w / 2); for (let k = 0; k < n; k++) boxAt(bf, std(col, { roughness: 0.75 }), -23.4, -22.9, 1.0, 1.03, z - w / 2 + 0.03 + k * (w - 0.06) / n, z - w / 2 + (k + 1) * (w - 0.06) / n + 0.02); };
  ['#7a4a2c', '#d8b48a', '#c99a6b', '#6b3b26', '#d9a45c'].forEach((c, i) => pan(-7.4 + i * 0.6, c));                 // proteínas
  ['#f6e7a8', '#f2c94c', '#efe0b0', '#f7f1d6'].forEach((c, i) => pan(-4.2 + i * 0.5, c, 1, 0.42));                   // queijos
  ['#ffffff', '#f6a623', '#b5302a', '#c0392b', '#e8a0a0', '#7a2d1c', '#d4a373', '#e2c08d'].forEach((c, i) => { const z = -2.0 + i * 0.3; cyl(bf, M.white, 0.12, 0.08, -23.15, 0.98, z, 16); cyl(bf, std(c), 0.1, 0.02, -23.15, 1.02, z, 16); }); // adicionais
  ['#5fbf3a', '#e0342a', '#7b2d6b', '#3aa62f', '#9fd36a', '#6b8f2a'].forEach((c, i) => { const z = 0.45 + i * 0.17; cyl(bf, M.white, 0.08, 0.09, -23.3 + (i % 2) * 0.3, 0.99, z, 14); cyl(bf, std(c), 0.07, 0.02, -23.3 + (i % 2) * 0.3, 1.04, z, 14); }); // saladas
  // molhos (bisnagas) na parede de trás
  const sauceCols = ['#fff3c4', '#fffbe8', '#5a2410', '#f2c94c', '#f4f1e6', '#efe6c8', '#d8a020', '#d62c1a'];
  sauceCols.forEach((c, i) => { cyl(bf, std(c, { roughness: 0.4 }), 0.045, 0.24, -23.6, 1.06, -10.9 + i * 0.13, 12); cyl(bf, M.white, 0.02, 0.05, -23.6, 1.2, -10.9 + i * 0.13, 8); });
  // fornos alugados (3) atrás do balcão do Subway
  const ovenGlow = glow('#ff8a2a', 1.8);
  for (let i = 0; i < 3; i++) {
    const z = -6.5 + i * 2.6;
    boxAt(bf, M.steel, H.x0 + 0.1, H.x0 + 0.8, 0, 0.8, z - 0.55, z + 0.55);
    bf.add(roundBox(0.7, 0.62, 1.05, 0.04), M.steel, [H.x0 + 0.45, 1.12, z]);
    boxAt(bf, ovenGlow, H.x0 + 0.79, H.x0 + 0.81, 0.95, 1.3, z - 0.38, z + 0.3);
    for (let k = 0; k < 3; k++) cyl(bf, M.black, 0.03, 0.02, H.x0 + 0.81, 1.36 - k * 0.12, z + 0.42, 10, [0, 0, Math.PI / 2]);
  }
  boxAt(bf, M.steel, H.x0 + 0.05, H.x0 + 0.9, 0, 0.82, -8.0, -7.4);
  wallSign('SUBWAY ARTESANAL · 18H30', 'pães de 15 cm · monte o seu', -4.5, 6.0);
  anchors.subway = new THREE.Vector3(-23.1, 1.1, -4.5); anchors.ovens = new THREE.Vector3(H.x0 + 0.5, 1.3, -3.9);
  // batata rústica, cookies, refrigerantes
  boxAt(bf, M.steel, -23.45, -22.85, 0.94, 1.0, 1.6, 2.4); for (let k = 0; k < 40; k++) bf.add(unitBox(), std('#e3a94b', { roughness: 0.7 }), [-23.15 + Math.sin(k * 7) * 0.22, 1.03, 2.0 + Math.cos(k * 3) * 0.32], [k, k * 2, 0], [0.12, 0.03, 0.04]);
  // SOBREMESAS 20:30
  counter(3, 9.5, -23.7, -22.3);
  // waffles
  for (let i = 0; i < 2; i++) { const z = 3.5 + i * 0.7; bf.add(roundBox(0.4, 0.14, 0.4, 0.03), M.black, [-23.2, 1.01, z]); }
  const waffleTex = canvasTex(128, 128, (g, w) => { g.fillStyle = '#d99a45'; g.fillRect(0, 0, w, w); g.fillStyle = '#b77629'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) g.fillRect(8 + i * 30, 8 + j * 30, 22, 22); });
  for (let k = 0; k < 6; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.2), new THREE.MeshStandardMaterial({ map: waffleTex, roughness: 0.6 })); m.position.set(-22.75, 0.96 + k * 0.026, 4.0); m.rotation.y = k * 0.3; G.food.add(m); }
  cyl(bf, std('#4b2412', { roughness: 0.2 }), 0.07, 0.12, -22.62, 1.0, 4.45, 12); cyl(bf, std('#d81e3c', { roughness: 0.3 }), 0.07, 0.12, -22.62, 1.0, 4.65, 12);
  // churros americanos em copos
  for (let i = 0; i < 8; i++) { const z = 5.2 + i * 0.16; cyl(bf, std(RAINBOW[i % 9], { roughness: 0.5 }), 0.05, 0.12, -23.2, 1.0, z, 10); for (let k = 0; k < 3; k++) cyl(bf, std('#c27a33', { roughness: 0.75 }), 0.018, 0.3, -23.2 + (k - 1) * 0.025, 1.17, z, 6, [0, 0, (k - 1) * 0.15]); }
  // doces brasileiros (brigadeiro, beijinho, cajuzinho...) em bandejas
  const sweets = ['#3b1d10', '#fbf6ea', '#c98a4b', '#e8c27a', '#f2b8c6', '#8b4a22'];
  for (let tIdx = 0; tIdx < 6; tIdx++) {
    const z = 6.6 + (tIdx % 3) * 0.95, x = -23.25 + Math.floor(tIdx / 3) * 0.55;
    boxAt(bf, M.silver, x - 0.22, x + 0.22, 0.94, 0.96, z - 0.4, z + 0.4);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 8; j++) bf.add(unitSphere(8), std(sweets[tIdx], { roughness: 0.7 }), [x - 0.15 + i * 0.1, 0.995, z - 0.35 + j * 0.1], [0, 0, 0], [0.065, 0.06, 0.065]);
  }
  cyl(bf, std('#e9b64c', { roughness: 0.3 }), 0.17, 0.12, -22.7, 1.0, 9.1, 24); cyl(bf, std('#8a3d12', { roughness: 0.2 }), 0.172, 0.02, -22.7, 1.07, 9.1, 24);  // pudim
  wallSign('SOBREMESAS · 20H30', 'waffles e churros americanos + doces brasileiros', 6.2, 5.0);
  anchors.dessert = new THREE.Vector3(-23.0, 1.1, 6.2);
  // bar de refrigerantes (lata ou copo com refil)
  boxAt(bf, counterFront, 15.6, 16.8, 0, 1.0, -15, -7); boxAt(bf, counterTop, 15.55, 16.85, 1.0, 1.06, -15, -7);
  const fs = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.08), new THREE.MeshBasicMaterial({ map: rainbowTex(), color: new THREE.Color(1.6, 1.6, 1.6), toneMapped: false })); fs.position.set(15.59, 0.9, -11); fs.rotation.y = -Math.PI / 2; G.food.add(fs);
  for (let i = 0; i < 3; i++) { const z = -14 + i * 1.3; bf.add(roundBox(0.6, 0.8, 0.9, 0.05), M.steel, [16.3, 1.46, z]); boxAt(bf, std('#222'), 15.98, 16.0, 1.25, 1.75, z - 0.35, z + 0.35); for (let k = 0; k < 4; k++) cyl(bf, std(['#d61f2c', '#1a1a1a', '#2c8f3a', '#f2a51c'][k]), 0.03, 0.05, 15.96, 1.6, z - 0.27 + k * 0.18, 8, [0, 0, Math.PI / 2]); }
  // geladeira de latas
  bf.add(roundBox(1.1, 2.0, 0.8, 0.04), std('#e8eaee', { roughness: 0.3 }), [16.9, 1.0, -9]); boxAt(bf, std('#9fd4ff', { metalness: 0.2, roughness: 0.05 }), 16.32, 16.34, 0.3, 1.85, -9.35, -8.65);
  for (let r2 = 0; r2 < 5; r2++) for (let k = 0; k < 5; k++) cyl(bf, std(['#d61f2c', '#c0c4cc', '#2c8f3a', '#f2a51c', '#7a2bd6'][(r2 + k) % 5], { metalness: 0.7, roughness: 0.3 }), 0.033, 0.12, 16.45, 0.45 + r2 * 0.3, -9.25 + k * 0.12, 10);
  panel(G.food, signTex('REFRIGERANTES', 'lata ou copo com refil', { w: 1024, h: 256, titleSize: 112 }), 3.6, 0.9, [H.x1 - 0.5, 3.0, -11], -Math.PI / 2, { emissive: true });
  anchors.drinks = new THREE.Vector3(16.2, 1.5, -11);

  b.flush(); bs.flush(); bt.flush(); bf.flush();
  return { groups: G, anim, anchors, drawCenter };
}
