// Área gamer (consoles, PCs gamer, portáteis) e playground das crianças — no salão principal.
import { E, seg, lerp, rng, ruido } from '../core/anim.js';
import { h, camada, ARCO, pino, projetar } from '../core/ui.js';
import { cartaoTitulo } from './local.js';
import { scrim, chipsLinha } from './espacos.js';

function texJogo(kit, tipo) {
  return kit.canvasTex(512, 288, (g, w, hh) => {
    if (tipo === 0) { // corrida
      const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, '#3a1d6e'); gr.addColorStop(0.5, '#f26b2a'); gr.addColorStop(0.5, '#1a1a24'); gr.addColorStop(1, '#2a2a34'); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
      g.fillStyle = '#ffd27a'; g.beginPath(); g.arc(w / 2, hh / 2, 40, Math.PI, 0); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 6; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(w / 2 - 4 - i * 4, hh / 2 + 10 + i * 24); g.lineTo(w / 2 - 6 - i * 5, hh / 2 + 22 + i * 24); g.stroke(); }
      g.strokeStyle = '#27d3ff'; g.lineWidth = 4; g.beginPath(); g.moveTo(w / 2, hh / 2); g.lineTo(40, hh); g.moveTo(w / 2, hh / 2); g.lineTo(w - 40, hh); g.stroke();
      g.fillStyle = '#e5342e'; g.fillRect(w / 2 - 40, hh - 70, 80, 40);
    } else if (tipo === 1) { // plataforma
      g.fillStyle = '#5fb8ff'; g.fillRect(0, 0, w, hh);
      for (let i = 0; i < 9; i++) { g.fillStyle = ARCO[i]; g.fillRect(20 + i * 55, hh - 60 - (i % 3) * 40, 50, 20); }
      g.fillStyle = '#4caf50'; g.fillRect(0, hh - 30, w, 30);
      g.fillStyle = '#ffeb3b'; g.beginPath(); g.arc(120, 110, 14, 0, 7); g.fill(); g.beginPath(); g.arc(300, 80, 14, 0, 7); g.fill();
      g.fillStyle = '#d6247e'; g.fillRect(200, hh - 82, 24, 40);
    } else { // espaço
      g.fillStyle = '#05061c'; g.fillRect(0, 0, w, hh);
      const r = rng(9); for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(255,255,255,${r()})`; g.fillRect(r() * w, r() * hh, 2, 2); }
      g.fillStyle = '#27d3ff'; g.beginPath(); g.moveTo(80, hh / 2); g.lineTo(40, hh / 2 - 22); g.lineTo(40, hh / 2 + 22); g.fill();
      for (let i = 0; i < 5; i++) { g.fillStyle = ARCO[i * 2]; g.beginPath(); g.arc(300 + i * 40, 60 + i * 40, 16, 0, 7); g.fill(); }
      g.fillStyle = '#ffe08a'; g.fillRect(90, hh / 2 - 2, 120, 4);
    }
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.font = '700 26px AG'; g.fillText('SCORE 2029', 16, 32);
  });
}

async function gamer({ THREE, kit, raiz }) {
  const cena = kit.novaCena({ fundo: 0x050508 });
  const cam = kit.camera(44);
  cena.add(new THREE.HemisphereLight(0xb0b6ff, 0x302a3a, 1.7));
  const dlg = new THREE.DirectionalLight(0xffffff, 1.1); dlg.position.set(4, 6, 5); cena.add(dlg);
  const W = 11, D = 8, A = 3.6;
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(W, D), kit.m.fosco(0xffffff, { map: kit.tex.carpete })); piso.rotation.x = -Math.PI / 2; cena.add(piso);
  const parede = kit.m.fosco(0x1d1f2e);
  const pFundo = new THREE.Mesh(new THREE.PlaneGeometry(W, A), parede); pFundo.position.set(0, A / 2, -D / 2); cena.add(pFundo);
  const pEsq = new THREE.Mesh(new THREE.PlaneGeometry(D, A), parede); pEsq.position.set(-W / 2, A / 2, 0); pEsq.rotation.y = Math.PI / 2; cena.add(pEsq);
  // fitas de LED arco-íris
  for (const y of [0.08, A - 0.12]) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(W, 0.06), kit.m.texB(kit.tex.arcoH)); f.position.set(0, y, -D / 2 + 0.01); cena.add(f);
    const f2 = new THREE.Mesh(new THREE.PlaneGeometry(D, 0.06), kit.m.texB(kit.tex.arcoH)); f2.position.set(-W / 2 + 0.01, y, 0); f2.rotation.y = Math.PI / 2; cena.add(f2);
  }
  const placa = kit.tela(kit.texTexto([{ t: 'ÁREA GAMER', tam: 120 }], { w: 1024, h: 256, fundo: '#12142e', arco: true, cor: '#ffffff' }), 3.4, 0.85, 0x0a0a0e, 0.06);
  placa.position.set(0, 3.0, -D / 2 + 0.06); cena.add(placa);
  const jogos = [0, 1, 2].map((i) => { const t = texJogo(kit, i); t.wrapS = THREE.RepeatWrapping; t.needsUpdate = true; return t; });
  // 3 setups de PC gamer na parede esquerda
  for (let i = 0; i < 3; i++) {
    const z = -2.6 + i * 2.2;
    const mesa = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 1.7), kit.m.brilho(0x15151c, 60)); mesa.position.set(-W / 2 + 0.5, 0.75, z); cena.add(mesa);
    for (const dz of [-0.6, 0.6]) { const pe = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.75, 0.05), kit.m.brilho(0x15151c)); pe.position.set(-W / 2 + 0.5, 0.375, z + dz); cena.add(pe); }
    for (const dz of [-0.34, 0.34]) {
      const mon = kit.tela(jogos[(i + (dz > 0 ? 1 : 0)) % 3], 0.62, 0.35, 0x0a0a0e, 0.03);
      mon.position.set(-W / 2 + 0.25, 1.15, z + dz); mon.rotation.y = Math.PI / 2 - Math.sign(dz) * 0.18; cena.add(mon);
    }
    const torre = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 0.22), kit.m.brilho(0x0d0d12, 90)); torre.position.set(-W / 2 + 0.45, 1.03, z - 0.95); cena.add(torre);
    const vidro = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.44), kit.m.luz(ARCO[i * 3 + 1], { transparent: true, opacity: 0.85 })); vidro.position.set(-W / 2 + 0.45, 1.03, z - 0.83); cena.add(vidro);
    const teclado = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.45), kit.m.texB(kit.tex.arcoH)); teclado.position.set(-W / 2 + 0.75, 0.79, z); cena.add(teclado);
    const cad = new THREE.Group();
    const as = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.55), kit.m.brilho(0x111111)); as.position.y = 0.5; cad.add(as);
    const enc = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.85, 0.55), kit.m.brilho(0x111111)); enc.position.set(0.3, 0.95, 0); cad.add(enc);
    const det = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.5, 0.12), kit.m.brilho(ARCO[i * 3 + 1], 40)); det.position.set(0.3, 1.0, 0); cad.add(det);
    cad.position.set(-W / 2 + 1.5, 0, z); cena.add(cad);
  }
  // console + TV grande na parede do fundo
  const tvTex = texJogo(kit, 0);
  const tv = kit.tela(tvTex, 2.6, 1.46, 0x0a0a0e, 0.08); tv.position.set(1.6, 1.6, -D / 2 + 0.1); cena.add(tv);
  const rack = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.5, 0.5), kit.m.brilho(0x15151c, 60)); rack.position.set(1.6, 0.25, -D / 2 + 0.3); cena.add(rack);
  const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.3), kit.m.brilho(0x111111, 100)); c1.position.set(1.0, 0.56, -D / 2 + 0.3); cena.add(c1);
  const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.3), kit.m.brilho(0xf2f2f2, 100)); c2.position.set(2.2, 0.7, -D / 2 + 0.3); cena.add(c2);
  const led2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.02), kit.m.luz(0x27d3ff)); led2.position.set(2.27, 0.7, -D / 2 + 0.46); cena.add(led2);
  // pufes
  for (let i = 0; i < 3; i++) { const pf = new THREE.Mesh(new THREE.SphereGeometry(0.45, 18, 12), kit.m.brilho(ARCO[i * 3 + 2], 20)); pf.scale.y = 0.6; pf.position.set(0.6 + i * 1.0, 0.27, -1.0); cena.add(pf); }
  // controles nos pufes
  for (let i = 0; i < 2; i++) { const ct = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.1), kit.m.brilho(0x222222, 80)); ct.position.set(0.9 + i * 1.0, 0.56, -1.0); cena.add(ct); }
  // estante de portáteis
  const est = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.4), kit.m.brilho(0xffffff, 40)); est.position.set(4.3, 1.2, -D / 2 + 0.2); cena.add(est);
  const est2 = est.clone(); est2.position.y = 1.7; cena.add(est2);
  for (let i = 0; i < 6; i++) {
    const port = new THREE.Group();
    const corpo = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.03), kit.m.brilho([0x1d1d1d, 0xe5342e, 0x3d6ff0][i % 3], 80)); port.add(corpo);
    const tela = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.1), kit.m.texB(jogos[i % 3])); tela.position.z = 0.016; port.add(tela);
    port.position.set(3.75 + (i % 3) * 0.55, 1.33 + Math.floor(i / 3) * 0.5, -D / 2 + 0.25); port.rotation.x = -0.15; cena.add(port);
  }
  [[-2.8, 0x6070ff], [1.6, 0xff60c0], [4.0, 0x40e0ff]].forEach(([x, c]) => { const l = new THREE.PointLight(c, 9, 7); l.position.set(x, 2.6, -1); cena.add(l); });
  [[-3.7, -1.5], [0.2, -2.4]].forEach(([x, z]) => { const p = kit.pessoa(0xf2f2f2, 1.45); p.position.set(x, 0, z); cena.add(p); });
  const L = camada(raiz);
  const sc = scrim(L);
  const card = cartaoTitulo(L, { k: 'NO SALÃO PRINCIPAL', t: 'ÁREA GAMER', sub: 'Consoles na TV grande, <b>PCs gamer</b> com RGB<br>e uma estante de <b>videogames portáteis</b>.', y: 220, cls: 'tit-m', largura: 900 });
  const pins = [['PCs gamer', '', [-W / 2 + 0.4, 1.5, -0.4], '#d6247e', 80], ['Consoles + TV', '', [1.6, 2.4, -D / 2], '#27d3ff', 50], ['Portáteis', '', [4.3, 2.0, -D / 2 + 0.2], '#f2d33a', 60]].map(([t, s, p, c, a]) => ({ pin: pino(L, t, s, c), v: new THREE.Vector3(...p), a }));
  return {
    cena, cam,
    upd(lt, S) {
      const p = E.inOutSine(seg(lt, 0, S.dur));
      cam.position.set(lerp(4.4, 3.0, p), lerp(2.4, 2.0, p), lerp(3.6, 2.8, p));
      cam.lookAt(lerp(-1.0, -2.0, p), 1.2, -2.4);
      cam.setViewOffset(1920, 1080, -220, 0, 1920, 1080);
      jogos.forEach((t, i) => { t.offset.x = (lt * (0.05 + i * 0.03)) % 1; });
      card.upd(lt, 0.3);
      pins.forEach((o, i) => o.pin.upd(lt, 1.4 + i * 0.6, projetar(THREE, o.v, cam), o.a));
    },
  };
}

async function playground({ THREE, kit, raiz }) {
  const cena = kit.novaCena({ fundo: 0x0b0b12 });
  const cam = kit.camera(42);
  cena.add(new THREE.HemisphereLight(0xffffff, 0x404050, 1.4));
  const dl = new THREE.DirectionalLight(0xffffff, 1.4); dl.position.set(4, 8, 6); cena.add(dl);
  // tatame em quadrados coloridos
  const tatame = kit.canvasTex(512, 512, (g, w, hh) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = ARCO[(i + j * 3) % 10]; g.fillRect(i * 64 + 1, j * 64 + 1, 62, 62); } });
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), kit.m.brilho(0xffffff, 10, { map: tatame })); piso.rotation.x = -Math.PI / 2; cena.add(piso);
  const fundo = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.5), kit.m.fosco(0x4a4d6a)); fundo.position.set(0, 1.75, -4.5); cena.add(fundo);
  const placa = kit.tela(kit.texTexto([{ t: 'PLAYGROUND', tam: 120 }], { w: 1024, h: 256, fundo: '#f26b2a', arco: true }), 3.2, 0.8, 0xffffff, 0.06);
  placa.position.set(0, 2.7, -4.44); cena.add(placa);
  // piscina de bolinhas (instanciada)
  const borda = kit.m.brilho(0x3d6ff0, 40);
  [[3.2, 0.6, 0.25, 0, 0.3, -1.6], [3.2, 0.6, 0.25, 0, 0.3, 1.6], [0.25, 0.6, 3.2, -1.6, 0.3, 0], [0.25, 0.6, 3.2, 1.6, 0.3, 0]].forEach(([w, hh, d, x, y, z]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), borda); b.position.set(x - 1.6, y, z - 0.6); cena.add(b); });
  const n = 700, r = rng(22);
  const bolas = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshPhongMaterial({ shininess: 90 }), n);
  const m4 = new THREE.Matrix4(), cor = new THREE.Color();
  for (let i = 0; i < n; i++) { m4.makeTranslation(-1.6 + (r() - 0.5) * 2.9, 0.08 + r() * 0.42, -0.6 + (r() - 0.5) * 2.9); bolas.setMatrixAt(i, m4); bolas.setColorAt(i, cor.set(ARCO[Math.floor(r() * 10)])); }
  cena.add(bolas);
  // escorregador
  const torre = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.4, 1.0), kit.m.brilho(0xf2d33a, 40)); torre.position.set(2.4, 0.7, -2.6); cena.add(torre);
  const rampa = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 2.6), kit.m.brilho(0xe5342e, 70)); rampa.position.set(2.4, 0.72, -0.9); rampa.rotation.x = 0.52; cena.add(rampa);
  for (const x of [2.0, 2.8]) { const g = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.25, 2.6), kit.m.brilho(0xe5342e, 70)); g.position.set(x, 0.84, -0.9); g.rotation.x = 0.52; cena.add(g); }
  // túnel e blocos de espuma
  const tunel = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.12, 10, 24, Math.PI), kit.m.brilho(0x2fc27a, 40)); tunel.scale.z = 6; tunel.position.set(-2.9, 0, 2.2); cena.add(tunel);
  const formas = [new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.CylinderGeometry(0.25, 0.25, 0.5, 18), new THREE.ConeGeometry(0.3, 0.5, 4)];
  for (let i = 0; i < 14; i++) { const b = new THREE.Mesh(formas[i % 3], kit.m.brilho(ARCO[(i * 3) % 10], 30)); b.position.set(0.6 + (i % 5) * 0.62, 0.25 + (i > 9 ? 0.5 : 0), 1.4 + Math.floor(i / 5) * 0.62 - (i > 9 ? 1.2 : 0)); b.rotation.y = i; cena.add(b); }
  [[-0.2, 1.2], [1.4, 0.4], [-2.4, 0.2]].forEach(([x, z], i) => { const p = kit.pessoa(0xffffff, 1.05 + i * 0.1); p.position.set(x, 0, z); cena.add(p); });
  const L = camada(raiz);
  const sc = scrim(L);
  const card = cartaoTitulo(L, { k: 'PARA AS CRIANÇAS', t: 'PLAYGROUND', sub: 'Espaço kids colorido para as<br><b>crianças convidadas</b> brincarem com segurança.', y: 220, cls: 'tit-m', largura: 900 });
  const pins = [['Piscina de bolinhas', '', [-1.6, 0.7, -0.6], '#3d6ff0', 70], ['Escorregador', '', [2.4, 1.5, -2.6], '#e5342e', 60], ['Blocos de espuma', '', [1.6, 0.6, 1.6], '#2fc27a', 60]].map(([t, s, p, c, a]) => ({ pin: pino(L, t, s, c), v: new THREE.Vector3(...p), a }));
  return {
    cena, cam,
    upd(lt, S) {
      const p = E.inOutSine(seg(lt, 0, S.dur));
      const ang = lerp(0.9, 0.35, p);
      cam.position.set(Math.sin(ang) * 7.2, lerp(4.2, 3.4, p), Math.cos(ang) * 7.2);
      cam.lookAt(-0.6, 0.5, -0.3);
      cam.setViewOffset(1920, 1080, -200, 0, 1920, 1080);
      card.upd(lt, 0.2);
      pins.forEach((o, i) => o.pin.upd(lt, 1.0 + i * 0.5, projetar(THREE, o.v, cam), o.a));
    },
  };
}

export default { gamer, playground };
