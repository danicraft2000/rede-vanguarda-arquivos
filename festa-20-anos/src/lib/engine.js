// Núcleo: renderizador WebGL (three.js) + pós-processamento (bloom) + composição 2D final.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { W, H } from './util.js';
import { setAniso } from './textures.js';

export const E = {};

export function initEngine({ samples = 4, bloomScale = 0.5 } = {}) {
  const glCanvas = document.getElementById('gl');
  const out = document.getElementById('out');
  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  setAniso(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0b0d12');
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.45;

  const camera = new THREE.PerspectiveCamera(45, W / H, 0.05, 600);

  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(1);
  composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W * bloomScale, H * bloomScale), 0.5, 0.4, 1.05);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  // o EffectComposer redimensiona o bloom para a tela inteira; aqui ele volta a trabalhar em resolução reduzida (bem mais leve)
  bloom.setSize(Math.round(W * bloomScale), Math.round(H * bloomScale));
  bloom.setSize = () => {};

  const ctx = out.getContext('2d');
  Object.assign(E, { renderer, scene, camera, composer, bloom, glCanvas, out, ctx, envTex, pmrem });
  return E;
}

export function render3D() { E.composer.render(); }

export function compose(drawOverlay) {
  const { ctx, glCanvas } = E;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.drawImage(glCanvas, 0, 0, W, H);
  drawOverlay(ctx);
}
