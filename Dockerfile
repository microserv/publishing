FROM localhost:5000/backend-comm-mongo
MAINTAINER Pål Karlsrud <paal@128.no>

ENV BASE_DIR /var/publishing

RUN git clone https://github.com/microserv/publishing ${BASE_DIR}
RUN apk add --update nodejs nginx curl

RUN cp ${BASE_DIR}/node.ini /etc/supervisor.d/
RUN curl -o /etc/supervisor.d/nginx.ini https://128.no/f/nginx.ini
RUN curl -o /etc/supervisor.d/mongodb.ini https://128.no/f/mongodb.ini

RUN cp ${BASE_DIR}/publishing.conf /etc/nginx/conf.d/
RUN curl -o /etc/nginx/nginx.conf https://128.no/f/nginx.conf

WORKDIR ${BASE_DIR}
RUN npm install .

RUN mkdir -p /run/nginx

EXPOSE 80
