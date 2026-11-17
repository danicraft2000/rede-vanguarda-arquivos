#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
restaurar_wayback.py
====================

Baixa as páginas antigas de um site guardadas no Wayback Machine
(web.archive.org) dentro de um intervalo de datas e conserta as imagens que
aparecem quebradas (404) quando o site é visto pelo Wayback.

Por que as imagens aparecem quebradas no Wayback?
  1. A imagem foi arquivada em OUTRA data (dias, meses ou anos depois da página).
  2. Ela é trocada por JavaScript (rollover do Dreamweaver: MM_swapImage,
     MM_preloadImages, onMouseOver="this.src=...") e o Wayback não reescreve
     esses caminhos.
  3. O caminho usa barra invertida (img\\topo.gif), comum em sites feitos em
     Windows/IIS, ou maiúsculas/minúsculas diferentes (Images/TOPO.JPG).
  4. Ela está em CSS (url(...)), em background="..." de tabela, em <param> de
     Flash ou dentro de um arquivo .js externo.
  5. A imagem foi arquivada em outro endereço (www. ou sem www., outra pasta).

O script procura cada imagem no índice do Wayback (CDX), pega a captura mais
próxima da data da página, confere se o arquivo é mesmo uma imagem (e não uma
página de erro) e reescreve o HTML para apontar para a cópia local.

Só usa a biblioteca padrão do Python 3.6+. Exemplo:

    python3 restaurar_wayback.py --site vanguarda.tv --de 20031220 --ate 20050205

Veja o README.md desta pasta para mais detalhes.
"""

import argparse
import csv
import datetime as dt
import hashlib
import html
import http.client
import json
import os
import re
import struct
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict, deque

VERSAO = "1.0"
WAYBACK_PUBLICO = "https://web.archive.org"
USER_AGENT = "restaurar-wayback/%s (preservacao de acervo de TV; python-urllib)" % VERSAO

EXT_IMAGEM = {"gif", "jpg", "jpeg", "jpe", "pjpeg", "png", "bmp", "ico", "svg",
              "tif", "tiff", "webp", "xbm", "wbmp"}
EXT_FLASH = {"swf"}
EXT_MIDIA = {"asx", "asf", "wmv", "wma", "wvx", "wax", "ram", "rm", "ra", "rpm",
             "smil", "mp3", "mpg", "mpeg", "avi", "mov", "qt", "mid", "midi",
             "wav", "au", "flv", "mp4"}
EXT_CSS = {"css"}
EXT_JS = {"js"}
EXT_PAGINA = {"", "htm", "html", "shtml", "shtm", "xhtml", "asp", "aspx", "php",
              "php3", "php4", "jsp", "cfm", "cgi", "pl", "phtml", "jhtml"}
TIPOS_RECURSO = {"imagem", "flash", "css", "js", "midia"}

# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------


def log(msg):
    try:
        print(msg, flush=True)
    except UnicodeEncodeError:
        print(msg.encode("ascii", "replace").decode("ascii"), flush=True)


def extensao(url):
    caminho = urllib.parse.urlsplit(url).path
    nome = caminho.rsplit("/", 1)[-1]
    if "." not in nome:
        return ""
    return nome.rsplit(".", 1)[-1].lower()


def tipo_por_extensao(url):
    e = extensao(url)
    if e in EXT_IMAGEM:
        return "imagem"
    if e in EXT_FLASH:
        return "flash"
    if e in EXT_CSS:
        return "css"
    if e in EXT_JS:
        return "js"
    if e in EXT_MIDIA:
        return "midia"
    if e in EXT_PAGINA:
        return "pagina"
    return "outro"


def nome_arquivo(url):
    caminho = urllib.parse.urlsplit(url).path
    return urllib.parse.unquote(caminho.rsplit("/", 1)[-1], errors="replace").lower()


def ts_para_dt(ts):
    s = re.sub(r"\D", "", str(ts))[:14]
    s = s + "00000101000000"[len(s):]
    try:
        return dt.datetime.strptime(s, "%Y%m%d%H%M%S")
    except ValueError:
        try:
            return dt.datetime(int(s[:4]), 1, 1)
        except ValueError:
            return dt.datetime(1996, 1, 1)


def ts_legivel(ts):
    d = ts_para_dt(ts)
    return d.strftime("%d/%m/%Y %H:%M")


def dias_entre(ts_a, ts_b):
    return abs((ts_para_dt(ts_a) - ts_para_dt(ts_b)).total_seconds()) / 86400.0


def deslocar_ts(ts, anos):
    d = ts_para_dt(ts)
    try:
        d = d.replace(year=d.year + anos)
    except ValueError:  # 29 de fevereiro
        d = d.replace(year=d.year + anos, day=28)
    return d.strftime("%Y%m%d")


def normalizar(texto):
    texto = unicodedata.normalize("NFKD", texto)
    texto = "".join(c for c in texto if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", texto.lower())


def status_ok(statuscode):
    s = (statuscode or "").strip()
    return s == "-" or s.startswith("2") or s.startswith("3")


PADRAO_INDICE = re.compile(r"/(index|default)\.(html?|asp|aspx|php|shtml|jsp|cfm)$")


def chave_url(url, pagina=False):
    """Forma canônica de um endereço (parecida com a do Wayback): sem esquema,
    sem www., minúsculas. Serve para comparar endereços."""
    try:
        p = urllib.parse.urlsplit(url.strip())
        host = (p.hostname or "").lower().rstrip(".")
        porta = p.port
    except ValueError:
        return url.strip().lower()
    host = re.sub(r"^www\d*\.", "", host)
    if porta and porta not in (80, 443):
        host += ":%d" % porta
    caminho = urllib.parse.unquote(p.path or "/", errors="replace").lower()
    caminho = re.sub(r"/{2,}", "/", caminho)
    if pagina:
        caminho = PADRAO_INDICE.sub("/", caminho)
        if len(caminho) > 1:
            caminho = caminho.rstrip("/")
    consulta = ""
    if p.query:
        consulta = "?" + "&".join(sorted(p.query.lower().split("&")))
    return host + caminho + consulta


RE_WAYBACK = re.compile(r"^(?:https?:)?(?://web\.archive\.org)?/web/(\d{1,14})[a-z_]*/(.+)$", re.I)
PREFIXOS_IGNORADOS = ("#", "javascript:", "mailto:", "data:", "about:", "vbscript:",
                      "tel:", "news:", "ftp:", "file:", "mms:", "rtsp:", "pnm:")


def resolver_url(base, valor):
    """Transforma o valor de um atributo em endereço absoluto.
    Retorna (endereco, fragmento) ou (None, None)."""
    v = html.unescape(valor.strip())
    if not v:
        return None, None
    v = v.replace("\\", "/")
    baixo = v.lower()
    if baixo.startswith(PREFIXOS_IGNORADOS) or "<%" in v or "<?" in v or "{{" in v:
        return None, None
    m = RE_WAYBACK.match(v)
    if m:
        v = m.group(2)
        if not re.match(r"^[a-z][a-z0-9+.-]*:", v, re.I):
            v = "http://" + v.lstrip("/")
        v = re.sub(r"^(https?):/(?!/)", r"\1://", v)
    if v.startswith("//"):
        v = "http:" + v
    try:
        absoluto = urllib.parse.urljoin(base, v)
        p = urllib.parse.urlsplit(absoluto)
        if p.scheme not in ("http", "https") or not p.hostname:
            return None, None
    except ValueError:
        return None, None
    return urllib.parse.urlunsplit((p.scheme, p.netloc, p.path or "/", p.query, "")), p.fragment


def detectar_formato(dados):
    if not dados:
        return None
    c = dados[:16]
    if c.startswith((b"GIF87a", b"GIF89a")):
        return "gif"
    if c.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if c.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if c[:3] in (b"FWS", b"CWS", b"ZWS"):
        return "swf"
    if c.startswith((b"\x00\x00\x01\x00", b"\x00\x00\x02\x00")):
        return "ico"
    if c.startswith((b"II*\x00", b"MM\x00*")):
        return "tiff"
    if c.startswith(b"RIFF") and dados[8:12] == b"WEBP":
        return "webp"
    if c.startswith(b"BM") and len(dados) > 26:
        return "bmp"
    if not parece_html(dados) and b"<svg" in dados[:4096].lower():
        return "svg"
    return None


def parece_html(dados):
    inicio = dados[:2048].lstrip().lower()
    return inicio.startswith((b"<!doctype html", b"<html", b"<head", b"<body", b"<title")) \
        or b"<html" in inicio[:400]


def conteudo_valido(esperado, dados):
    if not dados:
        return False
    if esperado == "imagem":
        return detectar_formato(dados) not in (None, "swf")
    if esperado == "flash":
        return detectar_formato(dados) == "swf"
    return not parece_html(dados)


def dimensoes(dados):
    try:
        if dados[:6] in (b"GIF87a", b"GIF89a"):
            return struct.unpack("<HH", dados[6:10])
        if dados[:8] == b"\x89PNG\r\n\x1a\n":
            return struct.unpack(">II", dados[16:24])
        if dados[:2] == b"BM":
            w, h = struct.unpack("<ii", dados[18:26])
            return (w, abs(h))
        if dados[:3] == b"\xff\xd8\xff":
            i = 2
            while i + 9 < len(dados):
                if dados[i] != 0xFF:
                    i += 1
                    continue
                marcador = dados[i + 1]
                if marcador == 0xFF:
                    i += 1
                    continue
                if marcador in (0xD8, 0x01) or 0xD0 <= marcador <= 0xD7:
                    i += 2
                    continue
                tam = struct.unpack(">H", dados[i + 2:i + 4])[0]
                if marcador in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7,
                                0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                    h, w = struct.unpack(">HH", dados[i + 5:i + 9])
                    return (w, h)
                i += 2 + tam
    except struct.error:
        pass
    return None


NOMES_RESERVADOS = {"con", "prn", "aux", "nul"} | {"com%d" % i for i in range(1, 10)} \
    | {"lpt%d" % i for i in range(1, 10)}


def nome_seguro(segmento):
    s = urllib.parse.unquote(segmento, errors="replace")
    s = re.sub(r"""[<>:"'/\\|?*&;$%#\x00-\x1f]""", "_", s).strip(" .")
    if not s:
        s = "_"
    if s.split(".")[0].lower() in NOMES_RESERVADOS:
        s = "_" + s
    if len(s) > 120:
        raiz, ponto, ext = s.rpartition(".")
        h = hashlib.sha1(s.encode("utf-8")).hexdigest()[:8]
        s = (raiz[:100] + "_" + h + ponto + ext) if ponto and len(ext) <= 8 else s[:110] + "_" + h
    return s


