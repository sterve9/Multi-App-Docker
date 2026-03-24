FROM python:3.11-slim

# Étape 1 : outils de base + FFmpeg + Node.js 18 (depuis Debian Bookworm, stable)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    ca-certificates \
    wget \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Étape 2 : dépendances système pour Chrome headless (Remotion)
RUN apt-get update && apt-get install -y \
    fonts-liberation \
    libasound2t64 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst1 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Code Python
COPY . .

# Dépendances Remotion (rm node_modules pour forcer une install propre depuis package.json)
RUN cd /app/remotion && rm -rf node_modules package-lock.json && npm install

# Télécharger le binaire Chrome pour Remotion
RUN cd /app/remotion && npx remotion browser ensure

# Lien symbolique : remotion/public/storage → /app/storage
RUN mkdir -p /app/remotion/public \
    && ln -s /app/storage /app/remotion/public/storage

# Créer les dossiers de stockage
RUN mkdir -p /app/storage/{videos,audio,images,temp}

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
