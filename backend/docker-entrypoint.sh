#!/bin/sh
set -eu

# Persistent disks can be mounted as root-owned directories. Repair ownership
# before dropping privileges so SQLite, uploads, and workspaces remain writable.
mkdir -p /app/data /app/workspace
chown -R node:node /app/data /app/workspace

exec su-exec node "$@"
