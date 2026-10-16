#!/usr/bin/env bash
set -e

PORT="${PORT:-8000}"

if [ -f "main.py" ]; then
  exec uvicorn main:app --host 0.0.0.0 --port "$PORT"
elif [ -d "backend/app" ]; then
  export PYTHONPATH="${PYTHONPATH}:$(pwd)/backend:$(pwd)"
  exec uvicorn backend.app.main:app --host 0.0.0.0 --port "$PORT"
elif [ -d "app" ]; then
  export PYTHONPATH="${PYTHONPATH}:$(pwd)"
  exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
else
  exec uvicorn main:app --host 0.0.0.0 --port "$PORT"
fi