def caminho_local(raiz, ts, url, pagina=False, sufixo=""):
    p = urllib.parse.urlsplit(url)
    host = nome_seguro((p.hostname or "sem-host").lower())
    caminho = p.path or "/"
    if caminho.endswith("/"):
        caminho += "index.html"
    segmentos = [s for s in caminho.split("/") if s not in ("", ".", "..")]
    if not segmentos:
        segmentos = ["index.html"]
    pastas = [nome_seguro(s) for s in segmentos[:-1]]
    nome = nome_seguro(segmentos[-1])
    raiz_nome, ponto, ext = nome.rpartition(".")
    if not ponto:
        raiz_nome, ext = nome, ""
    if p.query:
        raiz_nome += "_" + hashlib.sha1(p.query.encode("utf-8")).hexdigest()[:8]
    if sufixo:
        raiz_nome += sufixo
    nome = raiz_nome + ("." + ext if ext else "")
    if pagina and ext.lower() not in ("htm", "html", "shtml", "xhtml"):
        nome += ".html"
    return os.path.join(raiz, ts, host, *(pastas + [nome]))


def caminho_relativo(alvo, pasta_origem):
    rel = os.path.relpath(alvo, pasta_origem).replace(os.sep, "/")
    return urllib.parse.quote(rel, safe="/-_.~()!,+=@")


def escrever(caminho, dados):
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    if os.path.exists(caminho):
        with open(caminho, "rb") as f:
            if f.read() == dados:
                return
    with open(caminho, "wb") as f:
        f.write(dados)


def aplicar_substituicoes(texto, substituicoes):
    partes = []
    pos = 0
    for ini, fim, novo in sorted(substituicoes):
        if ini < pos:
            continue
        partes.append(texto[pos:ini])
        partes.append(novo)
        pos = fim
    partes.append(texto[pos:])
    return "".join(partes)


# ---------------------------------------------------------------------------
# Acesso ao Wayback Machine (com cache em disco e espera entre pedidos)
# ---------------------------------------------------------------------------


class ErroRede(Exception):
    pass


