// Modelos do Espaço Armazém: fachada/terreno (baseado na foto da rua) e maquete da planta.
import { rng } from '../core/anim.js';
import { ARCO } from '../core/ui.js';
import { ZONAS } from '../core/layout.js';

const caixa = (THREE, w, h, d, mat, x = 0, y = 0, z = 0) => {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  b.position.set(x, y, z);
  return b;
};

// Fachada + rua + jardim + grade (como na foto: tijolo aparente, painéis escuros e pórtico cinza)
export function fachada(THREE, kit, { decorada = false } = {}) {
  const g = new THREE.Group();
  const M = kit.m;
  const pl = (w, d, mat, x, y, z) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); p.rotation.x = -Math.PI / 2; p.position.set(x, y, z); p.receiveShadow = true; g.add(p); return p; };
  const parale = kit.tex.paralelepipedo.clone(); parale.repeat.set(30, 4); parale.needsUpdate = true;
  pl(160, 16, M.tex(parale), 0, 0, 32);
  const calc = caixa(THREE, 160, 0.16, 2.6, M.fosco(0xbdb8ae), 0, 0.08, 24.3); calc.receiveShadow = true; g.add(calc);
  const patio = kit.tex.paralelepipedo.clone(); patio.repeat.set(16, 3); patio.needsUpdate = true;
  pl(60, 11, M.tex(patio, { color: 0xc8c2b8 }), 0, 0.02, 17.5);
  pl(160, 60, M.fosco(0x5d7f45), 0, -0.02, -20);
  // corpo do prédio
  const corpo = caixa(THREE, 48, 6, 32, M.fosco(0x55575d), 0, 3, -4); corpo.castShadow = corpo.receiveShadow = true; g.add(corpo);
  g.add(caixa(THREE, 48.8, 0.5, 32.8, M.fosco(0x6f7279), 0, 6.2, -4));
  // painéis da fachada (tijolo × vidro escuro)
  const tij = kit.tex.tijolo.clone(); tij.repeat.set(1.2, 1.6); tij.needsUpdate = true;
  const matTij = M.tex(tij), matVidro = M.brilho(0x24272e, 120, { specular: 0x8899aa });
  for (let i = 0; i < 12; i++) {
    const x = -22 + i * 4;
    if (Math.abs(x) < 4) continue;
    const vidro = i % 3 === 1;
    const p = caixa(THREE, 3.9, 5.5, 0.25, vidro ? matVidro : matTij, x, 2.85, 12.05);
    p.receiveShadow = true; g.add(p);
    if (vidro) g.add(caixa(THREE, 3.9, 0.12, 0.3, M.fosco(0x8e9196), x, 2.9, 12.12));
  }
  g.add(caixa(THREE, 48.6, 0.35, 0.45, M.fosco(0x8e9196), 0, 3.15, 12.2));
  g.add(caixa(THREE, 48.8, 0.9, 0.6, M.fosco(0x8e9196), 0, 5.95, 12.2));
  // pórtico de entrada com cortina preta
  const port = caixa(THREE, 6.6, 7, 2.4, M.fosco(0x8f9297), 0, 3.5, 13.2); port.castShadow = true; g.add(port);
  const cortinaTex = kit.canvasTex(256, 256, (c, w, h) => { for (let x = 0; x < w; x++) { const v = 18 + 14 * Math.sin(x * 0.35) ** 2; c.fillStyle = `rgb(${v},${v},${v + 4})`; c.fillRect(x, 0, 1, h); } });
  g.add(caixa(THREE, 4.8, 5.0, 0.2, M.tex(cortinaTex), 0, 2.5, 14.35));
  g.add(caixa(THREE, 5.0, 0.3, 0.4, M.fosco(0x2a2c30), 0, 5.1, 14.4));
  // grade frontal (instanciada)
  const nBarras = 380;
  const barras = new THREE.InstancedMesh(new THREE.BoxGeometry(0.04, 1.9, 0.04), M.brilho(0x2b2d33, 60), nBarras);
  const mtx = new THREE.Matrix4();
  for (let i = 0; i < nBarras; i++) { mtx.makeTranslation(-29.9 + i * (59.8 / (nBarras - 1)), 0.95, 23.1); barras.setMatrixAt(i, mtx); }
  barras.castShadow = true; g.add(barras);
  for (const y of [0.25, 1.85]) g.add(caixa(THREE, 60, 0.07, 0.07, M.brilho(0x2b2d33, 60), 0, y, 23.1));
  for (let x = -30; x <= 30; x += 6) g.add(caixa(THREE, 0.14, 2.0, 0.14, M.brilho(0x3a3c42, 60), x, 1.0, 23.1));
  // canteiros e cerca viva
  g.add(caixa(THREE, 22, 0.5, 0.9, M.fosco(0x3f7a34), -18.5, 0.25, 22.4));
  g.add(caixa(THREE, 22, 0.5, 0.9, M.fosco(0x3f7a34), 18.5, 0.25, 22.4));
  // árvores e palmeiras
  const a1 = kit.arvore(1.5, 0x3d7d35); a1.position.set(-26, 0, 20); g.add(a1);
  const a3 = kit.arvore(1.3, 0x2f6b2c); a3.position.set(13, 0, 21.5); g.add(a3);
  for (const [x, z, s] of [[22, 21, 1.1], [26, 19, 1.2], [29, 22, 1.0], [-30, 15, 1.1]]) { const p = kit.palmeira(s); p.position.set(x, 0, z); g.add(p); }
  g.traverse((o) => { if (o.isMesh && !o.isInstancedMesh) { o.castShadow = o.castShadow || false; } });
  // prédios ao fundo (como na foto)
  for (const [x, z, w, h] of [[-8, -70, 9, 34], [10, -80, 8, 42], [30, -90, 10, 30], [-34, -85, 10, 26]]) {
    const t = caixa(THREE, w, h, w, M.fosco(0xe9e7e2), x, h / 2, z);
    g.add(t);
    for (let k = 3; k < h; k += 3) g.add(caixa(THREE, w + 0.3, 0.25, w + 0.3, M.fosco(0xcfccc5), x, k, z));
  }
  // carros estacionados
  const cores = [0x7d7f86, 0x2a2e3a, 0xb9bcc4, 0x8a1f1f, 0xd9d9d9, 0x23354f];
  const vagas = [[-22, 16], [-16, 16], [-10, 16], [10, 16], [16, 16], [22, 16]];
  vagas.forEach(([x, z], i) => { const c = kit.carro(cores[i]); c.position.set(x, 0, z); c.rotation.y = Math.PI / 2; c.traverse((o) => { if (o.isMesh) o.castShadow = true; }); g.add(c); });

  if (decorada) {
    // arcos arco-íris no caminho de entrada (decoração Vanguarda 2003 + atual)
    for (const z of [15.6, 17.6, 19.6, 21.6]) {
      const a = kit.arcoIris(3.6, 0.14, 0.35); a.position.set(0, 0, z); g.add(a);
    }
    // faixas de LED arco-íris no chão
    ARCO.forEach((c, i) => {
      const fita = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 9), M.luz(c));
      fita.position.set(-2.6 - i * 0.12, 0.05, 18.6); g.add(fita);
      const f2 = fita.clone(); f2.position.x = 2.6 + i * 0.12; g.add(f2);
    });
    g.userData.totens = [];
  }
  return g;
}

