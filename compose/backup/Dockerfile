FROM debian:bullseye-slim

RUN apt update
RUN apt-get install rsync -y

WORKDIR /usr/src/backup.sh

COPY backup.sh /usr/src/backup.sh

CMD ["bash","backup.sh"]