class ClienteWayback:
    espera_minima = 5.0  # segundos antes de repetir um pedido que falhou (dobra a cada tentativa)

    def __init__(self, base, pasta_cache, atraso=1.0, tentativas=6, tempo_limite=90, limite_cdx=5000):
        self.base = base.rstrip("/")
        self.pasta_cache = pasta_cache
        self.atraso = atraso
        self.tentativas = tentativas
        self.tempo_limite = tempo_limite
        self.limite_cdx = limite_cdx
        self._ultimo = 0.0
        self.requisicoes = 0
        self.do_cache = 0
        os.makedirs(pasta_cache, exist_ok=True)
        self.abridor = urllib.request.build_opener()

    def _esperar(self, segundos=None):
        if segundos is not None:
            time.sleep(segundos)
        falta = self.atraso - (time.monotonic() - self._ultimo)
        if falta > 0:
            time.sleep(falta)
        self._ultimo = time.monotonic()

    def _arquivo_cache(self, url):
        h = hashlib.sha1(url.encode("utf-8")).hexdigest()
        return os.path.join(self.pasta_cache, h[:2], h)

    def obter(self, url):
        """Retorna (status, url_final, dados). Guarda em cache respostas 2xx e 4xx."""
        arq = self._arquivo_cache(url)
        if os.path.exists(arq + ".json"):
            try:
                with open(arq + ".json", encoding="utf-8") as f:
                    meta = json.load(f)
                dados = b""
                if os.path.exists(arq + ".bin"):
                    with open(arq + ".bin", "rb") as f:
                        dados = f.read()
                self.do_cache += 1
                return meta["status"], meta["url_final"], dados
            except (OSError, ValueError, KeyError):
                pass
        ultimo_erro = "?"
        for tentativa in range(self.tentativas):
            self._esperar()
            self.requisicoes += 1
            pedido = urllib.request.Request(url, headers={"User-Agent": USER_AGENT,
                                                          "Accept-Encoding": "identity"})
            espera_servidor = 0
            try:
                with self.abridor.open(pedido, timeout=self.tempo_limite) as r:
                    status, final, dados = r.status, r.geturl(), r.read()
            except urllib.error.HTTPError as e:
                status, final = e.code, e.geturl() or url
                try:
                    dados = e.read()
                except Exception:
                    dados = b""
                try:
                    espera_servidor = int((e.headers or {}).get("Retry-After", "0"))
                except (TypeError, ValueError):
                    espera_servidor = 0
            except (urllib.error.URLError, http.client.HTTPException, OSError) as e:
                ultimo_erro = str(e)
                espera = min(300, self.espera_minima * 2 ** tentativa)
                log("   ! falha de rede (%s); tentando de novo em %.0fs" % (ultimo_erro, espera))
                time.sleep(espera)
                continue
            if status == 429 or status >= 500:
                ultimo_erro = "HTTP %d" % status
                espera = min(300, max(espera_servidor, self.espera_minima * 2 ** tentativa))
                log("   ! Wayback respondeu %d; esperando %.0fs" % (status, espera))
                time.sleep(espera)
                continue
            try:
                os.makedirs(os.path.dirname(arq), exist_ok=True)
                if 200 <= status < 300:
                    with open(arq + ".bin", "wb") as f:
                        f.write(dados)
                with open(arq + ".json", "w", encoding="utf-8") as f:
                    json.dump({"status": status, "url_final": final, "url": url}, f)
            except OSError:
                pass
            return status, final, dados
        raise ErroRede("%s (%s)" % (url, ultimo_erro))

    def cdx(self, parametros):
        """Consulta o índice CDX. `parametros` é lista de tuplas (aceita filter repetido)."""
        linhas = []
        retomada = None
        while True:
            p = list(parametros) + [("output", "json"), ("showResumeKey", "true"),
                                    ("limit", str(self.limite_cdx))]
            if retomada:
                p.append(("resumeKey", retomada))
            url = self.base + "/cdx/search/cdx?" + urllib.parse.urlencode(p)
            status, _, dados = self.obter(url)
            if status != 200:
                log("   ! índice CDX respondeu %s para %s" % (status, dict(parametros).get("url")))
                break
            texto = dados.decode("utf-8", "replace").strip()
            if not texto:
                break
            try:
                tabela = json.loads(texto)
            except ValueError:
                log("   ! resposta do CDX não é JSON")
                break
            if not tabela:
                break
            cabecalho, corpo = tabela[0], tabela[1:]
            retomada = None
            if len(corpo) >= 2 and corpo[-2] == [] and len(corpo[-1]) == 1:
                retomada = corpo[-1][0]
                corpo = corpo[:-2]
            while corpo and corpo[-1] == []:
                corpo = corpo[:-1]
            linhas.extend(dict(zip(cabecalho, linha)) for linha in corpo if linha)
            if not retomada:
                break
        return linhas

    def endereco_captura(self, ts, url_original, modo="id_"):
        return "%s/web/%s%s/%s" % (self.base, ts, modo, urllib.parse.quote(
            url_original, safe=":/?&=%#;@+,$!~*'()[]"))

    def baixar_captura(self, ts, url_original):
        status, final, dados = self.obter(self.endereco_captura(ts, url_original))
        m = re.search(r"/web/(\d{4,14})", final or "")
        return status, (m.group(1) if m else ts), dados


# ---------------------------------------------------------------------------
# Leitura do HTML de 2003 (tolerante a HTML malformado)
# ---------------------------------------------------------------------------

RE_TAG = re.compile(r"""<([a-zA-Z][a-zA-Z0-9]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)>""")
RE_ATRIBUTO = re.compile(r"""([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*)))?""")
RE_CSS_URL = re.compile(r"""url\(\s*(?P<q>["']?)(?P<v>[^"')\s]+)(?P=q)\s*\)""", re.I)
RE_CSS_IMPORT = re.compile(r"""@import\s+(?P<q>["'])(?P<v>[^"']+)(?P=q)""", re.I)
RE_JS_PAGINA = re.compile(
    r"""(?:location(?:\.href)?\s*=|location\.(?:replace|assign)\s*\(|window\.open\s*\()\s*"""
    r"""(?P<q>["'])(?P<v>[^"'<>\s]+)(?P=q)""", re.I)
RE_JS_LITERAL = re.compile(
    r"""(?P<q>["'])(?P<v>[^"'<>\s\\]{0,300}\.(?:gif|jpe?g|png|bmp|swf|ico)(?:\?[^"'<>\s]*)?)(?P=q)""",
    re.I)
RE_REFRESH_URL = re.compile(r"""url\s*=\s*['"]?([^'";\s]+)""", re.I)
RE_TITULO = re.compile(r"<title[^>]*>(.*?)</title>", re.I | re.S)
RE_CHARSET = re.compile(rb"""<meta[^>]+charset\s*=\s*["']?([a-zA-Z0-9_\-]+)""", re.I)
RE_ALT = re.compile(r"""\b(?:alt|title)\s*=\s*(?:"([^"]*)"|'([^']*)')""", re.I)


class Ref:
    """Uma referência encontrada no HTML/CSS/JS."""
    __slots__ = ("ini", "fim", "valor", "tipo", "esperado", "absoluto", "fragmento", "res")

    def __init__(self, ini, fim, valor, tipo, esperado):
        self.ini, self.fim, self.valor = ini, fim, valor
        self.tipo = tipo          # recurso | pagina_filha | link | base
        self.esperado = esperado  # imagem | flash | css | js | midia | None
        self.absoluto = self.fragmento = self.res = None


def classificar(tag, attr, atributos):
    """Retorna (tipo, esperado) para o par tag/atributo."""
    if attr == "background":
        return "recurso", "imagem"
    if tag == "base" and attr == "href":
        return "base", None
    if tag in ("img", "image") and attr in ("src", "lowsrc", "dynsrc"):
        return "recurso", "imagem"
    if tag == "input" and attr == "src":
        return "recurso", "imagem"
    if tag == "video" and attr == "poster":
        return "recurso", "imagem"
    if tag in ("embed", "bgsound", "audio", "video", "source") and attr == "src":
        return "recurso", None
    if tag == "object" and attr == "data":
        return "recurso", None
    if tag == "script" and attr == "src":
        return "recurso", "js"
    if tag == "link" and attr == "href":
        rel = (atributos.get("rel") or "").lower()
        if "stylesheet" in rel:
            return "recurso", "css"
        if "icon" in rel:
            return "recurso", "imagem"
        return None, None
    if tag == "param" and attr == "value":
        if (atributos.get("name") or "").lower() in ("movie", "src", "filename", "url", "file"):
            return "recurso", None
        return None, None
    if tag in ("frame", "iframe") and attr == "src":
        return "pagina_filha", None
    if tag == "meta" and attr == "content" and \
            (atributos.get("http-equiv") or "").lower() == "refresh":
        return "refresh", None
    if tag in ("a", "area") and attr == "href":
        return "link", None
    return None, None


