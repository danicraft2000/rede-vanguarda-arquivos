// Grafismo 2D (motion graphics) desenhado por cima do 3D em cada quadro.
import { W, H, clamp, lerp, easeOutExpo, easeOut, easeIn, easeInOut, easeOutBack, sine, RAINBOW, BEAT } from '../lib/util.js';
import { drawBrand } from '../lib/brand.js';
import { L } from '../world/layout.js';

export const SAFE = 96;
const AG = 'AvantGarde', IN = 'Inter';

// visibilidade com entrada e saída: 0..1
export function vis(lt, tin, din = 0.45, tout = Infinity, dout = 0.35) {
  const a = easeOutExpo(clamp((lt - tin) / din));
  const b = 1 - easeIn(clamp((lt - tout) / dout));
  return Math.min(a, b);
}

export function rbGrad(ctx, x0, y0, x1, y1, list = RAINBOW) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  list.forEach((c, i) => g.addColorStop(i / (list.length - 1), c));
  return g;
}

export function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

export function glass(ctx, x, y, w, h, { r = 18, a = 0.8, bar = true } = {}) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 8;
  rrect(ctx, x, y, w, h, r); ctx.fillStyle = `rgba(10,12,20,${a})`; ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1.5; ctx.stroke();
  if (bar) { ctx.save(); rrect(ctx, x, y, w, h, r); ctx.clip(); ctx.fillStyle = rbGrad(ctx, x, 0, x + w, 0); ctx.fillRect(x, y, w, 6); ctx.restore(); }
  ctx.restore();
}

export function txt(ctx, s, x, y, { size = 30, font = IN, weight = 600, color = '#fff', align = 'left', base = 'alphabetic', alpha = 1, maxW } = {}) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.font = `${weight} ${size}px ${font}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = base;
  if (maxW) { let sz = size; while (ctx.measureText(s).width > maxW && sz > 10) { sz -= 1; ctx.font = `${weight} ${sz}px ${font}`; } }
  ctx.fillText(s, x, y); ctx.restore();
}
export function measure(ctx, s, size, font = IN, weight = 600) { ctx.save(); ctx.font = `${weight} ${size}px ${font}`; const w = ctx.measureText(s).width; ctx.restore(); return w; }

// ---------- capítulo: aparece grande e depois recolhe para o canto superior esquerdo ----------
export function chapter(ctx, lt, dur, { num, title, sub }) {
  const k = vis(lt, 0.1, 0.55, dur - 0.5, 0.4);
  if (k <= 0) return;
  const shrink = easeInOut(clamp((lt - 2.3) / 0.6));
  const size = lerp(92, 40, shrink), chip = lerp(104, 50, shrink);
  const x = SAFE, y = lerp(H * 0.66, SAFE + 6, shrink);
  ctx.save(); ctx.globalAlpha = k;
  // sombra de legibilidade
  if (shrink < 1) { const g = ctx.createLinearGradient(0, H * 0.45, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${0.55 * (1 - shrink)})`); ctx.fillStyle = g; ctx.fillRect(0, H * 0.45, W, H * 0.55); }
  const cs = easeOutBack(clamp((lt - 0.1) / 0.5));
  ctx.save(); ctx.translate(x + chip / 2, y + chip / 2); ctx.scale(cs, cs);
  rrect(ctx, -chip / 2, -chip / 2, chip, chip, chip * 0.2); ctx.fillStyle = rbGrad(ctx, -chip / 2, chip / 2, chip / 2, -chip / 2); ctx.fill();
  txt(ctx, num, 0, chip * 0.06, { size: chip * 0.5, font: AG, weight: 700, align: 'center', base: 'middle' });
  ctx.restore();
  const tx = x + chip + lerp(30, 18, shrink);
  const reveal = easeOutExpo(clamp((lt - 0.25) / 0.7));
  const tw = measure(ctx, title, size, AG, 700) + 20;
  ctx.save(); ctx.beginPath(); ctx.rect(tx, y - 20, tw * reveal, chip + 40); ctx.clip();
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 18;
  txt(ctx, title, tx, y + chip * 0.5 + size * 0.36 - (sub ? lerp(18, 9, shrink) : 0), { size, font: AG, weight: 700 });
  ctx.restore();
  if (sub) txt(ctx, sub, tx + 2, y + chip * 0.5 + size * 0.36 + lerp(30, 17, shrink), { size: lerp(32, 20, shrink), weight: 500, color: '#dfe3ee', alpha: vis(lt, 0.6, 0.5) });
  ctx.restore();
}

