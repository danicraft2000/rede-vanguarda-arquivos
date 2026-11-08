// Estúdios recriados (2003 Vanguarda TV, 2006 Vanguarda TV, 2012 Bom Dia/Link/Jornal) e a experiência de apresentador.
import { E, seg, lerp, ruido, rng } from '../core/anim.js';
import { h, camada, fx, fxLetras, titulo, kicker, fundo2D, vg, ARCO, pino, projetar } from '../core/ui.js';
import { BATIDA } from '../core/timeline.js';
import { cartaoTitulo } from './local.js';
import { scrim } from './espacos.js';
import { cameraEstudio } from './museu.js';

// Cartão "memória" com a foto de referência do estúdio original
function memoria(L, src, legenda, x, y, w = 420, rot = -4) {
  const c = h('div', '', L);
  c.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${w}px;padding:14px 14px 44px;background:#fff;border-radius:6px;box-shadow:0 20px 50px rgba(0,0,0,0.6)`;
  c.innerHTML = `<img src="${src}" style="display:block;width:100%;height:auto;border-radius:3px"><div style="position:absolute;left:0;right:0;bottom:12px;text-align:center;font-size:19px;font-weight:700;color:#3b4170">${legenda}</div>`;
  return { el: c, upd: (lt, a) => fx(c, lt, { a, d: 0.7, y: 60, s: 0.8, rz: rot * 3, e: E.outBack, brz: rot }) };
}

function aoVivo(L, texto = 'EXPERIÊNCIA: 1min30 NO AR') {
  const e = h('div', '', L);
  e.style.cssText = 'position:absolute;right:70px;top:190px;display:flex;align-items:center;gap:12px;padding:12px 22px;border-radius:10px;background:rgba(200,20,30,0.92);font-weight:800;font-size:22px;letter-spacing:2px';
  e.innerHTML = `<span style="width:16px;height:16px;border-radius:50%;background:#fff;display:inline-block"></span>${texto}`;
  const ponto = e.querySelector('span');
  return (lt, a) => { fx(e, lt, { a, d: 0.5, x: 40 }); ponto.style.opacity = Math.sin(lt * 6) > 0 ? 1 : 0.25; };
}

