// Elementos fixos de tela: marca, contador de seção, relógio estilo Vanguarda e mini-planta.
import { E, seg } from './anim.js';
import { h, vg, ARCO } from './ui.js';
import { SECOES } from './timeline.js';
import { ZONAS, LOTE } from './layout.js';

const MAPA_W = 272, MAPA_H = 186;
const mx = (x) => ((x - LOTE.x0) / (LOTE.x1 - LOTE.x0)) * MAPA_W;
const mz = (z) => ((z - LOTE.z0) / (LOTE.z1 - LOTE.z0)) * MAPA_H;

export function criarHUD(raiz, roteiro) {
  const bug = h('div', 'hud-bug', raiz);
  h('img', '', bug).src = '/ref/logo-v-plano.webp';
  const bt = h('div', '', bug);
  h('div', 't1', bt, vg('DANIEL 20 ANOS'));
  h('div', 't2', bt, 'PROJETO DA FESTA · 2029');

  const sec = h('div', 'hud-sec', raiz);
  const secN = h('div', 'n', sec);
  const secNome = h('div', 'nome', sec);
  const trilho = h('div', 'trilho', sec);
  const trilhoIn = h('div', '', trilho);

  const rel = h('div', 'relogio', raiz);
  rel.innerHTML = `<svg viewBox="0 0 170 170"><defs>
      <linearGradient id="relPrata" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.5" stop-color="#9aa3b8"/><stop offset="1" stop-color="#eef1f7"/></linearGradient>
      <linearGradient id="relArco" x1="0" y1="0" x2="1" y2="0">${ARCO.map((c, i) => `<stop offset="${i / 9}" stop-color="${c}"/>`).join('')}</linearGradient></defs>
      <circle cx="85" cy="85" r="70" fill="rgba(0,0,10,0.25)"/>
      <circle cx="85" cy="85" r="70" fill="none" stroke="url(#relPrata)" stroke-width="9"/>
      <circle id="relArc" cx="85" cy="85" r="70" fill="none" stroke="url(#relArco)" stroke-width="9" stroke-dasharray="0 440" transform="rotate(-90 85 85)" stroke-linecap="round"/></svg>
      <div class="hora">15:30</div><div class="rot">HORÁRIO</div>`;
  const relArc = rel.querySelector('#relArc');
  const relHora = rel.querySelector('.hora');

  const mapa = h('div', 'mapa', raiz);
  h('div', 'mt', mapa, 'PLANTA · VOCÊ ESTÁ AQUI');
  const zonaRects = Object.entries(ZONAS).filter(([k]) => k !== 'lote').map(([k, z]) => {
    return `<rect data-z="${k}" x="${mx(z.x0).toFixed(1)}" y="${mz(z.z0).toFixed(1)}" width="${(mx(z.x1) - mx(z.x0)).toFixed(1)}" height="${(mz(z.z1) - mz(z.z0)).toFixed(1)}" rx="3" fill="${z.cor}" fill-opacity="0.28" stroke="${z.cor}" stroke-opacity="0.8" stroke-width="1.2"/>`;
  }).join('');
  mapa.insertAdjacentHTML('beforeend', `<svg width="${MAPA_W}" height="${MAPA_H}" viewBox="0 0 ${MAPA_W} ${MAPA_H}">
    <rect x="${mx(-24)}" y="${mz(-20)}" width="${mx(24) - mx(-24)}" height="${mz(12) - mz(-20)}" fill="#1a2060" stroke="#fff" stroke-opacity="0.6" stroke-width="2"/>
    ${zonaRects}
    <rect x="0" y="${mz(24)}" width="${MAPA_W}" height="${MAPA_H - mz(24)}" fill="#555a70"/>
    <g id="mapaFoco"><rect x="0" y="0" width="10" height="10" rx="3" fill="none" stroke="#fff" stroke-width="3"/></g></svg>`);
  const foco = mapa.querySelector('#mapaFoco rect');
  const rects = [...mapa.querySelectorAll('rect[data-z]')];

  return {
    upd(t, r, i) {
      const lt = t - r.ini;
      const temSec = r.sec != null;
      // marca e contador
      const pin = E.outCubic(seg(lt, 0.15, 0.7));
      const pout = E.inCubic(seg(lt, r.dur - 0.35, r.dur - 0.05));
      const anterior = roteiro[i - 1], proxima = roteiro[i + 1];
      const continua = (o) => o && o.sec != null;
      const aIn = continua(anterior) && temSec ? 1 : pin;
      const aOut = continua(proxima) && temSec ? 0 : pout;
      const vis = temSec ? aIn * (1 - aOut) : 0;
      bug.style.opacity = vis.toFixed(3);
      bug.style.transform = `translateX(${(-30 * (1 - vis)).toFixed(1)}px)`;
      sec.style.opacity = vis.toFixed(3);
      if (temSec) {
        secN.innerHTML = `${String(r.sec + 1).padStart(2, '0')}<small> / ${SECOES.length}</small>`;
        secNome.textContent = SECOES[r.sec];
        const ini = roteiro.findIndex((o) => o.sec === r.sec);
        let fim = ini; while (roteiro[fim + 1] && roteiro[fim + 1].sec === r.sec) fim++;
        const p = (t - roteiro[ini].ini) / (roteiro[fim].fim - roteiro[ini].ini);
        trilhoIn.style.transform = `scaleX(${Math.max(0, Math.min(1, p)).toFixed(3)})`;
      }
      // relógio
      if (r.relogio) {
        const p = E.outBack(seg(lt, 0.3, 0.9)) * (1 - E.inCubic(seg(lt, r.dur - 0.4, r.dur - 0.1)));
        rel.style.opacity = Math.min(1, p).toFixed(3);
        rel.style.transform = `scale(${(0.6 + 0.4 * p).toFixed(3)})`;
        relHora.textContent = r.relogio;
        const arc = 440 * E.outCubic(seg(lt, 0.4, 1.6));
        relArc.setAttribute('stroke-dasharray', `${arc.toFixed(1)} 440`);
      } else rel.style.opacity = 0;
      // mini-planta
      const z = r.zona && ZONAS[r.zona];
      if (z && !r.semMapa) {
        const pm = E.outCubic(seg(lt, 0.4, 0.9)) * (1 - E.inCubic(seg(lt, r.dur - 0.4, r.dur - 0.1)));
        mapa.style.opacity = pm.toFixed(3);
        mapa.style.transform = `translateY(${(30 * (1 - pm)).toFixed(1)}px)`;
        const bl = 0.5 + 0.5 * Math.sin(t * 6);
        foco.setAttribute('x', (mx(z.x0) - 3).toFixed(1));
        foco.setAttribute('y', (mz(z.z0) - 3).toFixed(1));
        foco.setAttribute('width', (mx(z.x1) - mx(z.x0) + 6).toFixed(1));
        foco.setAttribute('height', (mz(z.z1) - mz(z.z0) + 6).toFixed(1));
        foco.setAttribute('stroke-opacity', (0.55 + 0.45 * bl).toFixed(2));
        rects.forEach((rc) => rc.setAttribute('fill-opacity', rc.dataset.z === r.zona ? (0.55 + 0.3 * bl).toFixed(2) : '0.18'));
      } else mapa.style.opacity = 0;
    },
  };
}
