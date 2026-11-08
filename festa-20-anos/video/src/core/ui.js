// Componentes de grafismo 2D (DOM + CSS 3D), animados quadro a quadro como no After Effects.
import { E, seg, lerp, clamp, rng } from './anim.js';

export const ARCO = ['#7b3fe0', '#3d6ff0', '#27b3d6', '#2fc27a', '#9bd23a', '#f2d33a', '#f5a12e', '#f26b2a', '#e5342e', '#d6247e'];
export const ARCO_CSS = `linear-gradient(90deg, ${ARCO.join(', ')})`;

// V e A alternativos da ITC Avant Garde (estilo do logotipo Vanguarda)
export const vg = (s) => s.replace(/V/g, '').replace(/A/g, '');

export function h(tag, cls, parent, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}

export function camada(parent, css = '') {
  const e = h('div', 'camada', parent);
  if (css) e.style.cssText += css;
  return e;
}

// Anima um elemento: entra em `a` durante `d` a partir dos valores "de" e sai em `out`.
export function fx(el, lt, o) {
  const a = o.a ?? 0, d = o.d ?? 0.6;
  const p = (o.e ?? E.outCubic)(seg(lt, a, a + d));
  const q = o.out != null ? (o.oe ?? E.inCubic)(seg(lt, o.out, o.out + (o.od ?? 0.4))) : 0;
  const x = (o.x ?? 0) * (1 - p) + (o.ox ?? 0) * q + (o.bx ?? 0);
  const y = (o.y ?? 0) * (1 - p) + (o.oy ?? 0) * q + (o.by ?? 0);
  const z = (o.z ?? 0) * (1 - p) + (o.oz ?? 0) * q;
  const s = lerp(o.s ?? 1, 1, p) * lerp(1, o.os ?? 1, q) * (o.bs ?? 1);
  const rx = (o.rx ?? 0) * (1 - p) + (o.orx ?? 0) * q;
  const ry = (o.ry ?? 0) * (1 - p) + (o.ory ?? 0) * q + (o.bry ?? 0);
  const rz = (o.rz ?? 0) * (1 - p) + (o.orz ?? 0) * q + (o.brz ?? 0);
  const op = (o.o0 ?? 0) + (1 - (o.o0 ?? 0)) * p;
  const opac = op * (1 - q) * (o.mo ?? 1);
  el.style.opacity = opac.toFixed(3);
  el.style.visibility = opac <= 0.002 ? 'hidden' : 'visible';
  el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,${z.toFixed(1)}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg) scale(${s.toFixed(4)})`;
  if (o.blur) {
    const b = o.blur * (1 - p) + (o.oblur ?? o.blur) * q;
    el.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : 'none';
  }
  return p * (1 - q);
}

// Divide texto em letras (span) para animação letra a letra
export function letras(el, texto) {
  el.textContent = '';
  return [...texto].map((c) => {
    const s = document.createElement('span');
    s.className = 'ch';
    s.textContent = c === ' ' ? ' ' : c;
    el.appendChild(s);
    return s;
  });
}

// Animação letra a letra (flip 3D + desfoque + subida), com saída opcional
export function fxLetras(spans, lt, o) {
  const st = o.st ?? 0.035;
  const n = spans.length;
  spans.forEach((s, i) => {
    const k = o.reverso ? n - 1 - i : o.centro ? Math.abs(i - (n - 1) / 2) : i;
    fx(s, lt, { ...o, a: (o.a ?? 0) + k * st, out: o.out != null ? o.out + k * (o.ost ?? st * 0.5) : undefined });
  });
}

// Título grande em Avant Garde com V/A Vanguarda
export function titulo(parent, texto, cls = 'tit', usarVg = true) {
  const e = h('div', cls, parent);
  const spans = letras(e, usarVg ? vg(texto) : texto);
  return { el: e, spans };
}

// Rótulo pequeno com barrinha arco-íris
export function kicker(parent, texto) {
  const e = h('div', 'kicker', parent);
  const barra = h('span', 'kbar', e);
  const t = h('span', 'ktxt', e, texto);
  return {
    el: e,
    upd(lt, a = 0, out = null) {
      const p = E.outExpo(seg(lt, a, a + 0.7));
      const q = out != null ? E.inCubic(seg(lt, out, out + 0.35)) : 0;
      barra.style.transform = `scaleX(${(p * (1 - q)).toFixed(3)})`;
      fx(t, lt, { a: a + 0.15, d: 0.6, x: -30, out, od: 0.3, blur: 6 });
      e.style.visibility = p > 0 && q < 1 ? 'visible' : 'hidden';
    },
  };
}

// Contador numérico
export function contar(lt, a, d, de, ate) {
  return Math.round(lerp(de, ate, E.outCubic(seg(lt, a, a + d))));
}

// Fundo animado para as cenas 2D (gradiente + piso em grade com perspectiva + feixes arco-íris + partículas)
export function fundo2D(parent, variante = 'azul', seed = 7) {
  const r = rng(seed);
  const raiz = h('div', 'bg2d bg-' + variante, parent);
  h('div', 'bg-grad', raiz);
  const piso = h('div', 'bg-piso', raiz);
  const grade = h('div', 'bg-grade', piso);
  const feixes = h('div', 'bg-feixes', raiz);
  const fx_ = ARCO.map((c, i) => {
    const f = h('div', 'feixe', feixes);
    f.style.background = `linear-gradient(90deg, transparent, ${c}, transparent)`;
    return { f, x0: r() * 2400 - 300, v: 40 + r() * 80, y: 80 + i * 92, w: 500 + r() * 700, o: 0.08 + r() * 0.12 };
  });
  const parts = h('div', 'bg-parts', raiz);
  const ps = Array.from({ length: 46 }, () => {
    const p = h('div', 'part', parts);
    const s = 2 + r() * 5;
    p.style.width = p.style.height = s + 'px';
    p.style.background = ARCO[Math.floor(r() * ARCO.length)];
    return { p, x: r() * 1920, y: r() * 1080, v: 20 + r() * 60, fase: r() * 6.28 };
  });
  const vinheta = h('div', 'bg-vinheta', raiz);
  return {
    el: raiz,
    upd(lt, pulsoV = 0) {
      grade.style.backgroundPosition = `0px ${(lt * 120) % 120}px`;
      fx_.forEach((b) => {
        const x = ((b.x0 + lt * b.v) % 2600) - 400;
        b.f.style.transform = `translate3d(${x.toFixed(0)}px, ${b.y}px, 0) rotate(-12deg)`;
        b.f.style.width = b.w + 'px';
        b.f.style.opacity = (b.o * (1 + pulsoV * 1.2)).toFixed(3);
      });
      ps.forEach((q) => {
        const y = (((q.y - lt * q.v) % 1180) + 1180) % 1180 - 50;
        const x = q.x + Math.sin(lt * 0.8 + q.fase) * 20;
        q.p.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        q.p.style.opacity = (0.35 + 0.4 * Math.sin(lt * 2 + q.fase) ** 2).toFixed(2);
      });
      vinheta.style.opacity = 1;
    },
  };
}

// Projeta um ponto 3D na tela (px) para ancorar rótulos 2D em objetos 3D
export function projetar(THREE, v, camera) {
  const p = v.clone().project(camera);
  return { x: (p.x * 0.5 + 0.5) * 1920, y: (-p.y * 0.5 + 0.5) * 1080, vis: p.z < 1 && p.z > -1 };
}

// "Pino" de rótulo ligado a um ponto 3D (linha + texto) — como os callouts de maquete
export function pino(parent, titulo_, sub = '', cor = '#ffffff') {
  const e = h('div', 'pino', parent);
  const ponto = h('div', 'pino-ponto', e);
  ponto.style.background = cor;
  const linha = h('div', 'pino-linha', e);
  const caixa = h('div', 'pino-caixa', e);
  caixa.style.borderLeftColor = cor;
  h('div', 'pino-t', caixa, titulo_);
  if (sub) h('div', 'pino-s', caixa, sub);
  return {
    el: e,
    upd(lt, a, pos, alt = 90, out = null) {
      const p = E.outCubic(seg(lt, a, a + 0.5));
      const q = out != null ? seg(lt, out, out + 0.3) : 0;
      const v = p * (1 - q);
      e.style.visibility = v > 0.001 && pos.vis ? 'visible' : 'hidden';
      e.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px, 0)`;
      ponto.style.transform = `translate(-50%,-50%) scale(${E.outBack(clamp(p * 1.4))})`;
      linha.style.height = (alt * E.outCubic(seg(lt, a + 0.1, a + 0.5))).toFixed(1) + 'px';
      caixa.style.transform = `translate3d(0, ${(-alt - 4).toFixed(1)}px, 0) translateY(-100%)`;
      caixa.style.opacity = (E.outCubic(seg(lt, a + 0.3, a + 0.7)) * (1 - q)).toFixed(3);
      caixa.style.clipPath = `inset(0 ${((1 - E.outExpo(seg(lt, a + 0.3, a + 0.8))) * 100).toFixed(1)}% 0 0)`;
      e.style.opacity = (1 - q).toFixed(3);
    },
  };
}
