// Objetos do museu: fitas de vídeo/áudio, câmeras antigas e atuais, monitores CRT, VTs, drone etc.
import * as THREE from 'three';
import { M, std, glow, roundBox } from './kit.js';
import { canvasTex } from '../lib/textures.js';
import { RAINBOW } from '../lib/util.js';

// medidas reais aproximadas (m) — largura, altura, espessura
export const TAPES = [
  { id: 'k7', name: 'Fita K7', sub: 'áudio cassete', year: '1963', w: 0.100, h: 0.063, d: 0.012, shell: '#202024', label: '#f3eee0', accent: '#e8541e', reels: 'audio' },
  { id: 'umatic', name: 'U-matic', sub: '3/4 de polegada', year: '1971', w: 0.221, h: 0.140, d: 0.030, shell: '#1c1d20', label: '#e9e4d6', accent: '#2a62c9' },
  { id: 'betamax', name: 'Betamax', sub: '1/2 polegada', year: '1975', w: 0.156, h: 0.096, d: 0.025, shell: '#141416', label: '#f1f1f1', accent: '#c9252c' },
  { id: 'vhs', name: 'VHS', sub: '1/2 polegada', year: '1976', w: 0.187, h: 0.102, d: 0.025, shell: '#121214', label: '#ffffff', accent: '#1e6cff' },
  { id: 'betaS', name: 'Betacam SP · S', sub: 'cassete pequeno', year: '1986', w: 0.156, h: 0.096, d: 0.025, shell: '#8d9198', label: '#e9edf2', accent: '#1d4fa8' },
  { id: 'betaL', name: 'Betacam SP · L', sub: 'cassete grande', year: '1986', w: 0.254, h: 0.145, d: 0.025, shell: '#8d9198', label: '#e9edf2', accent: '#1d4fa8' },
  { id: 'hi8', name: 'Hi8', sub: '8 mm', year: '1989', w: 0.095, h: 0.0625, d: 0.015, shell: '#18181b', label: '#e6e6e6', accent: '#b5161e' },
  { id: 'minidv', name: 'MiniDV', sub: 'digital', year: '1995', w: 0.066, h: 0.048, d: 0.012, shell: '#2a2b30', label: '#d7dade', accent: '#2f9a4a' },
  { id: 'dvcam', name: 'DVCAM', sub: 'digital profissional', year: '1996', w: 0.125, h: 0.078, d: 0.0146, shell: '#3b3e44', label: '#e4e6ea', accent: '#7a2bd6' },
];

function tapeFaceTex(T) {
  const W = 512, H = Math.round(512 * T.h / T.w);
  return canvasTex(W, H, (g) => {
    g.fillStyle = T.shell; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(0, 0, W, H * 0.08);
    // etiqueta
    const ly = H * 0.1, lh = H * 0.34;
    g.fillStyle = T.label; g.beginPath(); g.roundRect(W * 0.08, ly, W * 0.84, lh, 8); g.fill();
    g.fillStyle = T.accent; g.fillRect(W * 0.08, ly, W * 0.84, lh * 0.28);
    g.fillStyle = '#ffffff'; g.font = `700 ${Math.round(lh * 0.22)}px AvantGarde`; g.textBaseline = 'middle'; g.fillText(T.name.toUpperCase(), W * 0.11, ly + lh * 0.14);
    g.fillStyle = '#26262a'; g.font = `500 ${Math.round(lh * 0.2)}px Inter`; g.fillText('ACERVO · VANGUARDA', W * 0.11, ly + lh * 0.52);
    g.fillStyle = '#55555c'; g.font = `400 ${Math.round(lh * 0.17)}px Inter`; g.fillText(T.year === '1963' ? 'lado A' : 'matéria · 12h', W * 0.11, ly + lh * 0.8);
    // janela com os dois carretéis
    const wy = H * 0.52, wh = H * 0.36;
    g.fillStyle = '#0a0a0c'; g.beginPath(); g.roundRect(W * 0.18, wy, W * 0.64, wh, 10); g.fill();
    for (const cx of [0.33, 0.67]) {
      const x = W * cx, y = wy + wh / 2, r = wh * 0.42;
      g.fillStyle = '#3a2a1e'; g.beginPath(); g.arc(x, y, r * (cx < 0.5 ? 1 : 0.7), 0, 7); g.fill();   // fita enrolada
      g.fillStyle = '#e9e9ec'; g.beginPath(); g.arc(x, y, r * 0.38, 0, 7); g.fill();
      g.fillStyle = '#0a0a0c'; for (let k = 0; k < 6; k++) { g.save(); g.translate(x, y); g.rotate(k * Math.PI / 3); g.fillRect(-2, -r * 0.3, 4, r * 0.14); g.restore(); }
    }
    if (T.reels === 'audio') { g.fillStyle = '#e8e2d0'; g.fillRect(W * 0.3, H * 0.9, W * 0.4, H * 0.06); }
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 3; g.strokeRect(2, 2, W - 4, H - 4);
  });
}

