#!/bin/sh
set -e

API_URL="${VITE_API_BASE_URL:-http://localhost:30500/api}"

cat > /usr/share/nginx/html/env-config.js <<EOF
window.__HC_ENV__ = {
  VITE_API_BASE_URL: "${API_URL}"
};
EOF

exec nginx -g "daemon off;"
