#!/usr/bin/env python3
"""
Серверный загрузчик CTFd для Render.com:
1. Устанавливает psycopg2-binary для связи с Supabase PostgreSQL.
2. Патчит миграции для совместимости с Supavisor Pooler.
3. На уровне Jinja2-шаблонов удаляет "Powered by CTFd" / "Разработано CTFd" и ставит "Разработал Бер Максим" + кастомный SVG Favicon.
4. Устанавливает жёсткий серверный WSGI-фильтр HTTP Basic Authentication (логин: access, пароль: Academy2000) перед всеми маршрутами CTFd.
"""
import os
import re
import glob
import base64
import subprocess

FAVICON_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00f0ff"/>
      <stop offset="50%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#ff007f"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="#040814"/>
  <path d="M32 6 L54 14 V30 C54 45 44 54 32 59 C20 54 10 45 10 30 V14 Z" fill="#0a1530" stroke="url(#g1)" stroke-width="3"/>
  <polygon points="32,15 36.5,25 47.5,26 39,33.5 41.5,44.5 32,38.5 22.5,44.5 25,33.5 16.5,26 27.5,25" fill="#f59e0b" stroke="#00f0ff" stroke-width="1.2"/>
  <circle cx="32" cy="31" r="4" fill="#00f0ff"/>
</svg>"""
FAV_URI = "data:image/svg+xml;base64," + base64.b64encode(FAVICON_SVG.encode("utf-8")).decode("ascii")


def main():
    print("[MVD-BOOT] 1. Установка psycopg2-binary...", flush=True)
    subprocess.run(["/opt/venv/bin/pip", "install", "--no-cache-dir", "psycopg2-binary"], check=True)

    print("[MVD-BOOT] 2. Патч миграций CTFd для Supabase Pooler...", flush=True)
    mig_path = "/opt/CTFd/CTFd/utils/migrations/__init__.py"
    if os.path.exists(mig_path):
        txt = open(mig_path, encoding="utf-8").read()
        txt = txt.replace("database_exists_util(url)", "True")
        open(mig_path, "w", encoding="utf-8").write(txt)

    print("[MVD-BOOT] 3. Замена 'Powered by CTFd' -> 'Разработал Бер Максим' и Favicon в шаблонах...", flush=True)
    for tpl in glob.glob("/opt/CTFd/CTFd/themes/**/*.html", recursive=True):
        t = open(tpl, encoding="utf-8", errors="ignore").read()
        if "ctfd.io" not in t and "shortcut icon" not in t and "Powered by CTFd" not in t:
            continue
        t = re.sub(
            r'<a\s+href="https://ctfd\.io"[^>]*>.*?</a>',
            '<div class="mvd-author-footer"><span class="mvd-author-badge">Разработал <strong style="color:#00e5ff;">Бер Максим</strong></span></div>',
            t,
            flags=re.DOTALL | re.IGNORECASE,
        )
        t = t.replace("Powered by CTFd", "Разработал Бер Максим")
        t = t.replace("Разработано CTFd", "Разработал Бер Максим")
        t = re.sub(
            r'<link\s+rel="shortcut icon"[^>]*>',
            f'<link rel="icon" type="image/svg+xml" href="{FAV_URI}"><link rel="shortcut icon" href="{FAV_URI}">',
            t,
            flags=re.IGNORECASE,
        )
        open(tpl, "w", encoding="utf-8").write(t)
        print(f"   Обновлён шаблон: {tpl}", flush=True)

    print("[MVD-BOOT] 4. Установка серверного WSGI HTTP Basic Auth (access / Academy2000)...", flush=True)
    init_path = "/opt/CTFd/CTFd/__init__.py"
    init_txt = open(init_path, encoding="utf-8").read()
    if "MVD_BASIC_AUTH_GATE" not in init_txt:
        gate_code = '''

# === MVD_BASIC_AUTH_GATE ===
import hmac as _mvd_hmac
import base64 as _mvd_b64

class _MVDBasicAuthGate:
    def __init__(self, app):
        self.app = app
        self._expected = "Basic " + _mvd_b64.b64encode(b"access:Academy2000").decode("ascii")

    def __call__(self, environ, start_response):
        auth = environ.get("HTTP_AUTHORIZATION", "")
        if _mvd_hmac.compare_digest(auth, self._expected):
            # Убираем Basic-заголовок после проверки, чтобы /api/v1/* CTFd работал со стандартной сессией
            environ.pop("HTTP_AUTHORIZATION", None)
            return self.app(environ, start_response)

        body = """<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>ЗАЩИЩЁННЫЙ ПЕРИМЕТР // МВД КИБЕРПОЛИГОН</title>
  <style>
    body { background: #03060e; color: #f1f5f9; font-family: 'Courier New', monospace; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .box { max-width: 520px; padding: 2.5rem; background: #0a1428; border: 1px solid #00f0ff; border-radius: 14px; box-shadow: 0 0 40px rgba(0,240,255,0.25); text-align: center; }
    h2 { color: #00f0ff; margin-top: 0; }
    p { color: #94a3b8; line-height: 1.6; }
    .author { margin-top: 1.5rem; font-size: 0.85rem; color: #ff66b2; }
  </style>
</head>
<body>
  <div class="box">
    <h2>🔒 ДОСТУП К ПОЛИГОНУ ОГРАНИЧЕН</h2>
    <p>Для входа в защищённый контур <strong>МВД КИБЕРПОЛИГОН 2026</strong> требуется пройти серверную авторизацию браузера.</p>
    <div class="author">⚡ Разработал Бер Максим</div>
  </div>
</body>
</html>""".encode("utf-8")
        start_response("401 Unauthorized", [
            ("Content-Type", "text/html; charset=utf-8"),
            ("Content-Length", str(len(body))),
            ("WWW-Authenticate", 'Basic realm="MVD CYBER RANGE - RESTRICTED ACCESS"'),
        ])
        return [body]

_orig_create_app = create_app
def create_app(*args, **kwargs):
    _app = _orig_create_app(*args, **kwargs)
    _app.wsgi_app = _MVDBasicAuthGate(_app.wsgi_app)
    return _app
'''
        init_txt = init_txt + "\n" + gate_code
        open(init_path, "w", encoding="utf-8").write(init_txt)
        print("   WSGI BasicAuthGate успешно внедрён в CTFd/__init__.py", flush=True)

    print("[MVD-BOOT] 5. Запуск docker-entrypoint.sh...", flush=True)
    os.environ["SKIP_DB_PING"] = "true"
    os.execv("/opt/CTFd/docker-entrypoint.sh", ["/opt/CTFd/docker-entrypoint.sh"])


if __name__ == "__main__":
    main()
