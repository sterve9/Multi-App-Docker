# Multi-app Docker avec Traefik

Ce projet est un environnement personnel que j’ai mis en place pour apprendre
à structurer et sécuriser plusieurs applications Docker derrière un reverse-proxy Traefik.

Il s’agit d’un projet d’apprentissage, basé sur des cas réels
(n8n, API FastAPI), avec une volonté de faire les choses proprement et sans stress.

---

## 🎯 Objectif du projet

- Comprendre Docker et Docker Compose
- Apprendre à structurer un serveur multi-applications
- Centraliser l’accès HTTPS avec Traefik
- Éviter l’exposition directe des ports applicatifs
- Construire une base saine pour ajouter d’autres applications plus tard

---

## 🧱 Ce qui a été mis en place

- Traefik comme reverse-proxy unique (ports 80 / 443)
- HTTPS automatique avec Let’s Encrypt
- Une application n8n accessible uniquement via Traefik
- Une API FastAPI (lab-api) accessible via un sous-domaine
- Un réseau Docker commun (`traefik`) pour relier les applications
- Données persistantes séparées des configurations
- Versionnage Git pour suivre l’évolution du projet

---

## 📁 Structure du projet

/docker
├── traefik/
│   └── docker-compose.yml
├── apps/
│   ├── n8n/
│   │   ├── docker-compose.yml
│   │   └── n8n_data/
│   └── lab-api/
│       ├── Dockerfile
│       ├── docker-compose.yml
│       └── app/
│           └── main.py


---

## 🧠 Ce que j’ai appris

- Comprendre le rôle d’un reverse-proxy
- Utiliser les labels Traefik pour le routage
- Gérer les réseaux Docker partagés
- Séparer configuration, données et code
- Déboguer des problèmes réels (ports, réseaux, certificats)
- Versionner un projet technique avec Git et GitHub

---

## 🚧 État actuel

Le projet est fonctionnel et sert de base d’apprentissage.
Il est destiné à évoluer avec l’ajout de nouvelles applications
et une meilleure maîtrise des outils Docker et Traefik.

---

## 📝 Notes

Ce projet est volontairement simple et pédagogique.
L’objectif est de progresser étape par étape, sans chercher la perfection immédiate.
