FROM ubuntu:20.04

RUN apt-get -y update
RUN apt-get install -y curl
RUN curl —silent —location https://deb.nodesource.com/setup_14.x | bash -
RUN apt-get install -y nodejs

COPY . /proxy
WORKDIR /proxy

RUN ./scripts/gen_ca.sh
RUN ./scripts/gen_cert.sh mail.ru 1000000000000

EXPOSE 8080

CMD npm start