// Maquete (planta 3D) com as zonas da festa
export function maquete(THREE, kit) {
  const g = new THREE.Group();
  const M = kit.m;
  const base = caixa(THREE, 64, 0.6, 50, M.fosco(0xf3f1ec), 0, -0.3, 2.5); base.receiveShadow = true; g.add(base);
  g.add(caixa(THREE, 64, 0.62, 3.5, M.fosco(0x5a5d66), 0, -0.29, 25.5));
  // piso interno
  const piso = caixa(THREE, 48, 0.1, 32, M.fosco(0xe8e2d6), 0, 0.05, -4); piso.receiveShadow = true; g.add(piso);
  // zonas coloridas
  for (const [k, z] of Object.entries(ZONAS)) {
    if (k === 'lote' || k === 'salao') continue;
    const w = z.x1 - z.x0, d = z.z1 - z.z0;
    const p = caixa(THREE, w - 0.2, 0.06, d - 0.2, new THREE.MeshLambertMaterial({ color: z.cor, transparent: true, opacity: 0.55 }), (z.x0 + z.x1) / 2, 0.13, (z.z0 + z.z1) / 2);
    p.receiveShadow = true; g.add(p);
  }
  // paredes em corte
  const mp = M.fosco(0xffffff);
  const parede = (x0, z0, x1, z1, h = 1.6) => {
    const comp = Math.hypot(x1 - x0, z1 - z0);
    const p = caixa(THREE, comp, h, 0.3, mp, (x0 + x1) / 2, h / 2, (z0 + z1) / 2);
    p.rotation.y = -Math.atan2(z1 - z0, x1 - x0); p.castShadow = p.receiveShadow = true; g.add(p);
  };
  parede(-24, -20, 24, -20); parede(-24, -20, -24, 12); parede(24, -20, 24, 12);
  parede(-24, 12, -3, 12); parede(3, 12, 24, 12);
  parede(-24, 4, -4.8, 4); parede(-1.5, 4, 8, 4, 1.2); parede(8, -20, 8, -6); parede(8, -1, 8, 12);
  parede(-16, 4, -16, 12); parede(-4, 4, -4, 8.5); parede(4, 4, 4, 8.5);
  parede(8, -3, 24, -3, 1.0);
  for (let i = 1; i < 4; i++) parede(-24 + i * 2, 4.2, -24 + i * 2, 10.5, 1.2);
  // estacionamento: carros e arcos
  for (const z of [16, 18.5, 21]) { const a = kit.arcoIris(2.6, 0.12, 0.3); a.position.set(0, 0, z); g.add(a); }
  [[-20, 18], [-13, 18], [13, 18], [20, 18]].forEach(([x, z], i) => { const c = kit.carro([0x7d7f86, 0x2a2e3a, 0xb9bcc4, 0x8a1f1f][i]); c.position.set(x, 0, z); c.rotation.y = Math.PI / 2; g.add(c); });
  // palco + 3 telões
  g.add(caixa(THREE, 16, 0.8, 5, M.fosco(0x1b1b22), -6, 0.4, -17.5));
  const cT = [0x3d6ff0, 0xf2d33a, 0xd6247e];
  [-11, -6, -1].forEach((x, i) => g.add(caixa(THREE, 4.2, 2.4, 0.2, M.luz(cT[i]), x, 2.6, -19.6)));
  // mesas
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const t = kit.mesaRedonda(0xffffff, 0.8); t.position.set(-12 + i * 3.8, 0.1, -11 + j * 3.6); g.add(t); }
  // buffet com fornos
  g.add(caixa(THREE, 1.4, 1.0, 12, M.brilho(0x8a5a32, 30), 6.6, 0.6, -6));
  for (const z of [-11, -9.5]) g.add(caixa(THREE, 1.0, 0.7, 1.0, M.brilho(0x222222, 60), 6.6, 1.45, z));
  // gamer
  for (let j = 0; j < 3; j++) { g.add(caixa(THREE, 2.4, 0.8, 1, M.fosco(0x222230), -22.4, 0.5, -12.5 + j * 3)); g.add(caixa(THREE, 1.6, 0.9, 0.08, M.luz(ARCO[j * 3]), -22.4, 1.4, -12.9 + j * 3)); }
  // playground
  for (let i = 0; i < 9; i++) { const b = caixa(THREE, 1.1, 0.4 + (i % 3) * 0.4, 1.1, M.brilho(ARCO[i], 40), -22.5 + (i % 3) * 2, 0.3 + (i % 3) * 0.2, -2.5 + Math.floor(i / 3) * 2); g.add(b); }
  // sala de estar (sofás)
  for (const x of [-14, -10, -6.5]) g.add(caixa(THREE, 2.4, 0.7, 1, M.brilho(0x3a3f7a, 30), x, 0.45, 10.6));
  // entrada: caixa de presentes
  g.add(caixa(THREE, 1.4, 1.2, 1.4, M.brilho(0xd6247e, 40), 0, 0.7, 8));
  // museu: pedestais + cone
  for (let i = 0; i < 6; i++) g.add(caixa(THREE, 1.2, 1.1, 1.2, M.fosco(0xffffff), 11 + (i % 3) * 3.5, 0.6, 3 + Math.floor(i / 3) * 4));
  const cone = kit.cone98({ R: 1.2, H: 1.8 }); cone.position.set(20.5, 1.6, 8); g.add(cone);
  // estúdios (3 cenários)
  [[0x5a4fd0, 11.5], [0x2a7fe0, 16], [0xe9e6f5, 20.5]].forEach(([c, x]) => { g.add(caixa(THREE, 3.6, 2.2, 0.25, M.brilho(c, 30), x, 1.2, -18.6)); g.add(caixa(THREE, 2.2, 0.8, 0.8, M.brilho(0xd8b98a, 30), x, 0.5, -15.5)); });
  // pessoas
  const r = rng(77);
  for (let i = 0; i < 70; i++) {
    const x = -22 + r() * 44, z = -18 + r() * 28;
    if (x > 7 && x < 9) continue;
    const p = kit.pessoa(0xffffff, 1.7); p.position.set(x, 0.1, z); g.add(p);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
