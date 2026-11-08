// Cardápio em grafismo 2D animado: Pizza (16:00), Subway artesanal (18:30) e Sobremesas (20:30).
import { E, seg, lerp, rng } from '../core/anim.js';
import { h, camada, fx, fxLetras, titulo, kicker, fundo2D, vg, ARCO } from '../core/ui.js';
import { COMPASSO } from '../core/timeline.js';

function cabecalho(L, k, t, sub, top = 150) {
  const kk = kicker(L, k);
  kk.el.style.cssText += `left:110px;top:${top}px`;
  const tt = titulo(L, t, 'tit-m cromo');
  tt.el.style.cssText += `position:absolute;left:110px;top:${top + 50}px`;
  const ss = h('div', 'sub', L, sub);
  ss.style.cssText += `position:absolute;left:110px;top:${top + 152}px;width:820px`;
  return (lt) => { kk.upd(lt, 0.05); fxLetras(tt.spans, lt, { a: 0.15, st: 0.035, d: 0.55, y: 60, rx: -80, z: -150, blur: 10 }); fx(ss, lt, { a: 0.6, d: 0.6, y: 20, blur: 6 }); };
}

function listaChips(parent, itens, cols = 2, cor0 = 0) {
  const box = h('div', '', parent);
  box.style.cssText = `display:grid;grid-template-columns:repeat(${cols}, auto);gap:14px 14px;justify-content:start`;
  return itens.map((t, i) => h('div', 'chip', box, `<i style="background:${ARCO[(cor0 + i * 2) % 10]}"></i>${t}`));
}

// ---------------------------------------------------------------- PIZZA
function svgPizza() {
  const r = rng(16);
  let cob = '';
  for (let i = 0; i < 16; i++) { const a = r() * Math.PI * 2, d = 40 + r() * 170; cob += `<circle cx="${(Math.cos(a) * d).toFixed(0)}" cy="${(Math.sin(a) * d).toFixed(0)}" r="${16 + r() * 8}" fill="#c0392b" stroke="#8e2a1f" stroke-width="3"/>`; }
  for (let i = 0; i < 12; i++) { const a = r() * Math.PI * 2, d = 30 + r() * 180; cob += `<circle cx="${(Math.cos(a) * d).toFixed(0)}" cy="${(Math.sin(a) * d).toFixed(0)}" r="8" fill="#1d1d1d"/><circle cx="${(Math.cos(a) * d).toFixed(0)}" cy="${(Math.sin(a) * d).toFixed(0)}" r="3.5" fill="#f2c94c"/>`; }
  for (let i = 0; i < 9; i++) { const a = r() * Math.PI * 2, d = 40 + r() * 160; cob += `<ellipse cx="${(Math.cos(a) * d).toFixed(0)}" cy="${(Math.sin(a) * d).toFixed(0)}" rx="14" ry="7" fill="#3f9a3c" transform="rotate(${(r() * 180).toFixed(0)} ${(Math.cos(a) * d).toFixed(0)} ${(Math.sin(a) * d).toFixed(0)})"/>`; }
  const cortes = Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return `<line x1="0" y1="0" x2="${(Math.cos(a) * 250).toFixed(0)}" y2="${(Math.sin(a) * 250).toFixed(0)}" stroke="#b5762c" stroke-width="5" stroke-opacity="0.7"/>`; }).join('');
  return `<svg width="620" height="620" viewBox="-310 -310 620 620" style="overflow:visible">
    <defs><radialGradient id="pzQ" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffe08a"/><stop offset="0.8" stop-color="#f6c453"/><stop offset="1" stop-color="#e09b2d"/></radialGradient>
    <radialGradient id="pzM" cx="0.5" cy="0.45" r="0.55"><stop offset="0.86" stop-color="#e2a35a"/><stop offset="1" stop-color="#a8642a"/></radialGradient></defs>
    <circle r="290" fill="#000" fill-opacity="0.35" transform="translate(14 22)"/>
    <circle r="290" fill="url(#pzM)"/>
    <circle r="250" fill="#c8402a"/>
    <circle r="242" fill="url(#pzQ)"/>
    <g class="cob">${cob}</g>
    ${cortes}
  </svg>`;
}

