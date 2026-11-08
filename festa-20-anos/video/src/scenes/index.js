// Registro das cenas (cada uma exporta uma função async que monta a cena e devolve { cena, cam, upd }).
export const CENAS = {};
const mods = await Promise.all([
  import('./abertura.js'), import('./local.js'), import('./espacos.js'), import('./vanguarda-especial.js'),
  import('./salao.js'), import('./cardapio.js'), import('./lazer.js'), import('./museu.js'), import('./estudios.js'), import('./futuro.js'),
].map((p) => p.catch((e) => { console.error('módulo de cena falhou: ' + e.message); return {}; })));
for (const m of mods) Object.assign(CENAS, m.default || {});
