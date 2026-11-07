// Salão secundário: Museu Vanguarda — fitas e câmeras antigas, cone de 1998, inauguração de 2003
// (réplica do estúdio do telejornal das 12h), o futuro (computador, IA, TV do futuro) e os equipamentos atuais.
import * as THREE from 'three';
import { Batch, M, std, glow, box, boxAt, cyl, blob, panel, roundBox, signTex } from './kit.js';
import { L } from './layout.js';
import { canvasTex, woodTex } from '../lib/textures.js';
import { RAINBOW, rng, beatPulse } from '../lib/util.js';
import { TAPES, makeTape, crt, vtrDeck, camcorderOld, studioCamOld, studioCamModern, ptzCam, drone, barsTex } from './props.js';
import { cone1998, ring2003, vanguardaLetters } from './logos.js';

export function buildMuseum(A) {
  const G = { museum: new THREE.Group(), tapes: new THREE.Group(), cone: new THREE.Group(), y2003: new THREE.Group(), future: new THREE.Group(), now: new THREE.Group(), walls: new THREE.Group() };
  const b = new Batch(G.museum), bw = new Batch(G.walls), bt = new Batch(G.tapes), b3 = new Batch(G.y2003), bfu = new Batch(G.future), bn = new Batch(G.now), bc = new Batch(G.cone);
  const anim = [], anchors = {};
  const MU = L.museum;

  // piso escuro polido + trilhos de luz
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(MU.x1 - MU.x0, MU.z1 - MU.z0), std('#26282d', { roughness: 0.22, metalness: 0.15 }));
  fl.rotation.x = -Math.PI / 2; fl.position.set((MU.x0 + MU.x1) / 2, 0.004, (MU.z0 + MU.z1) / 2); G.museum.add(fl);
  for (let x = 21; x <= 42; x += 7) boxAt(b, M.truss, x - 0.06, x + 0.06, 6.0, 6.1, MU.z0, MU.z1);
  // paredes expositivas (3,6 m) com friso arco-íris
  const pw = std('#1d1f25', { roughness: 0.8 });
  const rbFrieze = (x0, x1, z0, z1) => { const m = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.02, x1 - x0), 0.08, Math.max(0.02, z1 - z0)), new THREE.MeshBasicMaterial({ map: A.tex.rainbow, toneMapped: false })); m.position.set((x0 + x1) / 2, 3.64, (z0 + z1) / 2); G.walls.add(m); };
  const pWall = (x0, x1, z0, z1) => { boxAt(bw, pw, x0, x1, 0, 3.6, z0, z1); rbFrieze(x0, x1, z0, z1); };
  // revestimento escuro das paredes do museu
  boxAt(bw, pw, MU.x1 - 0.1, MU.x1 - 0.06, 0, L.wallH, MU.z0, MU.z1);
  boxAt(bw, pw, MU.x0 + 0.13, MU.x1, 0, L.wallH, MU.z0 + 0.06, MU.z0 + 0.1);
  boxAt(bw, pw, MU.x0 + 0.13, MU.x0 + 0.17, 0, L.wallH, MU.z0, -6.5); boxAt(bw, pw, MU.x0 + 0.13, MU.x0 + 0.17, 0, L.wallH, -1.5, MU.z1);
  boxAt(bw, pw, MU.x0 + 0.13, MU.x0 + 0.17, 4.0, L.wallH, -6.5, -1.5);
  boxAt(bw, pw, MU.x0, 26, 0, L.wallH, MU.z1 - 0.17, MU.z1 - 0.13); boxAt(bw, pw, 30, MU.x1, 0, L.wallH, MU.z1 - 0.17, MU.z1 - 0.13); boxAt(bw, pw, 26, 30, 3.6, L.wallH, MU.z1 - 0.17, MU.z1 - 0.13);
  pWall(31.05, 31.35, -17, 2);       // W1 (fitas | cone)
  pWall(33, MU.x1, -7.15, -6.85);     // W2 (cone | 2003)
  pWall(20.5, 31.5, -20.65, -20.35);  // W3 (hoje | futuro)
  // placa na entrada do museu (lado do salão)
  panel(G.museum, signTex('MUSEU VANGUARDA', 'do analógico ao futuro →', { w: 1280, h: 300, titleSize: 128, subSize: 52 }), 4.4, 1.03, [L.hall.x1 - 0.14, 4.9, -4.0], -Math.PI / 2, { emissive: true });

  // ================= Q1: FITAS (tamanho real) + CÂMERAS CENOGRÁFICAS ANTIGAS =================
  const placard = (T) => canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#f4f3ef'; g.fillRect(0, 0, w, h); g.fillStyle = T.accent; g.fillRect(0, 0, 14, h);
    g.fillStyle = '#16161a'; g.font = '700 58px AvantGarde'; g.fillText(T.name.toUpperCase(), 40, 86);
    g.font = '500 34px Inter'; g.fillStyle = '#444'; g.fillText(T.sub, 40, 140);
    g.font = '700 46px AvantGarde'; g.fillStyle = T.accent; g.fillText(T.year, 40, 214);
    g.font = '500 26px Inter'; g.fillStyle = '#777'; g.fillText(`${Math.round(T.w * 1000)} × ${Math.round(T.h * 1000)} mm`, 200, 212);
  });
  const tapeMeshes = [];
  TAPES.forEach((T, i) => {
    const x = 19.9 + i * 1.22, z = 1.2;
    boxAt(bt, std('#cfd2d8', { roughness: 0.7 }), x - 0.36, x + 0.36, 0, 1.05, z - 0.36, z + 0.36);
    boxAt(bt, std('#d9d6cf'), x - 0.38, x + 0.38, 1.05, 1.08, z - 0.38, z + 0.38);
    // suporte inclinado + fita (em pé, levemente inclinada para trás) — escala 1,5x para leitura
    const tape = makeTape(T, 1.5); tape.position.set(x, 1.08 + T.h * 0.75 + 0.01, z); tape.rotation.x = -0.2; G.tapes.add(tape); tapeMeshes.push(tape);
    boxAt(bt, std('#cfe6f2', { roughness: 0.1 }), x - 0.12, x + 0.12, 1.08, 1.1, z - 0.06, z + 0.04);
    // redoma de vidro
    const dome = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.7), M.glass); dome.position.set(x, 1.36, z); G.tapes.add(dome);
    panel(G.tapes, placard(T), 0.5, 0.25, [x, 0.8, z + 0.365], 0, { rough: 0.4 });
    blob(bt, x, z, 1.3);
    anchors['tape_' + T.id] = tape;
  });
  // arquivo de fitas (estante cheia)
  const sx0 = 19.0, sx1 = 30.4, sz = 7.45;
  for (let i = 0; i <= 6; i++) boxAt(bt, std('#2c2e33', { roughness: 0.6, metalness: 0.4 }), sx0, sx1, 0.05 + i * 0.48, 0.09 + i * 0.48, sz - 0.4, sz + 0.25);
  for (let x = sx0; x <= sx1 + 0.01; x += 2.85) boxAt(bt, std('#2c2e33', { metalness: 0.4 }), x - 0.04, x + 0.04, 0, 3.0, sz - 0.4, sz + 0.25);
  const spineTex = canvasTex(64, 256, (g, w, h) => { g.fillStyle = '#2a2a2e'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.fillRect(8, 30, w - 16, h - 60); g.fillStyle = '#111'; for (let k = 0; k < 6; k++) g.fillRect(14, 50 + k * 28, w - 28 - (k * 7) % 20, 5); });
  const spines = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.2, 0.22), new THREE.MeshStandardMaterial({ map: spineTex, roughness: 0.55 }), 6 * 300);
  const rr = rng(21), mm = new THREE.Matrix4(), cc = new THREE.Color(); let n = 0;
  const spineCols = ['#ffffff', '#ffd9a0', '#bfe0ff', '#ffc4c4', '#d6ffd0', '#e8d4ff'];
  for (let s = 0; s < 6; s++) { let x = sx0 + 0.1; while (x < sx1 - 0.1 && n < spines.count) { const hh = 0.85 + rr() * 0.4; mm.makeScale(1, hh, 1); mm.setPosition(x, 0.09 + s * 0.48 + 0.1 * hh, sz - 0.12); spines.setMatrixAt(n, mm); spines.setColorAt(n, cc.set(spineCols[Math.floor(rr() * 6)])); n++; x += 0.034 + (rr() < 0.04 ? 0.25 : 0); } }
  spines.count = n; G.tapes.add(spines);
  panel(G.tapes, signTex('ARQUIVO DE FITAS', 'K7 · VHS · Betamax · U-matic · Betacam SP · Hi8 · MiniDV · DVCAM', { w: 1600, h: 260, titleSize: 120, subSize: 46 }), 6.0, 0.98, [24.7, 3.6, sz - 0.42], Math.PI, { emissive: true });
  anchors.archive = new THREE.Vector3(24.7, 1.6, sz - 0.3);
  // câmeras cenográficas antigas + monitores CRT com barras + VT
  const cam1 = camcorderOld(); cam1.position.set(20.6, 0, -2.2); cam1.rotation.y = 0.5; G.tapes.add(cam1); blob(bt, 20.6, -2.2, 1.6);
  const cam2 = studioCamOld(); cam2.position.set(23.4, 0, -2.4); cam2.rotation.y = 0.2; G.tapes.add(cam2); blob(bt, 23.4, -2.4, 1.6);
  anchors.oldCam = new THREE.Vector3(20.6, 1.6, -2.2); anchors.oldStudioCam = new THREE.Vector3(23.4, 1.7, -2.4);
  boxAt(bt, std('#2a2c31', { metalness: 0.4 }), 26.2, 29.6, 0, 0.95, -3.4, -2.5);
  for (let i = 0; i < 3; i++) { const t = crt(0.62); t.position.set(26.8 + i * 1.12, 1.2, -2.55); t.rotation.y = 0.0; G.tapes.add(t); }
  for (let i = 0; i < 2; i++) { const v = vtrDeck(); v.position.set(27.3 + i * 1.6, 1.04, -2.9); G.tapes.add(v); }
  anchors.crt = new THREE.Vector3(27.9, 1.45, -2.5);

  // ================= Q2: CONE 1998 (grande) =================
  const cx = 37.6, cz = -0.2;
  cyl(bc, std('#15161a', { roughness: 0.3, metalness: 0.4 }), 2.7, 0.28, cx, 0.14, cz, 64);
  const ledRing = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.035, 8, 96), new THREE.MeshBasicMaterial({ map: A.tex.rainbow, toneMapped: false })); ledRing.rotation.x = Math.PI / 2; ledRing.position.set(cx, 0.24, cz); G.cone.add(ledRing);
  const tipBall = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), M.chrome); tipBall.position.set(cx, 0.44, cz); G.cone.add(tipBall);
  const cone = cone1998({ R: 1.55, H: 2.7 }); cone.position.set(cx, 0.6 + 1.35, cz); G.cone.add(cone);
  anim.push((t) => { cone.rotation.y = -1.25 + Math.sin(t * 0.45) * 0.9; cone.position.y = 1.95 + Math.sin(t * 1.2) * 0.04; });
  anchors.cone = cone;
  // fundo com "1998" gigante
  const t1998 = canvasTex(1600, 1000, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h * 0.45, 50, w / 2, h / 2, w * 0.7); grd.addColorStop(0, '#1d2140'); grd.addColorStop(1, '#07080c'); g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.font = '700 520px AvantGarde'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const tg = g.createLinearGradient(0, 200, 0, 800); tg.addColorStop(0, 'rgba(230,235,245,0.16)'); tg.addColorStop(1, 'rgba(230,235,245,0.03)'); g.fillStyle = tg; g.fillText('1998', w / 2, h * 0.46);
    g.fillStyle = '#fff'; g.font = '700 74px AvantGarde'; g.fillText('A PRIMEIRA MARCA', w / 2, h * 0.82);
    g.font = '500 40px Inter'; g.globalAlpha = 0.75; g.fillText('o cone prateado com a fenda arco-íris', w / 2, h * 0.9); g.globalAlpha = 1;
  });
  panel(G.cone, t1998, 8.0, 5.0, [MU.x1 - 0.12, 2.9, cz], -Math.PI / 2, { emissive: true, intensity: 1.0 });
  // feixes de luz sobre o cone
  for (const [dx, dz] of [[-1.6, 1.2], [1.4, 1.6], [0, -1.8]]) {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 1.1, 5.4, 20, 1, true), new THREE.MeshBasicMaterial({ map: A.tex.beam, color: '#bcd0ff', transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.set(cx + dx * 0.6, 3.3, cz + dz * 0.6); beam.lookAt(cx, 6.0, cz); beam.rotateX(Math.PI / 2); G.cone.add(beam);
  }
  panel(G.cone, signTex('CONE · 1998', 'primeira logomarca da Vanguarda', { w: 1024, h: 256, titleSize: 108 }), 2.2, 0.55, [cx - 2.0, 0.75, cz + 2.75], 0.35, { emissive: true });
  boxAt(bc, M.chrome, cx - 2.05, cx - 1.95, 0, 0.5, cz + 2.7, cz + 2.8);

  // ================= Q3: 2003 — INAUGURAÇÃO DA REDE VANGUARDA + ESTÚDIO DO TELEJORNAL DAS 12H =================
  // logo 2003 em 3D no pedestal
  const lx = 34.2, lz = -11.4;
  cyl(b3, M.white, 0.85, 1.0, lx, 0.5, lz, 48); cyl(b3, M.chrome, 0.9, 0.04, lx, 1.02, lz, 48);
  const ring = ring2003({ R: 0.85, h: 0.9 }); ring.position.set(lx, 1.6, lz); G.y2003.add(ring);
  anim.push((t) => { ring.rotation.y = Math.sin(t * 0.5) * 0.5 + 0.35; });
  anchors.ring = ring;
  panel(G.y2003, signTex('2003', 'inauguração da Rede Vanguarda', { w: 1024, h: 256, titleSize: 130 }), 1.8, 0.45, [lx, 0.55, lz + 0.87], 0, { emissive: true });
  // réplica do estúdio
  const st = { x0: 33.2, x1: 43.6, zb: -19.5 };
  boxAt(b3, std('#7f8794', { roughness: 0.6 }), st.x0, st.x1, 0, 0.12, st.zb, -11.5);           // piso do estúdio
  const gridTex = canvasTex(2048, 820, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, 0); grd.addColorStop(0, '#1b2378'); grd.addColorStop(0.5, '#3a48b4'); grd.addColorStop(1, '#1b2378'); g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.08)'; for (let y = 0; y < h; y += 10) g.fillRect(0, y, w, 4);
    g.fillStyle = '#0b0f30'; const cols = 8, rows = 3; for (let i = 0; i <= cols; i++) g.fillRect(i * w / cols - 10, 0, 20, h); for (let j = 0; j <= rows; j++) g.fillRect(0, j * h / rows - 10, w, 20);
    const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(0,0,0,0.35)'); v.addColorStop(0.5, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.4)'); g.fillStyle = v; g.fillRect(0, 0, w, h);
  });
  const back = new THREE.Mesh(new THREE.BoxGeometry(st.x1 - st.x0, 4.2, 0.2), [pw, pw, pw, pw, new THREE.MeshStandardMaterial({ map: gridTex, roughness: 0.5, emissive: '#ffffff', emissiveMap: gridTex, emissiveIntensity: 0.35 }), pw]);
  back.position.set((st.x0 + st.x1) / 2, 2.22, st.zb); G.y2003.add(back);
  const letters = vanguardaLetters({ size: 0.82, depth: 0.22, tv: true, mat: new THREE.MeshStandardMaterial({ color: '#e3e8f0', metalness: 1, roughness: 0.36 }) }); letters.position.set(38.4, 2.65, st.zb + 0.3); G.y2003.add(letters);
  // bancada: tampo de madeira + frente prateada com venezianas
  const deskShape = new THREE.Shape();
  deskShape.moveTo(-2.0, 0); deskShape.lineTo(0.7, 0); deskShape.quadraticCurveTo(1.25, 0.0, 1.7, -0.45); deskShape.lineTo(2.25, -1.05);
  deskShape.quadraticCurveTo(2.35, -1.25, 2.1, -1.3); deskShape.lineTo(0.6, -0.75); deskShape.lineTo(-2.0, -0.75); deskShape.quadraticCurveTo(-2.2, -0.75, -2.2, -0.55); deskShape.lineTo(-2.2, -0.2); deskShape.quadraticCurveTo(-2.2, 0, -2.0, 0);
  const topGeo = new THREE.ExtrudeGeometry(deskShape, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.03, bevelSegments: 3 });
  topGeo.rotateX(Math.PI / 2);
  const wood = new THREE.MeshStandardMaterial({ map: woodTex([1, 1], [205, 170, 118]), roughness: 0.35 });
  const deskTop = new THREE.Mesh(topGeo, wood); deskTop.position.set(37.4, 0.98, -15.0); G.y2003.add(deskTop);
  const louver = canvasTex(256, 256, (g, w, h) => { for (let y = 0; y < h; y += 16) { const gr = g.createLinearGradient(0, y, 0, y + 16); gr.addColorStop(0, '#f2f4f8'); gr.addColorStop(0.6, '#9aa1ab'); gr.addColorStop(1, '#5d636c'); g.fillStyle = gr; g.fillRect(0, y, w, 16); } }, { repeat: [3, 3] });
  const louvM = new THREE.MeshStandardMaterial({ map: louver, metalness: 0.7, roughness: 0.3 });
  const front = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.78, 0.05), louvM); front.position.set(37.4 - 0.65, 0.53, -15.05); G.y2003.add(front);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.78, 0.05), louvM); wing.position.set(37.4 + 1.42, 0.53, -15.45); wing.rotation.y = 0.78; G.y2003.add(wing);
  for (const x of [35.4, 37.9]) cyl(b3, M.chrome, 0.05, 0.86, x, 0.55, -15.45, 12);
  for (const x of [36.4, 38.3]) { const ch = new THREE.Mesh(roundBox(0.55, 0.9, 0.5, 0.08), std('#151518', { roughness: 0.5 })); ch.position.set(x, 0.75, -16.3); G.y2003.add(ch); }
  const papers = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.01, 0.3), M.white); papers.position.set(36.4, 1.06, -15.4); G.y2003.add(papers);
  const papers2 = papers.clone(); papers2.position.x = 38.2; G.y2003.add(papers2);
  const mon = crt(0.7, A.tex.logo2003); mon.position.set(34.4, 1.55, -15.6); mon.rotation.y = 0.55; G.y2003.add(mon);
  cyl(b3, M.chrome, 0.04, 1.2, 34.4, 0.7, -15.85, 10);
  // grid de luz de estúdio (fresnéis) e câmeras antigas apontadas para a bancada
  boxAt(b3, M.truss, st.x0, st.x1, 5.2, 5.3, -14.6, -14.4);
  for (let i = 0; i < 6; i++) { const x = 34 + i * 1.8; const f = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.36, 14), M.black); f.position.set(x, 4.8, -14.5); f.rotation.x = -0.9; G.y2003.add(f); const lg = new THREE.Mesh(new THREE.CircleGeometry(0.14, 14), glow('#fff2d0', 1.25)); lg.position.set(x, 4.66, -14.3); lg.rotation.x = 0.67; G.y2003.add(lg); }
  for (const [x, ry] of [[36.2, -0.25], [40.8, 0.3]]) { const c = studioCamOld(); c.position.set(x, 0, -10.6); c.rotation.y = Math.PI + ry; G.y2003.add(c); }
  panel(G.y2003, signTex('ESTÚDIO VANGUARDA TV · 12H', 'réplica do cenário de 2003 · sente na bancada!', { w: 1400, h: 260, titleSize: 108, subSize: 46 }), 4.6, 0.85, [38.4, 4.75, st.zb + 0.15], 0, { emissive: true });
  anchors.studio = new THREE.Vector3(37.4, 1.3, -15.2); anchors.letters = letters;

  // ================= Q4: O FUTURO — computador cenográfico, Inteligência Artificial, TV do futuro =================
  // fundo luminoso
  const futTex = canvasTex(2048, 512, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#05060c'); grd.addColorStop(1, '#11143a'); g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(80,140,255,0.25)'; g.lineWidth = 2; for (let x = 0; x < w; x += 64) { g.beginPath(); g.moveTo(x, h); g.lineTo(w / 2 + (x - w / 2) * 0.2, 0); g.stroke(); } for (let y = 0; y < h; y += 40) { g.beginPath(); g.moveTo(0, h - y * 1.2); g.lineTo(w, h - y * 1.2); g.stroke(); }
    g.font = '700 200px AvantGarde'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillText('FUTURO', w / 2, 300);
  });
  panel(G.future, futTex, 25, 6.2, [31, 3.2, MU.z0 + 0.1], 0, { emissive: true, intensity: 0.9 });
  // computador moderno cenográfico (3 telas curvas)
  const pcx = 22.8, pcz = -27.4;
  boxAt(bfu, std('#f2f3f5', { roughness: 0.3 }), pcx - 1.6, pcx + 1.6, 0.74, 0.79, pcz - 0.45, pcz + 0.45);
  for (const dx of [-1.4, 1.4]) boxAt(bfu, std('#d9dce1', { roughness: 0.3 }), pcx + dx - 0.05, pcx + dx + 0.05, 0, 0.74, pcz - 0.4, pcz + 0.4);
  const uiTex = (kind) => canvasTex(800, 360, (g, w, h) => {
    g.fillStyle = '#070a14'; g.fillRect(0, 0, w, h);
    const rb = g.createLinearGradient(0, 0, w, 0); RAINBOW.forEach((c, i) => rb.addColorStop(i / 8, c)); g.fillStyle = rb; g.fillRect(0, 0, w, 8);
    if (kind === 0) { g.font = '500 20px JetBrains Mono'; const lines = ['// festa.daniel(20)', 'const tema = "Vanguarda";', 'acervo.carregar(["VHS","U-matic",', '  "Betacam SP","MiniDV"]);', 'ia.gerarVinheta(2029);', 'render(telões[3]);  ✓']; lines.forEach((l, i) => { g.fillStyle = ['#7aa2ff', '#ffd27a', '#9ae6a0', '#9ae6a0', '#ff9ad2', '#7af0ff'][i]; g.fillText(l, 30, 60 + i * 44); }); }
    if (kind === 1) { g.fillStyle = '#fff'; g.font = '700 40px AvantGarde'; g.fillText('IA VANGUARDA', 30, 70); g.font = '500 24px Inter'; g.fillStyle = '#c9d2ff'; ['Olá! Eu organizei o acervo', 'de 15 documentários especiais', 'e restaurei as vinhetas em 4K.'].forEach((l, i) => g.fillText(l, 30, 130 + i * 38)); g.fillStyle = 'rgba(122,162,255,0.25)'; g.beginPath(); g.roundRect(24, 100, w - 200, 130, 16); g.fill(); }
    if (kind === 2) { for (let i = 0; i < 64; i++) { const v = Math.abs(Math.sin(i * 0.37) * Math.cos(i * 0.11)) * 220 + 20; g.fillStyle = RAINBOW[i % 9]; g.fillRect(30 + i * 11.5, h - 40 - v, 8, v); } }
  });
  [-1, 0, 1].forEach((k) => {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.45), new THREE.MeshBasicMaterial({ map: uiTex(k + 1), toneMapped: false })); s.position.set(pcx + k * 1.02, 1.3, pcz - 0.15 + Math.abs(k) * 0.18); s.rotation.y = -k * 0.42; G.future.add(s);
    const f = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.49, 0.03), M.black); f.position.copy(s.position); f.rotation.copy(s.rotation); f.translateZ(-0.02); G.future.add(f);
  });
  cyl(bfu, M.chrome, 0.03, 0.3, pcx, 0.94, pcz - 0.2, 10);
  boxAt(bfu, std('#e9ebee'), pcx - 0.35, pcx + 0.35, 0.79, 0.81, pcz + 0.05, pcz + 0.25);
  const chair = new THREE.Mesh(roundBox(0.6, 1.1, 0.55, 0.12), std('#e6e8ec', { roughness: 0.4 })); chair.position.set(pcx, 0.75, pcz + 0.95); G.future.add(chair);
  anchors.computer = new THREE.Vector3(pcx, 1.3, pcz - 0.1);
  // Inteligência Artificial: holograma de partículas sobre base com anéis
  const ax = 31, az = -26.6;
  cyl(bfu, std('#0e1016', { roughness: 0.2, metalness: 0.5 }), 1.3, 0.5, ax, 0.25, az, 48);
  const rings = [];
  for (let i = 0; i < 3; i++) { const rg = new THREE.Mesh(new THREE.TorusGeometry(0.9 + i * 0.25, 0.015, 6, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(RAINBOW[[5, 6, 7][i]]).multiplyScalar(2), toneMapped: false })); rg.position.set(ax, 0.52, az); rg.rotation.x = Math.PI / 2; G.future.add(rg); rings.push(rg); }
  const NP = 2600, pp = new Float32Array(NP * 3), pc = new Float32Array(NP * 3); const r2 = rng(5);
  for (let i = 0; i < NP; i++) {
    const u = r2() * 2 - 1, th = r2() * Math.PI * 2, rad = 1.0 + (r2() < 0.3 ? (r2() - 0.5) * 0.25 : 0);
    const sq = Math.sqrt(1 - u * u); pp.set([sq * Math.cos(th) * rad, u * rad * 0.92, sq * Math.sin(th) * rad], i * 3);
    const c = new THREE.Color(RAINBOW[Math.floor((u * 0.5 + 0.5) * 8.99)]); pc.set([c.r, c.g, c.b], i * 3);
  }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); pg.setAttribute('color', new THREE.BufferAttribute(pc, 3));
  const holo = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.045, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, map: A.tex.glow, toneMapped: false }));
  holo.position.set(ax, 2.2, az); G.future.add(holo);
  const wire = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color('#7af0ff').multiplyScalar(1.6), wireframe: true, transparent: true, opacity: 0.55, toneMapped: false }));
  wire.position.copy(holo.position); G.future.add(wire);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16), glow('#ffffff', 2.2)); core.position.copy(holo.position); G.future.add(core);
  const holoBeam = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.25, 2.6, 32, 1, true), new THREE.MeshBasicMaterial({ map: A.tex.beamUp, color: '#5fb8ff', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  holoBeam.position.set(ax, 1.8, az); G.future.add(holoBeam);
  anim.push((t) => { holo.rotation.y = t * 0.4; wire.rotation.set(t * 0.3, t * 0.5, 0); const p = 1 + 0.08 * beatPulse(t, 5); holo.scale.setScalar(p); core.scale.setScalar(0.9 + 0.3 * beatPulse(t, 4)); rings.forEach((r, i) => { r.position.y = 0.52 + ((t * 0.5 + i / 3) % 1) * 2.8; r.material.opacity = 1; }); });
  anchors.ai = holo;
  // TV do futuro: tela transparente e sem bordas, flutuando
  const tvx = 38.8, tvz = -27.6;
  const tvCanvas = canvasTex(1280, 720, () => {}, { mips: false });
  const drawTV = (t) => {
    const g = tvCanvas.userData.ctx, w = 1280, h = 720; g.clearRect(0, 0, w, h);
    const grd = g.createLinearGradient(0, 0, w, h); grd.addColorStop(0, 'rgba(10,20,60,0.55)'); grd.addColorStop(1, 'rgba(60,10,70,0.55)'); g.fillStyle = grd; g.fillRect(0, 0, w, h);
    const img = A.img.vPlano, s = 0.42 + Math.sin(t) * 0.02; g.drawImage(img, w / 2 - img.width * s / 2, h * 0.42 - img.height * s / 2, img.width * s, img.height * s);
    g.fillStyle = '#fff'; g.font = '700 92px AvantGarde'; g.textAlign = 'center'; g.fillText('2029', w / 2, h * 0.86);
    const x = (t * 300) % (w + 400) - 200; const sh = g.createLinearGradient(x - 120, 0, x + 120, 0); sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,255,0.18)'); sh.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(0, 0, w, h);
    tvCanvas.needsUpdate = true;
  };
  drawTV(0);
  const tv = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.36), new THREE.MeshBasicMaterial({ map: tvCanvas, transparent: true, toneMapped: false, side: THREE.DoubleSide, depthWrite: false }));
  tv.position.set(tvx, 2.4, tvz); G.future.add(tv);
  const tvEdge = new THREE.Mesh(new THREE.BoxGeometry(4.22, 2.38, 0.01), new THREE.MeshStandardMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.12, metalness: 1, roughness: 0.05, depthWrite: false })); tvEdge.position.set(tvx, 2.4, tvz - 0.01); G.future.add(tvEdge);
  boxAt(bfu, std('#0e0f12', { roughness: 0.2, metalness: 0.4 }), tvx - 1.2, tvx + 1.2, 0, 0.35, tvz - 0.35, tvz + 0.35);
  const tvGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.7), new THREE.MeshBasicMaterial({ map: A.tex.rainbow, toneMapped: false, transparent: true, opacity: 0.9 })); tvGlow.rotation.x = -Math.PI / 2; tvGlow.position.set(tvx, 0.36, tvz); G.future.add(tvGlow);
  anim.push((t) => { tv.position.y = 2.4 + Math.sin(t * 1.1) * 0.05; tvEdge.position.y = tv.position.y; });
  G.future.userData.drawTV = drawTV;
  anchors.futureTV = tv;

  // ================= Q5: ATUALMENTE — equipamentos de hoje (cenográficos) =================
  const ledWallTex = canvasTex(1600, 900, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, h); grd.addColorStop(0, '#0a0c16'); grd.addColorStop(1, '#151a33'); g.fillStyle = grd; g.fillRect(0, 0, w, h);
    const img = A.img.vPlano, s = 0.95; g.drawImage(img, w / 2 - img.width * s / 2, h * 0.43 - img.height * s / 2, img.width * s, img.height * s);
    g.fillStyle = '#fff'; g.font = '700 84px AvantGarde'; g.textAlign = 'center'; g.fillText('VANGUARDA HOJE', w / 2, h * 0.9);
    g.fillStyle = 'rgba(0,0,0,0.25)'; for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 2, h); for (let y = 0; y < h; y += 8) g.fillRect(0, y, w, 2);
  });
  panel(G.now, ledWallTex, 7.2, 4.05, [25.9, 2.35, -20.3], 0, { emissive: true, intensity: 1.0 });
  boxAt(bn, M.black, 22.2, 29.6, 0.2, 4.45, -20.48, -20.36);
  const mcam = studioCamModern(); mcam.position.set(25.0, 0, -13.2); mcam.rotation.y = Math.PI; G.now.add(mcam); blob(bn, 25.0, -13.2, 1.8);
  anchors.modernCam = new THREE.Vector3(25.0, 1.6, -13.4);
  for (const [x, z] of [[21.2, -17.6], [29.8, -17.6]]) { const p = ptzCam(); p.position.set(x, 0, z); p.rotation.y = Math.PI + (x < 25 ? -0.5 : 0.5); G.now.add(p); }
  anchors.ptz = new THREE.Vector3(21.2, 1.7, -17.6);
  cyl(bn, M.white, 0.45, 1.0, 28.6, 0.5, -11.0, 32); cyl(bn, std('#1a1c22', { roughness: 0.2 }), 0.47, 0.03, 28.6, 1.01, -11.0, 32);
  const dr = drone(); dr.scale.setScalar(2.2); dr.position.set(28.6, 1.75, -11.0); G.now.add(dr);
  anim.push((t) => { dr.position.y = 1.75 + Math.sin(t * 2.0) * 0.12; dr.rotation.y = t * 0.3; dr.userData.props.forEach((p, i) => { p.rotation.y = t * 40 + i; }); });
  anchors.drone = dr;
  // painéis de LED (luz de estúdio) e celular no gimbal
  for (const [x, z, ry] of [[21.6, -10.5, 0.6], [30.2, -14.5, -0.8]]) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; G.now.add(g);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.9, 8), M.steel); pole.position.y = 0.95; g.add(pole);
    const pnl = new THREE.Mesh(roundBox(0.62, 0.36, 0.06, 0.02), M.black); pnl.position.y = 2.0; g.add(pnl);
    const lt = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.3), glow('#fff8ef', 2.4)); lt.position.set(0, 2.0, 0.031); g.add(lt);
  }
  cyl(bn, M.white, 0.3, 1.0, 22.6, 0.5, -13.0, 24);
  const phone = new THREE.Group(); phone.position.set(22.6, 1.0, -13.0); G.now.add(phone);
  const gim = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.26, 12), M.black); gim.position.y = 0.13; phone.add(gim);
  const ph = new THREE.Mesh(roundBox(0.16, 0.08, 0.008, 0.008), M.black); ph.position.set(0, 0.32, 0); phone.add(ph);
  const phs = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.07), new THREE.MeshBasicMaterial({ map: A.tex.rainbow, toneMapped: false })); phs.position.set(0, 0.32, 0.0045); phone.add(phs);
  panel(G.now, signTex('ATUALMENTE', 'câmera 4K · PTZ robótica · drone · celular · LED', { w: 1400, h: 260, titleSize: 120, subSize: 46 }), 4.4, 0.82, [25.9, 4.95, -20.3], 0, { emissive: true });

  b.flush(); bw.flush(); bt.flush(); b3.flush(); bfu.flush(); bn.flush(); bc.flush();
  return { groups: G, anim, anchors, drawTV };
}
