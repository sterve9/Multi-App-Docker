# 🏗️ Architecture Technique

## Vue d'ensemble du système
```
┌─────────────────────────────────────────────────────┐
│                    UTILISATEUR                       │
│              (Formulaire de contact)                 │
└────────────────────────┬────────────────────────────┘
                         │
                         ↓ POST /api/contact
┌─────────────────────────────────────────────────────┐
│              FRONTEND (Nginx)                        │
│  - HTML/CSS/JS                                      │
│  - Validation formulaire                            │
│  - Affichage résultats                              │
│  - Port 80 (Docker)                                 │
└────────────────────────┬────────────────────────────┘
                         │
                         ↓ HTTPS (via Traefik)
┌─────────────────────────────────────────────────────┐
│          TRAEFIK (Reverse Proxy)                     │
│  - Routing par domaine                              │
│  - Certificats SSL automatiques                     │
│  - Load balancing                                   │
└────────────────────────┬────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────┐
│           BACKEND (FastAPI)                          │
│  main.py                                            │
│  ├── Routes HTTP                                    │
│  │   ├── GET /                                      │
│  │   ├── GET /health                                │
│  │   ├── POST /api/contact                          │
│  │   └── GET /debug/env                             │
│  │                                                   │
│  ├── Fonctions                                      │
│  │   ├── analyze_with_claude()                      │
│  │   └── generate_n8n_workflow() [à venir]          │
│  │                                                   │
│  └── Services                                       │
│      └── services/n8n_service.py [à venir]          │
└────────────────────────┬────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────┐
│              CLAUDE API (Anthropic)                  │
│  - Modèle : claude-sonnet-4-5-20250929              │
│  - Analyse demande client                           │
│  - Classification automatique                       │
│  - Génération workflow JSON                         │
│  - Max tokens : 1024                                │
└────────────────────────┬────────────────────────────┘
                         │
                         ↓ Workflow JSON
┌─────────────────────────────────────────────────────┐
│                   N8N API                            │
│  - Création workflow                                │
│  - Activation                                       │
│  - Tests automatiques                               │
│  - Instance : automation.sterveshop.cloud           │
└─────────────────────────────────────────────────────┘
```

---

## Modèles de Données

### 1. ContactRequest (Input)

**Fichier** : `models.py`
```python
class ContactRequest(BaseModel):
    name: str
    email: EmailStr
    message: str
```

**Exemple** :
```json
{
  "name": "Jean Dupont",
  "email": "jean@example.com",
  "message": "Je veux automatiser mes leads avec n8n"
}
```

**Validation Pydantic** :
- `name` : Non vide, string
- `email` : Format email valide
- `message` : Non vide, string

---

### 2. AnalysisResponse (Output)

**Format** :
```json
{
  "category": "automation | website | ai | consulting | unknown",
  "intent": "string",
  "tools": ["string"],
  "priority": "low | medium | high",
  "summary": "string"
}
```

**Exemple réel** :
```json
{
  "category": "automation",
  "intent": "Mise en place d'un système de gestion automatisée des leads",
  "tools": ["n8n", "CRM", "Email"],
  "priority": "high",
  "summary": "Le client souhaite automatiser la collecte, qualification et distribution des leads..."
}
```

---

## Flow de Données Détaillé

### Étape 1 : Soumission Formulaire
```
1. Utilisateur remplit le formulaire
2. JavaScript valide les champs
3. POST à /api/contact
```

**Code JavaScript** :
```javascript
const response = await fetch('https://api.sterveshop.cloud/api/contact', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify(formData)
});
```

---

### Étape 2 : Réception Backend
```
1. FastAPI reçoit la requête
2. Pydantic valide automatiquement
3. Si invalide → erreur 422
4. Si valide → appel analyze_with_claude()
```

**Code Python** :
```python
@app.post("/api/contact")
async def receive_contact(contact: ContactRequest):
    # Validation automatique par Pydantic
    result = await analyze_with_claude(contact)
    return {"success": True, "analysis": result}
```

