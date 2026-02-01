# 🧱 Sterve Platform – Docker & Traefik

## 🎯 Objectif
Infrastructure **modulaire, scalable et clé en main** pour héberger plusieurs apps derrière **Traefik**, avec HTTPS automatique.

---

## 🗂 Structure (simplifiée)

/docker
├── traefik/ # Reverse-proxy unique
├── apps/
│ ├── site-vitrine/
│ ├── n8n/
│ ├── lab-api/
│ └── builder/


---

## 🌐 Architecture & Routage

             ┌─────────────┐
             │   Traefik   │
             │  HTTPS/ACME │
             └─────┬───────┘
                   │
   ┌───────────────┼─────────────────┐
   │               │                 │
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ site-vitrine│ │ n8n │ │ lab-api │
│ (Nginx) │ │ │ │ (FastAPI) │
└─────────────┘ └─────────────┘ └─────────────┘
│
┌──────────┐
│ builder │
│ (internal│
│ tools) │
└──────────┘


- **Traefik** : point d’entrée unique, HTTPS automatique, routage via labels Docker  
- **site-vitrine** : frontend statique, accessible publiquement  
- **n8n** : automatisation, exposé uniquement via Traefik  
- **lab-api** : API interne, évolutive  
- **builder** : outil interne, non exposé par défaut  

---

## 🔧 Réseau & Sécurité
- Tous les containers sur le réseau externe `traefik-network`  
- Aucune exposition directe de ports applicatifs  
- HTTPS automatique via Let’s Encrypt  
- Middlewares optionnels pour chaque app  

---

## 🚀 Philosophie
- Une app = un dossier = un docker-compose  
- Traefik = point d’entrée unique  
- Simplicité > sur-configuration  

---

## 🛠 Maintenance
- Redémarrage indépendant de chaque app  
- Traefik ne doit jamais être dupliqué  
- Nouvelle app : rejoindre `traefik-network`, définir labels Traefik, exposer un port interne uniquement  
