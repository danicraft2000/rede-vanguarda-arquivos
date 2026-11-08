// O local (fachada 3D), o horário da festa e a planta 3D (maquete).
import { E, seg, lerp, kf, ruido } from '../core/anim.js';
import { h, camada, fx, fxLetras, titulo, kicker, fundo2D, vg, ARCO, pino, projetar } from '../core/ui.js';
import { ZONAS } from '../core/layout.js';
import { fachada, maquete } from './predio.js';

export function cartaoTitulo(L, { k, t, sub, x = 110, y = 640, cls = 'tit-m', largura = 1100 }) {
  const box = h('div', '', L);
  box.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${largura}px`;
  const kk = kicker(box, k);
  kk.el.style.cssText += 'position:relative;margin-bottom:14px';
  const tt = titulo(box, t, cls + ' cromo');
  tt.el.style.position = 'relative';
  const ss = h('div', 'sub', box, sub);
  ss.style.cssText += 'position:relative;margin-top:16px';
  return {
    box,
    upd(lt, a = 0.2, out = null) {
      kk.upd(lt, a, out);
      fxLetras(tt.spans, lt, { a: a + 0.15, st: 0.03, d: 0.55, y: 60, rx: -80, z: -150, blur: 10, out, od: 0.3 });
      fx(ss, lt, { a: a + 0.55, d: 0.6, y: 24, blur: 8, out, od: 0.3 });
    },
  };
}

async function local({ THREE, kit, raiz }) {
  const cena = kit.novaCena({ fundo: null, nevoa: [0xcfe3f5, 60, 200] });
  cena.background = kit.ceu([[0, '#3f86d6'], [0.55, '#8fc3ee'], [1, '#e3f1fb']]);
  const cam = kit.camera(42);
  kit.luzes(cena, { hemi: [0xe6f0ff, 0x6a6050, 1.5], dir: [0xfff1d8, 2.6, [30, 40, 40]], sombra: true, area: 42, alvo: [0, 0, 5] });
  cena.add(fachada(THREE, kit));
  // placa do espaço
  const placa = kit.tela(kit.texTexto([{ t: 'ESPAÇO ARMAZÉM', tam: 92, y: 0.42 }, { t: 'MORENOS EVENTOS', tam: 44, y: 0.78, cor: '#c9d1ff', fonte: 'Inter', peso: 700 }], { w: 1024, h: 300, fundo: '#101433', arco: true }), 3.4, 1.0, 0x22252c, 0.1);
  placa.position.set(9.5, 2.0, 22.8);
  cena.add(placa);
  const poste = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2, 0.12), kit.m.fosco(0x333333)); poste.position.set(9.5, 0.75, 22.75); cena.add(poste);

  const L = camada(raiz);
  const scrim = h('div', '', L);
  scrim.style.cssText = 'position:absolute;inset:0;background:linear-gradient(90deg, rgba(4,6,30,0.82) 0%, rgba(4,6,30,0.55) 38%, rgba(4,6,30,0) 62%), linear-gradient(0deg, rgba(4,6,30,0.7) 0%, rgba(4,6,30,0) 40%)';
  const card = cartaoTitulo(L, { k: 'O LOCAL', t: 'ESPAÇO ARMAZÉM', sub: '<b>Morenos Eventos</b> · R. Jaguaré Mirim, 164<br>Vila Leopoldina · São Paulo – SP · CEP 05311-020', y: 560 });
  // mapa estilizado
  const mapa = h('div', 'painel', L);
  mapa.style.cssText += 'left:1330px;top:300px;width:480px;height:430px;padding:26px';
  mapa.innerHTML = `<div class="mini" style="font-size:17px">LOCALIZAÇÃO</div>
    <svg width="428" height="300" viewBox="0 0 428 300" style="margin-top:12px">
      <rect width="428" height="300" rx="14" fill="#0b0f2e"/>
      ${Array.from({ length: 9 }, (_, i) => `<path d="M${-20 + i * 56} 0 L${30 + i * 56} 300" stroke="#26306a" stroke-width="10"/>`).join('')}
      ${Array.from({ length: 6 }, (_, i) => `<path d="M0 ${20 + i * 56} L428 ${-10 + i * 56}" stroke="#26306a" stroke-width="10"/>`).join('')}
      <path d="M0 250 C120 230 260 270 428 210" stroke="#2c6fb0" stroke-width="22" fill="none" stroke-opacity="0.8"/>
      <path d="M0 140 L428 120" stroke="#f2d33a" stroke-width="6"/>
      <text x="16" y="112" font-family="Inter" font-weight="700" font-size="15" fill="#f2d33a">R. Jaguaré Mirim</text>
      <g id="pinoMapa" transform="translate(236 128)"><circle r="34" fill="#d6247e" fill-opacity="0.25"/><path d="M0 0 C-22 -26 -22 -58 0 -62 C22 -58 22 -26 0 0 Z" fill="#d6247e" stroke="#fff" stroke-width="4"/><circle cx="0" cy="-40" r="9" fill="#fff"/></g>
    </svg>
    <div style="font-size:22px;font-weight:700;margin-top:12px">Vila Leopoldina · Zona Oeste de SP</div>`;
  const pinoMapa = mapa.querySelector('#pinoMapa');
  const chips = ['2 salões para eventos', 'Acesso fácil pelas Marginais', 'Festa: 15:30 → 23:45'].map((t, i) => {
    const c = h('div', 'chip', L, `<i style="background:${ARCO[i * 3]}"></i>${t}`);
    c.style.cssText += `position:absolute;left:110px;top:900px;transform-origin:left`;
    c.style.left = 110 + [0, 345, 790][i] + 'px';
    return c;
  });

  return {
    cena, cam,
    upd(lt, S) {
      const p = E.inOutCubic(seg(lt, 0, S.dur));
      cam.position.set(lerp(-7, 12, p), lerp(1.8, 7.5, p), lerp(44, 34, p));
      cam.lookAt(lerp(-6, 0, p), lerp(3.2, 3.0, p), 10);
      scrim.style.opacity = E.outCubic(seg(lt, 0, 0.8)).toFixed(3);
      card.upd(lt, 0.4);
      fx(mapa, lt, { a: 1.4, d: 0.8, x: 80, ry: -25, blur: 8 });
      pinoMapa.setAttribute('transform', `translate(236 ${(128 - 30 * (1 - E.outBack(seg(lt, 2.0, 2.6)))).toFixed(1)}) scale(${(1 + 0.08 * S.pulso).toFixed(3)})`);
      chips.forEach((c, i) => fx(c, lt, { a: 2.4 + i * 0.3, d: 0.5, y: 20, s: 0.6, e: E.outBack }));
    },
  };
}

async function horario({ raiz }) {
  const fundo = fundo2D(raiz, 'azul', 33);
  const L = camada(raiz);
  const k = kicker(L, 'HORÁRIO DA FESTA');
  k.el.style.cssText += 'left:150px;top:150px';
  const big = h('div', 'tit', L);
  big.style.cssText += 'position:absolute;left:150px;top:215px;font-size:170px';
  const ini = h('span', '', big, '15:30');
  const seta = h('span', '', big, ' → ');
  seta.style.cssText = 'font-family:Inter;font-weight:300;color:#9fb0ff';
  const fim = h('span', '', big, '23:45');
  const dur = h('div', 'sub', L, 'São <b>8 horas e 15 minutos</b> de festa, com 3 liberações de comida.');
  dur.style.cssText += 'position:absolute;left:150px;top:420px';
  // linha do tempo
  const X0 = 190, X1 = 1730, Y = 730;
  const tl = h('div', '', L);
  tl.style.cssText = `position:absolute;left:${X0}px;top:${Y}px;width:${X1 - X0}px;height:10px;border-radius:5px;background:rgba(255,255,255,0.14)`;
  const tlIn = h('div', '', tl);
  tlIn.style.cssText = `position:absolute;inset:0;border-radius:5px;background:linear-gradient(90deg,${ARCO.join(',')});transform-origin:left`;
  const minutos = (s) => { const [a, b] = s.split(':').map(Number); return a * 60 + b; };
  const m0 = minutos('15:30'), m1 = minutos('23:45');
  const marcos = [
    ['15:30', 'Abertura', 'Recepção, presentes e lembrancinhas'],
    ['16:00', 'Pizza', 'Self-service'],
    ['18:30', 'Subway artesanal', 'Monte o seu lanche'],
    ['20:30', 'Sobremesas', 'Waffles, churros e doces'],
    ['23:45', 'Encerramento', 'Até a próxima!'],
  ].map(([hr, t, s], i) => {
    const x = X0 + ((minutos(hr) - m0) / (m1 - m0)) * (X1 - X0);
    const m = h('div', '', L);
    const cima = i % 2 === 0;
    m.style.cssText = `position:absolute;left:${x}px;top:${Y + 5}px;width:0;height:0`;
    m.innerHTML = `<div style="position:absolute;left:-17px;top:-17px;width:34px;height:34px;border-radius:50%;background:#fff;border:7px solid ${ARCO[i * 2]};box-shadow:0 0 20px ${ARCO[i * 2]}"></div>
      <div style="position:absolute;left:-1.5px;${cima ? 'bottom:22px' : 'top:22px'};width:3px;height:52px;background:rgba(255,255,255,0.5)"></div>
      <div style="position:absolute;${cima ? 'bottom:80px' : 'top:80px'};left:${i === 4 ? -300 : i === 0 ? -20 : -150}px;width:300px;text-align:${i === 4 ? 'right' : i === 0 ? 'left' : 'center'}">
        <div class="ag" style="font-size:52px;color:${ARCO[i * 2]};text-shadow:0 2px 12px rgba(0,0,0,.6)">${hr}</div>
        <div style="font-size:28px;font-weight:800">${t}</div><div style="font-size:21px;color:#c9d1ff;font-weight:500">${s}</div></div>`;
    return { m, x };
  });
  return {
    upd(lt, S) {
      fundo.upd(lt, S.pulso);
      k.upd(lt, 0.05);
      fx(ini, lt, { a: 0.2, d: 0.6, y: 60, rx: -70, blur: 10 });
      fx(seta, lt, { a: 0.5, d: 0.5, x: -40, blur: 8 });
      fx(fim, lt, { a: 0.7, d: 0.6, y: 60, rx: -70, blur: 10 });
      fx(dur, lt, { a: 1.1, d: 0.6, y: 20, blur: 6 });
      const p = E.inOutCubic(seg(lt, 1.5, 7.5));
      tlIn.style.transform = `scaleX(${p.toFixed(4)})`;
      marcos.forEach(({ m, x }) => {
        const a = 1.5 + 6 * ((x - X0) / (X1 - X0)) - 0.1;
        fx(m, lt, { a, d: 0.5, s: 0.3, e: E.outBack });
      });
    },
  };
}

async function planta({ THREE, kit, raiz }) {
  const cena = kit.novaCena({ fundo: null });
  cena.background = kit.fundoRadial('#2c3592', '#141a5a', '#05061c');
  const cam = kit.camera(36);
  kit.luzes(cena, { hemi: [0xffffff, 0x404060, 1.7], dir: [0xffffff, 2.0, [-30, 50, 30]], sombra: true, area: 40 });
  const maq = maquete(THREE, kit);
  cena.add(maq);
  const L = camada(raiz);
  const card = cartaoTitulo(L, { k: 'PLANTA DA FESTA', t: 'O ESPAÇO TODO', sub: 'Maquete ilustrativa · layout proposto e adaptável ao espaço real', x: 110, y: 150, cls: 'tit-p', largura: 900 });
  const lista = [
    ['estacionamento', 'Estacionamento', '', [-8, 0, 19], 50],
    ['entrada', 'Entrada', '', [0, 1.5, 8], 70],
    ['sala', 'Sala de Estar', '', [-10, 1, 9], 50],
    ['banheiros', '4 Banheiros', '', [-20, 1.2, 8], 90],
    ['palco', 'Palco · 3 Telões', '', [-6, 3.8, -18], 40],
    ['mesas', 'Mesas', '', [-6, 1, -6], 50],
    ['buffet', 'Buffet', '', [6.5, 2, -4], 70],
    ['gamer', 'Área Gamer', '', [-21, 1.5, -11], 50],
    ['playground', 'Playground', '', [-21, 1.2, 0], 60],
    ['museu', 'Museu Vanguarda', '', [16, 2.5, 6], 50],
    ['estudios', 'Estúdios', '', [16, 2.5, -14], 50],
  ].map(([z, t, s, p, alt]) => ({ pin: pino(L, t, s, ZONAS[z].cor), v: new THREE.Vector3(...p), alt }));
  return {
    cena, cam,
    upd(lt, S) {
      const p = E.inOutCubic(seg(lt, 0, S.dur));
      const ang = lerp(0.12, -0.32, p);
      const raio = lerp(48, 66, p);
      cam.position.set(Math.sin(ang) * raio, lerp(96, 70, E.outCubic(seg(lt, 0, S.dur * 0.8))), Math.cos(ang) * raio + 2);
      cam.lookAt(0, 0, 1);
      cam.setViewOffset(1920, 1080, -250, 30, 1920, 1080);
      card.upd(lt, 0.2);
      lista.forEach((o, i) => o.pin.upd(lt, 1.2 + i * 0.55, projetar(THREE, o.v, cam), o.alt));
    },
  };
}

export default { local, horario, planta };