def extrair_referencias(texto):
    refs = []
    ocupado = bytearray(len(texto))

    def registrar(ini, fim, valor, tipo, esperado):
        if fim <= ini or any(ocupado[ini:fim]):
            return
        ocupado[ini:fim] = b"\x01" * (fim - ini)
        refs.append(Ref(ini, fim, valor, tipo, esperado))

    for mt in RE_TAG.finditer(texto):
        tag = mt.group(1).lower()
        corpo, desloc = mt.group(2), mt.start(2)
        atributos = []
        for ma in RE_ATRIBUTO.finditer(corpo):
            nome = ma.group(1).lower()
            for g in (2, 3, 4):
                if ma.group(g) is not None:
                    atributos.append((nome, ma.group(g), desloc + ma.start(g), desloc + ma.end(g)))
                    break
        dic = {}
        for nome, valor, _, _ in atributos:
            dic.setdefault(nome, valor)
        for nome, valor, ini, fim in atributos:
            tipo, esperado = classificar(tag, nome, dic)
            if tipo == "refresh":
                m = RE_REFRESH_URL.search(valor)
                if m:
                    registrar(ini + m.start(1), ini + m.end(1), m.group(1), "pagina_filha", None)
            elif tipo:
                registrar(ini, fim, valor, tipo, esperado)

    for regex in (RE_CSS_IMPORT, RE_CSS_URL):
        for m in regex.finditer(texto):
            registrar(m.start("v"), m.end("v"), m.group("v"), "recurso", None)
    for m in RE_JS_PAGINA.finditer(texto):
        registrar(m.start("v"), m.end("v"), m.group("v"), "pagina_filha", None)
    for m in RE_JS_LITERAL.finditer(texto):
        registrar(m.start("v"), m.end("v"), m.group("v"), "recurso", None)
    refs.sort(key=lambda r: r.ini)
    return refs


def decodificar_para_busca(dados):
    m = RE_CHARSET.search(dados[:4096])
    codificacoes = []
    if m:
        codificacoes.append(m.group(1).decode("ascii", "ignore"))
    codificacoes += ["utf-8", "cp1252"]
    for cod in codificacoes:
        try:
            return dados.decode(cod)
        except (LookupError, UnicodeDecodeError):
            continue
    return dados.decode("latin-1")


def texto_visivel(texto):
    t = re.sub(r"(?is)<(script|style)\b.*?</\1\s*>", " ", texto)
    t = re.sub(r"(?s)<!--.*?-->", " ", t)
    t = re.sub(r"<[^>]+>", " ", t)
    return html.unescape(t)


# ---------------------------------------------------------------------------
# Restaurador
# ---------------------------------------------------------------------------


class Resultado:
    __slots__ = ("status", "ts", "original", "local", "dias", "esperado", "sha1", "dims", "nota")

    def __init__(self, status, ts=None, original=None, local=None, dias=None, esperado=None,
                 sha1=None, dims=None, nota=""):
        self.status, self.ts, self.original, self.local = status, ts, original, local
        self.dias, self.esperado, self.sha1, self.dims, self.nota = dias, esperado, sha1, dims, nota


class Pagina:
    def __init__(self, ts, url, origem):
        self.ts, self.url, self.origem = ts, url, origem
        self.local = None
        self.texto = ""
        self.refs = []
        self.titulo = ""
        self.palavras = []   # nome do programa no endereço ou no título (página do programa)
        self.citada = []     # nome do programa só no texto/menu da página
        self.erro = ""


