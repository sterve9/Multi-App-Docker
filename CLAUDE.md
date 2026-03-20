# CLAUDE.md — Guide de développement Multi-App-Docker

Ce fichier est lu automatiquement par Claude Code à chaque session. Il décrit l'architecture, les conventions et les règles à respecter pour modifier ce projet sans rien casser.

---

## Architecture globale

Monorepo multi-applications déployé sur VPS (Hostinger) via **Docker Compose + Traefik**.
Domaine racine : `sterveshop.cloud`
Réseau Docker partagé : `traefik-network` (external)
SSL automatique : Let's Encrypt via Traefik ACME

```
Multi-App-Docker/
├── traefik/                   # Reverse proxy + SSL
├── apps/
│   ├── landing-rituel/        # Landing page produit (nginx static)
│   ├── youtube-publisher/     # Pipeline vidéo IA → YouTube
│   ├── tiktok-publisher/      # Pipeline vidéo IA → Facebook (renommé)
│   ├── linkedin-publisher/    # Pipeline image IA → LinkedIn
│   ├── site-vitrine/          # Site pro + contact IA
│   ├── n8n/                   # Automation (webhooks, workflows)
│   ├── builder/               # Site vitrine builder (static)
│   └── lab-api/               # Lab FastAPI interne
└── CLAUDE.md
```

---

## Stack technique commune

| Composant | Technologie |
|-----------|-------------|
| Backend | Python 3.11, FastAPI, SQLAlchemy |
| Frontend | Next.js 14-16, React, TypeScript, Tailwind CSS |
| BDD | PostgreSQL (par app, container dédié) |
| Cache | Redis (tiktok-publisher uniquement) |
| Proxy | Traefik v2.11 |
| Automation | n8n (automation.sterveshop.cloud) |
| IA Texte | Anthropic Claude API |
| IA Image/Vidéo | Kie.ai (Kling 3.0, Flux-2 Pro) |
| Voix | ElevenLabs |
| Assemblage | FFmpeg |
| State (frontend) | Zustand |

---

## Règles critiques à respecter

### 1. Déploiement — JAMAIS de rebuild complet inutile
Le `docker-compose up -d --build` prend 1h+. Utiliser à la place :
```bash
# Pour les changements Python/backend
docker cp backend/src/app/fichier.py container-name:/app/app/fichier.py
docker-compose restart backend

# Pour les changements frontend TypeScript/React
docker-compose up -d --build frontend
# (inévitable car Next.js compile)
```

### 2. Variables d'environnement — jamais dans git
Les `.env` contiennent des secrets. Ils sont dans `.gitignore`.
Pour déployer un nouveau `.env` : l'éditer manuellement sur le VPS.

### 3. Enum VideoStatus — MAJUSCULES
Dans `youtube-publisher`, l'enum PostgreSQL est en MAJUSCULES :
```python
# CORRECT
class VideoStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    READY = "READY"
    PUBLISHED = "PUBLISHED"
    FAILED = "FAILED"
    # etc.
```
Le frontend compare aussi en MAJUSCULES (`video.status === "READY"`).

### 4. Kie.ai API — endpoints corrects
```python
# Créer une tâche
POST /api/v1/jobs/createTask

# Vérifier le statut (PAS /jobs/detail)
GET /api/v1/jobs/recordInfo?taskId=xxx

# Parser le résultat
import json
url = json.loads(record["resultJson"])["resultUrls"][0]

# Statut succès (minuscule)
state == "success"
```

