# 🚀 Plateforme d'Automatisation IA

Système intelligent qui analyse les demandes clients et génère automatiquement des workflows n8n adaptés.

## 📋 Vue d'ensemble

**Problème résolu** : Créer des workflows d'automatisation prend 2+ heures manuellement

**Solution** : IA qui génère des workflows en 3 minutes

## 🏗️ Architecture
```
Frontend (vitrine.sterveshop.cloud)
    ↓
Backend FastAPI (API REST)
    ↓
Claude API (Analyse + Génération)
    ↓
n8n API (Création workflow)
    ↓
Workflow déployé
```

## 🛠️ Stack Technique

### Frontend
- HTML5, CSS3, JavaScript
- Nginx
- Docker

### Backend
- Python 3.11
- FastAPI
- Claude API (Anthropic)
- Pydantic (validation)

### Infrastructure
- Docker + Docker Compose
- Traefik (reverse proxy)
- Let's Encrypt (HTTPS)
- VPS Ubuntu

## 📊 Fonctionnalités

### ✅ Actuelles
- [x] Analyse intelligente des demandes clients
- [x] Classification automatique (automation, website, ai, etc.)
- [x] Priorisation des demandes (low, medium, high)
- [x] Suggestion d'outils adaptés
- [x] Parsing JSON structuré

### 🔄 En cours
- [ ] Génération automatique de workflows n8n
- [ ] Déploiement automatique des workflows
- [ ] Dashboard de suivi

### 🎯 Futur
- [ ] Templates de workflows
- [ ] Analytics et métriques
- [ ] Interface admin
- [ ] Multi-tenancy

## 🚀 Installation Locale

### Prérequis
```bash
Python 3.11+
Docker + Docker Compose
Clé API Anthropic
```

### Backend
```bash
# Se placer dans le dossier backend
cd backend

# Créer un environnement virtuel
python -m venv .venv

# Activer l'environnement
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt

# Créer le fichier .env
echo "ANTHROPIC_API_KEY=sk-ant-votre-cle-ici" > .env

# Lancer le serveur
uvicorn main:app --reload
```

Le backend est accessible sur : `http://127.0.0.1:8000`

### Frontend
```bash
# Se placer dans le dossier frontend
cd frontend

# Ouvrir avec Live Server (VS Code)
# Ou ouvrir index.html dans un navigateur
```

## 🧪 Tests

### Test API de base
```bash
curl http://127.0.0.1:8000/
```

Résultat attendu :
```json
{"success": true, "message": "API is running"}
```

### Test analyse de demande
```bash
curl -X POST http://127.0.0.1:8000/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jean Dupont",
    "email": "jean@example.com",
    "message": "Je veux automatiser mes leads avec n8n"
  }'
```

Résultat attendu :
```json
{
  "success": true,
  "client": {...},
  "analysis": {
    "category": "automation",
    "intent": "...",
    "tools": ["n8n", "CRM"],
    "priority": "high",
    "summary": "..."
  }
}
```

## 📈 Métriques Actuelles

- ⚡ Temps d'analyse : ~2-3 secondes
- 🎯 Précision : En test
- 💰 Coût par analyse : ~$0.01
- 🔄 Modèle utilisé : Claude Sonnet 4.5

## 📁 Structure du Projet
```
site-vitrine/
├── backend/
│   ├── main.py              # API FastAPI
│   ├── models.py            # Modèles Pydantic
│   ├── requirements.txt     # Dépendances Python
│   ├── .env                 # Variables d'environnement
│   └── services/            # Services (n8n, etc.)
│       └── (à venir)
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   └── main.js
│   └── assets/
│       └── images/
├── docs/
│   ├── ARCHITECTURE.md      # Architecture détaillée
│   └── API.md              # Documentation API
├── docker-compose.yml
├── README.md
└── JOURNAL.md              # Journal de développement
```

## 🎯 Roadmap

### Version 1.0 (3 semaines)
- [x] Backend FastAPI ✅
- [x] Intégration Claude ✅
- [ ] Service n8n
- [ ] Déploiement production

### Version 2.0 (futur)
- [ ] Dashboard admin
- [ ] Templates de workflows
- [ ] Analytics avancées
- [ ] Multi-utilisateurs

## 📝 Documentation

- [Architecture détaillée](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Journal de développement](JOURNAL.md)

## 👨‍💻 Auteur

**Sterve** - Développeur Full-Stack spécialisé en automatisation IA

- Site : https://vitrine.sterveshop.cloud
- Email : sterveshop6@gmail.com
- LinkedIn : www.linkedin.com/in/sterve-ai

## 🙏 Remerciements

- Claude (Anthropic) pour l'IA
- n8n pour l'automatisation
- FastAPI pour le framework

## 📄 Licence

MIT License - Projet personnel

---

**Dernière mise à jour** : 2026-02-08
