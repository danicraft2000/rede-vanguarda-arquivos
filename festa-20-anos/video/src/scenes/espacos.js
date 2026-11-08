// Estacionamento decorado, entrada (presentes/lembrancinhas) e sala de estar com os 4 banheiros.
import { E, seg, lerp, ruido, rng } from '../core/anim.js';
import { h, camada, fx, vg, ARCO, pino, projetar } from '../core/ui.js';
import { fachada } from './predio.js';
import { cartaoTitulo } from './local.js';

export const QUADROS_VE = [
  '01-aparecida', '02-mazzaropi', '03-alcatrazes', '04-monteiro-lobato', '05-via-dutra', '06-futuro-das-cidades-1',
  '07-vida-zen', '08-cassiano-ricardo', '09-100-anos-de-aviacao', '10-sabores-e-temperos-da-terra',
  '11-futuro-das-cidades-2', '12-antartida', '13-futuro-das-cidades-3', '14-300-anos-de-aparecida', '15-15-anos-da-rede-vanguarda',
];

export function scrim(L, lado = 'esq') {
  const s = h('div', '', L);
  s.style.cssText = lado === 'esq'
    ? 'position:absolute;inset:0;background:linear-gradient(90deg, rgba(4,6,30,0.85) 0%, rgba(4,6,30,0.55) 36%, rgba(4,6,30,0) 60%)'
    : 'position:absolute;inset:0;background:linear-gradient(0deg, rgba(4,6,30,0.85) 0%, rgba(4,6,30,0.5) 30%, rgba(4,6,30,0) 55%)';
  return s;
}

export function chipsLinha(L, itens, x, y, gap = 16) {
  const box = h('div', '', L);
  box.style.cssText = `position:absolute;left:${x}px;top:${y}px;display:flex;flex-wrap:wrap;gap:${gap}px;width:900px`;
  return itens.map((t, i) => h('div', 'chip', box, `<i style="background:${ARCO[(i * 3) % 10]}"></i>${t}`));
}

// Coluna de balões arco-íris
function colunaBaloes(THREE, kit, alt = 3.2) {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(0.32, 16, 12);
  const n = 14;
  for (let i = 0; i < n; i++) {
    const c = ARCO[Math.floor((i / n) * 10)];
    for (let k = 0; k < 4; k++) {
      const b = new THREE.Mesh(geo, kit.m.brilho(c, 90, { emissive: new THREE.Color(c).multiplyScalar(0.12) }));
      const a = (k / 4) * Math.PI * 2 + i * 0.6;
      b.position.set(Math.cos(a) * 0.3, alt - (i / n) * alt + 0.3, Math.sin(a) * 0.3);
      g.add(b);
    }
  }
  return g;
}

async function estacionamento({ THREE, kit, raiz }) {
  const cena = kit.novaCena({ fundo: null, nevoa: [0xf3d7b8, 50, 170] });
  cena.background = kit.ceu([[0, '#4a6fc0'], [0.5, '#e8a07a'], [1, '#ffd9a0']]);
  const cam = kit.camera(46);
  kit.luzes(cena, { hemi: [0xffe8d0, 0x5a4a40, 1.4], dir: [0xffd2a0, 2.4, [-30, 22, 30]], sombra: true, area: 30, alvo: [0, 0, 15] });
  cena.add(fachada(THREE, kit, { decorada: true }));
  // totens 2003 × hoje
  const logo03 = await kit.carregarImg('/ref/logo-2003-vanguarda.webp');
  const logoV = await kit.carregarImg('/ref/logo-v-plano.webp');
  const totem = (img, ano, sub) => kit.canvasTex(512, 1024, (g, w, hh) => {
    const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#dfe4f2'); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
    const s = Math.min(420 / img.naturalWidth, 380 / img.naturalHeight);
    g.drawImage(img, (w - img.naturalWidth * s) / 2, 160, img.naturalWidth * s, img.naturalHeight * s);
    g.fillStyle = '#12163a'; g.textAlign = 'center'; g.font = '700 150px AG'; g.fillText(ano, w / 2, 720);
    g.font = '700 40px Inter'; g.fillStyle = '#3b4170'; g.fillText(sub, w / 2, 800);
    ARCO.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, 900 + i * 12, w, 12); });
  });
  const totens = [[-4.6, totem(logo03, '2003', 'A LOGO DA ESTREIA')], [4.6, totem(logoV, vg('HOJE'), 'A LOGO ATUAL')]].map(([x, t]) => {
    const tt = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.6, 0.25), [kit.m.fosco(0xdfe3ea), kit.m.fosco(0xdfe3ea), kit.m.fosco(0xdfe3ea), kit.m.fosco(0xdfe3ea), kit.m.texB(t), kit.m.fosco(0xdfe3ea)]);
    tt.position.set(x, 1.3, 24.4); tt.castShadow = true; cena.add(tt);
    return tt;
  });
  for (const x of [-3.1, 3.1]) { const b = colunaBaloes(THREE, kit, 3.4); b.position.set(x, 0, 23.4); cena.add(b); }
  const L = camada(raiz);
  const sc = scrim(L);
  const card = cartaoTitulo(L, { k: 'ESTACIONAMENTO', t: 'ARCO-ÍRIS VANGUARDA', sub: 'Decoração temática em <b>degradê arco-íris</b>:<br>a Vanguarda de <b>2003</b> encontra a de <b>hoje</b>.', y: 210, largura: 1000 });
  const chips = chipsLinha(L, ['Túnel de arcos de LED', 'Totens 2003 × hoje', 'Colunas de balões', 'Caminho iluminado'], 110, 560);
  return {
    cena, cam,
    upd(lt, S) {
      const p = E.inOutCubic(seg(lt, 0, S.dur));
      cam.position.set(lerp(2.5, 0.6, p) + ruido(lt * 0.6, 3) * 0.08, lerp(2.2, 1.7, p), lerp(36, 17.5, p));
      cam.lookAt(lerp(-1.5, 0, p), 2.2, lerp(20, 8, p));
      sc.style.opacity = 1;
      card.upd(lt, 0.3);
      chips.forEach((c, i) => fx(c, lt, { a: 1.6 + i * 0.3, d: 0.5, s: 0.5, y: 20, e: E.outBack }));
    },
  };
}

