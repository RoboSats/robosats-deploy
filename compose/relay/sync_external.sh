#!/bin/sh

filters_sync="{\"kinds\":[38383],\"since\":$(date -d "2 weeks ago" +%s)}"
timeout_duration="15s"

while IFS= read -r line; do
  timeout "$timeout_duration" /app/strfry --config /etc/strfry.conf sync ${line} --filter "$filters_sync" --dir both
done < /app/external_urls.txt
