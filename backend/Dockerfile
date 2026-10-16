FROM python:3.11-slim

WORKDIR /app

# Install system utilities and PostgreSQL headers
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Wrapper to safely handle any unexpanded $PORT passed to uvicorn CLI
RUN cp /usr/local/bin/uvicorn /usr/local/bin/uvicorn.real && \
    printf '#!/usr/bin/env python3\nimport sys, os\nargs = sys.argv[1:]\nfor i in range(len(args)):\n    if args[i] == "--port" and i+1 < len(args) and (not args[i+1].isdigit() or args[i+1].startswith("$")):\n        port = os.environ.get("PORT", "8000")\n        args[i+1] = port if port.isdigit() else "8000"\nos.execvp("uvicorn.real", ["uvicorn.real"] + args)\n' > /usr/local/bin/uvicorn && \
    chmod +x /usr/local/bin/uvicorn

# Copy source code
COPY . .

ENV PORT=8000
EXPOSE 8000

CMD ["python", "main.py"]
