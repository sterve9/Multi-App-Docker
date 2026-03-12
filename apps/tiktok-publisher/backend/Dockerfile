FROM python:3.11-slim

# FFmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libass-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Node.js pour Remotion
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Créer les dossiers de stockage
RUN mkdir -p storage/{videos,audio,images,temp}

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