async function pizza({ raiz }) {
  const fundo = fundo2D(raiz, 'quente', 61);
  const L = camada(raiz);
  const cab = cabecalho(L, '16:00 · 1ª LIBERAÇÃO', 'PIZZA', '<b>Self-service</b>: cada convidado se serve à vontade, com fatias sempre quentinhas.');
  const box = h('div', '', L);
  box.style.cssText = 'position:absolute;left:110px;top:430px;width:900px';
  const t1 = h('div', 'tit-p', box, 'SALGADAS'); t1.style.cssText += 'font-size:34px;color:#ffd27a;margin-bottom:14px';
  const sal = listaChips(box, ['Mussarela', 'Calabresa', 'Margherita', 'Portuguesa', 'Frango com Catupiry', 'Quatro Queijos', 'Pepperoni', 'Napolitana'], 2, 0);
  const t2 = h('div', 'tit-p', box, 'DOCES'); t2.style.cssText += 'font-size:34px;color:#f7a8c4;margin:26px 0 14px';
  const doc = listaChips(box, ['Chocolate com morango', 'Banana com canela', 'Romeu e Julieta'], 2, 5);
  const pz = h('div', '', L, svgPizza());
  pz.style.cssText = 'position:absolute;left:1150px;top:250px;width:620px;height:620px';
  const svg = pz.querySelector('svg');
  return {
    upd(lt, S) {
      fundo.upd(lt, S.pulso);
      cab(lt);
      fx(t1, lt, { a: 0.9, d: 0.5, x: -30, blur: 6 });
      sal.forEach((c, i) => fx(c, lt, { a: 1.0 + i * 0.12, d: 0.45, s: 0.4, y: 16, e: E.outBack }));
      fx(t2, lt, { a: 2.0, d: 0.5, x: -30, blur: 6 });
      doc.forEach((c, i) => fx(c, lt, { a: 2.1 + i * 0.15, d: 0.45, s: 0.4, y: 16, e: E.outBack }));
      fx(pz, lt, { a: 0.3, d: 1.0, s: 0.2, rz: -180, e: E.outBack, bs: 1 + 0.025 * S.forte });
      svg.style.transform = `rotate(${(lt * 14).toFixed(2)}deg)`;
    },
  };
}

// ---------------------------------------------------------------- SUBWAY ARTESANAL
const PASSOS = [
  ['PÃES 15 CM', ['Italiano', '3 Queijos', 'Parmesão e Orégano', 'Integral'], 'Escolha o pão'],
  ['PROTEÍNAS', ['Carne de churrasco', 'Frango grelhado', 'Frango defumado c/ cream cheese', 'Almôndegas de carne', 'Frango empanado'], 'O recheio principal'],
  ['QUEIJOS', ['Mussarela', 'Prato', 'Provolone', 'Suíço'], 'Derrete no forno'],
  ['ADICIONAIS', ['Cream cheese', 'Cheddar', 'Pepperoni', 'Salame', 'Presunto', 'Bacon', 'Cebola crispy (farofa)'], 'Turbine o lanche'],
  ['FORNO', ['2 a 3 fornos alugados', 'Pão e queijo quentinhos', 'Na hora, sem fila longa'], 'Para esquentar'],
  ['SALADAS', ['Alface', 'Tomate', 'Cebola roxa', 'Pimentão', 'Pepino', 'Picles'], 'Frescor'],
  ['MOLHOS', ['Maionese temperada', 'Maionese tradicional', 'Barbecue', 'Supreme', 'Ranch', 'Parmesão', 'Mostarda e mel', 'Molho apimentado'], 'Escolha à vontade'],
  ['TEMPEROS', ['Sal', 'Pimenta-do-reino', 'Orégano', 'Queijo ralado'], 'Toppings finais'],
  ['ACOMPANHAMENTOS', ['Batata frita rústica', 'Cookies', 'Refrigerante em lata', 'Copo com refil'], 'Para completar'],
];

