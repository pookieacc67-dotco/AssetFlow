#!/usr/bin/env bash
set -e

if [ -d "backend/app" ]; then
  export PYTHONPATH="${PYTHONPATH}:$(pwd)/backend:$(pwd)"
  exec uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}
elif [ -d "app" ]; then
  export PYTHONPATH="${PYTHONPATH}:$(pwd)"
  exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
else
  exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
fi
