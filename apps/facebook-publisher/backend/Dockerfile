FROM python:3.11-slim

# Étape 1 : outils de base + FFmpeg + Node.js 18 (Debian Bookworm natif)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    ca-certificates \
    wget \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Étape 2 : Chromium + polices (Impact requis pour les captions Remotion)
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    fonts-open-sans \
    ttf-bitstream-vera \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Code Python
COPY . .

# Dépendances Remotion (rm node_modules pour forcer une install propre depuis package.json)
RUN cd /app/remotion && rm -rf node_modules package-lock.json && npm install

# Lien symbolique : remotion/public/storage → /app/storage
RUN mkdir -p /app/remotion/public \
    && ln -s /app/storage /app/remotion/public/storage

# Créer les dossiers de stockage
RUN mkdir -p /app/storage/{videos,audio,images,temp}

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
