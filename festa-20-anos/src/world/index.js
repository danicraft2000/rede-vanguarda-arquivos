// Monta o mundo inteiro: carrega imagens, cria texturas compartilhadas, ambientes e luzes.
import * as THREE from 'three';
import { loadImg, loadTex } from './kit.js';
import { canvasTex, glowTex, rainbowTex } from '../lib/textures.js';
import { buildExterior } from './exterior.js';
import { buildInterior } from './interior.js';
import { buildHall } from './hall.js';
import { buildMuseum } from './museum.js';
import { L } from './layout.js';

export async function loadAssets() {
  const img = {};
  const files = {
    banner20: '/build/banner_20anos.png', logo2003w: '/assets/logos/vanguarda_2003.webp', logoAtual: '/assets/logos/v_plano.webp',
    cone: '/assets/logos/cone_1998.webp', ring: '/assets/logos/anel_3d_hd.webp', vanLetters: '/assets/logos/van_guar_da_preto.jpg',
    especial: '/assets/fotos/vanguarda_especial.jpg', estudio: '/assets/fotos/estudio_vanguarda_tv.jpg', fachada: '/assets/fotos/fachada.jpg',
    vinhetas: '/assets/fotos/vinhetas_grade.jpg', salao1: '/assets/fotos/salao_montagem1.jpg', salao2: '/assets/fotos/salao_montagem2.jpg',
    salao3: '/assets/fotos/salao_montagem3.jpg', foyerFoto: '/assets/fotos/foyer_evento.jpg', ringSmall: '/assets/logos/anel_3d.webp',
  };
  await Promise.all(Object.entries(files).map(async ([k, u]) => { img[k] = await loadImg(u); }));
  img.vPlano = img.logoAtual;
  const tex = {};
  tex.logo2003 = await loadTex(files.logo2003w);
  tex.logoAtualT = await loadTex(files.logoAtual);
  tex.glow = glowTex();
  tex.rainbow = rainbowTex();
  tex.washDown = canvasTex(64, 128, (g, w, h) => { const gy = g.createLinearGradient(0, 0, 0, h); gy.addColorStop(0, 'rgba(255,255,255,1)'); gy.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gy; g.fillRect(0, 0, w, h); const gx = g.createLinearGradient(0, 0, w, 0); gx.addColorStop(0, 'rgba(0,0,0,1)'); gx.addColorStop(0.5, 'rgba(0,0,0,0)'); gx.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = gx; g.fillRect(0, 0, w, h); }, { srgb: false });
  const beam = (up) => canvasTex(64, 256, (g, w, h) => { const gy = up ? g.createLinearGradient(0, h, 0, 0) : g.createLinearGradient(0, 0, 0, h); gy.addColorStop(0, 'rgba(255,255,255,0.9)'); gy.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gy; g.fillRect(0, 0, w, h); }, { srgb: false });
  tex.beam = beam(false); tex.beamUp = beam(true);
  tex.especialTitle = canvasTex(1024, 768, (g, w, h) => {
    g.fillStyle = '#0b0b0e'; g.fillRect(0, 0, w, h);
    g.drawImage(img.especial, 0, 0, 640, 430, 0, 0, w, 688);
    const f = g.createLinearGradient(0, 470, 0, 688); f.addColorStop(0, 'rgba(11,11,14,0)'); f.addColorStop(1, 'rgba(11,11,14,1)'); g.fillStyle = f; g.fillRect(0, 470, w, 220);
    g.fillStyle = '#fff'; g.font = '700 58px AvantGarde'; g.textAlign = 'center'; g.fillText('EXPOSIÇÃO', w / 2, 650);
    g.font = '500 34px Inter'; g.globalAlpha = 0.8; g.fillText('15 documentários históricos', w / 2, 712); g.globalAlpha = 1;
  });
  return { img, tex };
}

