FROM python:3.11-slim

WORKDIR /app

# Dépendances système (ffmpeg pour assemblage vidéo + Node.js pour Remotion)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Dossiers de stockage
RUN mkdir -p /app/storage/videos /app/storage/audio /app/storage/images /app/storage/temp

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
