# Production Deployment Guide

## Table of Contents
1. [Overview](#overview)
2. [Deployment Architecture](#deployment-architecture)
3. [Pre-Deployment Requirements](#pre-deployment-requirements)
4. [Environment Configuration](#environment-configuration)
5. [Database Migration Strategies](#database-migration-strategies)
6. [Application Deployment Process](#application-deployment-process)
7. [Zero-Downtime Deployment](#zero-downtime-deployment)
8. [Rollback Procedures](#rollback-procedures)
9. [Health Checks and Monitoring](#health-checks-and-monitoring)
10. [Security Considerations](#security-considerations)
11. [Performance Optimization](#performance-optimization)
12. [Troubleshooting Guide](#troubleshooting-guide)

## Overview

This guide provides comprehensive instructions for deploying the 7P Education Platform to production environments. It covers deployment strategies, configuration management, security considerations, and operational procedures to ensure reliable, secure, and performant deployments.

### Deployment Objectives
- **Zero-Downtime Deployments**: Ensure continuous service availability during updates
- **Automated Processes**: Minimize manual intervention and human error
- **Rollback Capability**: Quick recovery from deployment issues
- **Security First**: Maintain security throughout the deployment process
- **Monitoring Integration**: Comprehensive observability from day one
- **Scalability**: Support for horizontal and vertical scaling

### Deployment Architecture Overview
```
┌─────────────────────────────────────────────────┐
│                   CDN Layer                     │
│  • CloudFlare/AWS CloudFront                   │
│  • Static asset distribution                   │
│  • DDoS protection                             │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│              Load Balancer                      │
│  • AWS ALB/NGINX                               │
│  • SSL termination                             │
│  • Health checks                               │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│           Application Tier                      │
│  • Node.js instances (Auto Scaling)            │
│  • Container orchestration (ECS/K8s)          │
│  • Service mesh (optional)                     │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│              Data Layer                         │
│  • MongoDB cluster                             │
│  • PostgreSQL (RDS Multi-AZ)                   │
│  • Redis cluster                               │
│  • File storage (S3/EFS)                       │
└─────────────────────────────────────────────────┘
```

## Deployment Architecture

### Multi-Environment Strategy

```yaml
# deployment-environments.yml
environments:
  development:
    purpose: "Feature development and testing"
    infrastructure:
      instances: 1
      cpu: "2 vCPU"
      memory: "4 GB"
      storage: "20 GB"
    database:
      instance_class: "db.t3.micro"
      multi_az: false
      backup_retention: 1
    monitoring:
      level: "basic"
      alerts: "development-team"
  
  staging:
    purpose: "Pre-production validation and testing"
    infrastructure:
      instances: 2
      cpu: "4 vCPU" 
      memory: "8 GB"
      storage: "50 GB"
    database:
      instance_class: "db.t3.small"
      multi_az: true
      backup_retention: 7
    monitoring:
      level: "enhanced"
      alerts: "qa-team"
  
  production:
    purpose: "Live user-facing environment"
    infrastructure:
      instances: 3-10 # Auto-scaling
      cpu: "8 vCPU"
      memory: "16 GB"
      storage: "100 GB"
    database:
      instance_class: "db.r5.xlarge"
      multi_az: true
      backup_retention: 30
      read_replicas: 2
    monitoring:
      level: "comprehensive"
      alerts: "on-call-team"
```

### Infrastructure Components

#### Application Servers
```bash
# Production server specifications
Server Configuration:
- Instance Type: t3.large (8 vCPU, 16 GB RAM)
- Operating System: Amazon Linux 2 / Ubuntu 20.04 LTS
- Node.js Version: 18.x LTS
- PM2 Process Manager: Latest stable
- Auto Scaling: 3-10 instances based on CPU/Memory
- Availability Zones: Multi-AZ deployment (3 zones minimum)

# Security Groups
Inbound Rules:
- Port 80 (HTTP) from Load Balancer
- Port 443 (HTTPS) from Load Balancer  
- Port 22 (SSH) from bastion host only
- Port 3000 (App) from Load Balancer

Outbound Rules:
- Port 443 (HTTPS) to anywhere (API calls, updates)
- Port 27017 (MongoDB) to database security group
- Port 5432 (PostgreSQL) to database security group
- Port 6379 (Redis) to cache security group
```

#### Database Infrastructure
```yaml
# Database configuration
MongoDB:
  cluster_type: "replica_set"
  instances: 3
  instance_class: "r5.xlarge"
  storage: 
    type: "gp3"
    size: "500 GB"
    iops: 3000
  backup:
    retention: "30 days"
    window: "03:00-04:00"
  monitoring:
    enhanced: true
    logs: ["audit", "profiler"]

PostgreSQL:
  engine_version: "14.9"
  instance_class: "db.r5.xlarge"
  multi_az: true
  storage:
    type: "gp3"
    size: "200 GB"
    iops: 3000
  backup:
    retention: "30 days"
    window: "02:00-03:00"
  read_replicas: 2

Redis:
  engine_version: "7.0"
  node_type: "cache.r6g.large"
  cluster_mode: true
  replicas: 2
  backup:
    retention: "5 days"
    window: "01:00-02:00"
```

## Pre-Deployment Requirements

### Infrastructure Checklist

```bash
#!/bin/bash
# pre-deployment-checklist.sh

echo "=== 7P Education Production Deployment Checklist ==="

# 1. Infrastructure Components
check_infrastructure() {
    echo "Checking infrastructure components..."
    
    # Check AWS CLI access
    aws sts get-caller-identity || exit 1
    
    # Verify VPC and subnets
    aws ec2 describe-vpcs --filters "Name=tag:Name,Values=7p-education-vpc" || exit 1
    
    # Check security groups
    aws ec2 describe-security-groups --filters "Name=group-name,Values=7p-education-*" || exit 1
    
    # Verify load balancer
    aws elbv2 describe-load-balancers --names "7p-education-alb" || exit 1
    
    echo "✅ Infrastructure components verified"
}

# 2. Database Connectivity
check_databases() {
    echo "Checking database connectivity..."
    
    # MongoDB connection test
    mongosh --eval "db.runCommand('ping')" "$MONGODB_URI" || exit 1
    
    # PostgreSQL connection test
    psql -c "SELECT 1;" "$POSTGRESQL_URI" || exit 1
    
    # Redis connection test
    redis-cli -u "$REDIS_URI" ping || exit 1
    
    echo "✅ Database connectivity verified"
}

# 3. External Services
check_external_services() {
    echo "Checking external services..."
    
    # Check DNS resolution
    nslookup api.7peducation.com || exit 1
    
    # Verify SSL certificates
    echo | openssl s_client -servername api.7peducation.com -connect api.7peducation.com:443 2>/dev/null | openssl x509 -noout -dates
    
    # Test email service
    curl -X POST "https://api.sendgrid.com/v3/mail/send" \
         -H "Authorization: Bearer $SENDGRID_API_KEY" \
         -H "Content-Type: application/json" \
         -d '{"personalizations":[{"to":[{"email":"test@7peducation.com"}]}],"from":{"email":"noreply@7peducation.com"},"subject":"Deployment Test","content":[{"type":"text/plain","value":"Test email"}]}' || exit 1
    
    echo "✅ External services verified"
}

# 4. Security Configuration
check_security() {
    echo "Checking security configuration..."
    
    # Verify environment variables
    [ -z "$JWT_SECRET" ] && echo "❌ JWT_SECRET not set" && exit 1
    [ -z "$ENCRYPTION_KEY" ] && echo "❌ ENCRYPTION_KEY not set" && exit 1
    [ -z "$API_RATE_LIMIT_KEY" ] && echo "❌ API_RATE_LIMIT_KEY not set" && exit 1
    
    # Check SSL/TLS configuration
    curl -I https://api.7peducation.com/health | grep -i "strict-transport-security" || exit 1
    
    echo "✅ Security configuration verified"
}

# Run all checks
check_infrastructure
check_databases
check_external_services
check_security

echo "🎉 All pre-deployment checks passed!"
```

### Environment Variables Configuration

```bash
# production.env - Template for production environment variables

# === Application Configuration ===
NODE_ENV=production
PORT=3000
API_VERSION=v1
LOG_LEVEL=info

# === Database Connections ===
MONGODB_URI=mongodb://user:pass@mongodb-cluster.7peducation.com:27017/7p_education?replicaSet=rs0&ssl=true
POSTGRESQL_URI=postgresql://user:pass@postgres.7peducation.com:5432/7p_education?sslmode=require
REDIS_URI=redis://redis-cluster.7peducation.com:6379/0

# === Security Keys ===
JWT_SECRET=your-super-secure-jwt-secret-256-bit
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-256-bit
ENCRYPTION_KEY=your-aes-256-encryption-key-here
API_RATE_LIMIT_KEY=your-rate-limiting-key-here
SESSION_SECRET=your-session-secret-key-here

# === Third-Party Services ===
SENDGRID_API_KEY=SG.your-sendgrid-api-key
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=7p-education-production

# === Monitoring & Logging ===
NEW_RELIC_LICENSE_KEY=your-new-relic-license-key
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
DATADOG_API_KEY=your-datadog-api-key

# === Feature Flags ===
ENABLE_FILE_UPLOAD=true
ENABLE_REAL_TIME_CHAT=true
ENABLE_ANALYTICS=true
ENABLE_PAYMENT_PROCESSING=true

# === Performance Tuning ===
MAX_REQUEST_SIZE=100mb
UPLOAD_TIMEOUT=300000
DB_POOL_SIZE=20
REDIS_POOL_SIZE=10
```

## Database Migration Strategies

### Migration Framework

```javascript
// migrations/migration-framework.js
class MigrationFramework {
    constructor(databases) {
        this.mongodb = databases.mongodb;
        this.postgresql = databases.postgresql;
        this.migrationHistory = new Map();
        
        this.initializeMigrationTracking();
    }
    
    async initializeMigrationTracking() {
        // Create migration tracking collections/tables
        await this.mongodb.createCollection('migration_history');
        
        await this.postgresql.query(`
            CREATE TABLE IF NOT EXISTS migration_history (
                id SERIAL PRIMARY KEY,
                migration_name VARCHAR(255) UNIQUE NOT NULL,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                execution_time_ms INTEGER,
                status VARCHAR(50) DEFAULT 'completed',
                rollback_script TEXT,
                checksum VARCHAR(64)
            );
        `);
    }
    
    async executeMigration(migration) {
        const startTime = Date.now();
        
        try {
            console.log(`Executing migration: ${migration.name}`);
            
            // Check if migration already executed
            if (await this.isMigrationExecuted(migration.name)) {
                console.log(`Migration ${migration.name} already executed, skipping`);
                return;
            }
            
            // Execute migration
            await migration.up();
            
            // Record successful execution
            const executionTime = Date.now() - startTime;
            await this.recordMigration(migration, executionTime, 'completed');
            
            console.log(`✅ Migration ${migration.name} completed in ${executionTime}ms`);
        } catch (error) {
            console.error(`❌ Migration ${migration.name} failed:`, error);
            
            // Record failed execution
            await this.recordMigration(migration, Date.now() - startTime, 'failed');
            
            // Attempt rollback if available
            if (migration.down) {
                console.log(`Attempting rollback for ${migration.name}`);
                try {
                    await migration.down();
                    console.log(`✅ Rollback completed for ${migration.name}`);
                } catch (rollbackError) {
                    console.error(`❌ Rollback failed for ${migration.name}:`, rollbackError);
                }
            }
            
            throw error;
        }
    }
    
    async isMigrationExecuted(migrationName) {
        const mongoResult = await this.mongodb.collection('migration_history')
            .findOne({ migration_name: migrationName, status: 'completed' });
        
        const pgResult = await this.postgresql.query(
            'SELECT id FROM migration_history WHERE migration_name = $1 AND status = $2',
            [migrationName, 'completed']
        );
        
        return mongoResult || pgResult.rows.length > 0;
    }
    
    async recordMigration(migration, executionTime, status) {
        const record = {
            migration_name: migration.name,
            executed_at: new Date(),
            execution_time_ms: executionTime,
            status: status,
            checksum: this.calculateChecksum(migration.toString())
        };
        
        // Record in MongoDB
        await this.mongodb.collection('migration_history').insertOne(record);
        
        // Record in PostgreSQL
        await this.postgresql.query(`
            INSERT INTO migration_history 
            (migration_name, executed_at, execution_time_ms, status, checksum)
            VALUES ($1, $2, $3, $4, $5)
        `, [record.migration_name, record.executed_at, record.execution_time_ms, 
            record.status, record.checksum]);
    }
    
    calculateChecksum(content) {
        return crypto.createHash('sha256').update(content).digest('hex');
    }
}
```

### Sample Migration Scripts

```javascript
// migrations/001-add-user-preferences.js
module.exports = {
    name: '001-add-user-preferences',
    description: 'Add user preferences collection and table',
    
    async up() {
        // MongoDB migration
        await this.mongodb.createCollection('user_preferences', {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['userId', 'preferences'],
                    properties: {
                        userId: { bsonType: 'objectId' },
                        preferences: { bsonType: 'object' },
                        createdAt: { bsonType: 'date' },
                        updatedAt: { bsonType: 'date' }
                    }
                }
            }
        });
        
        // Create indexes
        await this.mongodb.collection('user_preferences')
            .createIndex({ userId: 1 }, { unique: true });
        
        // PostgreSQL migration
        await this.postgresql.query(`
            CREATE TABLE user_preferences (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                preferences JSONB NOT NULL DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id)
            );
        `);
        
        // Create indexes
        await this.postgresql.query(`
            CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
            CREATE INDEX idx_user_preferences_preferences ON user_preferences USING GIN(preferences);
        `);
    },
    
    async down() {
        // Rollback MongoDB changes
        await this.mongodb.dropCollection('user_preferences');
        
        // Rollback PostgreSQL changes
        await this.postgresql.query('DROP TABLE IF EXISTS user_preferences;');
    }
};
```

### Zero-Downtime Migration Strategy

```javascript
// migrations/zero-downtime-strategy.js
class ZeroDowntimeMigration {
    constructor(databases) {
        this.databases = databases;
        this.phases = ['prepare', 'execute', 'validate', 'cleanup'];
    }
    
    async executeZeroDowntimeMigration(migration) {
        console.log(`Starting zero-downtime migration: ${migration.name}`);
        
        try {
            // Phase 1: Prepare - Create new structures without affecting existing
            await this.executePhase('prepare', migration);
            
            // Phase 2: Execute - Migrate data in background
            await this.executePhase('execute', migration);
            
            // Phase 3: Validate - Verify data integrity
            await this.executePhase('validate', migration);
            
            // Phase 4: Cleanup - Remove old structures
            await this.executePhase('cleanup', migration);
            
            console.log(`✅ Zero-downtime migration ${migration.name} completed`);
        } catch (error) {
            console.error(`❌ Zero-downtime migration ${migration.name} failed:`, error);
            await this.rollbackMigration(migration);
            throw error;
        }
    }
    
    async executePhase(phase, migration) {
        console.log(`Executing phase: ${phase}`);
        
        const phaseMethod = migration[phase];
        if (phaseMethod && typeof phaseMethod === 'function') {
            await phaseMethod.call(migration);
        }
        
        // Wait between phases to allow system stabilization
        if (phase !== 'cleanup') {
            await this.sleep(5000); // 5 second pause
        }
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Example zero-downtime migration
module.exports = {
    name: '002-refactor-user-roles',
    description: 'Refactor user roles from string to array structure',
    
    async prepare() {
        // Add new column without affecting existing data
        await this.postgresql.query(`
            ALTER TABLE users 
            ADD COLUMN roles_array TEXT[] DEFAULT '{}';
        `);
        
        // Create temporary index for performance
        await this.postgresql.query(`
            CREATE INDEX CONCURRENTLY idx_users_roles_array_temp 
            ON users USING GIN(roles_array);
        `);
    },
    
    async execute() {
        // Migrate data in batches to avoid locking
        const batchSize = 1000;
        let offset = 0;
        let hasMore = true;
        
        while (hasMore) {
            const users = await this.postgresql.query(`
                SELECT id, role 
                FROM users 
                WHERE roles_array = '{}' 
                ORDER BY id 
                LIMIT $1 OFFSET $2
            `, [batchSize, offset]);
            
            if (users.rows.length === 0) {
                hasMore = false;
                break;
            }
            
            for (const user of users.rows) {
                const rolesArray = user.role ? [user.role] : [];
                await this.postgresql.query(`
                    UPDATE users 
                    SET roles_array = $1 
                    WHERE id = $2
                `, [rolesArray, user.id]);
            }
            
            offset += batchSize;
            
            // Small delay to prevent overwhelming the database
            await this.sleep(100);
        }
    },
    
    async validate() {
        // Verify all users have been migrated
        const unmigrated = await this.postgresql.query(`
            SELECT COUNT(*) as count 
            FROM users 
            WHERE roles_array = '{}'
        `);
        
        if (unmigrated.rows[0].count > 0) {
            throw new Error(`${unmigrated.rows[0].count} users not migrated`);
        }
        
        // Verify data integrity
        const inconsistent = await this.postgresql.query(`
            SELECT COUNT(*) as count 
            FROM users 
            WHERE role IS NOT NULL 
            AND NOT (role = ANY(roles_array))
        `);
        
        if (inconsistent.rows[0].count > 0) {
            throw new Error(`${inconsistent.rows[0].count} users have inconsistent role data`);
        }
    },
    
    async cleanup() {
        // Remove old column after successful migration
        await this.postgresql.query(`
            ALTER TABLE users DROP COLUMN role;
        `);
        
        // Rename new column to final name
        await this.postgresql.query(`
            ALTER TABLE users RENAME COLUMN roles_array TO roles;
        `);
        
        // Drop temporary index and create final one
        await this.postgresql.query(`
            DROP INDEX idx_users_roles_array_temp;
            CREATE INDEX idx_users_roles ON users USING GIN(roles);
        `);
    }
};
```

## Application Deployment Process

### Deployment Automation Script

```bash
#!/bin/bash
# deploy-production.sh - Production deployment automation

set -euo pipefail

# Configuration
APP_NAME="7p-education"
DEPLOYMENT_ENV="production"
HEALTH_CHECK_URL="https://api.7peducation.com/health"
ROLLBACK_TIMEOUT=300 # 5 minutes

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Deployment functions
check_prerequisites() {
    log_info "Checking deployment prerequisites..."
    
    # Check if deployment is locked
    if [ -f "/tmp/deployment.lock" ]; then
        log_error "Deployment already in progress. Remove /tmp/deployment.lock if stuck."
        exit 1
    fi
    
    # Check required environment variables
    required_vars=("MONGODB_URI" "POSTGRESQL_URI" "JWT_SECRET" "STRIPE_SECRET_KEY")
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    # Check dependencies
    command -v node >/dev/null 2>&1 || { log_error "Node.js is required but not installed"; exit 1; }
    command -v npm >/dev/null 2>&1 || { log_error "npm is required but not installed"; exit 1; }
    command -v pm2 >/dev/null 2>&1 || { log_error "PM2 is required but not installed"; exit 1; }
    
    log_success "Prerequisites check passed"
}

create_deployment_lock() {
    echo "$(date): Deployment started by $(whoami)" > /tmp/deployment.lock
    trap 'rm -f /tmp/deployment.lock' EXIT
}

backup_current_version() {
    log_info "Creating backup of current version..."
    
    local backup_dir="/opt/backups/7p-education/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup application files
    if [ -d "/opt/7p-education/current" ]; then
        cp -r /opt/7p-education/current "$backup_dir/app"
        log_success "Application backup created at $backup_dir/app"
    fi
    
    # Backup database
    log_info "Creating database backup..."
    mongodump --uri="$MONGODB_URI" --out="$backup_dir/mongodb" --quiet
    pg_dump "$POSTGRESQL_URI" > "$backup_dir/postgresql.sql"
    
    # Store backup path for potential rollback
    echo "$backup_dir" > /tmp/current_backup_path
    
    log_success "Backup completed at $backup_dir"
}

download_and_extract() {
    log_info "Downloading and extracting new version..."
    
    local release_url="$1"
    local temp_dir="/tmp/7p-education-deployment-$(date +%s)"
    
    mkdir -p "$temp_dir"
    cd "$temp_dir"
    
    # Download release
    wget -q "$release_url" -O release.tar.gz
    tar -xzf release.tar.gz
    
    # Verify package integrity
    if [ ! -f "package.json" ]; then
        log_error "Invalid package: package.json not found"
        exit 1
    fi
    
    # Install dependencies
    log_info "Installing dependencies..."
    npm ci --only=production --silent
    
    # Build application if needed
    if [ -f "build.sh" ]; then
        log_info "Building application..."
        ./build.sh
    fi
    
    echo "$temp_dir" > /tmp/new_version_path
    log_success "New version prepared at $temp_dir"
}

run_database_migrations() {
    log_info "Running database migrations..."
    
    local app_dir="$(cat /tmp/new_version_path)"
    cd "$app_dir"
    
    # Run migrations with timeout
    timeout 600 npm run migrate:production || {
        log_error "Database migration failed or timed out"
        exit 1
    }
    
    log_success "Database migrations completed"
}

deploy_application() {
    log_info "Deploying application..."
    
    local app_dir="$(cat /tmp/new_version_path)"
    local deploy_dir="/opt/7p-education"
    
    # Stop current application
    pm2 stop "$APP_NAME" || true
    
    # Update application files atomically
    if [ -d "$deploy_dir/current" ]; then
        mv "$deploy_dir/current" "$deploy_dir/previous"
    fi
    mv "$app_dir" "$deploy_dir/current"
    
    # Update PM2 configuration
    cd "$deploy_dir/current"
    cp ecosystem.config.js /tmp/pm2.config.js
    
    # Start new version
    pm2 start ecosystem.config.js --env production
    pm2 save
    
    log_success "Application deployed"
}

run_health_checks() {
    log_info "Running health checks..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log_info "Health check attempt $attempt/$max_attempts"
        
        if curl -sf "$HEALTH_CHECK_URL" >/dev/null 2>&1; then
            log_success "Health check passed"
            return 0
        fi
        
        sleep 10
        ((attempt++))
    done
    
    log_error "Health checks failed after $max_attempts attempts"
    return 1
}

run_smoke_tests() {
    log_info "Running smoke tests..."
    
    # Basic API tests
    local tests=(
        "GET /health 200"
        "GET /api/v1/courses 200"
        "GET /api/v1/users/me 401" # Should require auth
        "POST /api/v1/auth/login 400" # Should require body
    )
    
    for test in "${tests[@]}"; do
        read -r method path expected_code <<< "$test"
        
        local actual_code
        if [ "$method" = "GET" ]; then
            actual_code=$(curl -s -o /dev/null -w "%{http_code}" \
                -X "$method" "https://api.7peducation.com$path")
        else
            actual_code=$(curl -s -o /dev/null -w "%{http_code}" \
                -X "$method" "https://api.7peducation.com$path" \
                -H "Content-Type: application/json")
        fi
        
        if [ "$actual_code" = "$expected_code" ]; then
            log_success "✅ $method $path returned $actual_code (expected $expected_code)"
        else
            log_error "❌ $method $path returned $actual_code (expected $expected_code)"
            return 1
        fi
    done
    
    log_success "All smoke tests passed"
}

update_load_balancer() {
    log_info "Updating load balancer configuration..."
    
    # Update health check targets
    aws elbv2 describe-target-health \
        --target-group-arn "$TARGET_GROUP_ARN" \
        --query 'TargetHealthDescriptions[?TargetHealth.State!=`healthy`]' \
        --output table
    
    # Wait for all targets to be healthy
    local max_wait=300 # 5 minutes
    local elapsed=0
    
    while [ $elapsed -lt $max_wait ]; do
        local unhealthy_count=$(aws elbv2 describe-target-health \
            --target-group-arn "$TARGET_GROUP_ARN" \
            --query 'length(TargetHealthDescriptions[?TargetHealth.State!=`healthy`])' \
            --output text)
        
        if [ "$unhealthy_count" = "0" ]; then
            log_success "All targets are healthy"
            return 0
        fi
        
        log_info "Waiting for targets to be healthy... ($elapsed/$max_wait seconds)"
        sleep 30
        elapsed=$((elapsed + 30))
    done
    
    log_warning "Some targets may still be unhealthy"
}

rollback_deployment() {
    log_warning "Initiating deployment rollback..."
    
    local backup_path="$(cat /tmp/current_backup_path 2>/dev/null || echo '')"
    
    if [ -z "$backup_path" ] || [ ! -d "$backup_path" ]; then
        log_error "No valid backup found for rollback"
        exit 1
    fi
    
    # Stop current application
    pm2 stop "$APP_NAME" || true
    
    # Restore application files
    if [ -d "$backup_path/app" ]; then
        rm -rf /opt/7p-education/current
        cp -r "$backup_path/app" /opt/7p-education/current
    fi
    
    # Restore database if needed
    log_warning "Database rollback requires manual intervention"
    log_info "MongoDB backup: $backup_path/mongodb"
    log_info "PostgreSQL backup: $backup_path/postgresql.sql"
    
    # Restart application
    cd /opt/7p-education/current
    pm2 start ecosystem.config.js --env production
    
    log_success "Rollback completed"
}

cleanup_deployment() {
    log_info "Cleaning up deployment artifacts..."
    
    # Remove temporary files
    rm -f /tmp/new_version_path
    rm -f /tmp/current_backup_path
    rm -f /tmp/pm2.config.js
    
    # Clean up old backups (keep last 10)
    find /opt/backups/7p-education -type d -maxdepth 1 | \
        sort | head -n -10 | xargs rm -rf
    
    log_success "Cleanup completed"
}

# Main deployment flow
main() {
    local release_url="${1:-}"
    
    if [ -z "$release_url" ]; then
        log_error "Usage: $0 <release_url>"
        exit 1
    fi
    
    log_info "Starting production deployment..."
    log_info "Release URL: $release_url"
    
    check_prerequisites
    create_deployment_lock
    
    # Deployment steps
    backup_current_version
    download_and_extract "$release_url"
    run_database_migrations
    deploy_application
    
    # Verification steps
    if run_health_checks && run_smoke_tests; then
        update_load_balancer
        cleanup_deployment
        log_success "🎉 Deployment completed successfully!"
    else
        log_error "Deployment verification failed, initiating rollback..."
        rollback_deployment
        exit 1
    fi
}

# Execute main function with all arguments
main "$@"
```

## Zero-Downtime Deployment

### Blue-Green Deployment Strategy

```javascript
// blue-green-deployment.js
class BlueGreenDeployment {
    constructor(config) {
        this.config = config;
        this.aws = new AWS.ELBv2();
        this.ec2 = new AWS.EC2();
        this.currentEnvironment = null;
        this.targetEnvironment = null;
    }
    
    async execute(version) {
        console.log(`Starting blue-green deployment for version ${version}`);
        
        try {
            // Determine current and target environments
            await this.determineEnvironments();
            
            // Deploy to target environment
            await this.deployToTarget(version);
            
            // Run verification tests
            await this.runVerificationTests();
            
            // Switch traffic
            await this.switchTraffic();
            
            // Final verification
            await this.runPostSwitchVerification();
            
            // Clean up old environment
            await this.cleanupOldEnvironment();
            
            console.log('✅ Blue-green deployment completed successfully');
        } catch (error) {
            console.error('❌ Blue-green deployment failed:', error);
            await this.rollbackTraffic();
            throw error;
        }
    }
    
    async determineEnvironments() {
        // Get current target group with traffic
        const targetGroups = await this.aws.describeTargetGroups({
            LoadBalancerArn: this.config.loadBalancerArn
        }).promise();
        
        const blueGroup = targetGroups.TargetGroups.find(tg => 
            tg.TargetGroupName.includes('blue'));
        const greenGroup = targetGroups.TargetGroups.find(tg => 
            tg.TargetGroupName.includes('green'));
        
        // Check which environment has traffic
        const listeners = await this.aws.describeListeners({
            LoadBalancerArn: this.config.loadBalancerArn
        }).promise();
        
        const currentTargetGroupArn = listeners.Listeners[0]
            .DefaultActions[0].TargetGroupArn;
        
        if (currentTargetGroupArn === blueGroup.TargetGroupArn) {
            this.currentEnvironment = 'blue';
            this.targetEnvironment = 'green';
        } else {
            this.currentEnvironment = 'green';
            this.targetEnvironment = 'blue';
        }
        
        console.log(`Current: ${this.currentEnvironment}, Target: ${this.targetEnvironment}`);
    }
    
    async deployToTarget(version) {
        console.log(`Deploying version ${version} to ${this.targetEnvironment} environment`);
        
        // Get target environment instances
        const instances = await this.getEnvironmentInstances(this.targetEnvironment);
        
        // Deploy to each instance
        for (const instance of instances) {
            await this.deployToInstance(instance, version);
        }
        
        // Wait for all instances to be healthy
        await this.waitForHealthyInstances(this.targetEnvironment);
    }
    
    async deployToInstance(instance, version) {
        const deployCommand = `
            cd /opt/7p-education &&
            wget ${this.config.releaseUrl}/${version}.tar.gz &&
            tar -xzf ${version}.tar.gz &&
            npm ci --production &&
            pm2 restart ecosystem.config.js
        `;
        
        // Execute deployment via SSH or Systems Manager
        await this.executeRemoteCommand(instance.InstanceId, deployCommand);
    }
    
    async runVerificationTests() {
        console.log(`Running verification tests on ${this.targetEnvironment}`);
        
        const targetGroupArn = this.getTargetGroupArn(this.targetEnvironment);
        const healthyTargets = await this.getHealthyTargets(targetGroupArn);
        
        if (healthyTargets.length === 0) {
            throw new Error('No healthy targets in target environment');
        }
        
        // Run tests against target environment
        const testUrl = `http://${healthyTargets[0].Target.Id}:3000`;
        
        const tests = [
            { path: '/health', expectedStatus: 200 },
            { path: '/api/v1/courses', expectedStatus: 200 },
            { path: '/api/v1/auth/me', expectedStatus: 401 }
        ];
        
        for (const test of tests) {
            const response = await this.makeHttpRequest(testUrl + test.path);
            if (response.status !== test.expectedStatus) {
                throw new Error(`Test failed: ${test.path} returned ${response.status}, expected ${test.expectedStatus}`);
            }
        }
        
        console.log('✅ All verification tests passed');
    }
    
    async switchTraffic() {
        console.log(`Switching traffic to ${this.targetEnvironment}`);
        
        const targetGroupArn = this.getTargetGroupArn(this.targetEnvironment);
        
        // Update listener to point to target environment
        const listeners = await this.aws.describeListeners({
            LoadBalancerArn: this.config.loadBalancerArn
        }).promise();
        
        await this.aws.modifyListener({
            ListenerArn: listeners.Listeners[0].ListenerArn,
            DefaultActions: [{
                Type: 'forward',
                TargetGroupArn: targetGroupArn
            }]
        }).promise();
        
        console.log('✅ Traffic switched successfully');
    }
    
    async runPostSwitchVerification() {
        console.log('Running post-switch verification...');
        
        // Wait for traffic to stabilize
        await this.sleep(30000); // 30 seconds
        
        // Check application metrics
        const metrics = await this.getApplicationMetrics();
        
        if (metrics.errorRate > 0.05) { // 5% error rate threshold
            throw new Error(`High error rate detected: ${metrics.errorRate * 100}%`);
        }
        
        if (metrics.responseTime > 5000) { // 5 second response time threshold
            throw new Error(`High response time detected: ${metrics.responseTime}ms`);
        }
        
        console.log('✅ Post-switch verification passed');
    }
    
    async rollbackTraffic() {
        console.log('Rolling back traffic to previous environment');
        
        const currentTargetGroupArn = this.getTargetGroupArn(this.currentEnvironment);
        
        const listeners = await this.aws.describeListeners({
            LoadBalancerArn: this.config.loadBalancerArn
        }).promise();
        
        await this.aws.modifyListener({
            ListenerArn: listeners.Listeners[0].ListenerArn,
            DefaultActions: [{
                Type: 'forward',
                TargetGroupArn: currentTargetGroupArn
            }]
        }).promise();
        
        console.log('✅ Traffic rolled back');
    }
}
```

### Rolling Deployment Strategy

```javascript
// rolling-deployment.js
class RollingDeployment {
    constructor(config) {
        this.config = config;
        this.batchSize = config.batchSize || 1;
        this.healthCheckTimeout = config.healthCheckTimeout || 300000; // 5 minutes
    }
    
    async execute(version) {
        console.log(`Starting rolling deployment for version ${version}`);
        
        const instances = await this.getActiveInstances();
        const batches = this.createBatches(instances, this.batchSize);
        
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(`Deploying batch ${i + 1}/${batches.length} (${batch.length} instances)`);
            
            try {
                await this.deployBatch(batch, version);
                await this.verifyBatch(batch);
                console.log(`✅ Batch ${i + 1} deployed successfully`);
            } catch (error) {
                console.error(`❌ Batch ${i + 1} deployment failed:`, error);
                await this.rollbackBatch(batch);
                throw error;
            }
        }
        
        console.log('✅ Rolling deployment completed successfully');
    }
    
    createBatches(instances, batchSize) {
        const batches = [];
        for (let i = 0; i < instances.length; i += batchSize) {
            batches.push(instances.slice(i, i + batchSize));
        }
        return batches;
    }
    
    async deployBatch(batch, version) {
        // Remove instances from load balancer
        await this.removeFromLoadBalancer(batch);
        
        // Deploy to each instance in parallel
        const deployPromises = batch.map(instance => 
            this.deployToInstance(instance, version));
        await Promise.all(deployPromises);
        
        // Wait for instances to be ready
        await this.waitForInstancesReady(batch);
        
        // Add instances back to load balancer
        await this.addToLoadBalancer(batch);
        
        // Wait for health checks to pass
        await this.waitForHealthChecks(batch);
    }
    
    async removeFromLoadBalancer(instances) {
        const targetGroupArn = this.config.targetGroupArn;
        const targets = instances.map(instance => ({
            Id: instance.InstanceId,
            Port: 3000
        }));
        
        await this.aws.deregisterTargets({
            TargetGroupArn: targetGroupArn,
            Targets: targets
        }).promise();
        
        // Wait for deregistration to complete
        await this.waitForDeregistration(targets);
    }
    
    async addToLoadBalancer(instances) {
        const targetGroupArn = this.config.targetGroupArn;
        const targets = instances.map(instance => ({
            Id: instance.InstanceId,
            Port: 3000
        }));
        
        await this.aws.registerTargets({
            TargetGroupArn: targetGroupArn,
            Targets: targets
        }).promise();
    }
    
    async waitForHealthChecks(instances) {
        const targetGroupArn = this.config.targetGroupArn;
        const targets = instances.map(instance => ({
            Id: instance.InstanceId,
            Port: 3000
        }));
        
        const maxWait = this.healthCheckTimeout;
        const checkInterval = 10000; // 10 seconds
        let elapsed = 0;
        
        while (elapsed < maxWait) {
            const health = await this.aws.describeTargetHealth({
                TargetGroupArn: targetGroupArn,
                Targets: targets
            }).promise();
            
            const healthyCount = health.TargetHealthDescriptions
                .filter(desc => desc.TargetHealth.State === 'healthy').length;
            
            if (healthyCount === targets.length) {
                console.log('✅ All instances are healthy');
                return;
            }
            
            console.log(`Waiting for health checks... (${healthyCount}/${targets.length} healthy)`);
            await this.sleep(checkInterval);
            elapsed += checkInterval;
        }
        
        throw new Error('Health check timeout');
    }
}
```

## Health Checks and Monitoring

### Comprehensive Health Check System

```javascript
// health-check-system.js
class HealthCheckSystem {
    constructor() {
        this.checks = new Map();
        this.status = {
            overall: 'unknown',
            timestamp: new Date(),
            uptime: process.uptime(),
            checks: {}
        };
        
        this.registerDefaultChecks();
    }
    
    registerDefaultChecks() {
        // Database connectivity checks
        this.register('mongodb', async () => {
            const client = new MongoClient(process.env.MONGODB_URI);
            try {
                await client.connect();
                await client.db().admin().ping();
                return { status: 'healthy', latency: Date.now() };
            } finally {
                await client.close();
            }
        });
        
        this.register('postgresql', async () => {
            const client = new Client({ connectionString: process.env.POSTGRESQL_URI });
            try {
                await client.connect();
                const start = Date.now();
                await client.query('SELECT 1');
                const latency = Date.now() - start;
                return { status: 'healthy', latency };
            } finally {
                await client.end();
            }
        });
        
        this.register('redis', async () => {
            const client = redis.createClient({ url: process.env.REDIS_URI });
            try {
                await client.connect();
                const start = Date.now();
                await client.ping();
                const latency = Date.now() - start;
                return { status: 'healthy', latency };
            } finally {
                await client.quit();
            }
        });
        
        // External service checks
        this.register('stripe', async () => {
            const response = await fetch('https://api.stripe.com/v1/account', {
                headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` }
            });
            return { status: response.ok ? 'healthy' : 'unhealthy', statusCode: response.status };
        });
        
        this.register('sendgrid', async () => {
            const response = await fetch('https://api.sendgrid.com/v3/user/profile', {
                headers: { 'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}` }
            });
            return { status: response.ok ? 'healthy' : 'unhealthy', statusCode: response.status };
        });
        
        // System resource checks
        this.register('memory', async () => {
            const usage = process.memoryUsage();
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const usedPercentage = ((totalMem - freeMem) / totalMem) * 100;
            
            return {
                status: usedPercentage < 90 ? 'healthy' : 'unhealthy',
                usage: {
                    rss: usage.rss,
                    heapTotal: usage.heapTotal,
                    heapUsed: usage.heapUsed,
                    external: usage.external,
                    systemUsed: usedPercentage
                }
            };
        });
        
        this.register('disk', async () => {
            const stats = await fs.promises.stat('.');
            const diskUsage = await this.getDiskUsage('/');
            
            return {
                status: diskUsage.percentage < 85 ? 'healthy' : 'unhealthy',
                usage: diskUsage
            };
        });
    }
    
    async runAllChecks() {
        const results = {};
        let overallHealthy = true;
        
        for (const [name, checkFunction] of this.checks) {
            try {
                const start = Date.now();
                const result = await Promise.race([
                    checkFunction(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout')), 10000)
                    )
                ]);
                
                results[name] = {
                    ...result,
                    duration: Date.now() - start,
                    timestamp: new Date()
                };
                
                if (result.status !== 'healthy') {
                    overallHealthy = false;
                }
            } catch (error) {
                results[name] = {
                    status: 'unhealthy',
                    error: error.message,
                    duration: Date.now() - start,
                    timestamp: new Date()
                };
                overallHealthy = false;
            }
        }
        
        this.status = {
            overall: overallHealthy ? 'healthy' : 'unhealthy',
            timestamp: new Date(),
            uptime: process.uptime(),
            version: process.env.APP_VERSION || 'unknown',
            environment: process.env.NODE_ENV,
            checks: results
        };
        
        return this.status;
    }
    
    register(name, checkFunction) {
        this.checks.set(name, checkFunction);
    }
    
    async getDiskUsage(path) {
        return new Promise((resolve, reject) => {
            exec(`df -h ${path}`, (error, stdout) => {
                if (error) {
                    reject(error);
                    return;
                }
                
                const lines = stdout.split('\n');
                const stats = lines[1].split(/\s+/);
                
                resolve({
                    total: stats[1],
                    used: stats[2],
                    available: stats[3],
                    percentage: parseInt(stats[4])
                });
            });
        });
    }
}

// Express.js health check endpoints
const healthSystem = new HealthCheckSystem();

app.get('/health', async (req, res) => {
    const status = await healthSystem.runAllChecks();
    const httpStatus = status.overall === 'healthy' ? 200 : 503;
    res.status(httpStatus).json(status);
});

app.get('/health/live', (req, res) => {
    // Kubernetes liveness probe - simple check
    res.status(200).json({ status: 'alive', timestamp: new Date() });
});

app.get('/health/ready', async (req, res) => {
    // Kubernetes readiness probe - check if ready to serve traffic
    const criticalChecks = ['mongodb', 'postgresql', 'redis'];
    const results = {};
    let ready = true;
    
    for (const check of criticalChecks) {
        try {
            const checkFunction = healthSystem.checks.get(check);
            const result = await checkFunction();
            results[check] = result;
            
            if (result.status !== 'healthy') {
                ready = false;
            }
        } catch (error) {
            results[check] = { status: 'unhealthy', error: error.message };
            ready = false;
        }
    }
    
    const status = ready ? 200 : 503;
    res.status(status).json({
        status: ready ? 'ready' : 'not ready',
        checks: results,
        timestamp: new Date()
    });
});
```

This comprehensive production deployment guide provides the foundation for reliable, secure, and scalable deployments of the 7P Education Platform. The guide covers all aspects from infrastructure setup to monitoring, ensuring successful production operations.

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"id": "1", "content": "Create production-deployment-guide.md with comprehensive deployment strategies", "status": "completed"}, {"id": "2", "content": "Create ci-cd-pipeline-setup.md with automated pipeline configuration", "status": "pending"}, {"id": "3", "content": "Create docker-containerization.md with container orchestration guide", "status": "pending"}, {"id": "4", "content": "Create kubernetes-orchestration.md with K8s deployment patterns", "status": "pending"}, {"id": "5", "content": "Create monitoring-logging-setup.md with observability implementation", "status": "pending"}, {"id": "6", "content": "Create backup-disaster-recovery.md with resilience strategies", "status": "pending"}, {"id": "7", "content": "Create infrastructure-as-code.md with IaC implementation", "status": "pending"}, {"id": "8", "content": "Create performance-optimization.md with production tuning guide", "status": "pending"}]