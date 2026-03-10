FROM nginx:alpine

# Copie la landing page
COPY html/ /usr/share/nginx/html/

# Config nginx légère
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80