// ---------------------------------------------------------------- 2003
async function estudio2003({ THREE, kit, raiz }) {
  const cena = kit.novaCena({ fundo: 0x05051a });
  const cam = kit.camera(40);
  cena.add(new THREE.HemisphereLight(0xd8dcff, 0x20203a, 1.3));
  const dl = new THREE.DirectionalLight(0xffffff, 1.8); dl.position.set(2, 6, 6); cena.add(dl);
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(20, 14), kit.m.brilho(0xa9aec4, 50)); piso.rotation.x = -Math.PI / 2; cena.add(piso);
  // parede de painéis roxo-azulados com venezianas
  const painel = kit.canvasTex(256, 256, (g, w, hh) => {
    const gr = g.createLinearGradient(0, 0, w, hh); gr.addColorStop(0, '#6a6ee0'); gr.addColorStop(1, '#3a3ea8'); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
    for (let y = 6; y < hh; y += 9) { g.fillStyle = 'rgba(30,30,90,0.45)'; g.fillRect(0, y, w, 3); }
    g.strokeStyle = '#0b0b22'; g.lineWidth = 14; g.strokeRect(0, 0, w, hh);
  }, [9, 3]);
  const parede = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 4.8, 48, 1, true, Math.PI * 0.68, Math.PI * 0.64), kit.m.fosco(0xffffff, { map: painel, side: 2 }));
  parede.position.set(0, 2.4, 1.2); cena.add(parede);
  // letras 3D quebradas VAN / GUAR / DA
  const matL = [kit.m.acetinado(0xf4f6fb, 0.3, 0.2), kit.m.acetinado(0xb9c0d4, 0.3, 0.6)];
  const L1 = kit.texto3D('VAN', { tam: 1.5, prof: 0.3, mats: matL }); L1.position.set(-0.5, 3.45, -5.9); L1.rotation.set(0.05, 0.12, 0.18); cena.add(L1);
  const L2 = kit.texto3D('GUAR', { tam: 1.25, prof: 0.3, mats: matL }); L2.position.set(0.3, 2.3, -5.7); L2.rotation.set(-0.05, -0.08, -0.06); cena.add(L2);
  const L3 = kit.texto3D('DA', { tam: 1.25, prof: 0.3, mats: matL }); L3.position.set(1.9, 1.35, -5.5); L3.rotation.set(0.05, -0.2, 0.12); cena.add(L3);
  // bancada: tampo de madeira clara + frente prateada com frisos
  const forma = new THREE.Shape();
  forma.moveTo(-2.2, -0.55); forma.lineTo(1.4, -0.55); forma.quadraticCurveTo(2.6, -0.5, 2.5, 0.5); forma.lineTo(-2.2, 0.55); forma.lineTo(-2.2, -0.55);
  const tampoG = new THREE.ExtrudeGeometry(forma, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.04, bevelSegments: 3 });
  const tampo = new THREE.Mesh(tampoG, kit.m.brilho(0xe0b97a, 60, { map: kit.tex.madeira })); tampo.rotation.x = -Math.PI / 2; tampo.position.set(0, 0.92, -1.4); cena.add(tampo);
  const frisos = kit.canvasTex(512, 256, (g, w, hh) => { g.fillStyle = '#c9ced8'; g.fillRect(0, 0, w, hh); for (let y = 8; y < hh; y += 18) { const gr = g.createLinearGradient(0, y, 0, y + 12); gr.addColorStop(0, '#f2f4f8'); gr.addColorStop(1, '#8a92a4'); g.fillStyle = gr; g.fillRect(0, y, w, 12); } });
  const frente = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.82, 0.08), kit.m.brilho(0xffffff, 90, { map: frisos })); frente.position.set(-0.3, 0.45, -0.9); cena.add(frente);
  for (const x of [-2.1, 1.5]) { const pe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.88, 16), kit.m.cromo()); pe.position.set(x, 0.44, -0.85); cena.add(pe); }
  // apresentadores (figuras) e câmeras de estúdio
  [[-1.0, 0x22283a], [0.9, 0xb3262e]].forEach(([x, c]) => { const p = kit.pessoa(c, 1.25); p.position.set(x, 0.25, -1.9); cena.add(p); });
  const tvL = kit.tela(kit.texTexto([{ t: vg('VANGUARDA'), tam: 70 }], { w: 512, h: 288, fundo: '#1a3a8a', arco: true }), 1.2, 0.68, 0x111111, 0.06);
  tvL.position.set(-4.4, 1.9, -4.4); tvL.rotation.y = 0.6; cena.add(tvL);
  const c1 = cameraEstudio(THREE, kit); c1.position.set(-2.6, 0, 3.4); c1.rotation.y = Math.PI / 2 + 0.35; cena.add(c1);
  const c2 = cameraEstudio(THREE, kit); c2.position.set(2.8, 0, 3.0); c2.rotation.y = Math.PI / 2 - 0.3; cena.add(c2);
  [[0, 0xffffff, 14], [-3, 0xc0c8ff, 8], [3, 0xc0c8ff, 8]].forEach(([x, c, i]) => { const l = new THREE.PointLight(c, i, 9); l.position.set(x, 4, 1.5); cena.add(l); });
  const L = camada(raiz);
  const sc = scrim(L);
  const card = cartaoTitulo(L, { k: '2003 · INAUGURAÇÃO DA REDE VANGUARDA', t: 'VANGUARDA TV', sub: 'O estúdio do telejornal das <b>12h</b>, recriado<br>para <b>matar a saudade</b> da estreia.', y: 250, cls: 'tit-m', largura: 1000 });
  const mem = memoria(L, '/ref/estudio-2003-vanguarda-tv.jpg', 'Referência: Vanguarda TV · 2003', 1530, 720, 320, 4);
  const logo = h('div', 'painel claro', L);
  logo.style.cssText += 'left:110px;top:560px;width:300px;padding:24px;text-align:center';
  logo.innerHTML = `<img src="/ref/logo-2003-vanguarda.webp" style="width:220px;height:auto"><div style="font-size:17px;font-weight:700;color:#3b4170;margin-top:6px">Logo da inauguração · 2003</div>`;
  const vivo = aoVivo(L);
  return {
    cena, cam,
    upd(lt, S) {
      const p = E.inOutSine(seg(lt, 0, S.dur));
      cam.position.set(lerp(1.6, 0.4, p), lerp(1.9, 1.6, p), lerp(7.6, 4.0, p));
      cam.lookAt(lerp(0.4, 0.2, p), 1.75, -4);
      cam.setViewOffset(1920, 1080, -170, 0, 1920, 1080);
      card.upd(lt, 0.25);
      mem.upd(lt, 1.6);
      fx(logo, lt, { a: 1.1, d: 0.6, y: 40, s: 0.8, e: E.outBack });
      vivo(lt, 2.4);
    },
  };
}

