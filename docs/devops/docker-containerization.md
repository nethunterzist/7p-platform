# Docker Containerization Guide for 7P Education Platform

## Overview and Architecture

Docker containerization is a fundamental component of modern DevOps practices, providing lightweight, portable, and consistent environments for application deployment. For the 7P Education Platform, containerization enables seamless deployment across development, staging, and production environments while ensuring consistency and scalability.

### Containerization Benefits for Educational Platforms

**Consistency Across Environments**
- Identical runtime environments from development to production
- Elimination of "works on my machine" issues
- Standardized dependency management
- Predictable application behavior

**Resource Efficiency**
- Optimal resource utilization compared to virtual machines
- Rapid startup times enabling auto-scaling
- Minimal overhead for microservices architecture
- Cost-effective cloud deployment

**Development Velocity**
- Faster onboarding for new developers
- Simplified local development setup
- Streamlined testing and deployment pipelines
- Version-controlled infrastructure definitions

## Docker Architecture for 7P Education Platform

### Multi-Stage Build Strategy

The platform utilizes multi-stage Docker builds to optimize image size and security while maintaining development flexibility.

```dockerfile
# Base stage for shared dependencies
FROM node:18-alpine AS base
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Dependencies stage
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# Development dependencies stage
FROM base AS deps-dev
COPY package.json package-lock.json ./
RUN npm ci

# Build stage
FROM deps-dev AS builder
COPY . .
COPY --from=deps /app/node_modules ./node_modules
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production
RUN npm run build

# Runtime stage
FROM base AS runner
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### Service-Specific Containerization

**Frontend Application Container**
```dockerfile
# Next.js Frontend Optimized Container
FROM node:18-alpine AS frontend-base
WORKDIR /app
RUN apk add --no-cache libc6-compat curl

# Install dependencies
FROM frontend-base AS frontend-deps
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Build application
FROM frontend-base AS frontend-builder
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image
FROM frontend-base AS frontend-runner
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=frontend-builder /app/next.config.js ./
COPY --from=frontend-builder /app/public ./public
COPY --from=frontend-builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=frontend-builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

# Health check implementation
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
```

**Database Container Configuration**
```dockerfile
# PostgreSQL with Custom Configuration
FROM postgres:15-alpine AS database
ENV POSTGRES_DB=education_platform
ENV POSTGRES_USER=edu_user
ENV POSTGRES_PASSWORD_FILE=/run/secrets/postgres_password

# Install extensions
RUN apk add --no-cache \
    postgresql-contrib \
    postgresql-dev

# Custom initialization scripts
COPY ./database/init/ /docker-entrypoint-initdb.d/
COPY ./database/config/postgresql.conf /etc/postgresql/postgresql.conf

# Performance optimizations
RUN echo "shared_preload_libraries = 'pg_stat_statements'" >> /etc/postgresql/postgresql.conf
RUN echo "max_connections = 100" >> /etc/postgresql/postgresql.conf
RUN echo "shared_buffers = 256MB" >> /etc/postgresql/postgresql.conf

EXPOSE 5432
VOLUME ["/var/lib/postgresql/data"]

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD pg_isready -U $POSTGRES_USER -d $POSTGRES_DB
```

**Redis Cache Container**
```dockerfile
# Redis with Custom Configuration
FROM redis:7-alpine AS cache
COPY ./redis/redis.conf /usr/local/etc/redis/redis.conf

# Security configurations
RUN echo "requirepass \$REDIS_PASSWORD" >> /usr/local/etc/redis/redis.conf
RUN echo "maxmemory 256mb" >> /usr/local/etc/redis/redis.conf
RUN echo "maxmemory-policy allkeys-lru" >> /usr/local/etc/redis/redis.conf

EXPOSE 6379

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD redis-cli ping || exit 1

CMD ["redis-server", "/usr/local/etc/redis/redis.conf"]
```

## Docker Compose Configuration

### Development Environment

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
      target: frontend-runner
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://edu_user:password@database:5432/education_platform
      - REDIS_URL=redis://cache:6379
      - NEXT_PUBLIC_API_URL=http://localhost:3000/api
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      database:
        condition: service_healthy
      cache:
        condition: service_healthy
    networks:
      - education-network
    restart: unless-stopped

  database:
    build:
      context: .
      dockerfile: Dockerfile
      target: database
    environment:
      - POSTGRES_DB=education_platform
      - POSTGRES_USER=edu_user
      - POSTGRES_PASSWORD=dev_password
      - POSTGRES_INITDB_ARGS=--encoding=UTF-8 --lc-collate=C --lc-ctype=C
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/backups:/backups
    networks:
      - education-network
    restart: unless-stopped

  cache:
    build:
      context: .
      dockerfile: Dockerfile
      target: cache
    environment:
      - REDIS_PASSWORD=dev_redis_password
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - education-network
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - ./nginx/logs:/var/log/nginx
    depends_on:
      - frontend
    networks:
      - education-network
    restart: unless-stopped

networks:
  education-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
```