// Sala interna genérica (piso, paredes, teto escuro)
function sala(THREE, kit, { w = 10, d = 10, hgt = 4.2, corParede = 0x3a3d4a, tijolo = false } = {}) {
  const g = new THREE.Group();
  const piso = kit.tex.piso.clone(); piso.repeat.set(w / 2, d / 2); piso.needsUpdate = true;
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), kit.m.brilho(0xffffff, 40, { map: piso }));
  p.rotation.x = -Math.PI / 2; p.receiveShadow = true; g.add(p);
  const teto = new THREE.Mesh(new THREE.PlaneGeometry(w, d), kit.m.fosco(0x111116)); teto.rotation.x = Math.PI / 2; teto.position.y = hgt; g.add(teto);
  const mp = kit.m.fosco(corParede);
  const tij = kit.tex.tijolo.clone(); tij.repeat.set(d / 2.5, hgt / 2.5); tij.needsUpdate = true;
  const paredes = [
    [w, 0, -d / 2, 0], [w, 0, d / 2, Math.PI], [d, -w / 2, 0, Math.PI / 2], [d, w / 2, 0, -Math.PI / 2],
  ].map(([l, x, z, r], i) => {
    const pp = new THREE.Mesh(new THREE.PlaneGeometry(l, hgt), tijolo && i === 2 ? kit.m.tex(tij) : mp);
    pp.position.set(x, hgt / 2, z); pp.rotation.y = r; pp.receiveShadow = true; g.add(pp); return pp;
  });
  g.userData.paredes = paredes;
  return g;
}

function presente(THREE, kit, s = 1, cor = 0xffffff) {
  const g = new THREE.Group();
  const cx = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), kit.m.brilho(cor, 50)); cx.position.y = 0.5; cx.castShadow = true; g.add(cx);
  const tampa = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.18, 1.08), kit.m.brilho(cor, 50)); tampa.position.y = 1.02; g.add(tampa);
  const fitaV = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.14, 1.1), new THREE.MeshPhongMaterial({ map: kit.tex.arcoVcheio })); fitaV.position.y = 0.56; g.add(fitaV);
  const fitaH = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.14, 0.16), new THREE.MeshPhongMaterial({ map: kit.tex.arcoVcheio })); fitaH.position.y = 0.56; g.add(fitaH);
  for (const r of [0.6, -0.6]) { const laco = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.05, 8, 20), kit.m.brilho(0xd6247e, 80)); laco.position.set(r * 0.25, 1.25, 0); laco.rotation.set(0, Math.PI / 2, r); g.add(laco); }
  g.scale.setScalar(s);
  return g;
}

function miniVHS(THREE, kit, texRot) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.025, 0.105), [kit.m.brilho(0x111111), kit.m.brilho(0x111111), kit.m.texB(texRot), kit.m.brilho(0x111111), kit.m.brilho(0x111111), kit.m.brilho(0x111111)]);
  g.add(b);
  return g;
}

