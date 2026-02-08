# 📡 Documentation API

## Informations Générales

### Base URL

| Environnement | URL |
|---------------|-----|
| **Local** | `http://127.0.0.1:8000` |
| **Production** | `https://api.sterveshop.cloud` *(à venir)* |

### Format
- **Content-Type** : `application/json`
- **Charset** : `UTF-8`

### Authentication
- ⚠️ Pas d'auth pour l'instant (à implémenter)

---

## Endpoints

### GET /

**Description** : Health check de l'API

**Request** :
```bash
curl http://127.0.0.1:8000/
```

**Response (200 OK)** :
```json
{
  "success": true,
  "message": "API is running"
}
```

---

### GET /health

**Description** : Status de santé du service

**Request** :
```bash
curl http://127.0.0.1:8000/health
```

**Response (200 OK)** :
```json
{
  "status": "ok"
}
```

---

### POST /api/contact

**Description** : Analyse une demande client avec Claude et retourne une classification structurée

**Request** :
```bash
curl -X POST http://127.0.0.1:8000/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jean Dupont",
    "email": "jean@example.com",
    "message": "Je veux automatiser mes leads avec n8n"
  }'
```

**Request Body** :
```json
{
  "name": "string",      // Nom du client (requis)
  "email": "string",     // Email valide (requis)
  "message": "string"    // Message/demande (requis)
}
```

**Response (200 OK)** :
```json
{
  "success": true,
  "client": {
    "name": "Jean Dupont",
    "email": "jean@example.com"
  },
  "analysis": {
    "category": "automation",
    "intent": "Mise en place d'un système de gestion automatisée des leads",
    "tools": ["n8n", "CRM", "Email"],
    "priority": "high",
    "summary": "Le client souhaite automatiser la collecte, qualification et distribution des leads..."
  }
}
```

**Response (422 Unprocessable Entity)** :
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```

**Response (500 Internal Server Error)** :
```json
{
  "detail": "Claude API error: ..."
}
```

---

### GET /debug/env

**Description** : Vérifier le chargement des variables d'environnement

**Request** :
```bash
curl http://127.0.0.1:8000/debug/env
```

**Response (200 OK)** :
```json
{
  "anthropic_api_key_loaded": true,
  "key_prefix": "sk-ant-api..."
}
```

---

## Schémas de Données

### ContactRequest
```json
{
  "name": "string",
  "email": "string (format email)",
  "message": "string"
}
```

**Contraintes** :
- `name` : 1-100 caractères
- `email` : Format email valide (RFC 5322)
- `message` : 10-5000 caractères

---

### AnalysisResponse
```json
{
  "category": "automation | website | ai | consulting | unknown",
  "intent": "string",
  "tools": ["string"],
  "priority": "low | medium | high",
  "summary": "string"
}
```

**Champs** :
- `category` : Catégorie de la demande
- `intent` : Intention/objectif du client
- `tools` : Liste d'outils recommandés
- `priority` : Niveau de priorité
- `summary` : Résumé de l'analyse

---

## Exemples de Requêtes

### Exemple 1 : Automation

**Request** :
```bash
curl -X POST http://127.0.0.1:8000/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Martin",
    "email": "alice@example.com",
    "message": "Je veux automatiser lenvoie demails quand quelquun remplit un formulaire"
  }'
```

**Response** :
```json
{
  "success": true,
  "client": {
    "name": "Alice Martin",
    "email": "alice@example.com"
  },
  "analysis": {
    "category": "automation",
    "intent": "Automatisation d'emails suite à soumission formulaire",
    "tools": ["n8n", "Webhook", "Email"],
    "priority": "medium",
    "summary": "Mise en place d'un workflow automatisé pour envoyer des emails de confirmation..."
  }
}
```

---

### Exemple 2 : Website

**Request** :
```bash
curl -X POST http://127.0.0.1:8000/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bob Morane",
    "email": "bob@example.com",
    "message": "Je veux créer un site e-commerce pour vendre mes produits"
  }'
```

**Response** :
```json
{
  "success": true,
  "client": {
    "name": "Bob Morane",
    "email": "bob@example.com"
  },
  "analysis": {
    "category": "website",
    "intent": "Création d'une plateforme e-commerce",
    "tools": ["WooCommerce", "Shopify", "n8n"],
    "priority": "high",
    "summary": "Développement d'un site e-commerce complet avec gestion produits, paiement..."
  }
}
```

---

### Exemple 3 : AI

**Request** :
```bash
curl -X POST http://127.0.0.1:8000/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Clara Dubois",
    "email": "clara@example.com",
    "message": "Je veux intégrer un chatbot IA sur mon site"
  }'
```

**Response** :
```json
{
  "success": true,
  "client": {
    "name": "Clara Dubois",
    "email": "clara@example.com"
  },
  "analysis": {
    "category": "ai",
    "intent": "Intégration d'un assistant conversationnel IA",
    "tools": ["Claude", "OpenAI", "Voiceflow"],
    "priority": "medium",
    "summary": "Implémentation d'un chatbot intelligent pour support client automatisé..."
  }
}
```

---

## Codes d'Erreur

| Code | Description | Cause |
|------|-------------|-------|
| 200 | OK | Requête réussie |
| 422 | Unprocessable Entity | Validation Pydantic échouée |
| 500 | Internal Server Error | Erreur backend (Claude API, etc.) |

---

## Rate Limiting

⚠️ **Pas encore implémenté**

**Futur** :
- 100 requêtes / heure / IP
- Header `X-RateLimit-Remaining`

---

## Changelog

### v0.1.0 (2026-02-08)
- ✅ Endpoint `/api/contact`
- ✅ Intégration Claude API
- ✅ Parsing JSON structuré
- ✅ Validation Pydantic

### v0.2.0 (à venir)
- [ ] Endpoint `/api/workflow`
- [ ] Génération workflow n8n
- [ ] Rate limiting
- [ ] Authentication

---

**Version API** : 0.1.0  
**Dernière mise à jour** : 2026-02-08
