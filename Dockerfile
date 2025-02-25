FROM alpine:latest

RUN apk add git nodejs npm
RUN git clone https://github.com/Rilshrink/MineplexMonitor-Docker /app
WORKDIR /app
RUN npm install

CMD [ "sh", "run.sh"]
