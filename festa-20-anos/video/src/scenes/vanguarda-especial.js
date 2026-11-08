// Exposição "Vanguarda Especial": parede-galeria 3D com os 15 quadros SVG + mosaico 2D.
import { E, seg, lerp, ruido } from '../core/anim.js';
import { h, camada, fx, fxLetras, titulo, kicker, fundo2D, vg, ARCO } from '../core/ui.js';
import { QUADROS_VE, scrim } from './espacos.js';

const TITULOS = ['Aparecida', 'Mazzaropi', 'Alcatrazes', 'Monteiro Lobato', 'Via Dutra', 'Futuro das Cidades 1', 'Vida Zen', 'Cassiano Ricardo',
  '100 Anos de Aviação', 'Sabores e Temperos da Terra', 'Futuro das Cidades 2', 'Antártida', 'Futuro das Cidades 3', '300 Anos de Aparecida', '15 Anos da Rede Vanguarda'];

async function galeria({ THREE, kit, raiz }) {
  const cena = kit.novaCena({ fundo: 0x08080d });
  const cam = kit.camera(40);
  cena.add(new THREE.HemisphereLight(0xfff4e6, 0x20202a, 0.75));
  const luzCam = new THREE.PointLight(0xffe2bc, 14, 9); cena.add(luzCam);
  const PASSO = 2.3, N = QUADROS_VE.length, COMP = N * PASSO + 6;
  // parede, piso de madeira, rodapé e trilho de luz
  const tij = kit.tex.tijolo.clone(); tij.repeat.set(COMP / 2.5, 2); tij.needsUpdate = true;
  const parede = new THREE.Mesh(new THREE.PlaneGeometry(COMP, 4.4), kit.m.tex(tij, { color: 0xb8a39a }));
  parede.position.set(COMP / 2 - 3, 2.2, 0); cena.add(parede);
  const mad = kit.tex.madeira.clone(); mad.repeat.set(COMP / 3, 3); mad.needsUpdate = true;
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(COMP, 8), kit.m.brilho(0xffffff, 60, { map: mad })); piso.rotation.x = -Math.PI / 2; piso.position.set(COMP / 2 - 3, 0, 4); cena.add(piso);
  const trilho = new THREE.Mesh(new THREE.BoxGeometry(COMP, 0.08, 0.08), kit.m.brilho(0x111111)); trilho.position.set(COMP / 2 - 3, 4.0, 1.2); cena.add(trilho);
  const faixaArco = new THREE.Mesh(new THREE.PlaneGeometry(COMP, 0.14), kit.m.texB(kit.tex.arcoH)); faixaArco.position.set(COMP / 2 - 3, 0.35, 0.02); cena.add(faixaArco);
  const texs = await Promise.all(QUADROS_VE.map((q) => kit.imgTex(`/svg/vanguarda-especial/${q}.svg`, 1200, 900)));
  const quadros = texs.map((t, i) => {
    const x = i * PASSO;
    const q = kit.tela(t, 1.84, 1.38, 0x1a1410, 0.08);
    q.position.set(x, 1.85, 0.06); cena.add(q);
    const passe = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.64), kit.m.fosco(0xf3efe6)); passe.position.set(x, 1.85, 0.015); cena.add(passe);
    const poca = kit.pocaLuz(2.6, 3.9, 0.5); poca.position.set(x, 2.0, 0.03); cena.add(poca);
    const lum = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.22, 10), kit.m.brilho(0x111111)); lum.position.set(x, 3.86, 1.2); lum.rotation.x = 0.5; cena.add(lum);
    const plaq = kit.texTexto([{ t: `${String(i + 1).padStart(2, '0')}`, tam: 46, y: 0.32, cor: '#7b3fe0', fonte: 'AG' }, { t: TITULOS[i], tam: TITULOS[i].length > 18 ? 26 : 32, y: 0.72, cor: '#12163a', fonte: 'Inter', peso: 700 }], { w: 512, h: 160, fundo: '#ffffff' });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.195), kit.m.texB(plaq)); pl.position.set(x + 1.2 > x ? x : x, 0.82, 0.03); cena.add(pl);
    return q;
  });
  const banco = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.6), kit.m.brilho(0x2a2a2e, 40)); banco.position.set(PASSO * 7, 0.22, 3.2); cena.add(banco);
  const L = camada(raiz);
  const topo = h('div', '', L);
  topo.style.cssText = 'position:absolute;left:0;right:0;top:0;height:330px;background:linear-gradient(180deg, rgba(4,6,30,0.85), rgba(4,6,30,0))';
  const k = kicker(L, 'EXPOSIÇÃO NA SALA DE ESTAR');
  k.el.style.cssText += 'left:110px;top:150px';
  const t = titulo(L, 'VANGUARDA ESPECIAL', 'tit-m cromo');
  t.el.style.cssText += 'position:absolute;left:110px;top:200px';
  const leg = h('div', '', L);
  leg.style.cssText = 'position:absolute;left:0;right:0;top:930px;text-align:center';
  const legN = h('span', 'ag', leg); legN.style.cssText = 'font-size:40px;color:#f2d33a;margin-right:18px;text-shadow:0 2px 12px #000';
  const legT = h('span', 'ag', leg); legT.style.cssText = 'font-size:40px;text-shadow:0 2px 12px #000';
  const fundoLeg = h('div', '', L);
  fundoLeg.style.cssText = 'position:absolute;left:0;right:0;bottom:0;height:220px;background:linear-gradient(0deg, rgba(4,6,30,0.85), rgba(4,6,30,0));z-index:-1';
  L.insertBefore(fundoLeg, leg);
  return {
    cena, cam,
    upd(lt, S) {
      const p = E.inOutSine(seg(lt, 0.2, S.dur - 0.2));
      const x = lerp(-1.2, (N - 1) * PASSO + 0.6, p);
      cam.position.set(x - 0.6, 1.75 + ruido(lt * 0.5, 2) * 0.03, 3.6);
      cam.lookAt(x + 0.4, 1.7, 0);
      luzCam.position.set(x + 0.5, 3.2, 2.2);
      const idx = Math.max(0, Math.min(N - 1, Math.round((x + 0.4) / PASSO)));
      legN.textContent = String(idx + 1).padStart(2, '0') + ' / 15';
      legT.textContent = vg(TITULOS[idx].toUpperCase());
      const fase = ((x + 0.4) / PASSO) - idx;
      leg.style.opacity = (1 - Math.min(1, Math.abs(fase) * 2.2) ** 3).toFixed(3);
      k.upd(lt, 0.2);
      fxLetras(t.spans, lt, { a: 0.35, st: 0.03, d: 0.55, y: 50, rx: -80, blur: 10 });
    },
  };
}

