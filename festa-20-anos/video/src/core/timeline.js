// Linha do tempo do vídeo, presa à grade de batidas da música
// (≈99,07 BPM; analisada com librosa: batida = 0,60565 s, primeira batida em 0,0305 s).
export const FPS = 30;
export const DURACAO = 300.6;               // duração da música (s)
export const TOTAL_QUADROS = Math.round(DURACAO * FPS); // 9018
export const BATIDA = 0.60565;
export const T0 = 0.0305;
export const COMPASSO = BATIDA * 4;          // 2,4226 s
export const tCompasso = (b) => T0 + b * COMPASSO;

// Seções mostradas no contador do canto (estilo apresentação de arquitetura)
export const SECOES = [
  'O LOCAL', 'ESTACIONAMENTO', 'ENTRADA', 'SALA DE ESTAR', 'VANGUARDA ESPECIAL',
  'SALÃO PRINCIPAL', 'CARDÁPIO', 'GAMER & KIDS', 'MUSEU VANGUARDA', 'ESTÚDIOS', 'O FUTURO',
];

// id, compassos, transição de entrada, seção (índice em SECOES), zona da mini-planta, relógio
export const ROTEIRO = [
  { id: 'intro',        c: 2,  tr: 'none' },
  { id: 'titulo',       c: 4,  tr: 'flash' },
  { id: 'tema',         c: 3,  tr: 'arco' },
  { id: 'local',        c: 5,  tr: 'arco',   sec: 0, relogio: '15:30' },
  { id: 'horario',      c: 4,  tr: 'aneis',  sec: 0 },
  { id: 'planta',       c: 5,  tr: 'arco',   sec: 0 },
  { id: 'estacionamento', c: 4, tr: 'v',     sec: 1, zona: 'estacionamento' },
  { id: 'entrada',      c: 4,  tr: 'arco',   sec: 2, zona: 'entrada' },
  { id: 'sala',         c: 4,  tr: 'flash',  sec: 3, zona: 'sala' },
  { id: 'galeria',      c: 7,  tr: 'arco',   sec: 4, zona: 'sala' },
  { id: 'mosaico',      c: 3,  tr: 'aneis',  sec: 4, zona: 'sala', semMapa: true },
  { id: 'salao',        c: 6,  tr: 'v',      sec: 5, zona: 'salao' },
  { id: 'teloes',       c: 3,  tr: 'flash',  sec: 5, zona: 'palco', semMapa: true },
  { id: 'mesas',        c: 2,  tr: 'arco',   sec: 5, zona: 'mesas' },
  { id: 'pizza',        c: 3,  tr: 'aneis',  sec: 6, zona: 'buffet',   relogio: '16:00', semMapa: true },
  { id: 'subway',       c: 10, tr: 'arco',   sec: 6, zona: 'buffet',   relogio: '18:30', semMapa: true },
  { id: 'sobremesas',   c: 3,  tr: 'v',      sec: 6, zona: 'buffet',   relogio: '20:30', semMapa: true },
  { id: 'gamer',        c: 3,  tr: 'flash',  sec: 7, zona: 'gamer' },
  { id: 'playground',   c: 2,  tr: 'arco',   sec: 7, zona: 'playground' },
  { id: 'museu',        c: 2,  tr: 'aneis',  sec: 8, zona: 'museu', semMapa: true },
  { id: 'fitas',        c: 8,  tr: 'arco',   sec: 8, zona: 'museu' },
  { id: 'cameras',      c: 3,  tr: 'flash',  sec: 8, zona: 'museu' },
  { id: 'cone',         c: 3,  tr: 'v',      sec: 8, zona: 'museu' },
  { id: 'estudio2003',  c: 6,  tr: 'arco',   sec: 9, zona: 'estudios' },
  { id: 'estudio2006',  c: 3,  tr: 'flash',  sec: 9, zona: 'estudios' },
  { id: 'estudio2012',  c: 5,  tr: 'arco',   sec: 9, zona: 'estudios' },
  { id: 'experiencia',  c: 8,  tr: 'aneis',  sec: 9, zona: 'estudios', semMapa: true },
  { id: 'futuro',       c: 4,  tr: 'v',      sec: 10, zona: 'museu' },
  { id: 'final',        c: 0,  tr: 'arco',   relogio: '23:45' },
];

// Calcula início/fim (s) de cada cena: cortes sempre no começo de um compasso.
export function montarRoteiro() {
  let b = 0;
  return ROTEIRO.map((r, i) => {
    const ini = i === 0 ? 0 : tCompasso(b);
    b += r.c;
    const fim = i === ROTEIRO.length - 1 ? DURACAO : tCompasso(b);
    return { ...r, ini, fim, dur: fim - ini, compassoIni: b - r.c };
  });
}

// Pulso que bate em cada batida (1 no ataque, decai rápido) — usado para "respirar" com a música
export function pulso(t, decai = 0.14) {
  if (t < T0) return 0;
  const f = ((t - T0) % BATIDA) / decai;
  return Math.exp(-f * 2.2);
}
// Pulso só nos tempos fortes (bumbo: tempos 1 e 3)
export function pulsoForte(t, decai = 0.18) {
  if (t < T0) return 0;
  const f = ((t - T0) % (BATIDA * 2)) / decai;
  return Math.exp(-f * 2.2);
}
export const batidaIdx = (t) => Math.floor((t - T0) / BATIDA);
