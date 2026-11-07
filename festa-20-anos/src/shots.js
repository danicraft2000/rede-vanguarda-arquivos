// Roteiro do vídeo: planos de câmera + grafismo, cortados nas frases musicais (6 tempos = 3,62 s).
import * as THREE from 'three';
import { E, render3D, compose } from './lib/engine.js';
import { W, H, FPS, BEAT, PHRASE, DURATION, phraseT, clamp, lerp, inv, easeInOut, easeOut, easeOutExpo, sine, beatPulse, RAINBOW } from './lib/util.js';
import { drawBrand } from './lib/brand.js';
import { showZones, zoneLights, ZONES } from './world/index.js';
import { buildIntro, rainbowEnv } from './world/intro.js';
import { ESPECIAIS } from './world/interior.js';
import { PIZZAS } from './world/hall.js';
import { TAPES } from './world/props.js';
import * as O from './gfx/overlay.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const T = (p, beats = 0) => phraseT(p) + beats * BEAT;

// caminho de câmera suave (Catmull-Rom) por chaves [px,py,pz, tx,ty,tz, fov?]
function path(keys, { ease = easeInOut, fov = 50 } = {}) {
  const P = new THREE.CatmullRomCurve3(keys.map((k) => V(k[0], k[1], k[2])), false, 'centripetal');
  const L = new THREE.CatmullRomCurve3(keys.map((k) => V(k[3], k[4], k[5])), false, 'centripetal');
  return (u) => {
    const e = ease(clamp(u)), n = keys.length - 1, f = e * n, i = Math.min(n - 1, Math.floor(f));
    const fv = keys.length > 1 ? lerp(keys[i][6] ?? fov, keys[i + 1][6] ?? fov, f - i) : (keys[0][6] ?? fov);
    return { p: P.getPoint(e), l: L.getPoint(e), fov: fv };
  };
}
const orbit = (c, r, y0, y1, a0, a1, fov = 50, ease = easeInOut, ly = c[1]) => (u) => {
  const e = ease(clamp(u)), a = lerp(a0, a1, e);
  return { p: V(c[0] + Math.cos(a) * r, lerp(y0, y1, e), c[2] + Math.sin(a) * r), l: V(c[0], ly, c[2]), fov };
};

