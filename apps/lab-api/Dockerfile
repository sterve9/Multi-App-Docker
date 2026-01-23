# Image Python légère
FROM python:3.11-slim

# Dossier de travail dans le conteneur
WORKDIR /app

# Installer FastAPI + serveur ASGI
RUN pip install fastapi uvicorn

# Copier le code dans le conteneur
COPY app/ .

# Lancer l'application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
