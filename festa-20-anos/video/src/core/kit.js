// Kit 3D: materiais, texturas procedurais e modelos reutilizáveis (maquete da festa).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import * as BGU from 'three/addons/utils/BufferGeometryUtils.js';
import { ARCO } from './ui.js';
import { rng } from './anim.js';

export async function criarKit(renderer) {
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  const texto3d = await (await fetch('/assets/texto3d.json')).json();
  await Promise.all(['100px AG', '500 40px Inter', '700 40px Inter', '800 40px Inter', '600 40px Inter'].map((f) => document.fonts.load(f)));
  const cache = new Map();
  const C = (c) => new THREE.Color(c);

  // ---------------- materiais (Phong/Lambert = rápidos; Standard só para cromados)
  const m = {
    fosco: (cor, o = {}) => new THREE.MeshLambertMaterial({ color: C(cor), ...o }),
    brilho: (cor, sh = 60, o = {}) => new THREE.MeshPhongMaterial({ color: C(cor), shininess: sh, specular: 0x444444, ...o }),
    cromo: (cor = 0xe3e7ef, r = 0.18, o = {}) => new THREE.MeshStandardMaterial({ color: C(cor), metalness: 1, roughness: r, envMapIntensity: 1.15, ...o }),
    acetinado: (cor = 0xdfe3ea, r = 0.35, met = 0.6, o = {}) => new THREE.MeshStandardMaterial({ color: C(cor), metalness: met, roughness: r, ...o }),
    luz: (cor, o = {}) => new THREE.MeshBasicMaterial({ color: C(cor), ...o }),
    tex: (map, o = {}) => new THREE.MeshLambertMaterial({ map, ...o }),
    texB: (map, o = {}) => new THREE.MeshBasicMaterial({ map, ...o }),
    feixe: (cor, op = 0.18) => new THREE.MeshBasicMaterial({ color: C(cor), transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  };

  // ---------------- texturas
  function canvasTex(w, hgt, desenhar, rep = null) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = hgt;
    const g = cv.getContext('2d');
    desenhar(g, w, hgt);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
    return t;
  }
  function carregarImg(url) {
    return new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = url; });
  }
  async function imgTex(url, w = 0, hgt = 0, ajuste = 'cover') {
    const img = await carregarImg(url);
    const W = w || img.naturalWidth || 1024, H = hgt || img.naturalHeight || 1024;
    return canvasTex(W, H, (g) => {
      if (ajuste === 'stretch') { g.drawImage(img, 0, 0, W, H); return; }
      const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const iw = img.naturalWidth * s, ih = img.naturalHeight * s;
      g.drawImage(img, (W - iw) / 2, (H - ih) / 2, iw, ih);
    });
  }
  const arcoFaixas = (g, w, hgt, vert = true, gap = 0.12, fundo = '#ffffff') => {
    g.fillStyle = fundo; g.fillRect(0, 0, w, hgt);
    const n = ARCO.length;
    ARCO.forEach((c, i) => {
      g.fillStyle = c;
      if (vert) g.fillRect(0, (i / n) * hgt + (gap * hgt) / n / 2, w, (hgt / n) * (1 - gap));
      else g.fillRect((i / n) * w + (gap * w) / n / 2, 0, (w / n) * (1 - gap), hgt);
    });
  };
  const tex = {
    arcoV: canvasTex(64, 1024, (g, w, hh) => arcoFaixas(g, w, hh, true, 0.14)),
    arcoVcheio: canvasTex(64, 1024, (g, w, hh) => arcoFaixas(g, w, hh, true, 0)),
    arcoH: canvasTex(1024, 64, (g, w, hh) => { const gr = g.createLinearGradient(0, 0, w, 0); ARCO.forEach((c, i) => gr.addColorStop(i / 9, c)); g.fillStyle = gr; g.fillRect(0, 0, w, hh); }),
    tijolo: canvasTex(512, 512, (g, w, hh) => {
      g.fillStyle = '#8c4a35'; g.fillRect(0, 0, w, hh);
      const r = rng(3);
      for (let y = 0; y < 16; y++) for (let x = -1; x < 8; x++) {
        const ox = (y % 2) * 32;
        const c = 120 + r() * 50;
        g.fillStyle = `rgb(${c + 40},${c * 0.45},${c * 0.32})`;
        g.fillRect(x * 64 + ox + 2, y * 32 + 2, 60, 28);
      }
    }, [4, 4]),
    piso: canvasTex(512, 512, (g, w, hh) => {
      g.fillStyle = '#d9d2c4'; g.fillRect(0, 0, w, hh);
      const r = rng(5);
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
        const c = 214 + r() * 14;
        g.fillStyle = `rgb(${c},${c - 6},${c - 18})`; g.fillRect(x * 128 + 2, y * 128 + 2, 124, 124);
      }
    }, [10, 10]),
    madeira: canvasTex(512, 512, (g, w, hh) => {
      g.fillStyle = '#b07a46'; g.fillRect(0, 0, w, hh);
      const r = rng(9);
      for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(90,50,20,${0.08 + r() * 0.18})`; g.lineWidth = 1 + r() * 3; g.beginPath(); const y = r() * hh; g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + r() * 20 - 10, w * 0.7, y + r() * 20 - 10, w, y + r() * 10 - 5); g.stroke(); }
    }, [2, 2]),
    paralelepipedo: canvasTex(512, 512, (g, w, hh) => {
      g.fillStyle = '#6d6a66'; g.fillRect(0, 0, w, hh);
      const r = rng(11);
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const c = 110 + r() * 50; g.fillStyle = `rgb(${c},${c - 4},${c - 10})`; g.fillRect(x * 32 + 2 + (y % 2) * 8, y * 32 + 2, 28, 28); }
    }, [12, 6]),
    grama: canvasTex(256, 256, (g, w, hh) => { g.fillStyle = '#4c8a3a'; g.fillRect(0, 0, w, hh); const r = rng(13); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${40 + r() * 60},${110 + r() * 70},${30 + r() * 30},0.8)`; g.fillRect(r() * w, r() * hh, 2, 5); } }, [8, 8]),
    carpete: canvasTex(256, 256, (g, w, hh) => { g.fillStyle = '#2a2d5e'; g.fillRect(0, 0, w, hh); const r = rng(17); for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.05})`; g.fillRect(r() * w, r() * hh, 2, 2); } }, [6, 6]),
  };

  // ---------------- texto 3D (contornos já com kerning e V/A Vanguarda)
  function texto3D(chave, { tam = 1, prof = 0.25, chanfro = 0.03, mats = null } = {}) {
    const d = texto3d[chave];
    const dados = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d.d}"/></svg>`);
    const formas = dados.paths.flatMap((p) => SVGLoader.createShapes(p));
    const s = tam / 100;
    const geo = new THREE.ExtrudeGeometry(formas, {
      depth: prof / s, bevelEnabled: chanfro > 0, bevelThickness: chanfro / s, bevelSize: (chanfro * 0.8) / s, bevelSegments: 2, curveSegments: 5,
    });
    geo.translate(-d.w / 2, 36, -prof / s / 2);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mats || [m.acetinado(0xffffff, 0.22, 0.25), m.cromo(0xc9cfdc, 0.25)]);
    mesh.scale.set(s, -s, s);
    const g = new THREE.Group();
    g.add(mesh);
    g.userData.largura = d.w * s;
    return g;
  }

  // Texto 3D letra por letra (cada letra num grupo próprio, para animar separadamente)
  function letras3D(chave, { tam = 1, prof = 0.25, chanfro = 0.03, mats = null } = {}) {
    const d = texto3d[chave];
    const s = tam / 100;
    const g = new THREE.Group();
    const matsU = mats || [m.acetinado(0xffffff, 0.22, 0.25), m.cromo(0xc9cfdc, 0.25)];
    g.userData.letras = d.letras.map((L) => {
      const dados = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${L.d}"/></svg>`);
      const formas = dados.paths.flatMap((p) => SVGLoader.createShapes(p));
      const geo = new THREE.ExtrudeGeometry(formas, { depth: prof / s, bevelEnabled: chanfro > 0, bevelThickness: chanfro / s, bevelSize: (chanfro * 0.8) / s, bevelSegments: 2, curveSegments: 5 });
      geo.translate(0, 36, -prof / s / 2);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, matsU);
      mesh.scale.set(s, -s, s);
      mesh.castShadow = true;
      const lg = new THREE.Group();
      lg.add(mesh);
      lg.position.x = (L.x - d.w / 2) * s;
      lg.userData.x0 = lg.position.x;
      g.add(lg);
      return lg;
    });
    g.userData.largura = d.w * s;
    return g;
  }

  // ---------------- textura de texto (placas, telas, rótulos)
  function texTexto(linhas, { w = 1024, h: hh = 256, fundo = '#0b0f3a', cor = '#ffffff', fonte = 'AG', tam = 90, peso = 700, alinhar = 'center', arco = false, borda = null } = {}) {
    return canvasTex(w, hh, (g) => {
      if (fundo) { g.fillStyle = fundo; g.fillRect(0, 0, w, hh); }
      if (arco) { const gr = g.createLinearGradient(0, 0, w, 0); ARCO.forEach((c, i) => gr.addColorStop(i / 9, c)); g.fillStyle = gr; g.fillRect(0, hh - hh * 0.07, w, hh * 0.07); }
      if (borda) { g.strokeStyle = borda; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, hh - 8); }
      const ls = Array.isArray(linhas) ? linhas : [linhas];
      g.textAlign = alinhar; g.textBaseline = 'middle';
      ls.forEach((l, i) => {
        const L = typeof l === 'string' ? { t: l } : l;
        g.fillStyle = L.cor || cor;
        g.font = `${L.peso || peso} ${L.tam || tam}px ${L.fonte || fonte}, Inter, sans-serif`;
        const y = L.y != null ? L.y * hh : hh * ((i + 0.5) / ls.length);
        const x = alinhar === 'center' ? w / 2 : alinhar === 'left' ? w * 0.06 : w * 0.94;
        g.fillText(L.t, x, y);
      });
    });
  }

  // ---------------- modelos
  // Logo V cilíndrico da Vanguarda. tipo '2012' = funil de anéis arco-íris; '2003' = bordas do V em arco-íris
  function logoV({ R = 1, H = 1.15, esp = 0.07, tipo = '2012', abertura = 0.62, fundoV = 0.07, seg = 96 } = {}) {
    const g = new THREE.Group();
    const NY = 24;
    const meiaAb = (v) => fundoV + (abertura - fundoV) * v; // v: 0 base → 1 topo
    const casca = (raio, dentro) => {
      const pos = [], uv = [], idx = [];
      for (let j = 0; j <= NY; j++) {
        const v = j / NY, y = -H / 2 + v * H, a = meiaAb(v);
        for (let i = 0; i <= seg; i++) {
          const th = a + (i / seg) * (2 * Math.PI - 2 * a);
          pos.push(raio * Math.sin(th), y, raio * Math.cos(th));
          uv.push(i / seg, v);
        }
      }
      for (let j = 0; j < NY; j++) for (let i = 0; i < seg; i++) {
        const a = j * (seg + 1) + i, b = a + 1, c = a + seg + 1, d = c + 1;
        if (dentro) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx); geo.computeVertexNormals();
      return geo;
    };
    const fora = new THREE.Mesh(casca(R, false), m.cromo(0xe8ebf2, 0.2));
    const dentro = new THREE.Mesh(casca(R - esp, true), m.acetinado(0xc8ccd6, 0.4, 0.5));
    g.add(fora, dentro);
    // faces das bordas do V (ligam casca externa e interna)
    const borda = (lado) => {
      const pos = [], cor = [], idx = [];
      for (let j = 0; j <= NY; j++) {
        const v = j / NY, y = -H / 2 + v * H, a = meiaAb(v) * lado;
        const th = lado > 0 ? a : 2 * Math.PI + a;
        pos.push(R * Math.sin(th), y, R * Math.cos(th), (R - esp) * Math.sin(th), y, (R - esp) * Math.cos(th));
        const c = tipo === '2003' ? C(ARCO[Math.min(9, Math.floor((1 - v) * 10))]) : C(0xffffff);
        cor.push(c.r, c.g, c.b, c.r, c.g, c.b);
      }
      for (let j = 0; j < NY; j++) { const a = j * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(cor, 3));
      geo.setIndex(idx); geo.computeVertexNormals();
      return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    };
    g.add(borda(1), borda(-1));
    // aro superior e inferior
    const aro = (y) => {
      const geo = new THREE.RingGeometry(R - esp, R, seg, 1, 0, 2 * Math.PI);
      const mm = new THREE.Mesh(geo, m.cromo(0xf4f6fa, 0.15, { side: THREE.DoubleSide }));
      mm.rotation.x = -Math.PI / 2; mm.position.y = y; return mm;
    };
    g.add(aro(H / 2), aro(-H / 2));
    if (tipo === '2012') {
      // funil de anéis coloridos dentro do cilindro
      const n = ARCO.length;
      for (let i = 0; i < n; i++) {
        const v1 = 1 - i / n, v2 = 1 - (i + 0.78) / n;
        const r1 = (R - esp) * (0.96 - 0.68 * (i / n)), r2 = (R - esp) * (0.96 - 0.68 * ((i + 0.78) / n));
        const geo = new THREE.CylinderGeometry(r1, r2, (v1 - v2) * H, 72, 1, true);
        const mat = new THREE.MeshPhongMaterial({ color: C(ARCO[i]), emissive: C(ARCO[i]).multiplyScalar(0.45), shininess: 90, side: THREE.DoubleSide });
        const anel = new THREE.Mesh(geo, mat);
        anel.position.y = -H / 2 + ((v1 + v2) / 2) * H;
        g.add(anel);
        const brilho = new THREE.Mesh(new THREE.TorusGeometry(r1, 0.012, 6, 72), m.luz(0xffffff));
        brilho.rotation.x = Math.PI / 2; brilho.position.y = -H / 2 + v1 * H; g.add(brilho);
      }
      const fundo = new THREE.Mesh(new THREE.CircleGeometry((R - esp) * 0.3, 48), m.luz(0xffffff));
      fundo.rotation.x = -Math.PI / 2; fundo.position.y = -H / 2 + 0.01; g.add(fundo);
    } else {
      const fundo = new THREE.Mesh(new THREE.CircleGeometry(R - esp, 64), m.brilho(0x1a2060, 30, { side: THREE.DoubleSide }));
      fundo.rotation.x = -Math.PI / 2; fundo.position.y = -H / 2 + 0.01; g.add(fundo);
    }
    return g;
  }

  // Cone prateado de 1998 (primeira logo), com fenda e aro arco-íris
  function cone98({ R = 1, H = 1.5, fenda = 0.28 } = {}) {
    const g = new THREE.Group();
    const geo = new THREE.ConeGeometry(R, H, 96, 8, true, fenda / 2 + Math.PI * 0.15, 2 * Math.PI - fenda);
    const cone = new THREE.Mesh(geo, m.cromo(0xe2e6ee, 0.16, { side: THREE.DoubleSide }));
    cone.rotation.z = Math.PI; // ponta para baixo
    g.add(cone);
    // aro superior com cores (roxo → laranja → amarelo...)
    const pts = [];
    for (let i = 0; i <= 128; i++) { const a = (i / 128) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * R, H / 2, Math.sin(a) * R)); }
    const tubo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 256, 0.035, 8, true);
    const cores = [];
    const pa = tubo.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      const a = (Math.atan2(pa.getZ(i), pa.getX(i)) / (Math.PI * 2) + 1) % 1;
      const c = C(ARCO[Math.floor(a * 10) % 10]);
      cores.push(c.r, c.g, c.b);
    }
    tubo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
    g.add(new THREE.Mesh(tubo, new THREE.MeshBasicMaterial({ vertexColors: true })));
    // bordas da fenda em arco-íris
    for (const lado of [-1, 1]) {
      const a = Math.PI * 0.15 + (lado > 0 ? fenda / 2 : -fenda / 2) + Math.PI / 2;
      const base = new THREE.Vector3(0, -H / 2, 0);
      const topo = new THREE.Vector3(Math.sin(a) * R, H / 2, Math.cos(a) * R);
      const c = new THREE.LineCurve3(base, topo);
      const tg = new THREE.TubeGeometry(c, 16, 0.025, 6, false);
      const cs = [];
      const p2 = tg.attributes.position;
      for (let i = 0; i < p2.count; i++) { const v = (p2.getY(i) + H / 2) / H; const cc = C(ARCO[Math.min(9, Math.floor((1 - v) * 10))]); cs.push(cc.r, cc.g, cc.b); }
      tg.setAttribute('color', new THREE.Float32BufferAttribute(cs, 3));
      g.add(new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ vertexColors: true })));
    }
    return g;
  }

  // Arco-íris (10 tubos em semicírculo) — decoração do estacionamento
  function arcoIris(raio = 4, esp = 0.12, profundidade = 0.3) {
    const g = new THREE.Group();
    ARCO.forEach((c, i) => {
      const r = raio - i * esp * 1.05;
      const geo = new THREE.TorusGeometry(r, esp / 2, 8, 64, Math.PI);
      const mesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: C(c), emissive: C(c).multiplyScalar(0.35), shininess: 80 }));
      mesh.scale.z = profundidade / esp;
      g.add(mesh);
    });
    return g;
  }

  // Figura humana estilizada de maquete
  const geoCorpo = new THREE.CapsuleGeometry(0.2, 0.9, 4, 10);
  const geoCabeca = new THREE.SphereGeometry(0.15, 14, 10);
  function pessoa(cor = 0xf2f2f2, altura = 1.7) {
    const g = new THREE.Group();
    const mat = m.brilho(cor, 30);
    const corpo = new THREE.Mesh(geoCorpo, mat); corpo.position.y = 0.65; corpo.castShadow = true;
    const cab = new THREE.Mesh(geoCabeca, mat); cab.position.y = 1.42; cab.castShadow = true;
    g.add(corpo, cab);
    g.scale.setScalar(altura / 1.7);
    return g;
  }

  function arvore(escala = 1, cor = 0x3f8a3c) {
    const g = new THREE.Group();
    const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 3, 8), m.fosco(0x6b4a2a));
    tronco.position.y = 1.5; g.add(tronco);
    const r = rng(Math.floor(escala * 100));
    for (let i = 0; i < 5; i++) {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 + r() * 0.6, 1), m.fosco(new THREE.Color(cor).offsetHSL(0, 0, (r() - 0.5) * 0.08), { flatShading: true }));
      b.position.set((r() - 0.5) * 1.6, 3.4 + r() * 1.2, (r() - 0.5) * 1.6); g.add(b);
    }
    g.scale.setScalar(escala);
    return g;
  }
  function palmeira(escala = 1) {
    const g = new THREE.Group();
    const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 7, 8), m.fosco(0x8a7a62));
    tronco.position.y = 3.5; g.add(tronco);
    for (let i = 0; i < 9; i++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.35, 3, 4), m.fosco(0x3f7f34, { flatShading: true }));
      f.position.y = 7; f.rotation.z = Math.PI / 2.6; f.rotation.y = (i / 9) * Math.PI * 2;
      f.geometry.translate(0, 1.5, 0);
      g.add(f);
    }
    g.scale.setScalar(escala);
    return g;
  }
  function carro(cor = 0x8a8f99) {
    const g = new THREE.Group();
    const corpo = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.8, 1.8), m.brilho(cor, 90));
    corpo.position.y = 0.7; g.add(corpo);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.65, 1.6), m.brilho(0x1a2030, 120));
    cab.position.set(-0.2, 1.4, 0); g.add(cab);
    for (const x of [-1.35, 1.35]) for (const z of [-0.9, 0.9]) {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.25, 16), m.fosco(0x151515));
      r.rotation.x = Math.PI / 2; r.position.set(x, 0.36, z); g.add(r);
    }
    return g;
  }
  function mesaRedonda(cor = 0xffffff, raio = 0.9) {
    const g = new THREE.Group();
    const toalha = new THREE.Mesh(new THREE.CylinderGeometry(raio, raio * 1.08, 0.76, 32), m.brilho(cor, 20));
    toalha.position.y = 0.38; toalha.castShadow = true; g.add(toalha);
    const tampo = new THREE.Mesh(new THREE.CylinderGeometry(raio, raio, 0.03, 32), m.brilho(cor, 30));
    tampo.position.y = 0.77; g.add(tampo);
    return g;
  }
  function cadeira(cor = 0xc9a24a) {
    const g = new THREE.Group();
    const mat = m.brilho(cor, 60);
    const ass = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.42), mat); ass.position.y = 0.46; g.add(ass);
    for (const x of [-0.18, 0.18]) for (const z of [-0.18, 0.18]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.46, 6), mat); p.position.set(x, 0.23, z); g.add(p); }
    const enc = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.04), mat); enc.position.set(0, 0.7, -0.2); g.add(enc);
    return g;
  }
  function trelica(comp = 10, lado = 0.3, mat = null) {
    // treliça de alumínio/preta mesclada num único mesh (poucas chamadas de desenho)
    const mm = mat || m.brilho(0x1a1a1f, 80);
    const partes = [];
    for (const y of [-lado / 2, lado / 2]) for (const z of [-lado / 2, lado / 2]) {
      const t = new THREE.CylinderGeometry(0.025, 0.025, comp, 6); t.rotateZ(Math.PI / 2); t.translate(0, y, z); partes.push(t);
    }
    const n = Math.floor(comp / lado);
    for (let i = 0; i < n; i++) for (const z of [-lado / 2, lado / 2]) {
      const d = new THREE.CylinderGeometry(0.012, 0.012, lado * 1.414, 4); d.rotateZ((i % 2 ? 1 : -1) * Math.PI / 4); d.translate(-comp / 2 + (i + 0.5) * lado, 0, z); partes.push(d);
    }
    const g = new THREE.Group();
    g.add(new THREE.Mesh(BGU.mergeGeometries(partes.map((x) => x.toNonIndexed())), mm));
    return g;
  }
  // Moving head com feixe de luz volumétrico
  function refletor(cor = 0x88aaff, comp = 9, abertura = 0.9) {
    const g = new THREE.Group();
    const corpo = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.4, 12), m.brilho(0x111111, 60));
    g.add(corpo);
    const lente = new THREE.Mesh(new THREE.CircleGeometry(0.14, 16), m.luz(cor));
    lente.rotation.x = Math.PI / 2; lente.position.y = -0.21; g.add(lente);
    const feixeGeo = new THREE.ConeGeometry(abertura, comp, 24, 1, true);
    feixeGeo.translate(0, -comp / 2 - 0.2, 0);
    const feixe = new THREE.Mesh(feixeGeo, m.feixe(cor, 0.12));
    g.add(feixe);
    g.userData.feixe = feixe;
    return g;
  }
  function tela(map, w, hh, moldura = 0x0a0a0e, esp = 0.12) {
    const g = new THREE.Group();
    const caixa = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, hh + 0.2, esp), m.brilho(moldura, 80));
    g.add(caixa);
    const img = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), m.texB(map));
    img.position.z = esp / 2 + 0.005; g.add(img);
    g.userData.img = img;
    return g;
  }
  function caixa(w, hh, d, mat) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat); return b; }

  function novaCena({ fundo = 0x05061c, nevoa = null, ambiente = true } = {}) {
    const s = new THREE.Scene();
    s.background = fundo != null ? C(fundo) : null;
    if (nevoa) s.fog = new THREE.Fog(C(nevoa[0]), nevoa[1], nevoa[2]);
    if (ambiente) s.environment = env;
    return s;
  }
  function luzes(cena, { hemi = [0xdfe6ff, 0x3a3550, 1.6], dir = [0xffffff, 2.2, [8, 14, 6]], sombra = false, alvo = [0, 0, 0], area = 20 } = {}) {
    if (hemi) cena.add(new THREE.HemisphereLight(hemi[0], hemi[1], hemi[2]));
    if (dir) {
      const d = new THREE.DirectionalLight(dir[0], dir[1]);
      d.position.set(...dir[2]);
      d.target.position.set(...alvo);
      cena.add(d, d.target);
      if (sombra) {
        d.castShadow = true; d.shadow.mapSize.set(2048, 2048); d.shadow.bias = -0.0005; d.shadow.normalBias = 0.02;
        Object.assign(d.shadow.camera, { left: -area, right: area, top: area, bottom: -area, near: 0.5, far: 120 });
      }
      return d;
    }
  }
  // Sombra suave falsa (mancha radial) — mais bonita e barata que shadow map
  const texSombra = canvasTex(256, 256, (g, w, hh) => { const gr = g.createRadialGradient(w / 2, hh / 2, 0, w / 2, hh / 2, w / 2); gr.addColorStop(0, 'rgba(0,0,0,0.75)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, hh); });
  function sombraBlob(rx = 1, rz = 1, op = 1) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(rx * 2, rz * 2), new THREE.MeshBasicMaterial({ map: texSombra, transparent: true, opacity: op, depthWrite: false }));
    s.rotation.x = -Math.PI / 2; s.position.y = 0.01; s.renderOrder = 1;
    return s;
  }
  // "Poça" de luz de spot na parede (aditiva, sem custo de iluminação)
  const texPoca = canvasTex(256, 512, (g, w, hh) => {
    const gr = g.createRadialGradient(w / 2, 0, 4, w / 2, hh * 0.35, hh * 0.75);
    gr.addColorStop(0, 'rgba(255,240,215,0.95)'); gr.addColorStop(0.4, 'rgba(255,236,205,0.45)'); gr.addColorStop(1, 'rgba(255,230,200,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(w * 0.42, 0); g.lineTo(w * 0.58, 0); g.lineTo(w, hh); g.lineTo(0, hh); g.closePath(); g.fill();
  });
  function pocaLuz(w = 2.4, hh = 3.6, op = 0.55) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), new THREE.MeshBasicMaterial({ map: texPoca, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false }));
    p.renderOrder = 2;
    return p;
  }
  const camera = (fov = 40) => new THREE.PerspectiveCamera(fov, 16 / 9, 0.1, 600);

  // Fundo em degradê vertical (céu/estúdio)
  function ceu(cores, w = 16, hh = 512) {
    const t = canvasTex(w, hh, (g) => { const gr = g.createLinearGradient(0, 0, 0, hh); cores.forEach(([o, c]) => gr.addColorStop(o, c)); g.fillStyle = gr; g.fillRect(0, 0, w, hh); });
    return t;
  }
  function fundoRadial(c1, c2, c3) {
    return canvasTex(1024, 576, (g, w, hh) => { const gr = g.createRadialGradient(w / 2, hh * 0.42, 10, w / 2, hh * 0.45, w * 0.7); gr.addColorStop(0, c1); gr.addColorStop(0.45, c2); gr.addColorStop(1, c3); g.fillStyle = gr; g.fillRect(0, 0, w, hh); });
  }

  return { pocaLuz, sombraBlob, env, m, tex, canvasTex, imgTex, texTexto, texto3D, letras3D, ceu, fundoRadial, logoV, cone98, arcoIris, pessoa, arvore, palmeira, carro, mesaRedonda, cadeira, trelica, refletor, tela, caixa, novaCena, luzes, camera, carregarImg, cache };
}
