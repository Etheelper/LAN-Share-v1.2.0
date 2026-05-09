# -*- mode: python ; coding: utf-8 -*-
import os
import sys

block_cipher = None

backend_dir = os.path.abspath('.')

a = Analysis(
    ['run.py'],
    pathex=[backend_dir],
    binaries=[],
    datas=[
        ('.env', '.'),
        ('web', 'web'),
    ],
    hiddenimports=[
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'core',
        'core.config',
        'core.database',
        'core.security',
        'models',
        'models.user',
        'models.file_record',
        'schemas',
        'schemas.user_schema',
        'schemas.file_schema',
        'routers',
        'routers.auth',
        'routers.users',
        'routers.files',
        'routers.upload',
        'routers.stream',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter', 'matplotlib', 'numpy', 'pandas', 'scipy',
        'PIL', 'cv2', 'pytest', 'setuptools',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='LANShare',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    icon=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='LANShare',
)
