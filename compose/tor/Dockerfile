FROM alpine:3

RUN apk --no-cache --no-progress add tor

EXPOSE 9001 9050

COPY entrypoint.sh /root/entrypoint.sh
COPY torrc /tmp/torrc

ENTRYPOINT [ "/root/entrypoint.sh" ]