### Production Environment

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
      target: frontend-runner
    environment:
      - NODE_ENV=production
      - DATABASE_URL_FILE=/run/secrets/database_url
      - REDIS_URL_FILE=/run/secrets/redis_url
      - JWT_SECRET_FILE=/run/secrets/jwt_secret
    secrets:
      - database_url
      - redis_url
      - jwt_secret
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
    networks:
      - education-network
      - traefik-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`education.example.com`)"
      - "traefik.http.routers.frontend.tls=true"
      - "traefik.http.routers.frontend.tls.certresolver=letsencrypt"

  database:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=education_platform
      - POSTGRES_USER_FILE=/run/secrets/postgres_user
      - POSTGRES_PASSWORD_FILE=/run/secrets/postgres_password
    secrets:
      - postgres_user
      - postgres_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/backups:/backups:ro
    deploy:
      placement:
        constraints:
          - node.role == manager
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
    networks:
      - education-network

  cache:
    image: redis:7-alpine
    command: redis-server --requirepass-file /run/secrets/redis_password
    secrets:
      - redis_password
    volumes:
      - redis_data:/data
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 256M
        reservations:
          cpus: '0.1'
          memory: 128M
    networks:
      - education-network

secrets:
  database_url:
    external: true
  redis_url:
    external: true
  jwt_secret:
    external: true
  postgres_user:
    external: true
  postgres_password:
    external: true
  redis_password:
    external: true

