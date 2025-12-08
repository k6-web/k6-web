#!/bin/sh
set -e

# Inject runtime config into index.html
sed -i "s|</head>|<script>window.__RUNTIME_CONFIG__={VITE_API_URL:'${VITE_API_URL}'}</script></head>|g" /usr/share/nginx/html/index.html

# Start nginx
exec "$@"
