# Backup and Disaster Recovery Guide for 7P Education Platform

## Overview and Strategy

Comprehensive backup and disaster recovery planning is critical for educational platforms to ensure business continuity, protect student data, and maintain service availability. The 7P Education Platform implements a multi-layered backup strategy with automated recovery procedures, ensuring minimal downtime and data loss in any disaster scenario.

### Disaster Recovery Objectives

**Recovery Time Objective (RTO)**
- **Critical Services**: 15 minutes maximum downtime
- **Standard Services**: 1 hour maximum downtime
- **Non-Critical Services**: 4 hours maximum downtime

**Recovery Point Objective (RPO)**
- **Database**: Maximum 5 minutes of data loss
- **User-Generated Content**: Maximum 15 minutes of data loss
- **Configuration Data**: Maximum 1 hour of data loss

**Business Continuity Requirements**
- **Student Access**: 99.9% availability during business hours
- **Assessment Data**: Zero tolerance for data loss
- **Video Content**: 99.5% availability with regional redundancy
- **User Authentication**: 99.95% availability with multi-region failover

## Backup Architecture and Strategy

### Multi-Tier Backup Approach

**Tier 1: Real-Time Replication**
- Database streaming replication with hot standby
- Redis persistence with AOF and RDB snapshots
- File system replication for user-generated content
- Configuration synchronization across regions

**Tier 2: Automated Periodic Backups**
- Database full and incremental backups every 6 hours
- Application state snapshots every hour
- File system backups every 4 hours
- Container image registry synchronization

**Tier 3: Long-Term Archival**
- Daily consolidated backups retained for 90 days
- Weekly backups retained for 1 year
- Monthly backups retained for 7 years (compliance requirement)
- Annual backups with permanent retention

### Backup Infrastructure Setup

**Backup Storage Architecture**
```yaml
# backup-storage.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: backup-system
  labels:
    name: backup-system
    purpose: disaster-recovery
---
# AWS S3 Storage Classes Configuration
apiVersion: v1
kind: Secret
metadata:
  name: aws-backup-credentials
  namespace: backup-system
type: Opaque
data:
  access-key-id: <base64-encoded-access-key>
  secret-access-key: <base64-encoded-secret-key>
  region: <base64-encoded-region>
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: backup-config
  namespace: backup-system
data:
  retention-policy.json: |
    {
      "tiers": {
        "hot": {
          "duration": "7d",
          "storage_class": "STANDARD",
          "cost_per_gb_month": 0.023
        },
        "warm": {
          "duration": "30d",
          "storage_class": "STANDARD_IA",
          "cost_per_gb_month": 0.0125
        },
        "cold": {
          "duration": "90d",
          "storage_class": "GLACIER",
          "cost_per_gb_month": 0.004
        },
        "frozen": {
          "duration": "2555d",
          "storage_class": "DEEP_ARCHIVE",
          "cost_per_gb_month": 0.00099
        }
      },
      "lifecycle_rules": [
        {
          "id": "education-platform-lifecycle",
          "status": "Enabled",
          "transitions": [
            {
              "days": 7,
              "storage_class": "STANDARD_IA"
            },
            {
              "days": 30,
              "storage_class": "GLACIER"
            },
            {
              "days": 90,
              "storage_class": "DEEP_ARCHIVE"
            }
          ]
        }
      ]
    }
  
  backup-schedule.yaml: |
    schedules:
      database:
        full_backup: "0 2,8,14,20 * * *"  # Every 6 hours
        incremental: "*/15 * * * *"        # Every 15 minutes
        point_in_time_recovery: "continuous"
      
      redis:
        snapshot: "*/30 * * * *"            # Every 30 minutes
        aof_backup: "continuous"
      
      filesystem:
        incremental: "0 */4 * * *"          # Every 4 hours
        full_backup: "0 1 * * *"            # Daily at 1 AM
      
      configuration:
        backup: "0 */1 * * *"               # Hourly
        git_sync: "*/5 * * * *"             # Every 5 minutes
      
      application_state:
        snapshot: "0 * * * *"               # Hourly
        manifest_backup: "*/15 * * * *"     # Every 15 minutes
```

### Database Backup and Recovery