async function entrada({ THREE, kit, raiz }) {
  const cena = kit.novaCena({ fundo: 0x0b0b12 });
  const cam = kit.camera(44);
  cena.add(new THREE.HemisphereLight(0xfff0e0, 0x302820, 1.1));
  const sol = new THREE.DirectionalLight(0xfff2e0, 1.4); sol.position.set(3, 8, 6); sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 }); cena.add(sol);
  const s = sala(THREE, kit, { w: 12, d: 12, corParede: 0x4a4d5a, tijolo: true });
  cena.add(s);
  // backdrop de boas-vindas
  const logoV = await kit.carregarImg('/ref/logo-v-plano.webp');
  const back = kit.canvasTex(2048, 1024, (g, w, hh) => {
    const gr = g.createRadialGradient(w / 2, hh * 0.4, 20, w / 2, hh * 0.5, w * 0.6); gr.addColorStop(0, '#2c3592'); gr.addColorStop(1, '#070a2a'); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
    for (let x = 0; x < w; x += 128) for (let y = 0; y < hh; y += 128) { g.fillStyle = `rgba(255,255,255,${((x + y) / 128) % 2 ? 0.03 : 0.06})`; g.fillRect(x, y, 126, 126); }
    g.drawImage(logoV, w / 2 - 260, 120, 520, 293);
    g.textAlign = 'center'; g.fillStyle = '#ffffff'; g.font = '700 150px AG'; g.fillText(vg('BEM-VINDOS!'), w / 2, 590);
    g.font = '700 96px AG'; g.fillText(vg('DANIEL 20 ANOS'), w / 2, 730);
    ARCO.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * w / 10, 860, w / 10, 26); });
  });
  const bd = kit.tela(back, 7, 3.5, 0xdfe3ea, 0.15); bd.position.set(0, 2.15, -5.9); cena.add(bd);
  // tapete arco-íris
  const tapete = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 10), new THREE.MeshLambertMaterial({ map: kit.tex.arcoH }));
  tapete.rotation.x = -Math.PI / 2; tapete.rotation.z = Math.PI / 2; tapete.position.set(0, 0.01, 0.5); tapete.receiveShadow = true;
  tapete.material.map = kit.canvasTex(1024, 64, (g, w, hh) => ARCO.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, (i / 10) * hh, w, hh / 10 + 1); }));
  tapete.rotation.z = 0; tapete.geometry = new THREE.PlaneGeometry(2.2, 10);
  cena.add(tapete);
  // caixa de presentes (esquerda)
  const cxP = presente(THREE, kit, 1.25, 0xffffff); cxP.position.set(-3.4, 0, -2.6); cena.add(cxP);
  const p2 = presente(THREE, kit, 0.55, 0xf2d33a); p2.position.set(-2.3, 0, -1.6); p2.rotation.y = 0.5; cena.add(p2);
  const p3 = presente(THREE, kit, 0.45, 0x3d6ff0); p3.position.set(-4.3, 0, -1.4); p3.rotation.y = -0.4; cena.add(p3);
  const placaP = kit.tela(kit.texTexto([{ t: 'PRESENTES', tam: 110 }], { w: 1024, h: 256, fundo: '#d6247e' }), 1.8, 0.45, 0xffffff, 0.06);
  placaP.position.set(-3.4, 2.15, -2.6); cena.add(placaP);
  // mesa de lembrancinhas (direita) com mini fitas VHS personalizadas
  const mesa = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 1.0), kit.m.brilho(0xffffff, 30)); mesa.position.set(3.4, 0.45, -2.6); mesa.castShadow = true; cena.add(mesa);
  const rot = kit.canvasTex(256, 140, (g, w, hh) => { g.fillStyle = '#111'; g.fillRect(0, 0, w, hh); g.fillStyle = '#fff'; g.fillRect(20, 24, w - 40, 70); ARCO.forEach((c, i) => { g.fillStyle = c; g.fillRect(20 + i * (w - 40) / 10, 94, (w - 40) / 10 + 1, 14); }); g.fillStyle = '#12163a'; g.font = '700 30px AG'; g.textAlign = 'center'; g.fillText(vg('DANIEL 20'), w / 2, 70); });
  const r = rng(5);
  for (let n = 0; n < 3; n++) {
    const deg = new THREE.Mesh(new THREE.BoxGeometry(2.2 - n * 0.55, 0.22, 0.7 - n * 0.15), kit.m.brilho(0xdfe3ea, 40));
    deg.position.set(3.4, 1.0 + n * 0.22, -2.6); cena.add(deg);
    const qtd = 9 - n * 3;
    for (let k = 0; k < qtd; k++) { const f = miniVHS(THREE, kit, rot); f.scale.setScalar(1.6); f.position.set(3.4 - (2.0 - n * 0.55) / 2 + 0.12 + k * ((2.0 - n * 0.55) / qtd), 1.13 + n * 0.22, -2.6 + (r() - 0.5) * 0.2); f.rotation.y = (r() - 0.5) * 0.5; cena.add(f); }
  }
  const placaL = kit.tela(kit.texTexto([{ t: 'LEMBRANCINHAS', tam: 96 }], { w: 1024, h: 256, fundo: '#3d6ff0' }), 1.9, 0.47, 0xffffff, 0.06);
  placaL.position.set(3.4, 2.4, -2.9); cena.add(placaL);
  // luzes quentes e convidados
  const pts = [[-3.4, 3.6, -1], [3.4, 3.6, -1], [0, 3.6, -4]];
  pts.forEach(([x, y, z]) => { const l = new THREE.PointLight(0xffd9a8, 8, 9); l.position.set(x, y, z); cena.add(l); });
  [[-1.9, -1.2, 0xffffff], [1.9, -1.4, 0xffffff], [-2.6, -3.6, 0xffffff], [2.4, -3.8, 0xffffff]].forEach(([x, z, c]) => { const p = kit.pessoa(c); p.position.set(x, 0, z); cena.add(p); });
  const L = camada(raiz);
  const sc = scrim(L, 'esq');
  sc.style.background = 'linear-gradient(180deg, rgba(4,6,30,0.88) 0%, rgba(4,6,30,0.55) 38%, rgba(4,6,30,0) 55%)';
  const card = cartaoTitulo(L, { k: 'ENTRADA DA FESTA', t: 'BOAS-VINDAS', sub: '<b>Caixa de entrega de presentes</b> e <b>mesa de lembrancinhas</b><br>(sugestão: mini fitas VHS personalizadas “Daniel 20”).', y: 190, cls: 'tit-m', largura: 1300 });
  const p1 = pino(L, 'Caixa de presentes', 'entregue aqui na chegada', '#d6247e');
  const p2p = pino(L, 'Lembrancinhas', 'uma para cada convidado', '#3d6ff0');
  return {
    cena, cam,
    upd(lt, S) {
      const p = E.inOutCubic(seg(lt, 0, S.dur));
      cam.position.set(lerp(-0.8, 0.6, p), lerp(1.9, 1.8, p), lerp(6.4, 3.4, p));
      cam.lookAt(0, 1.35, -5);
      card.upd(lt, 0.4);
      p1.upd(lt, 1.6, projetar(THREE, new THREE.Vector3(-3.4, 1.45, -2.6), cam), 80);
      p2p.upd(lt, 2.2, projetar(THREE, new THREE.Vector3(3.4, 1.5, -2.6), cam), 120);
    },
  };
}

