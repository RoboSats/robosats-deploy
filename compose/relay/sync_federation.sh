#!/bin/sh

filters_sync="{\"kinds\":[38383,31986,1059],\"since\":$(date -d "4 weeks ago" +%s)}"
filter_delete="{\"until\":$(date -d "4 weeks ago" +%s)}"
timeout_duration="15s"

timeout "$timeout_duration" /app/strfry --config /etc/strfry.conf delete --filter "$filter_delete"

while IFS= read -r line; do
  timeout "$timeout_duration" /app/strfry --config /etc/strfry.conf sync ${line} --filter "$filters_sync" --dir both
done < /app/federation_urls.txt