export function makeTape(T, scale = 1) {
  const face = tapeFaceTex(T);
  const shell = std(T.shell, { roughness: 0.45, metalness: T.shell === '#8d9198' ? 0.35 : 0.05 });
  const mats = [shell, shell, shell, shell, new THREE.MeshStandardMaterial({ map: face, roughness: 0.4 }), shell];
  const m = new THREE.Mesh(new THREE.BoxGeometry(T.w * scale, T.h * scale, T.d * scale), mats);
  return m;
}

// barras de cor SMPTE (monitores CRT)
let BARS;
export function barsTex() {
  if (BARS) return BARS;
  BARS = canvasTex(320, 240, (g, w, h) => {
    const c = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
    c.forEach((col, i) => { g.fillStyle = col; g.fillRect(i * w / 7, 0, w / 7 + 1, h * 0.67); });
    const c2 = ['#0000c0', '#131313', '#c000c0', '#131313', '#00c0c0', '#131313', '#c0c0c0'];
    c2.forEach((col, i) => { g.fillStyle = col; g.fillRect(i * w / 7, h * 0.67, w / 7 + 1, h * 0.08); });
    g.fillStyle = '#00214c'; g.fillRect(0, h * 0.75, w * 0.18, h); g.fillStyle = '#ffffff'; g.fillRect(w * 0.18, h * 0.75, w * 0.18, h); g.fillStyle = '#32006a'; g.fillRect(w * 0.36, h * 0.75, w * 0.18, h); g.fillStyle = '#131313'; g.fillRect(w * 0.54, h * 0.75, w, h);
  });
  return BARS;
}

export function crt(w = 0.5, screenTex = barsTex(), body = '#2a2a2e') {
  const g = new THREE.Group();
  const b = new THREE.Mesh(roundBox(w, w * 0.8, w * 0.85, 0.03), std(body, { roughness: 0.5 })); b.position.z = -w * 0.38; g.add(b);
  const back = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, w * 0.5, w * 0.4), std(body, { roughness: 0.5 })); back.position.z = -w * 0.95; g.add(back);
  const s = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.78, w * 0.585), new THREE.MeshBasicMaterial({ map: screenTex, color: new THREE.Color(1.25, 1.25, 1.25), toneMapped: false }));
  s.position.z = 0.046; s.position.y = w * 0.03; g.add(s);
  return g;
}

export function vtrDeck() {
  const g = new THREE.Group();
  const face = canvasTex(512, 200, (c, w, h) => {
    c.fillStyle = '#2d2f34'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#0c0c0e'; c.fillRect(30, 30, 240, 46);                           // porta da fita
    c.fillStyle = '#121a12'; c.fillRect(300, 30, 180, 40); c.fillStyle = '#4dff6a'; c.font = '600 28px JetBrains Mono'; c.fillText('00:12:03:15', 306, 61);
    for (let i = 0; i < 8; i++) { c.fillStyle = i === 2 ? '#d83a2a' : '#c7cbd2'; c.fillRect(30 + i * 56, 120, 44, 30); }
    c.fillStyle = '#c7cbd2'; c.beginPath(); c.arc(430, 140, 34, 0, 7); c.fill();
    c.fillStyle = '#9aa0a8'; c.font = '600 18px Inter'; c.fillText('BETACAM SP · VTR', 30, 186);
  });
  const mats = Array(6).fill(std('#3a3c42', { roughness: 0.5, metalness: 0.3 })); mats[4] = new THREE.MeshStandardMaterial({ map: face, roughness: 0.5 });
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.17, 0.5), mats));
  return g;
}

