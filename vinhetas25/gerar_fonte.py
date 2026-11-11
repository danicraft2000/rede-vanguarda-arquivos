#!/usr/bin/env python3
"""Converte a fonte ITC Avant Garde Gothic Std Bold (TTF) para o formato
typeface.json que o three.js entende, com tabela de kerning.

Uso: python3 gerar_fonte.py ITCAvantGardeStd-Bold.ttf build/fonte.json

A fonte em si NAO vai para o repositorio (e comercial); so o script.
Inclui os glifos especiais do logotipo:
  A estilizado = U+E000 (A.alt01)
  V estilizado = U+E04F (V.alt02)
"""
import json
import sys

import uharfbuzz as hb
from fontTools.pens.basePen import BasePen
from fontTools.ttLib import TTFont


class TypefacePen(BasePen):
    """Grava o contorno no formato de comandos do typeface.js."""

    def __init__(self, glyphset):
        super().__init__(glyphset)
        self.cmds = []

    def _moveTo(self, p):
        self.cmds += ["m", round(p[0]), round(p[1])]

    def _lineTo(self, p):
        self.cmds += ["l", round(p[0]), round(p[1])]

    def _qCurveToOne(self, p1, p2):
        # typeface.js: q x y cpx cpy  (ponto final primeiro, depois o de controle)
        self.cmds += ["q", round(p2[0]), round(p2[1]), round(p1[0]), round(p1[1])]

    def _curveToOne(self, p1, p2, p3):
        self.cmds += ["b", round(p3[0]), round(p3[1]), round(p1[0]), round(p1[1]),
                      round(p2[0]), round(p2[1])]

    def _closePath(self):
        self.cmds += ["z"]


def main(src, dst):
    font = TTFont(src)
    cmap = font.getBestCmap()
    gs = font.getGlyphSet()
    hmtx = font["hmtx"]
    upm = font["head"].unitsPerEm

    wanted = set(range(0x20, 0x7F)) | set(range(0xA0, 0x100)) | {0xE000, 0xE04F, 0x2013, 0x2014, 0x2022}
    glyphs = {}
    for cp in sorted(wanted):
        name = cmap.get(cp)
        if not name:
            continue
        pen = TypefacePen(gs)
        gs[name].draw(pen)
        xs = pen.cmds
        nums = [v for v in xs if not isinstance(v, str)]
        glyphs[chr(cp)] = {
            "ha": hmtx[name][0],
            "x_min": min(nums[0::2]) if nums else 0,
            "x_max": max(nums[0::2]) if nums else 0,
            "o": " ".join(str(v) for v in xs),
        }

    # Kerning (pares) medido com o HarfBuzz, so com a feature 'kern'.
    blob = hb.Blob.from_file_path(src)
    face = hb.Face(blob)
    hbfont = hb.Font(face)
    kchars = [c for c in glyphs if c.isupper() or c.isdigit() or c in ""]
    kern = {}
    feats = {"kern": True, "liga": False, "dlig": False, "calt": False, "clig": False}
    for a in kchars:
        for b in kchars:
            buf = hb.Buffer()
            buf.add_str(a + b)
            buf.guess_segment_properties()
            hb.shape(hbfont, buf, feats)
            pos = buf.glyph_positions
            if len(pos) != 2:
                continue
            d = pos[0].x_advance - glyphs[a]["ha"]
            if d:
                kern[a + b] = d

    bb = font["head"]
    out = {
        "glyphs": glyphs,
        "kern": kern,
        "familyName": "ITC Avant Garde Gothic Std",
        "ascender": font["hhea"].ascent,
        "descender": font["hhea"].descent,
        "underlinePosition": font["post"].underlinePosition,
        "underlineThickness": font["post"].underlineThickness,
        "boundingBox": {"yMin": bb.yMin, "xMin": bb.xMin, "yMax": bb.yMax, "xMax": bb.xMax},
        "resolution": upm,
        "original_font_information": {"format": 0},
    }
    with open(dst, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(glyphs)} glifos, {len(kern)} pares de kerning -> {dst}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
