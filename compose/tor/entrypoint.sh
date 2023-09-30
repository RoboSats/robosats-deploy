#!/bin/sh
set -e

# Change local user id and group
usermod -u 1000 alice
groupmod -g 1000 alice

# Set correct owners on volumes
chown -R tor:alice /var/lib/tor
chown -R :alice /etc/tor
chown -R alice:alice /home/alice

exec sudo -u tor /usr/bin/tor