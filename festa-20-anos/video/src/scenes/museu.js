// Salão secundário — Museu Vanguarda: fitas de vídeo/áudio, câmeras cenográficas e o cone de 1998.
import { E, seg, lerp, ruido, rng } from '../core/anim.js';
import { h, camada, fx, fxLetras, titulo, kicker, fundo2D, vg, ARCO, pino, projetar } from '../core/ui.js';
import { cartaoTitulo } from './local.js';
import { scrim, chipsLinha } from './espacos.js';

async function museu({ raiz }) {
  const fundo = fundo2D(raiz, 'noite', 91);
  const L = camada(raiz);
  const k = kicker(L, 'SALÃO SECUNDÁRIO');
  k.el.style.cssText += 'left:150px;top:250px';
  const t = titulo(L, 'MUSEU VANGUARDA', 'tit cromo');
  t.el.style.cssText += 'position:absolute;left:150px;top:310px';
  const sub = h('div', 'sub', L, 'A história da Rede Vanguarda e seus objetos — da <b>fita magnética</b> à <b>inteligência artificial</b>.');
  sub.style.cssText += 'position:absolute;left:150px;top:470px;width:1500px';
  const linha = h('div', '', L);
  linha.style.cssText = 'position:absolute;left:150px;top:600px;display:flex;gap:18px';
  const marcos = [['1998', 'O cone'], ['2003', 'Inauguração'], ['2006', 'Vanguarda TV'], ['2012', 'Novos telejornais'], ['2029', 'O futuro']].map(([a, b], i) => {
    const c = h('div', 'painel', linha);
    c.style.cssText += `position:relative;width:300px;height:150px;padding:28px 26px`;
    c.innerHTML = `<div class="ag" style="font-size:58px;color:${ARCO[i * 2]}">${a}</div><div style="font-size:24px;font-weight:700;margin-top:6px">${b}</div>`;
    return c;
  });
  return {
    upd(lt, S) {
      fundo.upd(lt, S.pulso);
      k.upd(lt, 0.05);
      fxLetras(t.spans, lt, { a: 0.12, st: 0.035, d: 0.5, y: 70, rx: -90, z: -200, blur: 10 });
      fx(sub, lt, { a: 0.6, d: 0.5, y: 20, blur: 6 });
      marcos.forEach((c, i) => fx(c, lt, { a: 1.0 + i * 0.25, d: 0.5, y: 40, rx: 60, blur: 6 }));
    },
  };
}

// ---------------------------------------------------------------- Fitas (dimensões reais em mm, escala ×4 na vitrine)
const FITAS = [
  { nome: 'Fita K7', ano: '1963', mm: [100.4, 63.8, 12], casco: '#d9dde4', rot: '#ffffff', txt: 'C-60', cor: '#e5342e', janela: 'k7' },
  { nome: 'U-matic', ano: '1971', mm: [221, 140, 32], casco: '#1d1e22', rot: '#f2f2f2', txt: 'U-matic', cor: '#3d6ff0', janela: 'umatic' },
  { nome: 'Betamax', ano: '1975', mm: [156, 96, 25], casco: '#1a1a1d', rot: '#ffffff', txt: 'Beta', cor: '#e5342e', janela: 'beta' },
  { nome: 'VHS', ano: '1976', mm: [187, 103, 25], casco: '#151517', rot: '#ffffff', txt: 'VHS', cor: '#12163a', janela: 'vhs' },
  { nome: 'VHS-C', ano: '1982', mm: [92, 59, 23], casco: '#1d1d20', rot: '#ffffff', txt: 'VHS-C', cor: '#2fc27a', janela: 'vhsc' },
  { nome: 'Video8 / Hi8', ano: '1985', mm: [95, 62.5, 15], casco: '#2a2b30', rot: '#c9cfdb', txt: 'Hi8', cor: '#f26b2a', janela: 'v8' },
  { nome: 'Betacam SP (S)', ano: '1986', mm: [156, 96, 25], casco: '#5c6068', rot: '#2c2a7a', txt: 'BETACAM SP', cor: '#ffffff', janela: 'bc' },
  { nome: 'Betacam SP (L)', ano: '1986', mm: [253, 144, 25], casco: '#5c6068', rot: '#2c2a7a', txt: 'BETACAM SP', cor: '#ffffff', janela: 'bc' },
  { nome: 'MiniDV', ano: '1995', mm: [66, 48, 12], casco: '#3a3d44', rot: '#c9cfdb', txt: 'MiniDV', cor: '#12163a', janela: 'mdv' },
  { nome: 'DVCAM', ano: '1996', mm: [125, 78, 14.6], casco: '#4a4e58', rot: '#2a3a9a', txt: 'DVCAM', cor: '#ffffff', janela: 'dvcam' },
];

