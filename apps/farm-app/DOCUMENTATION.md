# 🌿 Farm Manager — Documentation Projet

**Application de gestion agrumicole intelligente**  
Client : Exploitations agrumicoles, Nabeul, Tunisie  
Développeur : Sterve — sterveshop.cloud  
Accès : [ferme.sterveshop.cloud](https://ferme.sterveshop.cloud)

---

## Table des matières

1. [Présentation générale](#1-présentation-générale)
2. [Stack technique](#2-stack-technique)
3. [Version 1 — Gestion opérationnelle](#3-version-1--gestion-opérationnelle-livrée)
4. [Version 2 — Intelligence Artificielle](#4-version-2--intelligence-artificielle)
5. [Version 3 — Mobilité & Multi-utilisateurs](#5-version-3--mobilité--multi-utilisateurs)
6. [Version 4 — Connectivité & Écosystème](#6-version-4--connectivité--écosystème)
7. [Roadmap résumée](#7-roadmap-résumée)
8. [Guide de connexion](#8-guide-de-connexion)
9. [Commandes serveur](#9-commandes-serveur)

---

## 1. Présentation générale

Farm Manager est une application web complète dédiée à la gestion d'exploitations agrumicoles.  
Elle permet de suivre en temps réel les parcelles, les traitements, les récoltes, les stocks de produits et d'automatiser les alertes de réapprovisionnement.

**Problèmes résolus :**
- Fini les tableaux Excel perdus ou mal partagés
- Les stocks de fertilisants sont suivis en temps réel
- Le fournisseur est alerté automatiquement quand un produit manque
- Le bilan financier de chaque saison est calculé automatiquement
- L'ingénieur peut laisser ses recommandations directement dans l'app

---

## 2. Stack technique

| Composant | Technologie |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | FastAPI (Python), SQLAlchemy |
| Base de données | PostgreSQL 15 |
| Authentification | JWT Bearer (token 24h) |
| Alertes automatiques | N8N (webhook) |
| Infrastructure | Docker Compose, VPS Hostinger |
| Domaine | ferme.sterveshop.cloud (HTTPS) |

---

## 3. Version 1 — Gestion opérationnelle ✅ LIVRÉE

### Ce qui est disponible aujourd'hui

#### 🏡 Tableau de bord
- Vue synthétique de chaque ferme
- Compteurs animés : parcelles, arbres, récoltes, alertes stock
- Création et suppression de fermes

#### 🗺️ Parcelles
- Fiche complète par parcelle : surface, variété, nombre d'arbres, année plantation
- Statuts : Active / En repos / Replantation
- Notes libres par parcelle

#### 💉 Traitements
- Enregistrement de chaque pulvérisation ou intervention
- Lien direct avec le stock utilisé → **déduction automatique** de la quantité
- Types : pesticide, engrais, irrigation, taille, autre
- Historique complet par parcelle

#### 🍋 Récoltes
- Saisie des récoltes : quantité (kg), qualité, destination, prix/kg
- Calcul automatique de la valeur par récolte
- Totaux : poids global + valeur totale (TND)

#### 📦 Stocks
- Stocks liés à chaque ferme séparément
- Seuil d'alerte configurable par produit
- **Alerte N8N automatique** dès que le stock passe sous le seuil
- Historique des mouvements (entrées/sorties) avec coût
- Mode achat fournisseur : saisie en sacs/bidons × poids = total calculé
- Prix d'achat par unité mémorisé

#### 🗓️ Planning fertilisation
- Configuration par ferme : nombre de vannes + jours de fertilisation
- Dose par vanne configurable par produit (kg, L, g, mL...)
- Planning automatique sur 3 semaines à venir
- **Confirmation de session en 1 clic** → déduction automatique de tous les produits
- Calcul des semaines de stock restantes par produit
- Alerte visuelle si un produit est insuffisant pour la prochaine session

#### 📋 Recommandations
- Espace dédié aux recommandations de l'ingénieur agronome
- Priorités : Haute / Normale / Basse
- Statuts : En attente / Appliquée / Ignorée
- Traçabilité complète chronologique

#### 📊 Bilan de saison
- Par ferme et par année
- Valeur totale des récoltes vs total des dépenses
- **Calcul automatique de la marge brute**
- Graphique des top dépenses par produit

#### 🔔 Automatisation N8N
- Webhook déclenché automatiquement si un stock passe sous son seuil
- Compatible : WhatsApp Business, Email, SMS, Telegram
- Fonctionne depuis : mouvement manuel, traitement, session fertilisation

---

## 4. Version 2 — Intelligence Artificielle

> **Objectif :** Transformer les données en conseils actionnables. L'application devient un vrai assistant agronomique.

### 4.1 Assistant IA (Claude API)

Une interface de chat intégrée directement dans l'application.  
Le client tape sa question en arabe ou en français, l'IA analyse les données réelles de la ferme et répond.

**Exemples de questions :**
- *"Pourquoi mon rendement a baissé de 20% cette année ?"*
- *"Quel est le meilleur moment pour fertiliser la parcelle Nord ?"*
- *"Compare mes deux fermes sur les 6 derniers mois"*
- *"J'ai utilisé combien d'acide sulfurique depuis janvier ?"*

**Fonctionnement technique :**
- Endpoint `/ai/chat` — injecte les données ferme + stocks + récoltes + traitements dans le contexte Claude
- Modèle : Claude Sonnet (claude-sonnet-4-6) — Anthropic API
- Mémoire de conversation par session

### 4.2 Recommandations IA automatiques

- Analyse hebdomadaire automatique des données
- Génère des recommandations préventives : *"La parcelle B n'a pas été traitée depuis 45 jours, vérifier..."*
- Détecte les anomalies : *"Le rendement de la parcelle Sud est 30% inférieur à la même période l'an dernier"*
- Notification push ou WhatsApp si alerte critique

### 4.3 Prédiction de stock

- Calcul automatique de la date de rupture pour chaque produit
- Recommandation de quantité à commander : *"Commander 50 sacs d'ammonitre avant le 15 mai"*
- Historique de consommation pour optimiser les achats (éviter surstockage)

### 4.4 Rapport de saison automatique

- Génération d'un rapport PDF complet en fin de saison
- Comparaison année N vs année N-1
- Analyse coûts/rendements avec recommandations pour la saison suivante
- Prêt à être partagé avec l'ingénieur ou la banque

### 4.5 Analyse météo

- Intégration API météo (Open-Meteo, gratuit)
- Alertes : *"Pluie prévue demain — reporter la pulvérisation"*
- Historique météo corrélé avec les rendements

---

## 5. Version 3 — Mobilité & Multi-utilisateurs

> **Objectif :** L'application suit les équipes sur le terrain, pas seulement au bureau.

### 5.1 Application mobile native

- Application Android + iOS (React Native ou PWA avancée)
- Fonctionne hors connexion avec synchronisation au retour réseau
- Interface simplifiée pour les ouvriers : confirmer une session, enregistrer une récolte, signaler un problème

### 5.2 Gestion multi-utilisateurs avec rôles

| Rôle | Accès |
|---|---|
| **Patron** | Accès complet, paramètres, suppression |
| **Ingénieur agronome** | Recommandations, traitements, lecture bilan |
| **Gérant** | Stocks, récoltes, planning |
| **Ouvrier** | Confirmer sessions, enregistrer récoltes |

- Chaque utilisateur a son identifiant et mot de passe
- Journal d'activité : qui a fait quoi et quand

### 5.3 Notifications push

- Alertes stock directement sur le téléphone du patron
- Rappels : *"Session fertilisation demain — vérifier les stocks"*
- Notification quand l'ingénieur ajoute une recommandation

### 5.4 Photos et documents

- Attacher des photos aux parcelles, traitements, récoltes
- Stocker les bons de livraison fournisseur (PDF)
- Galerie par parcelle avec historique visuel

### 5.5 Export comptabilité

- Export Excel/CSV de toutes les données
- Format compatible avec les logiciels comptables tunisiens
- Factures fournisseurs automatisées depuis les entrées stock

---

## 6. Version 4 — Connectivité & Écosystème

> **Objectif :** Connecter la ferme au monde extérieur et automatiser la chaîne complète.

### 6.1 Capteurs IoT

- Intégration capteurs humidité sol (automatise l'irrigation)
- Capteurs température / humidité air → alertes gel ou canicule
- Compteurs de vannes connectés → déduction stock sans intervention manuelle

### 6.2 Marketplace fournisseurs

- Connexion directe avec les fournisseurs partenaires
- Commande en 1 clic depuis l'alerte stock
- Comparaison des prix fournisseurs en temps réel
- Historique des prix pour négocier au meilleur moment

### 6.3 Traçabilité certifiable

- QR code par lot de récolte
- Traçabilité complète : parcelle → traitement → récolte → destination
- Compatible normes GlobalGAP / export Europe
- Dossier traçabilité généré automatiquement pour les certifications

### 6.4 Tableau de bord multi-exploitations

- Vue consolidée pour gérer plusieurs clients (si expansion du service)
- Benchmark anonyme : *"Votre rendement est dans le top 30% des exploitations similaires"*
- Rapports investisseur / banque automatisés

### 6.5 Intégration ERP / Comptabilité

- Synchronisation avec Sage, Odoo ou logiciels locaux
- API publique pour intégrations tierces
- Webhook sortant pour chaque événement (récolte, achat, traitement)

---

## 7. Roadmap résumée

```
2026 Q2 ── V1 ✅ LIVRÉE
           Gestion complète : fermes, parcelles, stocks, récoltes,
           traitements, fertilisation, recommandations, bilan, alertes N8N

2026 Q3 ── V2 🔄 EN PRÉPARATION
           Assistant IA, recommandations automatiques,
           prédiction rupture stock, rapports PDF, météo

2026 Q4 ── V3 📱 PLANIFIÉE
           Application mobile, multi-utilisateurs et rôles,
           photos, notifications push, export comptabilité

2027 Q1 ── V4 🔮 VISION
           Capteurs IoT, marketplace fournisseurs,
           traçabilité certifiable, ERP integration
```

---

## 8. Guide de connexion

**URL :** https://ferme.sterveshop.cloud  
**Identifiant :** *(fourni séparément)*  
**Mot de passe :** *(fourni séparément)*  

Le token de session dure **24 heures** — reconnexion automatique demandée après expiration.

### Changer le mot de passe (admin serveur)

```bash
# 1. Générer le hash du nouveau mot de passe
docker compose exec farm-backend python -c \
  "from app.auth import hash_password; print(hash_password('NouveauMotDePasse'))"

# 2. Modifier le fichier .env
nano .env
# → Changer ADMIN_USERNAME et ADMIN_PASSWORD_HASH

# 3. Redémarrer le backend
docker compose restart farm-backend
```

---

## 9. Commandes serveur

```bash
# Démarrer l'application
docker compose up -d

# Rebuilder après une mise à jour
git pull && docker compose up --build -d

# Voir les logs en direct
docker compose logs -f farm-backend
docker compose logs -f farm-frontend

# Accéder à la base de données
docker compose exec farm-db psql -U farm_user -d farm_db

# Sauvegarder la base de données
docker compose exec farm-db pg_dump -U farm_user farm_db > backup_$(date +%Y%m%d).sql

# Statut des conteneurs
docker compose ps
```

---

*Document mis à jour le 08 Avril 2026*  
*Farm Manager v1.0 — Développé par Sterve*
