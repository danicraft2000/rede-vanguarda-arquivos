// O futuro: computador moderno cenográfico, Inteligência Artificial e a Televisão do Futuro.
import { E, seg, lerp, rng } from '../core/anim.js';
import { h, camada, ARCO, pino, projetar } from '../core/ui.js';
import { cartaoTitulo } from './local.js';
import { scrim } from './espacos.js';

async function futuro({ THREE, kit, raiz }) {
  const cena = kit.novaCena({ fundo: 0x02030c, nevoa: [0x02030c, 12, 30] });
  const cam = kit.camera(42);
  cena.add(new THREE.HemisphereLight(0x9fd8ff, 0x10102a, 0.9));
  const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(2, 7, 5); cena.add(dl);
  // piso com grade luminosa
  const grade = kit.canvasTex(512, 512, (g, w, hh) => { g.fillStyle = '#05071a'; g.fillRect(0, 0, w, hh); g.strokeStyle = 'rgba(39,211,255,0.55)'; g.lineWidth = 3; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, hh); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } }, [10, 10]);
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), kit.m.brilho(0xffffff, 120, { map: grade, specular: 0x3366aa })); piso.rotation.x = -Math.PI / 2; cena.add(piso);
  // 1) computador moderno cenográfico
  const pc = new THREE.Group();
  const mesa = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 0.9), kit.m.brilho(0xf4f6fb, 90)); mesa.position.y = 0.76; pc.add(mesa);
  const pe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.76, 0.7), kit.m.cromo()); pe.position.set(-1.0, 0.38, 0); pc.add(pe); const pe2 = pe.clone(); pe2.position.x = 1.0; pc.add(pe2);
  const telaPC = kit.canvasTex(1024, 432, (g, w, hh) => { const gr = g.createLinearGradient(0, 0, w, hh); gr.addColorStop(0, '#0b1a5a'); gr.addColorStop(1, '#4a1a8a'); g.fillStyle = gr; g.fillRect(0, 0, w, hh); for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(255,255,255,${0.08 + i * 0.02})`; g.fillRect(40 + i * 160, 60, 130, 300); } g.fillStyle = '#fff'; g.font = '700 54px AG'; g.fillText('EDIÇÃO 8K · IA', 50, 400); ARCO.forEach((c, i) => { g.fillStyle = c; g.fillRect(40 + i * 94, 20, 90, 10); }); });
  const curva = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.62, 48, 1, true, -0.45, 0.9), kit.m.texB(telaPC, { side: 2 }));
  curva.rotation.y = Math.PI; curva.position.set(0, 1.3, 2.0); pc.add(curva);
  const holo = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), new THREE.MeshBasicMaterial({ color: 0x27d3ff, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, side: 2 }));
  holo.position.set(0.9, 1.75, -0.1); holo.rotation.y = -0.4; pc.add(holo);
  const tecl = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.02, 0.22), kit.m.texB(kit.tex.arcoH)); tecl.position.set(0, 0.8, 0.2); pc.add(tecl);
  pc.position.set(-3.6, 0, 0); pc.rotation.y = 0.5; cena.add(pc);
  // 2) IA — esfera neural
  const ia = new THREE.Group();
  const ico = new THREE.IcosahedronGeometry(0.9, 2);
  const linhas = new THREE.LineSegments(new THREE.EdgesGeometry(ico), new THREE.LineBasicMaterial({ color: 0x7fe3ff, transparent: true, opacity: 0.7 }));
  ia.add(linhas);
  const nos = new THREE.Points(ico, new THREE.PointsMaterial({ color: 0xffffff, size: 0.06 }));
  ia.add(nos);
  const nucleo = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24), new THREE.MeshBasicMaterial({ color: 0x7b3fe0 }));
  ia.add(nucleo);
  const brilho = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 24), new THREE.MeshBasicMaterial({ color: 0x9a6aff, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
  ia.add(brilho);
  const aneis = ARCO.filter((_, i) => i % 3 === 0).map((c, i) => { const a = new THREE.Mesh(new THREE.TorusGeometry(1.2 + i * 0.12, 0.012, 6, 96), kit.m.luz(c)); a.rotation.x = Math.PI / 2 + i * 0.5; ia.add(a); return a; });
  ia.position.set(0, 2.0, -1.2); cena.add(ia);
  const pedIA = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.3, 48), kit.m.brilho(0xf4f6fb, 80)); pedIA.position.set(0, 0.15, -1.2); cena.add(pedIA);
  const feixeIA = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 1.4, 32, 1, true), kit.m.feixe(0x7fe3ff, 0.12)); feixeIA.position.set(0, 0.95, -1.2); cena.add(feixeIA);
  // 3) TV do futuro — tela ultrafina + holograma do V
  const texTV = await kit.imgTex('/svg/teloes/telao-centro-arco-iris.svg', 1920, 1080);
  const tv = new THREE.Group();
  const painel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.8, 0.02), kit.m.brilho(0x111111, 120)); tv.add(painel);
  const img = new THREE.Mesh(new THREE.PlaneGeometry(3.14, 1.74), kit.m.texB(texTV)); img.position.z = 0.012; tv.add(img);
  const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 8), kit.m.cromo()); haste.position.y = -1.4; tv.add(haste);
  const baseTV = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.04, 32), kit.m.cromo()); baseTV.position.y = -1.9; tv.add(baseTV);
  tv.position.set(3.6, 1.92, -0.4); tv.rotation.y = -0.5; cena.add(tv);
  const holoV = kit.logoV({ tipo: '2012', R: 0.35, H: 0.4, seg: 48 });
  holoV.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.75; } });
  holoV.position.set(3.6, 3.3, -0.4); cena.add(holoV);
  // partículas
  const r = rng(12), pos = [];
  for (let i = 0; i < 400; i++) pos.push((r() - 0.5) * 20, r() * 6, (r() - 0.5) * 14);
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x9fd8ff, size: 0.04, transparent: true, opacity: 0.7 }));
  cena.add(pts);
  [[-3.6, 0x6fa8ff], [0, 0xb38aff], [3.6, 0x6fe0ff]].forEach(([x, c]) => { const l = new THREE.PointLight(c, 10, 7); l.position.set(x, 3, 1.5); cena.add(l); });
  const L = camada(raiz);
  const sc = scrim(L);
  sc.style.background = 'linear-gradient(180deg, rgba(2,3,12,0.9) 0%, rgba(2,3,12,0.5) 32%, rgba(2,3,12,0) 48%)';
  const card = cartaoTitulo(L, { k: 'ATUALIDADE & FUTURO', t: 'VANGUARDA 2029+', sub: 'Computador moderno cenográfico, <b>Inteligência Artificial</b> e a <b>Televisão do Futuro</b>.', y: 150, cls: 'tit-m', largura: 1500 });
  const pins = [['Computador cenográfico', 'edição em 8K', [-3.6, 1.7, 0.4], '#3d6ff0', 80], ['Inteligência Artificial', 'roteiro, edição e legendas', [0, 2.9, -1.2], '#7b3fe0', 30], ['TV do Futuro', 'tela ultrafina + holograma', [3.6, 2.8, -0.4], '#27d3ff', 30]].map(([t, s, p, c, a]) => ({ pin: pino(L, t, s, c), v: new THREE.Vector3(...p), a }));
  return {
    cena, cam,
    upd(lt, S) {
      const p = E.inOutSine(seg(lt, 0, S.dur));
      const ang = lerp(-0.25, 0.25, p);
      cam.position.set(Math.sin(ang) * 8.6, lerp(2.4, 2.7, p), Math.cos(ang) * 8.6);
      cam.lookAt(0, 1.75, -0.6);
      cam.setViewOffset(1920, 1080, 0, -70, 1920, 1080);
      ia.rotation.y = S.t * 0.5; ia.rotation.x = Math.sin(S.t * 0.4) * 0.2;
      aneis.forEach((a, i) => (a.rotation.z = S.t * (0.6 + i * 0.3)));
      brilho.scale.setScalar(1 + 0.15 * S.pulso);
      holoV.rotation.y = S.t * 0.8;
      holoV.position.y = 3.3 + Math.sin(S.t * 1.5) * 0.06;
      pts.rotation.y = S.t * 0.03;
      card.upd(lt, 0.2);
      pins.forEach((o, i) => o.pin.upd(lt, 1.0 + i * 0.5, projetar(THREE, o.v, cam), o.a));
    },
  };
}

export default { futuro };
