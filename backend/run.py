import sys
import os
import threading
import time
import urllib.request
import subprocess
import logging

sys.stdout = open(os.devnull, "w")
sys.stderr = open(os.devnull, "w")

for lg_name in ["uvicorn", "uvicorn.access", "uvicorn.error", "httpx", "fastapi"]:
    lg = logging.getLogger(lg_name)
    lg.setLevel(logging.CRITICAL)
    lg.handlers = []
    lg.propagate = False

os.environ["UVICORN_LOG_LEVEL"] = "critical"


def find_ollama():
    candidates = [
        os.path.expandvars(r"%LocalAppData%\Programs\Ollama\ollama.exe"),
        os.path.expandvars(r"%ProgramFiles%\Ollama\ollama.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Ollama\ollama.exe"),
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    # Buscar en PATH (incluyendo rutas del usuario)
    user_path = os.environ.get("PATH", "")
    machine_path = ""
    try:
        import winreg
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE,
                            r"SYSTEM\CurrentControlSet\Control\Session Manager\Environment") as k:
            machine_path = winreg.QueryValueEx(k, "Path")[0]
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Environment") as k:
            try:
                user_path = winreg.QueryValueEx(k, "Path")[0]
            except FileNotFoundError:
                pass
    except Exception:
        pass
    full_path = machine_path + ";" + user_path + ";" + os.environ.get("PATH", "")
    for p in full_path.split(";"):
        candidate = os.path.join(p.strip(), "ollama.exe")
        if os.path.exists(candidate):
            return candidate
    return None


def is_ollama_running():
    try:
        urllib.request.urlopen("http://localhost:11434/api/tags", timeout=2)
        return True
    except Exception:
        return False


def get_whatsapp_dir():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(script_dir, "whatsapp")


def start_whatsapp_service():
    ws_dir = get_whatsapp_dir()
    server_js = os.path.join(ws_dir, "server.js")
    if not os.path.exists(server_js):
        return
    try:
        env = os.environ.copy()
        env["WA_WS_PORT"] = "11435"
        env["WA_SESSION_DIR"] = os.path.join(ws_dir, "session")
        subprocess.Popen(
            ["node", server_js],
            cwd=ws_dir,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW,
            env=env,
        )
    except FileNotFoundError:
        pass


def ensure_ollama_running():
    if is_ollama_running():
        return True
    ollama_exe = find_ollama()
    if not ollama_exe:
        return False
    try:
        subprocess.Popen(
            [ollama_exe, "serve"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW,
        )
    except Exception:
        return False
    # Esperar hasta 20 segundos a que Ollama esté listo
    for _ in range(80):
        time.sleep(0.25)
        if is_ollama_running():
            return True
    return False


def find_browser():
    candidates = [
        os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%LocalAppData%\Microsoft\Edge\Application\msedge.exe"),
    ]
    chrome = os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe")
    chrome86 = os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe")
    for c in candidates + [chrome, chrome86]:
        if os.path.exists(c):
            return c
    for p in os.environ.get("PATH", "").split(";"):
        for name in ["msedge.exe", "chrome.exe", "firefox.exe"]:
            candidate = os.path.join(p, name)
            if os.path.exists(candidate):
                return candidate
    return "msedge.exe"


def start_server():
    try:
        import uvicorn
        from main import app
        uvicorn.run(
            app,
            host="127.0.0.1",
            port=8000,
            log_level="critical",
            access_log=False,
            loop="asyncio",
            use_colors=False,
        )
    except Exception:
        pass


def wait_for_server(url, timeout=15):
    for _ in range(timeout * 4):
        try:
            urllib.request.urlopen(url, timeout=2)
            return True
        except Exception:
            time.sleep(0.25)
    return False


if __name__ == "__main__":
    url = "http://localhost:8000"

    # Arrancar Ollama en background si no está corriendo
    threading.Thread(target=ensure_ollama_running, daemon=True).start()

    # Arrancar servicio WhatsApp (Node.js) en background
    threading.Thread(target=start_whatsapp_service, daemon=True).start()

    t = threading.Thread(target=start_server, daemon=True)
    t.start()

    if not wait_for_server(url):
        sys.exit(1)

    browser = find_browser()
    browser_name = os.path.basename(browser).lower()

    # Perfil persistente para Edge/Chrome — misma carpeta en cada sesión para
    # reutilizar la ventana app (no abrir una nueva cada vez) y conservar
    # configuraciones.
    profile_dir = os.path.join(os.environ["LOCALAPPDATA"], "MarketFinder", "browser-profile")
    os.makedirs(profile_dir, exist_ok=True)
    try:
        if "firefox" in browser_name:
            args = [browser, "--new-window", url]
        else:
            args = [browser, f"--app={url}", f"--user-data-dir={profile_dir}"]

        proc = subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        proc.wait()
    except Exception:
        pass

    sys.exit(0)
