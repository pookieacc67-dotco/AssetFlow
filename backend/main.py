import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.main import app

if __name__ == "__main__":
    import uvicorn
    raw_port = str(os.environ.get("PORT", "8000")).strip()
    port = int(raw_port) if raw_port.isdigit() else 8000
    print(f"[AssetFlow API] Starting server on 0.0.0.0:{port} ...")
    uvicorn.run(app, host="0.0.0.0", port=port)