**PostgreSQL Backup Strategy**
```yaml
# postgres-backup-system.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-backup-scripts
  namespace: backup-system
data:
  full-backup.sh: |
    #!/bin/bash
    set -euo pipefail
    
    # Configuration
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="postgres_full_${TIMESTAMP}.sql.gz"
    BACKUP_PATH="/backups/database/full"
    S3_BUCKET="education-platform-backups"
    RETENTION_DAYS=90
    
    # Create backup directory
    mkdir -p "$BACKUP_PATH"
    
    # Perform full backup with compression
    echo "Starting full PostgreSQL backup at $(date)"
    pg_dump "$DATABASE_URL" \
      --verbose \
      --clean \
      --if-exists \
      --create \
      --format=custom \
      --compress=9 \
      --file="$BACKUP_PATH/$BACKUP_FILE"
    
    # Verify backup integrity
    echo "Verifying backup integrity..."
    pg_restore --list "$BACKUP_PATH/$BACKUP_FILE" > /dev/null
    
    if [ $? -eq 0 ]; then
      echo "Backup verification successful"
      
      # Upload to S3 with encryption
      aws s3 cp "$BACKUP_PATH/$BACKUP_FILE" \
        "s3://$S3_BUCKET/database/full/" \
        --server-side-encryption AES256 \
        --storage-class STANDARD_IA \
        --metadata "backup-type=full,timestamp=$TIMESTAMP,verification=passed"
      
      # Update backup metadata
      echo "$TIMESTAMP,$BACKUP_FILE,full,$(stat -c%s "$BACKUP_PATH/$BACKUP_FILE"),verified" >> \
        "$BACKUP_PATH/backup_log.csv"
      
      echo "Full backup completed successfully: $BACKUP_FILE"
    else
      echo "Backup verification failed! Check backup integrity."
      exit 1
    fi
    
    # Cleanup local files older than retention period
    find "$BACKUP_PATH" -name "postgres_full_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    
    # Cleanup S3 files based on lifecycle policy
    aws s3api list-objects-v2 \
      --bucket "$S3_BUCKET" \
      --prefix "database/full/" \
      --query "Contents[?LastModified<='$(date -d "$RETENTION_DAYS days ago" -u +%Y-%m-%dT%H:%M:%S.000Z)'].Key" \
      --output text | \
    xargs -I {} aws s3 rm "s3://$S3_BUCKET/{}"
  
  incremental-backup.sh: |
    #!/bin/bash
    set -euo pipefail
    
    # WAL-E based incremental backup
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    WAL_PATH="/var/lib/postgresql/data/pg_wal"
    BACKUP_PATH="/backups/database/wal"
    S3_BUCKET="education-platform-backups"
    
    # Ensure WAL archiving is enabled
    if [ ! -d "$BACKUP_PATH" ]; then
      mkdir -p "$BACKUP_PATH"
    fi
    
    # Archive WAL files to S3
    echo "Starting WAL backup at $(date)"
    
    # Sync current WAL files
    for wal_file in "$WAL_PATH"/0*; do
      if [ -f "$wal_file" ]; then
        filename=$(basename "$wal_file")
        
        # Check if already backed up
        if ! aws s3 ls "s3://$S3_BUCKET/database/wal/$filename" > /dev/null 2>&1; then
          aws s3 cp "$wal_file" \
            "s3://$S3_BUCKET/database/wal/" \
            --server-side-encryption AES256 \
            --metadata "backup-type=wal,timestamp=$TIMESTAMP"
          echo "Archived WAL file: $filename"
        fi
      fi
    done
    
    # Force WAL switch to ensure current transactions are backed up
    psql "$DATABASE_URL" -c "SELECT pg_switch_wal();" > /dev/null
    
    echo "WAL backup completed at $(date)"
  
  restore-database.sh: |
    #!/bin/bash
    set -euo pipefail
    
    RESTORE_TYPE="${1:-latest}"
    TARGET_TIME="${2:-}"
    S3_BUCKET="education-platform-backups"
    RESTORE_PATH="/tmp/restore"
    
    echo "Starting database restoration process..."
    
    case "$RESTORE_TYPE" in
      "latest")
        # Find latest full backup
        BACKUP_FILE=$(aws s3 ls "s3://$S3_BUCKET/database/full/" | \
          sort | tail -n 1 | awk '{print $4}')
        ;;
      "point-in-time")
        if [ -z "$TARGET_TIME" ]; then
          echo "Error: Point-in-time recovery requires target time"
          echo "Usage: $0 point-in-time 'YYYY-MM-DD HH:MM:SS'"
          exit 1
        fi
        
        # Find backup before target time
        BACKUP_FILE=$(aws s3 ls "s3://$S3_BUCKET/database/full/" | \
          awk -v target="$TARGET_TIME" '$1" "$2 < target {file=$4} END {print file}')
        ;;
      *)
        BACKUP_FILE="$RESTORE_TYPE"
        ;;
    esac
    
    if [ -z "$BACKUP_FILE" ]; then
      echo "Error: No suitable backup found"
      exit 1
    fi
    
    echo "Restoring from backup: $BACKUP_FILE"
    
    # Create restore directory
    mkdir -p "$RESTORE_PATH"
    
    # Download backup file
    aws s3 cp "s3://$S3_BUCKET/database/full/$BACKUP_FILE" \
      "$RESTORE_PATH/$BACKUP_FILE"
    
    # Stop application services
    echo "Stopping application services..."
    kubectl scale deployment frontend --replicas=0 -n education-platform
    kubectl scale deployment api --replicas=0 -n education-platform
    
    # Wait for services to stop
    kubectl wait --for=delete pod -l app=frontend -n education-platform --timeout=300s
    kubectl wait --for=delete pod -l app=api -n education-platform --timeout=300s
    
    # Perform database restoration
    echo "Restoring database..."
    pg_restore \
      --verbose \
      --clean \
      --if-exists \
      --create \
      --dbname="$DATABASE_URL" \
      "$RESTORE_PATH/$BACKUP_FILE"
    
    # Point-in-time recovery if specified
    if [ "$RESTORE_TYPE" = "point-in-time" ]; then
      echo "Performing point-in-time recovery to $TARGET_TIME"
      
      # Download and apply WAL files
      aws s3 sync "s3://$S3_BUCKET/database/wal/" "$RESTORE_PATH/wal/"
      
      # Configure recovery
      cat > "$RESTORE_PATH/recovery.conf" << EOF
    restore_command = 'cp $RESTORE_PATH/wal/%f %p'
    recovery_target_time = '$TARGET_TIME'
    recovery_target_action = 'promote'
    EOF
      
      # Apply WAL files for point-in-time recovery
      psql "$DATABASE_URL" -c "SELECT pg_reload_conf();"
    fi
    
    # Verify database integrity
    echo "Verifying database integrity..."
    psql "$DATABASE_URL" -c "VACUUM ANALYZE;"
    
    # Restart application services
    echo "Restarting application services..."
    kubectl scale deployment frontend --replicas=3 -n education-platform
    kubectl scale deployment api --replicas=2 -n education-platform
    
    # Wait for services to be ready
    kubectl wait --for=condition=ready pod -l app=frontend -n education-platform --timeout=600s
    kubectl wait --for=condition=ready pod -l app=api -n education-platform --timeout=600s
    
    # Cleanup restore files
    rm -rf "$RESTORE_PATH"
    
    echo "Database restoration completed successfully!"
    echo "Restored from: $BACKUP_FILE"
    if [ "$RESTORE_TYPE" = "point-in-time" ]; then
      echo "Recovery target time: $TARGET_TIME"
    fi
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-full-backup
  namespace: backup-system
spec:
  schedule: "0 2,8,14,20 * * *"  # Every 6 hours
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 5
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        metadata:
          labels:
            app: postgres-backup
            backup-type: full
        spec:
          containers:
          - name: postgres-backup
            image: postgres:15-alpine
            command: ["/bin/bash", "/scripts/full-backup.sh"]
            env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: database-credentials
                  key: url
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: aws-backup-credentials
                  key: access-key-id
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: aws-backup-credentials
                  key: secret-access-key
            - name: AWS_DEFAULT_REGION
              valueFrom:
                secretKeyRef:
                  name: aws-backup-credentials
                  key: region
            volumeMounts:
            - name: backup-scripts
              mountPath: /scripts
            - name: backup-storage
              mountPath: /backups
            resources:
              requests:
                cpu: 500m
                memory: 1Gi
              limits:
                cpu: 1000m
                memory: 2Gi
          volumes:
          - name: backup-scripts
            configMap:
              name: postgres-backup-scripts
              defaultMode: 0755
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-storage
          restartPolicy: OnFailure
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-incremental-backup
  namespace: backup-system
spec:
  schedule: "*/15 * * * *"  # Every 15 minutes
  concurrencyPolicy: Allow
  successfulJobsHistoryLimit: 10
  failedJobsHistoryLimit: 5
  jobTemplate:
    spec:
      template:
        metadata:
          labels:
            app: postgres-backup
            backup-type: incremental
        spec:
          containers:
          - name: postgres-incremental-backup
            image: postgres:15-alpine
            command: ["/bin/bash", "/scripts/incremental-backup.sh"]
            env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: database-credentials
                  key: url
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: aws-backup-credentials
                  key: access-key-id
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: aws-backup-credentials
                  key: secret-access-key
            - name: AWS_DEFAULT_REGION
              valueFrom:
                secretKeyRef:
                  name: aws-backup-credentials
                  key: region
            volumeMounts:
            - name: backup-scripts
              mountPath: /scripts
            - name: backup-storage
              mountPath: /backups
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
              readOnly: true
            resources:
              requests:
                cpu: 100m
                memory: 256Mi
              limits:
                cpu: 200m
                memory: 512Mi
          volumes:
          - name: backup-scripts
            configMap:
              name: postgres-backup-scripts
              defaultMode: 0755
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-storage
          - name: postgres-data
            persistentVolumeClaim:
              claimName: postgres-storage
          restartPolicy: OnFailure
```

### Redis Backup and Recovery