// ---------------------------------------------------------------- 2006
async function estudio2006({ THREE, kit, raiz }) {
  const cena = kit.novaCena({ fundo: 0x03081a });
  const cam = kit.camera(40);
  cena.add(new THREE.HemisphereLight(0xcfe6ff, 0x101a2a, 1.3));
  const dl = new THREE.DirectionalLight(0xffffff, 1.6); dl.position.set(-3, 6, 6); cena.add(dl);
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(20, 14), kit.m.brilho(0x2a2e3a, 120, { specular: 0x6688cc })); piso.rotation.x = -Math.PI / 2; cena.add(piso);
  const relevo = kit.canvasTex(512, 512, (g, w, hh) => {
    const gr = g.createLinearGradient(0, 0, w, hh); gr.addColorStop(0, '#1e7fe0'); gr.addColorStop(1, '#0b4fb8'); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
    const r = rng(6);
    for (let y = 0; y < hh; y += 32) for (let x = 0; x < w; x += 32) {
      const s = 0.4 + 0.6 * Math.abs(Math.sin(x * 0.02 + y * 0.015));
      g.fillStyle = `rgba(160,220,255,${(0.25 * s).toFixed(2)})`; g.beginPath(); g.moveTo(x + 16, y); g.lineTo(x + 32, y + 16); g.lineTo(x + 16, y + 32); g.closePath(); g.fill();
      g.fillStyle = `rgba(0,30,90,${(0.3 * s).toFixed(2)})`; g.beginPath(); g.moveTo(x + 16, y); g.lineTo(x, y + 16); g.lineTo(x + 16, y + 32); g.closePath(); g.fill();
    }
  }, [4, 2]);
  const parede = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 4.6, 48, 1, true, Math.PI * 0.66, Math.PI * 0.68), kit.m.brilho(0xffffff, 40, { map: relevo, side: 2 }));
  parede.position.set(0, 2.3, 1.0); cena.add(parede);
  // monitor com repórter (ilustrado)
  const rep = kit.canvasTex(640, 400, (g, w, hh) => {
    const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, '#20304a'); gr.addColorStop(1, '#0a1220'); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
    for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(255,220,150,${0.2 + (i % 5) * 0.1})`; g.fillRect((i * 97) % w, 120 + (i * 31) % 80, 6, 6); }
    g.fillStyle = '#d9e2ee'; g.beginPath(); g.ellipse(w * 0.62, hh * 0.4, 46, 56, 0, 0, 7); g.fill();
    g.fillStyle = '#c9a26a'; g.beginPath(); g.ellipse(w * 0.62, hh * 0.32, 56, 40, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#e9eef5'; g.beginPath(); g.moveTo(w * 0.62 - 120, hh); g.quadraticCurveTo(w * 0.62, hh * 0.45, w * 0.62 + 120, hh); g.fill();
    g.fillStyle = '#1a1a1a'; g.fillRect(w * 0.62 + 30, hh * 0.62, 26, 70);
  });
  const mon = kit.tela(rep, 2.6, 1.62, 0x0a0a0e, 0.1); mon.position.set(2.2, 2.6, -4.6); mon.rotation.y = -0.3; cena.add(mon);
  // bancada de vidro com frente fosca
  const vidro = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.05, 1.1), new THREE.MeshPhongMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.45, shininess: 150, specular: 0xffffff })); vidro.position.set(-0.8, 0.95, -1.6); cena.add(vidro);
  const frente = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.62, 0.06), kit.m.brilho(0xe9eef5, 90)); frente.position.set(-0.8, 0.5, -1.1); cena.add(frente);
  const faixa = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 0.08), kit.m.cromo()); faixa.position.set(-0.8, 0.9, -1.1); cena.add(faixa);
  for (const x of [-2.4, 0.8]) { const pe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.92, 0.9), kit.m.cromo(0xcfd3dc, 0.25)); pe.position.set(x, 0.46, -1.6); cena.add(pe); }
  const notebook = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.02), kit.m.brilho(0xb9c0cc, 90)); notebook.position.set(-1.6, 1.12, -1.55); notebook.rotation.x = -0.3; cena.add(notebook);
  const ap = kit.pessoa(0x7a7f8c, 1.25); ap.position.set(-1.6, 0.25, -2.2); cena.add(ap);
  const c1 = cameraEstudio(THREE, kit); c1.position.set(1.4, 0, 3.4); c1.rotation.y = Math.PI / 2 - 0.2; cena.add(c1);
  [[0, 0xffffff, 14], [-3, 0x9fd0ff, 9]].forEach(([x, c, i]) => { const l = new THREE.PointLight(c, i, 9); l.position.set(x, 4, 1.2); cena.add(l); });
  const L = camada(raiz);
  const sc = scrim(L);
  const card = cartaoTitulo(L, { k: '2006 · VANGUARDA TV', t: 'O ESTÚDIO AZUL', sub: 'Parede azul em relevo, bancada de vidro<br>e o telão para entrar ao vivo com o repórter.', y: 250, cls: 'tit-m', largura: 1000 });
  const mem = memoria(L, '/ref/estudio-2006-vanguarda-tv.jpg', 'Referência: Vanguarda TV · 2006', 1390, 590, 380, -3);
  const vivo = aoVivo(L);
  return {
    cena, cam,
    upd(lt, S) {
      const p = E.inOutSine(seg(lt, 0, S.dur));
      cam.position.set(lerp(-2.4, 0.2, p), lerp(1.8, 1.7, p), lerp(6.0, 4.6, p));
      cam.lookAt(lerp(-0.2, 0.4, p), 1.6, -3);
      cam.setViewOffset(1920, 1080, -260, 0, 1920, 1080);
      card.upd(lt, 0.2);
      mem.upd(lt, 1.2);
      vivo(lt, 1.8);
    },
  };
}

// ---------------------------------------------------------------- 2012
function texPrograma(kit, nome, cor = '#2a6fe0') {
  return kit.canvasTex(1024, 576, (g, w, hh) => {
    const gr = g.createRadialGradient(w / 2, hh * 1.1, 40, w / 2, hh * 0.9, w * 0.8); gr.addColorStop(0, '#5fb8ff'); gr.addColorStop(0.45, cor); gr.addColorStop(1, '#06103a'); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
    g.strokeStyle = 'rgba(160,210,255,0.5)'; g.lineWidth = 18;
    for (let i = 1; i < 6; i++) { g.beginPath(); g.arc(w / 2, hh * 1.25, i * 120, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    g.fillStyle = '#ffffff'; g.fillRect(40, hh * 0.38, w - 80, hh * 0.22);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#12317a'; g.font = '700 92px AG'; g.fillText(vg(nome[0]), w / 2, hh * 0.3);
    g.fillStyle = '#1d4fd0'; g.font = '700 100px AG'; g.fillText(vg('VANGUARDA'), w / 2, hh * 0.495);
  });
}

async function estudio2012({ THREE, kit, raiz }) {
  const cena = kit.novaCena({ fundo: 0xdcd8f0 });
  const cam = kit.camera(40);
  cena.add(new THREE.HemisphereLight(0xffffff, 0x8a80c0, 1.6));
  const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(2, 7, 7); cena.add(dl);
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(24, 16), kit.m.brilho(0xc9c6d8, 40)); piso.rotation.x = -Math.PI / 2; cena.add(piso);
  const fundoG = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 5.2, 64, 1, true, Math.PI * 0.62, Math.PI * 0.76), kit.m.brilho(0xf1effa, 20, { side: 2 }));
  fundoG.position.set(0, 2.6, 1.6); cena.add(fundoG);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(14, 0.5), kit.m.luz(0x9a7cf0, { transparent: true, opacity: 0.6 })); glow.position.set(0, 0.25, -6.2); cena.add(glow);
  // 3 telas dos telejornais
  const progs = [['BOM DIA'], ['LINK'], ['JORNAL']];
  progs.forEach((n, i) => { const t = kit.tela(texPrograma(kit, n), 2.5, 1.4, 0x111111, 0.08); t.position.set((i - 1) * 2.8, 2.9, -6.1 + Math.abs(i - 1) * 0.35); t.rotation.y = -(i - 1) * 0.18; cena.add(t); });
  // letreiro de LED vermelho
  const ledTex = kit.canvasTex(2048, 96, (g, w, hh) => { g.fillStyle = '#120808'; g.fillRect(0, 0, w, hh); g.fillStyle = '#ff3a2a'; g.font = '700 70px Inter'; g.textBaseline = 'middle'; g.fillText('VANGUARDA · BOM DIA · LINK · JORNAL · 2012 · VANGUARDA · BOM DIA · LINK · JORNAL · 2012 ·', 10, hh / 2); });
  ledTex.wrapS = THREE.RepeatWrapping; ledTex.needsUpdate = true;
  const led = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 0.4), kit.m.texB(ledTex)); led.position.set(0, 4.15, -6.2); cena.add(led);
  // bancada oval branca com V arco-íris na frente
  const tampo = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.1, 64), kit.m.brilho(0xffffff, 80)); tampo.scale.set(2.3, 1, 0.75); tampo.position.set(0, 0.98, -1.8); cena.add(tampo);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.9, 64, 1, true, -Math.PI / 2, Math.PI), kit.m.brilho(0xffffff, 60, { side: 2, map: kit.tex.arcoV })); base.scale.set(2.0, 1, 0.62); base.position.set(0, 0.48, -1.8); cena.add(base);
  const lam = kit.m.acetinado(0xe4e7ee, 0.25, 0.7);
  const lamina = (x, ang, w = 0.95) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.92, 0.06), lam); b.position.set(x, 0.48, -1.8 + 0.66); b.rotation.z = ang; cena.add(b); };
  lamina(-1.6, 0, 0.9); lamina(-0.62, -0.38, 0.62); lamina(0.62, 0.38, 0.62); lamina(1.6, 0, 0.9);
  // coluna arco-íris (à esquerda, como no cenário)
  ARCO.forEach((c, i) => { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.18, 32), kit.m.brilho(c, 60, { emissive: new THREE.Color(c).multiplyScalar(0.3) })); r.position.set(-5.2, 0.3 + i * 0.22, -3.2); cena.add(r); });
  const capa = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2.6, 32, 1, true, 0, Math.PI * 1.2), kit.m.brilho(0xf4f4f8, 40, { side: 2 })); capa.position.set(-5.2, 1.3, -3.2); cena.add(capa);
  [[-1.1, 0x5a3fb0], [1.1, 0x7b4fd0]].forEach(([x, c]) => { const p = kit.pessoa(c, 1.25); p.position.set(x, 0.25, -2.6); cena.add(p); });
  for (const x of [-1.1, 1.1]) { const nb = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.26, 0.02), kit.m.brilho(0x15151a, 80)); nb.position.set(x, 1.17, -1.75); nb.rotation.x = -0.3; cena.add(nb); }
  const c1 = cameraEstudio(THREE, kit); c1.position.set(-2.2, 0, 3.4); c1.rotation.y = Math.PI / 2 + 0.25; cena.add(c1);
  const L = camada(raiz);
  const sc = scrim(L);
  sc.style.background = 'linear-gradient(90deg, rgba(20,16,70,0.88) 0%, rgba(20,16,70,0.55) 36%, rgba(20,16,70,0) 58%)';
  const card = cartaoTitulo(L, { k: '2012 · OS NOVOS TELEJORNAIS', t: 'BOM DIA · LINK · JORNAL', sub: 'O cenário branco e lilás com a bancada do <b>V arco-íris</b>:<br><b>Bom Dia Vanguarda</b>, <b>Link Vanguarda</b> e <b>Jornal Vanguarda</b>.', y: 250, cls: 'tit-p', largura: 1000 });
  const mem = memoria(L, '/ref/estudio-2012-link-vanguarda-1.jpg', 'Referência: Link Vanguarda · 2012', 1380, 700, 420, 3);
  const vivo = aoVivo(L);
  return {
    cena, cam,
    upd(lt, S) {
      const p = E.inOutSine(seg(lt, 0, S.dur));
      cam.position.set(lerp(2.4, -0.4, p), lerp(2.2, 1.8, p), lerp(7.4, 5.0, p));
      cam.lookAt(lerp(0.2, -0.2, p), 1.8, -4);
      cam.setViewOffset(1920, 1080, -300, 60, 1920, 1080);
      ledTex.offset.x = (lt * 0.06) % 1;
      card.upd(lt, 0.2);
      mem.upd(lt, 1.4);
      vivo(lt, 2.0);
    },
  };
}

// ---------------------------------------------------------------- Experiência de apresentador
const PROGRAMAS = ['Vanguarda TV', 'Vanguarda News', 'Vanguarda Comunidade', 'Vanguarda Serviço', 'Agenda Vanguarda', 'Bom Dia Vanguarda', 'Link Vanguarda', 'Jornal Vanguarda'];

async function experiencia({ raiz }) {
  const fundo = fundo2D(raiz, 'azul', 101);
  const L = camada(raiz);
  const k = kicker(L, 'EXPERIÊNCIA NOS ESTÚDIOS');
  k.el.style.cssText += 'left:110px;top:140px';
  const t = titulo(L, 'SEJA O APRESENTADOR!', 'tit-m cromo');
  t.el.style.cssText += 'position:absolute;left:110px;top:190px';
  // totem
  const totem = h('div', '', L);
  totem.style.cssText = 'position:absolute;left:120px;top:320px;width:380px;height:720px';
  totem.innerHTML = `<div style="position:absolute;inset:0;border-radius:40px 40px 14px 14px;background:linear-gradient(180deg,#f4f6fb,#c9cfdc);box-shadow:0 30px 60px rgba(0,0,0,.55)"></div>
    <div style="position:absolute;left:24px;right:24px;top:24px;height:14px;border-radius:7px;background:linear-gradient(90deg,${ARCO.join(',')})"></div>
    <div class="tela" style="position:absolute;left:30px;right:30px;top:56px;height:470px;border-radius:16px;background:#070a2a;overflow:hidden"></div>
    <div style="position:absolute;left:150px;top:548px;width:80px;height:80px;border-radius:50%;background:#15183a;border:6px solid #9aa3b8"><div style="position:absolute;left:20px;top:20px;width:28px;height:28px;border-radius:50%;background:#27d3ff;box-shadow:0 0 18px #27d3ff"></div></div>
    <div class="ag" style="position:absolute;left:0;right:0;top:650px;text-align:center;font-size:26px;color:#12163a">${vg('VANGUARDA')}</div>`;
  const tela = totem.querySelector('.tela');
  const telas = [
    `<div class="mini" style="font-size:15px;margin:18px">ESCOLHA O PROGRAMA</div>${PROGRAMAS.map((p, i) => `<div class="op" style="margin:6px 16px;padding:9px 14px;border-radius:8px;font-size:17px;font-weight:700;background:rgba(255,255,255,0.08)">${p}</div>`).join('')}`,
    `<div class="mini" style="font-size:15px;margin:18px">PERSONALIZE</div><div style="margin:14px 18px;font-size:16px;color:#c9d1ff">Manchete</div><div class="digita" style="margin:0 18px;padding:12px;border-radius:8px;background:#fff;color:#12163a;font-weight:700;font-size:18px;min-height:52px"></div><div style="margin:18px;display:flex;gap:8px;flex-wrap:wrap">${['Notícia', 'Evento cultural', 'Esporte', 'Clima'].map((c, i) => `<span style="padding:8px 12px;border-radius:20px;background:${i < 2 ? ARCO[i * 3] : 'rgba(255,255,255,.12)'};font-size:15px;font-weight:700">${c}</span>`).join('')}</div>`,
    `<div class="mini" style="font-size:15px;margin:18px">CENÁRIO</div><div style="display:flex;gap:10px;margin:0 18px"><div style="flex:1;height:120px;border-radius:10px;background:linear-gradient(135deg,#3a3ea8,#6a6ee0)"></div><div style="flex:1;height:120px;border-radius:10px;background:linear-gradient(135deg,#f1effa,#9a7cf0)"></div></div><div style="display:flex;gap:10px;margin:10px 18px"><div style="flex:1;text-align:center;font-weight:800">2D</div><div style="flex:1;text-align:center;font-weight:800">3D</div></div><div style="margin:20px 18px;font-size:16px;color:#c9d1ff">Câmeras posicionadas · luz de estúdio · teleprompter</div>`,
    `<div style="display:flex;align-items:center;gap:10px;margin:18px"><span class="rec" style="width:18px;height:18px;border-radius:50%;background:#e5342e"></span><span style="font-weight:800;font-size:20px">GRAVANDO</span></div><div class="crono ag" style="text-align:center;font-size:96px;margin-top:40px">01:30</div><div style="text-align:center;color:#c9d1ff;font-size:18px">telejornal</div>`,
    `<div class="mini" style="font-size:15px;margin:18px">RECEBA SEU VÍDEO</div><div style="margin:14px 18px;font-size:16px;color:#c9d1ff">Seu e-mail</div><div class="email" style="margin:0 18px;padding:12px;border-radius:8px;background:#fff;color:#12163a;font-weight:700;font-size:19px;min-height:50px"></div><div style="margin:18px;padding:14px;border-radius:10px;background:#2fc27a;text-align:center;font-weight:800;font-size:20px">ENVIAR</div>`,
    `<div class="mini" style="font-size:15px;margin:18px">PRONTO!</div><div style="margin:30px auto 0;width:120px;height:120px;border-radius:50%;background:#2fc27a;display:flex;align-items:center;justify-content:center;font-size:76px;font-weight:900">✓</div><div style="text-align:center;margin-top:20px;font-weight:800;font-size:22px">MP4 gravado e editado</div><div style="text-align:center;color:#c9d1ff;font-size:17px;margin-top:6px">enviado para o seu e-mail</div><div style="margin:20px 30px;height:12px;border-radius:6px;background:rgba(255,255,255,.15)"><div class="barra" style="height:100%;border-radius:6px;background:linear-gradient(90deg,${ARCO.join(',')});transform-origin:left"></div></div>`,
  ].map((html) => { const d = h('div', '', tela, html); d.style.cssText = 'position:absolute;inset:0'; return d; });
  const ops = [...telas[0].querySelectorAll('.op')];
  const digita = telas[1].querySelector('.digita'), crono = telas[3].querySelector('.crono'), rec = telas[3].querySelector('.rec'), email = telas[4].querySelector('.email'), barra = telas[5].querySelector('.barra');
  // passos
  const passos = [
    ['1', 'Escolha o programa', '8 programas da Vanguarda'],
    ['2', 'Personalize no totem', 'notícias e eventos culturais'],
    ['3', 'Cenário 2D ou 3D', 'câmeras e estúdio virtual'],
    ['4', 'Grave no ar!', 'telejornal 1min30 · intervalo 45 s'],
    ['5', 'Digite seu e-mail', 'no próprio totem'],
    ['6', 'Receba o MP4', 'gravado e editado automaticamente'],
  ].map(([n, a, b], i) => {
    const c = h('div', 'painel', L);
    c.style.cssText += `left:560px;top:${330 + i * 112}px;width:640px;height:96px;padding:18px 24px 0 108px`;
    c.innerHTML = `<div class="ag" style="position:absolute;left:24px;top:14px;width:64px;height:64px;border-radius:50%;background:${ARCO[i * 2]};display:flex;align-items:center;justify-content:center;font-size:36px">${n}</div><div style="font-size:28px;font-weight:800">${a}</div><div style="font-size:19px;color:#c9d1ff;margin-top:2px">${b}</div>`;
    return c;
  });
  // tempos
  const tempos = h('div', 'painel', L);
  tempos.style.cssText += 'left:1260px;top:330px;width:550px;height:250px;padding:28px 30px';
  tempos.innerHTML = `<div class="mini" style="font-size:17px">TEMPO NO AR</div>
    <div style="display:flex;gap:24px;margin-top:16px"><div style="flex:1"><div class="ag t1" style="font-size:78px;color:#f2d33a">1:30</div><div style="font-size:21px;font-weight:700">Telejornais</div></div>
    <div style="flex:1"><div class="ag t2" style="font-size:78px;color:#27d3ff">0:45</div><div style="font-size:21px;font-weight:700">Programas e intervalos</div></div></div>`;
  const progBox = h('div', 'painel', L);
  progBox.style.cssText += 'left:1260px;top:610px;width:550px;height:430px;padding:26px 30px';
  progBox.innerHTML = `<div class="mini" style="font-size:17px;margin-bottom:16px">PROGRAMAS DISPONÍVEIS</div>`;
  const pg = h('div', '', progBox); pg.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px';
  const progChips = PROGRAMAS.map((p, i) => h('div', 'chip', pg, `<i style="background:${ARCO[i]}"></i>${p.replace('Vanguarda ', 'V. ').replace(' Vanguarda', '')}`));
  progChips.forEach((c) => (c.style.fontSize = '21px'));
  const T0p = 1.2, DP = 2.9;
  return {
    upd(lt, S) {
      fundo.upd(lt, S.pulso);
      k.upd(lt, 0.05);
      fxLetras(t.spans, lt, { a: 0.15, st: 0.03, d: 0.5, y: 60, rx: -80, z: -150, blur: 10 });
      fx(totem, lt, { a: 0.4, d: 0.7, x: -80, ry: 30, blur: 8 });
      const ativo = Math.max(0, Math.min(5, Math.floor((lt - T0p) / DP)));
      const lp = lt - T0p - ativo * DP;
      telas.forEach((d, i) => { d.style.opacity = i === ativo ? Math.min(1, lp / 0.25).toFixed(3) : 0; d.style.transform = `translateX(${i === ativo ? (1 - Math.min(1, lp / 0.3)) * 40 : 0}px)`; });
      ops.forEach((o, i) => { const sel = Math.floor(seg(lt, T0p, T0p + DP) * 10) % 8 === i || (lt > T0p + DP * 0.7 && i === 6); o.style.background = sel ? ARCO[i] : 'rgba(255,255,255,0.08)'; });
      const manchete = 'Daniel faz 20 anos em grande estilo!';
      digita.textContent = manchete.slice(0, Math.floor(seg(lt, T0p + DP + 0.3, T0p + DP * 2 - 0.4) * manchete.length)) + (Math.sin(lt * 10) > 0 ? '|' : '');
      const g0 = T0p + DP * 3;
      const rest = Math.max(0, 90 - Math.floor((lt - g0) * 30));
      crono.textContent = `0${Math.floor(rest / 60)}:${String(rest % 60).padStart(2, '0')}`;
      rec.style.opacity = Math.sin(lt * 7) > 0 ? 1 : 0.2;
      const mail = 'convidado@email.com';
      email.textContent = mail.slice(0, Math.floor(seg(lt, T0p + DP * 4 + 0.2, T0p + DP * 5 - 0.6) * mail.length)) + (Math.sin(lt * 10) > 0 ? '|' : '');
      barra.style.transform = `scaleX(${E.outCubic(seg(lt, T0p + DP * 5, T0p + DP * 5 + 1.5)).toFixed(3)})`;
      passos.forEach((c, i) => {
        fx(c, lt, { a: 0.6 + i * 0.12, d: 0.5, x: 60, blur: 6, bs: i === ativo && lt > T0p ? 1.04 : 1, mo: lt > T0p && i !== ativo ? 0.5 : 1 });
        c.style.borderColor = i === ativo && lt > T0p ? ARCO[i * 2] : 'rgba(255,255,255,0.16)';
        c.style.boxShadow = i === ativo && lt > T0p ? `0 0 0 3px ${ARCO[i * 2]}, 0 20px 50px rgba(0,0,10,.55)` : '';
      });
      fx(tempos, lt, { a: 1.0, d: 0.6, y: 40, blur: 6 });
      fx(progBox, lt, { a: 1.3, d: 0.6, y: 40, blur: 6 });
      progChips.forEach((c, i) => fx(c, lt, { a: 1.6 + i * 0.1, d: 0.4, s: 0.5, e: E.outBack }));
    },
  };
}

export default { estudio2003, estudio2006, estudio2012, experiencia };
