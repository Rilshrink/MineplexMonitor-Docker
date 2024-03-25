FROM alpine:latest

RUN apk add git nodejs npm
RUN git clone https://github.com/Rilshrink/MineplexMonitor-Docker /app
RUN npm install

WORKDIR /app

CMD [ "sh", "run.sh"]