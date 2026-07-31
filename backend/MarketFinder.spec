# -*- mode: python ; coding: utf-8 -*-
import os
from PyInstaller.utils.hooks import collect_all

# Recopilar whatsapp/ excluyendo session/ (datos de usuario, no se bundlea)
wa_src = os.path.join(os.path.dirname(os.path.abspath(SPEC)), 'whatsapp')
wa_datas = []
for root, dirs, files in os.walk(wa_src):
    dirs[:] = [d for d in dirs if d != 'session']
    for f in files:
        src_path = os.path.join(root, f)
        rel = os.path.relpath(root, os.path.dirname(wa_src))
        wa_datas.append((src_path, rel))

datas = [('static', 'static'), ('.env', '.')] + wa_datas
binaries = []
hiddenimports = ['uvicorn', 'uvicorn.logging', 'uvicorn.loops', 'uvicorn.loops.auto', 'uvicorn.protocols', 'uvicorn.protocols.http', 'uvicorn.protocols.http.auto', 'uvicorn.protocols.websockets', 'uvicorn.protocols.websockets.auto', 'httpx', 'winreg']
tmp_ret = collect_all('langdetect')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]
tmp_ret2 = collect_all('duckduckgo_search')
datas += tmp_ret2[0]; binaries += tmp_ret2[1]; hiddenimports += tmp_ret2[2]
tmp_ret3 = collect_all('lxml')
datas += tmp_ret3[0]; binaries += tmp_ret3[1]; hiddenimports += tmp_ret3[2]


a = Analysis(
    ['run.py'],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='MarketFinder',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
