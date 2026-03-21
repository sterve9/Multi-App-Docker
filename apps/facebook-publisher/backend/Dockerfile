FROM python:3.11-slim

# FFmpeg + curl + Node.js + Chrome headless deps
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libass-dev \
    curl \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst1 \
    wget \
    xdg-utils \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Code Python
COPY . .

# Dépendances Remotion
RUN cd /app/remotion && npm install

# Lien symbolique : remotion/public/storage → /app/storage
# staticFile("storage/audio/x.mp3") résoudra vers /app/remotion/public/storage/audio/x.mp3
# qui est en réalité /app/storage/audio/x.mp3 via le symlink
RUN mkdir -p /app/remotion/public \
    && ln -s /app/storage /app/remotion/public/storage

# Créer les dossiers de stockage
RUN mkdir -p /app/storage/{videos,audio,images,temp}

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
