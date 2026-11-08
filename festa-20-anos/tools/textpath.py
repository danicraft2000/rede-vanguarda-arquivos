"""Converte texto em contornos SVG (paths) usando a fonte ITC Avant Garde Gothic Std Bold.

Assim os SVGs ficam corretos em qualquer computador, mesmo sem a fonte instalada,
e os caracteres alternativos do V e do A (estilo do logotipo Vanguarda) aparecem certinhos.

  V alternativo -> U+E04F (V.alt02)
  A alternativo -> U+E000 (A.alt01)
"""
import os
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ALT_V = ""
ALT_A = ""


def vanguarda(texto: str) -> str:
    """Troca V e A maiúsculos pelos glifos alternativos inclinados (estilo Vanguarda)."""
    return texto.replace("V", ALT_V).replace("A", ALT_A)


def _acha_fonte():
    candidatos = [
        os.environ.get("AVANT_GARDE_TTF", ""),
        os.path.join(os.path.dirname(__file__), "..", "fontes", "ITCAvantGardeStd-Bold.ttf"),
        os.path.expanduser("~/.local/share/fonts/ITCAvantGardeStd-Bold.ttf"),
    ]
    for c in candidatos:
        if c and os.path.exists(c):
            return c
    raise FileNotFoundError(
        "Fonte ITCAvantGardeStd-Bold.ttf não encontrada. Coloque em festa-20-anos/fontes/ "
        "ou defina AVANT_GARDE_TTF.")


class FonteContorno:
    def __init__(self, caminho=None):
        caminho = caminho or _acha_fonte()
        dados = open(caminho, "rb").read()
        self.hb_font = hb.Font(hb.Face(dados))
        self.tt = TTFont(caminho)
        self.glyphs = self.tt.getGlyphSet()
        self.ordem = self.tt.getGlyphOrder()
        self.upem = self.tt["head"].unitsPerEm

    def _shape(self, texto):
        buf = hb.Buffer()
        buf.add_str(texto)
        buf.guess_segment_properties()
        hb.shape(self.hb_font, buf, {"kern": True, "liga": False, "dlig": False})
        return buf.glyph_infos, buf.glyph_positions

    def largura(self, texto, tamanho, tracking=0.0):
        infos, pos = self._shape(texto)
        s = tamanho / self.upem
        return sum(p.x_advance for p in pos) * s + tracking * tamanho * max(0, len(pos) - 1)

    def path(self, texto, tamanho, x, y, ancora="start", tracking=0.0):
        """Retorna o atributo d de um <path> com o texto desenhado. tracking em em (ex.: 0.05)."""
        infos, pos = self._shape(texto)
        s = tamanho / self.upem
        w = self.largura(texto, tamanho, tracking)
        if ancora == "middle":
            x -= w / 2
        elif ancora == "end":
            x -= w
        cx = 0.0
        partes = []
        for info, p in zip(infos, pos):
            nome = self.ordem[info.codepoint]
            pen = SVGPathPen(self.glyphs, ntos=lambda v: ("%.2f" % v).rstrip("0").rstrip("."))
            tp = TransformPen(pen, (s, 0, 0, -s, x + (cx + p.x_offset) * s, y - p.y_offset * s))
            self.glyphs[nome].draw(tp)
            partes.append(pen.getCommands())
            cx += p.x_advance + tracking * self.upem
        return " ".join(c for c in partes if c)


def glifos(fonte, texto, tamanho=100):
    """Lista de letras com contorno próprio e posição x (para animar letra por letra em 3D)."""
    infos, pos = fonte._shape(texto)
    s = tamanho / fonte.upem
    cx = 0.0
    res = []
    chars = list(texto)
    for k, (info, p) in enumerate(zip(infos, pos)):
        nome = fonte.ordem[info.codepoint]
        pen = SVGPathPen(fonte.glyphs, ntos=lambda v: ("%.2f" % v).rstrip("0").rstrip("."))
        adv = p.x_advance * s
        tp = TransformPen(pen, (s, 0, 0, -s, -adv / 2, 0))
        fonte.glyphs[nome].draw(tp)
        d = pen.getCommands()
        res.append({"d": d, "x": round(cx * s + adv / 2, 2), "adv": round(adv, 2)})
        cx += p.x_advance
    return res, round(cx * s, 2)