export async function buildWorld(scene) {
  const A = await loadAssets();
  const ext = buildExterior(A), int = buildInterior(A), hall = buildHall(A), mus = buildMuseum(A);
  const groups = { ...ext.groups, ...int.groups, ...hall.groups, ...mus.groups };
  for (const g of Object.values(groups)) scene.add(g);
  // sombras só no exterior
  for (const k of ['ext', 'facade', 'decor']) groups[k].traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  // ---------- luzes ----------
  const lights = {};
  lights.hemi = new THREE.HemisphereLight('#dfe8ff', '#4a4038', 0.5); scene.add(lights.hemi);
  lights.sun = new THREE.DirectionalLight('#ffd7a8', 1.7); lights.sun.position.set(-60, 45, 70); lights.sun.target.position.set(10, 0, 20);
  lights.sun.castShadow = true; lights.sun.shadow.mapSize.set(2048, 2048);
  Object.assign(lights.sun.shadow.camera, { left: -60, right: 60, top: 40, bottom: -40, near: 10, far: 220 });
  lights.sun.shadow.bias = -0.0004; lights.sun.shadow.normalBias = 0.03;
  scene.add(lights.sun, lights.sun.target);
  const pl = (c, i, d, x, y, z) => { const p = new THREE.PointLight(c, i, d, 1.6); p.position.set(x, y, z); scene.add(p); return p; };
  lights.zone = {
    foyer: [pl('#fff1dc', 10, 14, 0, 2.5, 15.5)],
    lounge: [pl('#ffe9cf', 8, 12, -19, 2.5, 15.5), pl('#ffe9cf', 8, 12, -10, 2.5, 15.5)],
    baths: [pl('#ffffff', 6, 10, 12.5, 1.9, 12.5), pl('#ffffff', 7, 8, 12.5, 2.2, 17.5)],
    hall: [pl('#ffe4c4', 60, 34, -10, 6.2, -6), pl('#ffe4c4', 60, 34, 8, 6.2, -6), pl('#c8b0ff', 55, 26, 0, 6, -22), pl('#ffd9b0', 40, 22, -20, 4.5, -6)],
    museum: [pl('#e8eeff', 26, 18, 24.5, 5.6, 1.5), pl('#d8e2ff', 32, 20, 37.6, 5.6, -0.2), pl('#ffe8cc', 14, 20, 38.4, 4.2, -11.5), pl('#c8d8ff', 28, 20, 25, 5.6, -13), pl('#b8c8ff', 26, 22, 31, 5.6, -26.5)],
    kids: [pl('#fff1e0', 40, 22, 26, 5.5, 14), pl('#fff1e0', 40, 22, 38, 5.5, 14)],
  };
  const anim = [...ext.anim, ...int.anim, ...hall.anim, ...mus.anim];
  const anchors = { ...int.anchors, ...hall.anchors, ...mus.anchors };
  return { A, groups, lights, anim, anchors, L, drawCenter: hall.drawCenter, drawTV: mus.drawTV, curtain: ext.curtain };
}

// Visibilidade por plano (economiza tempo de render: só o que aparece é desenhado)
export const ZONES = {
  exterior: ['ext', 'facade', 'decor', 'roof'],
  maquete: ['ext', 'facade', 'decor', 'shell', 'foyer', 'lounge', 'baths', 'kids', 'hall', 'stage', 'tables', 'food', 'museum', 'tapes', 'cone', 'y2003', 'future', 'now', 'walls'],
  foyer: ['shell', 'ceil', 'foyer', 'lounge', 'baths', 'facade'],
  lounge: ['shell', 'ceil', 'foyer', 'lounge', 'facade'],
  baths: ['shell', 'ceil', 'baths', 'foyer', 'kids', 'facade'],
  hall: ['shell', 'ceil', 'ceilHall', 'hall', 'stage', 'tables', 'food', 'fx', 'facade'],
  museum: ['shell', 'ceil', 'museum', 'tapes', 'cone', 'y2003', 'future', 'now', 'walls', 'facade'],
  kids: ['shell', 'ceil', 'kids', 'baths', 'facade'],
};
export function showZones(world, list) {
  const on = new Set(list);
  for (const [k, g] of Object.entries(world.groups)) g.visible = on.has(k);
}
export function zoneLights(world, zones, scale = 1) {
  for (const [k, arr] of Object.entries(world.lights.zone)) arr.forEach((p) => { p.visible = zones.includes(k); p.userData.base ??= p.intensity; p.intensity = p.userData.base * scale; });
}
void L;