async function mosaico({ raiz }) {
  const fundo = fundo2D(raiz, 'noite', 44);
  const L = camada(raiz);
  const k = kicker(L, 'VANGUARDA ESPECIAL');
  k.el.style.cssText += 'left:150px;top:120px';
  const t = titulo(L, '15 DOCUMENTÁRIOS EM QUADROS', 'tit-p cromo');
  t.el.style.cssText += 'position:absolute;left:150px;top:170px';
  const grade = h('div', '', L);
  grade.style.cssText = 'position:absolute;left:210px;top:275px;width:1500px;display:grid;grid-template-columns:repeat(5,1fr);gap:18px;perspective:1600px';
  const cards = QUADROS_VE.map((q) => {
    const c = h('div', '', grade);
    c.style.cssText = 'border-radius:10px;overflow:hidden;box-shadow:0 14px 34px rgba(0,0,0,0.55);border:3px solid #fff;background:#000';
    const img = h('img', '', c);
    img.src = `/svg/vanguarda-especial/${q}.svg`;
    img.style.cssText = 'display:block;width:100%;height:auto';
    return c;
  });
  return {
    upd(lt, S) {
      fundo.upd(lt, S.pulso);
      k.upd(lt, 0.05);
      fxLetras(t.spans, lt, { a: 0.15, st: 0.025, d: 0.5, y: 40, rx: -80, blur: 8 });
      const ordem = [0, 1, 2, 3, 4, 9, 8, 7, 6, 5, 10, 11, 12, 13, 14];
      cards.forEach((c, i) => {
        const a = 0.35 + ordem.indexOf(i) * 0.12;
        fx(c, lt, { a, d: 0.6, ry: -95, z: -300, s: 0.8, e: E.outCubic });
      });
      grade.style.transform = `scale(${lerp(1, 1.035, E.inOutSine(seg(lt, 2, S.dur))).toFixed(4)})`;
    },
  };
}

export default { galeria, mosaico };
