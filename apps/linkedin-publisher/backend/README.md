# LinkedIn Publisher - Backend

API FastAPI pour automatiser la publication de posts LinkedIn avec génération d'images IA.

## Setup Local
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Configuration

Créez un fichier `.env` avec :
```
ANTHROPIC_API_KEY=your_key
REPLICATE_API_TOKEN=your_token
N8N_WEBHOOK_URL=your_webhook_url
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/linkedin_publisher
```

## Lancer en local
```bash
uvicorn src.app.main:app --reload
```

## Lancer avec Docker
```bash
docker-compose up --build
```

## API Documentation

Une fois lancé : http://localhost:8001/docs