**Redis Backup Configuration**
```yaml
# redis-backup-system.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-backup-scripts
  namespace: backup-system
data:
  redis-backup.sh: |
    #!/bin/bash
    set -euo pipefail
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_PATH="/backups/redis"
    S3_BUCKET="education-platform-backups"
    REDIS_HOST="redis-service.education-platform"
    REDIS_PORT="6379"
    
    mkdir -p "$BACKUP_PATH"
    
    echo "Starting Redis backup at $(date)"
    
    # Create RDB snapshot
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" BGSAVE
    
    # Wait for background save to complete
    while [ "$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" LASTSAVE)" = "$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" LASTSAVE)" ]; do
      sleep 1
    done
    
    # Copy RDB file
    kubectl cp "education-platform/$(kubectl get pods -n education-platform -l app=redis -o jsonpath='{.items[0].metadata.name}'):/data/dump.rdb" \
      "$BACKUP_PATH/redis_${TIMESTAMP}.rdb"
    
    # Compress backup
    gzip "$BACKUP_PATH/redis_${TIMESTAMP}.rdb"
    
    # Upload to S3
    aws s3 cp "$BACKUP_PATH/redis_${TIMESTAMP}.rdb.gz" \
      "s3://$S3_BUCKET/redis/" \
      --server-side-encryption AES256 \
      --metadata "backup-type=rdb,timestamp=$TIMESTAMP"
    
    # Backup AOF if enabled
    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" CONFIG GET appendonly | grep -q yes; then
      kubectl cp "education-platform/$(kubectl get pods -n education-platform -l app=redis -o jsonpath='{.items[0].metadata.name}'):/data/appendonly.aof" \
        "$BACKUP_PATH/redis_aof_${TIMESTAMP}.aof"
      
      gzip "$BACKUP_PATH/redis_aof_${TIMESTAMP}.aof"
      
      aws s3 cp "$BACKUP_PATH/redis_aof_${TIMESTAMP}.aof.gz" \
        "s3://$S3_BUCKET/redis/" \
        --server-side-encryption AES256 \
        --metadata "backup-type=aof,timestamp=$TIMESTAMP"
    fi
    
    # Cleanup local files older than 7 days
    find "$BACKUP_PATH" -name "redis_*.gz" -mtime +7 -delete
    
    echo "Redis backup completed at $(date)"
  
  redis-restore.sh: |
    #!/bin/bash
    set -euo pipefail
    
    RESTORE_FILE="${1:-latest}"
    S3_BUCKET="education-platform-backups"
    RESTORE_PATH="/tmp/redis-restore"
    
    echo "Starting Redis restoration..."
    
    mkdir -p "$RESTORE_PATH"
    
    if [ "$RESTORE_FILE" = "latest" ]; then
      # Find latest RDB backup
      RESTORE_FILE=$(aws s3 ls "s3://$S3_BUCKET/redis/" | \
        grep "\.rdb\.gz$" | sort | tail -n 1 | awk '{print $4}')
    fi
    
    if [ -z "$RESTORE_FILE" ]; then
      echo "Error: No backup file found"
      exit 1
    fi
    
    echo "Restoring from: $RESTORE_FILE"
    
    # Download backup
    aws s3 cp "s3://$S3_BUCKET/redis/$RESTORE_FILE" \
      "$RESTORE_PATH/$RESTORE_FILE"
    
    # Extract backup
    gunzip "$RESTORE_PATH/$RESTORE_FILE"
    RDB_FILE="${RESTORE_FILE%.gz}"
    
    # Stop Redis service
    kubectl scale deployment redis --replicas=0 -n education-platform
    kubectl wait --for=delete pod -l app=redis -n education-platform --timeout=300s
    
    # Copy restored file to Redis pod
    kubectl scale deployment redis --replicas=1 -n education-platform
    kubectl wait --for=condition=ready pod -l app=redis -n education-platform --timeout=300s
    
    REDIS_POD=$(kubectl get pods -n education-platform -l app=redis -o jsonpath='{.items[0].metadata.name}')
    kubectl cp "$RESTORE_PATH/$RDB_FILE" "education-platform/$REDIS_POD:/data/dump.rdb"
    
    # Restart Redis to load the restored data
    kubectl delete pod -l app=redis -n education-platform
    kubectl wait --for=condition=ready pod -l app=redis -n education-platform --timeout=300s
    
    # Verify restoration
    REDIS_HOST="redis-service.education-platform"
    REDIS_PORT="6379"
    KEY_COUNT=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" DBSIZE)
    
    echo "Redis restoration completed successfully!"
    echo "Database contains $KEY_COUNT keys"
    
    # Cleanup
    rm -rf "$RESTORE_PATH"
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: redis-backup
  namespace: backup-system
spec:
  schedule: "*/30 * * * *"  # Every 30 minutes
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 5
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        metadata:
          labels:
            app: redis-backup
        spec:
          containers:
          - name: redis-backup
            image: redis:7-alpine
            command: ["/bin/bash", "/scripts/redis-backup.sh"]
            env:
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: redis-credentials
                  key: password
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: aws-backup-credentials
                  key: access-key-id
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: aws-backup-credentials
                  key: secret-access-key
            - name: AWS_DEFAULT_REGION
              valueFrom:
                secretKeyRef:
                  name: aws-backup-credentials
                  key: region
            volumeMounts:
            - name: backup-scripts
              mountPath: /scripts
            - name: backup-storage
              mountPath: /backups
            resources:
              requests:
                cpu: 100m
                memory: 256Mi
              limits:
                cpu: 200m
                memory: 512Mi
          volumes:
          - name: backup-scripts
            configMap:
              name: redis-backup-scripts
              defaultMode: 0755
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-storage
          restartPolicy: OnFailure
```

### File System and Application Data Backup

