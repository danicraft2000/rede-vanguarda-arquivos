// Mostra quantos quadros já foram renderizados (soma de todos os processos).
// uso: node tools/progresso.mjs <pasta-progresso> <total> [--loop segundos]
import fs from 'node:fs';
import path from 'node:path';
const [pasta, total, flag, intervalo] = process.argv.slice(2);
const TOTAL = +total;
// tempo de parede desde o início do render (criação da pasta de progresso)
const inicio = (() => { try { const st = fs.statSync(pasta); return st.birthtimeMs || st.ctimeMs; } catch { return Date.now(); } })();
function ler() {
  let feitos = 0, seg = (Date.now() - inicio) / 1000, fim = 0, n = 0;
  for (const f of fs.existsSync(pasta) ? fs.readdirSync(pasta) : []) {
    if (!f.endsWith('.json')) continue;
    try { const j = JSON.parse(fs.readFileSync(path.join(pasta, f))); feitos += j.feitos; fim += j.fim ? 1 : 0; n++; } catch {}
  }
  return { feitos, seg, fim, n };
}
function linha() {
  const { feitos, seg, fim, n } = ler();
  const pct = (100 * feitos / TOTAL).toFixed(1);
  const vel = seg > 0 ? feitos / seg : 0;
  const resta = Math.round(vel > 0 ? (TOTAL - feitos) / vel : 0);
  const mm = Math.floor(resta / 60), ss = resta % 60;
  return { txt: `Quadros renderizados: ${feitos} / ${TOTAL} (${pct}%) · ${vel.toFixed(2)} quadros/s · faltam ~${mm}min${String(ss).padStart(2, '0')}s`, acabou: n > 0 && fim === n && feitos >= TOTAL };
}
if (flag === '--loop') {
  let ultimo = '';
  for (;;) {
    const { txt, acabou } = linha();
    if (txt !== ultimo) console.log(txt);
    ultimo = txt;
    if (acabou) { console.log('RENDER CONCLUÍDO: todos os quadros prontos.'); break; }
    await new Promise((ok) => setTimeout(ok, (+intervalo || 60) * 1000));
  }
} else console.log(linha().txt);
