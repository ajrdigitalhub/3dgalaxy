#!/bin/bash
# Stop on error
set -e

echo "Starting development environment..."

# Run concurrently without forwarding any appended command-line arguments to it
exec npx concurrently \
  "npx ng serve --host 0.0.0.0 --port 3000 --proxy-config proxy.conf.json" \
  "cd server && BACKEND_PORT=4000 npx ts-node --transpile-only src/server.ts"