// ---------- cartão com lista (itens entram um a um no ritmo) ----------
export function card(ctx, lt, { x, y, w, title, items, tin = 0.3, tout = 99, stagger = BEAT / 2, size = 30, cols = 1, gap = 14, head = 40, note }) {
  const k = vis(lt, tin, 0.5, tout, 0.35);
  if (k <= 0) return 0;
  const rows = Math.ceil(items.length / cols), lh = size * 1.32 + gap * 0.3;
  const h = 34 + head + 22 + rows * lh + (note ? size * 1.4 : 0) + 18;
  ctx.save(); ctx.globalAlpha = k;
  const slide = (1 - k) * 40;
  glass(ctx, x - slide, y, w, h);
  txt(ctx, title, x + 30 - slide, y + 34 + head * 0.82, { size: head, font: AG, weight: 700, maxW: w - 60 });
  const cw = (w - 60) / cols;
  items.forEach((it, i) => {
    const r = i % rows, c = Math.floor(i / rows);
    const a = vis(lt, tin + 0.25 + i * stagger, 0.35, tout, 0.3);
    if (a <= 0) return;
    const ix = x + 30 + c * cw - slide + (1 - a) * 24, iy = y + 34 + head + 22 + r * lh + size;
    ctx.save(); ctx.globalAlpha = k * a;
    ctx.fillStyle = RAINBOW[i % RAINBOW.length]; ctx.beginPath(); ctx.arc(ix + 7, iy - size * 0.34, size * 0.2, 0, Math.PI * 2); ctx.fill();
    txt(ctx, typeof it === 'string' ? it : it[0], ix + 26, iy, { size, weight: 600, maxW: cw - 36 });
    if (typeof it !== 'string' && it[1]) txt(ctx, it[1], ix + 26 + measure(ctx, it[0], size) + 12, iy, { size: size * 0.8, weight: 500, color: '#aeb6c8' });
    ctx.restore();
  });
  if (note) txt(ctx, note, x + 30 - slide, y + h - 26, { size: size * 0.78, weight: 500, color: '#c9cfdd', alpha: vis(lt, tin + 0.4 + items.length * stagger, 0.4), maxW: w - 60 });
  ctx.restore();
  return h;
}

// ---------- chamada apontando para um ponto da cena 3D ----------
export function callout(ctx, lt, pt, { label, sub, tin = 0.4, tout = 99, dx = 90, dy = -110, color = '#fff', size = 34 }) {
  if (!pt) return;
  const k = vis(lt, tin, 0.6, tout, 0.3);
  if (k <= 0) return;
  const [px, py] = pt;
  const lw = Math.max(measure(ctx, label, size, AG, 700), sub ? measure(ctx, sub, size * 0.62, IN, 500) : 0) + 44;
  const lineK = easeOut(clamp((lt - tin) / 0.35));
  const ex = px + dx * lineK, ey = py + dy * lineK;
  const dir = dx >= 0 ? 1 : -1;
  ctx.save(); ctx.globalAlpha = Math.min(1, k * 1.3);
  // ponto pulsante
  const pulse = (lt * 1.6) % 1;
  ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - pulse)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, 10 + pulse * 22, 0, 7); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px, py, 8, 0, 7); ctx.fill();
  ctx.fillStyle = color === '#fff' ? RAINBOW[Math.abs(Math.round(px / 97)) % 9] : color; ctx.beginPath(); ctx.arc(px, py, 4.5, 0, 7); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ex, ey); ctx.lineTo(ex + dir * 26 * lineK, ey); ctx.stroke();
  // etiqueta
  const bk = easeOutExpo(clamp((lt - tin - 0.25) / 0.5));
  if (bk > 0) {
    const bh = sub ? size * 2.05 : size * 1.5, bx = dir > 0 ? ex + 26 : ex - 26 - lw * bk, by = ey - bh / 2;
    ctx.save(); rrect(ctx, bx, by, lw * bk, bh, 10); ctx.clip();
    ctx.fillStyle = 'rgba(10,12,20,0.86)'; ctx.fillRect(bx, by, lw, bh);
    ctx.fillStyle = rbGrad(ctx, 0, by + bh, 0, by); ctx.fillRect(dir > 0 ? bx : bx + lw * bk - 6, by, 6, bh);
    const tx = dir > 0 ? bx + 22 : bx + lw * bk - lw + 18;
    txt(ctx, label, tx, by + size * (sub ? 0.98 : 1.04), { size, font: AG, weight: 700 });
    if (sub) txt(ctx, sub, tx, by + size * 1.72, { size: size * 0.62, weight: 500, color: '#cfd5e2' });
    ctx.restore();
  }
  ctx.restore();
}

