FROM node:20

WORKDIR /app

COPY package.json ./

RUN npm install

COPY . .

RUN apt-get update && apt-get install -y bash


ENV SHELL=/bin/bash

EXPOSE 5173

CMD ["sh", "-c", "npx chokidar-cli 'package.json' -i '**/package-lock.json' -c 'if [ ! -f /tmp/npm_running ]; then touch /tmp/npm_running && echo 📦 Detected dependency change; npm install --no-audit --no-fund && rm -f /tmp/npm_running; fi' & npm run dev"]