// Câmera Betacam SP de ombro (anos 90) num tripé
export function camcorderOld() {
  const g = new THREE.Group();
  const gray = std('#4a4d53', { roughness: 0.55, metalness: 0.2 }), dark = std('#1a1b1e', { roughness: 0.5 });
  const body = new THREE.Mesh(roundBox(0.14, 0.24, 0.46, 0.025), gray); body.position.set(0, 1.62, 0); g.add(body);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.26, 20), dark); lens.rotation.x = Math.PI / 2; lens.position.set(0, 1.6, 0.36); g.add(lens);
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.06, 4, 1, true), dark); hood.rotation.set(Math.PI / 2, Math.PI / 4, 0); hood.position.set(0, 1.6, 0.52); g.add(hood);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.05, 20), std('#1d2e4a', { metalness: 0.9, roughness: 0.05 })); glass.position.set(0, 1.6, 0.493); g.add(glass);
  const vf = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 12), dark); vf.rotation.x = Math.PI / 2; vf.position.set(-0.11, 1.78, 0.14); g.add(vf);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.014, 6, 16, Math.PI), dark); handle.rotation.y = Math.PI / 2; handle.position.set(0, 1.74, 0.02); g.add(handle);
  const batt = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.08), dark); batt.position.set(0, 1.6, -0.27); g.add(batt);
  const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.05), new THREE.MeshBasicMaterial({ map: canvasTex(256, 64, (c, w, h) => { c.fillStyle = '#4a4d53'; c.fillRect(0, 0, w, h); c.fillStyle = '#e9edf2'; c.font = '700 34px AvantGarde'; c.fillText('BETACAM SP', 10, 44); }) }));
  lbl.position.set(0.071, 1.66, 0.0); lbl.rotation.y = Math.PI / 2; g.add(lbl);
  addTripod(g, 1.49);
  return g;
}

function addTripod(g, top) {
  const leg = std('#2b2c30', { roughness: 0.5, metalness: 0.5 });
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.1, 16), leg); head.position.y = top; g.add(head);
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3, l = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.012, top + 0.05, 8), leg);
    l.position.set(Math.cos(a) * 0.28, top / 2, Math.sin(a) * 0.28); l.rotation.set(Math.sin(a) * 0.19, 0, -Math.cos(a) * 0.19); g.add(l);
  }
}

// Câmera de estúdio antiga (pedestal + lente grande + visor)
export function studioCamOld() {
  const g = new THREE.Group();
  const cream = std('#c9c6bc', { roughness: 0.55 }), dark = std('#1b1c1f', { roughness: 0.5 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.18, 3), dark); base.position.y = 0.12; g.add(base);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.15, 16), std('#9aa0a8', { metalness: 0.7, roughness: 0.35 })); col.position.y = 0.78; g.add(col);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.025, 8, 32), std('#9aa0a8', { metalness: 0.7, roughness: 0.35 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.95; g.add(ring);
  const body = new THREE.Mesh(roundBox(0.34, 0.36, 0.6, 0.04), cream); body.position.set(0, 1.6, -0.05); g.add(body);
  const lens = new THREE.Mesh(roundBox(0.24, 0.24, 0.55, 0.03), dark); lens.position.set(0, 1.58, 0.5); g.add(lens);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.085, 24), std('#22314d', { metalness: 0.9, roughness: 0.05 })); glass.position.set(0, 1.58, 0.776); g.add(glass);
  const vf = new THREE.Mesh(roundBox(0.3, 0.22, 0.3, 0.03), cream); vf.position.set(0, 1.92, -0.08); g.add(vf);
  const vfs = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.15), new THREE.MeshBasicMaterial({ color: '#8fa2b8' })); vfs.position.set(0, 1.92, -0.231); vfs.rotation.y = Math.PI; g.add(vfs);
  for (const s of [-1, 1]) { const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.75, 8), std('#9aa0a8', { metalness: 0.8, roughness: 0.3 })); bar.rotation.x = Math.PI / 2 - 0.35; bar.position.set(s * 0.25, 1.45, -0.55); g.add(bar); }
  const tally = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), glow('#ff2020', 3)); tally.position.set(0, 1.81, 0.12); g.add(tally);
  return g;
}

