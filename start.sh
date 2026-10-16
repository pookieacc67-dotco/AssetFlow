#!/usr/bin/env bash
set -e

if [ -f "main.py" ]; then
  exec python main.py
elif [ -f "backend/main.py" ]; then
  exec python backend/main.py
else
  exec python -m uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
fi
