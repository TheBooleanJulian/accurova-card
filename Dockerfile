FROM nginx:alpine
COPY index.html contact.vcf /usr/share/nginx/html/
COPY css /usr/share/nginx/html/css
COPY assets /usr/share/nginx/html/assets
EXPOSE 80
