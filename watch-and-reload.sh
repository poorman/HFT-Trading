#!/bin/bash

# HFT Frontend Auto-Reload Script
# This script watches for changes in the frontend directory and automatically rebuilds

FRONTEND_DIR="/home/pbieda/scripts/hft/frontend"
DOCKER_COMPOSE_FILE="/home/pbieda/scripts/hft/docker-compose.yml"

echo "🔍 Starting HFT Frontend File Watcher..."
echo "📂 Watching: $FRONTEND_DIR"
echo "🔄 Auto-reload enabled for: app/, components/, lib/"
echo ""

# Install inotify-tools if not present
if ! command -v inotifywait &> /dev/null; then
    echo "📦 Installing inotify-tools..."
    sudo apt-get update && sudo apt-get install -y inotify-tools
fi

# Function to rebuild frontend
rebuild_frontend() {
    echo ""
    echo "🔨 Changes detected at $(date '+%Y-%m-%d %H:%M:%S')"
    echo "🚀 Rebuilding frontend..."
    
    cd /home/pbieda/scripts/hft
    
    # Clear Next.js cache
    docker exec hft-frontend rm -rf /app/.next 2>/dev/null || true
    
    # Restart frontend (it will pick up new files on restart in dev mode)
    docker-compose restart hft-frontend
    
    echo "✅ Frontend restarted! Changes should be live in ~10 seconds"
    echo "🌐 Access at: http://178.128.15.57:3003"
    echo ""
    echo "👀 Watching for more changes..."
}

# Watch for changes in specific directories
inotifywait -m -r -e modify,create,delete,move \
    --exclude '(\.next|node_modules|\.git)' \
    "$FRONTEND_DIR/app" \
    "$FRONTEND_DIR/components" \
    "$FRONTEND_DIR/lib" \
    2>/dev/null | while read path action file; do
    
    # Only trigger on relevant file types
    if [[ "$file" =~ \.(tsx?|jsx?|css)$ ]]; then
        rebuild_frontend
        # Debounce: wait 2 seconds before allowing next rebuild
        sleep 2
    fi
done

