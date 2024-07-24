#!/bin/sh

filters='{"kinds":[38383]}'

/app/strfry --config /etc/strfry.conf sync wss://nostr.satstralia.com --filter "$filters" --dir both >> /var/log/cron.log 2>&1
/app/strfry --config /etc/strfry.conf sync ws://testraliar7xkhos2gipv2k65obykofb4jqzl5l4danfryacifi4t7qd.onion/nostr --filter "$filters" --dir both >> /var/log/cron.log 2>&1