// ---------- horário (relógio animado) ----------
export function timeBadge(ctx, lt, { time, label, sub, x = SAFE, y = 170, tin = 0.2, tout = 99 }) {
  const k = vis(lt, tin, 0.5, tout, 0.35);
  if (k <= 0) return;
  const [hh, mm] = time.split(':').map(Number);
  ctx.save(); ctx.globalAlpha = k;
  const s = easeOutBack(clamp((lt - tin) / 0.55));
  const R = 62, cx = x + R, cy = y + R;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fillStyle = 'rgba(10,12,20,0.85)'; ctx.fill();
  ctx.lineWidth = 7; ctx.strokeStyle = rbGrad(ctx, -R, R, R, -R); ctx.stroke();
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(Math.sin(a) * R * 0.72, -Math.cos(a) * R * 0.72); ctx.lineTo(Math.sin(a) * R * 0.84, -Math.cos(a) * R * 0.84); ctx.stroke(); }
  const spin = easeOutExpo(clamp((lt - tin) / 1.2));
  const ha = ((hh % 12) + mm / 60) / 12 * Math.PI * 2 * spin, ma = (mm / 60) * Math.PI * 2 * spin + (1 - spin) * -Math.PI * 4;
  ctx.lineCap = 'round'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(ha) * R * 0.42, -Math.cos(ha) * R * 0.42); ctx.stroke();
  ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(ma) * R * 0.66, -Math.cos(ma) * R * 0.66); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fill();
  ctx.restore();
  const rv = easeOutExpo(clamp((lt - tin - 0.15) / 0.6));
  ctx.save(); ctx.beginPath(); ctx.rect(cx + R + 20, y - 20, 900 * rv, 2 * R + 60); ctx.clip();
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 20;
  txt(ctx, time.replace(':', 'h'), cx + R + 28, cy + 12, { size: 104, font: AG, weight: 700 });
  const tw = measure(ctx, time.replace(':', 'h'), 104, AG, 700);
  txt(ctx, label, cx + R + 28 + tw + 28, cy - 8, { size: 50, font: AG, weight: 700 });
  if (sub) txt(ctx, sub, cx + R + 30 + tw + 28, cy + 34, { size: 28, weight: 500, color: '#dfe3ee' });
  ctx.restore();
  ctx.restore();
}

// ---------- programação da festa (16h · 18h30 · 20h30) ----------
export function schedule(ctx, lt, active, { tin = 0.2, tout = 99 } = {}) {
  const k = vis(lt, tin, 0.5, tout, 0.35);
  if (k <= 0) return;
  const steps = [['16h00', 'Pizza'], ['18h30', 'Subway'], ['20h30', 'Sobremesas']];
  const w = 820, h = 64, x = 720, y = SAFE - 30;
  ctx.save(); ctx.globalAlpha = k;
  rrect(ctx, x, y, w, h, 32); ctx.fillStyle = 'rgba(10,12,20,0.78)'; ctx.fill();
  const sw = w / 3;
  steps.forEach(([t, l], i) => {
    const cx = x + sw * i + sw / 2, on = i === active, done = i < active;
    if (on) { rrect(ctx, x + sw * i + 6, y + 6, sw - 12, h - 12, 26); ctx.fillStyle = rbGrad(ctx, x + sw * i, 0, x + sw * (i + 1), 0); ctx.globalAlpha = k * 0.95; ctx.fill(); ctx.globalAlpha = k; }
    txt(ctx, t, cx - 8, y + 41, { size: 26, font: AG, weight: 700, align: 'right', color: on ? '#fff' : done ? '#9aa3b5' : '#cfd5e2' });
    txt(ctx, l, cx + 2, y + 41, { size: 22, weight: on ? 700 : 500, color: on ? '#fff' : '#aeb6c8' });
  });
  ctx.restore();
}

