FROM nginx:stable-alpine-slim
COPY ./dist/page /usr/share/nginx/html
COPY ./default.conf /etc/nginx/conf.d/default.conf
COPY ./config_template.json /usr/share/nginx/html/assets/config.json
EXPOSE 80