function texFita(kit, f) {
  const [w, d] = f.mm;
  const W = 512, H = Math.round(512 * d / w);
  return kit.canvasTex(W, H, (g) => {
    g.fillStyle = f.casco; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 4; g.strokeRect(6, 6, W - 12, H - 12);
    const rot = (x, y, w2, h2) => { g.fillStyle = f.rot; g.fillRect(x, y, w2, h2); g.fillStyle = f.cor === '#ffffff' ? '#ffffff' : f.cor; g.font = `700 ${Math.round(h2 * 0.42)}px AG`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(f.txt, x + h2 * 0.25, y + h2 * 0.52); ARCO.forEach((c, i) => { g.fillStyle = c; g.fillRect(x + (i * w2) / 10, y + h2 - h2 * 0.12, w2 / 10 + 1, h2 * 0.12); }); };
    const carretel = (cx, cy, r) => { g.fillStyle = '#2a2420'; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); g.fillStyle = '#f4f4f4'; g.beginPath(); g.arc(cx, cy, r * 0.42, 0, 7); g.fill(); g.fillStyle = '#333'; for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; g.fillRect(cx + Math.cos(a) * r * 0.25 - 3, cy + Math.sin(a) * r * 0.25 - 3, 6, 6); } };
    if (f.janela === 'k7') { rot(30, 24, W - 60, H * 0.36); g.fillStyle = 'rgba(30,30,40,0.85)'; g.fillRect(W * 0.25, H * 0.5, W * 0.5, H * 0.22); carretel(W * 0.33, H * 0.61, H * 0.09); carretel(W * 0.67, H * 0.61, H * 0.09); }
    else if (f.janela === 'vhs' || f.janela === 'beta' || f.janela === 'umatic') { rot(W * 0.18, H * 0.12, W * 0.64, H * 0.36); g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(W * 0.3, H * 0.58, W * 0.4, H * 0.22); carretel(W * 0.37, H * 0.69, H * 0.08); carretel(W * 0.63, H * 0.69, H * 0.08); }
    else if (f.janela === 'bc') { rot(W * 0.08, H * 0.1, W * 0.84, H * 0.5); g.fillStyle = '#3a3d44'; g.fillRect(W * 0.08, H * 0.68, W * 0.84, H * 0.2); g.fillStyle = '#d6247e'; g.font = `700 ${Math.round(H * 0.12)}px Inter`; g.fillText(f.mm[0] > 200 ? 'L · 90 min' : 'S · 30 min', W * 0.1, H * 0.8); }
    else { rot(W * 0.1, H * 0.12, W * 0.8, H * 0.44); g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(W * 0.3, H * 0.64, W * 0.4, H * 0.2); carretel(W * 0.4, H * 0.74, H * 0.07); carretel(W * 0.6, H * 0.74, H * 0.07); }
  });
}