**File System Backup Strategy**
```yaml
# filesystem-backup-system.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: filesystem-backup-scripts
  namespace: backup-system
data:
  filesystem-backup.sh: |
    #!/bin/bash
    set -euo pipefail
    
    BACKUP_TYPE="${1:-incremental}"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_PATH="/backups/filesystem"
    S3_BUCKET="education-platform-backups"
    SOURCE_PATHS=(
      "/app/uploads"
      "/app/static"
      "/app/cache"
      "/app/logs"
    )
    
    mkdir -p "$BACKUP_PATH"
    
    echo "Starting $BACKUP_TYPE filesystem backup at $(date)"
    
    case "$BACKUP_TYPE" in
      "full")
        # Full backup with compression
        for path in "${SOURCE_PATHS[@]}"; do
          if [ -d "$path" ]; then
            dir_name=$(basename "$path")
            tar_file="filesystem_${dir_name}_full_${TIMESTAMP}.tar.gz"
            
            echo "Backing up $path..."
            tar -czf "$BACKUP_PATH/$tar_file" \
              --exclude="*.tmp" \
              --exclude="*.log" \
              --exclude="cache/*" \
              -C "$(dirname "$path")" \
              "$(basename "$path")"
            
            # Upload to S3
            aws s3 cp "$BACKUP_PATH/$tar_file" \
              "s3://$S3_BUCKET/filesystem/full/" \
              --server-side-encryption AES256 \
              --metadata "backup-type=full,timestamp=$TIMESTAMP,source-path=$path"
          fi
        done
        ;;
      
      "incremental")
        # Incremental backup using rsync
        for path in "${SOURCE_PATHS[@]}"; do
          if [ -d "$path" ]; then
            dir_name=$(basename "$path")
            
            echo "Incremental backup of $path..."
            aws s3 sync "$path/" \
              "s3://$S3_BUCKET/filesystem/incremental/$dir_name/" \
              --delete \
              --exclude "*.tmp" \
              --exclude "*.log" \
              --exclude "cache/*" \
              --storage-class STANDARD_IA
          fi
        done
        ;;
    esac
    
    # Cleanup old local files
    find "$BACKUP_PATH" -name "filesystem_*.tar.gz" -mtime +7 -delete
    
    echo "Filesystem backup completed at $(date)"
  
  filesystem-restore.sh: |
    #!/bin/bash
    set -euo pipefail
    
    RESTORE_TYPE="${1:-latest}"
    TARGET_DATE="${2:-}"
    S3_BUCKET="education-platform-backups"
    RESTORE_PATH="/tmp/filesystem-restore"
    
    echo "Starting filesystem restoration..."
    
    mkdir -p "$RESTORE_PATH"
    
    case "$RESTORE_TYPE" in
      "full")
        if [ -z "$TARGET_DATE" ]; then
          echo "Error: Full restore requires target date (YYYYMMDD)"
          exit 1
        fi
        
        # Download and restore full backups
        aws s3 ls "s3://$S3_BUCKET/filesystem/full/" | \
          grep "$TARGET_DATE" | \
          awk '{print $4}' | \
        while read -r backup_file; do
          echo "Restoring $backup_file..."
          
          aws s3 cp "s3://$S3_BUCKET/filesystem/full/$backup_file" \
            "$RESTORE_PATH/$backup_file"
          
          # Extract to appropriate location
          if [[ "$backup_file" == *"uploads"* ]]; then
            tar -xzf "$RESTORE_PATH/$backup_file" -C /app/
          elif [[ "$backup_file" == *"static"* ]]; then
            tar -xzf "$RESTORE_PATH/$backup_file" -C /app/
          fi
        done
        ;;
      
      "incremental")
        # Restore from incremental backups
        echo "Restoring incremental backups..."
        
        # Stop application to prevent file conflicts
        kubectl scale deployment frontend --replicas=0 -n education-platform
        kubectl wait --for=delete pod -l app=frontend -n education-platform --timeout=300s
        
        # Sync from S3
        aws s3 sync "s3://$S3_BUCKET/filesystem/incremental/uploads/" /app/uploads/
        aws s3 sync "s3://$S3_BUCKET/filesystem/incremental/static/" /app/static/
        
        # Restart application
        kubectl scale deployment frontend --replicas=3 -n education-platform
        kubectl wait --for=condition=ready pod -l app=frontend -n education-platform --timeout=600s
        ;;
      
      *)
        echo "Invalid restore type. Use 'full' or 'incremental'"
        exit 1
        ;;
    esac
    
    # Set proper permissions
    chown -R 1001:1001 /app/uploads /app/static
    chmod -R 755 /app/uploads /app/static
    
    echo "Filesystem restoration completed!"
    
    # Cleanup
    rm -rf "$RESTORE_PATH"
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: filesystem-incremental-backup
  namespace: backup-system
spec:
  schedule: "0 */4 * * *"  # Every 4 hours
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 2
  jobTemplate:
    spec:
      template:
        metadata:
          labels:
            app: filesystem-backup
            backup-type: incremental
        spec:
          containers:
          - name: filesystem-backup
            image: amazon/aws-cli:latest
            command: ["/bin/bash", "/scripts/filesystem-backup.sh", "incremental"]
            env:
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: aws-backup-credentials
                  key: access-key-id
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: aws-backup-credentials
                  key: secret-access-key
            - name: AWS_DEFAULT_REGION
              valueFrom:
                secretKeyRef:
                  name: aws-backup-credentials
                  key: region
            volumeMounts:
            - name: backup-scripts
              mountPath: /scripts
            - name: backup-storage
              mountPath: /backups
            - name: app-uploads
              mountPath: /app/uploads
              readOnly: true
            - name: app-static
              mountPath: /app/static
              readOnly: true
            resources:
              requests:
                cpu: 200m
                memory: 512Mi
              limits:
                cpu: 500m
                memory: 1Gi
          volumes:
          - name: backup-scripts
            configMap:
              name: filesystem-backup-scripts
              defaultMode: 0755
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-storage
          - name: app-uploads
            persistentVolumeClaim:
              claimName: app-uploads-storage
          - name: app-static
            persistentVolumeClaim:
              claimName: app-static-storage
          restartPolicy: OnFailure
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: filesystem-full-backup
  namespace: backup-system
spec:
  schedule: "0 1 * * *"  # Daily at 1 AM
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 7
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        metadata:
          labels:
            app: filesystem-backup
            backup-type: full
        spec:
          containers:
          - name: filesystem-backup
            image: amazon/aws-cli:latest
            command: ["/bin/bash", "/scripts/filesystem-backup.sh", "full"]
            env:
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: aws-backup-credentials
                  key: access-key-id
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: aws-backup-credentials
                  key: secret-access-key
            - name: AWS_DEFAULT_REGION
              valueFrom:
                secretKeyRef:
                  name: aws-backup-credentials
                  key: region
            volumeMounts:
            - name: backup-scripts
              mountPath: /scripts
            - name: backup-storage
              mountPath: /backups
            - name: app-uploads
              mountPath: /app/uploads
              readOnly: true
            - name: app-static
              mountPath: /app/static
              readOnly: true
            resources:
              requests:
                cpu: 500m
                memory: 1Gi
              limits:
                cpu: 1000m
                memory: 2Gi
          volumes:
          - name: backup-scripts
            configMap:
              name: filesystem-backup-scripts
              defaultMode: 0755
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-storage
          - name: app-uploads
            persistentVolumeClaim:
              claimName: app-uploads-storage
          - name: app-static
            persistentVolumeClaim:
              claimName: app-static-storage
          restartPolicy: OnFailure
```

## Disaster Recovery Procedures

### Automated Disaster Recovery System