function camadasSanduiche() {
  const r = rng(30);
  const W = 560;
  const sementes = Array.from({ length: 26 }, () => `<ellipse cx="${(30 + r() * (W - 60)).toFixed(0)}" cy="${(8 + r() * 40).toFixed(0)}" rx="5" ry="2.6" fill="#fff3d6" transform="rotate(${(r() * 60 - 30).toFixed(0)})"/>`).join('');
  return [
    // 0 pão de baixo
    `<g><rect x="0" y="0" width="${W}" height="62" rx="28" fill="url(#paoB)"/><rect x="10" y="4" width="${W - 20}" height="10" rx="5" fill="#f5d39a" fill-opacity="0.6"/></g>`,
    // 1 proteína
    `<g>${Array.from({ length: 7 }, (_, i) => `<path d="M${10 + i * 78} 34 q39 -40 80 0 q-40 22 -80 0z" fill="${i % 2 ? '#7a3f1f' : '#9a5a2e'}"/>`).join('')}<rect x="6" y="18" width="${W - 12}" height="20" rx="10" fill="#8a4a24"/></g>`,
    // 2 queijo
    `<g><path d="M0 10 h${W} v12 ${Array.from({ length: 8 }, (_, i) => `l-${W / 16} 18 l-${W / 16} -18`).join(' ')} z" fill="#f6c94c"/></g>`,
    // 3 adicionais
    `<g>${Array.from({ length: 6 }, (_, i) => `<ellipse cx="${50 + i * 92}" cy="16" rx="40" ry="10" fill="#c0392b"/>`).join('')}${Array.from({ length: 4 }, (_, i) => `<path d="M${30 + i * 130} 26 q30 -14 60 0 t60 0" stroke="#d98a6a" stroke-width="10" fill="none"/>`).join('')}</g>`,
    // 4 forno (brilho)
    `<g class="forno"><rect x="-20" y="-150" width="${W + 40}" height="180" rx="40" fill="#ff8a2a" fill-opacity="0.22"/>${[0, 1, 2].map((i) => `<path d="M${180 + i * 100} -40 q-18 -30 0 -60 q18 -30 0 -60" stroke="#ffb46a" stroke-width="8" fill="none" stroke-linecap="round" stroke-opacity="0.8"/>`).join('')}</g>`,
    // 5 saladas
    `<g><path d="M-10 26 ${Array.from({ length: 12 }, (_, i) => `q24 -36 ${W / 12 + 4} 0`).join(' ')} v8 h-${W + 40} z" fill="#5fbf4a"/>${Array.from({ length: 5 }, (_, i) => `<rect x="${40 + i * 105}" y="2" width="70" height="16" rx="8" fill="#e5342e"/>`).join('')}${Array.from({ length: 4 }, (_, i) => `<ellipse cx="${90 + i * 120}" cy="0" rx="22" ry="7" fill="none" stroke="#9b4fd0" stroke-width="5"/>`).join('')}</g>`,
    // 6 molhos (zigue-zague)
    `<g>${['#fff2c4', '#8a3a14', '#f2d33a'].map((c, k) => `<path d="M20 ${4 + k * 6} ${Array.from({ length: 10 }, (_, i) => `l${W / 20} ${i % 2 ? -10 : 10} l${W / 20} ${i % 2 ? 10 : -10}`).join(' ')}" stroke="${c}" stroke-width="7" fill="none" stroke-linecap="round"/>`).join('')}</g>`,
    // 7 temperos
    `<g>${Array.from({ length: 50 }, () => `<circle cx="${(10 + r() * (W - 20)).toFixed(0)}" cy="${(-r() * 30).toFixed(0)}" r="${(1.5 + r() * 3).toFixed(1)}" fill="${r() > 0.5 ? '#2a5a1a' : '#f3ead0'}"/>`).join('')}</g>`,
    // 8 pão de cima
    `<g><path d="M0 70 q0 -78 ${W / 2} -78 q${W / 2} 0 ${W / 2} 78 z" fill="url(#paoC)"/>${sementes}</g>`,
  ];
}
// alturas (y do topo de cada camada, empilhando de baixo para cima)
const ALT_CAMADA = [0, -40, -58, -78, -78, -110, -122, -128, -196];

