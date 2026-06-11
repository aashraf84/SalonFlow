#!/bin/bash
cd /home/z/my-project
while true; do
  node .next/standalone/server.js 2>/dev/null
  sleep 1
done
