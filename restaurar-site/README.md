# Restaurar o site antigo do Wayback Machine (imagens quebradas / 404)

Ferramenta para baixar as páginas antigas do **vanguarda.tv** guardadas no
[Wayback Machine](https://web.archive.org) e consertar as imagens que aparecem
quebradas (404) quando o site é visto por lá. Foi feita para o período de
**20/12/2003 a 05/02/2005** e para achar as páginas de **Vanguarda Repórter**,
**Vanguarda News** e **Agito Vanguarda**, mas serve para qualquer site e período.

O material pertence à Rede Vanguarda. A ferramenta só guarda uma cópia local
do que o Internet Archive já tem.

## Por que as imagens aparecem quebradas no Wayback

| Causa | O que a ferramenta faz |
|---|---|
| A imagem foi arquivada em **outra data** (dias ou anos depois da página) | Procura no índice do Wayback (CDX) e pega a captura **mais próxima** da data da página |
| Botões com **rollover** do Dreamweaver (`MM_swapImage`, `MM_preloadImages`, `this.src='...'`): o Wayback não reescreve esses caminhos | Lê os caminhos dentro do JavaScript, também em `.js` externos |
| Caminho com **barra invertida** (`img\topo.gif`) ou **maiúsculas** diferentes (`Images/TOPO.JPG`), comum em sites feitos em Windows/IIS | Corrige a barra e compara sem diferenciar maiúsculas |
| Imagem em **CSS** (`url(...)`), em `background="..."` de tabela, em `<param>`/`<embed>` de **Flash** | Lê todos esses lugares |
| Imagem arquivada com ou sem **www.**, ou em **outra pasta** | Procura pelo nome do arquivo no domínio inteiro e marca como "caminho alternativo" |
| A captura mais próxima é uma **página de erro** do servidor, não a imagem | Confere o conteúdo (assinatura GIF/JPEG/PNG/SWF) e tenta a próxima captura |
| Página de entrada com **quadros** (`<frame>`, `<iframe>`), `<meta refresh>` ou `window.open(...)` | Baixa também essas páginas filhas |

## Como usar

Precisa só do **Python 3** (no Windows: [python.org](https://www.python.org/downloads/),
marque "Add Python to PATH"). Não precisa instalar nenhum pacote.

```bash
cd restaurar-site

# 1) (opcional) ver primeiro o que existe no Wayback no período, sem baixar nada
python3 restaurar_wayback.py --site vanguarda.tv --de 20031220 --ate 20050205 --apenas-listar

# 2) baixar e restaurar
python3 restaurar_wayback.py --site vanguarda.tv --de 20031220 --ate 20050205
```

No Windows, troque `python3` por `py`.

Leva tempo: o script faz cerca de **um pedido por segundo** para não ser
bloqueado pelo Internet Archive. Se parar no meio (internet caiu, ou você
apertou Ctrl+C), **rode o mesmo comando de novo**. Tudo que já foi baixado
fica em cache (`.cache/`) e não é pedido outra vez.

### O que sai na pasta `restaurado_vanguarda.tv_20031220_20050205/`

- `index.html`: abra no navegador. Tem o resumo, a seção **Programas
  procurados** (Repórter, Vanguarda News, Agito) e a lista de todas as
  páginas por data, com link para a cópia local e para o Wayback.
- `galeria.html`: todas as imagens recuperadas, separadas por programa.
  Logotipo e botões do menu, que aparecem em todo o site, ficam em "Outras imagens do site".
- `paginas/<data>/<endereço>`: as páginas com os caminhos das imagens já
  corrigidos para os arquivos locais. Os bytes originais (acentos em
  ISO-8859-1) são mantidos; só os caminhos mudam. No fim de cada página há um
  comentário dizendo de qual captura ela veio.
- `arquivos/<data da captura>/<endereço>`: as imagens, CSS, JS e Flash, com a
  data da captura de onde cada uma saiu.
- `relatorio_recursos.csv`: para cada imagem de cada página, a situação
  (`restaurado`, `caminho-alternativo`, `caminho-alternativo-verificar`,
  `nao-arquivado`), a captura usada e a **distância em dias** da data da
  página. Abre no Excel (separador `;`).
- `faltando.txt`: o que não existe em nenhuma captura do Wayback.

### Opções úteis

| Opção | Para quê |
|---|---|
| `--palavras "Repórter,Vanguarda News,Agito"` | Nomes destacados no índice e na galeria (esse é o padrão) |
| `--filtro-url reporter` | Só páginas cujo endereço contém `reporter` (aceita expressão regular) |
| `--url http://www.vanguarda.tv/...` | Incluir um endereço específico, mesmo que não apareça na listagem |
| `--versoes primeira` / `ultima` | Uma versão de cada página em vez de todas as versões diferentes |
| `--hosts-extras dominio1,dominio2` | Procurar imagens perdidas também em outros domínios (se o site usava outro servidor para as imagens) |
| `--ate 20051231` | Ampliar o período. O Agito Vanguarda de 2005 pode ter mais páginas depois de fevereiro |
| `--atraso 2` | Ir mais devagar se o Wayback começar a responder "429" |

## Limites

- **O que nunca foi arquivado não volta.** Se o robô do Internet Archive não
  baixou a imagem em nenhuma data, ela fica em `faltando.txt` e, na página,
  continua apontando para o Wayback.
- Imagens de **outra data** (coluna `distancia_dias` acima de 31) podem ser uma
  versão diferente da que estava no ar no dia da página. Banners e fotos de
  destaque mudavam toda semana.
- `caminho-alternativo-verificar`: havia mais de um arquivo com o mesmo nome em
  pastas diferentes. Vale conferir com os olhos.
- **Flash (.swf)** é baixado, mas navegadores atuais não tocam Flash. Use o
  [Ruffle](https://ruffle.rs) para abrir os `.swf`.
- **Vídeos** dos programas em Windows Media/RealVideo (`mms://`, `rtsp://`,
  arquivos `.asx`/`.ram`) quase nunca foram arquivados. A ferramenta tenta os
  arquivos `.asx`/`.ram`/`.wmv` que tiverem link direto, mas o vídeo em si
  raramente está no Wayback.

## Testes

Os testes rodam contra um Wayback **simulado** (servidor local com um site
fictício, `tv-exemplo.test`), sem precisar de internet:

```bash
cd restaurar-site
python3 -m unittest discover -s testes -v
```

Eles cobrem rollover em JavaScript, barra invertida, maiúsculas, CSS externo e
inline, `.js` externo, Flash, quadros, `<meta refresh>`, imagem em outra pasta,
captura que é página de erro, imagem não arquivada, preservação dos acentos
ISO-8859-1, erro 429 com nova tentativa e o reaproveitamento do cache.
