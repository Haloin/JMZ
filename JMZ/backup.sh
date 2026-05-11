#!/bin/bash

# VidSnatch Backup Script
# Creates daily backups of SQLite database

set -e

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_PATH="/data/data.db"
BACKUP_FILE="$BACKUP_DIR/vidsnatch_backup_$DATE.db"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create backup
echo "Creating backup: $BACKUP_FILE"
sqlite3 $DB_PATH ".backup $BACKUP_FILE"

# Compress backup
gzip $BACKUP_FILE
echo "Backup compressed: ${BACKUP_FILE}.gz"

# Upload to S3 if configured
if [ ! -z "$S3_BACKUP_BUCKET" ]; then
    echo "Uploading to S3 bucket: $S3_BACKUP_BUCKET"
    aws s3 cp "${BACKUP_FILE}.gz" "s3://$S3_BACKUP_BUCKET/backups/"
    echo "Upload complete"
fi

# Clean up old backups (keep last 7 days)
find $BACKUP_DIR -name "vidsnatch_backup_*.db.gz" -mtime +7 -delete
echo "Old backups cleaned up"

echo "Backup completed successfully"