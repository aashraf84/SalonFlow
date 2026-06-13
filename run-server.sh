#!/bin/bash
cd /home/z/my-project
export DATABASE_URL="postgresql://neondb_owner:npg_bIX6RYtJUC9m@ep-billowing-silence-aik4vnm2-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&connection_limit=2&pool_timeout=20"
export JWT_SECRET="salonflow-production-secret-2024"
export NODE_OPTIONS="--unhandled-rejections=none --max-old-space-size=4096"

while true; do
  echo "Starting server at $(date)"
  node node_modules/.bin/next start -p 3000 -H 0.0.0.0
  EXIT_CODE=$?
  echo "Server exited with code $EXIT_CODE at $(date)"
  sleep 3
done