networks:
  education-network:
    driver: overlay
    encrypted: true
  traefik-network:
    external: true

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
```

## Advanced Container Optimization

### Image Size Optimization

**Multi-Stage Build Optimization**
```dockerfile
# Optimized build strategy
FROM node:18-alpine AS base
RUN apk add --no-cache \
    libc6-compat \
    curl \
    && rm -rf /var/cache/apk/*

# Dependencies optimization
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production --silent \
    && npm cache clean --force \
    && rm -rf ~/.npm

# Build optimization
FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --silent
COPY . .
RUN npm run build \
    && rm -rf node_modules \
    && npm ci --only=production --silent \
    && npm cache clean --force

# Runtime optimization
FROM node:18-alpine AS runner
RUN apk add --no-cache curl \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

WORKDIR /app
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
```

### Security Hardening

**Security-Enhanced Dockerfile**
```dockerfile
FROM node:18-alpine AS production

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nextjs -u 1001

# Security: Remove package managers and unnecessary tools
RUN apk del apk-tools \
    && rm -rf /var/cache/apk/* \
    && rm -rf /usr/share/man/* \
    && rm -rf /tmp/*

# Security: Set proper file permissions
WORKDIR /app
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Security: Drop privileges
USER nextjs

# Security: Read-only root filesystem
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Security: Minimal exposed ports
EXPOSE 3000

# Security: Health check without external dependencies
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["node", "server.js"]
```

### Performance Optimization

**Resource Management Configuration**
```yaml
# docker-compose.performance.yml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.optimized
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
    environment:
      - NODE_OPTIONS=--max-old-space-size=384
      - UV_THREADPOOL_SIZE=4
    ulimits:
      nofile:
        soft: 1024
        hard: 2048
    sysctls:
      - net.core.somaxconn=1024

  database:
    image: postgres:15-alpine
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
    command: >
      postgres
      -c shared_buffers=512MB
      -c effective_cache_size=1536MB
      -c maintenance_work_mem=128MB
      -c checkpoint_completion_target=0.9
      -c wal_buffers=16MB
      -c default_statistics_target=100
      -c random_page_cost=1.1
      -c effective_io_concurrency=200
    environment:
      - POSTGRES_SHARED_PRELOAD_LIBRARIES=pg_stat_statements
```

## Container Orchestration Strategies

### Health Check Implementation

**Comprehensive Health Monitoring**
```javascript
// health-check.js
const http = require('http');
const { Pool } = require('pg');
const redis = require('redis');

class HealthChecker {
  constructor() {
    this.checks = {
      database: this.checkDatabase.bind(this),
      redis: this.checkRedis.bind(this),
      memory: this.checkMemory.bind(this),
      disk: this.checkDisk.bind(this),
    };
  }

  async checkDatabase() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000,
    });

    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      return { status: 'healthy', latency: Date.now() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    } finally {
      await pool.end();
    }
  }

  async checkRedis() {
    const client = redis.createClient({
      url: process.env.REDIS_URL,
      socket: { connectTimeout: 5000 },
    });

    try {
      await client.connect();
      await client.ping();
      await client.disconnect();
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  checkMemory() {
    const usage = process.memoryUsage();
    const threshold = 450 * 1024 * 1024; // 450MB
    
    return {
      status: usage.heapUsed < threshold ? 'healthy' : 'unhealthy',
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
    };
  }

  checkDisk() {
    const fs = require('fs');
    try {
      const stats = fs.statSync('/tmp');
      return { status: 'healthy', writable: true };
    } catch (error) {
      return { status: 'unhealthy', writable: false };
    }
  }

  async performHealthCheck() {
    const results = {};
    const checks = Object.entries(this.checks);
    
    for (const [name, checkFn] of checks) {
      try {
        results[name] = await checkFn();
      } catch (error) {
        results[name] = { status: 'unhealthy', error: error.message };
      }
    }

    const overallStatus = Object.values(results)
      .every(result => result.status === 'healthy') ? 'healthy' : 'unhealthy';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: results,
    };
  }
}

// Health endpoint implementation
const healthChecker = new HealthChecker();

const server = http.createServer(async (req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    try {
      const health = await healthChecker.performHealthCheck();
      res.writeHead(health.status === 'healthy' ? 200 : 503, {
        'Content-Type': 'application/json',
      });
      res.end(JSON.stringify(health, null, 2));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: error.message }));
    }
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(3001, () => {
  console.log('Health check server running on port 3001');
});

module.exports = { HealthChecker };
```

### Container Networking

**Advanced Network Configuration**
```yaml
# Network topology for microservices
version: '3.8'

networks:
  frontend-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/24
    driver_opts:
      com.docker.network.bridge.name: frontend-br
      com.docker.network.bridge.enable_icc: "true"

  backend-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.21.0.0/24
    driver_opts:
      com.docker.network.bridge.name: backend-br
      com.docker.network.bridge.enable_icc: "true"

  database-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.22.0.0/24
    driver_opts:
      com.docker.network.bridge.name: database-br
      com.docker.network.bridge.enable_icc: "false"
    internal: true

services:
  nginx:
    image: nginx:alpine
    networks:
      - frontend-network
    ports:
      - "80:80"
      - "443:443"

  frontend:
    build: .
    networks:
      - frontend-network
      - backend-network
    depends_on:
      - api-gateway

  api-gateway:
    build: ./api-gateway
    networks:
      - frontend-network
      - backend-network
    depends_on:
      - auth-service
      - course-service

  auth-service:
    build: ./services/auth
    networks:
      - backend-network
      - database-network

  course-service:
    build: ./services/courses
    networks:
      - backend-network
      - database-network

  database:
    image: postgres:15-alpine
    networks:
      - database-network
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

## Volume Management and Data Persistence

### Persistent Volume Strategy

**Data Management Configuration**
```yaml
# Volume management for production
version: '3.8'

services:
  database:
    image: postgres:15-alpine
    volumes:
      # Data persistence
      - type: volume
        source: postgres_data
        target: /var/lib/postgresql/data
        volume:
          nocopy: true
      
      # Configuration files
      - type: bind
        source: ./config/postgresql.conf
        target: /etc/postgresql/postgresql.conf
        read_only: true
      
      # Backup directory
      - type: bind
        source: ./backups
        target: /backups
        read_only: false
      
      # Initialization scripts
      - type: bind
        source: ./init-scripts
        target: /docker-entrypoint-initdb.d
        read_only: true

  redis:
    image: redis:7-alpine
    volumes:
      # Data persistence with append-only file
      - type: volume
        source: redis_data
        target: /data
        volume:
          nocopy: true
      
      # Configuration
      - type: bind
        source: ./config/redis.conf
        target: /usr/local/etc/redis/redis.conf
        read_only: true

  frontend:
    build: .
    volumes:
      # Static assets cache
      - type: volume
        source: static_cache
        target: /app/.next/static
      
      # Temporary files
      - type: tmpfs
        target: /tmp
        tmpfs:
          size: 100M
          mode: 1777

volumes:
  postgres_data:
    driver: local
    driver_opts:
      type: ext4
      device: /dev/disk/by-label/postgres-data
      o: defaults,noatime

  redis_data:
    driver: local
    driver_opts:
      type: ext4
      device: /dev/disk/by-label/redis-data
      o: defaults,noatime

  static_cache:
    driver: local
    driver_opts:
      type: tmpfs
      o: size=500M,uid=1001,gid=1001
```

### Backup and Recovery Integration

**Automated Backup System**
```bash
#!/bin/bash
# backup-containers.sh

set -euo pipefail

BACKUP_DIR="/backups/$(date +%Y%m%d_%H%M%S)"
CONTAINER_PREFIX="education_platform"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Database backup
echo "Creating database backup..."
docker exec "${CONTAINER_PREFIX}_database_1" pg_dump \
  -U postgres \
  -d education_platform \
  --verbose \
  --clean \
  --if-exists \
  --create \
  --format=custom \
  > "$BACKUP_DIR/database.dump"

# Redis backup
echo "Creating Redis backup..."
docker exec "${CONTAINER_PREFIX}_cache_1" redis-cli \
  --rdb /data/backup.rdb BGSAVE

docker cp "${CONTAINER_PREFIX}_cache_1:/data/backup.rdb" \
  "$BACKUP_DIR/redis.rdb"

# Application state backup
echo "Creating application state backup..."
docker run --rm \
  --volumes-from "${CONTAINER_PREFIX}_frontend_1" \
  -v "$BACKUP_DIR:/backup" \
  alpine tar czf /backup/app_state.tar.gz \
  /app/.next/cache \
  /app/uploads \
  /app/logs

# Configuration backup
echo "Creating configuration backup..."
tar czf "$BACKUP_DIR/config.tar.gz" \
  docker-compose.yml \
  docker-compose.prod.yml \
  nginx/ \
  config/

# Cleanup old backups (keep last 7 days)
find /backups -type d -name "*_*" -mtime +7 -exec rm -rf {} +

echo "Backup completed: $BACKUP_DIR"

# Upload to cloud storage (optional)
if [ "${CLOUD_BACKUP:-false}" = "true" ]; then
  aws s3 sync "$BACKUP_DIR" \
    "s3://${BACKUP_BUCKET}/$(basename "$BACKUP_DIR")" \
    --storage-class STANDARD_IA
fi
```

## Container Monitoring and Logging

### Logging Strategy

**Centralized Logging Configuration**
```yaml
# logging-stack.yml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.8.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"
    networks:
      - logging-network

  logstash:
    image: docker.elastic.co/logstash/logstash:8.8.0
    volumes:
      - ./logstash/pipeline:/usr/share/logstash/pipeline
      - ./logstash/config:/usr/share/logstash/config
    ports:
      - "5044:5044"
    environment:
      - "LS_JAVA_OPTS=-Xmx256m -Xms256m"
    networks:
      - logging-network
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.8.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    networks:
      - logging-network
    depends_on:
      - elasticsearch

  # Application with logging configuration
  frontend:
    build: .
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        labels: "service,environment"
    environment:
      - LOG_LEVEL=info
      - LOG_FORMAT=json
    networks:
      - education-network
      - logging-network

networks:
  logging-network:
    driver: bridge
  education-network:
    external: true

volumes:
  elasticsearch_data:
    driver: local
```

### Monitoring Integration

**Prometheus and Grafana Setup**
```yaml
# monitoring-stack.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'
      - '--storage.tsdb.retention.time=15d'
      - '--web.enable-lifecycle'
    networks:
      - monitoring-network

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
    networks:
      - monitoring-network

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:rw
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
    networks:
      - monitoring-network

  node-exporter:
    image: prom/node-exporter:latest
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.ignored-mount-points="^/(sys|proc|dev|host|etc)($$|/)"'
    networks:
      - monitoring-network

networks:
  monitoring-network:
    driver: bridge

volumes:
  prometheus_data:
    driver: local
  grafana_data:
    driver: local
```

## Best Practices and Troubleshooting

### Container Security Best Practices

**Security Checklist**
- Use minimal base images (Alpine Linux)
- Run containers as non-root users
- Implement proper secret management
- Regular security scanning of images
- Network segmentation and isolation
- Resource limits and constraints
- Read-only root filesystems where possible
- Disable unnecessary services and ports

### Performance Optimization Guidelines

**Optimization Strategies**
- Multi-stage builds for minimal image size
- Layer caching optimization
- Resource limits and requests configuration
- Health checks and readiness probes
- Proper logging configuration
- Memory and CPU monitoring
- Network optimization
- Storage performance tuning

### Common Issues and Solutions

**Troubleshooting Guide**
- Container startup failures
- Memory and resource exhaustion
- Network connectivity issues
- Volume mount problems
- Health check failures
- Service discovery issues
- Performance degradation
- Security vulnerabilities

This comprehensive Docker containerization guide provides the foundation for deploying and managing the 7P Education Platform in a containerized environment, ensuring consistency, scalability, and operational excellence across all deployment scenarios.