async function fitas({ THREE, kit, raiz }) {
  const cena = kit.novaCena({ fundo: 0x07070c });
  const cam = kit.camera(38);
  cena.add(new THREE.HemisphereLight(0xe8ecff, 0x1a1a22, 1.1));
  const dl = new THREE.DirectionalLight(0xffffff, 1.6); dl.position.set(2, 8, 6); cena.add(dl);
  const PASSO = 2.1, N = FITAS.length, X = (i) => i * PASSO;
  const mad = kit.tex.piso.clone(); mad.repeat.set(16, 3); mad.needsUpdate = true;
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(N * PASSO + 12, 10), kit.m.brilho(0x9aa0b4, 60, { map: mad })); piso.rotation.x = -Math.PI / 2; piso.position.set(X(N - 1) / 2, 0, 0); cena.add(piso);
  const parede = new THREE.Mesh(new THREE.PlaneGeometry(N * PASSO + 12, 5), kit.m.fosco(0x1b1f45)); parede.position.set(X(N - 1) / 2, 2.5, -1.6); cena.add(parede);
  const faixa = new THREE.Mesh(new THREE.PlaneGeometry(N * PASSO + 12, 0.12), kit.m.texB(kit.tex.arcoH)); faixa.position.set(X(N - 1) / 2, 2.9, -1.58); cena.add(faixa);
  const titParede = kit.tela(kit.texTexto([{ t: 'DA FITA À NUVEM', tam: 110 }], { w: 1400, h: 220, fundo: '#0d1036' }), 5.6, 0.88, 0x0d1036, 0.02);
  titParede.position.set(X(1.5), 3.7, -1.55); cena.add(titParede);
  const ESC = 4 / 1000; // ×4 em metros
  const pedestais = FITAS.map((f, i) => {
    const g = new THREE.Group();
    const ped = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.0, 1.0), kit.m.brilho(0xf4f5f8, 40)); ped.position.y = 0.5; g.add(ped);
    const fil = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.05, 1.04), kit.m.luz(ARCO[i % 10])); fil.position.y = 0.95; g.add(fil);
    const [w, d, e] = f.mm.map((v) => v * ESC);
    const tex = texFita(kit, f);
    const lado = kit.m.brilho(f.casco, 70);
    const fita = new THREE.Mesh(new THREE.BoxGeometry(w, e, d), [lado, lado, kit.m.brilho(0xffffff, 60, { map: tex }), lado, lado, lado]);
    const suporte = new THREE.Group();
    suporte.add(fita);
    fita.rotation.x = 1.15; fita.position.y = d / 2 * Math.sin(1.15) + 0.02;
    suporte.position.y = 1.02;
    g.add(suporte);
    const acr = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.05, 0.9), new THREE.MeshPhongMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0.1, shininess: 120, specular: 0xffffff, depthWrite: false }));
    acr.position.y = 1.55; g.add(acr);
    g.position.set(X(i), 0, 0);
    cena.add(g);
    g.userData.suporte = suporte;
    return g;
  });
  [0, 3, 6, 9].forEach((i) => { const l = new THREE.PointLight(0xfff0dd, 8, 6); l.position.set(X(i), 3.2, 1.6); cena.add(l); });
  const L = camada(raiz);
  const topo = h('div', '', L);
  topo.style.cssText = 'position:absolute;left:0;right:0;top:0;height:360px;background:linear-gradient(180deg, rgba(4,6,30,0.9), rgba(4,6,30,0))';
  const k = kicker(L, 'MUSEU · ANTIGUIDADE');
  k.el.style.cssText += 'left:110px;top:150px';
  const t = titulo(L, 'FITAS DE VÍDEO E ÁUDIO', 'tit-m cromo');
  t.el.style.cssText += 'position:absolute;left:110px;top:200px';
  const leg = h('div', 'sub', L, 'Vitrines com as fitas em <b>tamanho proporcional real</b> (ampliadas 4×).');
  leg.style.cssText += 'position:absolute;left:110px;top:300px';
  const pins = FITAS.map((f, i) => ({ pin: pino(L, f.nome, `${f.ano} · ${(f.mm[0] / 10).toFixed(1).replace('.', ',')} × ${(f.mm[1] / 10).toFixed(1).replace('.', ',')} cm`, ARCO[i % 10]), v: new THREE.Vector3(X(i), 2.15, 0) }));
  return {
    cena, cam,
    upd(lt, S) {
      const p = E.inOutSine(seg(lt, 0.3, S.dur - 0.3));
      const x = lerp(-0.8, X(N - 1) + 0.6, p);
      cam.position.set(x - 0.9, 1.95 + ruido(lt * 0.4, 5) * 0.03, 2.9);
      cam.lookAt(x + 0.3, 1.25, 0);
      pedestais.forEach((g, i) => { g.userData.suporte.rotation.y = Math.sin(S.t * 0.8 + i) * 0.35; });
      k.upd(lt, 0.2);
      fxLetras(t.spans, lt, { a: 0.3, st: 0.025, d: 0.5, y: 50, rx: -80, blur: 8 });
      fx(leg, lt, { a: 0.8, d: 0.5, y: 16, blur: 6 });
      pins.forEach((o, i) => {
        const pr = projetar(THREE, o.v, cam);
        const centro = 1 - Math.min(1, Math.abs(pr.x - 1060) / 700);
        o.pin.el.style.display = centro > 0.02 ? 'block' : 'none';
        o.pin.upd(10, 0, pr, 70 + (i % 2) * 70);
        o.pin.el.style.opacity = Math.min(1, centro * 2.2).toFixed(3);
      });
    },
  };
}