class Restaurador:
    def __init__(self, args, cliente):
        self.a = args
        self.cliente = cliente
        self.saida = args.saida
        self.dir_paginas = os.path.join(self.saida, "paginas")
        self.dir_arquivos = os.path.join(self.saida, "arquivos")
        self.palavras = [p.strip() for p in args.palavras.split(",") if p.strip()]
        self.palavras_norm = [(p, normalizar(p)) for p in self.palavras if normalizar(p)]
        self.indice = None              # chave -> [linhas CDX]
        self.indice_nomes = None        # nome do arquivo -> [linhas CDX]
        self.capturas_url = {}          # chave -> [linhas CDX] (consultas avulsas)
        self.capturas_paginas = defaultdict(list)  # chave de página -> [(ts, original)]
        self.invalidas = set()          # (ts, original) que não são o que esperamos
        self.memo = {}
        self.em_andamento = set()
        self.paginas = []
        self.mapa_paginas = defaultdict(list)  # chave de página -> [Pagina]
        self.salvos = {}                # caminho local -> Resultado (para a galeria)
        self.uso_imagens = defaultdict(set)  # caminho local -> {índices de página}

    # ----- listagem -------------------------------------------------------

    def listar_paginas(self):
        site = self.a.site
        log("Procurando no Wayback as páginas de %s entre %s e %s..." % (
            site, ts_legivel(self.a.de)[:10], ts_legivel(self.a.ate)[:10]))
        linhas = self.cliente.cdx([
            ("url", site), ("matchType", "domain"), ("from", self.a.de), ("to", self.a.ate),
            ("fl", "timestamp,original,mimetype,statuscode,digest"),
            ("filter", "statuscode:200"), ("collapse", "digest")])
        paginas = []
        for l in linhas:
            mime = (l.get("mimetype") or "").lower()
            original = l.get("original") or ""
            eh_html = mime.startswith(("text/html", "application/xhtml"))
            if not eh_html and not (mime in ("unk", "-", "") and tipo_por_extensao(original) == "pagina"):
                continue
            if self.a.filtro_url and not re.search(self.a.filtro_url, original, re.I):
                continue
            paginas.append((l["timestamp"], original))
        for url in self.a.url or []:
            cap = self.captura_mais_proxima_pagina(url, self.a.de, preferir_intervalo=True)
            if cap:
                paginas.append(cap)
            else:
                log("   ! %s não tem nenhuma captura no Wayback" % url)
        if self.a.versoes != "todas":
            grupos = defaultdict(list)
            for ts, url in paginas:
                grupos[chave_url(url, True)].append((ts, url))
            escolha = min if self.a.versoes == "primeira" else max
            paginas = [escolha(g) for g in grupos.values()]
        paginas = sorted(set(paginas))
        for ts, url in paginas:
            self.capturas_paginas[chave_url(url, True)].append((ts, url))
        log("   %d capturas de página encontradas." % len(paginas))
        return paginas

    def construir_indice(self):
        self.indice = defaultdict(list)
        self.indice_nomes = defaultdict(list)
        if self.a.sem_indice:
            return
        de = self.a.indice_de or deslocar_ts(self.a.de, -2)
        ate = self.a.indice_ate or deslocar_ts(self.a.ate, 3)
        for dominio in [self.a.site] + self.a.hosts_extras:
            log("Montando o índice de imagens arquivadas de %s (%s a %s)..." % (dominio, de[:4], ate[:4]))
            linhas = self.cliente.cdx([
                ("url", dominio), ("matchType", "domain"), ("from", de), ("to", ate),
                ("fl", "timestamp,original,mimetype,statuscode,digest"),
                ("filter", "!mimetype:text/html"), ("collapse", "digest")])
            n = 0
            for l in linhas:
                if not status_ok(l.get("statuscode")):
                    continue
                original = l.get("original") or ""
                mime = (l.get("mimetype") or "").lower()
                if tipo_por_extensao(original) not in TIPOS_RECURSO and not \
                        mime.startswith(("image/", "application/x-shockwave-flash")):
                    continue
                self.indice[chave_url(original)].append(l)
                self.indice_nomes[nome_arquivo(original)].append(l)
                n += 1
            log("   %d capturas de imagens/arquivos no índice." % n)

    # ----- capturas -------------------------------------------------------

    def capturas_de(self, url):
        ch = chave_url(url)
        if self.indice and ch in self.indice:
            return self.indice[ch]
        return self.capturas_avulsas(url)

    def capturas_avulsas(self, url):
        """Todas as capturas deste endereço, de qualquer data (consulta própria ao CDX)."""
        ch = chave_url(url)
        if ch not in self.capturas_url:
            try:
                linhas = self.cliente.cdx([("url", url), ("fl", "timestamp,original,mimetype,statuscode,digest")])
            except ErroRede as e:
                log("   ! %s" % e)
                return []
            self.capturas_url[ch] = [l for l in linhas if status_ok(l.get("statuscode"))]
        return self.capturas_url[ch]

    def captura_mais_proxima_pagina(self, url, ts, preferir_intervalo=False):
        ch = chave_url(url, True)
        candidatas = list(self.capturas_paginas.get(ch, []))
        if not candidatas:
            for l in self.capturas_de(url):
                mime = (l.get("mimetype") or "").lower()
                if l.get("statuscode", "").startswith("2") and \
                        (mime.startswith("text/html") or mime in ("unk", "-", "")):
                    candidatas.append((l["timestamp"], l["original"]))
        if not candidatas:
            return None
        if preferir_intervalo:
            dentro = [c for c in candidatas if self.a.de <= c[0][:8] <= self.a.ate]
            candidatas = dentro or candidatas
        return min(candidatas, key=lambda c: dias_entre(c[0], ts))

    def capturas_mesmo_nome(self, url):
        """Mesma imagem arquivada em outra pasta/endereço."""
        if not self.indice_nomes or urllib.parse.urlsplit(url).query:
            return [], False
        nome = nome_arquivo(url)
        if len(nome) < 3 or tipo_por_extensao(url) not in TIPOS_RECURSO:
            return [], False
        ch = chave_url(url)
        alvo = [s for s in chave_url(url).split("?")[0].split("/")[1:]]
        candidatas = [l for l in self.indice_nomes.get(nome, []) if chave_url(l["original"]) != ch]
        if not candidatas:
            return [], False

        def sufixo_comum(l):
            segs = chave_url(l["original"]).split("?")[0].split("/")[1:]
            n = 0
            for a, b in zip(reversed(segs), reversed(alvo)):
                if a != b:
                    break
                n += 1
            return n

        melhor = max(sufixo_comum(l) for l in candidatas)
        escolhidas = [l for l in candidatas if sufixo_comum(l) == melhor]
        caminhos = {chave_url(l["original"]) for l in escolhidas}
        digests = {l.get("digest") for l in escolhidas}
        incerto = len(caminhos) > 1 and len(digests) > 1
        return escolhidas, incerto

    # ----- recursos (imagens, css, js, flash) ----------------------------

    def resolver_recurso(self, url, ts_pagina, esperado, contexto, prof=0):
        if esperado is None:
            t = tipo_por_extensao(url)
            esperado = t if t in TIPOS_RECURSO else "desconhecido"
        chave = (chave_url(url), ts_pagina[:8], esperado,
                 contexto.get("pasta_pagina") if esperado == "js" else None)
        if chave in self.memo:
            return self.memo[chave]
        if chave in self.em_andamento or prof > 4:
            return Resultado("nao-arquivado", esperado=esperado, nota="referência circular")
        self.em_andamento.add(chave)
        try:
            res = self._tentar(self.capturas_de(url), url, ts_pagina, esperado, contexto, prof, "restaurado")
            if res is None and self.indice and chave[0] in self.indice:
                # as capturas da janela do índice falharam: tenta as de qualquer data
                res = self._tentar(self.capturas_avulsas(url), url, ts_pagina, esperado, contexto, prof,
                                   "restaurado")
            if res is None:
                alternativas, incerto = self.capturas_mesmo_nome(url)
                status = "caminho-alternativo-verificar" if incerto else "caminho-alternativo"
                res = self._tentar(alternativas, url, ts_pagina, esperado, contexto, prof, status)
            if res is None:
                res = Resultado("nao-arquivado", esperado=esperado)
        finally:
            self.em_andamento.discard(chave)
        self.memo[chave] = res
        return res

    def _tentar(self, capturas, url, ts_pagina, esperado, contexto, prof, status_ok_):
        if not capturas:
            return None
        boas = [c for c in capturas if not (c.get("statuscode") or "").startswith("3")]
        redirecionadas = [c for c in capturas if (c.get("statuscode") or "").startswith("3")]
        perto = lambda c: dias_entre(c["timestamp"], ts_pagina)
        ordem = sorted(boas, key=perto) + sorted(redirecionadas, key=perto)
        tentativas = 0
        digests_ruins = set()
        for c in ordem:
            if tentativas >= self.a.tentativas_por_recurso:
                break
            id_cap = (c["timestamp"], c["original"])
            if id_cap in self.invalidas or (c.get("digest") and c.get("digest") in digests_ruins):
                continue
            tentativas += 1
            try:
                status, ts_real, dados = self.cliente.baixar_captura(c["timestamp"], c["original"])
            except ErroRede as e:
                log("   ! %s" % e)
                continue
            if status == 200 and conteudo_valido(esperado, dados):
                local = self._salvar(ts_real, c["original"], dados, esperado, ts_pagina, contexto, prof)
                return Resultado(status_ok_, ts=ts_real, original=c["original"], local=local,
                                 dias=round(dias_entre(ts_real, ts_pagina), 1), esperado=esperado,
                                 sha1=hashlib.sha1(dados).hexdigest(), dims=dimensoes(dados))
            self.invalidas.add(id_cap)
            if c.get("digest"):
                digests_ruins.add(c.get("digest"))
        return None

    def _salvar(self, ts, original, dados, esperado, ts_pagina, contexto, prof):
        if esperado == "css":
            local = caminho_local(self.dir_arquivos, ts, original)
            texto = dados.decode("latin-1")
            texto = self._reescrever_css(texto, original, local, ts_pagina, contexto, prof)
            dados = texto.encode("latin-1")
        elif esperado == "js":
            texto = dados.decode("latin-1")
            reps = []
            pasta_pagina = contexto["pasta_pagina"]
            for m in RE_JS_LITERAL.finditer(texto):
                absoluto, _ = resolver_url(contexto["base_pagina"], m.group("v"))
                if not absoluto:
                    continue
                res = self.resolver_recurso(absoluto, ts_pagina, None, contexto, prof + 1)
                self._registrar_uso(res, contexto)
                reps.append((m.start("v"), m.end("v"), self._destino_recurso(res, absoluto, ts_pagina, pasta_pagina)))
            sufixo = ""
            if reps:  # caminhos dentro do .js são relativos à PÁGINA que o usa
                sufixo = "__" + hashlib.sha1(pasta_pagina.encode("utf-8")).hexdigest()[:8]
            local = caminho_local(self.dir_arquivos, ts, original, sufixo=sufixo)
            dados = aplicar_substituicoes(texto, reps).encode("latin-1")
        else:
            local = caminho_local(self.dir_arquivos, ts, original)
        escrever(local, dados)
        return local

    def _reescrever_css(self, texto, url_css, local_css, ts_pagina, contexto, prof):
        reps = []
        vistos = set()
        for regex in (RE_CSS_IMPORT, RE_CSS_URL):
            for m in regex.finditer(texto):
                if m.start("v") in vistos:
                    continue
                vistos.add(m.start("v"))
                absoluto, _ = resolver_url(url_css, m.group("v"))
                if not absoluto:
                    continue
                t = tipo_por_extensao(absoluto)
                esperado = t if t in TIPOS_RECURSO else "imagem"
                res = self.resolver_recurso(absoluto, ts_pagina, esperado, contexto, prof + 1)
                self._registrar_uso(res, contexto)
                reps.append((m.start("v"), m.end("v"),
                             self._destino_recurso(res, absoluto, ts_pagina, os.path.dirname(local_css))))
        return aplicar_substituicoes(texto, reps)

    def _registrar_uso(self, res, contexto):
        if res.local and res.esperado == "imagem":
            self.salvos[res.local] = res
            if contexto.get("indice_pagina") is not None:
                self.uso_imagens[res.local].add(contexto["indice_pagina"])

    @staticmethod
    def _destino_recurso(res, absoluto, ts_pagina, pasta_origem):
        if res.local:
            return caminho_relativo(res.local, pasta_origem)
        return "%s/web/%sim_/%s" % (WAYBACK_PUBLICO, ts_pagina, absoluto)

    # ----- páginas --------------------------------------------------------

    def baixar_pagina(self, ts, url, origem):
        pag = Pagina(ts, url, origem)
        try:
            status, ts_real, dados = self.cliente.baixar_captura(ts, url)
        except ErroRede as e:
            pag.erro = str(e)
            log("   ! %s" % e)
            return None
        if status != 200 or not dados:
            log("   ! não foi possível baixar %s (%s): HTTP %s" % (url, ts, status))
            return None
        pag.ts = ts_real
        pag.texto = dados.decode("latin-1")  # sem perdas: devolve os mesmos bytes
        pag.local = caminho_local(self.dir_paginas, ts_real, url, pagina=True)
        indice_pagina = len(self.paginas)
        self.paginas.append(pag)
        self.mapa_paginas[chave_url(url, True)].append(pag)

        refs = extrair_referencias(pag.texto)
        base = url
        for r in refs:
            if r.tipo == "base":
                b, _ = resolver_url(url, r.valor)
                base = b or base
        contexto = {"base_pagina": base, "pasta_pagina": os.path.dirname(pag.local),
                    "indice_pagina": indice_pagina}

        legivel = decodificar_para_busca(dados)
        m = RE_TITULO.search(legivel)
        pag.titulo = re.sub(r"\s+", " ", html.unescape(m.group(1))).strip() if m else ""
        partes = [urllib.parse.unquote(url, errors="replace"), pag.titulo, texto_visivel(legivel)]
        partes += [a or b for a, b in RE_ALT.findall(legivel)]

        filhas = []
        recursos = 0
        for r in refs:
            pag.refs.append(r)
            if r.tipo == "base":
                continue
            r.absoluto, r.fragmento = resolver_url(base, r.valor)
            if not r.absoluto:
                continue
            tipo_ext = tipo_por_extensao(r.absoluto)
            if r.tipo in ("link", "pagina_filha") and tipo_ext in ("imagem", "flash", "midia"):
                r.tipo, r.esperado = "recurso", tipo_ext
            if r.tipo == "recurso":
                partes.append(r.absoluto)
                r.res = self.resolver_recurso(r.absoluto, pag.ts, r.esperado, contexto)
                self._registrar_uso(r.res, contexto)
                recursos += 1
            elif r.tipo == "pagina_filha":
                filhas.append(r.absoluto)

        fortes = [normalizar(p) for p in partes[:2] if p]   # endereço e título
        normalizadas = [normalizar(p) for p in partes if p]
        for original, norm in self.palavras_norm:
            if any(norm in n for n in fortes):
                pag.palavras.append(original)
            elif any(norm in n for n in normalizadas):
                pag.citada.append(original)
        ok = sum(1 for r in pag.refs if r.res and r.res.local)
        log("   [%s] %s — %d/%d recursos%s" % (
            ts_legivel(pag.ts), url, ok, recursos,
            ("  ★ " + ", ".join(pag.palavras)) if pag.palavras else ""))
        return filhas

    def executar(self):
        capturas = self.listar_paginas()
        if self.a.apenas_listar:
            self.gerar_lista(capturas)
            return
        self.construir_indice()
        log("Baixando páginas e restaurando imagens...")
        fila = deque((ts, url, "listagem") for ts, url in capturas)
        vistos = set()
        while fila:
            ts, url, origem = fila.popleft()
            k = (chave_url(url, True), ts)
            if k in vistos:
                continue
            vistos.add(k)
            if self.a.max_paginas and len(self.paginas) >= self.a.max_paginas:
                log("   limite de %d páginas atingido." % self.a.max_paginas)
                break
            filhas = self.baixar_pagina(ts, url, origem)
            for filha in filhas or []:
                cap = self.captura_mais_proxima_pagina(filha, ts)
                if cap and (chave_url(cap[1], True), cap[0]) not in vistos:
                    fila.append((cap[0], cap[1], "quadro/redirecionamento"))
        self.reescrever_paginas()
        self.gerar_relatorios()

    def pagina_local_mais_proxima(self, url, ts):
        candidatas = self.mapa_paginas.get(chave_url(url, True))
        if not candidatas:
            return None
        return min(candidatas, key=lambda p: dias_entre(p.ts, ts))

    def reescrever_paginas(self):
        log("Reescrevendo os caminhos das imagens nas páginas...")
        for pag in self.paginas:
            pasta = os.path.dirname(pag.local)
            reps = []
            for r in pag.refs:
                if r.tipo == "base":
                    reps.append((r.ini, r.fim, "./"))
                    continue
                if not r.absoluto:
                    continue
                if r.tipo == "recurso":
                    novo = self._destino_recurso(r.res, r.absoluto, pag.ts, pasta)
                else:
                    alvo = self.pagina_local_mais_proxima(r.absoluto, pag.ts)
                    if alvo:
                        novo = caminho_relativo(alvo.local, pasta)
                    else:
                        novo = "%s/web/%s/%s" % (WAYBACK_PUBLICO, pag.ts, r.absoluto)
                    if r.fragmento:
                        novo += "#" + urllib.parse.quote(r.fragmento, safe="-_.~")
                reps.append((r.ini, r.fim, novo))
            ok = sum(1 for r in pag.refs if r.tipo == "recurso" and r.res and r.res.local)
            falta = sum(1 for r in pag.refs if r.tipo == "recurso" and r.res and not r.res.local)
            comentario = ("\n<!-- [restaurar_wayback %s] captura %s de %s | recursos restaurados: %d, "
                          "nao arquivados: %d -->\n" % (VERSAO, pag.ts, pag.url, ok, falta))
            novo_texto = aplicar_substituicoes(pag.texto, reps) + comentario
            escrever(pag.local, novo_texto.encode("latin-1", "replace"))

    # ----- relatórios -----------------------------------------------------

    def gerar_lista(self, capturas):
        os.makedirs(self.saida, exist_ok=True)
        caminho = os.path.join(self.saida, "lista_capturas.csv")
        with open(caminho, "w", newline="", encoding="utf-8-sig") as f:
            w = csv.writer(f, delimiter=";")
            w.writerow(["data", "timestamp", "endereco", "palavras_no_endereco", "wayback"])
            for ts, url in capturas:
                norm = normalizar(urllib.parse.unquote(url))
                achadas = [p for p, n in self.palavras_norm if n in norm]
                w.writerow([ts_legivel(ts), ts, url, ", ".join(achadas), "%s/web/%s/%s" % (WAYBACK_PUBLICO, ts, url)])
                log("   %s  %s%s" % (ts_legivel(ts), url, ("  ★ " + ", ".join(achadas)) if achadas else ""))
        log("Lista salva em %s" % caminho)

    def gerar_relatorios(self):
        os.makedirs(self.saida, exist_ok=True)
        linhas = []
        faltando = defaultdict(set)
        for pag in self.paginas:
            vistos = set()
            for r in pag.refs:
                if r.tipo != "recurso" or not r.res or r.absoluto in vistos:
                    continue
                vistos.add(r.absoluto)
                res = r.res
                linhas.append([pag.ts, pag.url, r.absoluto, res.esperado, res.status, res.ts or "",
                               res.original or "", "" if res.dias is None else res.dias,
                               os.path.relpath(res.local, self.saida) if res.local else ""])
                if not res.local:
                    faltando[r.absoluto].add(pag.url)
        with open(os.path.join(self.saida, "relatorio_recursos.csv"), "w", newline="", encoding="utf-8-sig") as f:
            w = csv.writer(f, delimiter=";")
            w.writerow(["pagina_timestamp", "pagina", "recurso", "tipo", "situacao", "captura_timestamp",
                        "captura_endereco", "distancia_dias", "arquivo_local"])
            w.writerows(linhas)
        with open(os.path.join(self.saida, "faltando.txt"), "w", encoding="utf-8") as f:
            f.write("# Arquivos que não existem em nenhuma captura do Wayback (não dá para restaurar)\n")
            for url in sorted(faltando):
                f.write("%s\n    usado em: %s\n" % (url, ", ".join(sorted(faltando[url]))))

        total = len(linhas)
        mesma = sum(1 for l in linhas if l[4] == "restaurado" and l[7] != "" and l[7] <= 31)
        outra = sum(1 for l in linhas if l[4] == "restaurado" and l[7] != "" and l[7] > 31)
        alternativo = sum(1 for l in linhas if l[4].startswith("caminho-alternativo"))
        nao = sum(1 for l in linhas if l[4] == "nao-arquivado")
        resumo = {"paginas": len(self.paginas), "total": total, "mesma": mesma, "outra": outra,
                  "alternativo": alternativo, "nao": nao}
        self._gerar_indice_html(resumo, faltando)
        self._gerar_galeria_html()
        log("")
        log("Pronto! %d páginas | %d referências a imagens/arquivos:" % (len(self.paginas), total))
        log("   %d restauradas da mesma época (até 31 dias)" % mesma)
        log("   %d restauradas de outra data (mais de 31 dias de diferença)" % outra)
        log("   %d achadas em outro caminho" % alternativo)
        log("   %d não existem em nenhuma captura" % nao)
        log("Abra %s no navegador." % os.path.join(self.saida, "index.html"))
        log("Pedidos ao Wayback: %d (mais %d do cache)" % (self.cliente.requisicoes, self.cliente.do_cache))

    def _contagem(self, pag):
        rs = [r.res for r in pag.refs if r.tipo == "recurso" and r.res]
        return sum(1 for r in rs if r.local), len(rs)

    def _gerar_indice_html(self, resumo, faltando):
        e = html.escape
        linhas_prog = []
        for palavra in self.palavras:
            achadas = [p for p in self.paginas if palavra in p.palavras]
            citadas = [p for p in self.paginas if palavra in p.citada]

            def lista(pags):
                return "<ul>%s</ul>" % "".join(
                    '<li><a href="%s">%s</a> <span class="data">%s</span> <span class="url">%s</span></li>' % (
                        e(caminho_relativo(p.local, self.saida)), e(p.titulo or p.url), e(ts_legivel(p.ts)),
                        e(p.url)) for p in sorted(pags, key=lambda p: p.ts))

            corpo = lista(achadas) if achadas else \
                '<p class="vazio">Nenhuma página com esse nome no endereço ou no título.</p>'
            if citadas:
                corpo += '<details><summary>Citado no texto de mais %d página(s)</summary>%s</details>' % (
                    len(citadas), lista(citadas))
            linhas_prog.append('<section class="prog"><h3>%s <small>%d página(s)</small></h3>%s</section>' % (
                e(palavra), len(achadas), corpo))
        linhas_tab = []
        for p in sorted(self.paginas, key=lambda p: (p.ts, p.url)):
            ok, tot = self._contagem(p)
            selos = "".join('<span class="selo">%s</span>' % e(x) for x in p.palavras)
            linhas_tab.append(
                '<tr><td class="data">%s</td><td><a href="%s">%s</a> %s<div class="url">%s</div></td>'
                '<td class="num">%d/%d</td><td><a href="%s/web/%s/%s" rel="noopener">Wayback</a></td></tr>' % (
                    e(ts_legivel(p.ts)), e(caminho_relativo(p.local, self.saida)), e(p.titulo or "(sem título)"),
                    selos, e(p.url), ok, tot, WAYBACK_PUBLICO, e(p.ts), e(p.url)))
        itens_falta = "".join('<li class="url">%s</li>' % e(u) for u in sorted(faltando)[:500])
        doc = MODELO_INDICE.format(
            site=e(self.a.site), de=e(ts_legivel(self.a.de)[:10]), ate=e(ts_legivel(self.a.ate)[:10]),
            paginas=resumo["paginas"], mesma=resumo["mesma"], outra=resumo["outra"],
            alternativo=resumo["alternativo"], nao=resumo["nao"], programas="".join(linhas_prog),
            tabela="".join(linhas_tab), faltando=itens_falta or "<li>Nenhum.</li>",
            n_faltando=len(faltando), estilo=ESTILO, gerado=dt.datetime.now().strftime("%d/%m/%Y %H:%M"))
        escrever(os.path.join(self.saida, "index.html"), doc.encode("utf-8"))

    def _gerar_galeria_html(self):
        e = html.escape
        por_hash = {}
        for local, res in self.salvos.items():
            if res.dims and res.dims[0] * res.dims[1] < 100 and not self.a.galeria_tudo:
                continue  # espaçadores 1x1 e afins
            atual = por_hash.get(res.sha1)
            if atual is None or res.ts < atual[1].ts:
                por_hash[res.sha1] = (local, res, set())
            por_hash[res.sha1][2].update(self.uso_imagens.get(local, set()))
        grupos = defaultdict(list)
        for local, res, usos in por_hash.values():
            achou = False
            norm_url = normalizar(res.original or "")
            for palavra, norm in self.palavras_norm:
                # imagens próprias do programa: o nome está no endereço da imagem, ou ela só aparece
                # em páginas do programa (logotipo e botões do menu, usados em todo o site, ficam fora)
                if norm in norm_url or (usos and all(palavra in self.paginas[i].palavras for i in usos)):
                    grupos[palavra].append((local, res, usos))
                    achou = True
            if not achou:
                grupos["Outras imagens do site"].append((local, res, usos))
        secoes = []
        for nome in self.palavras + ["Outras imagens do site"]:
            itens = sorted(grupos.get(nome, []), key=lambda x: x[1].ts)
            if not itens:
                continue
            cartoes = "".join(
                '<figure><a href="{src}"><img loading="lazy" src="{src}" alt=""></a>'
                '<figcaption><span class="url">{orig}</span><br>captura {data}{dims}</figcaption></figure>'.format(
                    src=e(caminho_relativo(local, self.saida)), orig=e(res.original or ""),
                    data=e(ts_legivel(res.ts)), dims=(" · %dx%d" % tuple(res.dims)) if res.dims else "")
                for local, res, _ in itens)
            secoes.append('<section><h2>%s <small>%d</small></h2><div class="grade">%s</div></section>' % (
                e(nome), len(itens), cartoes))
        doc = MODELO_GALERIA.format(site=e(self.a.site), estilo=ESTILO,
                                    secoes="".join(secoes) or "<p>Nenhuma imagem restaurada.</p>")
        escrever(os.path.join(self.saida, "galeria.html"), doc.encode("utf-8"))


