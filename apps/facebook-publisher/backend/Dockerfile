FROM python:3.11-slim

# FFmpeg + curl + Node.js
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libass-dev \
    curl \
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