// ---------------------------------------------------------------- Câmeras cenográficas
function cameraOmbro(THREE, kit) {
  const g = new THREE.Group();
  const corpo = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.28, 0.16), kit.m.brilho(0x5c6068, 60)); g.add(corpo);
  const lente = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.085, 0.36, 24), kit.m.brilho(0x15151a, 90)); lente.rotation.z = Math.PI / 2; lente.position.set(0.42, -0.02, 0); g.add(lente);
  const vidro = new THREE.Mesh(new THREE.CircleGeometry(0.075, 24), kit.m.cromo(0x223355, 0.05)); vidro.rotation.y = Math.PI / 2; vidro.position.set(0.601, -0.02, 0); g.add(vidro);
  const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.26, 12), kit.m.brilho(0x1a1a1f)); visor.rotation.z = Math.PI / 2; visor.position.set(0.15, 0.18, -0.1); g.add(visor);
  const alca = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.015, 6, 16, Math.PI), kit.m.brilho(0x1a1a1f)); alca.position.set(0.0, 0.14, 0); g.add(alca);
  const mic = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 10), kit.m.brilho(0x222222)); mic.rotation.z = Math.PI / 2; mic.position.set(0.3, 0.2, 0.05); g.add(mic);
  const bat = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.14), kit.m.brilho(0x222226)); bat.position.set(-0.3, 0, 0); g.add(bat);
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.06), kit.m.texB(kit.texTexto([{ t: vg('VANGUARDA'), tam: 80 }], { w: 512, h: 128, fundo: '#5c6068' }))); logo.position.set(0.05, 0, 0.081); g.add(logo);
  return g;
}
function cameraEstudio(THREE, kit) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.12, 24), kit.m.brilho(0x2a2a30)); base.position.y = 0.1; g.add(base);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.1, 16), kit.m.cromo(0xcfd3dc, 0.3)); col.position.y = 0.7; g.add(col);
  const corpo = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.36, 0.34), kit.m.brilho(0xdadde4, 60)); corpo.position.y = 1.42; g.add(corpo);
  const prompter = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.46), kit.m.brilho(0x15151a, 60)); prompter.position.set(0.52, 1.42, 0); g.add(prompter);
  const vidro = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.36), new THREE.MeshPhongMaterial({ color: 0x8899bb, transparent: true, opacity: 0.5, shininess: 150 })); vidro.rotation.y = Math.PI / 2; vidro.position.set(0.775, 1.42, 0); g.add(vidro);
  const tally = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.06), kit.m.luz(0xff2a2a)); tally.position.set(0.3, 1.64, 0); g.add(tally);
  for (const z of [-0.18, 0.18]) { const cabo = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 6), kit.m.brilho(0x111111)); cabo.rotation.z = 1.2; cabo.position.set(-0.5, 1.2, z); g.add(cabo); }
  return g;
}
function cameraPTZ(THREE, kit) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.08, 24), kit.m.brilho(0x15151a)); g.add(base);
  const garfo = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.24, 0.06), kit.m.brilho(0x15151a)); garfo.position.y = 0.16; g.add(garfo);
  const cab = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.26, 24), kit.m.brilho(0xe9ebf0, 80)); cab.rotation.x = Math.PI / 2; cab.position.set(0, 0.3, 0.04); g.add(cab);
  const vidro = new THREE.Mesh(new THREE.CircleGeometry(0.08, 24), kit.m.cromo(0x223355, 0.05)); vidro.position.set(0, 0.3, 0.172); g.add(vidro);
  const led = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.008, 6, 32), kit.m.luz(0x27d3ff)); led.position.set(0, 0.3, 0.172); g.add(led);
  return g;
}

