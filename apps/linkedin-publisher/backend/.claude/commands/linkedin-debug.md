# LinkedIn Publisher — Debug Guide

## Erreurs fréquentes et solutions

### ❌ `[Errno -2] Name or service not known` sur webhook n8n
**Cause** : N8N_WEBHOOK_URL utilise le domaine public (`n8n.sterveshop.cloud`) au lieu du hostname interne Docker.
**Fix** : `N8N_WEBHOOK_URL=http://n8n:5678/webhook/linkedin-publish` (hardcodé dans docker-compose.yml)

### ❌ Photo de référence ignorée (`image_url` absent du payload)
**Cause** : Volume Docker `reference_photo:/app/assets/reference` écrase le fichier baked.
**Fix** : Supprimer le volume `reference_photo` du docker-compose.yml. La photo est dans `/app/assets/reference/photo.jpg` via `COPY ./assets`.

### ❌ Post bloqué à `uploading` pour toujours
**Cause A** : n8n retourne 404 (mauvais webhook path) — le backend ne détectait pas l'erreur HTTP (pas de `raise_for_status()`).
**Fix** : `resp.raise_for_status()` ajouté dans `posts.py` + bouton retry visible pour statut `uploading`.

**Cause B** : n8n reçoit le webhook mais `Download Image` échoue (mauvais endpoint).
**Fix n8n** : URL correcte = `http://linkedin-publisher-backend:8000/api/posts/image/{filename}` (et non `/api/images/download/`)

### ❌ `ImportError: cannot import name 'LinkedInPost'`
**Fix** : `models/__init__.py` importait l'ancien modèle. Mettre uniquement `from app.models.post import Post`.

### ❌ `column posts.status does not exist`
**Cause** : Ancienne table `posts` avec schéma incompatible.
**Fix** : `main.py` droppe et recrée les tables au démarrage via `DROP TABLE IF EXISTS posts CASCADE`.

### ❌ `Illegal header value b'Bearer '`
**Cause** : `KIE_AI_API_KEY` manquant dans le `.env` serveur.
**Fix** : `echo "KIE_AI_API_KEY=sk-..." >> .env` puis redémarrer.

---

## Commandes utiles sur le serveur

```bash
# Rebuild backend seulement
cd /docker/apps/linkedin-publisher
git pull origin master
docker compose up -d --build backend

# Voir les logs en temps réel
docker logs linkedin-publisher-backend --tail 100 -f

# Vérifier que la photo de référence est bien dans le container
docker exec linkedin-publisher-backend ls -la /app/assets/reference/

# Vérifier les variables d'environnement
docker exec linkedin-publisher-backend env | grep -E "KIE|N8N|WEBHOOK|PHOTO"

# Tester le webhook n8n manuellement depuis le container
docker exec linkedin-publisher-backend curl -X POST http://n8n:5678/webhook/linkedin-publish \
  -H "Content-Type: application/json" \
  -d '{"post_id": 1}'
```

---

## n8n workflow `linkedin-publisher` (id: egjGrTP4garbZAZfQik2W)

Flux : Webhook → GET Post → PATCH uploading → Download Image → LinkedIn Publish → PATCH published/failed

**URLs internes** (depuis n8n vers le backend) :
- `GET http://linkedin-publisher-backend:8000/api/posts/{post_id}`
- `GET http://linkedin-publisher-backend:8000/api/posts/image/{filename}`
- `PATCH http://linkedin-publisher-backend:8000/api/posts/{post_id}`

**Webhook path** : `linkedin-publish`
**URL externe** : `https://automation.sterveshop.cloud/webhook/linkedin-publish`
**URL interne** (depuis les autres containers) : `http://n8n:5678/webhook/linkedin-publish`
