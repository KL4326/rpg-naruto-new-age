#!/usr/bin/env python3
"""
Gera UM arquivo HTML autônomo para pré-visualizar o site (dois cliques para abrir).

    python preview/gerar_arquivo_unico.py

Cria: preview/previa-rpg-naruto.html
- Junta index.html + style.css + script.js + dados de exemplo (firebase-mock.js)
- NÃO conecta no Firebase real: tudo roda na memória do navegador.
"""
import base64
import os
import re

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ler = lambda p: open(os.path.join(RAIZ, p), encoding="utf-8").read()

html = ler("index.html")
css = ler("style.css")
script = ler("script.js")
mock = ler("preview/firebase-mock.js")

# 1) Firebase de mentira dentro de um bloco isolado (evita conflito de nomes com o script.js)
nomes = re.findall(r"^export const (\w+)", mock, flags=re.M)
mock_sem_export = re.sub(r"^export const ", "const ", mock, flags=re.M)
bloco_firebase = (
    "const __firebaseDeExemplo = (() => {\n" + mock_sem_export +
    "\nreturn { " + ", ".join(nomes) + " };\n})();\n"
    "const { " + ", ".join(nomes) + " } = __firebaseDeExemplo;\n"
)

# 1b) Regras da arena (arena-regras.js) também num bloco isolado
regras = ler("arena-regras.js")
nomes_regras = re.findall(r"^export (?:const|function) (\w+)", regras, flags=re.M)
regras_sem_export = re.sub(r"^export ", "", regras, flags=re.M)
bloco_firebase += (
    "const __regrasArena = (() => {\n" + regras_sem_export +
    "\nreturn { " + ", ".join(nomes_regras) + " };\n})();\n"
    "const { " + ", ".join(nomes_regras) + " } = __regrasArena;\n"
)

# 2) script.js sem as importações do Firebase real
script_sem_import = re.sub(r"^import .*?;\s*$", "", script, flags=re.M)

# 2b) Imagens da pasta img/ embutidas no arquivo (para funcionar com dois cliques)
def embutir(m):
    caminho = os.path.join(RAIZ, m.group(1))
    if not os.path.exists(caminho):
        return m.group(0)
    ext = caminho.rsplit(".", 1)[-1].lower()
    mime = {"jpg": "jpeg", "jpeg": "jpeg", "png": "png", "webp": "webp", "gif": "gif"}[ext]
    dados = base64.b64encode(open(caminho, "rb").read()).decode()
    return '"data:image/' + mime + ';base64,' + dados + '"'
script_sem_import = re.sub(r'"(img/[^"]+)"', embutir, script_sem_import)

# 3) Monta o HTML único
favicon = "data:image/png;base64," + base64.b64encode(open(os.path.join(RAIZ, "favicon.png"), "rb").read()).decode()
html = html.replace('href="favicon.png"', f'href="{favicon}"', 1)
html = html.replace('<link rel="stylesheet" href="style.css">', "<style>\n" + css + "\n</style>", 1)
html = html.replace(
    '<script type="module" src="script.js"></script>',
    '<script type="module">\n' + bloco_firebase + "\n" + script_sem_import + "\n" + ler("preview/bot-treino.js") + "\n</script>", 1)
faixa = ('<div style="position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:99999;background:#1b1e2b;'
         'color:#fdba74;font:700 10px/1 sans-serif;padding:4px 10px;opacity:.85;border-radius:0 0 10px 10px;'
         'pointer-events:none;letter-spacing:.5px">PRÉVIA · dados de exemplo</div>')
html = html.replace("<body>", "<body>\n    " + faixa, 1)

destino = os.path.join(RAIZ, "preview", "previa-rpg-naruto.html")
open(destino, "w", encoding="utf-8").write(html)
print(f"Gerado: {destino} ({os.path.getsize(destino) // 1024} KB)")
