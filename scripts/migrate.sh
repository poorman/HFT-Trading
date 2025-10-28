#!/bin/bash

# Database Migration Script
# Usage: ./migrate.sh [up|down|status]

set -e

MIGRATIONS_DIR="/home/pbieda/scripts/hft/infra/migrations"
DB_CONTAINER="a39c456f9738_local_pgdb"
DB_USER="pbieda"
DB_NAME="hft_trading"

# Create migrations tracking table
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" <<EOF
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
EOF

get_applied_migrations() {
    docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT version FROM schema_migrations ORDER BY version;" | tr -d ' '
}

apply_migration() {
    MIGRATION_FILE=$1
    VERSION=$(basename "$MIGRATION_FILE" .sql)
    
    echo "Applying migration: $VERSION"
    
    docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$MIGRATION_FILE"
    
    docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c \
        "INSERT INTO schema_migrations (version) VALUES ('$VERSION');"
    
    echo "✓ Migration $VERSION applied successfully"
}

case "${1:-up}" in
    up)
        echo "Running migrations..."
        APPLIED=$(get_applied_migrations)
        
        for MIGRATION in $(ls "$MIGRATIONS_DIR"/*.sql | sort); do
            VERSION=$(basename "$MIGRATION" .sql)
            
            if echo "$APPLIED" | grep -q "^$VERSION$"; then
                echo "- $VERSION (already applied)"
            else
                apply_migration "$MIGRATION"
            fi
        done
        
        echo "All migrations completed!"
        ;;
    
    status)
        echo "Migration status:"
        echo "================"
        APPLIED=$(get_applied_migrations)
        
        for MIGRATION in $(ls "$MIGRATIONS_DIR"/*.sql | sort); do
            VERSION=$(basename "$MIGRATION" .sql)
            
            if echo "$APPLIED" | grep -q "^$VERSION$"; then
                echo "✓ $VERSION"
            else
                echo "✗ $VERSION (pending)"
            fi
        done
        ;;
    
    *)
        echo "Usage: $0 [up|status]"
        exit 1
        ;;
esac

