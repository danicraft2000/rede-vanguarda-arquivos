// Abertura (logo 3D), título 3D "DANIEL 20 ANOS", tema e encerramento.
import { E, seg, lerp, kf, clamp, rng, ruido } from '../core/anim.js';
import { h, camada, fx, fxLetras, titulo, kicker, fundo2D, vg, ARCO } from '../core/ui.js';

// Partículas brilhantes (pontos) para dar profundidade
function poeira(THREE, n = 400, raio = 14, seed = 3) {
  const r = rng(seed);
  const pos = [], cor = [];
  for (let i = 0; i < n; i++) {
    pos.push((r() - 0.5) * raio * 2, (r() - 0.5) * raio, (r() - 0.5) * raio * 2);
    const c = new THREE.Color(ARCO[Math.floor(r() * 10)]).lerp(new THREE.Color(0xffffff), 0.4);
    cor.push(c.r, c.g, c.b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cor, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
}

function pisoBrilhante(THREE, kit, cor = 0x0a0d2a) {
  const p = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshPhongMaterial({ color: cor, shininess: 120, specular: 0x6070c0 }));
  p.rotation.x = -Math.PI / 2;
  p.receiveShadow = true;
  return p;
}

async function intro({ THREE, kit, raiz }) {
  const cena = kit.novaCena({ fundo: null });
  cena.background = kit.fundoRadial('#1d2470', '#0a0d33', '#010208');
  const cam = kit.camera(38);
  kit.luzes(cena, { hemi: [0xbfc8ff, 0x10102a, 1.2], dir: [0xffffff, 2.5, [4, 8, 6]] });
  const logo = kit.logoV({ tipo: '2012', R: 1.4, H: 1.6 });
  logo.position.y = 0.8;
  cena.add(logo, pisoBrilhante(THREE, kit), kit.sombraBlob(2.4, 2.4, 0.9));
  const pts = poeira(THREE, 500, 16);
  cena.add(pts);
  const luzMov = new THREE.PointLight(0xffffff, 30, 12);
  cena.add(luzMov);

  const L = camada(raiz);
  const apresenta = h('div', 'mini', L, 'DANIEL AVILA APRESENTA');
  apresenta.style.cssText += 'position:absolute;left:0;right:0;top:880px;text-align:center;font-size:30px;letter-spacing:14px;color:#fff';
  const ano = h('div', 'mini', L, 'UM PROJETO PARA 2029');
  ano.style.cssText += 'position:absolute;left:0;right:0;top:930px;text-align:center;font-size:20px;letter-spacing:10px;color:#c9d1ff';

  return {
    cena, cam,
    upd(lt, S) {
      const p = E.inOutCubic(seg(lt, 0, S.dur));
      const ang = lerp(-1.1, 0.05, p);
      const dist = lerp(3.2, 6.2, p);
      const alt = lerp(4.2, 1.6, p);
      cam.position.set(Math.sin(ang) * dist, alt, Math.cos(ang) * dist);
      cam.lookAt(0, lerp(0.2, 0.8, p), 0);
      logo.rotation.y = lerp(-0.6, 0, E.outCubic(seg(lt, 0, S.dur)));
      luzMov.position.set(Math.sin(lt * 1.4) * 3, 2.5, Math.cos(lt * 1.4) * 3);
      pts.rotation.y = lt * 0.05;
      cena.background.offset.set(0, 0);
      fx(apresenta, lt, { a: 0.9, d: 1.0, y: 20, blur: 8, out: S.dur - 0.7, od: 0.5 });
      fx(ano, lt, { a: 1.5, d: 1.0, y: 16, blur: 6, out: S.dur - 0.7, od: 0.5 });
      apresenta.style.letterSpacing = lerp(30, 14, E.outCubic(seg(lt, 0.9, 3))).toFixed(1) + 'px';
    },
  };
}

async function tituloCena({ THREE, kit, raiz }) {
  const cena = kit.novaCena({ fundo: null });
  cena.background = kit.fundoRadial('#2a2f9a', '#10145a', '#03040f');
  const cam = kit.camera(34);
  kit.luzes(cena, { hemi: [0xd8deff, 0x202040, 1.0], dir: [0xffffff, 2.0, [3, 6, 10]] });
  const matsFace = [kit.m.acetinado(0xffffff, 0.2, 0.35), kit.m.cromo(0xb9c0d4, 0.22)];
  const daniel = kit.letras3D('DANIEL', { tam: 1.6, prof: 0.42, chanfro: 0.04, mats: matsFace });
  daniel.position.set(0, 1.2, 0);
  const lateralArco = new THREE.MeshStandardMaterial({ map: kit.tex.arcoVcheio, metalness: 0.3, roughness: 0.35 });
  const vinte = kit.letras3D('20ANOS', { tam: 1.25, prof: 0.42, chanfro: 0.04, mats: [kit.m.acetinado(0xffffff, 0.2, 0.35), lateralArco] });
  vinte.position.set(0, -0.5, 0);
  cena.add(daniel, vinte);
  // faixa arco-íris luminosa atrás
  const faixa = new THREE.Mesh(new THREE.PlaneGeometry(16, 0.18), new THREE.MeshBasicMaterial({ map: kit.tex.arcoH }));
  faixa.position.set(0, 0.36, -1.2);
  cena.add(faixa);
  const faixa2 = faixa.clone(); faixa2.position.y = -1.38; cena.add(faixa2);
  const pts = poeira(THREE, 600, 20, 8);
  cena.add(pts);
  const luzVarre = new THREE.PointLight(0xffffff, 60, 10);
  cena.add(luzVarre);

  const L = camada(raiz);
  const sub = h('div', 'sub', L, 'PROJETO DA FESTA &nbsp;·&nbsp; APRESENTAÇÃO DA ARQUITETURA');
  sub.style.cssText += 'position:absolute;left:0;right:0;top:878px;text-align:center;font-size:30px;font-weight:700;letter-spacing:8px';
  const sub2 = h('div', 'sub', L, 'Tema: <b>Rede Vanguarda</b> — do arquivo ao futuro &nbsp;·&nbsp; <b>2029</b>');
  sub2.style.cssText += 'position:absolute;left:0;right:0;top:932px;text-align:center;font-size:30px';

  return {
    cena, cam,
    upd(lt, S) {
      const d = S.dur;
      cam.position.set(lerp(-0.6, 0.6, lt / d) + ruido(lt * 0.5, 1) * 0.05, lerp(0.4, 0.15, lt / d), lerp(9.4, 8.2, E.outCubic(seg(lt, 0, d))));
      cam.lookAt(0, 0.1, 0);
      const meio = 0.6037; // meia batida para cada letra (ritmo da música)
      daniel.userData.letras.forEach((g, i) => {
        const a = 0.05 + i * meio * 0.5;
        const p = E.outBack(seg(lt, a, a + 0.7));
        const q = E.outCubic(seg(lt, a, a + 0.7));
        g.position.set(g.userData.x0, lerp(3, 0, q), lerp(-14, 0, q));
        g.rotation.set(lerp(-1.6, 0, p), lerp(0.8, 0, q), 0);
        g.visible = lt > a;
      });
      vinte.userData.letras.forEach((g, i) => {
        const a = 1.9 + i * meio * 0.5;
        const p = E.outBack(seg(lt, a, a + 0.7));
        const q = E.outCubic(seg(lt, a, a + 0.7));
        g.position.set(g.userData.x0, lerp(-3, 0, q), lerp(-14, 0, q));
        g.rotation.set(lerp(1.6, 0, p), lerp(-0.8, 0, q), 0);
        g.visible = lt > a;
      });
      daniel.rotation.y = Math.sin(lt * 0.5) * 0.05;
      vinte.rotation.y = Math.sin(lt * 0.5 + 0.6) * 0.05;
      const pf = E.outExpo(seg(lt, 1.2, 2.4));
      faixa.scale.x = pf; faixa2.scale.x = E.outExpo(seg(lt, 3.2, 4.4));
      faixa.material.opacity = 1;
      luzVarre.position.set(lerp(-7, 7, ((lt * 0.35) % 1)), 1, 2.5);
      pts.rotation.y = lt * 0.04;
      fx(sub, lt, { a: 4.2, d: 0.8, y: 30, blur: 10 });
      fx(sub2, lt, { a: 4.7, d: 0.8, y: 30, blur: 10 });
    },
  };
}

async function tema({ kit, raiz }) {
  const fundo = fundo2D(raiz, 'roxo', 21);
  const L = camada(raiz);
  const k = kicker(L, 'O TEMA DA FESTA');
  k.el.style.cssText += 'left:150px;top:140px';
  const t = titulo(L, 'REDE VANGUARDA', 'tit cromo');
  t.el.style.cssText += 'position:absolute;left:150px;top:200px';
  const sub = h('div', 'sub', L, 'Seus objetos da <b>antiguidade</b> e da <b>atualidade</b> — da fita magnética à inteligência artificial.');
  sub.style.cssText += 'position:absolute;left:150px;top:360px;width:1500px';
  const col = (x, rot, itens, cor) => {
    const c = h('div', '', L);
    c.style.cssText = `position:absolute;left:${x}px;top:470px;width:760px`;
    const tt = h('div', 'tit-p', c, vg(rot));
    tt.style.cssText += `color:${cor};margin-bottom:22px;font-size:46px`;
    const box = h('div', '', c);
    box.style.cssText = 'display:flex;flex-wrap:wrap;gap:14px';
    const chips = itens.map((i, n) => { const ch = h('div', 'chip', box, `<i style="background:${ARCO[n % 10]}"></i>${i}`); return ch; });
    return { tt, chips };
  };
  const a = col(150, 'ANTIGUIDADE', ['Fita K7', 'VHS', 'VHS-C', 'Betamax', 'U-matic', 'Betacam SP (S e L)', 'Video8 / Hi8', 'MiniDV', 'DVCAM', 'Câmeras cenográficas'], '#ffd27a');
  const b = col(1010, 'ATUALIDADE & FUTURO', ['Computador moderno cenográfico', 'Inteligência Artificial', 'Televisão do Futuro', 'Estúdios virtuais 2D/3D', 'Vídeo editado automático'], '#7fe3ff');
  const seta = h('div', 'tit-m', L, '→');
  seta.style.cssText += 'position:absolute;left:905px;top:560px;font-family:Inter;font-weight:800;color:#fff';
  return {
    upd(lt, S) {
      fundo.upd(lt, S.pulso);
      k.upd(lt, 0.05);
      fxLetras(t.spans, lt, { a: 0.15, st: 0.04, d: 0.6, y: 80, rx: -90, z: -200, blur: 12 });
      fx(sub, lt, { a: 0.7, d: 0.7, y: 30, blur: 8 });
      fx(a.tt, lt, { a: 1.1, d: 0.6, x: -60, blur: 8 });
      fx(b.tt, lt, { a: 2.6, d: 0.6, x: 60, blur: 8 });
      a.chips.forEach((c, i) => fx(c, lt, { a: 1.3 + i * 0.12, d: 0.45, s: 0.4, y: 20, e: E.outBack }));
      b.chips.forEach((c, i) => fx(c, lt, { a: 2.8 + i * 0.15, d: 0.45, s: 0.4, y: 20, e: E.outBack }));
      fx(seta, lt, { a: 2.4, d: 0.5, x: -40, s: 0.5, bx: Math.sin(lt * 6) * 6 });
    },
  };
}

async function final({ THREE, kit, raiz }) {
  const cena = kit.novaCena({ fundo: null });
  cena.background = kit.fundoRadial('#2a2f9a', '#10145a', '#03040f');
  const cam = kit.camera(36);
  kit.luzes(cena, { hemi: [0xd8deff, 0x202040, 1.2], dir: [0xffffff, 2.4, [3, 8, 8]] });
  const logo = kit.logoV({ tipo: '2012', R: 1.25, H: 1.4 });
  logo.position.set(0, 0.72, 0);
  cena.add(logo, pisoBrilhante(THREE, kit, 0x0c1040), kit.sombraBlob(1.8, 1.8, 0.9));
  const pts = poeira(THREE, 700, 18, 12);
  cena.add(pts);
  const L = camada(raiz);
  const t1 = titulo(L, 'DANIEL 20 ANOS', 'tit cromo');
  t1.el.style.cssText += 'position:absolute;left:0;right:0;top:600px;text-align:center;font-size:118px';
  const t2 = h('div', 'sub', L, 'Te espero lá! &nbsp;<b>15:30 às 23:45</b>');
  t2.style.cssText += 'position:absolute;left:0;right:0;top:752px;text-align:center;font-size:40px';
  const t3 = h('div', 'sub', L, 'Espaço Armazém · Morenos Eventos &nbsp;—&nbsp; R. Jaguaré Mirim, 164 · Vila Leopoldina · São Paulo – SP');
  t3.style.cssText += 'position:absolute;left:0;right:0;top:815px;text-align:center;font-size:27px;color:#c9d1ff';
  const barra = h('div', '', L);
  barra.style.cssText = `position:absolute;left:660px;width:600px;top:880px;height:8px;border-radius:4px;background:linear-gradient(90deg,${ARCO.join(',')})`;
  const cred = h('div', 'mini', L, 'TRILHA: DANIEL AVILA &nbsp;·&nbsp; PROJETO DE ARQUITETURA DA FESTA &nbsp;·&nbsp; 2029');
  cred.style.cssText += 'position:absolute;left:0;right:0;top:920px;text-align:center;font-size:17px;letter-spacing:5px';
  const preto = h('div', '', raiz);
  preto.style.cssText = 'position:absolute;inset:0;background:#000;opacity:0';
  return {
    cena, cam,
    upd(lt, S) {
      const p = E.outCubic(seg(lt, 0, 5));
      const ang = lerp(0.9, 0, p) + lt * 0.03;
      cam.position.set(Math.sin(ang) * lerp(10, 8.4, p), lerp(4.6, 3.6, p), Math.cos(ang) * lerp(10, 8.4, p));
      cam.lookAt(0, -0.85, 0);
      logo.rotation.y = lt * 0.35;
      logo.position.y = 0.72 + Math.sin(lt * 1.2) * 0.05;
      pts.rotation.y = lt * 0.05;
      fxLetras(t1.spans, lt, { a: 0.6, st: 0.05, d: 0.7, y: 60, rx: -90, z: -200, blur: 12, centro: true });
      fx(t2, lt, { a: 1.6, d: 0.7, y: 24, blur: 8 });
      fx(t3, lt, { a: 2.0, d: 0.7, y: 24, blur: 8 });
      barra.style.transform = `scaleX(${E.outExpo(seg(lt, 1.4, 2.6)).toFixed(3)})`;
      fx(cred, lt, { a: 2.6, d: 0.8, y: 10 });
      preto.style.opacity = E.inOutCubic(seg(lt, S.dur - 2.4, S.dur - 0.25)).toFixed(3);
    },
  };
}

export default { intro, titulo: tituloCena, tema, final };