// ---------- minimapa da planta com o ambiente atual e a posição da câmera ----------
const MAP = { x0: -27, x1: 47, z0: -34, z1: 43, s: 3.45 };
const ZONE_RECTS = {
  estacionamento: [L.park.x0, L.park.x1, L.park.z0, L.park.z1], entrada: [L.foyer.x0, L.foyer.x1, L.foyer.z0, L.foyer.z1],
  sala: [L.lounge.x0, L.lounge.x1, L.lounge.z0, L.lounge.z1], banheiros: [L.baths.x0, L.baths.x1, L.baths.z0, L.baths.z1],
  salao: [L.hall.x0, L.hall.x1, L.hall.z0, L.hall.z1], museu: [L.museum.x0, L.museum.x1, L.museum.z0, L.museum.z1],
  kids: [20, L.kids.x1, L.kids.z0, L.kids.z1], palco: [L.stage.x0, L.stage.x1, L.stage.z0, L.stage.z1],
  buffet: [L.hall.x0, -20.5, -22, 10], museu_fitas: [18, 31, -4, 8], museu_cone: [31, 44, -7, 8], museu_2003: [31, 44, -20.5, -7],
  museu_futuro: [18, 44, -32, -20.5], museu_hoje: [18, 31, -20.5, -4],
};
export function minimap(ctx, k, zone, cam, look, label) {
  if (k <= 0) return;
  const { x0, x1, z0, z1, s } = MAP, mw = (x1 - x0) * s, mh = (z1 - z0) * s;
  const ox = W - SAFE - mw, oy = SAFE - 40;
  const P = (x, z) => [ox + (x - x0) * s, oy + (z - z0) * s];
  ctx.save(); ctx.globalAlpha = k;
  rrect(ctx, ox - 14, oy - 14, mw + 28, mh + 58, 16); ctx.fillStyle = 'rgba(10,12,20,0.72)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1.5; ctx.stroke();
  // rua
  let [a, b] = P(x0, 42.5); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(a, b, mw, (43 - 42.5) * s + 0);
  const rect = (r, fill, stroke, lw = 1.5) => { const [ax, az] = P(r[0], r[2]), [bx, bz] = P(r[1], r[3]); if (fill) { ctx.fillStyle = fill; ctx.fillRect(ax, az, bx - ax, bz - az); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.strokeRect(ax, az, bx - ax, bz - az); } };
  rect([L.park.x0, L.park.x1, L.park.z0, L.park.z1], 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.25)', 1);
  rect([L.bx0, L.bx1, L.bz0, L.bz1], 'rgba(255,255,255,0.07)', 'rgba(255,255,255,0.7)', 2);
  for (const key of ['entrada', 'sala', 'banheiros', 'salao', 'museu', 'kids']) rect(ZONE_RECTS[key], null, 'rgba(255,255,255,0.3)', 1);
  rect(ZONE_RECTS.palco, 'rgba(255,255,255,0.18)', null);
  // passarela arco-íris
  [a, b] = P(-1.6, 22.8); const [c2] = P(1.6, 0); ctx.fillStyle = rbGrad(ctx, a, 0, c2, 0); ctx.fillRect(a, b, c2 - a, 17 * s);
  if (zone && ZONE_RECTS[zone]) {
    const r = ZONE_RECTS[zone], [ax, az] = P(r[0], r[2]), [bx, bz] = P(r[1], r[3]);
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(ax, az, bx - ax, bz - az);
    ctx.strokeStyle = rbGrad(ctx, ax, bz, bx, az); ctx.lineWidth = 4; ctx.strokeRect(ax, az, bx - ax, bz - az);
  }
  // câmera
  if (cam) {
    const [cx, cz] = P(cam.x, cam.z); const ang = Math.atan2(look.z - cam.z, look.x - cam.x);
    ctx.save(); ctx.beginPath(); ctx.rect(ox - 10, oy - 10, mw + 20, mh + 20); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.moveTo(cx, cz); ctx.arc(cx, cz, 40, ang - 0.45, ang + 0.45); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cz, 5.5, 0, 7); ctx.fill(); ctx.fillStyle = '#ff2d8a'; ctx.beginPath(); ctx.arc(cx, cz, 3, 0, 7); ctx.fill();
    ctx.restore();
  }
  txt(ctx, 'PLANTA', ox, oy + mh + 34, { size: 18, font: AG, weight: 700, color: '#aeb6c8' });
  if (label) txt(ctx, label, ox + mw, oy + mh + 34, { size: 20, weight: 600, align: 'right' });
  ctx.restore();
}

