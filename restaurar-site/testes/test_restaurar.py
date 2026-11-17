# -*- coding: utf-8 -*-
"""Testes do restaurar_wayback.py contra um Wayback simulado (dados fictícios).

Rodar:  python3 -m unittest discover -s testes -v      (de dentro de restaurar-site/)
"""

import contextlib
import csv
import io
import os
import re
import shutil
import struct
import sys
import tempfile
import unittest
import urllib.parse
import zlib

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(AQUI))
sys.path.insert(0, AQUI)

import restaurar_wayback as rw  # noqa: E402
from wayback_simulado import WaybackSimulado  # noqa: E402

SITE = "http://www.tv-exemplo.test"


def gif(marca, w=1, h=1):
    return (b"GIF89a" + struct.pack("<HH", w, h) + b"\x80\x00\x00\x00\x00\x00\xff\xff\xff!\xf9\x04\x01\x00"
            b"\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;" + marca.encode())


def png(w, h, cor):
    def bloco(tipo, dados):
        return struct.pack(">I", len(dados)) + tipo + dados + struct.pack(">I", zlib.crc32(tipo + dados) & 0xffffffff)
    linha = b"\x00" + bytes(cor) * w
    return (b"\x89PNG\r\n\x1a\n" + bloco(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
            + bloco(b"IDAT", zlib.compress(linha * h)) + bloco(b"IEND", b""))


JPG_TOPO = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00" + b"topo-2004" + b"\xff\xd9"
SWF = b"FWS\x06" + b"\x00" * 20 + b"flash-topo"

IMG = {
    "logo": gif("logo", 200, 60),
    "topo": JPG_TOPO,
    "fundo": gif("fundo", 40, 40),
    "bt1": gif("bt1", 90, 20),
    "bt1_on": gif("bt1_on", 90, 20),
    "apresentador": png(64, 48, (200, 30, 30)),
    "erro_bom": gif("erro-bom", 30, 30),
    "barra": png(100, 10, (20, 60, 160)),
    "menu": gif("menu", 120, 20),
    "foto_js": gif("foto_js", 50, 50),
    "agito": png(80, 40, (240, 180, 0)),
    "reporter_topo": png(300, 50, (0, 90, 60)),
}

PAGINA_A = (
    b'<html><head><title>TV Exemplo - Rep\xf3rter</title>\n'
    b'<link rel="stylesheet" href="css/estilo.css">\n'
    b'<script language="JavaScript" src="js/menu.js"></script>\n'
    b'<script language="JavaScript"><!--\nfunction MM_swapImage(){}\n//--></script>\n'
    b'</head>\n'
    b'<body background="img\\fundo.gif" onLoad="MM_preloadImages(\'images/bt1_on.gif\')">\n'
    b'<a name="topo"></a><img src="images/logo.gif" width=200 height=60>\n'
    b'<img src=Images/TOPO.JPG border=0>\n'
    b'<a href="reporter/index.htm" onMouseOver="MM_swapImage(\'bt1\',\'\',\'images/bt1_on.gif\',1)">'
    b'<img name="bt1" src="images/bt1.gif" alt="Vanguarda Rep&oacute;rter"></a>\n'
    b'<img src="fotos/apresentador.png">\n'
    b'<img src="images/sumiu.gif">\n'
    b'<img src="images/erro.gif">\n'
    b'<table><tr><td style="background-image:url(\'images/barra.png\')">x</td></tr></table>\n'
    b'<object><param name="movie" value="flash/topo.swf"><embed src="flash/topo.swf"></object>\n'
    b'<iframe src="agito/agenda.htm"></iframe>\n'
    b'<a href="http://www.outro-site.test/">parceiro</a> <a href="#topo">topo</a>\n'
    b'<p>Vanguarda News \x96 not\xedcias</p>\n'
    b'</body></html>\n')

PAGINA_A2 = (
    b'<html><head><title>TV Exemplo</title>'
    b'<meta http-equiv="refresh" content="5;URL=principal.htm"></head>'
    b'<body><img src="images/logo.gif"></body></html>')

PAGINA_B = (
    b'<html><head><title>Vanguarda Rep&oacute;rter</title></head><body>\n'
    b'<img src="/images/logo.gif"><img src="../images/reporter_topo.png">\n'
    b'<a href="../">voltar</a> <a href="../index.htm#topo">home</a>\n'
    b'</body></html>\n')

PRINCIPAL = b'<html><head><title>Principal</title></head><body><img src="images/logo.gif"></body></html>'
AGENDA = b'<html><head><title>Agenda</title></head><body><img src="../images/agito.png"></body></html>'
CSS = b"td.menu { background-image: url(../images/menu.gif) }\n"
JS = b'var foto = new Image(); foto.src = "images/foto_js.gif";\n'
ERRO_HTML = b"<html><head><title>Erro 500</title></head><body>Server Error</body></html>"


def capturas():
    def c(ts, caminho, corpo, mime="text/html", status=200, host=SITE):
        return {"ts": ts, "url": host + caminho, "corpo": corpo, "mime": mime, "status": status}
    return [
        c("20040110120000", "/", PAGINA_A),
        c("20040615080000", "/", PAGINA_A2),
        c("20031222100000", "/reporter/index.htm", PAGINA_B),
        c("20040615080500", "/principal.htm", PRINCIPAL),
        c("20050301000000", "/agito/agenda.htm", AGENDA),            # fora do intervalo (quadro)
        c("20020101000000", "/velho.htm", b"<html>velho</html>"),     # fora do intervalo
        c("20040105000000", "/images/logo.gif", IMG["logo"], "image/gif"),
        c("20040801000000", "/images/topo.jpg", IMG["topo"], "image/jpeg", host="http://tv-exemplo.test"),
        c("20040110000000", "/img/fundo.gif", IMG["fundo"], "image/gif"),
        c("20040111000000", "/images/bt1.gif", IMG["bt1"], "image/gif"),
        c("20040111000000", "/images/bt1_on.gif", IMG["bt1_on"], "image/gif"),
        c("20040120000000", "/arquivo/fotos/apresentador.png", IMG["apresentador"], "image/png"),
        c("20040110000000", "/images/erro.gif", ERRO_HTML, "image/gif"),   # captura ruim
        c("20040301000000", "/images/erro.gif", IMG["erro_bom"], "image/gif"),
        c("20040110000000", "/images/barra.png", IMG["barra"], "image/png"),
        c("20040110000000", "/images/menu.gif", IMG["menu"], "image/gif"),
        c("20040110000000", "/images/foto_js.gif", IMG["foto_js"], "image/gif"),
        c("20050301000000", "/images/agito.png", IMG["agito"], "image/png"),
        c("20031222100000", "/images/reporter_topo.png", IMG["reporter_topo"], "image/png"),
        c("20040110000000", "/flash/topo.swf", SWF, "application/x-shockwave-flash"),
        c("20040110000000", "/css/estilo.css", CSS, "text/css"),
        c("20040110000000", "/js/menu.js", JS, "application/x-javascript"),
    ]


def rodar(argv):
    saida = io.StringIO()
    with contextlib.redirect_stdout(saida):
        codigo = rw.main(argv)
    return codigo, saida.getvalue()


def valores_atributo(html_bytes, tag, attr):
    texto = html_bytes.decode("latin-1")
    return [m.group(1) or m.group(2) or m.group(3) for m in re.finditer(
        r"<%s\b[^>]*?\b%s\s*=\s*(?:\"([^\"]*)\"|'([^']*)'|([^\s>]+))" % (tag, attr), texto, re.I)]


class TesteCompleto(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        rw.ClienteWayback.espera_minima = 0.05
        cls.sim = WaybackSimulado(capturas(), falhas_429=1)
        cls.base = cls.sim.iniciar()
        cls.tmp = tempfile.mkdtemp(prefix="restaurar_")
        cls.saida = os.path.join(cls.tmp, "saida")
        cls.argv = ["--site", "tv-exemplo.test", "--de", "20031220", "--ate", "20050205",
                    "--saida", cls.saida, "--wayback", cls.base, "--atraso", "0"]
        cls.codigo, cls.log = rodar(cls.argv)
        cls.paginas = os.path.join(cls.saida, "paginas")

    @classmethod
    def tearDownClass(cls):
        cls.sim.parar()
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def ler(self, *partes):
        with open(os.path.join(*partes), "rb") as f:
            return f.read()

    def resolver_local(self, pagina_local, valor):
        self.assertFalse(valor.startswith("http"), "deveria ser caminho local: %s" % valor)
        caminho = os.path.normpath(os.path.join(os.path.dirname(pagina_local),
                                                urllib.parse.unquote(valor.split("#")[0])))
        self.assertTrue(os.path.isfile(caminho), "arquivo não existe: %s" % caminho)
        return caminho

    def test_codigo_saida(self):
        self.assertEqual(self.codigo, 0, self.log)

    def test_pagina_principal_imagens_restauradas(self):
        local = os.path.join(self.paginas, "20040110120000", "www.tv-exemplo.test", "index.html")
        dados = self.ler(local)
        srcs = valores_atributo(dados, "img", "src")
        esperado = {
            "logo": IMG["logo"], "topo": IMG["topo"], "bt1": IMG["bt1"],
            "apresentador": IMG["apresentador"], "erro": IMG["erro_bom"],
        }
        achados = {}
        for s in srcs:
            if s.startswith("http"):
                continue
            nome = os.path.basename(urllib.parse.unquote(s)).split(".")[0].lower()
            achados[nome] = self.ler(self.resolver_local(local, s))
        for nome, conteudo in esperado.items():
            self.assertEqual(achados.get(nome), conteudo, "imagem %s" % nome)

    def test_imagem_nao_arquivada_aponta_para_wayback(self):
        local = os.path.join(self.paginas, "20040110120000", "www.tv-exemplo.test", "index.html")
        texto = self.ler(local).decode("latin-1")
        self.assertIn('src="https://web.archive.org/web/20040110120000im_/'
                      'http://www.tv-exemplo.test/images/sumiu.gif"', texto)

    def test_barra_invertida_rollover_css_inline_e_flash(self):
        local = os.path.join(self.paginas, "20040110120000", "www.tv-exemplo.test", "index.html")
        dados = self.ler(local)
        texto = dados.decode("latin-1")
        fundo = valores_atributo(dados, "body", "background")[0]
        self.assertEqual(self.ler(self.resolver_local(local, fundo)), IMG["fundo"])
        rollovers = re.findall(r"MM_(?:swapImage|preloadImages)\([^)]*?'([^']+\.gif)'", texto)
        self.assertEqual(len(rollovers), 2)
        for r in rollovers:
            self.assertEqual(self.ler(self.resolver_local(local, r)), IMG["bt1_on"])
        inline = re.search(r"url\('([^']+)'\)", texto).group(1)
        self.assertEqual(self.ler(self.resolver_local(local, inline)), IMG["barra"])
        for valor in valores_atributo(dados, "param", "value") + valores_atributo(dados, "embed", "src"):
            self.assertEqual(self.ler(self.resolver_local(local, valor)), SWF)

    def test_bytes_latin1_preservados(self):
        local = os.path.join(self.paginas, "20040110120000", "www.tv-exemplo.test", "index.html")
        dados = self.ler(local)
        self.assertIn(b"TV Exemplo - Rep\xf3rter", dados)
        self.assertIn(b"Vanguarda News \x96 not\xedcias", dados)
        self.assertIn(b'<a href="#topo">', dados)

    def test_links_quadros_e_refresh(self):
        local = os.path.join(self.paginas, "20040110120000", "www.tv-exemplo.test", "index.html")
        dados = self.ler(local)
        iframe = valores_atributo(dados, "iframe", "src")[0]
        self.assertIn(b"Agenda", self.ler(self.resolver_local(local, iframe)))
        hrefs = valores_atributo(dados, "a", "href")
        self.assertIn("https://web.archive.org/web/20040110120000/http://www.outro-site.test/", hrefs)
        reporter = [h for h in hrefs if "reporter" in h][0]
        self.assertIn(b"reporter_topo", self.ler(self.resolver_local(local, reporter)))
        # meta refresh da versão de junho leva à página principal.htm
        local2 = os.path.join(self.paginas, "20040615080000", "www.tv-exemplo.test", "index.html")
        texto2 = self.ler(local2).decode("latin-1")
        destino = re.search(r'URL=([^"]+)"', texto2).group(1)
        self.assertIn(b"Principal", self.ler(self.resolver_local(local2, destino)))

    def test_pagina_reporter_caminhos_absolutos_e_volta(self):
        local = os.path.join(self.paginas, "20031222100000", "www.tv-exemplo.test", "reporter", "index.htm")
        dados = self.ler(local)
        srcs = valores_atributo(dados, "img", "src")
        self.assertEqual(self.ler(self.resolver_local(local, srcs[0])), IMG["logo"])
        self.assertEqual(self.ler(self.resolver_local(local, srcs[1])), IMG["reporter_topo"])
        hrefs = valores_atributo(dados, "a", "href")
        for h in hrefs:
            alvo = self.resolver_local(local, h)
            self.assertTrue(alvo.endswith(os.path.join("20040110120000", "www.tv-exemplo.test", "index.html")))
        self.assertTrue(hrefs[1].endswith("#topo"))

    def test_css_e_js_externos(self):
        css = os.path.join(self.saida, "arquivos", "20040110000000", "www.tv-exemplo.test", "css", "estilo.css")
        texto = self.ler(css).decode("latin-1")
        url_menu = re.search(r"url\(([^)]+)\)", texto).group(1)
        self.assertEqual(self.ler(self.resolver_local(css, url_menu)), IMG["menu"])
        pagina = os.path.join(self.paginas, "20040110120000", "www.tv-exemplo.test", "index.html")
        js_src = valores_atributo(self.ler(pagina), "script", "src")[0]
        js = self.ler(self.resolver_local(pagina, js_src)).decode("latin-1")
        literal = re.search(r'foto\.src = "([^"]+)"', js).group(1)
        # o caminho dentro do .js é relativo à página que o carrega
        self.assertEqual(self.ler(self.resolver_local(pagina, literal)), IMG["foto_js"])

    def test_relatorio(self):
        with open(os.path.join(self.saida, "relatorio_recursos.csv"), encoding="utf-8-sig") as f:
            linhas = list(csv.DictReader(f, delimiter=";"))
        por_recurso = {l["recurso"].rsplit("/", 1)[-1]: l for l in linhas if l["pagina_timestamp"] == "20040110120000"}
        self.assertEqual(por_recurso["apresentador.png"]["situacao"], "caminho-alternativo")
        self.assertEqual(por_recurso["sumiu.gif"]["situacao"], "nao-arquivado")
        self.assertEqual(por_recurso["TOPO.JPG"]["situacao"], "restaurado")
        self.assertGreater(float(por_recurso["TOPO.JPG"]["distancia_dias"]), 31)
        self.assertEqual(por_recurso["erro.gif"]["captura_timestamp"], "20040301000000")
        with open(os.path.join(self.saida, "faltando.txt"), encoding="utf-8") as f:
            self.assertIn("images/sumiu.gif", f.read())

    def test_paginas_listadas_e_fora_do_intervalo(self):
        self.assertFalse(os.path.exists(os.path.join(self.paginas, "20020101000000")))
        pastas = sorted(os.listdir(self.paginas))
        self.assertEqual(pastas, ["20031222100000", "20040110120000", "20040615080000",
                                  "20040615080500", "20050301000000"])

    def test_indice_e_galeria(self):
        indice = self.ler(self.saida, "index.html").decode("utf-8")
        self.assertIn("Repórter", indice)
        self.assertIn("Agito", indice)
        secao_reporter = re.search(r"<h3>Repórter <small>(\d+) página", indice)
        self.assertEqual(secao_reporter.group(1), "2")
        # "Vanguarda News" só aparece no texto da página inicial: vai para "citado em"
        self.assertRegex(indice, r"<h3>Vanguarda News <small>0 página\(s\)</small></h3>.*?"
                                 r"Citado no texto de mais 1 página")
        galeria = self.ler(self.saida, "galeria.html").decode("utf-8")
        secoes = dict(re.findall(r"<h2>([^<]+?) <small>\d+</small></h2>(.*?)</section>", galeria, re.S))
        self.assertIn("reporter_topo.png", secoes["Repórter"])
        self.assertIn("agito.png", secoes["Agito"])
        # o logotipo aparece em todo o site: não é imagem própria de nenhum programa
        self.assertNotIn("logo.gif", secoes["Repórter"])
        self.assertIn("logo.gif", secoes["Outras imagens do site"])

    def test_segunda_execucao_usa_cache(self):
        antes = len(self.sim.pedidos)
        codigo, _ = rodar(self.argv)
        self.assertEqual(codigo, 0)
        self.assertEqual(len(self.sim.pedidos), antes, "nenhum pedido novo deveria ser feito")

    def test_apenas_listar(self):
        saida = os.path.join(self.tmp, "lista")
        codigo, log = rodar(["--site", "tv-exemplo.test", "--de", "2003", "--ate", "2005", "--saida", saida,
                             "--wayback", self.base, "--atraso", "0", "--apenas-listar"])
        self.assertEqual(codigo, 0)
        with open(os.path.join(saida, "lista_capturas.csv"), encoding="utf-8-sig") as f:
            texto = f.read()
        self.assertIn("reporter/index.htm", texto)
        self.assertIn("Repórter", texto)
        self.assertIn("agito/agenda.htm", texto)  # --ate 2005 vira 20051231


class TesteFuncoes(unittest.TestCase):
    def test_resolver_url(self):
        base = "http://www.x.test/a/b.htm"
        self.assertEqual(rw.resolver_url(base, "img\\topo.gif")[0], "http://www.x.test/a/img/topo.gif")
        self.assertEqual(rw.resolver_url(base, "../../../i.gif")[0], "http://www.x.test/i.gif")
        self.assertEqual(rw.resolver_url(base, "/web/20040101000000im_/http://www.x.test/i.gif")[0],
                         "http://www.x.test/i.gif")
        self.assertEqual(rw.resolver_url(base, "javascript:void(0)"), (None, None))
        self.assertEqual(rw.resolver_url(base, "foto.asp?id=1&amp;t=2")[0], "http://www.x.test/a/foto.asp?id=1&t=2")

    def test_chave_url(self):
        self.assertEqual(rw.chave_url("http://WWW.X.test/Images/A.GIF"), rw.chave_url("https://x.test/images/a.gif"))
        self.assertEqual(rw.chave_url("http://x.test/a/index.htm", True), rw.chave_url("http://x.test/a/", True))

    def test_extrair_referencias_html_quebrado(self):
        texto = ('<IMG SRC=a.gif><td background=\'b.gif\'><img alt="x src=nao.gif" src="c.gif">'
                 '<script>document.write(\'<img src="d.gif">\'); x.src="e.jpg";</script>'
                 '<meta http-equiv="Refresh" content="0; url=home.htm">')
        refs = [(r.valor, r.tipo) for r in rw.extrair_referencias(texto)]
        valores = [v for v, _ in refs]
        self.assertEqual(valores, ["a.gif", "b.gif", "c.gif", "d.gif", "e.jpg", "home.htm"])
        self.assertNotIn("nao.gif", valores)
        self.assertEqual(refs[-1][1], "pagina_filha")

    def test_detectar_formato(self):
        self.assertEqual(rw.detectar_formato(IMG["logo"]), "gif")
        self.assertEqual(rw.detectar_formato(IMG["barra"]), "png")
        self.assertEqual(rw.detectar_formato(JPG_TOPO), "jpeg")
        self.assertEqual(rw.detectar_formato(SWF), "swf")
        self.assertIsNone(rw.detectar_formato(ERRO_HTML))
        self.assertEqual(rw.dimensoes(IMG["barra"]), (100, 10))

    def test_nome_seguro_windows(self):
        self.assertEqual(rw.nome_seguro("con.gif"), "_con.gif")
        self.assertEqual(rw.nome_seguro("a:b?c.gif"), "a_b_c.gif")


if __name__ == "__main__":
    unittest.main()
