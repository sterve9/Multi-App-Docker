FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for Pillow
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libjpeg-dev \
    libpng-dev \
    libfreetype6-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copier le dossier src
COPY ./src /app/src

# Ajouter src au PYTHONPATH pour que Python trouve "app"
ENV PYTHONPATH=/app/src

# Force Python to show logs immediately
ENV PYTHONUNBUFFERED=1

# Créer un user non-root pour la sécurité
RUN useradd -m -u 1000 appuser \
    && chown -R appuser:appuser /app
USER appuser

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
