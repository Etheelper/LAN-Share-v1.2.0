"""
LAN Share - PyInstaller 入口
打包为独立可执行文件
"""

import os
import sys
import webbrowser
import threading


def open_browser():
    import time
    time.sleep(2)
    webbrowser.open("http://localhost:8000")


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

    from core.config import settings

    threading.Thread(target=open_browser, daemon=True).start()

    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        log_level="info",
    )
