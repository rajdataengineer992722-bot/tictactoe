#!/bin/sh
set -eu

if [ -z "${DATABASE_ADDRESS:-}" ] && [ -n "${DATABASE_URL:-}" ]; then
  DATABASE_ADDRESS="${DATABASE_URL#postgres://}"
  DATABASE_ADDRESS="${DATABASE_ADDRESS#postgresql://}"
  DATABASE_ADDRESS="${DATABASE_ADDRESS%%\?*}"
fi

if [ -z "${DATABASE_ADDRESS:-}" ]; then
  echo "DATABASE_ADDRESS or DATABASE_URL is required."
  echo "Examples:"
  echo "  DATABASE_ADDRESS=nakama:password@host:5432/nakama"
  echo "  DATABASE_URL=postgresql://nakama:password@host:5432/nakama"
  exit 1
fi

if [ -z "${NAKAMA_SERVER_KEY:-}" ]; then
  echo "NAKAMA_SERVER_KEY is required."
  exit 1
fi

if [ -z "${NAKAMA_SESSION_ENCRYPTION_KEY:-}" ]; then
  echo "NAKAMA_SESSION_ENCRYPTION_KEY is required."
  exit 1
fi

if [ -z "${NAKAMA_SESSION_REFRESH_ENCRYPTION_KEY:-}" ]; then
  echo "NAKAMA_SESSION_REFRESH_ENCRYPTION_KEY is required."
  exit 1
fi

if [ -z "${NAKAMA_RUNTIME_HTTP_KEY:-}" ]; then
  echo "NAKAMA_RUNTIME_HTTP_KEY is required."
  exit 1
fi

SOCKET_PORT_ARGS=""
if [ -n "${PORT:-}" ]; then
  SOCKET_PORT_ARGS="--socket.port ${PORT}"
fi

/nakama/nakama migrate up --database.address "$DATABASE_ADDRESS"

exec /nakama/nakama \
  --config /nakama/data/local.yml \
  --database.address "$DATABASE_ADDRESS" \
  $SOCKET_PORT_ARGS \
  --socket.server_key "$NAKAMA_SERVER_KEY" \
  --session.encryption_key "$NAKAMA_SESSION_ENCRYPTION_KEY" \
  --session.refresh_encryption_key "$NAKAMA_SESSION_REFRESH_ENCRYPTION_KEY" \
  --runtime.http_key "$NAKAMA_RUNTIME_HTTP_KEY"