ESTILO = """
:root{--fundo:#f6f6f4;--cartao:#fff;--texto:#1d1d1b;--suave:#686862;--borda:#deded8;--destaque:#0b5cad;--selo:#fde7b0}
@media (prefers-color-scheme: dark){:root{--fundo:#161615;--cartao:#20201e;--texto:#ecece8;--suave:#a3a39c;--borda:#383834;--destaque:#7db4ff;--selo:#5c4a14}}
*{box-sizing:border-box}body{margin:0;background:var(--fundo);color:var(--texto);font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:1100px;margin:0 auto;padding:24px 16px 64px}h1{font-size:1.6rem;margin:0 0 4px}h2{margin-top:2rem}
a{color:var(--destaque)}small,.data,.url{color:var(--suave)}.url{font-size:.82rem;word-break:break-all}
.resumo{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:18px 0}
.resumo div{background:var(--cartao);border:1px solid var(--borda);border-radius:8px;padding:10px 12px}
.resumo b{display:block;font-size:1.5rem}.prog{background:var(--cartao);border:1px solid var(--borda);border-radius:8px;padding:4px 14px;margin:10px 0}
.prog li{margin:4px 0}details{margin:0 0 12px}summary{cursor:pointer;color:var(--suave)}.vazio{color:var(--suave)}.selo{background:var(--selo);border-radius:4px;padding:0 6px;font-size:.78rem}
table{width:100%;border-collapse:collapse;background:var(--cartao);border:1px solid var(--borda)}
td,th{padding:6px 8px;border-bottom:1px solid var(--borda);vertical-align:top;text-align:left}td.num{white-space:nowrap}
td.data{white-space:nowrap;font-size:.85rem}.tabela{overflow-x:auto}
.grade{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}
figure{margin:0;background:var(--cartao);border:1px solid var(--borda);border-radius:8px;padding:8px}
figure img{display:block;max-width:100%;max-height:180px;margin:0 auto;image-rendering:auto}
figcaption{font-size:.78rem;margin-top:6px;color:var(--suave)}
"""

