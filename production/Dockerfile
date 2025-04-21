FROM nginx:stable-alpine-slim
COPY ./dist/aerofront/browser /usr/share/nginx/html
COPY ./production/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80