export function createTimeline(world) {
  const { A, anchors } = world;
  const intro = buildIntro(); E.scene.add(intro.group); world.groups.intro = intro.group;
  const envRoom = E.scene.environment, envRainbow = rainbowEnv(E.renderer);
  const ctx = E.ctx;
  const ap = (x, y, z) => V(x, y, z);

  // projeta um ponto 3D na tela (null se atrás da câmera ou muito fora do quadro)
  const _v = new THREE.Vector3();
  function proj(a) {
    if (!a) return null;
    if (a.isObject3D) a.getWorldPosition(_v); else if (Array.isArray(a)) _v.set(...a); else _v.copy(a);
    const d = _v.clone().sub(E.camera.position).dot(E.camera.getWorldDirection(new THREE.Vector3()));
    if (d < 0.2) return null;
    _v.project(E.camera);
    const x = (_v.x * 0.5 + 0.5) * W, y = (-_v.y * 0.5 + 0.5) * H;
    if (x < -200 || x > W + 200 || y < -200 || y > H + 200) return null;
    return [x, y];
  }
  // chamada com direção automática
  function co(lt, a, label, sub, tin, tout = 99, o = {}) {
    const pt = proj(a); if (!pt) return;
    const right = pt[0] < W * 0.6;
    O.callout(ctx, lt, pt, { label, sub, tin, tout, dx: o.fixed ? o.dx : (right ? 1 : -1) * (o.dx ?? 80), dy: o.dy ?? -100, size: o.size ?? 34 });
  }

  // ---------------- seções (capítulos) ----------------
  const SEC = {
    intro: { t0: 0, t1: T(3) },
    local: { t0: T(3), t1: T(6), ch: ['01', 'LOCALIZAÇÃO', 'Espaço Armazém · Morenos Eventos · Vila Leopoldina'], map: 'estacionamento' },
    maquete: { t0: T(6), t1: T(10), ch: ['02', 'A MAQUETE', 'visão geral do espaço da festa'] },
    estac: { t0: T(10), t1: T(13), ch: ['03', 'ESTACIONAMENTO', 'decoração arco-íris da Vanguarda · 2003 e atual'], map: 'estacionamento' },
    entrada: { t0: T(13), t1: T(15), ch: ['04', 'ENTRADA', 'presentes e lembrancinhas'], map: 'entrada' },
    sala: { t0: T(15), t1: T(18), ch: ['05', 'SALA DE ESTAR & BANHEIROS', 'corredor aconchegante + 4 banheiros temáticos'], map: 'sala' },
    especial: { t0: T(18), t1: T(22), ch: ['06', 'VANGUARDA ESPECIAL', 'exposição de quadros históricos · 15 documentários'], map: null },
    salao: { t0: T(22), t1: T(26), ch: ['07', 'SALÃO PRINCIPAL', 'onde acontece toda a festa'], map: 'salao' },
    pizza: { t0: T(26), t1: T(29), ch: ['08', 'CARDÁPIO · 1º HORÁRIO', 'pizza self-service'], map: 'buffet' },
    subway: { t0: T(29), t1: T(35), ch: ['09', 'CARDÁPIO · 2º HORÁRIO', 'Subway artesanal self-service'], map: 'buffet' },
    doces: { t0: T(35), t1: T(38), ch: ['10', 'CARDÁPIO · 3º HORÁRIO', 'sobremesas'], map: 'buffet' },
    museu: { t0: T(38), t1: T(44), ch: ['11', 'SALÃO SECUNDÁRIO · MUSEU', 'a história da Rede Vanguarda e seus objetos'], map: 'museu_fitas' },
    cone: { t0: T(44), t1: T(47), ch: ['12', '1998 · A PRIMEIRA MARCA', 'o cone em 3D, grande, no centro do museu'], map: 'museu_cone' },
    y2003: { t0: T(47), t1: T(51), ch: ['13', '2003 · REDE VANGUARDA', 'inauguração e o estúdio do telejornal das 12h'], map: 'museu_2003' },
    futuro: { t0: T(51), t1: T(54), ch: ['14', 'O FUTURO', 'computador, inteligência artificial e TV do futuro'], map: 'museu_futuro' },
    hoje: { t0: T(54), t1: T(57), ch: ['15', 'ATUALMENTE', 'equipamentos de hoje · cenográficos'], map: 'museu_hoje' },
    kids: { t0: T(57), t1: T(60), ch: ['16', 'ESPAÇO KIDS', 'playground para as crianças convidadas'], map: 'kids' },
    resumo: { t0: T(60), t1: T(62) },
    final: { t0: T(62), t1: DURATION },
  };

  const hallZones = [...ZONES.hall], museumZones = [...ZONES.museum];
  const S = [];
  const add = (sec, t0, t1, o) => S.push({ sec, t0, t1, trans: 'wipe', ...o });

  // ===== 1. ABERTURA =====
  add('intro', 0, T(1), {
    zones: ['intro'], env: 'intro', trans: 'none',
    cam: path([[0.0, 0.5, 17, 0, -0.1, 0, 36], [0.3, 0.3, 12.5, 0, 0, 0, 36]], { ease: easeOut }),
    update: (t, lt) => intro.update(t, { ringK: clamp(lt / 1.6), ringSpin: clamp(lt / 3.0), lettersT: -1, warm: 0 }),
    draw: (lt) => {
      const k = O.vis(lt, 1.4, 0.6, 3.3, 0.3);
      O.txt(ctx, 'O TEMA DA FESTA É', W / 2, H * 0.86, { size: 34, font: 'AvantGarde', weight: 700, align: 'center', alpha: k, color: '#e8ecf5' });
    },
  });
  add('intro', T(1), T(3), {
    zones: ['intro'], env: 'intro', trans: 'flash',
    cam: path([[0.8, 0.4, 14.5, 0, 0.2, 0, 38], [-0.4, 0.1, 12.6, 0, 0.6, 0, 38]], { ease: sine }),
    update: (t, lt) => intro.update(t, { ringK: 0, lettersT: lt, settle: clamp((lt - 2) / 2), warm: 1, lettersY: lerp(0, 0.65, easeInOut(clamp((lt - 2.2) / 0.8))) }),
    draw: (lt) => {
      // "DANIEL 20 ANOS" dourado, no lugar do "ESPECIAL" da vinheta
      const k = clamp((lt - 2.42) / 0.7);
      if (k > 0) {
        ctx.save();
        const size = 112, y = H * 0.83;
        const L = 'DANIEL 20 ANOS';
        ctx.beginPath(); ctx.rect(0, 0, W * easeOutExpo(k) + 1, H); ctx.clip();
        ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 24;
        const g = ctx.createLinearGradient(0, y - size, 0, y + 10); g.addColorStop(0, '#fff6d8'); g.addColorStop(0.45, '#f2c45a'); g.addColorStop(0.55, '#c98a1e'); g.addColorStop(1, '#ffe7a0');
        drawBrand(ctx, L, W / 2, y, size, { align: 'center', fill: g });
        ctx.shadowColor = 'transparent';
        const sx = lerp(-400, W + 400, clamp((lt - 2.6) / 1.2)); const sh = ctx.createLinearGradient(sx - 120, 0, sx + 120, 0); sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,255,0.7)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = sh; ctx.fillRect(0, y - size, W, size + 20);
        ctx.restore();
        ctx.save(); ctx.globalAlpha = O.vis(lt, 2.7, 0.5); ctx.fillStyle = O.rbGrad(ctx, W / 2 - 420, 0, W / 2 + 420, 0); ctx.fillRect(W / 2 - 420 * easeOutExpo(clamp((lt - 2.7) / 0.6)), y + 26, 840 * easeOutExpo(clamp((lt - 2.7) / 0.6)), 7); ctx.restore();
      }
      const k2 = O.vis(lt, 4.0, 0.5, 6.9, 0.3);
      if (k2 > 0) {
        O.txt(ctx, 'APRESENTAÇÃO DO PROJETO DA FESTA · 2029', W / 2, H * 0.92, { size: 30, weight: 600, align: 'center', alpha: k2, color: '#f2f4fa' });
        O.txt(ctx, 'ESPAÇO ARMAZÉM · MORENOS EVENTOS · VILA LEOPOLDINA · SÃO PAULO', W / 2, H * 0.92 + 40, { size: 22, weight: 500, align: 'center', alpha: k2 * 0.8, color: '#cfd5e2' });
      }
    },
  });

  // ===== 2. LOCALIZAÇÃO =====
  add('local', T(3), T(6), {
    zones: ZONES.exterior, env: 'ext',
    cam: path([[95, 120, 150, 10, 0, -2, 42], [40, 45, 95, 5, 0, 10, 45], [6, 9, 60, 0, 3.6, 20, 48]], { ease: easeInOut }),
    draw: (lt, D) => {
      const k = O.vis(lt, 3.0, 0.6, D.dur - 0.45);
      if (k > 0) {
        const x = O.SAFE, y = H - O.SAFE - 250, w = 640;
        ctx.save(); ctx.globalAlpha = k; O.glass(ctx, x, y, w, 250);
        // pino de localização
        const drop = easeOutExpo(clamp((lt - 3.2) / 0.6)); const px = x + 70, py = y + 92 - (1 - drop) * 60;
        ctx.fillStyle = O.rbGrad(ctx, px - 30, py + 40, px + 30, py - 40); ctx.beginPath(); ctx.arc(px, py - 10, 30, Math.PI, 0); ctx.lineTo(px, py + 42); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#0c0e16'; ctx.beginPath(); ctx.arc(px, py - 10, 11, 0, 7); ctx.fill();
        O.txt(ctx, 'ESPAÇO ARMAZÉM', x + 130, y + 80, { size: 46, font: 'AvantGarde', weight: 700 });
        O.txt(ctx, 'Morenos Eventos', x + 132, y + 122, { size: 30, weight: 600, color: '#dfe3ee' });
        O.txt(ctx, 'Vila Leopoldina · São Paulo – SP', x + 132, y + 168, { size: 28, weight: 500, color: '#cfd5e2', alpha: O.vis(lt, 3.6, 0.4) });
        O.txt(ctx, 'Aniversário de 20 anos do Daniel · 2029', x + 132, y + 210, { size: 26, weight: 500, color: '#aeb6c8', alpha: O.vis(lt, 4.0, 0.4) });
        ctx.restore();
      }
      O.pip(ctx, lt, A.img.fachada, { x: W - O.SAFE - 520, y: H - O.SAFE - 360, w: 520, label: 'FOTO DO LOCAL HOJE', tin: 5.2, tout: D.dur - 0.5 });
    },
  });

  // ===== 3. MAQUETE (vista geral sem telhado) =====
  const zoneLabels = [
    [ap(-15, 0.5, 31), 'ESTACIONAMENTO', 'decorado com arco-íris', -90, 60], [ap(0, 1, 15.5), 'ENTRADA', 'presentes · lembrancinhas', 60, 150],
    [ap(-14.5, 1, 15.5), 'SALA DE ESTAR', 'Vanguarda Especial', -80, -70], [ap(12.5, 1, 16.5), '4 BANHEIROS', 'temáticos', 80, 110],
    [ap(-3, 1, -8), 'SALÃO PRINCIPAL', 'palco · mesas · buffet', -90, -40], [ap(0, 1.5, -28.5), 'PALCO', '3 telões', 80, -60],
    [ap(31, 1, -12), 'SALÃO SECUNDÁRIO', 'museu Vanguarda', 90, -50], [ap(32, 1, 14), 'ESPAÇO KIDS', 'playground', 90, 50],
  ];
  add('maquete', T(6), T(10), {
    zones: ZONES.maquete, env: 'ext',
    cam: (u) => {
      if (u < 0.48) { const e = easeInOut(u / 0.48), a = lerp(2.15, 1.25, e); return { p: V(10 + Math.cos(a) * 92, lerp(64, 78, e), -6 + Math.sin(a) * 92), l: V(9, 0, -2), fov: 44 }; }
      const e = easeInOut(clamp((u - 0.48) / 0.3)), a = 1.25;
      const p0 = V(10 + Math.cos(a) * 92, 78, -6 + Math.sin(a) * 92), p1 = V(10, 128, 6.5);
      return { p: p0.lerp(p1, e), l: V(9, 0, -2).lerp(V(10, 0, 4), e), fov: lerp(44, 40, e) };
    },
    draw: (lt, D) => zoneLabels.forEach(([a, l, s, dx, dy], i) => co(lt, a, l, s, 9.0 + i * BEAT * 0.6, D.dur - 0.4, { size: 28, dx, dy, fixed: true })),
  });

  // ===== 4. ESTACIONAMENTO =====
  const parkCard = (lt, D, tin) => O.card(ctx, lt, { x: W - O.SAFE - 640, y: H - O.SAFE - 360, w: 640, title: 'DECORAÇÃO ARCO-ÍRIS', tin, tout: D.dur - 0.4, size: 28, head: 38,
    items: ['Arco-íris gigante no portão', 'Passarela arco-íris até a porta', 'Bandeiras: marca 2003 + atual', 'Totens "2003" e "HOJE"', 'Balizadores e varal de luzes'] });
  add('estac', T(10), T(11, 3), {
    zones: ZONES.exterior, env: 'ext',
    cam: path([[-16, 10, 56, 0, 2.5, 36, 48], [-4, 3.0, 46.5, 0, 2.4, 37, 50]], { ease: easeInOut }),
    draw: (lt, D) => { parkCard(lt, D, 2.9); co(lt, ap(-6.2, 2.6, 38.2), '2003', 'marca da inauguração', 1.6, D.dur - 0.3); co(lt, ap(6.2, 2.6, 38.2), 'HOJE', 'marca atual', 2.2, D.dur - 0.3); },
  });
  add('estac', T(11, 3), T(13), {
    zones: ZONES.exterior, env: 'ext', trans: 'cut',
    cam: path([[0.4, 1.75, 38.5, 0, 2.2, 20, 55], [0, 1.75, 27.5, 0, 2.6, 19, 55]], { ease: sine }),
    draw: (lt, D) => parkCard(lt, D, -1),
  });

  // ===== 5. ENTRADA =====
  add('entrada', T(13), T(13, 3), {
    zones: [...ZONES.exterior, 'foyer', 'shell'], env: 'ext',
    cam: path([[0, 1.8, 31, 0, 2.2, 20, 50], [0, 1.85, 24.4, 0, 2.0, 18, 56]], { ease: easeOut }),
  });
  add('entrada', T(13, 3), T(15), {
    zones: ZONES.foyer, env: 'int', lights: ['foyer'], trans: 'flash',
    cam: path([[0.2, 1.8, 19.5, 0, 1.2, 12, 66], [0.1, 1.75, 18.6, 0, 1.15, 12, 64]], { ease: sine }),
    draw: (lt, D) => { co(lt, anchors.gift, 'CAIXA DE PRESENTES', 'deixe seu presente na chegada', 1.1, D.dur - 0.3); co(lt, anchors.souvenir, 'LEMBRANCINHAS', 'mini-fita VHS · Daniel 20 Anos', 1.7, D.dur - 0.3); },
  });

  // ===== 6. SALA DE ESTAR + BANHEIROS =====
  add('sala', T(15), T(16, 3), {
    zones: ZONES.lounge, env: 'int', lights: ['lounge', 'foyer'],
    cam: path([[-5.3, 1.65, 15.6, -22, 1.5, 15.5, 62], [-11.5, 1.6, 15.3, -23, 1.45, 15.6, 60]], { ease: sine }),
    draw: (lt, D) => O.card(ctx, lt, { x: O.SAFE, y: H - O.SAFE - 300, w: 640, title: 'CORREDOR = SALA DE ESTAR', tin: 2.6, tout: D.dur - 0.3, size: 28, head: 36,
      items: ['Sofás com almofadas arco-íris', 'Tapetes, plantas e luz aconchegante', 'Quadros do Vanguarda Especial'] }),
  });
  add('sala', T(16, 3), T(17, 3), {
    zones: ZONES.baths, env: 'int', lights: ['baths', 'foyer'], trans: 'cut',
    cam: path([[5.6, 1.7, 12.5, 19.5, 1.4, 13.4, 60], [8.0, 1.7, 12.4, 19.5, 1.45, 13.5, 60]], { ease: sine }),
    draw: (lt, D) => O.card(ctx, lt, { x: O.SAFE, y: H - O.SAFE - 360, w: 600, title: '4 BANHEIROS TEMÁTICOS', tin: 0.2, tout: 99, size: 28, head: 36,
      items: ['Masculino', 'Feminino', 'Família (com trocador)', 'Acessível (PcD)'], note: 'portas coloridas · faixa arco-íris · espelho cromado' }),
  });
  add('sala', T(17, 3), T(18), {
    zones: ['shell', 'baths', 'foyer', 'kids'], env: 'int', lights: ['baths', 'foyer'], trans: 'cut',
    cam: path([[12.5, 9.5, 18.6, 12.5, 0, 15.0, 62], [12.5, 11.5, 18.2, 12.5, 0, 15.2, 60]], { ease: sine }),
    draw: (lt, D) => O.card(ctx, lt, { x: O.SAFE, y: H - O.SAFE - 360, w: 600, title: '4 BANHEIROS TEMÁTICOS', tin: -1, tout: D.dur - 0.3, size: 28, head: 36,
      items: ['Masculino', 'Feminino', 'Família (com trocador)', 'Acessível (PcD)'], note: 'portas coloridas · faixa arco-íris · espelho cromado' }),
  });

  // ===== 7. VANGUARDA ESPECIAL =====
  const espIndex = (lt, cur, D) => {
    const k = O.vis(lt, 0.3, 0.5, D.dur - 0.4); if (k <= 0) return;
    const x = W - O.SAFE - 470, y = 150, w = 470, rh = 40;
    ctx.save(); ctx.globalAlpha = k; O.glass(ctx, x, y, w, 70 + ESPECIAIS.length * rh + 14);
    O.txt(ctx, 'OS 15 DOCUMENTÁRIOS', x + 26, y + 52, { size: 30, font: 'AvantGarde', weight: 700 });
    ESPECIAIS.forEach((t, i) => {
      const yy = y + 70 + i * rh + 28, on = i === cur;
      if (on) { O.rrect(ctx, x + 12, yy - 29, w - 24, rh - 2, 8); ctx.fillStyle = O.rbGrad(ctx, x, 0, x + w, 0); ctx.fill(); }
      O.txt(ctx, String(i + 1).padStart(2, '0'), x + 28, yy, { size: 22, font: 'AvantGarde', weight: 700, color: on ? '#fff' : '#f2c46a' });
      O.txt(ctx, t, x + 72, yy, { size: 24, weight: on ? 700 : 500, color: on ? '#fff' : '#d5dae6', maxW: w - 96 });
    });
    ctx.restore();
  };
  const espBig = (lt, cur, since) => {
    const k = O.vis(since, 0, 0.35);
    ctx.save(); ctx.globalAlpha = k;
    const y = H - O.SAFE - 40, x = O.SAFE + (1 - k) * -30;
    O.txt(ctx, `Nº ${String(cur + 1).padStart(2, '0')}`, x, y - 70, { size: 34, font: 'AvantGarde', weight: 700, color: '#f2c46a' });
    ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = 20;
    O.txt(ctx, ESPECIAIS[cur].toUpperCase(), x, y, { size: 64, font: 'AvantGarde', weight: 700, maxW: W - 2 * O.SAFE - 520 });
    ctx.restore(); void lt;
  };
  // quadro atual a partir da posição da câmera (determinístico: funciona em qualquer ordem de quadros)
  const espCur = (wall, cx) => {
    if (wall === 'n') { const xs = [...Array(8)].map((_, i) => -22.4 + i * 2.26); return xs.reduce((b, x, i) => (Math.abs(x - (cx + 1.4)) < Math.abs(xs[b] - (cx + 1.4)) ? i : b), 0); }
    const xs = [...Array(7)].map((_, i) => -7.7 - i * 2.26); return 8 + xs.reduce((b, x, i) => (Math.abs(x - (cx - 1.4)) < Math.abs(xs[b] - (cx - 1.4)) ? i : b), 0);
  };
  const espDraw = (wall) => function (lt, D) {
    const cur = espCur(wall, E.camera.position.x);
    let since = 0; for (let k = 1; k <= 12; k++) { const u = (lt - k / FPS) / this.dur; if (u < 0) { since = 9; break; } if (espCur(wall, this.cam(u).p.x) !== cur) break; since = k / FPS; }
    espIndex(D.st, cur, { dur: D.sdur });
    if (D.st > 2.8) espBig(lt, cur, since >= 12 / FPS ? 9 : since);
  };
  add('especial', T(18), T(20), {
    zones: ZONES.lounge, env: 'int', lights: ['lounge'],
    cam: (u) => { const e = easeInOut(u), x = lerp(-23.2, -8.2, e); return { p: V(x, 1.72, 14.8), l: V(x + 1.4, 1.82, 11.2), fov: 52 }; },
    draw: espDraw('n'),
  });
  add('especial', T(20), T(22), {
    zones: ZONES.lounge, env: 'int', lights: ['lounge'], trans: 'cut',
    cam: (u) => { const e = easeInOut(u), x = lerp(-6.4, -21.6, e); return { p: V(x, 1.72, 16.0), l: V(x - 1.4, 1.82, 19.6), fov: 52 }; },
    draw: espDraw('s'),
  });

  // ===== 8. SALÃO PRINCIPAL (a música recomeça aqui) =====
  add('salao', T(22), T(23, 3), {
    zones: hallZones, env: 'hall', lights: ['hall'], trans: 'flash',
    cam: path([[0, 1.7, 10.4, 0, 2.2, -20, 60], [0, 3.6, 3, 0, 3.4, -28, 55], [0, 5.4, -4, 0, 4.0, -30, 50]], { ease: easeInOut }),
    draw: (lt, D) => O.pip(ctx, lt, A.img.salao2, { x: W - O.SAFE - 470, y: H - O.SAFE - 300, w: 470, label: 'O SALÃO HOJE (FOTO DA MONTAGEM)', tin: 3.0, tout: D.dur - 0.3 }),
  });
  add('salao', T(23, 3), T(25), {
    zones: hallZones, env: 'hall', lights: ['hall'], trans: 'cut',
    cam: path([[-7.5, 2.3, -15.5, -1, 4.0, -30, 52], [7.0, 2.6, -16.5, 1, 4.1, -30, 50]], { ease: sine }),
    draw: (lt, D) => {
      co(lt, anchors.screenL, 'TELÃO ESQUERDO', '"DANIEL"', 0.3, D.dur - 0.3, { dy: -150 });
      co(lt, ap(0, 6.6, -31.2), 'TELÃO CENTRAL', 'arco-íris Vanguarda', 0.9, D.dur - 0.3, { dy: 70 });
      co(lt, anchors.screenR, 'TELÃO DIREITO', '"20 ANOS"', 1.5, D.dur - 0.3, { dy: 170 });
      O.pip(ctx, lt, A.img.banner20, { x: O.SAFE, y: H - O.SAFE - 200, w: 560, crop: [0, 250, 1280, 290], label: 'ARTE DOS TELÕES · DANIEL | ARCO-ÍRIS | 20 ANOS', tin: 2.4, tout: D.dur - 0.3 });
    },
  });
  add('salao', T(25), T(26), {
    zones: hallZones, env: 'hall', lights: ['hall'], trans: 'cut',
    cam: path([[1.9, 1.25, 5.6, 1.0, 0.86, 4.1, 42], [1.5, 1.1, 5.0, 1.0, 0.86, 4.1, 40]], { ease: sine }),
    draw: (lt, D) => {
      co(lt, anchors.card, 'CARTÃO DE AGRADECIMENTO', 'em todas as 30 mesas', 0.3, D.dur - 0.3);
      const c = A.tex.thankCard.userData.canvas; const k = O.vis(lt, 0.9, 0.5, D.dur - 0.3);
      if (k > 0) { ctx.save(); ctx.globalAlpha = k; ctx.translate(W - O.SAFE - 300, H - O.SAFE - 190); ctx.rotate(-0.04); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 30; ctx.drawImage(c, -260, -162, 520, 325); ctx.restore(); }
    },
  });

  // ===== 9-11. CARDÁPIO =====
  const pizzaItems = PIZZAS.slice(0, 8).map((p) => p[0]);
  add('pizza', T(26), T(29), {
    zones: hallZones, env: 'hall', lights: ['hall'],
    cam: (u) => { const e = sine(u), z = lerp(-21.6, -14.6, e); return { p: V(-21.0, 1.9, z), l: V(-23.15, 0.95, z + 1.6), fov: 50 }; },
    draw: (lt, D) => {
      O.schedule(ctx, lt, 0, { tout: D.dur - 0.3 });
      O.timeBadge(ctx, lt, { time: '16:00', label: 'PIZZA', sub: 'self-service · sabores à vontade', y: 196, tin: 0.3, tout: D.dur - 0.3 });
      O.card(ctx, lt, { x: W - O.SAFE - 660, y: H - O.SAFE - 420, w: 660, title: 'SABORES', cols: 2, size: 27, head: 36, tin: 2.7, tout: D.dur - 0.3, stagger: BEAT / 3, items: pizzaItems, note: 'Doces: Chocolate com Morango · Banana com Canela' });
    },
  });
  const subCam = (z0, z1, lx = -23.15) => (u) => { const e = sine(u), z = lerp(z0, z1, e); return { p: V(-20.9, 1.85, z), l: V(lx, 0.95, z + 1.4), fov: 50 }; };
  const subBadge = (lt, D, tin = 0.3) => { O.schedule(ctx, lt, 1, { tin, tout: D.dur - 0.3 }); O.timeBadge(ctx, lt, { time: '18:30', label: 'SUBWAY ARTESANAL', sub: 'self-service · pães de 15 cm', y: 196, tin, tout: D.dur - 0.3 }); };
  add('subway', T(29), T(31), {
    zones: hallZones, env: 'hall', lights: ['hall'],
    cam: subCam(-12.2, -6.8),
    draw: (lt, D) => {
      subBadge(lt, D);
      O.card(ctx, lt, { x: O.SAFE, y: H - O.SAFE - 330, w: 560, title: 'PÃES DE 15 cm', size: 28, head: 36, tin: 2.7, tout: D.dur - 0.3, items: ['Italiano', '3 Queijos', 'Parmesão e Orégano', 'Integral'] });
      O.card(ctx, lt, { x: W - O.SAFE - 700, y: H - O.SAFE - 380, w: 700, title: 'PROTEÍNAS', size: 28, head: 36, tin: 3.4, tout: D.dur - 0.3, items: ['Carne de churrasco', 'Frango grelhado', 'Frango defumado com cream cheese', 'Almôndegas de carne', 'Frango empanado'] });
    },
  });
  add('subway', T(31), T(33), {
    zones: hallZones, env: 'hall', lights: ['hall'], trans: 'cut',
    cam: path([[-19.4, 1.75, -0.4, -23.6, 0.45, -4.6, 54], [-20.0, 1.7, -2.8, -23.6, 0.45, -5.6, 54]], { ease: sine }),
    draw: (lt, D) => {
      subBadge(lt, D, -1);
      co(lt, anchors.ovens, 'FORNOS ALUGADOS', '2 a 3 fornos para esquentar', 0.4, D.dur - 0.3, { dy: -140 });
      O.card(ctx, lt, { x: O.SAFE, y: H - O.SAFE - 330, w: 520, title: 'QUEIJOS', size: 28, head: 36, tin: 1.0, tout: D.dur - 0.3, items: ['Mussarela', 'Prato', 'Provolone', 'Suíço'] });
      O.card(ctx, lt, { x: W - O.SAFE - 640, y: H - O.SAFE - 330, w: 640, title: 'ADICIONAIS', cols: 2, size: 27, head: 36, tin: 2.0, tout: D.dur - 0.3, stagger: BEAT / 3, items: ['Cream cheese', 'Cheddar', 'Pepperoni', 'Salame', 'Presunto', 'Bacon', 'Cebola crispy', 'Farofa'] });
    },
  });
  add('subway', T(33), T(34), {
    zones: hallZones, env: 'hall', lights: ['hall'], trans: 'cut',
    cam: subCam(-2.6, 0.2),
    draw: (lt, D) => {
      subBadge(lt, D, -1);
      O.card(ctx, lt, { x: O.SAFE, y: H - O.SAFE - 360, w: 560, title: 'SALADAS', cols: 2, size: 28, head: 36, tin: 0.2, tout: D.dur - 0.3, stagger: BEAT / 3, items: ['Alface', 'Tomate', 'Cebola roxa', 'Pimentão', 'Pepino', 'Picles'] });
      O.card(ctx, lt, { x: W - O.SAFE - 700, y: H - O.SAFE - 420, w: 700, title: 'MOLHOS', cols: 2, size: 26, head: 36, tin: 0.8, tout: D.dur - 0.3, stagger: BEAT / 4, items: ['Maionese temperada', 'Maionese tradicional', 'Barbecue', 'Supreme', 'Ranch', 'Parmesão', 'Mostarda e mel', 'Molho apimentado'] });
    },
  });
  add('subway', T(34), T(35), {
    zones: hallZones, env: 'hall', lights: ['hall'], trans: 'cut',
    cam: path([[11.6, 1.6, -6.4, 16.4, 0.75, -11.4, 54], [12.4, 1.6, -7.4, 16.4, 0.75, -11.6, 52]], { ease: sine }),
    draw: (lt, D) => {
      subBadge(lt, D, -1);
      co(lt, anchors.drinks, 'REFRIGERANTES', 'em lata ou copo com refil', 0.3, D.dur - 0.3, { dy: -150 });
      O.card(ctx, lt, { x: O.SAFE, y: H - O.SAFE - 330, w: 520, title: 'TEMPEROS', cols: 2, size: 28, head: 36, tin: 0.2, tout: D.dur - 0.3, stagger: BEAT / 3, items: ['Sal', 'Pimenta-do-reino', 'Orégano', 'Queijo ralado'] });
      O.card(ctx, lt, { x: O.SAFE + 560, y: H - O.SAFE - 330, w: 600, title: 'ACOMPANHAMENTOS', size: 28, head: 36, tin: 0.9, tout: D.dur - 0.3, stagger: BEAT / 3, items: ['Batata frita rústica', 'Cookies', 'Refrigerante: lata ou refil'] });
    },
  });
  add('doces', T(35), T(38), {
    zones: hallZones, env: 'hall', lights: ['hall'],
    cam: (u) => { const e = sine(u), z = lerp(2.0, 8.2, e); return { p: V(-20.7, 1.85, z), l: V(-23.0, 0.95, z + 1.5), fov: 50 }; },
    draw: (lt, D) => {
      O.schedule(ctx, lt, 2, { tout: D.dur - 0.3 });
      O.timeBadge(ctx, lt, { time: '20:30', label: 'SOBREMESAS', sub: 'último horário a servir', y: 196, tin: 0.3, tout: D.dur - 0.3 });
      O.card(ctx, lt, { x: O.SAFE, y: H - O.SAFE - 280, w: 560, title: 'ESPECIAIS AMERICANOS', size: 28, head: 34, tin: 2.7, tout: D.dur - 0.3, items: ['Waffles', 'Churros especiais'] });
      O.card(ctx, lt, { x: W - O.SAFE - 700, y: H - O.SAFE - 440, w: 700, title: 'DOCES BRASILEIROS', cols: 2, size: 27, head: 36, tin: 3.3, tout: D.dur - 0.3, stagger: BEAT / 3, items: ['Brigadeiro', 'Beijinho', 'Cajuzinho', 'Bicho-de-pé', 'Pudim de leite', 'Quindim', 'Bolo de pote', 'Paçoca', 'Pé de moleque', 'Cocada'] });
    },
  });

  // ===== 12. MUSEU: entrada, fitas, arquivo, câmeras antigas =====
  add('museu', T(38), T(39, 3), {
    zones: [...hallZones, ...museumZones], env: 'int', lights: ['hall', 'museum'],
    cam: path([[8, 1.8, -3.0, 25, 1.6, -4.5, 55], [16.4, 1.8, -4.0, 26, 1.5, -2.0, 60]], { ease: easeInOut }),
  });
  const tapeTimeline = (lt, D, cur) => {
    const k = O.vis(lt, 0.2, 0.5, D.dur - 0.3); if (k <= 0) return;
    const x0 = O.SAFE, x1 = W - O.SAFE, y = H - O.SAFE - 30;
    ctx.save(); ctx.globalAlpha = k;
    O.glass(ctx, x0 - 20, y - 120, x1 - x0 + 40, 160, { bar: false });
    ctx.fillStyle = O.rbGrad(ctx, x0, 0, x1, 0); ctx.fillRect(x0 + 20, y - 52, (x1 - x0 - 40) * easeOutExpo(clamp(lt / 1.2)), 5);
    TAPES.forEach((tp, i) => {
      const x = x0 + 40 + i * (x1 - x0 - 80) / (TAPES.length - 1), on = i === cur, a = O.vis(lt, 0.3 + i * BEAT / 3, 0.3);
      ctx.globalAlpha = k * a;
      ctx.fillStyle = on ? '#fff' : RAINBOW[i]; ctx.beginPath(); ctx.arc(x, y - 50, on ? 13 : 9, 0, 7); ctx.fill();
      O.txt(ctx, tp.year, x, y - 74, { size: on ? 30 : 24, font: 'AvantGarde', weight: 700, align: 'center', color: on ? '#fff' : '#cfd5e2' });
      O.txt(ctx, tp.name, x, y - 8, { size: on ? 26 : 21, weight: on ? 800 : 600, align: 'center', color: on ? '#fff' : '#aeb6c8' });
    });
    ctx.restore();
  };
  add('museu', T(39, 3), T(42), {
    zones: museumZones, env: 'int', lights: ['museum'], trans: 'cut',
    cam: (u) => { const e = easeInOut(u), x = lerp(19.6, 30.0, e); return { p: V(x, 1.42, 2.25), l: V(x + 0.1, 1.17, 1.2), fov: 44 }; },
    draw: (lt, D) => {
      const cx = E.camera.position.x; const cur = Math.max(0, Math.min(8, Math.round((cx - 19.9) / 1.22)));
      tapeTimeline(lt, D, cur);
      O.card(ctx, lt, { x: O.SAFE, y: 215, w: 600, title: 'FITAS EM TAMANHO REAL', size: 26, head: 34, tin: 0.8, tout: D.dur - 0.3, items: ['Áudio: K7', 'Vídeo: VHS · Betamax · U-matic', 'TV: Betacam SP (cassetes S e L)', 'Digitais: Hi8 · MiniDV · DVCAM'] });
    },
  });
  add('museu', T(42), T(42, 3), {
    zones: museumZones, env: 'int', lights: ['museum'], trans: 'cut',
    cam: path([[22.0, 1.7, 3.6, 25.5, 1.6, 7.4, 62], [27.2, 1.75, 3.9, 23.5, 1.5, 7.4, 62]], { ease: sine }),
    draw: (lt, D) => co(lt, anchors.archive, 'ARQUIVO DE FITAS', 'estante com o acervo', 0.2, D.dur - 0.2, { dy: -170 }),
  });
  add('museu', T(42, 3), T(44), {
    zones: museumZones, env: 'int', lights: ['museum'], trans: 'cut',
    cam: path([[20.8, 1.8, 0.35, 23.4, 1.25, -2.6, 64], [26.2, 1.8, 0.35, 26.6, 1.25, -2.8, 64]], { ease: sine }),
    draw: (lt, D) => {
      co(lt, anchors.oldCam, 'CÂMERA BETACAM SP', 'cenográfica · de ombro', 0.2, D.dur - 0.3, { dy: -130 });
      co(lt, anchors.oldStudioCam, 'CÂMERA DE ESTÚDIO', 'cenográfica · anos 90', 0.8, D.dur - 0.3, { dy: -170 });
      co(lt, anchors.crt, 'MONITORES CRT + VT', 'barras de cor', 1.6, D.dur - 0.3, { dy: -150 });
    },
  });

  // ===== 13. CONE 1998 (a música recomeça aqui) =====
  add('cone', T(44), T(47), {
    zones: museumZones, env: 'int', lights: ['museum'], trans: 'flash',
    cam: orbit([37.6, 2.0, -0.2], 5.6, 1.5, 2.6, Math.PI + 0.65, Math.PI - 0.55, 52, sine, 2.1),
    draw: (lt, D) => {
      O.pip(ctx, lt, A.img.cone, { x: W - O.SAFE - 250, y: H - O.SAFE - 300, w: 250, label: 'LOGO ORIGINAL', tin: 1.8, tout: D.dur - 0.3 });
      O.card(ctx, lt, { x: O.SAFE, y: H - O.SAFE - 300, w: 620, title: 'ESCULTURA DO CONE', size: 27, head: 36, tin: 2.8, tout: D.dur - 0.3, items: ['Cone prateado com fenda arco-íris', 'Quase 3 m, girando sobre base de LED', 'A primeira logo da Vanguarda (1998)'] });
    },
  });

  // ===== 14. 2003 =====
  add('y2003', T(47), T(48, 3), {
    zones: museumZones, env: 'int', lights: ['museum'],
    cam: path([[33.0, 2.0, -7.5, 34.2, 1.5, -11.4, 46], [35.4, 1.85, -7.6, 34.2, 1.5, -11.4, 44]], { ease: sine }),
    draw: (lt, D) => O.pip(ctx, lt, A.img.logo2003w, { x: W - O.SAFE - 330, y: H - O.SAFE - 300, w: 330, label: 'MARCA DE 2003', tin: 1.6, tout: D.dur - 0.3 }),
  });
  add('y2003', T(48, 3), T(51), {
    zones: museumZones, env: 'int', lights: ['museum'], trans: 'cut',
    cam: path([[38.3, 1.75, -8.4, 38.2, 1.9, -17, 52], [38.1, 1.45, -12.2, 38.2, 1.95, -17, 54]], { ease: sine }),
    draw: (lt, D) => {
      O.pip(ctx, lt, A.img.estudio, { x: W - O.SAFE - 460, y: H - O.SAFE - 400, w: 460, label: 'O ESTÚDIO ORIGINAL', tin: 0.6, tout: D.dur - 0.3 });
      O.card(ctx, lt, { x: O.SAFE, y: H - O.SAFE - 380, w: 680, title: 'RÉPLICA: VANGUARDA TV · 12H', size: 27, head: 34, tin: 1.4, tout: D.dur - 0.3, items: ['Parede azul em grade', 'Letras cromadas VAN GUAR DA', 'Bancada de madeira e frente prateada', 'Câmeras cenográficas da época'], note: 'os convidados podem sentar na bancada para fotos!' });
    },
  });

  // ===== 15. O FUTURO =====
  add('futuro', T(51), T(54), {
    zones: museumZones.filter((z) => z !== 'walls'), env: 'int', lights: ['museum'],
    cam: path([[24.2, 1.7, -23.2, 22.8, 1.2, -27.4, 55], [31.0, 2.1, -21.6, 31, 2.1, -26.6, 58], [37.0, 2.0, -23.2, 38.8, 2.3, -27.6, 55]], { ease: easeInOut }),
    draw: (lt, D) => {
      co(lt, anchors.computer, 'COMPUTADOR MODERNO', 'cenográfico · 3 telas', 1.0, 4.4, { dy: -170 });
      co(lt, anchors.ai, 'INTELIGÊNCIA ARTIFICIAL', 'holograma interativo', 3.6, 8.0, { dy: -200 });
      co(lt, anchors.futureTV, 'TV DO FUTURO', 'tela transparente, sem bordas', 7.0, D.dur - 0.3, { dy: -230 });
    },
  });

  // ===== 16. ATUALMENTE =====
  add('hoje', T(54), T(57), {
    zones: museumZones, env: 'int', lights: ['museum'],
    cam: path([[25.2, 2.0, -6.0, 25.9, 1.7, -20, 58], [26.8, 1.75, -9.6, 25.9, 1.9, -20, 58]], { ease: sine }),
    draw: (lt, D) => {
      co(lt, anchors.modernCam, 'CÂMERA DE ESTÚDIO 4K', 'com teleprompter', 1.0, D.dur - 0.3, { dx: 100, dy: 150, fixed: true });
      co(lt, anchors.ptz, 'CÂMERAS PTZ', 'robóticas', 1.6, D.dur - 0.3, { dx: -70, dy: 130, fixed: true });
      co(lt, anchors.drone, 'DRONE', 'imagens aéreas', 2.2, D.dur - 0.3, { dx: -90, dy: 200, fixed: true });
      co(lt, ap(23.0, 3.4, -20.3), 'PAINEL DE LED', 'marca atual da Vanguarda', 2.8, D.dur - 0.3, { dx: -90, dy: -50, fixed: true });
    },
  });

  // ===== 17. ESPAÇO KIDS =====
  add('kids', T(57), T(60), {
    zones: ZONES.kids, env: 'int', lights: ['kids'],
    cam: path([[20.6, 4.2, 9.0, 30, 0.6, 15.5, 58], [31, 3.6, 8.9, 32, 0.7, 15.5, 60], [41.8, 4.4, 18.8, 31, 0.6, 13.2, 60]], { ease: easeInOut }),
    draw: (lt, D) => O.card(ctx, lt, { x: O.SAFE, y: H - O.SAFE - 380, w: 600, title: 'PLAYGROUND', size: 28, head: 36, tin: 2.7, tout: D.dur - 0.3, items: ['Escorregador', 'Balanços', 'Piscina de bolinhas', 'Cama elástica', 'Casinha e blocos de espuma'], note: 'piso emborrachado colorido' }),
  });

  // ===== 18. RESUMO (cortes rápidos em cada batida) =====
  const montage = [
    ['ESTACIONAMENTO', 'estac', 0, 0.5], ['ENTRADA', 'entrada', 1, 0.5], ['VANGUARDA ESPECIAL', 'especial', 0, 0.45], ['SALÃO', 'salao', 0, 0.85],
    ['PIZZA', 'pizza', 0, 0.5], ['SUBWAY', 'subway', 0, 0.5], ['SOBREMESAS', 'doces', 0, 0.5], ['MUSEU', 'museu', 1, 0.5],
    ['1998', 'cone', 0, 0.5], ['2003', 'y2003', 1, 0.7], ['FUTURO', 'futuro', 0, 0.5], ['KIDS', 'kids', 0, 0.5],
  ];
  const bySec = (sec, i) => S.filter((s) => s.sec === sec)[i];
  add('resumo', T(60), T(62), {
    trans: 'flash', montage: true,
    pick: (lt) => { const i = Math.min(montage.length - 1, Math.floor(lt / BEAT)); const [word, sec, idx, u] = montage[i]; return { word, shot: bySec(sec, idx), u: u + (lt - i * BEAT) / BEAT * 0.06, i, blt: lt - i * BEAT }; },
    draw: (lt) => { const m = S.find((s) => s.montage).pick(lt); O.bigWord(ctx, clamp(m.blt / 0.25), m.word, { size: m.word.length > 12 ? 120 : 160 }); O.flash(ctx, Math.exp(-m.blt * 9) * 0.55); },
  });

  // ===== 19. FINAL =====
  add('final', T(62), T(64), {
    zones: hallZones, env: 'hall', lights: ['hall'],
    cam: path([[0, 1.0, -9, 0, 4.2, -30, 50], [0, 2.8, -15.5, 0, 4.3, -30, 54]], { ease: easeInOut }),
    draw: (lt) => {
      const k = O.vis(lt, 2.0, 0.6);
      if (k > 0) { ctx.save(); ctx.globalAlpha = k; const g = ctx.createLinearGradient(0, H * 0.6, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.75)'); ctx.fillStyle = g; ctx.fillRect(0, H * 0.6, W, H * 0.4);
        O.txt(ctx, 'TE ESPERO NA FESTA!', W / 2, H - 150, { size: 64, font: 'AvantGarde', weight: 700, align: 'center' });
        O.txt(ctx, 'Espaço Armazém · Morenos Eventos · Vila Leopoldina · São Paulo · 2029', W / 2, H - 98, { size: 28, weight: 500, align: 'center', color: '#dfe3ee' }); ctx.restore(); }
    },
  });
  add('final', T(64), DURATION, {
    zones: ['intro'], env: 'intro', trans: 'flash',
    cam: path([[0.5, 0.3, 13.6, 0, 0.6, 0, 38], [-0.3, 0.2, 12.8, 0, 0.6, 0, 38]], { ease: sine }),
    update: (t, lt) => intro.update(t, { ringK: 0, lettersT: 9 + lt, settle: 1, warm: 1, lettersY: 0.65 }),
    draw: (lt, D) => {
      const y = H * 0.83, size = 112;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 24;
      const g = ctx.createLinearGradient(0, y - size, 0, y + 10); g.addColorStop(0, '#fff6d8'); g.addColorStop(0.45, '#f2c45a'); g.addColorStop(0.55, '#c98a1e'); g.addColorStop(1, '#ffe7a0');
      ctx.globalAlpha = O.vis(lt, 0.2, 0.6); drawBrand(ctx, 'DANIEL 20 ANOS', W / 2, y, size, { align: 'center', fill: g }); ctx.restore();
      const k = O.vis(lt, 1.6, 0.6);
      O.txt(ctx, 'OBRIGADO!', W / 2, H * 0.93, { size: 40, font: 'AvantGarde', weight: 700, align: 'center', alpha: k });
      O.fadeBlack(ctx, clamp((lt - (D.dur - 1.6)) / 1.4));
    },
  });

  S.forEach((s, i) => { s.i = i; s.dur = s.t1 - s.t0; });

  // ---------------- execução de um quadro ----------------
  function applyShot(s, u, t, lt) {
    const zones = s.zones;
    showZones(world, zones);
    zoneLights(world, s.lights ?? []);
    const env = s.env;
    const ext = env === 'ext';
    world.lights.sun.visible = ext; world.lights.sun.castShadow = ext;
    world.lights.hemi.intensity = ext ? 0.5 : env === 'intro' ? 0.15 : env === 'hall' ? 0.24 : 0.3;
    E.scene.environment = env === 'intro' ? envRainbow : envRoom;
    E.scene.environmentIntensity = ext ? 0.45 : env === 'intro' ? 1.0 : env === 'hall' ? 0.26 : 0.3;
    E.scene.background = new THREE.Color(env === 'intro' ? '#000000' : '#050507');
    E.bloom.strength = env === 'intro' ? 0.6 : 0.5;
    const c = s.cam(u, lt);
    E.camera.fov = c.fov; E.camera.updateProjectionMatrix();
    E.camera.position.copy(c.p); E.camera.lookAt(c.l); E.camera.updateMatrixWorld();
    world.anim.forEach((a) => a(t));
    if (zones.includes('stage')) world.drawCenter(t);
    if (zones.includes('future')) world.drawTV(t);
    s.update?.(t, lt, u);
    return c;
  }

  function render(t) {
    let s = S.find((x) => t >= x.t0 && t < x.t1) ?? S[S.length - 1];
    const lt = t - s.t0;
    let camShot = s, cu = lt / s.dur, clt = lt;
    if (s.montage) { const m = s.pick(lt); camShot = m.shot; cu = m.u; clt = m.u * m.shot.dur; }
    const c = applyShot(camShot, cu, camShot === s ? t : camShot.t0 + clt, clt);
    render3D();
    const sec = SEC[s.sec];
    const D = { dur: s.dur, t, st: t - sec.t0, sdur: sec.t1 - sec.t0, u: cu };
    compose((g) => {
      O.vignette(g, 0.42);
      O.bug(g, s.sec !== 'intro' && s.sec !== 'resumo' && !(s.sec === 'final' && s.zones.includes('intro')) ? 1 : 0);
      s.draw?.call(s, lt, D);
      if (sec.ch) O.chapter(g, t - sec.t0, sec.t1 - sec.t0, { num: sec.ch[0], title: sec.ch[1], sub: sec.ch[2] });
      if (sec.map !== undefined && sec.ch) O.minimap(g, O.vis(t - sec.t0, 0.8, 0.5, sec.t1 - sec.t0 - 0.4) * (sec.map ? 1 : 0), sec.map, c.p, c.l, null);
      // transições
      const nxt = S[s.i + 1];
      const prevT = t - s.t0, nextT = nxt ? nxt.t0 - t : 99;
      if (s.trans === 'wipe' && prevT < 0.35) O.wipe(g, 0.5 + prevT / 0.7);
      if (nxt && nxt.trans === 'wipe' && nextT < 0.35) O.wipe(g, 0.5 - nextT / 0.7);
      if (s.trans === 'flash') O.flash(g, Math.exp(-prevT * 7) * 0.9);
      if (t < 0.6) O.fadeBlack(g, 1 - t / 0.6);
    });
  }
  window.SHOTS = S; window.SECTIONS = SEC;
  return { render, shots: S };
}
void inv; void PHRASE; void FPS; void beatPulse;
