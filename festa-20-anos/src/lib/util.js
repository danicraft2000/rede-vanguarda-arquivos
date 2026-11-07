// Utilidades: tempo musical, easing, aleatório determinístico, paleta Vanguarda.
export const FPS = 30;
export const W = 1920, H = 1080;
export const BEAT = 0.60372;            // ~99,4 BPM (medido na trilha)
export const BEAT0 = 0.12;              // primeira batida
export const PHRASE = BEAT * 6;         // frase musical de 6 tempos = 3,622 s
export const LOOP = BEAT * 132;         // 22 frases = 79,69 s (a trilha é repetida 3x emendada no tempo)
export const DURATION = 240;            // segundos de vídeo
export const phraseT = (i) => (i === 0 ? 0 : BEAT0 + i * PHRASE);

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const inv = (a, b, x) => clamp((x - a) / (b - a));
export const smooth = (t) => t * t * (3 - 2 * t);
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const easeInExpo = (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10));
export const easeIn = (t) => t * t * t;
export const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
export const sine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

// pulso de batida: 1 na batida, decai até a próxima (para animar luzes e grafismo no ritmo)
export function beatPulse(t, decay = 6) {
  if (t < BEAT0) return 0;
  const ph = ((t - BEAT0) % BEAT) / BEAT;
  return Math.exp(-ph * decay);
}
export const beatIndex = (t) => Math.floor((t - BEAT0) / BEAT);

export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Arco-íris da Rede Vanguarda (2003): do magenta ao violeta, como no "V" e no banner
export const RAINBOW = ['#ff2d8a', '#ff1a1a', '#ff7a00', '#ffd400', '#3ad83a', '#00c8d8', '#1e6cff', '#5a2dff', '#c000ff'];
export const RAINBOW_V = ['#6a2cd6', '#2a5cf0', '#1aa7c8', '#22b85a', '#9ad021', '#f2d21a', '#f59a12', '#f05a1a', '#e01e3c', '#d81e8c'];
export function rainbowAt(u, list = RAINBOW) {
  u = clamp(u) * (list.length - 1);
  const i = Math.min(list.length - 2, Math.floor(u)), f = u - i;
  const a = hex(list[i]), b = hex(list[i + 1]);
  return `rgb(${Math.round(lerp(a[0], b[0], f))},${Math.round(lerp(a[1], b[1], f))},${Math.round(lerp(a[2], b[2], f))})`;
}
export function hex(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
