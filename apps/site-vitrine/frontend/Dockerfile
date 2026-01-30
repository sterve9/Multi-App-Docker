# ==================== DOCKERFILE FRONTEND ====================
# Image de base : Nginx Alpine (léger et performant)
FROM nginx:alpine

# Métadonnées
LABEL maintainer="Sterve <sterveshop6@gmail.com>"
LABEL description="Frontend site vitrine professionnel"

# Copier tous les fichiers du frontend vers Nginx
COPY . /usr/share/nginx/html

# Créer une configuration Nginx personnalisée (optionnel)
# On utilise la config par défaut de Nginx pour l'instant

# Exposer le port 80 (HTTP)
EXPOSE 80

# Commande de démarrage Nginx
CMD ["nginx", "-g", "daemon off;"]