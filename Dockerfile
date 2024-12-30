FROM node:lts-bookworm
SHELL [ "/bin/bash", "-c" ]
ARG UNAME=lbz
ARG GNAME=lbz
ARG UID=1000
ARG GID=1000
RUN groupadd -o -g $GID $GNAME && useradd -m -r -u $UID -g $GID $UNAME -o
WORKDIR /app
RUN npm install -g @angular/cli
USER lbz
# for development, mount volume and do install, using user lbz
# for production, copy files and do install, using user node
# USER node
# COPY ./package.json /app/
# RUN npm install
# COPY . /app/
# CMD ["npm", "start"]