// ---------- marca d'água VAN GUAR DA (estilo TV) ----------
export function bug(ctx, k = 1) {
  if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = 0.55 * k; ctx.translate(W - SAFE - 70, H - SAFE + 6); ctx.rotate(-0.47);
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 8;
  drawBrand(ctx, 'VAN', -46, -30, 30, { fill: '#fff', altA: false });
  drawBrand(ctx, 'GUAR', -50, 0, 30, { fill: '#fff', altA: false });
  drawBrand(ctx, 'DA', -6, 30, 30, { fill: '#fff', altA: false });
  ctx.restore();
}

// ---------- transição: faixas arco-íris inclinadas (ângulo do "V") ----------
export function wipe(ctx, k) {
  if (k <= 0 || k >= 1) return;
  const skew = H * 0.51, bw = 400, n = RAINBOW.length, total = bw * n;
  const e = sine(k);
  const lx = lerp(W + 40, -total - skew - 40, e);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const x = lx + i * bw;
    ctx.fillStyle = RAINBOW[i];
    ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + skew, 0); ctx.lineTo(x + skew + bw + 2, 0); ctx.lineTo(x + bw + 2, H); ctx.closePath(); ctx.fill();
  }
  // fio branco na borda de ataque
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath(); ctx.moveTo(lx - 10, H); ctx.lineTo(lx + skew - 10, 0); ctx.lineTo(lx + skew, 0); ctx.lineTo(lx, H); ctx.fill();
  ctx.restore();
}

export function flash(ctx, a) { if (a <= 0.003) return; ctx.save(); ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
export function fadeBlack(ctx, a) { if (a <= 0.003) return; ctx.save(); ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }

export function vignette(ctx, a = 0.45) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// foto de referência em moldura (PiP)
export function pip(ctx, lt, img, { x, y, w, label, tin = 0.6, tout = 99, crop }) {
  const k = vis(lt, tin, 0.55, tout, 0.35);
  if (k <= 0) return;
  const [sx, sy, sw, sh] = crop ?? [0, 0, img.width, img.height];
  const h = w * sh / sw;
  ctx.save(); ctx.globalAlpha = k;
  const s = lerp(0.9, 1, easeOutExpo(k));
  ctx.translate(x + w / 2, y + h / 2); ctx.scale(s, s); ctx.rotate((1 - k) * 0.05);
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#fff'; ctx.fillRect(-w / 2 - 8, -h / 2 - 8, w + 16, h + 54);
  ctx.shadowColor = 'transparent';
  ctx.drawImage(img, sx, sy, sw, sh, -w / 2, -h / 2, w, h);
  txt(ctx, label, -w / 2 + 4, h / 2 + 33, { size: 22, weight: 700, color: '#16161a' });
  ctx.restore();
}

// rótulo grande central (palavras na montagem final etc.)
export function bigWord(ctx, k, word, { y = H / 2, size = 170, gradient = true } = {}) {
  if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = Math.min(1, k * 1.5);
  const s = lerp(1.25, 1, easeOutExpo(k)); ctx.translate(W / 2, y); ctx.scale(s, s);
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 30;
  const w = measure(ctx, word, size, AG, 700);
  txt(ctx, word, 0, size * 0.35, { size, font: AG, weight: 700, align: 'center', color: gradient ? rbGrad(ctx, -w / 2, 0, w / 2, 0) : '#fff' });
  ctx.restore();
}
