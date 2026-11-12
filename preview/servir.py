#!/usr/bin/env python3
"""
PRÉ-VISUALIZAÇÃO LOCAL DO SITE (sem tocar no Firebase real)

Como usar (na pasta do projeto):
    python preview/servir.py

Depois abra no navegador:
    http://localhost:8000/            -> site logado como Kage (admin), com dados de exemplo
    http://localhost:8000/?jogador    -> logado como jogador comum
    http://localhost:8000/?login      -> mostra a tela de login

O servidor entrega o index.html de verdade, apenas trocando o Firebase pelo
arquivo preview/firebase-mock.js (dados de exemplo em memória).
Nada é gravado no banco. Para parar: Ctrl+C.
"""
import http.server
import json
import os
import socketserver
import sys

PORTA = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

FIREBASE = "https://www.gstatic.com/firebasejs/10.7.1/"
IMPORTMAP = {
    "imports": {
        FIREBASE + "firebase-app.js": "./preview/firebase-mock.js",
        FIREBASE + "firebase-auth.js": "./preview/firebase-mock.js",
        FIREBASE + "firebase-firestore.js": "./preview/firebase-mock.js",
    }
}
FAIXA = (
    '<div style="position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:99999;'
    'background:#1b1e2b;color:#fdba74;font:700 10px/1 sans-serif;padding:4px 10px;opacity:.85;'
    'border-radius:0 0 10px 10px;pointer-events:none;letter-spacing:.5px">'
    'PRÉVIA · dados de exemplo</div>'
)


def pagina_preview():
    with open(os.path.join(RAIZ, "index.html"), encoding="utf-8") as f:
        html = f.read()
    mapa = '<script type="importmap">' + json.dumps(IMPORTMAP) + "</script>"
    html = html.replace("<head>", "<head>\n    " + mapa, 1)
    html = html.replace("<body>", "<body>\n    " + FAIXA, 1)
    return html.encode("utf-8")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=RAIZ, **kw)

    def do_GET(self):
        caminho = self.path.split("?")[0]
        if caminho in ("/", "/index.html", "/preview.html"):
            corpo = pagina_preview()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(corpo)))
            self.end_headers()
            self.wfile.write(corpo)
            return
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORTA), Handler) as srv:
        print(f"Pré-visualização em http://localhost:{PORTA}/  (Ctrl+C para parar)")
        srv.serve_forever()
