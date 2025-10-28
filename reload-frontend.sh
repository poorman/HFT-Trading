#!/bin/bash

# Quick script to force reload frontend after changes
# Use this if HMR doesn't pick up changes automatically

echo "🔄 Forcing frontend reload..."

# Clear Next.js cache
docker exec hft-frontend rm -rf /app/.next

# Restart container
docker-compose -f /home/pbieda/scripts/hft/docker-compose.yml restart hft-frontend

echo ""
echo "✅ Frontend reloaded!"
echo "🌐 Access at: http://178.128.15.57:3003"
echo "⏰ Wait ~10 seconds for Next.js to rebuild"