MODELO_INDICE = """<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Acervo {site}</title><style>{estilo}</style></head><body><main>
<h1>{site}: páginas restauradas</h1>
<div class="data">Capturas do Wayback Machine de {de} a {ate} · gerado em {gerado}</div>
<div class="resumo">
<div><b>{paginas}</b>páginas</div>
<div><b>{mesma}</b>imagens da mesma época</div>
<div><b>{outra}</b>imagens de outra data</div>
<div><b>{alternativo}</b>achadas em outro caminho</div>
<div><b>{nao}</b>não arquivadas</div>
</div>
<p><a href="galeria.html">Abrir a galeria de imagens restauradas</a> ·
<a href="relatorio_recursos.csv">relatório completo (CSV)</a> · <a href="faltando.txt">lista do que não foi arquivado</a></p>
<h2>Programas procurados</h2>{programas}
<h2>Todas as páginas</h2>
<div class="tabela"><table><thead><tr><th>Captura</th><th>Página</th><th>Imagens</th><th></th></tr></thead>
<tbody>{tabela}</tbody></table></div>
<h2>Não arquivados <small>{n_faltando}</small></h2>
<p class="vazio">Estes arquivos não existem em nenhuma captura do Wayback. Nas páginas eles continuam apontando para o Wayback.</p>
<ul>{faltando}</ul>
</main></body></html>
"""

