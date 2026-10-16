FROM python:3.11-slim

WORKDIR /app

# Install system dependencies needed for compiling and networking
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code and assets
COPY . .

ENV PORT=8000
EXPOSE 8000

# Start FastAPI server binding to Railway dynamic $PORT
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
