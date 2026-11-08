// Salão principal: palco com 3 telões, mesas, buffet, área gamer e playground.
import * as BGU from 'three/addons/utils/BufferGeometryUtils.js';
import { E, seg, lerp, ruido, rng, kf } from '../core/anim.js';
import { h, camada, fx, fxLetras, titulo, kicker, vg, ARCO, pino, projetar } from '../core/ui.js';
import { cartaoTitulo } from './local.js';
import { scrim, chipsLinha } from './espacos.js';

export const SALAO = { x0: -16, x1: 16, z0: -12, z1: 12, alt: 7 };

function geoCadeira(THREE) {
  const partes = [];
  const ass = new THREE.BoxGeometry(0.42, 0.05, 0.42); ass.translate(0, 0.46, 0); partes.push(ass);
  for (const x of [-0.18, 0.18]) for (const z of [-0.18, 0.18]) { const p = new THREE.CylinderGeometry(0.018, 0.018, 0.46, 5); p.translate(x, 0.23, z); partes.push(p); }
  for (const x of [-0.18, -0.06, 0.06, 0.18]) { const v = new THREE.CylinderGeometry(0.014, 0.014, 0.5, 5); v.translate(x, 0.72, -0.2); partes.push(v); }
  const topo = new THREE.BoxGeometry(0.42, 0.05, 0.04); topo.translate(0, 0.96, -0.2); partes.push(topo);
  return BGU.mergeGeometries(partes.map((g) => g.toNonIndexed()));
}