// Câmera de estúdio 4K atual (corpo compacto, lente box, teleprompter)
export function studioCamModern() {
  const g = new THREE.Group();
  const blk = std('#0f1012', { roughness: 0.35, metalness: 0.3 }), al = std('#6e737b', { metalness: 0.9, roughness: 0.3 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.16, 32), blk); base.position.y = 0.1; g.add(base);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.2, 24), al); col.position.y = 0.78; g.add(col);
  const body = new THREE.Mesh(roundBox(0.18, 0.26, 0.38, 0.03), blk); body.position.set(0, 1.55, -0.1); g.add(body);
  const lens = new THREE.Mesh(roundBox(0.3, 0.3, 0.62, 0.04), std('#e9ebee', { roughness: 0.4 })); lens.position.set(0, 1.55, 0.38); g.add(lens);
  const prompterHood = new THREE.Mesh(roundBox(0.5, 0.42, 0.42, 0.03), blk); prompterHood.position.set(0, 1.58, 0.88); g.add(prompterHood);
  const promptGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.36), new THREE.MeshBasicMaterial({ map: canvasTex(256, 200, (c, w, h) => { c.fillStyle = '#05060a'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '600 22px Inter'; ['BOA TARDE!', 'HOJE: DANIEL', 'COMPLETA 20 ANOS', 'NA FESTA DA', 'VANGUARDA...'].forEach((l, i) => c.fillText(l, 22, 38 + i * 34)); }), toneMapped: false }));
  promptGlass.position.set(0, 1.58, 1.095); g.add(promptGlass);
  const vf = new THREE.Mesh(roundBox(0.26, 0.17, 0.08, 0.02), blk); vf.position.set(0, 1.86, -0.12); g.add(vf);
  const vfs = new THREE.Mesh(new THREE.PlaneGeometry(0.23, 0.14), new THREE.MeshBasicMaterial({ map: canvasTex(128, 80, (c, w, h) => { const grd = c.createLinearGradient(0, 0, w, 0); RAINBOW.forEach((col, i) => grd.addColorStop(i / 8, col)); c.fillStyle = grd; c.fillRect(0, 0, w, h); }), toneMapped: false }));
  vfs.position.set(0, 1.86, -0.165); vfs.rotation.y = Math.PI; g.add(vfs);
  const tally = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02), glow('#ff2a2a', 3)); tally.position.set(0, 1.97, -0.1); g.add(tally);
  for (const s of [-1, 1]) { const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.7, 8), al); bar.rotation.x = Math.PI / 2 - 0.3; bar.position.set(s * 0.22, 1.42, -0.5); g.add(bar); }
  return g;
}

export function ptzCam() {
  const g = new THREE.Group(); const w = std('#eef0f3', { roughness: 0.35 }), blk = std('#111', { roughness: 0.3 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 10), std('#9aa0a8', { metalness: 0.8, roughness: 0.3 })); pole.position.y = 0.75; g.add(pole);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 20), w); base.position.y = 1.55; g.add(base);
  const yoke = new THREE.Mesh(roundBox(0.18, 0.16, 0.14, 0.03), w); yoke.position.y = 1.68; g.add(yoke);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 14), blk); head.position.set(0, 1.72, 0.03); g.add(head);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.045, 20), std('#1e3a7a', { metalness: 0.9, roughness: 0.05 })); lens.position.set(0, 1.72, 0.121); g.add(lens);
  return g;
}

export function drone() {
  const g = new THREE.Group(); const gray = std('#4d5158', { roughness: 0.4, metalness: 0.2 }), blk = std('#141518', { roughness: 0.4 });
  const body = new THREE.Mesh(roundBox(0.18, 0.08, 0.3, 0.03), gray); g.add(body);
  const props = [];
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.24), blk); arm.position.set(x * 0.13, 0, z * 0.12); arm.rotation.y = x * z * 0.7; g.add(arm);
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.04, 12), blk); motor.position.set(x * 0.2, 0.03, z * 0.2); g.add(motor);
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.004, 0.02), std('#888c94')); p.position.set(x * 0.2, 0.055, z * 0.2); g.add(p); props.push(p);
  }
  const cam = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), blk); cam.position.set(0, -0.06, 0.13); g.add(cam);
  g.userData.props = props;
  return g;
}
