#!/bin/bash

# HFT Trading System - Database Backup Script
# Usage: ./backup.sh [retention_days]

set -e

BACKUP_DIR="/home/pbieda/scripts/hft/backups"
RETENTION_DAYS=${1:-7}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/hft_trading_$TIMESTAMP.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Starting HFT database backup..."
echo "Timestamp: $TIMESTAMP"
echo "Backup file: $BACKUP_FILE"

# Backup database
docker exec a39c456f9738_local_pgdb pg_dump -U pbieda hft_trading > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    # Compress backup
    gzip "$BACKUP_FILE"
    echo "✓ Backup created: ${BACKUP_FILE}.gz"
    
    # Get file size
    SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
    echo "✓ Backup size: $SIZE"
    
    # Clean old backups
    echo "Cleaning up backups older than $RETENTION_DAYS days..."
    find "$BACKUP_DIR" -name "hft_trading_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    
    # Count remaining backups
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/hft_trading_*.sql.gz 2>/dev/null | wc -l)
    echo "✓ Total backups: $BACKUP_COUNT"
    
    echo "Backup completed successfully!"
else
    echo "✗ Backup failed!"
    exit 1
fi