### 5. Images Kie.ai — télécharger immédiatement
Les URLs Kie.ai expirent rapidement. Toujours télécharger l'image/vidéo localement dès qu'elle est générée (ne pas stocker l'URL pour la télécharger plus tard).

### 6. n8n webhook — URL de production
```
PRODUCTION : https://automation.sterveshop.cloud/webhook/youtube-publish
TEST       : https://automation.sterveshop.cloud/webhook-test/youtube-publish
```
Le backend utilise toujours l'URL de production (sans `-test`).

### 7. PATCH status depuis n8n
Le backend accepte les deux casses grâce au validator Pydantic (normalization `.upper()`). Mais utiliser MAJUSCULES par convention :
- `PUBLISHED`, `FAILED`, `READY`

---

## Applications détaillées

### landing-rituel
- **Domain** : `rituel.sterveshop.cloud`
- **Stack** : HTML/CSS/JS + Nginx Alpine
- **Fichier principal** : `apps/landing-rituel/html/index.html` (tout-en-un)
- **Features** : Meta Pixel (4009568915963637), WhatsApp flottant (+21620706595), countdown timer, toasts social proof, section avant/après, FAQ
- **Liens produits** : `myfurbrush.com/rituelancestral7jours`, `cureprofonde40jours`, `packcompletancestral`
- **Déploiement** : `docker-compose restart landing-rituel` (juste nginx, rebuild rapide)

### youtube-publisher
- **Domains** : `app.youtube.sterveshop.cloud` (frontend), `api.youtube.sterveshop.cloud` (backend)
- **Stack** : FastAPI + PostgreSQL + Next.js
- **Pipeline** : Script (Claude) → Images (Kling 3.0 ou Flux-2 Pro) → Audio (ElevenLabs) → Assemblage (FFmpeg) → READY
- **Publication** : Manuel via bouton "Publier" → webhook n8n → YouTube Data API
- **Workflow n8n** : `youtube-publisher` (ID: ReS7bervr6Xkop7hcowDq) — actif
- **Format premium** : Kling 3.0 videos (lent, 10min+/scène)
- **Format économique** : Flux-2 Pro images + Ken Burns FFmpeg (rapide, 2-3min)
- **Assets** : `/app/assets/characters/` (photos référence personnages), `/app/assets/music/`
- **Outputs** : `/app/outputs/videos/`, `/app/outputs/thumbnails/`, `/app/outputs/images/`
- **Variables clés** : `ANTHROPIC_API_KEY`, `KIE_AI_API_KEY`, `ELEVENLABS_API_KEY`, `N8N_WEBHOOK_URL`, `BASE_URL`, `DATABASE_URL`

### tiktok-publisher (facebook-publisher)
- **Domains** : `facebook.sterveshop.cloud` (frontend), `api.facebook.sterveshop.cloud` (backend)
- **Stack** : FastAPI + PostgreSQL + Redis + Next.js
- **Pipeline** : Script (Claude, structure Hook→Produit→Problème/Solution) → Image (Kling) → Audio (ElevenLabs) → FFmpeg → READY
- **Pas de publication automatique** : L'utilisateur télécharge la vidéo et publie manuellement sur Facebook
- **Sales text** : Généré par Claude avec lien `rituel.sterveshop.cloud`
- **Formats** : `image_animee` (image IA + Ken Burns, rapide) ou `video_ia` (Kling, lent)
- **State management** : Zustand (`lib/store.ts`)
- **Variables clés** : `ANTHROPIC_API_KEY`, `KIE_AI_API_KEY`, `ELEVENLABS_API_KEY`, `DATABASE_URL`, `REDIS_URL`

### linkedin-publisher
- **Domains** : `app.linkedin.sterveshop.cloud` (frontend), `api.linkedin.sterveshop.cloud` (backend)
- **Stack** : FastAPI + PostgreSQL + Next.js
- **Pipeline** : Script (Claude) → Image (Kling 2.6 I2V avec photo référence utilisateur) → FFmpeg frame extraction → Post LinkedIn
- **Face consistency** : Photos référence dans `/app/assets/reference/`
- **Variables clés** : `ANTHROPIC_API_KEY`, `KIE_AI_API_KEY`, `N8N_WEBHOOK_URL`, `DATABASE_URL`

### site-vitrine
- **Domains** : `vitrine.sterveshop.cloud` (frontend), `api.sterveshop.cloud` (backend)
- **Stack** : FastAPI + PostgreSQL + Next.js
- **Features** : Formulaire contact, analyse IA (Claude), auth JWT, blog, notifications Telegram
- **Sécurité** : Rate limiting (SlowAPI), bcrypt, JWT
- **Variables clés** : `ANTHROPIC_API_KEY`, `DATABASE_URL`, `N8N_WEBHOOK_URL`, `TELEGRAM_BOT_TOKEN`, `SECRET_KEY`

### n8n
- **Domain** : `automation.sterveshop.cloud`
- **Port interne** : 5678
- **Workflows actifs** :
  - `youtube-publisher` (ReS7bervr6Xkop7hcowDq) — upload YouTube + thumbnail
  - `linkedin-publisher` (egjGrTP4garbZAZfQik2W) — publication LinkedIn
  - `tiktok-publisher` (YCtkIGoAuozC4fwH) — publication TikTok
  - `Chariow - Séquence Post-Achat` (TCUGrVMxDJv5GWNn) — séquence email

---

## Pattern d'une nouvelle app

Pour créer une nouvelle app publisher, copier le pattern de `youtube-publisher` :

```
apps/nouvelle-app/
├── docker-compose.yml          # Services: backend, frontend, postgres
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env                    # Jamais dans git
│   └── src/app/
│       ├── main.py             # FastAPI + lifespan + CORS
│       ├── models/             # SQLAlchemy models
│       ├── schemas/            # Pydantic schemas
│       ├── api/routes/         # Endpoints
│       ├── services/           # Business logic (IA, pipeline)
│       └── core/               # Config, database
└── frontend/
    ├── Dockerfile              # Multi-stage: deps → builder → runner
    ├── package.json
    ├── .env.local              # NEXT_PUBLIC_API_URL=https://api.xxx.sterveshop.cloud
    └── app/                    # Next.js App Router
```

**Checklist nouvelle app** :
- [ ] Ajouter le réseau `traefik-network` dans docker-compose.yml
- [ ] Labels Traefik pour routing HTTPS
- [ ] Variables d'env dans `.env` (jamais committées)
- [ ] CORS configuré dans FastAPI pour le domaine frontend
- [ ] `BASE_URL` dans config.py pour les URLs publiques
- [ ] Volumes nommés pour la persistance des données

---

## Commandes fréquentes sur le VPS

```bash
# Voir les logs d'une app
docker logs youtube-publisher-backend --tail 50 -f

# Appliquer un fix backend sans rebuild
docker cp backend/src/app/services/mon_fichier.py container:/app/app/services/mon_fichier.py
docker-compose restart backend

# Voir les valeurs d'un enum PostgreSQL
docker exec -it youtube-publisher-postgres psql -U postgres -d youtube_publisher \
  -c "SELECT enum_range(NULL::videostatus);"

# Reset statut vidéo bloquée
docker exec -it youtube-publisher-postgres psql -U postgres -d youtube_publisher \
  -c "UPDATE videos SET status='READY' WHERE status='UPLOADING';"

# Vérifier les variables d'environnement d'un container
docker exec container-name env | grep MA_VARIABLE
```

---

## APIs externes utilisées

| Service | Usage | Documentation |
|---------|-------|---------------|
| Anthropic Claude | Génération scripts, textes | claude-3-5-sonnet |
| Kie.ai | Images (Flux-2 Pro) et vidéos (Kling 3.0) | `/api/v1/jobs/createTask` + `/api/v1/jobs/recordInfo` |
| ElevenLabs | Voix off (eleven_multilingual_v2) | voice ID configurable |
| FFmpeg | Assemblage vidéo, Ken Burns, sous-titres SRT | installé dans le container backend |
| YouTube Data API v3 | Upload vidéo + thumbnail | OAuth2 via n8n |
| Meta Pixel | Tracking Facebook | ID: 4009568915963637 (landing-rituel) |