**Disaster Recovery Orchestration**
```yaml
# disaster-recovery-orchestrator.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: disaster-recovery-orchestrator
  namespace: backup-system
data:
  dr-orchestrator.py: |
    #!/usr/bin/env python3
    import os
    import sys
    import json
    import subprocess
    import time
    import logging
    from datetime import datetime, timedelta
    from kubernetes import client, config
    
    # Configure logging
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    logger = logging.getLogger(__name__)
    
    class DisasterRecoveryOrchestrator:
        def __init__(self):
            config.load_incluster_config()
            self.k8s_apps = client.AppsV1Api()
            self.k8s_core = client.CoreV1Api()
            self.k8s_batch = client.BatchV1Api()
            
            self.namespace = os.getenv('NAMESPACE', 'education-platform')
            self.backup_namespace = os.getenv('BACKUP_NAMESPACE', 'backup-system')
            self.s3_bucket = os.getenv('S3_BUCKET', 'education-platform-backups')
            
        def check_system_health(self):
            """Check overall system health"""
            try:
                # Check critical services
                services_status = {}
                critical_services = ['frontend', 'api', 'postgres', 'redis']
                
                for service in critical_services:
                    pods = self.k8s_core.list_namespaced_pod(
                        namespace=self.namespace,
                        label_selector=f'app={service}'
                    )
                    
                    healthy_pods = sum(1 for pod in pods.items 
                                     if pod.status.phase == 'Running')
                    total_pods = len(pods.items)
                    
                    services_status[service] = {
                        'healthy': healthy_pods,
                        'total': total_pods,
                        'status': 'healthy' if healthy_pods > 0 else 'unhealthy'
                    }
                
                return services_status
            except Exception as e:
                logger.error(f"Health check failed: {e}")
                return None
        
        def initiate_disaster_recovery(self, disaster_type, target_time=None):
            """Initiate disaster recovery based on type"""
            logger.info(f"Initiating disaster recovery: {disaster_type}")
            
            recovery_plan = {
                'complete_failure': self._complete_system_recovery,
                'database_corruption': self._database_recovery,
                'data_loss': self._data_recovery,
                'point_in_time': self._point_in_time_recovery
            }
            
            if disaster_type not in recovery_plan:
                logger.error(f"Unknown disaster type: {disaster_type}")
                return False
            
            try:
                return recovery_plan[disaster_type](target_time)
            except Exception as e:
                logger.error(f"Disaster recovery failed: {e}")
                return False
        
        def _complete_system_recovery(self, target_time=None):
            """Complete system recovery from backups"""
            logger.info("Starting complete system recovery")
            
            # 1. Scale down all services
            self._scale_services_down()
            
            # 2. Restore database
            if not self._restore_database(target_time):
                logger.error("Database restoration failed")
                return False
            
            # 3. Restore Redis
            if not self._restore_redis():
                logger.error("Redis restoration failed")
                return False
            
            # 4. Restore file systems
            if not self._restore_filesystem():
                logger.error("Filesystem restoration failed")
                return False
            
            # 5. Scale up services
            self._scale_services_up()
            
            # 6. Verify recovery
            time.sleep(60)  # Wait for services to stabilize
            health_status = self.check_system_health()
            
            if all(service['status'] == 'healthy' for service in health_status.values()):
                logger.info("Complete system recovery successful")
                return True
            else:
                logger.error("System recovery verification failed")
                return False
        
        def _database_recovery(self, target_time=None):
            """Database-specific recovery"""
            logger.info("Starting database recovery")
            
            # Scale down database-dependent services
            self._scale_specific_services_down(['frontend', 'api'])
            
            # Restore database
            if self._restore_database(target_time):
                self._scale_specific_services_up(['frontend', 'api'])
                logger.info("Database recovery successful")
                return True
            else:
                logger.error("Database recovery failed")
                return False
        
        def _data_recovery(self, target_time=None):
            """File system data recovery"""
            logger.info("Starting data recovery")
            
            # Scale down services that use file storage
            self._scale_specific_services_down(['frontend'])
            
            # Restore filesystem
            if self._restore_filesystem():
                self._scale_specific_services_up(['frontend'])
                logger.info("Data recovery successful")
                return True
            else:
                logger.error("Data recovery failed")
                return False
        
        def _point_in_time_recovery(self, target_time):
            """Point-in-time recovery"""
            if not target_time:
                logger.error("Point-in-time recovery requires target time")
                return False
            
            logger.info(f"Starting point-in-time recovery to {target_time}")
            
            # Scale down all services
            self._scale_services_down()
            
            # Restore database to specific point in time
            if self._restore_database(target_time):
                # Restore other components to nearest backup
                self._restore_redis()
                self._restore_filesystem()
                
                # Scale up services
                self._scale_services_up()
                
                logger.info("Point-in-time recovery successful")
                return True
            else:
                logger.error("Point-in-time recovery failed")
                return False
        
        def _scale_services_down(self):
            """Scale down all services"""
            services = ['frontend', 'api']
            for service in services:
                try:
                    self.k8s_apps.patch_namespaced_deployment_scale(
                        name=service,
                        namespace=self.namespace,
                        body={'spec': {'replicas': 0}}
                    )
                    logger.info(f"Scaled down {service}")
                except Exception as e:
                    logger.error(f"Failed to scale down {service}: {e}")
        
        def _scale_services_up(self):
            """Scale up all services to normal capacity"""
            service_replicas = {
                'frontend': 3,
                'api': 2
            }
            
            for service, replicas in service_replicas.items():
                try:
                    self.k8s_apps.patch_namespaced_deployment_scale(
                        name=service,
                        namespace=self.namespace,
                        body={'spec': {'replicas': replicas}}
                    )
                    logger.info(f"Scaled up {service} to {replicas} replicas")
                except Exception as e:
                    logger.error(f"Failed to scale up {service}: {e}")
        
        def _scale_specific_services_down(self, services):
            """Scale down specific services"""
            for service in services:
                try:
                    self.k8s_apps.patch_namespaced_deployment_scale(
                        name=service,
                        namespace=self.namespace,
                        body={'spec': {'replicas': 0}}
                    )
                    logger.info(f"Scaled down {service}")
                except Exception as e:
                    logger.error(f"Failed to scale down {service}: {e}")
        
        def _scale_specific_services_up(self, services):
            """Scale up specific services"""
            service_replicas = {
                'frontend': 3,
                'api': 2
            }
            
            for service in services:
                replicas = service_replicas.get(service, 1)
                try:
                    self.k8s_apps.patch_namespaced_deployment_scale(
                        name=service,
                        namespace=self.namespace,
                        body={'spec': {'replicas': replicas}}
                    )
                    logger.info(f"Scaled up {service} to {replicas} replicas")
                except Exception as e:
                    logger.error(f"Failed to scale up {service}: {e}")
        
        def _restore_database(self, target_time=None):
            """Execute database restoration"""
            try:
                restore_type = 'point-in-time' if target_time else 'latest'
                cmd = ['/scripts/restore-database.sh', restore_type]
                
                if target_time:
                    cmd.append(target_time)
                
                result = subprocess.run(cmd, capture_output=True, text=True)
                
                if result.returncode == 0:
                    logger.info("Database restoration completed")
                    return True
                else:
                    logger.error(f"Database restoration failed: {result.stderr}")
                    return False
            except Exception as e:
                logger.error(f"Database restoration error: {e}")
                return False
        
        def _restore_redis(self):
            """Execute Redis restoration"""
            try:
                result = subprocess.run(
                    ['/scripts/redis-restore.sh', 'latest'],
                    capture_output=True, text=True
                )
                
                if result.returncode == 0:
                    logger.info("Redis restoration completed")
                    return True
                else:
                    logger.error(f"Redis restoration failed: {result.stderr}")
                    return False
            except Exception as e:
                logger.error(f"Redis restoration error: {e}")
                return False
        
        def _restore_filesystem(self):
            """Execute filesystem restoration"""
            try:
                result = subprocess.run(
                    ['/scripts/filesystem-restore.sh', 'incremental'],
                    capture_output=True, text=True
                )
                
                if result.returncode == 0:
                    logger.info("Filesystem restoration completed")
                    return True
                else:
                    logger.error(f"Filesystem restoration failed: {result.stderr}")
                    return False
            except Exception as e:
                logger.error(f"Filesystem restoration error: {e}")
                return False
        
        def create_recovery_report(self, disaster_type, success, duration):
            """Create disaster recovery report"""
            report = {
                'timestamp': datetime.utcnow().isoformat(),
                'disaster_type': disaster_type,
                'recovery_successful': success,
                'recovery_duration_minutes': duration,
                'system_health': self.check_system_health()
            }
            
            # Save report to backup system
            with open(f'/backups/dr_report_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.json', 'w') as f:
                json.dump(report, f, indent=2)
            
            logger.info(f"Recovery report created: {report}")
            return report
    
    def main():
        if len(sys.argv) < 2:
            print("Usage: dr-orchestrator.py <disaster_type> [target_time]")
            print("Disaster types: complete_failure, database_corruption, data_loss, point_in_time")
            sys.exit(1)
        
        disaster_type = sys.argv[1]
        target_time = sys.argv[2] if len(sys.argv) > 2 else None
        
        orchestrator = DisasterRecoveryOrchestrator()
        
        start_time = time.time()
        success = orchestrator.initiate_disaster_recovery(disaster_type, target_time)
        duration = (time.time() - start_time) / 60  # Convert to minutes
        
        # Create recovery report
        orchestrator.create_recovery_report(disaster_type, success, duration)
        
        if success:
            logger.info(f"Disaster recovery completed successfully in {duration:.2f} minutes")
            sys.exit(0)
        else:
            logger.error(f"Disaster recovery failed after {duration:.2f} minutes")
            sys.exit(1)
    
    if __name__ == "__main__":
        main()
  
  dr-health-monitor.py: |
    #!/usr/bin/env python3
    import time
    import logging
    import requests
    import subprocess
    from datetime import datetime
    from kubernetes import client, config
    
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    
    class DisasterRecoveryMonitor:
        def __init__(self):
            config.load_incluster_config()
            self.k8s_core = client.CoreV1Api()
            self.namespace = 'education-platform'
            
            # Health check endpoints
            self.health_endpoints = {
                'frontend': 'http://frontend-service:80/api/health',
                'api': 'http://api-service:80/health',
                'database': 'postgres://postgres:5432',
                'redis': 'redis://redis-service:6379'
            }
            
            # Failure thresholds
            self.failure_thresholds = {
                'consecutive_failures': 3,
                'failure_window_minutes': 5,
                'recovery_timeout_minutes': 30
            }
        
        def monitor_system_health(self):
            """Continuous system health monitoring"""
            failure_counts = {service: 0 for service in self.health_endpoints}
            
            while True:
                try:
                    current_time = datetime.utcnow()
                    system_healthy = True
                    
                    for service, endpoint in self.health_endpoints.items():
                        if not self._check_service_health(service, endpoint):
                            failure_counts[service] += 1
                            system_healthy = False
                            
                            if failure_counts[service] >= self.failure_thresholds['consecutive_failures']:
                                logger.error(f"Service {service} has failed {failure_counts[service]} times")
                                self._trigger_service_recovery(service)
                                failure_counts[service] = 0  # Reset after triggering recovery
                        else:
                            failure_counts[service] = 0  # Reset on successful check
                    
                    if system_healthy:
                        logger.info(f"System health check passed at {current_time}")
                    
                    time.sleep(60)  # Check every minute
                
                except Exception as e:
                    logger.error(f"Health monitoring error: {e}")
                    time.sleep(60)
        
        def _check_service_health(self, service, endpoint):
            """Check individual service health"""
            try:
                if service in ['frontend', 'api']:
                    response = requests.get(endpoint, timeout=10)
                    return response.status_code == 200
                elif service == 'database':
                    # Check database connectivity
                    result = subprocess.run(
                        ['pg_isready', '-h', 'postgres-service', '-p', '5432'],
                        capture_output=True, timeout=10
                    )
                    return result.returncode == 0
                elif service == 'redis':
                    # Check Redis connectivity
                    result = subprocess.run(
                        ['redis-cli', '-h', 'redis-service', '-p', '6379', 'ping'],
                        capture_output=True, timeout=10
                    )
                    return b'PONG' in result.stdout
                
                return False
            except Exception as e:
                logger.error(f"Health check failed for {service}: {e}")
                return False
        
        def _trigger_service_recovery(self, service):
            """Trigger recovery for specific service"""
            logger.info(f"Triggering recovery for service: {service}")
            
            recovery_actions = {
                'frontend': self._recover_frontend,
                'api': self._recover_api,
                'database': self._recover_database,
                'redis': self._recover_redis
            }
            
            if service in recovery_actions:
                try:
                    recovery_actions[service]()
                    logger.info(f"Recovery initiated for {service}")
                except Exception as e:
                    logger.error(f"Recovery failed for {service}: {e}")
                    self._escalate_to_full_recovery()
        
        def _recover_frontend(self):
            """Recover frontend service"""
            subprocess.run(['kubectl', 'rollout', 'restart', 'deployment/frontend', '-n', self.namespace])
        
        def _recover_api(self):
            """Recover API service"""
            subprocess.run(['kubectl', 'rollout', 'restart', 'deployment/api', '-n', self.namespace])
        
        def _recover_database(self):
            """Recover database service"""
            # Restart PostgreSQL pod
            subprocess.run(['kubectl', 'delete', 'pod', '-l', 'app=postgres', '-n', self.namespace])
        
        def _recover_redis(self):
            """Recover Redis service"""
            # Restart Redis pod
            subprocess.run(['kubectl', 'delete', 'pod', '-l', 'app=redis', '-n', self.namespace])
        
        def _escalate_to_full_recovery(self):
            """Escalate to full disaster recovery"""
            logger.critical("Escalating to full disaster recovery")
            subprocess.run([
                'python3', '/scripts/dr-orchestrator.py', 'complete_failure'
            ])
    
    if __name__ == "__main__":
        monitor = DisasterRecoveryMonitor()
        monitor.monitor_system_health()
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: disaster-recovery-orchestrator
  namespace: backup-system
  labels:
    app: dr-orchestrator
spec:
  replicas: 1
  selector:
    matchLabels:
      app: dr-orchestrator
  template:
    metadata:
      labels:
        app: dr-orchestrator
    spec:
      serviceAccount: disaster-recovery-sa
      containers:
      - name: dr-orchestrator
        image: python:3.9-slim
        command: ["python3", "/scripts/dr-health-monitor.py"]
        env:
        - name: NAMESPACE
          value: "education-platform"
        - name: BACKUP_NAMESPACE
          value: "backup-system"
        - name: S3_BUCKET
          value: "education-platform-backups"
        volumeMounts:
        - name: dr-scripts
          mountPath: /scripts
        - name: backup-storage
          mountPath: /backups
        - name: postgres-scripts
          mountPath: /scripts/postgres
        - name: redis-scripts
          mountPath: /scripts/redis
        - name: filesystem-scripts
          mountPath: /scripts/filesystem
        resources:
          requests:
            cpu: 200m
            memory: 512Mi
          limits:
            cpu: 500m
            memory: 1Gi
      volumes:
      - name: dr-scripts
        configMap:
          name: disaster-recovery-orchestrator
          defaultMode: 0755
      - name: backup-storage
        persistentVolumeClaim:
          claimName: backup-storage
      - name: postgres-scripts
        configMap:
          name: postgres-backup-scripts
          defaultMode: 0755
      - name: redis-scripts
        configMap:
          name: redis-backup-scripts
          defaultMode: 0755
      - name: filesystem-scripts
        configMap:
          name: filesystem-backup-scripts
          defaultMode: 0755
```

