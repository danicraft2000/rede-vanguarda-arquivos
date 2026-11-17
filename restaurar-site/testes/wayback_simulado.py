# -*- coding: utf-8 -*-
"""Servidor local que imita o Wayback Machine (índice CDX + capturas id_),
para testar o restaurar_wayback.py sem acesso à internet.
Os dados usados nos testes são fictícios (domínio tv-exemplo.test)."""

import base64
import hashlib
import json
import re
import threading
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


def canonico(url):
    url = urllib.parse.unquote(url.strip()).lower()
    url = re.sub(r"^[a-z]+://", "", url)
    url = re.sub(r"^www\d*\.", "", url)
    url = url.split("#")[0]
    if "/" not in url:
        url += "/"
    return url


def digest(dados):
    return base64.b32encode(hashlib.sha1(dados).digest()).decode("ascii")


class WaybackSimulado:
    def __init__(self, capturas, falhas_429=0):
        """capturas: lista de dicts {ts, url, corpo(bytes), status=200, mime, location}."""
        self.capturas = []
        for c in capturas:
            c = dict(c)
            c.setdefault("status", 200)
            c.setdefault("mime", "text/html")
            c["chave"] = canonico(c["url"])
            c["digest"] = digest(c["corpo"]) if c["status"] == 200 else "3I42H3S6NNFQ2MSVX7XZKYAYSCX5QBYJ"
            self.capturas.append(c)
        self.falhas_429 = falhas_429
        self.pedidos = []
        self.servidor = None

    # ------------------------------------------------------------------
    def iniciar(self):
        sim = self

        class Tratador(BaseHTTPRequestHandler):
            def log_message(self, *a):
                pass

            def do_GET(self):
                sim.pedidos.append(self.path)
                if sim.falhas_429 > 0:
                    sim.falhas_429 -= 1
                    self.send_response(429)
                    self.send_header("Retry-After", "0")
                    self.end_headers()
                    return
                if self.path.startswith("/cdx/search/cdx"):
                    return sim._cdx(self)
                m = re.match(r"^/web/(\d{1,14})([a-z]{2}_)?/(.*)$", self.path)
                if m:
                    return sim._captura(self, m.group(1), m.group(2) or "", m.group(3))
                self.send_response(404)
                self.end_headers()

        self.servidor = ThreadingHTTPServer(("127.0.0.1", 0), Tratador)
        threading.Thread(target=self.servidor.serve_forever, daemon=True).start()
        return "http://127.0.0.1:%d" % self.servidor.server_address[1]

    def parar(self):
        if self.servidor:
            self.servidor.shutdown()
            self.servidor.server_close()

    # ------------------------------------------------------------------
    def _cdx(self, h):
        q = urllib.parse.parse_qsl(urllib.parse.urlsplit(h.path).query, keep_blank_values=True)
        params = {}
        filtros = []
        for k, v in q:
            if k == "filter":
                filtros.append(v)
            else:
                params[k] = v
        alvo = canonico(params["url"])
        modo = params.get("matchType", "exact")
        de = params.get("from", "")
        ate = params.get("to", "")
        de = de + "0" * (14 - len(de))
        ate = ate + "9" * (14 - len(ate))
        linhas = []
        for c in self.capturas:
            if modo == "exact" and c["chave"] != alvo:
                continue
            if modo == "domain":
                dominio = alvo.rstrip("/")
                host = c["chave"].split("/")[0]
                if host != dominio and not host.endswith("." + dominio):
                    continue
            if modo == "prefix" and not c["chave"].startswith(alvo):
                continue
            if not (de <= c["ts"] <= ate):
                continue
            campos = {"urlkey": c["chave"], "timestamp": c["ts"], "original": c["url"],
                      "mimetype": c["mime"], "statuscode": str(c["status"]), "digest": c["digest"],
                      "length": str(len(c["corpo"]))}
            ok = True
            for f in filtros:
                neg = f.startswith("!")
                campo, _, regex = f.lstrip("!").partition(":")
                casou = re.fullmatch(regex, campos.get(campo, "")) is not None
                if casou == neg:
                    ok = False
                    break
            if ok:
                linhas.append(campos)
        linhas.sort(key=lambda l: (l["urlkey"], l["timestamp"]))
        colapso = params.get("collapse")
        if colapso:
            filtradas, anterior = [], None
            for l in linhas:
                if anterior is not None and l[colapso] == anterior:
                    continue
                anterior = l[colapso]
                filtradas.append(l)
            linhas = filtradas
        fl = params.get("fl", "urlkey,timestamp,original,mimetype,statuscode,digest,length").split(",")
        inicio = int(params.get("resumeKey") or 0)
        limite = int(params.get("limit") or 1000000)
        pagina = linhas[inicio:inicio + limite]
        tabela = [fl] + [[l[c] for c in fl] for l in pagina]
        if params.get("showResumeKey") == "true" and inicio + limite < len(linhas):
            tabela += [[], [str(inicio + limite)]]
        if len(tabela) == 1:
            tabela = []
        corpo = json.dumps(tabela).encode("utf-8")
        h.send_response(200)
        h.send_header("Content-Type", "application/json")
        h.send_header("Content-Length", str(len(corpo)))
        h.end_headers()
        h.wfile.write(corpo)

    def _captura(self, h, ts, modo, url):
        chave = canonico(url)
        caps = [c for c in self.capturas if c["chave"] == chave]
        if not caps:
            h.send_response(404)
            h.end_headers()
            h.wfile.write(b"<html><body>Wayback Machine has not archived that URL.</body></html>")
            return
        ts14 = ts + "0" * (14 - len(ts))
        mais_perto = min(caps, key=lambda c: abs(int(c["ts"]) - int(ts14)))
        if mais_perto["ts"] != ts:
            h.send_response(302)
            h.send_header("Location", "/web/%s%s/%s" % (mais_perto["ts"], modo, url))
            h.end_headers()
            return
        c = mais_perto
        if 300 <= c["status"] < 400:
            h.send_response(302)
            h.send_header("Location", "/web/%s%s/%s" % (c["ts"], modo, c["location"]))
            h.end_headers()
            return
        h.send_response(c["status"])
        h.send_header("Content-Type", c["mime"])
        h.send_header("Content-Length", str(len(c["corpo"])))
        h.end_headers()
        h.wfile.write(c["corpo"])
