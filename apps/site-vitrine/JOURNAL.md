# 📔 Journal de Développement

## 2026-02-02 : Début du projet

### Réalisations
- ✅ Création structure frontend (HTML/CSS/JS)
- ✅ Design responsive avec animations
- ✅ Formulaire de contact interactif
- ✅ Déploiement site vitrine sur VPS
- ✅ Configuration Docker + Nginx
- ✅ Configuration Traefik (reverse proxy)
- ✅ HTTPS automatique (Let's Encrypt)

### Infrastructure
- VPS Ubuntu configuré
- Docker et Docker Compose installés
- Réseau traefik-network créé
- Domaine : vitrine.sterveshop.cloud

---
## 2026-02-11 : Déploiement Production & Résolution DNS

### Réalisations
- ✅ Backend déployé en production (api.sterveshop.cloud)
- ✅ Frontend connecté au backend
- ✅ Workflow n8n complet fonctionnel
- ✅ Tests end-to-end réussis

### Problème Rencontré : Propagation DNS

**Symptôme** :
```
TypeError: Failed to fetch
net::ERR_NAME_NOT_RESOLVED
```

**Diagnostic** :
1. Backend opérationnel (curl https://api.sterveshop.cloud/health → 200 OK)
2. Containers Docker actifs (docker ps → tous UP)
3. CORS correctement configuré
4. Frontend code correct (fetch vers bonne URL)
5. **DNS partiellement propagé** → Cause identifiée !

**Vérification** :
- whatsmydns.net : 19/25 serveurs OK (propagation partielle)
- Cache DNS local contenait ancienne résolution

**Solution** :
```bash
# Windows
ipconfig /flushdns

# macOS/Linux
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

**Validation** :
- Test fetch console : ✅ Succès
- Formulaire site : ✅ Envoi réussi
- Workflow n8n : ✅ Déclenché
- Email Gmail : ✅ Reçu
- Google Sheets : ✅ Mis à jour

### Architecture Finale Déployée
```
Internet
   ↓
DNS (api.sterveshop.cloud → 72.62.89.162)
   ↓
Traefik (Reverse Proxy + HTTPS)
   ↓
┌─────────────────────────────────────────┐
│ site-vitrine-backend (FastAPI)          │
│ - Claude API intégration                │
│ - CORS configuré                        │
│ - n8n webhook trigger                   │
└─────────────────────────────────────────┘
   ↓
n8n Workflow
   ├─→ Gmail (notification)
   └─→ Google Sheets (sauvegarde)
```

### Métriques de Performance

**Backend** :
- Temps réponse : ~2-3s (analyse Claude incluse)
- Disponibilité : 100%
- HTTPS : Certificat Let's Encrypt valide

**Workflow n8n** :
- Taux succès : 100%
- Email : Envoi < 5s
- Google Sheets : Écriture < 3s

**DNS** :
- Propagation : 19/25 serveurs (76%)
- TTL : 300s (5 minutes)
- Cache flush : Résout immédiatement

### Apprentissages

**Technique** :
- Propagation DNS peut prendre 24-48h globalement
- Cache DNS local peut masquer mise à jour DNS
- Tests curl réussis != site accessible (cache navigateur)
- whatsmydns.net excellent outil de diagnostic
- Flush cache DNS résout problème immédiatement en local

**Méthodologie** :
- Debugging systématique par élimination
- Tests à plusieurs niveaux (Docker, HTTP, DNS, Browser)
- Documentation de chaque étape
- Validation end-to-end essentielle

**Production** :
- HTTPS automatique avec Traefik + Let's Encrypt
- Docker Compose simplifie déploiement multi-services
- Traefik labels permettent routing flexible
- Réseau Docker externe (traefik-network) partagé

### Statistiques Projet

**Code** :
- Backend : ~350 lignes Python
- Frontend : ~450 lignes JavaScript
- Workflow n8n : 3 nœuds
- Documentation : ~1200 lignes Markdown

**Services Déployés** :
- Frontend : vitrine.sterveshop.cloud
- Backend API : api.sterveshop.cloud
- n8n : automation.sterveshop.cloud
- Traefik : Reverse proxy

**Intégrations** :
- Claude API (Anthropic)
- n8n Webhooks
- Gmail API
- Google Sheets API

**Temps Investi** :
- Formation Python : ~8h
- Développement backend : ~12h
- Tests & debugging : ~6h
- Documentation : ~4h
- Déploiement : ~3h
- **Total : ~33 heures**

### État Actuel

**✅ Production** :
- [x] Site vitrine accessible
- [x] Formulaire fonctionnel
- [x] Backend API opérationnel
- [x] Workflow n8n actif
- [x] Emails envoyés automatiquement
- [x] Données sauvegardées dans Google Sheets
- [x] HTTPS partout
- [x] Documentation complète

**🎯 Prochaines Étapes** :
1. Créer 2-3 workflows démo supplémentaires
2. Capturer screenshots/vidéos du flow complet
3. Mettre à jour CV avec métriques projet
4. Créer projet e-commerce pour portfolio
5. Commencer candidatures

### Notes pour Portfolio

**Points forts à mentionner** :
- Projet full-stack complet de A à Z
- Backend Python avec Claude API
- Infrastructure Docker + Traefik
- Automatisation n8n
- Debugging méthodique problème DNS
- Documentation professionnelle
- Production-ready en 3 semaines

**Métriques impressionnantes** :
- 100% tests réussis
- 0 downtime après déploiement
- Flow complet en <10 secondes
- Architecture scalable
- Code propre et documenté

---

**Dernière mise à jour** : 2026-02-11 - Projet DÉPLOYÉ EN PRODUCTION ✅
## 2026-02-08 : Backend FastAPI + Claude API

### Réalisations
- ✅ Setup FastAPI de base
- ✅ Modèles Pydantic (ContactRequest)
- ✅ Intégration Claude API
- ✅ Parsing JSON structuré
- ✅ Tests locaux réussis
- ✅ Prompt engineering pour réponse JSON stricte

### Code créé
```python
# main.py : ~150 lignes
# models.py : ~15 lignes
# Total : ~165 lignes
```

### Défis rencontrés

#### 1. Modèle Claude introuvable
- **Problème** : Erreur "not_found_error" avec plusieurs modèles
- **Tentatives** :
  - `claude-3-sonnet-20240229` ❌
  - `claude-3-5-sonnet-20240620` ❌
  - `claude-3-5-sonnet-20241022` ❌
- **Solution** : Trouvé `claude-sonnet-4-5-20250929` ✅
- **Temps** : ~4 heures de recherche

#### 2. Erreur getaddrinfo
- **Problème** : `[Errno 11001] getaddrinfo failed`
- **Cause** : Bibliothèque httpx ne résolvait pas le DNS
- **Solution** : Utiliser le SDK officiel Anthropic au lieu de httpx
- **Impact** : Code plus stable et maintenable

#### 3. Réponse Claude non structurée
- **Problème** : Claude renvoyait du texte libre, pas du JSON
- **Solution** : Prompt engineering avec contrat JSON strict
- **Résultat** : JSON valide à 100%

### Apprentissages

#### Technique
- FastAPI est très intuitif et rapide à prendre en main
- Claude API demande des prompts très précis
- SDK officiel > requêtes HTTP manuelles
- Pydantic simplifie énormément la validation
- JSON parsing nécessite gestion d'erreurs robuste

#### Méthodologie
- Tester en local avant de déployer
- Documenter au fur et à mesure
- Un problème à la fois
- Ne pas hésiter à changer d'approche

### Métriques
- **Lignes de code** : ~165
- **Tests réussis** : 5/5
- **Bugs résolus** : 3 majeurs
- **Temps investi** : ~8 heures
- **Appels Claude réussis** : 100%

---

## 2026-02-09 : Service n8n (à venir)

### Objectifs
- [ ] Créer `services/n8n_service.py`
- [ ] Se connecter à l'API n8n
- [ ] Générer workflows JSON avec Claude
- [ ] Créer workflows automatiquement
- [ ] Tests avec cas réels

### Plan
1. Étudier l'API n8n
2. Créer modèles de workflows
3. Intégrer dans main.py
4. Tests end-to-end

---

## 2026-02-10 : Frontend → Backend (à venir)

### Objectifs
- [ ] Connecter formulaire frontend au backend
- [ ] Afficher résultats de l'analyse
- [ ] UX pour affichage workflow
- [ ] Gestion des erreurs côté client

---

## 2026-02-11 : Déploiement Production (à venir)

### Objectifs
- [ ] Dockerfile backend
- [ ] docker-compose.yml complet
- [ ] DNS api.sterveshop.cloud
- [ ] Déploiement
- [ ] Tests production

---

## Statistiques Globales

### Code
- **Total lignes** : ~165
- **Fichiers créés** : 4
- **Services intégrés** : 1 (Claude API)

### Temps
- **Formation Python** : ~6 heures
- **Développement backend** : ~8 heures
- **Debugging** : ~4 heures
- **Total** : ~18 heures

### Compétences acquises
- ✅ Python (variables, fonctions, classes)
- ✅ FastAPI (routes, middleware, validation)
- ✅ Pydantic (modèles, validation)
- ✅ Claude API (prompts, parsing)
- ✅ Async/await
- ✅ JSON parsing
- ✅ Gestion d'erreurs
- ✅ Variables d'environnement

---

## Notes pour la suite

### Priorités
1. Finir service n8n en local
2. Tester tout le flow
3. Documenter
4. Déployer

### Points d'attention
- Bien tester avant de déployer
- Documenter chaque étape
- Prendre des captures d'écran
- Mesurer les métriques

### Questions ouvertes
- Quelle version de n8n API ?
- Comment gérer les erreurs de création workflow ?
- Faut-il un système de retry ?

---

**Dernière mise à jour** : 2026-02-08 23:30
## 2026-02-10 : Tests API Complets & Automatisation

### Réalisations
- ✅ Script de tests automatisés créé (`test_api.py`)
- ✅ 7 tests fonctionnels exécutés avec succès
- ✅ Taux de réussite : 100% (7/7 tests)
- ✅ Validation erreurs (422) fonctionne parfaitement
- ✅ Documentation tests créée (`docs/TESTS.md`)
- ✅ Organisation structure projet améliorée

### Problème Résolu : Module requests manquant

**Contexte** :  
Lors de l'exécution du script `test_api.py`, erreur rencontrée :
```
ModuleNotFoundError: No module named 'requests'
```

**Cause** :  
Librairie `requests` non installée dans l'environnement virtuel `.venv`

**Diagnostic** :
1. Vérification environnement actif
2. Identification import manquant dans script
3. Confirmation via erreur Python

**Solution** :
```bash
pip install requests --break-system-packages
```

**Correction permanente** :  
Ajout dans `requirements.txt` :
```
requests==2.31.0
```

**Validation** :  
Script fonctionne parfaitement après installation

### Résultats des Tests

| # | Test | Endpoint | Status | Catégorie | Priorité | Durée |
|---|------|----------|--------|-----------|----------|-------|
| 1 | Health Check | GET / | ✅ 200 | - | - | <50ms |
| 2 | Health Status | GET /health | ✅ 200 | - | - | <50ms |
| 3 | Debug Env | GET /debug/env | ✅ 200 | - | - | <50ms |
| 4 | Automation | POST /api/contact | ✅ 200 | automation | high | ~2s |
| 5 | Website | POST /api/contact | ✅ 200 | website | high | ~2s |
| 6 | AI | POST /api/contact | ✅ 200 | ai | medium | ~2s |
| 7 | Consulting | POST /api/contact | ✅ 200 | consulting | medium | ~2s |
| 8 | Unknown | POST /api/contact | ✅ 200 | unknown | low | ~2s |
| 9 | Email invalide | POST /api/contact | ✅ 422 | - | - | <50ms |
| 10 | Champ manquant | POST /api/contact | ✅ 422 | - | - | <50ms |

### Métriques de Performance

**Performance** :
- Temps réponse moyen : 2-3 secondes
- Latence Claude API : ~1.5-2s
- Parsing JSON : <10ms
- Validation Pydantic : <5ms
- Taux erreur : 0%

**Coûts** :
- Tokens input moyen : 50-100 par requête
- Tokens output moyen : 100-200 par requête
- Coût estimé par analyse : ~$0.01

**Qualité** :
- Taux réussite tests : 100% (10/10)
- Catégorisation correcte : 100%
- JSON valide : 100%
- Gestion erreurs : Validée

### Améliorations Apportées

**Organisation** :
- ✅ Déplacement `TESTS.md` vers `docs/`
- ✅ Structure projet plus claire
- ✅ Séparation documentation technique

**Automatisation** :
- ✅ Script Python pour tests répétables
- ✅ Validation automatique des réponses
- ✅ Résumés formatés des analyses

**Documentation** :
- ✅ Rapport tests détaillé
- ✅ Cas d'usage documentés
- ✅ Métriques tracées

### Apprentissages

**Technique** :
- Script Python plus fiable que curl pour tests API
- Importance de documenter toutes les dépendances
- Validation Pydantic très robuste
- Claude API stable et performante
- Gestion erreurs JSON essentielle

**Méthodologie** :
- Tester de manière automatisée = gain de temps
- Documenter problèmes ET solutions
- Organiser documentation par thème
- Commit réguliers avec messages clairs

**Best Practices** :
- Tests automatisés avant déploiement
- Requirements.txt toujours à jour
- Documentation au fur et à mesure
- Git commits descriptifs

### Fichiers Créés/Modifiés

**Créés** :
- `backend/test_api.py` : Script tests automatisés
- `docs/TESTS.md` : Rapport tests détaillé

**Modifiés** :
- `backend/requirements.txt` : Ajout requests==2.31.0
- `backend/main.py` : Amélioration parsing JSON
- `JOURNAL.md` : Cette entrée

### Commits Git
```bash
# Commit 1 : Création script tests
git commit -m "feat: add API tests automation script"

# Commit 2 : Documentation tests
git commit -m "docs: create TESTS.md report"

# Commit 3 : Organisation
git commit -m "move test report to docs folder"
```

### Statistiques Cumulées

**Code** :
- Total lignes backend : ~250
- Fichiers Python : 3 (main.py, models.py, test_api.py)
- Services intégrés : 1 (Claude API)

**Documentation** :
- Pages markdown : 6
- Lignes documentation : ~800

**Tests** :
- Tests fonctionnels : 10
- Taux réussite : 100%
- Couverture : Endpoints principaux ✅

**Temps Investi** :
- Formation Python : ~6h
- Développement backend : ~10h
- Tests & debugging : ~4h
- Documentation : ~3h
- **Total : ~23 heures**

### État Actuel du Projet

**✅ Terminé** :
- [x] Frontend déployé (vitrine.sterveshop.cloud)
- [x] Backend local opérationnel
- [x] Claude API intégré
- [x] Tests automatisés validés
- [x] Documentation complète

**🔄 En cours** :
- [ ] Service n8n (génération workflows)

**📅 Prochaines Étapes** :
1. Créer `services/n8n_service.py`
2. Intégrer API n8n
3. Générer workflows JSON automatiquement
4. Tester génération workflows
5. Déployer backend en production
6. Connecter frontend → backend prod
7. Créer projets démo (2-3 cas d'usage)
8. Rédiger CV avec métriques projet
9. Commencer candidatures

### Notes pour la Suite

**Priorités Semaine Prochaine** :
1. Service n8n (2-3 jours)
2. Déploiement production (1 jour)
3. Projets démo (1-2 jours)
4. CV & candidatures (2 jours)

**Points d'Attention** :
- API n8n peut avoir des spécificités
- Tester workflows générés en conditions réelles
- Documenter chaque workflow créé
- Mesurer temps de génération

**Objectif Final** :
Système complet qui transforme une demande client en workflow n8n déployé en <5 minutes, avec taux de succès >80%.

---

**Dernière mise à jour** : 2026-02-10 - 23:45
**Status** : Backend validé à 100% ✅
**Prochaine session** : Service n8n
## 2026-02-11 : Déploiement Production & Résolution DNS

### Réalisations
- ✅ Backend déployé en production (api.sterveshop.cloud)
- ✅ Frontend connecté au backend
- ✅ Workflow n8n complet fonctionnel
- ✅ Tests end-to-end réussis

### Problème Rencontré : Propagation DNS

**Symptôme** :
```
TypeError: Failed to fetch
net::ERR_NAME_NOT_RESOLVED
```

**Diagnostic** :
1. Backend opérationnel (curl https://api.sterveshop.cloud/health → 200 OK)
2. Containers Docker actifs (docker ps → tous UP)
3. CORS correctement configuré
4. Frontend code correct (fetch vers bonne URL)
5. **DNS partiellement propagé** → Cause identifiée !

**Vérification** :
- whatsmydns.net : 19/25 serveurs OK (propagation partielle)
- Cache DNS local contenait ancienne résolution

**Solution** :
```bash
# Windows
ipconfig /flushdns

# macOS/Linux
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

**Validation** :
- Test fetch console : ✅ Succès
- Formulaire site : ✅ Envoi réussi
- Workflow n8n : ✅ Déclenché
- Email Gmail : ✅ Reçu
- Google Sheets : ✅ Mis à jour

### Architecture Finale Déployée
```
Internet
   ↓
DNS (api.sterveshop.cloud → 72.62.89.162)
   ↓
Traefik (Reverse Proxy + HTTPS)
   ↓
┌─────────────────────────────────────────┐
│ site-vitrine-backend (FastAPI)          │
│ - Claude API intégration                │
│ - CORS configuré                        │
│ - n8n webhook trigger                   │
└─────────────────────────────────────────┘
   ↓
n8n Workflow
   ├─→ Gmail (notification)
   └─→ Google Sheets (sauvegarde)
```

### Métriques de Performance

**Backend** :
- Temps réponse : ~2-3s (analyse Claude incluse)
- Disponibilité : 100%
- HTTPS : Certificat Let's Encrypt valide

**Workflow n8n** :
- Taux succès : 100%
- Email : Envoi < 5s
- Google Sheets : Écriture < 3s

**DNS** :
- Propagation : 19/25 serveurs (76%)
- TTL : 300s (5 minutes)
- Cache flush : Résout immédiatement

### Apprentissages

**Technique** :
- Propagation DNS peut prendre 24-48h globalement
- Cache DNS local peut masquer mise à jour DNS
- Tests curl réussis != site accessible (cache navigateur)
- whatsmydns.net excellent outil de diagnostic
- Flush cache DNS résout problème immédiatement en local

**Méthodologie** :
- Debugging systématique par élimination
- Tests à plusieurs niveaux (Docker, HTTP, DNS, Browser)
- Documentation de chaque étape
- Validation end-to-end essentielle

**Production** :
- HTTPS automatique avec Traefik + Let's Encrypt
- Docker Compose simplifie déploiement multi-services
- Traefik labels permettent routing flexible
- Réseau Docker externe (traefik-network) partagé

### Statistiques Projet

**Code** :
- Backend : ~350 lignes Python
- Frontend : ~450 lignes JavaScript
- Workflow n8n : 3 nœuds
- Documentation : ~1200 lignes Markdown

**Services Déployés** :
- Frontend : vitrine.sterveshop.cloud
- Backend API : api.sterveshop.cloud
- n8n : automation.sterveshop.cloud
- Traefik : Reverse proxy

**Intégrations** :
- Claude API (Anthropic)
- n8n Webhooks
- Gmail API
- Google Sheets API

**Temps Investi** :
- Formation Python : ~8h
- Développement backend : ~12h
- Tests & debugging : ~6h
- Documentation : ~4h
- Déploiement : ~3h
- **Total : ~33 heures**

### État Actuel

**✅ Production** :
- [x] Site vitrine accessible
- [x] Formulaire fonctionnel
- [x] Backend API opérationnel
- [x] Workflow n8n actif
- [x] Emails envoyés automatiquement
- [x] Données sauvegardées dans Google Sheets
- [x] HTTPS partout
- [x] Documentation complète

**🎯 Prochaines Étapes** :
1. Créer 2-3 workflows démo supplémentaires
2. Capturer screenshots/vidéos du flow complet
3. Mettre à jour CV avec métriques projet
4. Créer projet e-commerce pour portfolio
5. Commencer candidatures

### Notes pour Portfolio

**Points forts à mentionner** :
- Projet full-stack complet de A à Z
- Backend Python avec Claude API
- Infrastructure Docker + Traefik
- Automatisation n8n
- Debugging méthodique problème DNS
- Documentation professionnelle
- Production-ready en 3 semaines

**Métriques impressionnantes** :
- 100% tests réussis
- 0 downtime après déploiement
- Flow complet en <10 secondes
- Architecture scalable
- Code propre et documenté

---

**Dernière mise à jour** : 2026-02-11 - Projet DÉPLOYÉ EN PRODUCTION ✅
