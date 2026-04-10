# 🌿 Farm Manager — Documentation Technique

**Application de gestion agrumicole intelligente**  
Développeur : Sterve — SterveAI Systems  
URL production : [ferme.sterveshop.cloud](https://ferme.sterveshop.cloud)  
Dernière mise à jour : Avril 2026

---

## Table des matières

1. [Présentation générale](#1-présentation-générale)
2. [Stack technique](#2-stack-technique)
3. [Architecture](#3-architecture)
4. [Fonctionnalités livrées](#4-fonctionnalités-livrées)
5. [Système de rôles](#5-système-de-rôles)
6. [Automatisations N8N](#6-automatisations-n8n)
7. [Variables d'environnement](#7-variables-denvironnement)
8. [Déploiement sur un nouveau serveur](#8-déploiement-sur-un-nouveau-serveur)
9. [Gestion des utilisateurs](#9-gestion-des-utilisateurs)
10. [Commandes serveur utiles](#10-commandes-serveur-utiles)
11. [Axes d'évolution](#11-axes-dévolution)

---

## 1. Présentation générale

Farm Manager est une application web full-stack dédiée à la gestion d'exploitations agrumicoles.  
Elle couvre l'ensemble du cycle opérationnel : parcelles, traitements phytosanitaires, récoltes, stocks d'intrants, fertilisation, bilan financier et intelligence artificielle agronomique.

**Problèmes résolus :**
- Fin des tableaux Excel non partagés et perdus
- Suivi en temps réel des stocks de produits (engrais, pesticides, fertilisants)
- Alertes automatiques au patron quand un stock est critique
- Bilan financier de chaque saison calculé automatiquement
- Assistant IA qui analyse les données réelles de la ferme
- Analyse d'images terrain : photo d'une feuille ou d'un arbre → diagnostic Claude
- Gestion multi-utilisateurs avec accès cloisonné par ferme

---

## 2. Stack technique

| Composant | Technologie |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS 3 |
| Backend | FastAPI (Python 3.11), SQLAlchemy 2.0, Pydantic v2 |
| Base de données | PostgreSQL 15 |
| Authentification | JWT Bearer (token 24h), passlib/bcrypt |
| Intelligence artificielle | Anthropic Claude API (claude-sonnet-4-6), Vision multimodale |
| Météo | Open-Meteo API (gratuite, sans clé) |
| Automatisations | N8N (webhooks + cron jobs) |
| Emails | Brevo (SMTP relay) |
| Infrastructure | Docker Compose, Traefik (reverse proxy + HTTPS Let's Encrypt) |
| Hébergement | VPS Hostinger (Ubuntu) |
| Icons | Lucide React |
| HTTP Client | Axios avec intercepteurs JWT |

---

## 3. Architecture

```
Internet
   │
   ▼
Traefik (HTTPS + reverse proxy)
   ├── ferme.sterveshop.cloud        → farm-frontend (Next.js :3000)
   └── ferme.sterveshop.cloud/api    → farm-backend  (FastAPI :8000)
                                           │
                                      farm-db (PostgreSQL :5432)
                                      [réseau interne farm-internal]
```

### Réseau Docker
- `farm-internal` : réseau privé entre backend et DB
- `traefik-network` : réseau externe partagé avec Traefik

### Routers backend (`/api`)

| Préfixe | Fichier | Description |
|---|---|---|
| `/fermes` | `fermes.py` | CRUD fermes, dashboard, stats, planning |
| `/parcelles` | `parcelles.py` | CRUD parcelles |
| `/traitements` | `traitements.py` | CRUD traitements, déduction stock auto |
| `/recoltes` | `recoltes.py` | CRUD récoltes |
| `/stocks` | `stocks.py` | CRUD stocks, alertes, prédiction rupture |
| `/mouvements` | `mouvements.py` | Historique entrées/sorties stock |
| `/sessions` | `sessions.py` | Confirmation session fertilisation |
| `/recommandations` | `recommandations.py` | CRUD recommandations |
| `/bilan` | `bilan.py` | Bilan saison + comparaison N-1 |
| `/ai` | `ai.py` | Chat IA + analyse + analyse image |
| `/users` | `users.py` | Gestion utilisateurs (admin) |
| `/excel` | `excel.py` | Export Excel bilan |
| `/pdf` | `pdf.py` | Génération PDF bilan |
| `/auth` | `main.py` | Login JWT |

---

## 4. Fonctionnalités livrées

Toutes les fonctionnalités ci-dessous sont **en production**.

---

### 🏠 Tableau de bord (`/`)

- Vue synthétique par ferme avec sélecteur
- Compteurs animés : parcelles actives, arbres, récoltes de l'année, alertes stock
- Widget météo temps réel (Open-Meteo) : température, conditions, pluie en cours
- Prévisions 5 jours avec alertes automatiques si pluie > 1mm ("reporter pulvérisation")
- Graphiques de récoltes de l'année en cours par variété (barres animées)
- Niveaux de stock par produit avec code couleur (vert / orange / rouge)
- Création et suppression de fermes

---

### 🗺️ Parcelles (`/parcelles`)

- Vue liste et vue plan (bascule Liste / Plan)
- **Vue plan** : rectangles proportionnels à la surface (ha), colorés par variété, cliquables pour éditer
- Fiche complète : nom, variété, surface (ha), nombre d'arbres, année plantation, statut, notes
- Variétés disponibles : citron, orange, mandarine, clémentine, pamplemousse, autre
- Statuts : en production / en repos / replantation
- Header avec stats : total parcelles / en production / nombre d'arbres total

---

### 💉 Traitements (`/traitements`)

- Enregistrement de chaque intervention par parcelle
- Lien avec un stock → **déduction automatique** de la quantité à la création
- Types : pesticide / engrais / irrigation / taille / autre (avec icônes et couleurs distinctes)
- Filtre par parcelle
- Header avec stats : total / pesticides / engrais / irrigation

---

### 🍋 Récoltes (`/recoltes`)

- Saisie : parcelle, date, quantité (kg), qualité, destination, prix/kg, notes
- Calcul automatique de la valeur par entrée
- Totaux en temps réel : kg total + valeur totale (TND)
- Filtre par parcelle et par année
- Header avec stats : entrées / kg récoltés / valeur totale TND

---

### 📦 Stocks (`/stocks`)

- Stocks liés à chaque ferme séparément
- Seuil d'alerte configurable par produit
- **Prédiction de rupture** : date estimée de rupture et consommation hebdomadaire (basées sur les 30 derniers jours)
- Mode achat fournisseur : saisie en unités × poids → total calculé automatiquement, prix unitaire mémorisé
- Historique complet des mouvements (entrées/sorties) avec coût
- Déclenchement automatique du webhook N8N si stock < seuil
- Header avec stats : articles / alertes (rouge) / articles ok

---

### 🗓️ Planning fertilisation (`/planning`)

- Configuration par ferme : nombre de vannes + jours de fertilisation (ex: "lundi,mercredi,vendredi")
- Dose par vanne configurable par produit (kg, L, g, mL...)
- Planning visuel sur 3 semaines à venir avec calcul des sessions
- **Confirmation de session en 1 clic** → déduction automatique de tous les produits liés
- Calcul des semaines restantes par produit selon la dose et le stock
- Alerte visuelle si un produit est insuffisant pour la prochaine session

---

### 📋 Recommandations (`/recommandations`)

Trois sources distinctes, visuellement différenciées :

| Source | Barre couleur | Badge |
|---|---|---|
| **Directive patron** (admin) | Violet | 🛡 Directive patron |
| **Conseil ingénieur** | Bleu | 🔬 Conseil ingénieur |
| **IA - Claude** | Vert | ✨ IA - Claude |

- Priorités : Haute (rouge) / Normale (orange) / Basse (gris)
- Statuts : En attente / Appliquée / Ignorée
- L'auteur est **auto-rempli** selon le compte connecté (nom réel)
- Le gestionnaire voit les recommandations de sa ferme mais ne peut pas créer/éditer
- Header avec stats : total / en attente / appliquées

---

### 📊 Bilan de saison (`/bilan`)

- Par ferme et par année (sélecteurs)
- KPIs : total récoltes (kg + TND), total dépenses, marge brute (avec couleur selon positif/négatif)
- Top dépenses par produit avec barres proportionnelles
- Récoltes par variété
- **Comparaison N-1** : tableau variété par variété avec évolution en % (flèches haut/bas/stable)
- Export **PDF** immédiat (bouton)
- Export **Excel** (.xlsx, 5 feuilles : Résumé, Récoltes, Traitements, Stocks, Recommandations)
- Header avec stats : kg récoltés / CA / marge brute

---

### 🤖 Assistant IA (`/ia`)

- Chat conversationnel avec Claude (claude-sonnet-4-6)
- Répond en français ou en arabe selon la langue de la question
- Contexte injecté automatiquement : parcelles, stocks, traitements 90 jours, récoltes de l'année, recommandations en attente, météo en temps réel
- **Analyse d'images** : bouton photo pour envoyer JPG/PNG/WebP jusqu'à 5 MB
  - Photo d'une feuille → diagnostic carence ou maladie
  - Photo d'un fruit → évaluation maturité
  - Photo d'un arbre → symptômes visibles
- Bouton **"Analyser"** : Claude analyse la ferme → génère 3 à 6 recommandations sauvegardées en DB
- Affichage de l'image envoyée dans la bulle de conversation

---

### ⚙️ Paramètres (`/parametres`)

**Section "Mon compte" (tous les rôles) :**
- Nom, identifiant, badge de rôle

**Section "Utilisateurs" (admin uniquement) :**
- Liste de tous les utilisateurs avec rôles
- Créer un utilisateur (nom, identifiant, mot de passe, rôle)
- Supprimer un utilisateur
- Changer le mot de passe d'un utilisateur

**Section "Fermes — Responsables" (admin uniquement) :**
- Liste toutes les fermes avec le responsable assigné
- Assigner ou réassigner une ferme à un gestionnaire en 1 clic
- Un gestionnaire non assigné ne voit aucune ferme

---

## 5. Système de rôles

Trois rôles disponibles, gérés par l'admin depuis `/parametres` :

| Rôle | Icône | Fermes visibles | Peut créer/éditer | Gestion utilisateurs |
|---|---|---|---|---|
| **admin** | 🛡 Bouclier vert | Toutes | Oui | Oui |
| **ingenieur** | 🔬 Flacon bleu | Toutes | Oui (pas utilisateurs) | Non |
| **gestionnaire** | 👤 Silhouette grise | Uniquement sa ferme assignée | Oui (sur sa ferme) | Non |

**Règles d'accès :**
- Le gestionnaire ne voit que les parcelles, traitements, récoltes, stocks, recommandations et bilan de **sa ferme assignée**
- Si une ferme n'est pas assignée à un gestionnaire, il ne voit rien
- L'admin assigne les fermes depuis Paramètres → "Fermes — Responsables"
- Les ingénieurs et admins voient tout sans restriction

**Créer un compte gestionnaire (workflow complet) :**
1. Admin → Paramètres → Utilisateurs → Ajouter
2. Remplir nom, identifiant, mot de passe, rôle = Gestionnaire
3. Admin → Paramètres → Fermes — Responsables → clic sur la ferme → sélectionner le gestionnaire
4. Communiquer l'identifiant et mot de passe au gestionnaire

---

## 6. Automatisations N8N

Instance N8N : `automation.sterveshop.cloud`

### Workflows actifs

| Workflow | Déclencheur | Action |
|---|---|---|
| `farm-manager` | Stock < seuil (webhook) | Email alerte patron |
| `farm-manager-analyse-hebdo` | Chaque lundi 8h | Analyse IA toutes fermes + email récap |
| `farm-manager-bilan-mensuel` | 1er du mois 8h | Génère PDF + email patron |

### Workflow Devis Automatique (landing)

Fichier : `apps/farm-landing/workflow-devis.json`

| Étape | Action |
|---|---|
| Webhook `/farm-devis` | Reçoit données formulaire landing |
| Claude (claude-sonnet-4-6) | Génère devis personnalisé selon situation |
| Email → Prospect | Email HTML stylisé avec devis |
| Email → Admin | Notification avec données + devis |

**Configuration requise dans N8N :**
- Credentials **Anthropic API** : clé `sk-ant-...`
- Credentials **SMTP Brevo** : host `smtp-relay.brevo.com`, port 587
- Workflow `farm-manager-analyse-hebdo` : variables `FARM_USERNAME` + `FARM_PASSWORD`

---

## 7. Variables d'environnement

Fichier `.env` à créer à la racine de `apps/farm-app/` :

```env
# Base de données
POSTGRES_DB=farm_db
POSTGRES_USER=farm_user
POSTGRES_PASSWORD=motdepasse_securise

# Authentification
SECRET_KEY=une_cle_secrete_longue_et_aleatoire
ADMIN_USERNAME=patron
ADMIN_PASSWORD_HASH=$2b$12$...  # hash bcrypt

# API Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-XXXXXXXXXXXXXXXXXXXX

# CORS
FRONTEND_URL=https://ferme.sterveshop.cloud

# N8N Webhook (alertes stocks)
N8N_WEBHOOK_URL=https://automation.sterveshop.cloud/webhook/farm-manager
```

### Générer le hash du mot de passe admin

```bash
# En local (Python installé)
python -c "from passlib.context import CryptContext; ctx = CryptContext(schemes=['bcrypt']); print(ctx.hash('VotreMotDePasse'))"

# Via Docker (si Python non installé localement)
docker run --rm python:3.11-slim python -c \
  "from passlib.context import CryptContext; ctx = CryptContext(schemes=['bcrypt']); print(ctx.hash('VotreMotDePasse'))"
```

---

## 8. Déploiement sur un nouveau serveur

### Prérequis
- VPS Ubuntu 22.04+
- Docker + Docker Compose installés
- Traefik opérationnel sur le réseau `traefik-network`
- DNS configuré : `ferme.VOTREDOMAINE.com` → IP du VPS

### Étapes

```bash
# 1. Cloner le repo
git clone https://github.com/sterve9/Multi-App-Docker.git /docker
cd /docker/apps/farm-app

# 2. Créer le fichier .env
cp .env.example .env
nano .env
# → Remplir toutes les variables (voir section 7)
# → Changer le domaine dans docker-compose.yml si différent de ferme.sterveshop.cloud

# 3. Adapter le domaine dans docker-compose.yml
# Remplacer "ferme.sterveshop.cloud" par votre domaine dans :
# - traefik.http.routers.farm-api.rule
# - traefik.http.routers.farm-frontend.rule
# - NEXT_PUBLIC_API_URL (build arg frontend)

# 4. Lancer
docker compose up --build -d

# 5. Vérifier
docker compose ps
docker compose logs -f farm-backend
```

### Changement de domaine (checklist)

Lors du déploiement pour un nouveau client, modifier dans `docker-compose.yml` :
- [ ] `Host(\`ferme.sterveshop.cloud\`)` × 2 (backend + frontend)
- [ ] `NEXT_PUBLIC_API_URL: https://ferme.sterveshop.cloud/api`
- [ ] `FRONTEND_URL` dans `.env`

Et dans N8N : mettre à jour les URLs des webhooks et des appels API.

---

## 9. Gestion des utilisateurs

### Premier démarrage

Au premier lancement, si la table `users` est vide, le backend crée automatiquement un compte admin avec les credentials du `.env` :
- `ADMIN_USERNAME` → identifiant
- `ADMIN_PASSWORD_HASH` → mot de passe haché

Les fermes existantes sans propriétaire (`owner_id IS NULL`) sont automatiquement assignées à cet admin.

### Créer des utilisateurs supplémentaires

Uniquement via l'interface → Paramètres → Utilisateurs (compte admin requis).  
**Il n'y a pas de commande CLI pour créer des utilisateurs** — tout se fait depuis l'UI.

### Changer le mot de passe d'un utilisateur

Via l'interface → Paramètres → icône clé à côté de l'utilisateur.

---

## 10. Commandes serveur utiles

```bash
# Démarrer l'application
docker compose up -d

# Rebuilder après un git pull
git pull && docker compose up --build -d

# Logs en direct
docker compose logs -f farm-backend
docker compose logs -f farm-frontend

# Accéder à la base de données
docker compose exec farm-db psql -U farm_user -d farm_db

# Sauvegarde base de données
docker compose exec farm-db pg_dump -U farm_user farm_db > backup_$(date +%Y%m%d).sql

# Restaurer une sauvegarde
docker compose exec -T farm-db psql -U farm_user farm_db < backup_20260401.sql

# Statut des conteneurs
docker compose ps

# Redémarrer uniquement le backend
docker compose restart farm-backend

# Voir les erreurs récentes
docker compose logs --tail=50 farm-backend
```

---

## 11. Axes d'évolution

Features non développées, identifiées comme valeur ajoutée pour les clients suivants :

| Feature | Impact | Complexité |
|---|---|---|
| Photos sur traitements / parcelles | Élevé | Moyen |
| Notifications push mobile (PWA) | Élevé | Moyen |
| Rapport hebdomadaire email automatique | Moyen | Faible (N8N) |
| Arabe dans l'interface | Élevé (Tunisie) | Moyen |
| Profitabilité par parcelle | Élevé | Faible |
| Capteurs IoT (humidité sol) | Élevé | Fort |
| Marketplace fournisseurs | Fort | Fort |
| Traçabilité certifiable (GlobalGAP) | Moyen | Fort |

---

*Farm Manager — Développé par Sterve / SterveAI Systems*  
*Document mis à jour le 10 Avril 2026*
