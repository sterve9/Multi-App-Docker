# Multi-App-Docker

Infrastructure complète multi-applications déployée sur VPS via Docker Compose + Traefik.

- **VPS** : Hostinger (72.62.89.162)
- **Domaine racine** : `sterveshop.cloud`
- **SSL** : Let's Encrypt automatique via Traefik ACME
- **Réseau Docker partagé** : `traefik-network` (external)

---

## Applications

### landing-rituel
- **URL** : https://rituel.sterveshop.cloud
- **Stack** : HTML/CSS/JS + Nginx Alpine
- **Description** : Landing page produit (Rituel Ancestral) avec Meta Pixel, WhatsApp flottant, countdown timer, toasts social proof

### youtube-publisher
- **Frontend** : https://app.youtube.sterveshop.cloud
- **Backend API** : https://api.youtube.sterveshop.cloud
- **Stack** : FastAPI + PostgreSQL + Next.js 14 + TypeScript
- **Description** : Pipeline IA → YouTube. Génère script (Claude), images/vidéos (Kling 3.0 / Flux-2 Pro), voix off (ElevenLabs), assemble (FFmpeg), publie via n8n + YouTube Data API

### tiktok-publisher (facebook-publisher)
- **Frontend** : https://facebook.sterveshop.cloud
- **Backend API** : https://api.facebook.sterveshop.cloud
- **Stack** : FastAPI + PostgreSQL + Redis + Next.js 14 + TypeScript
- **Description** : Pipeline IA → vidéo Facebook. Même pipeline que youtube-publisher, publication manuelle par l'utilisateur

### linkedin-publisher
- **Frontend** : https://app.linkedin.sterveshop.cloud
- **Backend API** : https://api.linkedin.sterveshop.cloud
- **Stack** : FastAPI + PostgreSQL + Next.js 14 + TypeScript
- **Description** : Pipeline IA → post LinkedIn avec face consistency (Kling 2.6 I2V + photos référence utilisateur)

### site-vitrine
- **Frontend** : https://vitrine.sterveshop.cloud
- **Backend API** : https://api.sterveshop.cloud
- **Stack** : FastAPI + PostgreSQL + Next.js
- **Description** : Site professionnel avec formulaire contact, analyse IA (Claude), blog, auth JWT, notifications Telegram

### n8n
- **URL** : https://automation.sterveshop.cloud
- **Stack** : n8n (Node.js)
- **Description** : Plateforme d'automatisation — webhooks, workflows YouTube/LinkedIn/TikTok, séquences email
- **Workflows actifs** :
  - `youtube-publisher` (ReS7bervr6Xkop7hcowDq)
  - `linkedin-publisher` (egjGrTP4garbZAZfQik2W)
  - `tiktok-publisher` (YCtkIGoAuozC4fwH)
  - `Chariow - Séquence Post-Achat` (TCUGrVMxDJv5GWNn)

### builder
- **Stack** : Static (Nginx)
- **Description** : Site vitrine builder statique

### lab-api
- **Stack** : FastAPI (Python)
- **Description** : API lab interne pour expérimentations

### traefik
- **Description** : Reverse proxy + HTTPS automatique (Let's Encrypt)
- **Réseau** : `traefik-network`

---

## Architecture

```
Internet
   ↓
Traefik (reverse proxy + SSL Let's Encrypt)
   ↓
traefik-network (réseau Docker partagé)
   ├── rituel.sterveshop.cloud          → landing-rituel (nginx)
   ├── app.youtube.sterveshop.cloud     → youtube-publisher-frontend
   ├── api.youtube.sterveshop.cloud     → youtube-publisher-backend
   ├── facebook.sterveshop.cloud        → tiktok-publisher-frontend
   ├── api.facebook.sterveshop.cloud    → tiktok-publisher-backend
   ├── app.linkedin.sterveshop.cloud    → linkedin-publisher-frontend
   ├── api.linkedin.sterveshop.cloud    → linkedin-publisher-backend
   ├── vitrine.sterveshop.cloud         → site-vitrine-frontend
   ├── api.sterveshop.cloud             → site-vitrine-backend
   └── automation.sterveshop.cloud      → n8n
```

```
Multi-App-Docker/
├── traefik/
├── apps/
│   ├── landing-rituel/        # nginx static
│   ├── youtube-publisher/     # FastAPI + PostgreSQL + Next.js
│   ├── tiktok-publisher/      # FastAPI + PostgreSQL + Redis + Next.js
│   ├── linkedin-publisher/    # FastAPI + PostgreSQL + Next.js
│   ├── site-vitrine/          # FastAPI + PostgreSQL + Next.js
│   ├── n8n/
│   ├── builder/
│   └── lab-api/
├── CLAUDE.md                  # Guide développement (lu par Claude Code)
├── DOCUMENTATION.md           # Documentation complète (réplication client)
└── README.md
```

---

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Backend | Python 3.11, FastAPI, SQLAlchemy |
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS |
| BDD | PostgreSQL (container dédié par app) |
| Cache | Redis (tiktok-publisher) |
| Proxy | Traefik v2.11 |
| Automation | n8n |
| IA Texte | Anthropic Claude (claude-3-5-sonnet) |
| IA Image/Vidéo | Kie.ai (Kling 3.0, Flux-2 Pro) |
| Voix | ElevenLabs (eleven_multilingual_v2) |
| Assemblage | FFmpeg |
| State frontend | Zustand |

---

## Déploiement

### Prérequis
- Docker & Docker Compose installés sur le VPS
- Domaine configuré avec les entrées DNS
- Réseau Docker `traefik-network` créé : `docker network create traefik-network`

### Workflow

```bash
# 1. Développement local + commit
git add .
git commit -m "description"
git push origin master

# 2. SSH sur le VPS
ssh user@72.62.89.162

# 3. Pull
cd /chemin/du/projet
git pull origin master

# 4. Déployer sans rebuild complet (backends Python)
docker cp backend/src/app/services/fichier.py container-name:/app/app/services/fichier.py
docker-compose restart backend

# 5. Déployer avec rebuild (frontend Next.js — inévitable)
docker-compose up -d --build frontend
```

> **Important** : `docker-compose up -d --build` complet prend 1h+. Utiliser `docker cp` + `restart` pour les changements backend.

### DNS (Hostinger)

| Type | Nom | Valeur | TTL |
|------|-----|--------|-----|
| A | @ | 72.62.89.162 | 300 |
| A | vitrine | 72.62.89.162 | 300 |
| A | api | 72.62.89.162 | 300 |
| A | automation | 72.62.89.162 | 300 |
| A | rituel | 72.62.89.162 | 300 |
| A | app.youtube | 72.62.89.162 | 300 |
| A | api.youtube | 72.62.89.162 | 300 |
| A | facebook | 72.62.89.162 | 300 |
| A | api.facebook | 72.62.89.162 | 300 |
| A | app.linkedin | 72.62.89.162 | 300 |
| A | api.linkedin | 72.62.89.162 | 300 |

---

## Commandes utiles

```bash
# Logs d'un service
docker logs youtube-publisher-backend --tail 50 -f

# Redémarrer un service
docker-compose restart backend

# Vérifier les variables d'env d'un container
docker exec container-name env | grep MA_VARIABLE

# Reset statut vidéo bloquée (youtube-publisher)
docker exec -it youtube-publisher-postgres psql -U postgres -d youtube_publisher \
  -c "UPDATE videos SET status='READY' WHERE status='UPLOADING';"

# Voir les containers actifs
docker ps

# Voir le réseau traefik
docker network inspect traefik-network
```
