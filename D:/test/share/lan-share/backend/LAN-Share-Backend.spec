# -*- mode: python ; coding: utf-8 -*-
import os
import sys
import glob

block_cipher = None

backend_dir = os.path.abspath('.')
python_dir = os.path.dirname(sys.executable)

binaries = []

dlls_dir = os.path.join(python_dir, 'DLLs')
if os.path.exists(dlls_dir):
    for dll in glob.glob(os.path.join(dlls_dir, '*.pyd')):
        binaries.append((dll, '.'))
    for dll in glob.glob(os.path.join(dlls_dir, '*.dll')):
        if 'vcruntime' in dll.lower() or 'msvcp' in dll.lower() or 'python' in dll.lower():
            binaries.append((dll, '.'))

binaries.extend([
    (os.path.join(python_dir, 'python*.dll'), '.'),
])

a = Analysis(
    ['run.py'],
    pathex=[backend_dir],
    binaries=binaries,
    datas=[
        ('.env', '.'),
        ('web', 'web'),
    ],
    hiddenimports=[
        'uvicorn',
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
        'uvicorn.middleware.cors',
        'uvicorn.middleware.proxy_headers',
        'uvicorn.middleware.message_logger',
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
        'fastapi',
        'fastapi.middleware.cors',
        'fastapi.staticfiles',
        'fastapi.responses',
        'pydantic',
        'sqlalchemy',
        'python_multipart',
        'python_jose',
        'passlib',
        'bcrypt',
        'websockets',
        'websockets.legacy',
        'websockets.legacy.compatibility',
        'websockets.legacy.server',
        'websockets.legacy.client',
        'watchfiles',
        'watchfiles.main',
        'watchfiles._rust_notify',
        'httptools',
        'httptools.parser',
        'httptools.parser.parser',
        'httptools.parser.url_parser',
        'pydantic_core',
        'pydantic_core._pydantic_core',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter', 'matplotlib', 'numpy', 'pandas', 'scipy',
        'PIL', 'cv2', 'pytest', 'setuptools', 'ipython',
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
    name='LAN-Share-Backend',
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
    name='dist',
)
