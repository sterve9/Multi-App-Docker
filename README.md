# Multi-App-Docker Architecture

Infrastructure complète avec Docker, Traefik, et automatisation n8n pour gérer site vitrine et workflows IA.

---

## 📋 Services

### 1. Site Vitrine
- **URL** : https://vitrine.sterveshop.cloud
- **Description** : Site vitrine professionnel avec formulaire de contact
- **Tech Stack** : HTML5, CSS3, JavaScript vanilla, Nginx
- **Chemin** : `/docker/apps/site-vitrine`

### 2. Backend IA
- **URL** : `/api` (exposé localement ou via Traefik)
- **Description** : Analyse projet + génération workflow avec Claude + n8n
- **Tech Stack** : Python, FastAPI
- **Chemin** : `/docker/apps/site-vitrine/backend`
- **Endpoints principaux** :
  - `/api/contact` : Reçoit formulaire client
  - `/api/analyze` : Analyse texte avec Claude
  - `/api/create-workflow` : Crée workflow n8n automatiquement

### 3. n8n Automation
- **URL** : https://automation.sterveshop.cloud
- **Description** : Plateforme d'automatisation des workflows
- **Tech Stack** : n8n, Node.js
- **Chemin** : `/docker/apps/n8n`

### 4. Traefik
- **Description** : Reverse proxy + HTTPS automatique
- **Réseau** : traefik-network
- **Chemin** : `/docker/traefik`

---

## 🏗️ Architecture

```text
Internet
   ↓
Traefik (reverse proxy + HTTPS)
   ↓
traefik-network
   ├── vitrine.sterveshop.cloud → site-vitrine-frontend
   ├── backend API → /api (FastAPI)
   └── automation.sterveshop.cloud → n8n
🚀 Déploiement
Prérequis
Docker & Docker Compose

Nom de domaine configuré

Accès SSH au serveur

Workflow de déploiement
# 1️⃣ Développement local
# (VS Code, Live Server pour frontend, uvicorn pour backend)
# 2️⃣ Commit & push sur GitHub
git add .
git commit -m "Mise à jour README et infra"
git push origin main

# 3️⃣ SSH sur serveur
ssh user@serveur

# 4️⃣ Pull des dernières modifications
cd /chemin/du/projet
git pull origin main

# 5️⃣ Rebuild des containers
docker-compose up -d --build
🔧 Commandes Docker utiles
# Voir les containers actifs
docker ps

# Voir logs d'un service
docker logs -f nom_container

# Redémarrer un service
docker-compose restart

# Rebuild complet
docker-compose up -d --build --force-recreate
🌐 DNS Configuration
Type	Nom	Valeur	TTL
A	vitrine	72.62.89.162	300
A	automation	72.62.89.162	300
