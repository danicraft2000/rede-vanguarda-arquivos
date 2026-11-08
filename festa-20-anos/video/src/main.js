// Orquestrador: monta todas as cenas e expõe renderFrame(quadro) para o renderizador.
import * as THREE from 'three';
import { montarRoteiro, FPS, TOTAL_QUADROS, pulso, pulsoForte } from './core/timeline.js';
import { criarKit } from './core/kit.js';
import { criarTransicoes } from './core/transitions.js';
import { criarHUD } from './core/hud.js';
import { h } from './core/ui.js';
import { CENAS } from './scenes/index.js';

const roteiro = montarRoteiro();
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(1920, 1080, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const kit = await criarKit(renderer);
const ov = document.getElementById('ov');
const so = new URLSearchParams(location.search).get('so'); // depuração: montar só algumas cenas
const instancias = [];
for (const r of roteiro) {
  const raiz = h('div', 'cena', ov);
  raiz.dataset.id = r.id;
  const criar = CENAS[r.id];
  let inst = { upd() {} };
  if (criar && (!so || so.split(',').includes(r.id))) inst = await criar({ THREE, renderer, kit, raiz, r });
  inst.raiz = raiz;
  instancias.push(inst);
}
// Pré-decodifica imagens do DOM e compila shaders (evita quadros "piscando")
await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
for (const inst of instancias) if (inst.cena && inst.cam) renderer.compile(inst.cena, inst.cam);

const trans = criarTransicoes(document.getElementById('tr'), document.getElementById('palco'), roteiro);
const hud = criarHUD(document.getElementById('hud'), roteiro);
let ativa = -1;

window.renderFrame = (q) => {
  const t = Math.min(q / FPS, roteiro[roteiro.length - 1].fim - 1e-4);
  let i = roteiro.findIndex((r) => t >= r.ini && t < r.fim);
  if (i < 0) i = roteiro.length - 1;
  if (i !== ativa) {
    if (ativa >= 0) instancias[ativa].raiz.style.display = 'none';
    instancias[i].raiz.style.display = 'block';
    ativa = i;
  }
  const r = roteiro[i], inst = instancias[i];
  const lt = t - r.ini;
  inst.upd(lt, { t, dur: r.dur, pulso: pulso(t), forte: pulsoForte(t), r });
  if (inst.cena && inst.cam) {
    canvas.style.visibility = 'visible';
    renderer.render(inst.cena, inst.cam);
  } else canvas.style.visibility = 'hidden';
  hud.upd(t, r, i);
  trans.upd(t);
  return r.id;
};
window.ROTEIRO = roteiro.map(({ id, ini, fim }) => ({ id, ini, fim }));
window.TOTAL_QUADROS = TOTAL_QUADROS;
window.PRONTO = true;
