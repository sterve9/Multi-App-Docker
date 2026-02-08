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
