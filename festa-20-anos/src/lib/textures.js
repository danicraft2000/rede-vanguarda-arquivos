// Texturas procedurais desenhadas em canvas (tijolo, piso, madeira, tecido, arco-íris, textos).
import * as THREE from 'three';
import { RAINBOW, rng } from './util.js';

let ANISO = 4;
export function setAniso(a) { ANISO = a; }

export function canvasTex(w, h, draw, { repeat = null, srgb = true, mips = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = ANISO;
  if (!mips) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; }
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.userData.canvas = c; t.userData.ctx = ctx;
  return t;
}

export function brickTex(rep = [1, 1]) {
  return canvasTex(512, 512, (g, w, h) => {
    const r = rng(7);
    g.fillStyle = '#8a7a6c'; g.fillRect(0, 0, w, h);                 // argamassa
    const bh = 32, bw = 96;
    for (let row = 0; row < h / bh; row++) {
      const off = (row % 2) * bw / 2;
      for (let x = -bw; x < w + bw; x += bw) {
        const k = r();
        const base = [150 + k * 40, 70 + k * 22, 48 + k * 16];
        g.fillStyle = `rgb(${base.map(Math.round).join(',')})`;
        g.fillRect(x + off + 2, row * bh + 2, bw - 4, bh - 4);
        g.fillStyle = `rgba(0,0,0,${0.08 + r() * 0.12})`;
        g.fillRect(x + off + 2, row * bh + bh - 8, bw - 4, 6);
      }
    }
  }, { repeat: rep });
}

export function tileTex(rep = [1, 1], { color = '#d9cfbf', line = '#b9ae9c', n = 4 } = {}) {
  return canvasTex(512, 512, (g, w, h) => {
    const r = rng(11);
    const s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const k = (r() - 0.5) * 10;
      g.fillStyle = color; g.fillRect(i * s, j * s, s, s);
      g.fillStyle = `rgba(${k > 0 ? 255 : 0},${k > 0 ? 255 : 0},${k > 0 ? 255 : 0},${Math.abs(k) / 120})`; g.fillRect(i * s, j * s, s, s);
      for (let q = 0; q < 40; q++) { g.fillStyle = `rgba(120,100,80,${r() * 0.05})`; g.beginPath(); g.arc(i * s + r() * s, j * s + r() * s, 4 + r() * 18, 0, 7); g.fill(); }
    }
    g.strokeStyle = line; g.lineWidth = 3;
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
  }, { repeat: rep });
}

export function paverTex(rep = [1, 1]) {
  return canvasTex(512, 512, (g, w, h) => {
    const r = rng(5);
    g.fillStyle = '#5d5a55'; g.fillRect(0, 0, w, h);
    const bw = 64, bh = 32;
    for (let y = 0; y < h; y += bh) for (let x = -bw; x < w; x += bw) {
      const off = ((y / bh) % 2) * bw / 2, k = r();
      g.fillStyle = `rgb(${Math.round(120 + k * 30)},${Math.round(116 + k * 28)},${Math.round(108 + k * 26)})`;
      g.fillRect(x + off + 2, y + 2, bw - 4, bh - 4);
    }
  }, { repeat: rep });
}

export function grassTex(rep = [1, 1]) {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rng(3);
    g.fillStyle = '#3f7a2c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) { const k = r(); g.fillStyle = `rgba(${40 + k * 60},${100 + k * 70},${30 + k * 30},0.7)`; g.fillRect(r() * w, r() * h, 2, 3 + r() * 4); }
  }, { repeat: rep });
}

export function woodTex(rep = [1, 1], tone = [176, 128, 80]) {
  return canvasTex(512, 512, (g, w, h) => {
    const r = rng(9);
    g.fillStyle = `rgb(${tone.join(',')})`; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) {
      const k = Math.sin(y * 0.05 + Math.sin(y * 0.013) * 4) * 0.5 + 0.5;
      g.fillStyle = `rgba(80,45,20,${0.05 + k * 0.12})`; g.fillRect(0, y, w, 1 + r() * 2);
    }
  }, { repeat: rep });
}

export function curtainTex(rep = [1, 1]) {
  return canvasTex(256, 64, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= 16; i++) grd.addColorStop(i / 16, i % 2 ? '#1a1a1d' : '#050506');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  }, { repeat: rep });
}

export function rainbowTex({ vertical = false, list = RAINBOW, w = 512, h = 64 } = {}) {
  return canvasTex(vertical ? h : w, vertical ? w : h, (g, cw, ch) => {
    const grd = vertical ? g.createLinearGradient(0, ch, 0, 0) : g.createLinearGradient(0, 0, cw, 0);
    list.forEach((c, i) => grd.addColorStop(i / (list.length - 1), c));
    g.fillStyle = grd; g.fillRect(0, 0, cw, ch);
  });
}

// mancha de sombra suave (sombra de contato barata)
let _blob;
export function blobTex() {
  if (_blob) return _blob;
  _blob = canvasTex(128, 128, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grd.addColorStop(0, 'rgba(0,0,0,0.55)'); grd.addColorStop(0.55, 'rgba(0,0,0,0.25)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  }, { srgb: false });
  return _blob;
}

// gradiente radial para feixes de luz/halos
let _glow;
export function glowTex() {
  if (_glow) return _glow;
  _glow = canvasTex(128, 128, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(255,255,255,0.45)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  });
  return _glow;
}

// Textura de texto (placas, cartões, etiquetas)
export function textTex(w, h, draw) { return canvasTex(w, h, draw, { mips: true }); }

export function fitText(g, text, maxW, size, font) {
  let s = size;
  do { g.font = font.replace('{s}', s); s -= 1; } while (g.measureText(text).width > maxW && s > 6);
  return s + 1;
}