function sofa(THREE, kit, cor = 0x3a3f7a, w = 2.2) {
  const g = new THREE.Group();
  const mat = kit.m.brilho(cor, 15);
  const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.45, 0.9), mat); base.position.y = 0.32; g.add(base);
  const enc = new THREE.Mesh(new THREE.BoxGeometry(w, 0.55, 0.2), mat); enc.position.set(0, 0.8, -0.35); g.add(enc);
  for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.35, 0.9), mat); b.position.set(x, 0.7, 0); g.add(b); }
  for (let i = 0; i < 2; i++) { const al = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.12), kit.m.brilho(ARCO[i * 5 + 1], 20)); al.position.set(-w / 4 + i * w / 2, 0.8, -0.2); al.rotation.z = 0.1; g.add(al); }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function planta_(THREE, kit) {
  const g = new THREE.Group();
  const vaso = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.5, 16), kit.m.brilho(0xf4f4f4, 50)); vaso.position.y = 0.25; g.add(vaso);
  for (let i = 0; i < 7; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), kit.m.fosco(0x3f8a3c, { flatShading: true })); f.position.set(Math.cos(i) * 0.2, 0.75 + (i % 3) * 0.2, Math.sin(i) * 0.2); g.add(f); }
  return g;
}

async function salaEstar({ THREE, kit, raiz }) {
  const cena = kit.novaCena({ fundo: 0x0b0b12 });
  const cam = kit.camera(46);
  cena.add(new THREE.HemisphereLight(0xfff0e0, 0x302820, 1.0));
  const W = 5, D = 16;
  const s = sala(THREE, kit, { w: W, d: D, corParede: 0x50535f, tijolo: true });
  cena.add(s);
  // tapete, sofás, mesas de centro, abajures
  const tap = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 9), kit.m.fosco(0x23285e)); tap.rotation.x = -Math.PI / 2; tap.position.set(0.2, 0.01, 1); cena.add(tap);
  for (const z of [-1.5, 2.5]) {
    const so = sofa(THREE, kit, 0x2c3170, 2.4); so.position.set(1.9, 0, z); so.rotation.y = -Math.PI / 2; cena.add(so);
    const mc = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.4, 24), kit.m.brilho(0xc9a46a, 60)); mc.position.set(0.6, 0.2, z); cena.add(mc);
    const vl = kit.logoV({ tipo: '2012', R: 0.12, H: 0.14, seg: 32 }); vl.position.set(0.6, 0.48, z); cena.add(vl);
  }
  for (const z of [-4.5, 0.5, 5.2]) { const pl = planta_(THREE, kit); pl.position.set(2.0, 0, z); cena.add(pl); }
  // quadros (prévia da exposição) na parede de tijolo
  const texs = await Promise.all(QUADROS_VE.slice(0, 5).map((q) => kit.imgTex(`/svg/vanguarda-especial/${q}.svg`, 800, 600)));
  texs.forEach((t, i) => {
    const q = kit.tela(t, 1.6, 1.2, 0x15151a, 0.06); q.position.set(-W / 2 + 0.06, 1.85, 4.8 - i * 2.4); q.rotation.y = Math.PI / 2; cena.add(q);
    const poca = kit.pocaLuz(2.2, 3.4, 0.45); poca.position.set(-W / 2 + 0.03, 2.1, 4.8 - i * 2.4); poca.rotation.y = Math.PI / 2; cena.add(poca);
  });
  // 4 banheiros temáticos no fim do corredor
  const temas = [['BOM DIA', '#f5a12e'], ['LINK', '#3d6ff0'], ['JORNAL', '#7b3fe0'], ['VANGUARDA TV', '#2fc27a']];
  temas.forEach(([t, c], i) => {
    const x = -1.8 + i * 1.2;
    const porta = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.2, 0.08), kit.m.brilho(0xe9ebf0, 40)); porta.position.set(x, 1.1, -D / 2 + 0.06); cena.add(porta);
    const mac = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), kit.m.cromo()); mac.position.set(x + 0.35, 1.05, -D / 2 + 0.13); cena.add(mac);
    const placa = kit.texTexto([{ t: `WC ${i + 1}`, tam: 64, y: 0.3, cor: '#12163a' }, { t: vg(t), tam: t.length > 8 ? 46 : 62, y: 0.68, cor: c }], { w: 512, h: 256, fundo: '#ffffff', arco: true });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), kit.m.texB(placa)); pl.position.set(x, 1.75, -D / 2 + 0.11); cena.add(pl);
    const faixa = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 0.02), kit.m.luz(c)); faixa.position.set(x, 2.32, -D / 2 + 0.1); cena.add(faixa);
  });
  [[-3, 0xffd9a8], [2, 0xffd9a8], [-6.5, 0xffe6c4]].forEach(([z, c]) => { const l = new THREE.PointLight(c, 7, 8); l.position.set(0.5, 3.6, z); cena.add(l); });
  [[1.3, -3.6], [-0.5, -5.6]].forEach(([x, z]) => { const p = kit.pessoa(); p.position.set(x, 0, z); cena.add(p); });
  const L = camada(raiz);
  const sc = scrim(L);
  const card = cartaoTitulo(L, { k: 'CORREDOR · SALA DE ESTAR', t: 'SALA & 4 WC', sub: 'Corredor pequeno em clima de sala de estar,<br>com a exposição <b>Vanguarda Especial</b><br>e <b>4 banheiros temáticos</b> da Vanguarda.', y: 210, largura: 900 });
  const pB = pino(L, '4 banheiros', 'Bom Dia · Link · Jornal · Vanguarda TV', '#9bd23a');
  return {
    cena, cam,
    upd(lt, S) {
      const p = E.inOutCubic(seg(lt, 0, S.dur));
      cam.position.set(lerp(1.2, 0.4, p), 1.7, lerp(7.4, 0.5, p));
      cam.lookAt(lerp(-0.6, -0.1, p), 1.5, -8);
      card.upd(lt, 0.3);
      pB.upd(lt, 1.8, projetar(THREE, new THREE.Vector3(0, 2.4, -D / 2), cam), 70);
    },
  };
}

export default { estacionamento, entrada, sala: salaEstar };