## Multi-Region Disaster Recovery

### Cross-Region Replication

**Multi-Region Setup**
```yaml
# multi-region-dr.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: multi-region-config
  namespace: backup-system
data:
  regions.json: |
    {
      "primary_region": "us-east-1",
      "disaster_recovery_regions": [
        {
          "name": "us-west-2",
          "type": "hot_standby",
          "rto_minutes": 15,
          "rpo_minutes": 5
        },
        {
          "name": "eu-west-1",
          "type": "warm_standby",
          "rto_minutes": 60,
          "rpo_minutes": 15
        }
      ],
      "backup_regions": [
        "us-central-1",
        "eu-central-1"
      ]
    }
  
  cross-region-sync.sh: |
    #!/bin/bash
    set -euo pipefail
    
    PRIMARY_REGION="us-east-1"
    DR_REGIONS=("us-west-2" "eu-west-1")
    PRIMARY_BUCKET="education-platform-backups"
    
    echo "Starting cross-region backup synchronization..."
    
    for region in "${DR_REGIONS[@]}"; do
      DR_BUCKET="education-platform-backups-$region"
      
      echo "Syncing to $region..."
      
      # Sync database backups
      aws s3 sync "s3://$PRIMARY_BUCKET/database/" \
        "s3://$DR_BUCKET/database/" \
        --region "$region" \
        --source-region "$PRIMARY_REGION"
      
      # Sync Redis backups
      aws s3 sync "s3://$PRIMARY_BUCKET/redis/" \
        "s3://$DR_BUCKET/redis/" \
        --region "$region" \
        --source-region "$PRIMARY_REGION"
      
      # Sync filesystem backups (selective)
      aws s3 sync "s3://$PRIMARY_BUCKET/filesystem/full/" \
        "s3://$DR_BUCKET/filesystem/full/" \
        --region "$region" \
        --source-region "$PRIMARY_REGION" \
        --exclude "*" \
        --include "$(date +%Y%m%d)*"
      
      echo "Sync to $region completed"
    done
    
    echo "Cross-region synchronization completed"
  
  failover-to-dr.sh: |
    #!/bin/bash
    set -euo pipefail
    
    DR_REGION="${1:-us-west-2}"
    FAILOVER_TYPE="${2:-automatic}"
    
    echo "Initiating failover to DR region: $DR_REGION"
    
    # Update DNS records to point to DR region
    aws route53 change-resource-record-sets \
      --hosted-zone-id "$HOSTED_ZONE_ID" \
      --change-batch file:///tmp/dns-failover-$DR_REGION.json
    
    # Start DR infrastructure
    kubectl config use-context "education-platform-$DR_REGION"
    
    # Scale up DR services
    kubectl scale deployment frontend --replicas=3 -n education-platform
    kubectl scale deployment api --replicas=2 -n education-platform
    kubectl scale statefulset postgres --replicas=1 -n education-platform
    kubectl scale deployment redis --replicas=1 -n education-platform
    
    # Wait for services to be ready
    kubectl wait --for=condition=ready pod -l app=frontend -n education-platform --timeout=600s
    kubectl wait --for=condition=ready pod -l app=api -n education-platform --timeout=600s
    kubectl wait --for=condition=ready pod -l app=postgres -n education-platform --timeout=600s
    kubectl wait --for=condition=ready pod -l app=redis -n education-platform --timeout=300s
    
    # Verify DR environment
    echo "Verifying DR environment health..."
    curl -f "https://education.example.com/api/health" || {
      echo "DR environment health check failed"
      exit 1
    }
    
    echo "Failover to $DR_REGION completed successfully"
    
    # Send notification
    aws sns publish \
      --topic-arn "$SNS_ALERT_TOPIC" \
      --message "Disaster recovery failover to $DR_REGION completed successfully. System is operational."
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cross-region-sync
  namespace: backup-system
spec:
  schedule: "*/30 * * * *"  # Every 30 minutes
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 5
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        metadata:
          labels:
            app: cross-region-sync
        spec:
          containers:
          - name: cross-region-sync
            image: amazon/aws-cli:latest
            command: ["/bin/bash", "/scripts/cross-region-sync.sh"]
            env:
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: aws-backup-credentials
                  key: access-key-id
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: aws-backup-credentials
                  key: secret-access-key
            volumeMounts:
            - name: multi-region-scripts
              mountPath: /scripts
            resources:
              requests:
                cpu: 200m
                memory: 512Mi
              limits:
                cpu: 500m
                memory: 1Gi
          volumes:
          - name: multi-region-scripts
            configMap:
              name: multi-region-config
              defaultMode: 0755
          restartPolicy: OnFailure
```

