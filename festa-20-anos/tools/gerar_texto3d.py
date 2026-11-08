"""Gera video/assets/texto3d.json: contornos (SVG path) dos textos que viram 3D no vídeo,
já com kerning e com o V/A alternativos da Avant Garde (estilo Vanguarda)."""
import json, os
from textpath import FonteContorno, vanguarda, glifos
F = FonteContorno()
TEXTOS = {
    "DANIEL": vanguarda("DANIEL"), "20ANOS": vanguarda("20 ANOS"), "20": "20",
    "VAN": vanguarda("VAN"), "GUAR": vanguarda("GUAR"), "DA": vanguarda("DA"),
    "VANGUARDA": vanguarda("VANGUARDA"), "2029": "2029", "OBRIGADO": vanguarda("OBRIGADO!"),
}
out = {}
for k, t in TEXTOS.items():
    w = F.largura(t, 100)
    gl, larg = glifos(F, t, 100)
    out[k] = {"d": F.path(t, 100, 0, 0), "w": round(w, 2), "h": 72, "letras": [g for g in gl if g["d"]]}
dest = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "video", "assets", "texto3d.json")
json.dump(out, open(dest, "w"))
print("ok", list(out))