export async function montarSalao(THREE, kit, { detalhe = true } = {}) {
  const g = new THREE.Group();
  const S = SALAO, W = S.x1 - S.x0, D = S.z1 - S.z0;
  const piso = kit.tex.piso.clone(); piso.repeat.set(W / 2.4, D / 2.4); piso.needsUpdate = true;
  const p = new THREE.Mesh(new THREE.PlaneGeometry(W, D), kit.m.brilho(0xf0e8da, 70, { map: piso, specular: 0x333333 }));
  p.rotation.x = -Math.PI / 2; p.receiveShadow = true; g.add(p);
  const teto = new THREE.Mesh(new THREE.PlaneGeometry(W, D), kit.m.fosco(0x0c0c10)); teto.rotation.x = Math.PI / 2; teto.position.y = S.alt; g.add(teto);
  const mp = kit.m.fosco(0x55586a);
  const tij = kit.tex.tijolo.clone(); tij.repeat.set(D / 3, S.alt / 3); tij.needsUpdate = true;
  [[W, 0, S.z0, 0, mp], [W, 0, S.z1, Math.PI, mp], [D, S.x0, 0, Math.PI / 2, mp], [D, S.x1, 0, -Math.PI / 2, kit.m.tex(tij)]].forEach(([l, x, z, r, mat]) => {
    const pp = new THREE.Mesh(new THREE.PlaneGeometry(l, S.alt), mat); pp.position.set(x, S.alt / 2, z); pp.rotation.y = r; g.add(pp);
  });
  // grade de treliças no teto + spots embutidos
  for (let z = -10; z <= 10; z += 5) { const t = kit.trelica(W - 1, 0.35); t.position.set(0, S.alt - 0.6, z); g.add(t); }
  const pontos = new THREE.InstancedMesh(new THREE.CircleGeometry(0.09, 10), kit.m.luz(0xffffff), 60);
  const mtx = new THREE.Matrix4(), rot = new THREE.Matrix4().makeRotationX(Math.PI / 2);
  let k = 0;
  for (let x = -14; x <= 14; x += 4) for (let z = -9.5; z <= 9.5; z += 3.2) { if (k < 60) { mtx.makeTranslation(x, S.alt - 0.02, z).multiply(rot); pontos.setMatrixAt(k++, mtx); } }
  pontos.count = k; g.add(pontos);
  // palco
  const palco = new THREE.Mesh(new THREE.BoxGeometry(18, 1.0, 5.2), kit.m.brilho(0x15151a, 60)); palco.position.set(0, 0.5, S.z0 + 2.6); palco.receiveShadow = true; g.add(palco);
  const led = new THREE.Mesh(new THREE.PlaneGeometry(18, 0.16), kit.m.texB(kit.tex.arcoH)); led.position.set(0, 0.85, S.z0 + 5.21); g.add(led);
  for (const x of [-4, 4]) { const deg = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 0.8), kit.m.brilho(0x15151a, 60)); deg.position.set(x, 0.25, S.z0 + 5.6); g.add(deg); }
  // 3 telões
  const texT = await Promise.all(['telao-esquerda-daniel', 'telao-centro-arco-iris', 'telao-direita-20-anos'].map((n) => kit.imgTex(`/svg/teloes/${n}.svg`, 1920, 1080)));
  const teloes = texT.map((t, i) => {
    const tl = kit.tela(t, 5.6, 3.15, 0x0a0a0e, 0.18);
    tl.position.set((i - 1) * 6.4, 4.15, S.z0 + 0.6); g.add(tl);
    return tl;
  });
  const tPalco = kit.trelica(20, 0.4); tPalco.position.set(0, 6.25, S.z0 + 1.8); g.add(tPalco);
  for (const x of [-9.8, 9.8]) { const tv = kit.trelica(6.2, 0.4); tv.rotation.z = Math.PI / 2; tv.position.set(x, 3.1, S.z0 + 1.8); g.add(tv); }
  // caixas de som (line array)
  for (const x of [-10.8, 10.8]) for (let j = 0; j < 5; j++) { const cx = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.36, 0.7), kit.m.brilho(0x101012, 40)); cx.position.set(x, 5.6 - j * 0.38, S.z0 + 3.2); cx.rotation.x = j * 0.04; g.add(cx); }
  // refletores com feixes
  const refl = [];
  for (let i = 0; i < 8; i++) {
    const r = kit.refletor(ARCO[(i * 3) % 10], 8, 0.8);
    r.position.set(-8.4 + i * 2.4, 6.0, S.z0 + 1.8); g.add(r); refl.push(r);
  }
  // mesas com cadeiras (instanciadas)
  const geoC = geoCadeira(THREE);
  const posMesas = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) posMesas.push([-7.5 + i * 4.2, -3.2 + j * 4.0]);
  const cad = new THREE.InstancedMesh(geoC, kit.m.brilho(0xd4af5a, 80, { specular: 0x886622 }), posMesas.length * 8);
  let c = 0;
  const q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), pos = new THREE.Vector3(), eixo = new THREE.Vector3(0, 1, 0);
  posMesas.forEach(([x, z]) => {
    const mesa = kit.mesaRedonda(0xffffff, 0.95); mesa.position.set(x, 0, z); g.add(mesa);
    const v = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.16, 24), new THREE.MeshPhongMaterial({ map: kit.tex.arcoV, shininess: 80 })); v.position.set(x, 0.86, z); g.add(v);
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      pos.set(x + Math.sin(ang) * 1.35, 0, z + Math.cos(ang) * 1.35);
      q.setFromAxisAngle(eixo, ang + Math.PI);
      mtx.compose(pos, q, sc); cad.setMatrixAt(c++, mtx);
    }
  });
  g.add(cad);
  // buffet (parede direita) com 3 fornos
  const balcao = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.0, 13), kit.m.brilho(0x7a4e2a, 30, { map: kit.tex.madeira })); balcao.position.set(14.6, 0.5, -1); g.add(balcao);
  for (let i = 0; i < 3; i++) {
    const forno = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.62, 1.1), kit.m.brilho(0x26262a, 80)); forno.position.set(14.6, 1.32, -6 + i * 1.5); g.add(forno);
    const jan = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.32), kit.m.luz(0xff9a3a)); jan.position.set(14.14, 1.3, -6 + i * 1.5); jan.rotation.y = -Math.PI / 2; g.add(jan);
  }
  for (let i = 0; i < 6; i++) { const band = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 1.2), kit.m.cromo(0xdddddd, 0.3)); band.position.set(14.6, 1.05, -1 + i * 1.4); g.add(band); }
  const placaB = kit.tela(kit.texTexto([{ t: 'BUFFET', tam: 120 }], { w: 1024, h: 256, fundo: '#e5342e', arco: true }), 3.2, 0.8, 0xffffff, 0.08);
  placaB.position.set(15.85, 3.2, -1); placaB.rotation.y = -Math.PI / 2; g.add(placaB);
  // área gamer (esquerda, fundo)
  const telaGame = kit.canvasTex(512, 288, (cx, w, hh) => { const gr = cx.createLinearGradient(0, 0, w, hh); gr.addColorStop(0, '#2a0f5e'); gr.addColorStop(1, '#0f4f7a'); cx.fillStyle = gr; cx.fillRect(0, 0, w, hh); for (let i = 0; i < 18; i++) { cx.fillStyle = ARCO[i % 10]; cx.fillRect(20 + i * 26, hh - 40 - (i * 37) % 150, 18, 18); } cx.fillStyle = '#fff'; cx.font = '700 40px AG'; cx.fillText('GAME', 30, 60); });
  for (let i = 0; i < 4; i++) {
    const mesaG = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.75, 0.8), kit.m.brilho(0x1a1a22, 60)); mesaG.position.set(-15.2, 0.375, -9 + i * 2); mesaG.rotation.y = Math.PI / 2; g.add(mesaG);
    const mon = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.56), kit.m.texB(telaGame)); mon.position.set(-15.35, 1.15, -9 + i * 2); mon.rotation.y = Math.PI / 2; g.add(mon);
    const rgb = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.6), kit.m.luz(ARCO[i * 2 + 1])); rgb.position.set(-14.8, 0.76, -9 + i * 2); g.add(rgb);
  }
  // playground (esquerda, frente)
  const r = rng(4);
  for (let i = 0; i < 12; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5 + (i % 3) * 0.3, 0.9), kit.m.brilho(ARCO[i % 10], 40)); b.position.set(-14.6 + (i % 3) * 1.0, 0.25 + (i % 3) * 0.15, 2 + Math.floor(i / 3) * 1.1); g.add(b); }
  const esc = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 3.2), kit.m.brilho(0xf2d33a, 60)); esc.position.set(-12.2, 1.0, 4); esc.rotation.x = 0.55; g.add(esc);
  // convidados
  for (let i = 0; i < 46; i++) {
    const x = -13 + r() * 26, z = -6 + r() * 16;
    if (posMesas.some(([mx, mz]) => Math.hypot(mx - x, mz - z) < 1.8)) continue;
    const pp = kit.pessoa(0xf4f4f4, 1.55 + r() * 0.3); pp.position.set(x, 0, z); pp.rotation.y = r() * 6; g.add(pp);
  }
  // luzes do salão
  g.add(new THREE.HemisphereLight(0xd6d9ff, 0x2a2420, 1.0));
  const luzes = [[0, 5.5, 4, 0xffe2c0, 30], [-8, 5.5, -2, 0x8aa0ff, 22], [8, 5.5, -2, 0xffb0e0, 22], [0, 5.5, -6, 0xffffff, 26]];
  luzes.forEach(([x, y, z, cor, i]) => { const l = new THREE.PointLight(cor, i, 20); l.position.set(x, y, z); g.add(l); });
  g.userData = { teloes, refl, posMesas };
  return g;
}

