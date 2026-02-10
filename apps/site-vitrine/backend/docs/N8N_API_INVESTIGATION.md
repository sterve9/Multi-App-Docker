# Investigation API n8n - Problème 401 Unauthorized

**Date** : 2026-02-10  
**Durée investigation** : ~2 jours  
**Status** : Non résolu - Pivot vers Webhooks

---

## Problème Rencontré

### Symptôme
```
Status HTTP: 401 Unauthorized
Response: {"message":"unauthorized"}
```

### Configuration Testée

**Serveur (/docker/apps/n8n/.env)** :
```bash
N8N_PUBLIC_API_ENABLED=true
N8N_API_ENABLED=true
N8N_HOST=automation.sterveshop.cloud
N8N_PROTOCOL=https
WEBHOOK_URL=https://automation.sterveshop.cloud/
```

**Version n8n** : 2.4.8

**Endpoints testés** :
- ❌ `/api/v1/workflows` → 401
- ❌ `/api/v1/users/me` → 401
- ✅ `/healthz` → 200

### Tentatives de Résolution

1. ✅ Activation variables d'environnement API
2. ✅ Redémarrage container n8n
3. ✅ Génération multiple clés API
4. ✅ Vérification format header (X-N8N-API-KEY)
5. ✅ Test curl direct
6. ✅ Test Python avec requests
7. ❌ Résultat : Toujours 401

### Hypothèses

**Possible** :
- Version n8n 2.4.8 a un bug avec l'API publique
- Configuration supplémentaire manquante non documentée
- Problème de reverse proxy (Traefik) qui bloque les headers API

**À investiguer plus tard** :
- Tester avec version n8n plus récente
- Tester sans Traefik (accès direct au port)
- Regarder les logs Traefik pour voir si headers passent

---

## Solution Alternative Adoptée

**Webhooks n8n** → Fonctionne sans authentification API

**Avantages** :
- ✅ Pas d'authentification complexe
- ✅ Plus simple à implémenter
- ✅ Intégration directe depuis formulaire
- ✅ Déclenche workflows sans problème

---

## Prochaines Étapes

1. Implémenter solution avec Webhooks
2. Déployer le site complet
3. Revenir sur API n8n plus tard (v2 du projet)

---

## Ressources pour Investigation Future

- Documentation n8n API : https://docs.n8n.io/api/
- GitHub Issues n8n : https://github.com/n8n-io/n8n/issues
- Forum n8n : https://community.n8n.io/