---

### Étape 3 : Analyse Claude
```
1. Construction du prompt structuré
2. Appel API Claude (SDK Anthropic)
3. Réponse en JSON strict
4. Parsing et validation
5. Retour au backend
```

**Prompt Template** :
```
Tu es un moteur backend de classification.
Réponds UNIQUEMENT en JSON valide.
Schéma : {...}
Message client : {...}
```

---

### Étape 4 : Génération Workflow (à venir)
```
1. Analyse transformée en workflow JSON
2. Appel API n8n
3. Création du workflow
4. Activation
5. Retour URL workflow
```

---

## Composants Techniques

### Backend (FastAPI)

**Fichiers** :
- `main.py` : Application principale (~150 lignes)
- `models.py` : Modèles Pydantic (~15 lignes)
- `requirements.txt` : Dépendances

**Dépendances** :
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
anthropic==0.39.0
python-dotenv==1.0.0
```

**Port** : 8000 (local), mappé via Traefik en prod

---

### Claude API

**Configuration** :
- **Endpoint** : `https://api.anthropic.com/v1/messages`
- **Modèle** : `claude-sonnet-4-5-20250929`
- **Max tokens** : 1024
- **Headers** :
  - `x-api-key` : Clé API
  - `anthropic-version` : `2023-06-01`

**Coût estimé** :
- Input : ~$3 / million tokens
- Output : ~$15 / million tokens
- **Par requête** : ~$0.01

---

### n8n (à venir)

**Configuration prévue** :
- **Instance** : `https://automation.sterveshop.cloud`
- **API** : `/api/v1/workflows`
- **Auth** : API Key

---

## Sécurité

### Implémenté
- ✅ HTTPS (Let's Encrypt via Traefik)
- ✅ CORS configuré
- ✅ Validation Pydantic (injection prevention)
- ✅ Variables d'environnement (.env)
- ✅ Secrets hors du code

### À implémenter
- ⚠️ Rate limiting
- ⚠️ Authentication JWT
- ⚠️ Input sanitization avancée
- ⚠️ Logging sécurisé
- ⚠️ Audit trail

---

## Performance

### Métriques actuelles
- **Temps de réponse** : 2-3 secondes
- **Latence Claude API** : ~1.5-2s
- **Parsing JSON** : <10ms
- **Validation Pydantic** : <5ms

### Optimisations futures
- Cache Redis pour requêtes similaires
- Streaming de réponse Claude
- Parallélisation des appels API

---

## Scalabilité

### Architecture actuelle
- ✅ Stateless (peut scaler horizontalement)
- ✅ Docker (facile à répliquer)
- ⚠️ Pas de load balancing (1 instance)

### Évolution future
- Load balancer (Traefik multi-instances)
- Base de données pour historique
- Queue system (Celery/RabbitMQ)
- Microservices (Backend / n8n service séparés)

---

## Monitoring (à venir)

### Métriques à tracker
- Nombre de requêtes/jour
- Temps de réponse moyen
- Taux d'erreur
- Coût Claude API
- Workflows créés/jour

### Outils envisagés
- Prometheus + Grafana
- Sentry (error tracking)
- Logs structurés (JSON)

---

## Diagramme de Séquence
```
User          Frontend      Backend       Claude        n8n
  |              |             |             |            |
  |--Submit----->|             |             |            |
  |              |--POST------>|             |            |
  |              |             |--Analyze--->|            |
  |              |             |<--JSON------|            |
  |              |             |                         |
  |              |             |--Generate-->|           |
  |              |             |<--Workflow--|           |
  |              |             |                         |
  |              |             |--------Create---------->|
  |              |             |<-------URL-------------|
  |              |<--Response--|                        |
  |<--Display----|             |                        |
```

---

**Version** : 1.0  
**Dernière mise à jour** : 2026-02-08