export function animarRefletores(refl, t, pulso) {
  refl.forEach((r, i) => {
    r.rotation.z = Math.sin(t * 1.1 + i * 0.8) * 0.5;
    r.rotation.x = 0.35 + Math.cos(t * 0.9 + i) * 0.25;
    r.userData.feixe.material.opacity = 0.07 + 0.08 * pulso;
  });
}

async function salao({ THREE, kit, raiz }) {
  const cena = kit.novaCena({ fundo: 0x050508 });
  const cam = kit.camera(50);
  const sal = await montarSalao(THREE, kit);
  cena.add(sal);
  const L = camada(raiz);
  const sc = scrim(L);
  sc.style.background = 'linear-gradient(180deg, rgba(4,6,30,0.8) 0%, rgba(4,6,30,0.35) 30%, rgba(4,6,30,0) 45%)';
  const card = cartaoTitulo(L, { k: 'ONDE TUDO ACONTECE', t: 'SALÃO PRINCIPAL', sub: 'Palco com 3 telões · mesas · buffet · área gamer · playground', y: 150, cls: 'tit-m', largura: 1400 });
  const pins = [
    ['Palco · 3 telões', 'Daniel · arco-íris · 20 Anos', [3, 1.0, -7], 60, '#7b3fe0'],
    ['Mesas', 'cartão de agradecimento', [-3.3, 1.0, 0.8], 90, '#2fc27a'],
    ['Buffet', '2 a 3 fornos alugados', [14.6, 1.8, -4.5], 110, '#e5342e'],
    ['Área Gamer', 'consoles · PCs · portáteis', [-15.2, 1.4, -6], 70, '#d6247e'],
    ['Playground', 'espaço kids', [-13.6, 1.2, 4.5], 60, '#f26b2a'],
  ].map(([t, s, p, a, c]) => ({ pin: pino(L, t, s, c), v: new THREE.Vector3(...p), a }));
  return {
    cena, cam,
    upd(lt, S) {
      const p = E.inOutCubic(seg(lt, 0, S.dur));
      cam.position.set(lerp(6, -2.5, p), lerp(5.4, 3.2, p), lerp(13, 5.5, p));
      cam.lookAt(lerp(-1, 0, p), lerp(2.2, 2.8, p), -6);
      animarRefletores(sal.userData.refl, S.t, S.pulso);
      card.upd(lt, 0.3);
      pins.forEach((o, i) => o.pin.upd(lt, 1.3 + i * 2.2, projetar(THREE, o.v, cam), o.a, i < 4 ? 1.3 + i * 2.2 + 3.4 : null));
    },
  };
}

