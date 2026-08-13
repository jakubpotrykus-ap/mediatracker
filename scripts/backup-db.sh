#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 BACKUP.sql.gz" >&2
  exit 64
fi

output=$1
case "$output" in
  *.sql.gz) ;;
  *) echo "Backup path must end with .sql.gz" >&2; exit 64 ;;
esac

if [ -e "$output" ]; then
  echo "Refusing to overwrite existing file: $output" >&2
  exit 73
fi

command -v docker >/dev/null 2>&1 || { echo "docker is required" >&2; exit 69; }
dump_temp=$(mktemp "${TMPDIR:-/tmp}/mediatracker-pg.XXXXXX")
compressed_temp=$(mktemp "${output}.tmp.XXXXXX")
trap 'rm -f "$dump_temp" "$compressed_temp"' EXIT HUP INT TERM

docker compose exec -T db sh -c 'pg_dump --clean --if-exists --no-owner --no-privileges -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$dump_temp"
test -s "$dump_temp" || { echo "Database dump is empty" >&2; exit 74; }
gzip -9 < "$dump_temp" > "$compressed_temp"
gzip -t "$compressed_temp"
mv "$compressed_temp" "$output"
echo "Backup written to $output"
