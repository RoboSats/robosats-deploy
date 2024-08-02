FROM debian:bullseye-slim

RUN apt update
RUN apt-get install rsync -y

COPY backup.sh /usr/src

WORKDIR /usr/src

CMD ["bash","backup.sh"]