async function teloes({ THREE, kit, raiz }) {
  const cena = kit.novaCena({ fundo: 0x050508 });
  const cam = kit.camera(44);
  const sal = await montarSalao(THREE, kit);
  cena.add(sal);
  const L = camada(raiz);
  const sc = scrim(L);
  sc.style.background = 'linear-gradient(0deg, rgba(4,6,30,0.9) 0%, rgba(4,6,30,0.5) 26%, rgba(4,6,30,0) 42%)';
  const k = kicker(L, 'PALCO · 3 TELÕES');
  k.el.style.cssText += 'left:110px;top:150px';
  const rot = [['ESQUERDA', 'DANIEL'], ['CENTRO', 'ARCO-ÍRIS'], ['DIREITA', '20 ANOS']].map(([a, b], i) => {
    const e = h('div', '', L);
    e.style.cssText = 'position:absolute;top:0;left:0;width:420px;margin-left:-210px;text-align:center';
    e.innerHTML = `<div class="mini" style="font-size:20px">${a}</div><div class="ag" style="font-size:52px;text-shadow:0 3px 14px #000">${vg(b)}</div>`;
    return e;
  });
  const nota = h('div', 'sub', L, 'Arte atualizada de <b>18 para 20 anos</b> na fonte <b>ITC Avant Garde Gothic Bold</b>, com o <b>V</b> e o <b>A</b> da Vanguarda.');
  nota.style.cssText += 'position:absolute;left:0;right:0;top:985px;text-align:center;font-size:27px';
  return {
    cena, cam,
    upd(lt, S) {
      const p = E.inOutSine(seg(lt, 0, S.dur));
      cam.position.set(lerp(-1.2, 1.2, p), lerp(2.6, 2.9, p), lerp(4.0, 2.6, p));
      cam.lookAt(0, 3.7, -12);
      animarRefletores(sal.userData.refl, S.t, S.pulso);
      k.upd(lt, 0.2);
      sal.userData.teloes.forEach((tl, i) => {
        const pr = projetar(THREE, new THREE.Vector3(tl.position.x, 2.35, tl.position.z), cam);
        rot[i].style.left = pr.x.toFixed(1) + 'px';
        fx(rot[i], lt, { a: 0.6 + i * 0.35, d: 0.6, y: 30, blur: 8, by: pr.y + 30 });
        const pulsoTela = 1 + 0.04 * S.forte;
        tl.userData.img.scale.setScalar(pulsoTela);
      });
      fx(nota, lt, { a: 1.8, d: 0.7, y: 20, blur: 6 });
    },
  };
}

