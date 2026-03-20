# Documentation — Multi-App-Docker Platform

Plateforme de génération de contenu IA et publication automatisée sur réseaux sociaux.
Déployée sur VPS Hostinger, domaine `sterveshop.cloud`.

---

## Table des matières

1. [Infrastructure](#1-infrastructure)
2. [Applications](#2-applications)
3. [Pipeline vidéo IA](#3-pipeline-vidéo-ia)
4. [Workflow de publication n8n](#4-workflow-de-publication-n8n)
5. [Déploiement d'une nouvelle instance](#5-déploiement-dune-nouvelle-instance)
6. [Variables d'environnement](#6-variables-denvironnement)
7. [Maintenance & commandes utiles](#7-maintenance--commandes-utiles)

---

## 1. Infrastructure

### Architecture globale

```
Internet
    │
    ▼
Traefik (80/443) ── Let's Encrypt SSL automatique
    │
    ├── rituel.sterveshop.cloud          → landing-rituel
    ├── app.youtube.sterveshop.cloud     → youtube-publisher (frontend)
    ├── api.youtube.sterveshop.cloud     → youtube-publisher (backend)
    ├── facebook.sterveshop.cloud        → facebook-publisher (frontend)
    ├── api.facebook.sterveshop.cloud    → facebook-publisher (backend)
    ├── app.linkedin.sterveshop.cloud    → linkedin-publisher (frontend)
    ├── api.linkedin.sterveshop.cloud    → linkedin-publisher (backend)
    ├── vitrine.sterveshop.cloud         → site-vitrine (frontend)
    ├── api.sterveshop.cloud             → site-vitrine (backend)
    └── automation.sterveshop.cloud      → n8n
```

### Réseau Docker
Toutes les apps partagent le réseau `traefik-network` (external).
Chaque app crée ses propres réseaux internes pour isoler ses services.

### Structure des dossiers sur le VPS
```
/docker/
└── apps/
    ├── landing-rituel/
    ├── youtube-publisher/
    ├── tiktok-publisher/      (facebook-publisher)
    ├── linkedin-publisher/
    ├── site-vitrine/
    ├── n8n/
    └── traefik/
```

---

## 2. Applications

### 2.1 Landing-Rituel — Page de vente produit
**URL** : `https://rituel.sterveshop.cloud`
**Stack** : HTML/CSS/JavaScript + Nginx Alpine
**Fichier unique** : `html/index.html`

**Fonctionnalités** :
- Countdown timer (persistance localStorage)
- Toasts social proof (achats récents simulés, cycle 12s)
- Section Avant/Après produit
- FAQ complète (moyens de paiement : Wave, Orange Money, MTN MoMo, Visa, Mastercard, Crypto)
- 3 offres produits en grille (Rituel 7j, Cure 40j, Pack Complet)
- WhatsApp flottant (+21620706595)
- Meta Pixel Facebook (ID : 4009568915963637)

**Liens produits** :
- `https://myfurbrush.com/rituelancestral7jours`
- `https://myfurbrush.com/cureprofonde40jours`
- `https://myfurbrush.com/packcompletancestral`

**Déploiement** : `docker-compose restart landing-rituel`

---

### 2.2 YouTube Publisher — Pipeline vidéo IA pour YouTube
**URLs** :
- Frontend : `https://app.youtube.sterveshop.cloud`
- API : `https://api.youtube.sterveshop.cloud`

**Stack** :
- Backend : Python 3.11 + FastAPI + PostgreSQL
- Frontend : Next.js + React + TypeScript + Tailwind
- IA : Claude (script) + Kie.ai Kling/Flux (visuels) + ElevenLabs (voix)
- Assemblage : FFmpeg

**Flux complet** :
```
Formulaire (topic + style + format + épisode)
    ↓
Claude génère le script (5-8 scènes, titre, description, tags)
    ↓
Kie.ai génère les visuels (Kling 3.0 vidéo OU Flux-2 Pro image)
    ↓
ElevenLabs génère la voix off par scène
    ↓
FFmpeg assemble : visuels + voix + musique + sous-titres + miniature
    ↓
Statut READY → bouton "Publier" disponible
    ↓
Clic "Publier" → webhook n8n → Upload YouTube + Set Thumbnail
    ↓
Statut PUBLISHED + URL YouTube enregistrée
```

**Formats disponibles** :
| Format | Modèle | Durée génération | Qualité |
|--------|--------|-----------------|---------|
| Économique | Flux-2 Pro (images) + Ken Burns | 3-5 min | Bonne |
| Premium | Kling 3.0 (vidéos courtes) | 15-30 min | Excellente |

**Séries & épisodes** :
- Gestion de séries avec continuité narrative
- Résumé automatique de l'épisode précédent injecté dans le prompt
- Personnages avec photos de référence (`/app/assets/characters/`)

**Workflow n8n** : `youtube-publisher` (ID: ReS7bervr6Xkop7hcowDq)
- Reçoit le webhook POST
- Télécharge la vidéo depuis l'API
- Upload sur YouTube (OAuth2)
- Télécharge et set la miniature via YouTube Data API v3
- PATCH retour → statut PUBLISHED + youtube_url

---

### 2.3 Facebook Publisher (tiktok-publisher) — Vidéos pub Facebook
**URLs** :
- Frontend : `https://facebook.sterveshop.cloud`
- API : `https://api.facebook.sterveshop.cloud`

**Stack** :
- Backend : Python 3.11 + FastAPI + PostgreSQL + Redis
- Frontend : Next.js + Zustand (state) + Tailwind
- IA : Claude (script) + Kie.ai (visuels) + ElevenLabs (voix)

**Spécificité** : Pas de publication automatique — l'utilisateur télécharge la vidéo et publie manuellement.

**Structure script** (3 phases) :
1. **HOOK** — Accroche choc (3-5s)
2. **PRODUIT** — Présentation du produit
3. **PROBLÈME/SOLUTION** — Problème identifié + solution proposée

**Contenu généré** :
- Script voix off éditable
- Sous-titres/captions éditables
- Texte de vente Facebook (avec lien `rituel.sterveshop.cloud`)
- Hashtags Facebook (5 tags)

**Formats** : `image_animee` (recommandé, rapide) ou `video_ia` (lent)
**Durées** : 15s, 30s, 60s

---

### 2.4 LinkedIn Publisher — Images IA pour LinkedIn
**URLs** :
- Frontend : `https://app.linkedin.sterveshop.cloud`
- API : `https://api.linkedin.sterveshop.cloud`

**Stack** : FastAPI + PostgreSQL + Next.js

**Pipeline** :
- Claude génère le texte du post et le prompt image
- Kling 2.6 I2V génère une image avec cohérence de visage (photo référence)
- FFmpeg extrait le frame
- Publication via n8n

---

### 2.5 Site Vitrine — Site professionnel avec IA
**URLs** :
- Frontend : `https://vitrine.sterveshop.cloud`
- API : `https://api.sterveshop.cloud`

**Features** :
- Formulaire de contact avec analyse IA (Claude)
- Authentification JWT (admin)
- Blog
- Notifications Telegram
- Rate limiting
- Intégration n8n pour workflow automatisé

---

### 2.6 N8N — Moteur d'automation
**URL** : `https://automation.sterveshop.cloud`

**Workflows actifs** :
| Nom | ID | Déclencheur |
|-----|----|------------|
| youtube-publisher | ReS7bervr6Xkop7hcowDq | Webhook POST /youtube-publish |
| linkedin-publisher | egjGrTP4garbZAZfQik2W | Webhook |
| tiktok-publisher | YCtkIGoAuozC4fwH | Webhook |
| Chariow Post-Achat | TCUGrVMxDJv5GWNn | Trigger e-commerce |

---

## 3. Pipeline vidéo IA

### Services impliqués

#### Claude (Anthropic)
- Modèle : `claude-3-5-sonnet-20241022`
- Usage : Génération de scripts structurés (JSON)
- Output : titre, description, scènes (narration + prompt image), tags, résumé épisode

#### Kie.ai
- **Flux-2 Pro** : Génération d'images statiques 16:9 (format économique)
- **Kling 3.0** : Génération de vidéos courtes avec cohérence personnages (format premium)
- Endpoints :
  - `POST /api/v1/jobs/createTask` — lancer une génération
  - `GET /api/v1/jobs/recordInfo?taskId=xxx` — vérifier le statut
  - Statut succès : `state == "success"`
  - Récupérer l'URL : `json.loads(record["resultJson"])["resultUrls"][0]`
- **Important** : Télécharger l'image/vidéo immédiatement (URLs expirantes)

#### ElevenLabs
- Modèle : `eleven_multilingual_v2`
- Voice ID : configurable dans `.env`
- Usage : Voix off par scène

#### FFmpeg
- Ken Burns effect sur images (zoom/pan animé)
- Concaténation des scènes vidéo
- Ajout musique de fond (calme, épique, mystérieux selon style)
- Sous-titres ASS/SRT incrustés
- Génération miniature (Pillow + FFmpeg)

### Statuts pipeline (youtube-publisher)
```
DRAFT → SCRIPTING → GENERATING_IMAGES → GENERATING_AUDIO → ASSEMBLING → READY → UPLOADING → PUBLISHED
                                                                                            ↘ FAILED
```

---

## 4. Workflow de publication n8n

### youtube-publisher workflow

```
Webhook (POST /youtube-publish)
    ↓
Get Video Details (GET /api/videos/{id})
    ↓
Download Video (GET /api/videos/{id}/download → binary)
    ↓
Upload to YouTube (YouTube OAuth2)
    ↓
Upload OK ? (check uploadId not empty)
    ├── OUI →
    │   Download Thumbnail (GET /api/videos/{id}/thumbnail → binary)
    │       ↓ (continue même si erreur)
    │   Set Thumbnail API (POST googleapis.com/upload/youtube/v3/thumbnails/set)
    │       ↓
    │   PATCH → PUBLISHED (/api/videos/{id} body: {status: "PUBLISHED", youtube_url, youtube_video_id})
    │
    └── NON →
        PATCH → FAILED (/api/videos/{id} body: {status: "FAILED"})
```

### Payload webhook envoyé par le backend
```json
{
  "video_id": 5,
  "title": "Ep.1 : Titre de l'épisode",
  "description": "Description YouTube...",
  "tags": ["tag1", "tag2"],
  "video_path": "/app/outputs/videos/video_5.mp4",
  "thumbnail_path": "/app/outputs/thumbnails/video_5_thumbnail.jpg",
  "download_url": "https://api.youtube.sterveshop.cloud/api/videos/5/download",
  "thumbnail_url": "https://api.youtube.sterveshop.cloud/api/videos/5/thumbnail"
}
```

---

## 5. Déploiement d'une nouvelle instance

### Prérequis
1. VPS avec Docker + Docker Compose installés
2. Domaine configuré (DNS A record → IP VPS)
3. Traefik réseau créé : `docker network create traefik-network`
4. Traefik démarré (`/docker/traefik/`)

### Étapes pour cloner une app publisher

**1. Copier le dossier de l'app template**
```bash
cp -r apps/youtube-publisher apps/mon-nouveau-publisher
```

**2. Adapter `docker-compose.yml`**
- Changer les noms de containers
- Changer les domaines dans les labels Traefik
- Changer les noms de volumes et réseaux
- Changer les ports hôte si nécessaire

**3. Créer le fichier `.env`**
```bash
cp backend/.env.example backend/.env
# Remplir les valeurs : ANTHROPIC_API_KEY, KIE_AI_API_KEY, etc.
```

**4. Créer le réseau Traefik si pas encore fait**
```bash
docker network create traefik-network
```

**5. Démarrer**
```bash
docker-compose up -d
```

**6. Vérifier**
```bash
docker-compose ps
docker logs backend-container --tail 20
```

### Template docker-compose.yml pour une nouvelle app
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    container_name: mon-app-backend
    env_file: ./backend/.env
    volumes:
      - outputs:/app/outputs
    networks:
      - traefik-network
      - internal
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.mon-app-api.rule=Host(`api.mon-app.sterveshop.cloud`)"
      - "traefik.http.routers.mon-app-api.tls.certresolver=letsencrypt"
      - "traefik.http.services.mon-app-api.loadbalancer.server.port=8000"

  frontend:
    build: ./frontend
    container_name: mon-app-frontend
    networks:
      - traefik-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.mon-app.rule=Host(`mon-app.sterveshop.cloud`)"
      - "traefik.http.routers.mon-app.tls.certresolver=letsencrypt"
      - "traefik.http.services.mon-app.loadbalancer.server.port=3000"

  postgres:
    image: postgres:15
    container_name: mon-app-postgres
    environment:
      POSTGRES_DB: mon_app
      POSTGRES_USER: mon_user
      POSTGRES_PASSWORD: mon_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - internal

networks:
  traefik-network:
    external: true
  internal:

volumes:
  postgres_data:
  outputs:
```

---

## 6. Variables d'environnement

### Variables communes à toutes les apps

| Variable | Description | Requis |
|----------|-------------|--------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | ✅ |
| `ANTHROPIC_API_KEY` | Clé API Claude | ✅ |
| `KIE_AI_API_KEY` | Clé API Kie.ai (Kling, Flux) | ✅ |
| `ELEVENLABS_API_KEY` | Clé API ElevenLabs | ✅ (si voix) |
| `ELEVENLABS_VOICE_ID` | ID de la voix ElevenLabs | ✅ (si voix) |
| `N8N_WEBHOOK_URL` | URL webhook n8n production | ✅ (si publication) |
| `BASE_URL` | URL publique de l'API (ex: `https://api.xxx.sterveshop.cloud`) | ✅ |
| `DEBUG` | `True` ou `False` | ❌ |

### Variables optionnelles

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Notifications Telegram |
| `TELEGRAM_CHAT_ID` | Chat ID Telegram |
| `REPLICATE_API_TOKEN` | Modèles alternatifs Replicate |
| `REDIS_URL` | Redis pour cache/sessions |
| `SECRET_KEY` | JWT signing (auth) |
| `AFFILIATE_LINK` | Lien affilié dans les contenus |

### Variables frontend (`.env.local`)
```env
NEXT_PUBLIC_API_URL=https://api.mon-app.sterveshop.cloud
```

---

## 7. Maintenance & commandes utiles

### Déploiement d'une mise à jour
```bash
# Sur le VPS
cd /docker/apps/mon-app

# Récupérer les dernières modifications
git pull origin master

# Option A : Fichier Python modifié (rapide, ~5s)
docker cp backend/src/app/services/mon_service.py container:/app/app/services/mon_service.py
docker-compose restart backend

# Option B : Frontend modifié (lent, rebuild Next.js)
docker-compose up -d --build frontend

# Option C : Dockerfile ou requirements.txt modifiés (très lent)
docker-compose up -d --build
```

### Debugging
```bash
# Logs en temps réel
docker logs mon-app-backend --tail 50 -f

# Logs frontend
docker logs mon-app-frontend --tail 20

# Entrer dans un container
docker exec -it mon-app-backend bash

# Vérifier les variables d'env
docker exec mon-app-backend env | grep API_KEY

# État des containers
docker-compose ps
```

### Base de données
```bash
# Accéder à PostgreSQL
docker exec -it mon-app-postgres psql -U postgres -d ma_db

# Lister les tables
\dt

# Voir les valeurs d'un enum
SELECT enum_range(NULL::videostatus);

# Réinitialiser un statut bloqué
UPDATE videos SET status='READY' WHERE status='UPLOADING';

# Backup
docker exec mon-app-postgres pg_dump -U postgres ma_db > backup.sql
```

### Traefik & SSL
```bash
# Voir les certificats
ls /docker/traefik/letsencrypt/

# Logs Traefik (routing, certificats)
docker logs traefik --tail 50

# Renouvellement SSL (automatique, mais forçable)
docker-compose restart traefik
```

### N8N
- Interface : `https://automation.sterveshop.cloud`
- Accès API MCP disponible pour modifier les workflows programmatiquement
- Toujours utiliser l'URL **production** (sans `-test`) dans les `.env`
- En cas de modification de workflow : désactiver → modifier → réactiver

---

## Contacts & ressources

- **Boutique** : `https://rituel.sterveshop.cloud`
- **WhatsApp support** : +21620706595
- **Kie.ai docs** : API v1 — `https://api.kie.ai/api/v1/`
- **ElevenLabs** : `https://elevenlabs.io`
- **Anthropic** : `https://console.anthropic.com`
- **N8N** : `https://automation.sterveshop.cloud`
