#!/bin/sh
set -eu

if [ "$#" -ne 2 ] || [ "$2" != "RESTORE" ]; then
  echo "Usage: $0 BACKUP.sql.gz RESTORE" >&2
  echo "The RESTORE confirmation is required because this replaces database objects." >&2
  exit 64
fi

input=$1
[ -r "$input" ] || { echo "Cannot read backup: $input" >&2; exit 66; }
command -v docker >/dev/null 2>&1 || { echo "docker is required" >&2; exit 69; }
gzip -t "$input"
gzip -dc "$input" | docker compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" "$POSTGRES_DB"'
echo "Restore completed from $input"