async function mesas({ THREE, kit, raiz }) {
  const cena = kit.novaCena({ fundo: 0x050508 });
  const cam = kit.camera(38);
  const sal = await montarSalao(THREE, kit);
  cena.add(sal);
  const [mx, mz] = sal.userData.posMesas[4];
  // cartão de agradecimento (tenda) na mesa
  const cartao = kit.canvasTex(1024, 640, (g, w, hh) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, hh);
    ARCO.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * w / 10, 0, w / 10 + 1, 26); g.fillRect(i * w / 10, hh - 26, w / 10 + 1, 26); });
    g.textAlign = 'center'; g.fillStyle = '#12163a';
    g.font = '700 92px AG'; g.fillText(vg('OBRIGADO'), w / 2, 190);
    g.font = '600 46px Inter'; g.fillText('por vir à minha festa', w / 2, 290); g.fillText('de 20 anos!', w / 2, 350);
    g.font = 'italic 600 54px Georgia'; g.fillStyle = '#7b3fe0'; g.fillText('— Daniel', w / 2, 470);
    g.font = '700 30px Inter'; g.fillStyle = '#8a90b0'; g.fillText('2029 · TEMA REDE VANGUARDA', w / 2, 560);
  });
  const tenda = new THREE.Group();
  for (const s of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.21), s > 0 ? kit.m.texB(cartao) : kit.m.fosco(0xffffff, { side: 2 }));
    f.position.set(0, 0.095, s * 0.035); f.rotation.x = -s * 0.32; if (s < 0) f.rotation.y = Math.PI; tenda.add(f);
  }
  tenda.position.set(mx, 0.785, mz + 0.42); tenda.scale.setScalar(1.7); cena.add(tenda);
  // pratos e taças
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2;
    const prato = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.015, 24), kit.m.brilho(0xffffff, 90)); prato.position.set(mx + Math.sin(ang) * 0.72, 0.79, mz + Math.cos(ang) * 0.72); cena.add(prato);
    const taca = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.02, 0.14, 12, 1, true), new THREE.MeshPhongMaterial({ color: 0xddeeff, transparent: true, opacity: 0.45, shininess: 120 })); taca.position.set(mx + Math.sin(ang + 0.3) * 0.62, 0.86, mz + Math.cos(ang + 0.3) * 0.62); cena.add(taca);
  }
  const luz = new THREE.PointLight(0xffe8cc, 12, 6); luz.position.set(mx + 0.5, 2.4, mz + 1.5); cena.add(luz);
  const L = camada(raiz);
  const sc = scrim(L);
  const card = cartaoTitulo(L, { k: 'MESAS DOS CONVIDADOS', t: 'OBRIGADO POR VIR!', sub: 'Em cada mesa, um cartão de <b>agradecimento</b><br>do aniversariante e o mini <b>V</b> da Vanguarda.', y: 200, cls: 'tit-m', largura: 1000 });
  return {
    cena, cam,
    upd(lt, S) {
      const ang = lerp(0.42, 0.08, E.inOutSine(seg(lt, 0, S.dur)));
      const dist = lerp(1.9, 1.35, E.inOutSine(seg(lt, 0, S.dur)));
      cam.position.set(mx + Math.sin(ang) * dist, lerp(1.35, 1.15, lt / S.dur), mz + 0.42 + Math.cos(ang) * dist);
      cam.lookAt(mx - 0.32, 0.93, mz + 0.42);
      animarRefletores(sal.userData.refl, S.t, S.pulso);
      card.upd(lt, 0.2);
    },
  };
}

export default { salao, teloes, mesas };
