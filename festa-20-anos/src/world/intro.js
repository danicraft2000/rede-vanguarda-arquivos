// Cenário da abertura/encerramento: vinheta no estilo Vanguarda (letras cromadas + anel 2003 + raios).
import * as THREE from 'three';
import { canvasTex } from '../lib/textures.js';
import { RAINBOW, clamp, easeOutExpo, easeInOut, lerp, BEAT } from '../lib/util.js';
import { vanguardaLetters, ring2003 } from './logos.js';

// ambiente de reflexo arco-íris (o cromo das letras reflete as cores da marca)
export function rainbowEnv(renderer) {
  const sc = new THREE.Scene();
  const tex = canvasTex(1024, 512, (g, w, h) => {
    const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, '#c9ced8'); v.addColorStop(0.3, '#9fa9bc'); v.addColorStop(0.5, '#2a2f3a'); v.addColorStop(0.62, '#0b0c10'); v.addColorStop(1, '#000000');
    g.fillStyle = v; g.fillRect(0, 0, w, h);
    const rb = g.createLinearGradient(0, 0, w, 0); [...RAINBOW, RAINBOW[0]].forEach((c, i) => rb.addColorStop(i / RAINBOW.length, c));
    g.globalAlpha = 0.85; g.fillStyle = rb; g.fillRect(0, h * 0.44, w, h * 0.09); g.globalAlpha = 1;
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(w * 0.1, h * 0.18, w * 0.12, h * 0.08); g.fillRect(w * 0.6, h * 0.22, w * 0.18, h * 0.06);
  });
  tex.mapping = THREE.EquirectangularReflectionMapping;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(10, 64, 32), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide }));
  sc.add(sky);
  const pm = new THREE.PMREMGenerator(renderer);
  return pm.fromScene(sc, 0.02).texture;
}

export function buildIntro() {
  const group = new THREE.Group(); group.position.set(0, 0, 0);
  // fundo com raios (como a vinheta "Vanguarda Especial")
  const rays = canvasTex(1280, 720, () => {}, { mips: false });
  const drawRays = (t, warm = 1) => {
    const g = rays.userData.ctx, w = 1280, h = 720, cx = w / 2, cy = h * 0.48;
    g.fillStyle = '#030305'; g.fillRect(0, 0, w, h);
    const glow = g.createRadialGradient(cx, cy, 10, cx, cy, w * 0.6);
    glow.addColorStop(0, `rgba(255,${Math.round(lerp(220, 170, warm))},${Math.round(lerp(255, 90, warm))},0.95)`); glow.addColorStop(0.25, `rgba(${Math.round(lerp(120, 230, warm))},${Math.round(lerp(60, 90, warm))},${Math.round(lerp(200, 30, warm))},0.6)`); glow.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = glow; g.fillRect(0, 0, w, h);
    g.save(); g.translate(cx, cy); g.rotate(t * 0.12); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 36; i++) {
      const a = i / 36 * Math.PI * 2, wdt = 0.035 + 0.03 * Math.sin(i * 7.3);
      const col = warm > 0.5 ? (i % 3 ? 'rgba(255,150,40,0.10)' : 'rgba(255,220,120,0.08)') : RAINBOW[i % 9].replace('#', '');
      g.fillStyle = warm > 0.5 ? col : `rgba(${parseInt(col.slice(0, 2), 16)},${parseInt(col.slice(2, 4), 16)},${parseInt(col.slice(4, 6), 16)},0.10)`;
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, w, a, a + wdt); g.closePath(); g.fill();
    }
    g.restore();
    rays.needsUpdate = true;
  };
  drawRays(0);
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(64, 36), new THREE.MeshBasicMaterial({ map: rays, toneMapped: false }));
  bg.position.set(0, 0, -14); group.add(bg);

  const letters = vanguardaLetters({ size: 1.3, depth: 0.42, mat: new THREE.MeshStandardMaterial({ color: '#eef2f8', metalness: 1, roughness: 0.2 }) });
  group.add(letters);
  const lineMeshes = letters.children[0].children;      // VAN, GUAR, DA
  const finalPos = lineMeshes.map((m) => m.position.clone());
  const from = [[-14, 6, 6, -1.2, 0.8, -0.6], [15, -3, 4, 0.9, -1.4, 0.5], [3, -12, 8, 1.4, 0.4, -0.9]];

  const ring = ring2003({ R: 2.3, h: 2.4 }); group.add(ring);
  const key = new THREE.PointLight('#ffffff', 10, 30, 1.5); key.position.set(-4, 4, 6); group.add(key);
  const rim = new THREE.PointLight('#ff9a3a', 8, 30, 1.5); rim.position.set(5, -2, 3); group.add(rim);

  // anima: ring (0..1 visível) e letras (k: progresso por linha)
  function update(t, { ringK = 0, ringSpin = 0, lettersT = -1, settle = 0, warm = 1, lettersY = 0 } = {}) {
    drawRays(t, warm);
    ring.visible = ringK > 0.001;
    ring.scale.setScalar(lerp(0.4, 1, easeOutExpo(ringK)));
    ring.rotation.set(0.32 - 0.12 * ringK, lerp(-3.4, 0, easeOutExpo(ringSpin)), 0);
    ring.position.set(0, -0.2, 0);
    letters.visible = lettersT >= 0;
    lineMeshes.forEach((m, i) => {
      const k = easeOutExpo(clamp((lettersT - i * BEAT) / (BEAT * 1.6)));
      const f = from[i];
      m.position.set(lerp(f[0], finalPos[i].x, k), lerp(f[1], finalPos[i].y, k), lerp(f[2], finalPos[i].z, k));
      m.rotation.set(f[3] * (1 - k), f[4] * (1 - k), f[5] * (1 - k));
    });
    letters.position.set(0, lettersY, 0);
    letters.rotation.y = Math.sin(t * 0.6) * 0.12 * (1 - settle * 0.5) - 0.06;
    letters.rotation.x = Math.sin(t * 0.45) * 0.05;
    key.position.set(Math.sin(t * 1.3) * 6, 3 + Math.cos(t) * 1.5, 6);
  }
  return { group, update, letters, ring };
}
