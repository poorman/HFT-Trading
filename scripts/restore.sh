#!/bin/bash

# HFT Trading System - Database Restore Script
# Usage: ./restore.sh backup_file.sql.gz

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    echo ""
    echo "Available backups:"
    ls -lh /home/pbieda/scripts/hft/backups/*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  WARNING: This will overwrite the current database!"
echo "Backup file: $BACKUP_FILE"
read -p "Are you sure you want to restore? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo "Starting database restore..."

# Decompress if needed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    TEMP_FILE="/tmp/hft_restore_$$.sql"
    gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
    RESTORE_FILE="$TEMP_FILE"
else
    RESTORE_FILE="$BACKUP_FILE"
fi

# Restore database
docker exec -i a39c456f9738_local_pgdb psql -U pbieda hft_trading < "$RESTORE_FILE"

if [ $? -eq 0 ]; then
    echo "✓ Database restored successfully!"
    
    # Cleanup temp file
    if [ -n "$TEMP_FILE" ] && [ -f "$TEMP_FILE" ]; then
        rm "$TEMP_FILE"
    fi
else
    echo "✗ Restore failed!"
    exit 1
fi

