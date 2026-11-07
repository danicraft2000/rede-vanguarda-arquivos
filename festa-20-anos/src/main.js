// Ponto de entrada: monta o mundo e expõe renderFrame(f) para o renderizador quadro a quadro.
import * as THREE from 'three';
import { initEngine, render3D, compose, E } from './lib/engine.js';
import { FPS, DURATION } from './lib/util.js';
import { loadBrand } from './lib/brand.js';
import { buildWorld, showZones, zoneLights, ZONES } from './world/index.js';

const P = new URLSearchParams(location.search);
initEngine({ samples: +(P.get('msaa') ?? 4), bloomScale: 0.5 });
E.renderer.shadowMap.enabled = true;
E.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
await loadBrand();
const world = await buildWorld(E.scene);
window.WORLD = world;

let timeline = null;
if (!P.has('cam')) timeline = (await import('./shots.js')).createTimeline(world);

window.TOTAL_FRAMES = Math.round(DURATION * FPS);
window.renderFrame = (f, q = 0.93) => {
  const t = f / FPS;
  if (timeline) timeline.render(t);
  else debugStill(t);
  return E.out.toDataURL('image/jpeg', q);
};

// modo foto de teste: ?cam=px,py,pz,tx,ty,tz&zones=hall&fov=50
function debugStill(t) {
  const [px, py, pz, tx, ty, tz] = P.get('cam').split(',').map(Number);
  const zone = P.get('zones') ?? 'maquete';
  showZones(world, ZONES[zone] ?? zone.split('+'));
  zoneLights(world, (P.get('lights') ?? zone).split('+'));
  const ext = zone === 'exterior' || zone === 'maquete';
  world.lights.sun.visible = ext; world.lights.sun.castShadow = ext;
  world.lights.hemi.intensity = ext ? 0.5 : 0.3;
  E.scene.environmentIntensity = ext ? 0.45 : 0.3;
  E.scene.background = new THREE.Color(ext ? '#8fb0d8' : '#050507');
  E.camera.fov = +(P.get('fov') ?? 50); E.camera.updateProjectionMatrix();
  E.camera.position.set(px, py, pz); E.camera.lookAt(tx, ty, tz);
  world.anim.forEach((a) => a(t)); world.drawCenter(t); world.drawTV(t);
  render3D();
  compose(() => {});
}
window.READY = true;
