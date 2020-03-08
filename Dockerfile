FROM node:latest

RUN mkdir /src
WORKDIR /src
ADD package.json .
ENV NPM_CONFIG_LOGLEVEL warn
RUN npm install

ADD . .

ENTRYPOINT ["npm"]
