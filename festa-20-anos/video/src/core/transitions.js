// Transições estilo Premiere/After Effects, sempre centradas no corte (que cai no início de um compasso).
import { E, seg, clamp } from './anim.js';
import { h, ARCO } from './ui.js';

const DUR = { arco: 0.95, flash: 0.6, aneis: 1.0, v: 1.0, none: 0 };

export function criarTransicoes(raiz, palco, roteiro) {
  const cortes = roteiro.slice(1).map((r) => ({ t: r.ini, tipo: r.tr }));

  // Faixas arco-íris diagonais
  const faixasBox = h('div', 'tr-faixas', raiz);
  const faixas = ARCO.map((c) => { const f = h('div', 'tr-faixa', faixasBox); f.style.background = c; return f; });
  // Flash
  const flash = h('div', 'tr-flash', raiz);
  // Anéis concêntricos
  const aneis = ARCO.map((c) => { const a = h('div', 'tr-anel', raiz); a.style.background = c; return a; });
  // V da Vanguarda: duas lâminas prateadas + triângulo arco-íris
  const vBox = h('div', '', raiz);
  vBox.style.cssText = 'position:absolute;inset:0';
  vBox.innerHTML = `<svg width="1920" height="1080" viewBox="0 0 1920 1080" style="position:absolute;inset:0;overflow:visible">
    <defs><linearGradient id="trPrata" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.48" stop-color="#e6e9f2"/><stop offset="0.52" stop-color="#aeb6c8"/><stop offset="1" stop-color="#f3f5fa"/></linearGradient>
    <linearGradient id="trArco" x1="0" y1="0" x2="0" y2="1">${ARCO.map((c, i) => `<stop offset="${i / 9}" stop-color="${c}"/>`).join('')}</linearGradient></defs>
    <g id="trVe"><path d="M-1400 -200 L1100 -200 L700 1400 L-1400 1400 Z" fill="url(#trPrata)"/></g>
    <g id="trVd"><path d="M3320 -200 L820 -200 L1220 1400 L3320 1400 Z" fill="url(#trPrata)"/></g>
    <g id="trVc"><path d="M-200 -200 L2120 -200 L960 1450 Z" fill="url(#trArco)"/></g></svg>`;
  const vE = vBox.querySelector('#trVe'), vD = vBox.querySelector('#trVd'), vC = vBox.querySelector('#trVc');

  function esconder() {
    faixasBox.style.visibility = 'hidden';
    flash.style.opacity = 0;
    aneis.forEach((a) => (a.style.visibility = 'hidden'));
    vBox.style.visibility = 'hidden';
    palco.style.transform = 'none';
    palco.style.filter = 'none';
  }

  return {
    upd(t) {
      esconder();
      let c = null;
      for (const k of cortes) if (Math.abs(t - k.t) <= DUR[k.tipo] / 2 + 0.05) c = k;
      if (!c) return;
      const d = t - c.t; // negativo antes do corte
      if (c.tipo === 'arco') {
        faixasBox.style.visibility = 'visible';
        faixas.forEach((f, i) => {
          const pin = E.outCubic(seg(d, -0.46 + i * 0.016, -0.46 + i * 0.016 + 0.28));
          const pout = E.inCubic(seg(d, 0.03 + i * 0.016, 0.03 + i * 0.016 + 0.3));
          const x = (pin - 1) * 110 + pout * 110;
          f.style.transform = `translateX(${x.toFixed(2)}%)`;
        });
      } else if (c.tipo === 'flash') {
        const a = d < 0 ? E.inQuad(seg(d, -0.16, 0)) : 1 - E.outCubic(seg(d, 0, 0.4));
        flash.style.opacity = a.toFixed(3);
        const s = d < 0 ? 1 + 0.1 * E.inCubic(seg(d, -0.3, 0)) : 1.08 - 0.08 * E.outCubic(seg(d, 0, 0.5));
        palco.style.transform = `scale(${s.toFixed(4)})`;
        const b = d < 0 ? 6 * E.inCubic(seg(d, -0.25, 0)) : 6 * (1 - E.outCubic(seg(d, 0, 0.3)));
        palco.style.filter = b > 0.1 ? `blur(${b.toFixed(2)}px)` : 'none';
      } else if (c.tipo === 'aneis') {
        const R = 1150;
        aneis.forEach((a, i) => {
          const pin = E.outCubic(seg(d, -0.5 + i * 0.03, -0.5 + i * 0.03 + 0.3));
          const pout = E.inCubic(seg(d, 0.02 + (9 - i) * 0.03, 0.02 + (9 - i) * 0.03 + 0.28));
          const r = R * pin * (1 - pout);
          a.style.visibility = r > 1 ? 'visible' : 'hidden';
          a.style.width = a.style.height = (2 * r).toFixed(1) + 'px';
          a.style.transform = 'translate(-50%,-50%)';
        });
      } else if (c.tipo === 'v') {
        vBox.style.visibility = 'visible';
        const pin = E.outExpo(seg(d, -0.5, -0.04));
        const pout = E.inExpo(seg(d, 0.04, 0.5));
        const fechar = pin * (1 - pout);
        vE.setAttribute('transform', `translate(${(-1500 * (1 - fechar)).toFixed(1)} 0)`);
        vD.setAttribute('transform', `translate(${(1500 * (1 - fechar)).toFixed(1)} 0)`);
        const pc = E.outExpo(seg(d, -0.42, -0.02)) * (1 - E.inExpo(seg(d, 0.06, 0.48)));
        vC.setAttribute('transform', `translate(0 ${(-1700 * (1 - pc)).toFixed(1)})`);
        palco.style.transform = `scale(${(1 + 0.05 * clamp(fechar)).toFixed(4)})`;
      }
    },
  };
}
