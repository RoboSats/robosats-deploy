#!/bin/sh
set -e

# Create torrc if it doesn't exist
if [ ! -f "/etc/tor/torrc" ]; then
    cp /tmp/torrc /etc/tor/torrc
fi

exec sudo -u tor /usr/bin/tor