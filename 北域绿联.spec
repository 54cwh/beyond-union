# -*- mode: python ; coding: utf-8 -*-
# 北域绿联 PyInstaller spec（用 datas 元组，不依赖平台分隔符，Windows/Wine/Linux 通用）
# 由 scripts/build_exe.sh 调用

a = Analysis(
    ['app.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('pages', 'pages'),
        ('assets', 'assets'),
        ('data', 'data'),
        ('template.html', '.'),
    ],
    hiddenimports=['bottle'],
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='北域绿联',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    onefile=True,
)
