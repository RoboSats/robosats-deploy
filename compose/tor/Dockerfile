FROM alpine:3.21

# Require tor >= 0.4.8.x compiled with --enable-gpl (needed for PoW Equi-X library)
# Alpine 3.20+ ships tor 0.4.9.x built with --enable-gpl, so `pow: yes` and GPL are guaranteed.
RUN apk --no-cache --no-progress add tor=~0.4 && \
    # Hard-fail the build if PoW support is missing (requires --enable-gpl + pow module)
    tor --list-modules | grep -q '^pow: yes' && \
    tor --version | grep -q 'General Public License'

EXPOSE 9001 9050

# hadolint ignore=DL3002
USER root
ARG LOCAL_USER_ID=9999
ENV TOR_DATA=/var/lib/tor

# Add useradd and usermod
# Create user account (UID will be changed in entrypoint script)
RUN apk --no-cache --no-progress add shadow=~4 sudo=~1 && \
  useradd -u $LOCAL_USER_ID --shell /bin/sh -m alice && \
  usermod -g alice tor

COPY entrypoint.sh /root/entrypoint.sh

ENTRYPOINT [ "/root/entrypoint.sh" ]
