FROM python:3-alpine
ENV TZ=Europe/London
ENV PYTHONUNBUFFERED 1

RUN apk add git g++ linux-headers && git clone https://github.com/cryptosharks131/lndg /app
WORKDIR /app

RUN git checkout "v1.10.0"
RUN pip install -r requirements.txt
RUN pip install supervisor whitenoise