async function cameras({ THREE, kit, raiz }) {
  const cena = kit.novaCena({ fundo: 0x07070c });
  const cam = kit.camera(36);
  cena.add(new THREE.HemisphereLight(0xe8ecff, 0x1a1a22, 1.0));
  const dl = new THREE.DirectionalLight(0xffffff, 1.8); dl.position.set(3, 6, 5); cena.add(dl);
  const piso = new THREE.Mesh(new THREE.CircleGeometry(12, 48), kit.m.brilho(0x15182e, 90, { specular: 0x5566aa })); piso.rotation.x = -Math.PI / 2; cena.add(piso);
  const fundo = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 6, 48, 1, true, Math.PI * 0.6, Math.PI * 0.8), kit.m.fosco(0x1b1f45, { side: 2 })); fundo.position.y = 3; cena.add(fundo);
  const ped = (x, hgt = 1.0) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, hgt, 32), kit.m.brilho(0xf4f5f8, 50)); p.position.set(x, hgt / 2, 0); cena.add(p); const a = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.02, 6, 48), kit.m.luz(0xffffff)); a.rotation.x = Math.PI / 2; a.position.set(x, hgt, 0); cena.add(a); return hgt; };
  const c1 = cameraOmbro(THREE, kit); c1.position.set(-2.4, ped(-2.4) + 0.2, 0); c1.rotation.y = -0.5; cena.add(c1);
  const c2 = cameraEstudio(THREE, kit); c2.position.set(0, 0, -0.3); c2.rotation.y = -0.6; cena.add(c2);
  const c3 = cameraPTZ(THREE, kit); c3.position.set(2.4, ped(2.4) + 0.05, 0); c3.rotation.y = -0.3; c3.scale.setScalar(1.6); cena.add(c3);
  [[-2.4, 0xffe6c4], [0, 0xffffff], [2.4, 0xc4e6ff]].forEach(([x, c]) => { const l = new THREE.PointLight(c, 10, 5); l.position.set(x, 2.8, 1.5); cena.add(l); });
  const L = camada(raiz);
  const topo = h('div', '', L);
  topo.style.cssText = 'position:absolute;left:0;right:0;top:0;height:360px;background:linear-gradient(180deg, rgba(4,6,30,0.9), rgba(4,6,30,0))';
  const k = kicker(L, 'MUSEU · CÂMERAS CENOGRÁFICAS');
  k.el.style.cssText += 'left:110px;top:150px';
  const t = titulo(L, 'POR TRÁS DAS CÂMERAS', 'tit-m cromo');
  t.el.style.cssText += 'position:absolute;left:110px;top:200px';
  const pins = [['Câmera de ombro', 'reportagem · anos 90/2000', [-2.4, 1.5, 0], '#f5a12e'], ['Câmera de estúdio', 'com teleprompter', [0, 1.8, -0.3], '#3d6ff0'], ['Câmera robótica', 'PTZ · hoje', [2.4, 1.6, 0], '#27d3ff']].map(([a, b, p, c]) => ({ pin: pino(L, a, b, c), v: new THREE.Vector3(...p) }));
  return {
    cena, cam,
    upd(lt, S) {
      const p = E.inOutSine(seg(lt, 0, S.dur));
      const ang = lerp(-0.35, 0.3, p);
      cam.position.set(Math.sin(ang) * 6.0, lerp(2.0, 1.8, p), Math.cos(ang) * 6.0);
      cam.lookAt(0, 1.2, 0);
      cam.setViewOffset(1920, 1080, -120, 0, 1920, 1080);
      c3.rotation.y = -0.3 + Math.sin(S.t * 1.3) * 0.4;
      k.upd(lt, 0.2);
      fxLetras(t.spans, lt, { a: 0.3, st: 0.025, d: 0.5, y: 50, rx: -80, blur: 8 });
      pins.forEach((o, i) => o.pin.upd(lt, 1.0 + i * 0.45, projetar(THREE, o.v, cam), 90 + (i % 2) * 40));
    },
  };
}