function svgAcompanhamentos() {
  return `<svg width="560" height="200" viewBox="0 0 560 200">
    <g class="ac0" transform="translate(40 30)"><path d="M0 40 L20 160 H100 L120 40 Z" fill="#e5342e"/>${Array.from({ length: 9 }, (_, i) => `<rect x="${10 + i * 11}" y="${-10 + (i % 3) * 8}" width="9" height="60" rx="3" fill="#f6c453" transform="rotate(${(i - 4) * 4} 60 40)"/>`).join('')}<path d="M0 40 L20 160 H100 L120 40 Z" fill="#e5342e"/><text x="60" y="110" text-anchor="middle" font-family="AG" font-size="26" fill="#fff">BATATA</text></g>
    <g class="ac1" transform="translate(250 70)"><circle cx="50" cy="50" r="50" fill="#c88a4a"/>${[[25, 30], [60, 25], [45, 60], [72, 62], [30, 72]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#4a2a14"/>`).join('')}</g>
    <g class="ac2" transform="translate(420 20)"><rect x="0" y="10" width="80" height="150" rx="14" fill="#c9cfdb"/><rect x="0" y="40" width="80" height="80" fill="#d6247e"/><rect x="12" y="0" width="56" height="14" rx="6" fill="#aeb6c6"/><text x="40" y="90" text-anchor="middle" font-family="AG" font-size="22" fill="#fff">REFRI</text></g>
  </svg>`;
}

async function subway({ raiz }) {
  const fundo = fundo2D(raiz, 'quente', 77);
  const L = camada(raiz);
  const cab = cabecalho(L, '18:30 · 2ª LIBERAÇÃO', 'SUBWAY ARTESANAL', '<b>Self-service</b>: monte o seu lanche do seu jeito, passo a passo.');
  // sanduíche
  const sand = h('div', '', L);
  sand.style.cssText = 'position:absolute;left:150px;top:520px;width:640px;height:420px';
  const cam = camadasSanduiche();
  sand.innerHTML = `<svg width="640" height="420" viewBox="-40 -300 640 420" style="overflow:visible">
    <defs><linearGradient id="paoB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2a35a"/><stop offset="1" stop-color="#a8642a"/></linearGradient>
    <linearGradient id="paoC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d98f3e"/><stop offset="1" stop-color="#b8702c"/></linearGradient></defs>
    <ellipse cx="280" cy="80" rx="300" ry="24" fill="#000" fill-opacity="0.35"/>
    <rect x="-30" y="60" width="620" height="16" rx="8" fill="#c9a46a"/>
    ${cam.map((c, i) => `<g class="cm" data-i="${i}">${c}</g>`).join('')}
  </svg>`;
  const camadas = [...sand.querySelectorAll('.cm')];
  const acomp = h('div', '', L, svgAcompanhamentos());
  acomp.style.cssText = 'position:absolute;left:180px;top:820px;width:560px;height:200px';
  const acs = [0, 1, 2].map((i) => acomp.querySelector('.ac' + i));
  const acsBase = acs.map((a) => a.getAttribute('transform'));
  // painéis dos passos
  const paineis = PASSOS.map(([t, itens, dica], i) => {
    const p = h('div', 'painel', L);
    p.style.cssText += 'left:960px;top:300px;width:850px;padding:40px 50px 44px';
    const n = h('div', 'ag', p, String(i + 1).padStart(2, '0'));
    n.style.cssText = `font-size:120px;line-height:1;position:absolute;right:46px;top:30px;color:transparent;-webkit-text-stroke:3px ${ARCO[(i * 1) % 10]};opacity:0.8`;
    const d = h('div', 'mini', p, `PASSO ${i + 1} DE 9 · ${dica}`); d.style.cssText += 'font-size:19px;color:#c9d1ff';
    const tt = h('div', 'tit-p', p, vg(t)); tt.style.cssText += `margin:10px 0 26px;font-size:${t.length > 12 ? 50 : 62}px`;
    const chips = listaChips(p, itens, itens.length > 5 ? 2 : 1, i);
    return { p, tt, chips };
  });
  const pontos = h('div', '', L);
  pontos.style.cssText = 'position:absolute;left:960px;top:915px;display:flex;gap:12px';
  const dots = PASSOS.map((_, i) => { const d = h('div', '', pontos); d.style.cssText = `width:60px;height:10px;border-radius:5px;background:${ARCO[i]};opacity:0.25`; return d; });
  const B = COMPASSO;
  return {
    upd(lt, S) {
      fundo.upd(lt, S.pulso);
      cab(lt);
      const passo = Math.floor(lt / B) - 1; // compasso 0 = abertura; depois 1 passo por compasso
      camadas.forEach((c, i) => {
        const a = (i + 1) * B;
        const p = E.outBack(seg(lt, a + 0.05, a + 0.55));
        const y = ALT_CAMADA[i] - (1 - p) * 260;
        const op = seg(lt, a, a + 0.15);
        c.setAttribute('transform', `translate(0 ${y.toFixed(1)})`);
        c.style.opacity = i === 4 ? (op * (1 - seg(lt, a + B * 0.9, a + B * 1.3)) * (0.6 + 0.4 * Math.sin(lt * 9) ** 2)).toFixed(3) : op.toFixed(3);
      });
      // assar no forno: o lanche fica mais dourado
      const assado = seg(lt, 5 * B, 5.6 * B);
      sand.style.filter = assado > 0 ? `saturate(${(1 + 0.25 * assado).toFixed(2)}) brightness(${(1 + 0.06 * assado).toFixed(2)})` : 'none';
      fx(sand, lt, { a: 0.5, d: 0.6, y: 40, bs: 1 + 0.015 * S.forte });
      acs.forEach((a, i) => { const p = E.outBack(seg(lt, 9 * B + 0.2 + i * 0.25, 9 * B + 0.7 + i * 0.25)); a.style.opacity = Math.min(1, Math.max(0, p)).toFixed(3); a.setAttribute('transform', `${acsBase[i]} translate(0 ${(60 * (1 - Math.min(1, p))).toFixed(1)})`); });
      paineis.forEach((o, i) => {
        const a = (i + 1) * B;
        const out = i < PASSOS.length - 1 ? a + B - 0.3 : null;
        fx(o.p, lt, { a, d: 0.5, rx: 70, y: 40, blur: 8, out, od: 0.3, orx: -70, oy: -30 });
        fxLetras([o.tt], lt, { a: a + 0.1, d: 0.4, x: -30 });
        o.chips.forEach((c, k) => fx(c, lt, { a: a + 0.25 + k * 0.08, d: 0.35, s: 0.5, e: E.outBack }));
      });
      dots.forEach((d, i) => { d.style.opacity = i <= passo ? 1 : 0.22; d.style.transform = `scaleY(${i === passo ? 1.6 : 1})`; });
      fx(pontos, lt, { a: B, d: 0.5, y: 20 });
    },
  };
}

// ---------------------------------------------------------------- SOBREMESAS
function svgWaffle() {
  const cel = Array.from({ length: 16 }, (_, i) => `<rect x="${18 + (i % 4) * 46}" y="${18 + Math.floor(i / 4) * 46}" width="34" height="34" rx="6" fill="#c9852f"/>`).join('');
  return `<svg width="220" height="220" viewBox="0 0 220 220"><rect x="4" y="4" width="212" height="212" rx="26" fill="#e9a94a"/>${cel}
    <path d="M40 60 q40 30 70 0 t70 10 q-20 60 -60 70 q-40 -10 -80 -80z" fill="#7a3a14" fill-opacity="0.75"/>
    <circle cx="160" cy="58" r="22" fill="#fff6e6"/><circle cx="60" cy="160" r="14" fill="#d6247e"/></svg>`;
}
function svgChurro() {
  return `<svg width="260" height="220" viewBox="0 0 260 220"><g transform="rotate(-30 130 110)">
    <rect x="20" y="90" width="220" height="44" rx="22" fill="#d99a4a"/>${Array.from({ length: 5 }, (_, i) => `<rect x="24" y="${94 + i * 8}" width="212" height="3" fill="#a8642a" fill-opacity="0.6"/>`).join('')}
    ${Array.from({ length: 40 }, (_, i) => `<circle cx="${30 + (i * 37) % 200}" cy="${95 + (i * 13) % 36}" r="2" fill="#fff6e6"/>`).join('')}</g>
    <path d="M170 170 h70 l-8 40 h-54 z" fill="#5a2a14"/><ellipse cx="205" cy="170" rx="35" ry="9" fill="#3a1a0a"/></svg>`;
}

async function sobremesas({ raiz }) {
  const fundo = fundo2D(raiz, 'roxo', 88);
  const L = camada(raiz);
  const cab = cabecalho(L, '20:30 · ÚLTIMA LIBERAÇÃO', 'SOBREMESAS', 'Especiais <b>americanos</b> e o melhor da <b>doçaria brasileira</b>.');
  const am = h('div', 'painel', L);
  am.style.cssText += 'left:110px;top:450px;width:800px;height:440px;padding:36px 40px';
  am.innerHTML = `<div class="mini" style="font-size:19px">ESPECIAIS AMERICANOS</div>
    <div style="display:flex;gap:30px;margin-top:20px;align-items:flex-end">
      <div style="text-align:center"><div class="ilu">${svgWaffle()}</div><div class="ag" style="font-size:44px;margin-top:10px">WAFFLES</div></div>
      <div style="text-align:center"><div class="ilu">${svgChurro()}</div><div class="ag" style="font-size:44px;margin-top:10px">CHURROS</div></div></div>`;
  const ilus = [...am.querySelectorAll('.ilu')];
  const br = h('div', 'painel', L);
  br.style.cssText += 'left:960px;top:300px;width:850px;height:590px;padding:36px 40px';
  const brT = h('div', 'mini', br, 'DOCES BRASILEIROS'); brT.style.fontSize = '19px';
  const brBox = h('div', '', br); brBox.style.marginTop = '22px';
  const doces = listaChips(brBox, ['Brigadeiro', 'Beijinho', 'Cajuzinho', 'Bicho-de-pé', 'Pudim', 'Paçoca', 'Cocada', 'Quindim', 'Pé de moleque', 'Doce de leite'], 2, 3);
  return {
    upd(lt, S) {
      fundo.upd(lt, S.pulso);
      cab(lt);
      fx(am, lt, { a: 0.7, d: 0.6, y: 50, rx: 30, blur: 8 });
      ilus.forEach((e, i) => fx(e, lt, { a: 1.1 + i * 0.3, d: 0.6, s: 0.3, rz: -40, e: E.outBack, bs: 1 + 0.03 * S.forte }));
      fx(br, lt, { a: 1.2, d: 0.6, x: 60, blur: 8 });
      doces.forEach((c, i) => fx(c, lt, { a: 1.6 + i * 0.13, d: 0.4, s: 0.4, e: E.outBack }));
    },
  };
}

export default { pizza, subway, sobremesas };