MODELO_GALERIA = """<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Galeria {site}</title><style>{estilo}</style></head><body><main>
<h1>Galeria de imagens restauradas</h1>
<p><a href="index.html">Voltar ao índice</a></p>
{secoes}
</main></body></html>
"""


# ---------------------------------------------------------------------------
# Linha de comando
# ---------------------------------------------------------------------------


def data_valida(texto):
    s = re.sub(r"\D", "", texto)
    if len(s) not in (4, 6, 8, 10, 12, 14):
        raise argparse.ArgumentTypeError("use AAAAMMDD, por exemplo 20031220")
    return s


def completar_data(s, fim):
    """2005 -> 20050101 (início) ou 20051231 (fim)."""
    if len(s) >= 8:
        return s
    return s + ("1231" if fim else "0101")[len(s) - 4:]


def montar_argumentos(argv=None):
    p = argparse.ArgumentParser(
        description="Baixa um site antigo do Wayback Machine e conserta as imagens quebradas (404).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Exemplo:\n  python3 restaurar_wayback.py --site vanguarda.tv --de 20031220 --ate 20050205")
    p.add_argument("--site", required=True, help="domínio, ex.: vanguarda.tv (inclui www. e subdomínios)")
    p.add_argument("--de", type=data_valida, required=True, help="data inicial AAAAMMDD")
    p.add_argument("--ate", type=data_valida, required=True, help="data final AAAAMMDD")
    p.add_argument("--saida", help="pasta de saída (padrão: restaurado_<site>_<de>_<ate>)")
    p.add_argument("--palavras", default="Repórter,Vanguarda News,Agito",
                   help="nomes de programas para destacar, separados por vírgula")
    p.add_argument("--filtro-url", help="só páginas cujo endereço casa com esta expressão regular")
    p.add_argument("--url", action="append", help="endereço extra para incluir (pode repetir)")
    p.add_argument("--versoes", choices=("todas", "primeira", "ultima"), default="todas",
                   help="todas as versões diferentes de cada página (padrão) ou só uma")
    p.add_argument("--max-paginas", type=int, default=0, help="limite de páginas (0 = sem limite)")
    p.add_argument("--hosts-extras", default="",
                   help="outros domínios onde procurar imagens perdidas, separados por vírgula")
    p.add_argument("--indice-de", type=data_valida, help="início do índice de imagens (padrão: 2 anos antes)")
    p.add_argument("--indice-ate", type=data_valida, help="fim do índice de imagens (padrão: 3 anos depois)")
    p.add_argument("--sem-indice", action="store_true", help="não montar o índice do domínio (mais pedidos)")
    p.add_argument("--tentativas-por-recurso", type=int, default=5)
    p.add_argument("--atraso", type=float, default=1.0, help="segundos entre pedidos ao Wayback (padrão 1)")
    p.add_argument("--apenas-listar", action="store_true", help="só listar as capturas, sem baixar")
    p.add_argument("--galeria-tudo", action="store_true", help="incluir espaçadores 1x1 na galeria")
    p.add_argument("--wayback", default=WAYBACK_PUBLICO, help=argparse.SUPPRESS)
    a = p.parse_args(argv)
    a.site = re.sub(r"^(https?://)?(www\.)?", "", a.site.strip().lower()).strip("/")
    a.de, a.ate = completar_data(a.de, False), completar_data(a.ate, True)
    a.hosts_extras = [h.strip() for h in a.hosts_extras.split(",") if h.strip()]
    if a.de > a.ate:
        p.error("--de precisa ser antes de --ate")
    if not a.saida:
        a.saida = "restaurado_%s_%s_%s" % (re.sub(r"[^\w.-]", "_", a.site), a.de[:8], a.ate[:8])
    return a


def main(argv=None):
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(errors="replace")
        except Exception:
            pass
    a = montar_argumentos(argv)
    cliente = ClienteWayback(a.wayback, os.path.join(a.saida, ".cache"), atraso=a.atraso)
    restaurador = Restaurador(a, cliente)
    try:
        restaurador.executar()
    except ErroRede as e:
        log("\nO Wayback não respondeu: %s" % e)
        log("Rode o mesmo comando de novo: o que já foi baixado está em cache e não será pedido outra vez.")
        return 2
    except KeyboardInterrupt:
        log("\nInterrompido. Rode de novo para continuar (o cache é reaproveitado).")
        return 130
    return 0


if __name__ == "__main__":
    sys.exit(main())