// ---------------------------------------------------------------- Cone 1998
async function cone({ THREE, kit, raiz }) {
  const cena = kit.novaCena({ fundo: null });
  cena.background = kit.fundoRadial('#2a2f86', '#0d1040', '#020208');
  const cam = kit.camera(40);
  kit.luzes(cena, { hemi: [0xd6dcff, 0x101020, 1.0], dir: [0xffffff, 2.6, [3, 9, 6]] });
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.6, 64), kit.m.brilho(0xf4f5f8, 60)); ped.position.y = 0.3; cena.add(ped);
  const aro = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.03, 6, 96), kit.m.luz(0xffffff)); aro.rotation.x = Math.PI / 2; aro.position.y = 0.6; cena.add(aro);
  const c = kit.cone98({ R: 1.8, H: 3.0 }); c.position.y = 0.6 + 1.5 + 0.15; cena.add(c);
  const piso = new THREE.Mesh(new THREE.CircleGeometry(30, 64), kit.m.brilho(0x0b0d2a, 120, { specular: 0x5060c0 })); piso.rotation.x = -Math.PI / 2; cena.add(piso);
  cena.add(kit.sombraBlob(3.2, 3.2, 0.8));
  const refl = [];
  for (let i = 0; i < 4; i++) { const r = kit.refletor(['#f26b2a', '#7b3fe0', '#f2d33a', '#3d6ff0'][i], 9, 1.1); r.position.set(-4.5 + i * 3, 8, -2); cena.add(r); refl.push(r); }
  const L = camada(raiz);
  const sc = scrim(L);
  const card = cartaoTitulo(L, { k: 'MUSEU · 1998', t: 'O CONE', sub: 'As <b>primeiras logos</b> da Vanguarda,<br>agora em <b>3D gigante</b> no centro do museu.', y: 330, cls: 'tit', largura: 900 });
  const ref = h('div', 'painel claro', L);
  ref.style.cssText += 'left:1460px;top:640px;width:300px;padding:26px 20px 18px;text-align:center;transform-origin:center';
  ref.innerHTML = `<img src="/ref/logo-1998-cone.webp" style="width:150px;height:auto;display:block;margin:6px auto 10px"><div style="font-size:18px;font-weight:700;color:#3b4170">Logo original · 1998</div>`;
  return {
    cena, cam,
    upd(lt, S) {
      const p = E.inOutSine(seg(lt, 0, S.dur));
      const ang = lerp(-0.5, 0.4, p);
      cam.position.set(Math.sin(ang) * lerp(10.5, 9, p) + 1.4, lerp(1.4, 2.6, p), Math.cos(ang) * lerp(10.5, 9, p));
      cam.lookAt(1.4, 2.6, 0);
      cam.setViewOffset(1920, 1080, -330, 0, 1920, 1080);
      c.rotation.y = S.t * 0.4;
      refl.forEach((r, i) => { r.rotation.z = Math.sin(S.t * 0.9 + i) * 0.35; r.userData.feixe.material.opacity = 0.08 + 0.07 * S.pulso; });
      card.upd(lt, 0.2);
      fx(ref, lt, { a: 1.4, d: 0.6, s: 0.6, rz: 8, e: E.outBack, brz: -4 });
    },
  };
}

export { cameraEstudio, cameraOmbro, cameraPTZ };
export default { museu, fitas, cameras, cone };
