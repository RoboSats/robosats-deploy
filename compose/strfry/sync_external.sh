#!/bin/sh

filters_external='{"kinds":[38383]}'
timeout_duration="15s"

while IFS= read -r line; do
  timeout "$timeout_duration" /app/strfry --config /etc/strfry.conf sync ${line} --filter "$filters_external" --dir both
done < /app/external_urls.txt