## Backup Monitoring and Alerting

### Backup Monitoring System

**Backup Health Monitoring**
```yaml
# backup-monitoring.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: backup-monitoring-scripts
  namespace: backup-system
data:
  backup-health-check.py: |
    #!/usr/bin/env python3
    import os
    import json
    import boto3
    import logging
    from datetime import datetime, timedelta
    from kubernetes import client, config
    
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    
    class BackupHealthMonitor:
        def __init__(self):
            self.s3 = boto3.client('s3')
            self.sns = boto3.client('sns')
            self.bucket = os.getenv('S3_BUCKET', 'education-platform-backups')
            self.alert_topic = os.getenv('SNS_ALERT_TOPIC')
            
            # Health check criteria
            self.health_criteria = {
                'database': {
                    'full_backup_interval_hours': 6,
                    'incremental_interval_minutes': 15,
                    'max_age_hours': 8
                },
                'redis': {
                    'backup_interval_minutes': 30,
                    'max_age_hours': 2
                },
                'filesystem': {
                    'full_backup_interval_hours': 24,
                    'incremental_interval_hours': 4,
                    'max_age_hours': 6
                }
            }
        
        def check_backup_health(self):
            """Check health of all backup types"""
            health_report = {
                'timestamp': datetime.utcnow().isoformat(),
                'overall_status': 'healthy',
                'checks': {}
            }
            
            # Check database backups
            db_health = self._check_database_backups()
            health_report['checks']['database'] = db_health
            
            # Check Redis backups
            redis_health = self._check_redis_backups()
            health_report['checks']['redis'] = redis_health
            
            # Check filesystem backups
            fs_health = self._check_filesystem_backups()
            health_report['checks']['filesystem'] = fs_health
            
            # Determine overall status
            if any(check['status'] == 'critical' for check in health_report['checks'].values()):
                health_report['overall_status'] = 'critical'
            elif any(check['status'] == 'warning' for check in health_report['checks'].values()):
                health_report['overall_status'] = 'warning'
            
            # Send alerts if needed
            if health_report['overall_status'] != 'healthy':
                self._send_alert(health_report)
            
            # Save health report
            self._save_health_report(health_report)
            
            return health_report
        
        def _check_database_backups(self):
            """Check database backup health"""
            try:
                # Check full backups
                full_backups = self._list_s3_objects('database/full/')
                latest_full = self._get_latest_backup(full_backups)
                
                # Check incremental backups (WAL files)
                wal_backups = self._list_s3_objects('database/wal/')
                latest_wal = self._get_latest_backup(wal_backups)
                
                criteria = self.health_criteria['database']
                current_time = datetime.utcnow()
                
                # Check full backup age
                full_backup_age = None
                if latest_full:
                    full_backup_age = (current_time - latest_full['LastModified']).total_seconds() / 3600
                
                # Check WAL backup age
                wal_backup_age = None
                if latest_wal:
                    wal_backup_age = (current_time - latest_wal['LastModified']).total_seconds() / 60
                
                # Determine status
                status = 'healthy'
                messages = []
                
                if not latest_full or full_backup_age > criteria['max_age_hours']:
                    status = 'critical'
                    messages.append(f"Full backup too old: {full_backup_age:.1f}h")
                
                if not latest_wal or wal_backup_age > criteria['incremental_interval_minutes'] * 2:
                    if status != 'critical':
                        status = 'warning'
                    messages.append(f"WAL backup too old: {wal_backup_age:.1f}m")
                
                return {
                    'status': status,
                    'messages': messages,
                    'latest_full_backup': latest_full['Key'] if latest_full else None,
                    'latest_wal_backup': latest_wal['Key'] if latest_wal else None,
                    'full_backup_age_hours': full_backup_age,
                    'wal_backup_age_minutes': wal_backup_age
                }
            
            except Exception as e:
                logger.error(f"Database backup health check failed: {e}")
                return {
                    'status': 'critical',
                    'messages': [f"Health check failed: {str(e)}"],
                    'error': str(e)
                }
        
        def _check_redis_backups(self):
            """Check Redis backup health"""
            try:
                backups = self._list_s3_objects('redis/')
                latest_backup = self._get_latest_backup(backups)
                
                criteria = self.health_criteria['redis']
                current_time = datetime.utcnow()
                
                if not latest_backup:
                    return {
                        'status': 'critical',
                        'messages': ['No Redis backups found'],
                        'latest_backup': None
                    }
                
                backup_age = (current_time - latest_backup['LastModified']).total_seconds() / 3600
                
                status = 'healthy'
                messages = []
                
                if backup_age > criteria['max_age_hours']:
                    status = 'critical'
                    messages.append(f"Redis backup too old: {backup_age:.1f}h")
                
                return {
                    'status': status,
                    'messages': messages,
                    'latest_backup': latest_backup['Key'],
                    'backup_age_hours': backup_age
                }
            
            except Exception as e:
                logger.error(f"Redis backup health check failed: {e}")
                return {
                    'status': 'critical',
                    'messages': [f"Health check failed: {str(e)}"],
                    'error': str(e)
                }
        
        def _check_filesystem_backups(self):
            """Check filesystem backup health"""
            try:
                full_backups = self._list_s3_objects('filesystem/full/')
                incremental_backups = self._list_s3_objects('filesystem/incremental/')
                
                latest_full = self._get_latest_backup(full_backups)
                
                criteria = self.health_criteria['filesystem']
                current_time = datetime.utcnow()
                
                status = 'healthy'
                messages = []
                
                # Check full backup
                if not latest_full:
                    status = 'critical'
                    messages.append('No filesystem full backups found')
                else:
                    full_age = (current_time - latest_full['LastModified']).total_seconds() / 3600
                    if full_age > criteria['max_age_hours']:
                        status = 'warning'
                        messages.append(f"Full backup too old: {full_age:.1f}h")
                
                # Check incremental sync (should have recent activity)
                recent_incremental = [
                    obj for obj in incremental_backups
                    if (current_time - obj['LastModified']).total_seconds() < 3600 * criteria['incremental_interval_hours']
                ]
                
                if not recent_incremental:
                    if status != 'critical':
                        status = 'warning'
                    messages.append('No recent incremental backups')
                
                return {
                    'status': status,
                    'messages': messages,
                    'latest_full_backup': latest_full['Key'] if latest_full else None,
                    'recent_incremental_count': len(recent_incremental)
                }
            
            except Exception as e:
                logger.error(f"Filesystem backup health check failed: {e}")
                return {
                    'status': 'critical',
                    'messages': [f"Health check failed: {str(e)}"],
                    'error': str(e)
                }
        
        def _list_s3_objects(self, prefix):
            """List S3 objects with given prefix"""
            try:
                response = self.s3.list_objects_v2(
                    Bucket=self.bucket,
                    Prefix=prefix
                )
                return response.get('Contents', [])
            except Exception as e:
                logger.error(f"Failed to list S3 objects: {e}")
                return []
        
        def _get_latest_backup(self, backups):
            """Get latest backup from list"""
            if not backups:
                return None
            return max(backups, key=lambda x: x['LastModified'])
        
        def _send_alert(self, health_report):
            """Send health alert"""
            if not self.alert_topic:
                return
            
            message = f"""
    Backup Health Alert - Education Platform
    
    Overall Status: {health_report['overall_status'].upper()}
    Timestamp: {health_report['timestamp']}
    
    Issues Found:
    """
            
            for backup_type, check in health_report['checks'].items():
                if check['status'] != 'healthy':
                    message += f"\n{backup_type.title()} ({check['status']}):\n"
                    for msg in check.get('messages', []):
                        message += f"  - {msg}\n"
            
            try:
                self.sns.publish(
                    TopicArn=self.alert_topic,
                    Subject=f"Backup Health Alert - {health_report['overall_status'].title()}",
                    Message=message
                )
                logger.info("Health alert sent successfully")
            except Exception as e:
                logger.error(f"Failed to send health alert: {e}")
        
        def _save_health_report(self, health_report):
            """Save health report to file"""
            timestamp = health_report['timestamp'].replace(':', '-')
            filename = f"/backups/health_reports/backup_health_{timestamp}.json"
            
            os.makedirs(os.path.dirname(filename), exist_ok=True)
            
            with open(filename, 'w') as f:
                json.dump(health_report, f, indent=2, default=str)
            
            logger.info(f"Health report saved: {filename}")
    
    def main():
        monitor = BackupHealthMonitor()
        health_report = monitor.check_backup_health()
        
        print(json.dumps(health_report, indent=2, default=str))
        
        if health_report['overall_status'] == 'critical':
            exit(1)
        elif health_report['overall_status'] == 'warning':
            exit(2)
        else:
            exit(0)
    
    if __name__ == "__main__":
        main()
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-health-monitor
  namespace: backup-system
spec:
  schedule: "*/15 * * * *"  # Every 15 minutes
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 10
  failedJobsHistoryLimit: 5
  jobTemplate:
    spec:
      template:
        metadata:
          labels:
            app: backup-health-monitor
        spec:
          containers:
          - name: backup-health-monitor
            image: python:3.9-slim
            command: ["python3", "/scripts/backup-health-check.py"]
            env:
            - name: S3_BUCKET
              value: "education-platform-backups"
            - name: SNS_ALERT_TOPIC
              valueFrom:
                secretKeyRef:
                  name: aws-sns-credentials
                  key: alert-topic-arn
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: aws-backup-credentials
                  key: access-key-id
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: aws-backup-credentials
                  key: secret-access-key
            - name: AWS_DEFAULT_REGION
              valueFrom:
                secretKeyRef:
                  name: aws-backup-credentials
                  key: region
            volumeMounts:
            - name: monitoring-scripts
              mountPath: /scripts
            - name: backup-storage
              mountPath: /backups
            resources:
              requests:
                cpu: 100m
                memory: 256Mi
              limits:
                cpu: 200m
                memory: 512Mi
          volumes:
          - name: monitoring-scripts
            configMap:
              name: backup-monitoring-scripts
              defaultMode: 0755
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-storage
          restartPolicy: OnFailure
```

This comprehensive backup and disaster recovery guide provides the complete infrastructure needed to ensure business continuity for the 7P Education Platform, with automated backup procedures, multi-tier recovery strategies, and proactive monitoring systems to minimize downtime and data loss in any disaster scenario.