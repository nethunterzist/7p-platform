# Kubernetes Orchestration Guide for 7P Education Platform

## Overview and Architecture

Kubernetes orchestration provides advanced container management capabilities essential for scaling educational platforms. The 7P Education Platform leverages Kubernetes for automated deployment, scaling, service discovery, and high availability across multiple environments.

### Kubernetes Benefits for Educational Platforms

**Automated Scaling and Load Management**
- Horizontal Pod Autoscaling (HPA) based on CPU, memory, and custom metrics
- Vertical Pod Autoscaling (VPA) for optimal resource allocation
- Cluster Autoscaling for dynamic node management
- Load balancing with sophisticated routing capabilities

**High Availability and Resilience**
- Multi-zone deployment with automatic failover
- Rolling updates with zero-downtime deployments
- Self-healing infrastructure with automatic restarts
- Disaster recovery with backup and restore capabilities

**Operational Excellence**
- GitOps workflows for declarative infrastructure management
- Service mesh integration for advanced networking
- Comprehensive monitoring and observability
- Cost optimization through efficient resource utilization

## Kubernetes Architecture for 7P Education Platform

### Cluster Architecture Design

```yaml
# cluster-architecture.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: education-platform
  labels:
    app.kubernetes.io/name: education-platform
    app.kubernetes.io/version: "1.0.0"
    environment: production
---
apiVersion: v1
kind: Namespace
metadata:
  name: education-platform-staging
  labels:
    app.kubernetes.io/name: education-platform
    app.kubernetes.io/version: "1.0.0"
    environment: staging
---
apiVersion: v1
kind: Namespace
metadata:
  name: education-platform-monitoring
  labels:
    app.kubernetes.io/name: monitoring
    purpose: observability
```

### Resource Quotas and Limits

```yaml
# resource-quotas.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: education-platform-quota
  namespace: education-platform
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    persistentvolumeclaims: "10"
    pods: "50"
    services: "20"
    secrets: "30"
    configmaps: "30"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: education-platform-limits
  namespace: education-platform
spec:
  limits:
  - default:
      cpu: "500m"
      memory: "512Mi"
    defaultRequest:
      cpu: "100m"
      memory: "128Mi"
    type: Container
  - max:
      cpu: "2"
      memory: "4Gi"
    min:
      cpu: "50m"
      memory: "64Mi"
    type: Container
```

## Application Deployments

### Frontend Application Deployment

```yaml
# frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: education-platform
  labels:
    app: frontend
    component: web
    tier: frontend
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
        component: web
        tier: frontend
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/api/metrics"
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
      - name: frontend
        image: education-platform/frontend:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          name: http
          protocol: TCP
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: auth-secrets
              key: jwt-secret
        - name: NEXT_PUBLIC_API_URL
          valueFrom:
            configMapKeyRef:
              name: frontend-config
              key: api-url
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /api/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
        startupProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 10
        volumeMounts:
        - name: config-volume
          mountPath: /app/config
          readOnly: true
        - name: tmp-volume
          mountPath: /tmp
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
      volumes:
      - name: config-volume
        configMap:
          name: frontend-config
      - name: tmp-volume
        emptyDir: {}
      nodeSelector:
        node-type: application
      tolerations:
      - key: "application"
        operator: "Equal"
        value: "true"
        effect: "NoSchedule"
---
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  namespace: education-platform
  labels:
    app: frontend
spec:
  selector:
    app: frontend
  ports:
  - port: 80
    targetPort: 3000
    name: http
  type: ClusterIP
```

### Database StatefulSet

```yaml
# postgres-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: education-platform
  labels:
    app: postgres
    component: database
    tier: data
spec:
  serviceName: postgres-headless
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
        component: database
        tier: data
    spec:
      securityContext:
        fsGroup: 999
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
          name: postgres
        env:
        - name: POSTGRES_DB
          value: "education_platform"
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: password
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 1000m
            memory: 2Gi
        livenessProbe:
          exec:
            command:
            - /bin/sh
            - -c
            - pg_isready -U $POSTGRES_USER -d $POSTGRES_DB
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          exec:
            command:
            - /bin/sh
            - -c
            - pg_isready -U $POSTGRES_USER -d $POSTGRES_DB
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        - name: postgres-config
          mountPath: /etc/postgresql/postgresql.conf
          subPath: postgresql.conf
          readOnly: true
        - name: postgres-initdb
          mountPath: /docker-entrypoint-initdb.d
          readOnly: true
        securityContext:
          runAsUser: 999
          runAsGroup: 999
          allowPrivilegeEscalation: false
      volumes:
      - name: postgres-config
        configMap:
          name: postgres-config
      - name: postgres-initdb
        configMap:
          name: postgres-initdb
      nodeSelector:
        node-type: database
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 100Gi
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: education-platform
  labels:
    app: postgres
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
    name: postgres
  type: ClusterIP
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-headless
  namespace: education-platform
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
    name: postgres
  clusterIP: None
```

### Redis Deployment

```yaml
# redis-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: education-platform
  labels:
    app: redis
    component: cache
    tier: data
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
        component: cache
        tier: data
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        command:
        - redis-server
        - /etc/redis/redis.conf
        ports:
        - containerPort: 6379
          name: redis
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: password
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 250m
            memory: 256Mi
        livenessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
        volumeMounts:
        - name: redis-config
          mountPath: /etc/redis
          readOnly: true
        - name: redis-data
          mountPath: /data
        securityContext:
          runAsUser: 999
          runAsGroup: 999
          allowPrivilegeEscalation: false
      volumes:
      - name: redis-config
        configMap:
          name: redis-config
      - name: redis-data
        persistentVolumeClaim:
          claimName: redis-storage
      nodeSelector:
        node-type: cache
---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: education-platform
  labels:
    app: redis
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
    name: redis
  type: ClusterIP
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-storage
  namespace: education-platform
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: fast-ssd
```

## Configuration Management

### ConfigMaps

```yaml
# configmaps.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: frontend-config
  namespace: education-platform
data:
  api-url: "https://api.education.example.com"
  log-level: "info"
  session-timeout: "3600"
  max-file-size: "10485760"
  supported-languages: "en,es,fr,de"
  features.json: |
    {
      "authentication": {
        "oauth": true,
        "sso": true,
        "mfa": true
      },
      "courses": {
        "video-streaming": true,
        "live-sessions": true,
        "assessments": true
      },
      "analytics": {
        "user-tracking": true,
        "performance-monitoring": true
      }
    }
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-config
  namespace: education-platform
data:
  postgresql.conf: |
    # PostgreSQL configuration for education platform
    max_connections = 100
    shared_buffers = 256MB
    effective_cache_size = 1GB
    maintenance_work_mem = 64MB
    checkpoint_completion_target = 0.9
    wal_buffers = 16MB
    default_statistics_target = 100
    random_page_cost = 1.1
    effective_io_concurrency = 200
    work_mem = 4MB
    min_wal_size = 1GB
    max_wal_size = 4GB
    max_worker_processes = 8
    max_parallel_workers_per_gather = 2
    max_parallel_workers = 8
    
    # Logging
    log_destination = 'stderr'
    logging_collector = on
    log_directory = 'log'
    log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
    log_statement = 'mod'
    log_min_duration_statement = 1000
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-initdb
  namespace: education-platform
data:
  01-init-database.sql: |
    -- Initialize education platform database
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";
    
    -- Create application user
    CREATE USER education_app WITH ENCRYPTED PASSWORD 'secure_app_password';
    GRANT CONNECT ON DATABASE education_platform TO education_app;
    GRANT USAGE ON SCHEMA public TO education_app;
    GRANT CREATE ON SCHEMA public TO education_app;
    
    -- Performance optimizations
    ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
  namespace: education-platform
data:
  redis.conf: |
    # Redis configuration for education platform
    bind 0.0.0.0
    port 6379
    timeout 300
    tcp-keepalive 60
    
    # Memory management
    maxmemory 256mb
    maxmemory-policy allkeys-lru
    
    # Persistence
    save 900 1
    save 300 10
    save 60 10000
    
    # Security
    requirepass ${REDIS_PASSWORD}
    
    # Logging
    loglevel notice
    logfile ""
    
    # Performance
    tcp-backlog 511
    databases 16
```

### Secrets Management

```yaml
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: education-platform
type: Opaque
data:
  url: cG9zdGdyZXNxbDovL2VkdWNhdGlvbl9hcHA6c2VjdXJlX2FwcF9wYXNzd29yZEBwb3N0Z3Jlcy1zZXJ2aWNlOjU0MzIvZWR1Y2F0aW9uX3BsYXRmb3Jt
---
apiVersion: v1
kind: Secret
metadata:
  name: postgres-credentials
  namespace: education-platform
type: Opaque
data:
  username: ZWR1Y2F0aW9uX2FwcA==
  password: c2VjdXJlX2FwcF9wYXNzd29yZA==
---
apiVersion: v1
kind: Secret
metadata:
  name: redis-credentials
  namespace: education-platform
type: Opaque
data:
  url: cmVkaXM6Ly86cmVkaXNfcGFzc3dvcmRAcmVkaXMtc2VydmljZTo2Mzc5
  password: cmVkaXNfcGFzc3dvcmQ=
---
apiVersion: v1
kind: Secret
metadata:
  name: auth-secrets
  namespace: education-platform
type: Opaque
data:
  jwt-secret: c3VwZXJfc2VjdXJlX2p3dF9zZWNyZXRfa2V5XzEyOGJpdA==
  oauth-client-id: b2F1dGhfY2xpZW50X2lkXzEyMw==
  oauth-client-secret: b2F1dGhfY2xpZW50X3NlY3JldF8xMjM=
```

## Auto-Scaling Configuration

### Horizontal Pod Autoscaler

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: frontend-hpa
  namespace: education-platform
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: frontend
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: nginx_ingress_controller_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
      - type: Pods
        value: 2
        periodSeconds: 60
      selectPolicy: Min
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
      - type: Pods
        value: 4
        periodSeconds: 60
      selectPolicy: Max
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: redis-hpa
  namespace: education-platform
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: redis
  minReplicas: 1
  maxReplicas: 3
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 75
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 85
```

### Vertical Pod Autoscaler

```yaml
# vpa.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: frontend-vpa
  namespace: education-platform
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: frontend
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: frontend
      maxAllowed:
        cpu: 1
        memory: 2Gi
      minAllowed:
        cpu: 100m
        memory: 128Mi
      controlledResources: ["cpu", "memory"]
      controlledValues: RequestsAndLimits
---
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: postgres-vpa
  namespace: education-platform
spec:
  targetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: postgres
  updatePolicy:
    updateMode: "Initial"
  resourcePolicy:
    containerPolicies:
    - containerName: postgres
      maxAllowed:
        cpu: 2
        memory: 4Gi
      minAllowed:
        cpu: 500m
        memory: 1Gi
      controlledResources: ["cpu", "memory"]
```

## Ingress and Load Balancing

### NGINX Ingress Controller

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: education-platform-ingress
  namespace: education-platform
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/configuration-snippet: |
      more_set_headers "X-Frame-Options: DENY";
      more_set_headers "X-Content-Type-Options: nosniff";
      more_set_headers "X-XSS-Protection: 1; mode=block";
      more_set_headers "Strict-Transport-Security: max-age=31536000; includeSubDomains";
spec:
  tls:
  - hosts:
    - education.example.com
    - api.education.example.com
    secretName: education-platform-tls
  rules:
  - host: education.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
  - host: api.education.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 80
---
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: nginx
  annotations:
    ingressclass.kubernetes.io/is-default-class: "true"
spec:
  controller: k8s.io/ingress-nginx
```

### Network Policies

```yaml
# network-policies.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-network-policy
  namespace: education-platform
spec:
  podSelector:
    matchLabels:
      app: frontend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
  - to: []
    ports:
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 443
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: database-network-policy
  namespace: education-platform
spec:
  podSelector:
    matchLabels:
      app: postgres
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    - podSelector:
        matchLabels:
          app: api
    ports:
    - protocol: TCP
      port: 5432
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: cache-network-policy
  namespace: education-platform
spec:
  podSelector:
    matchLabels:
      app: redis
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    - podSelector:
        matchLabels:
          app: api
    ports:
    - protocol: TCP
      port: 6379
```

## Monitoring and Observability

### ServiceMonitor for Prometheus

```yaml
# service-monitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: education-platform-monitor
  namespace: education-platform
  labels:
    app: education-platform
spec:
  selector:
    matchLabels:
      app: frontend
  endpoints:
  - port: http
    path: /api/metrics
    interval: 30s
    scrapeTimeout: 10s
  namespaceSelector:
    matchNames:
    - education-platform
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: postgres-monitor
  namespace: education-platform
spec:
  selector:
    matchLabels:
      app: postgres
  endpoints:
  - port: postgres
    interval: 30s
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: redis-monitor
  namespace: education-platform
spec:
  selector:
    matchLabels:
      app: redis
  endpoints:
  - port: redis
    interval: 30s
```

### Custom Metrics

```yaml
# custom-metrics.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: education-platform-monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
    
    rule_files:
    - "/etc/prometheus/rules/*.yml"
    
    scrape_configs:
    - job_name: 'kubernetes-pods'
      kubernetes_sd_configs:
      - role: pod
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__
      - action: labelmap
        regex: __meta_kubernetes_pod_label_(.+)
      - source_labels: [__meta_kubernetes_namespace]
        action: replace
        target_label: kubernetes_namespace
      - source_labels: [__meta_kubernetes_pod_name]
        action: replace
        target_label: kubernetes_pod_name
    
    - job_name: 'education-platform'
      kubernetes_sd_configs:
      - role: service
        namespaces:
          names:
          - education-platform
      relabel_configs:
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_scrape]
        action: keep
        regex: true
```

### Alerting Rules

```yaml
# alerting-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: education-platform-alerts
  namespace: education-platform-monitoring
spec:
  groups:
  - name: education-platform.rules
    rules:
    - alert: HighCPUUsage
      expr: rate(container_cpu_usage_seconds_total{namespace="education-platform"}[5m]) * 100 > 80
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High CPU usage detected"
        description: "Pod {{ $labels.pod }} in namespace {{ $labels.namespace }} has high CPU usage"
    
    - alert: HighMemoryUsage
      expr: (container_memory_usage_bytes{namespace="education-platform"} / container_spec_memory_limit_bytes) * 100 > 85
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High memory usage detected"
        description: "Pod {{ $labels.pod }} in namespace {{ $labels.namespace }} has high memory usage"
    
    - alert: PodRestartLoop
      expr: rate(kube_pod_container_status_restarts_total{namespace="education-platform"}[15m]) > 0
      for: 0m
      labels:
        severity: critical
      annotations:
        summary: "Pod restart loop detected"
        description: "Pod {{ $labels.pod }} in namespace {{ $labels.namespace }} is restarting frequently"
    
    - alert: DatabaseConnections
      expr: pg_stat_activity_count{namespace="education-platform"} > 80
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High database connection count"
        description: "PostgreSQL has {{ $value }} active connections"
    
    - alert: RedisMemoryUsage
      expr: (redis_memory_used_bytes{namespace="education-platform"} / redis_memory_max_bytes) * 100 > 90
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Redis memory usage critical"
        description: "Redis memory usage is at {{ $value }}%"
```

## Storage Management

### Storage Classes

```yaml
# storage-classes.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
  encrypted: "true"
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Delete
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: backup-storage
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp2
  encrypted: "true"
allowVolumeExpansion: true
volumeBindingMode: Immediate
reclaimPolicy: Retain
```

### Persistent Volume Claims

```yaml
# persistent-volumes.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-backup-storage
  namespace: education-platform
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 500Gi
  storageClassName: backup-storage
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: file-uploads-storage
  namespace: education-platform
spec:
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 1Ti
  storageClassName: efs-storage
```

## Backup and Disaster Recovery

### Database Backup CronJob

```yaml
# backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: education-platform
spec:
  schedule: "0 2 * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      template:
        metadata:
          labels:
            app: postgres-backup
        spec:
          containers:
          - name: postgres-backup
            image: postgres:15-alpine
            command:
            - /bin/bash
            - -c
            - |
              set -e
              BACKUP_FILE="/backups/postgres-$(date +%Y%m%d_%H%M%S).sql.gz"
              pg_dump "$DATABASE_URL" --verbose --clean --if-exists --create | gzip > "$BACKUP_FILE"
              echo "Backup completed: $BACKUP_FILE"
              
              # Upload to S3
              aws s3 cp "$BACKUP_FILE" "s3://$BACKUP_BUCKET/postgres/"
              
              # Cleanup local files older than 7 days
              find /backups -name "postgres-*.sql.gz" -mtime +7 -delete
              
              # Cleanup S3 files older than 30 days
              aws s3 ls "s3://$BACKUP_BUCKET/postgres/" --recursive | \
                awk '$1 < "'$(date -d '30 days ago' '+%Y-%m-%d')'" {print $4}' | \
                xargs -I {} aws s3 rm "s3://$BACKUP_BUCKET/{}"
            env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: database-credentials
                  key: url
            - name: BACKUP_BUCKET
              value: "education-platform-backups"
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: aws-credentials
                  key: access-key-id
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: aws-credentials
                  key: secret-access-key
            volumeMounts:
            - name: backup-storage
              mountPath: /backups
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: postgres-backup-storage
          restartPolicy: OnFailure
```

### Disaster Recovery Procedures

```yaml
# disaster-recovery.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: disaster-recovery-procedures
  namespace: education-platform
data:
  recovery-script.sh: |
    #!/bin/bash
    set -euo pipefail
    
    # Disaster Recovery Script for Education Platform
    NAMESPACE="education-platform"
    BACKUP_BUCKET="education-platform-backups"
    
    function restore_database() {
      local backup_file="$1"
      echo "Restoring database from $backup_file"
      
      # Scale down application
      kubectl scale deployment frontend --replicas=0 -n "$NAMESPACE"
      
      # Wait for pods to terminate
      kubectl wait --for=delete pod -l app=frontend -n "$NAMESPACE" --timeout=300s
      
      # Restore database
      aws s3 cp "s3://$BACKUP_BUCKET/postgres/$backup_file" - | \
        gunzip | \
        kubectl exec -i deployment/postgres -n "$NAMESPACE" -- \
        psql "$DATABASE_URL"
      
      # Scale up application
      kubectl scale deployment frontend --replicas=3 -n "$NAMESPACE"
      
      echo "Database restoration completed"
    }
    
    function restore_redis() {
      echo "Restoring Redis data"
      
      # Scale down Redis
      kubectl scale deployment redis --replicas=0 -n "$NAMESPACE"
      
      # Wait for pod to terminate
      kubectl wait --for=delete pod -l app=redis -n "$NAMESPACE" --timeout=300s
      
      # Copy backup file
      aws s3 cp "s3://$BACKUP_BUCKET/redis/dump.rdb" /tmp/dump.rdb
      kubectl cp /tmp/dump.rdb "$NAMESPACE/redis-pod:/data/dump.rdb"
      
      # Scale up Redis
      kubectl scale deployment redis --replicas=1 -n "$NAMESPACE"
      
      echo "Redis restoration completed"
    }
    
    function full_recovery() {
      echo "Starting full disaster recovery"
      
      # Apply all Kubernetes manifests
      kubectl apply -f /manifests/namespace.yaml
      kubectl apply -f /manifests/configmaps.yaml
      kubectl apply -f /manifests/secrets.yaml
      kubectl apply -f /manifests/storage.yaml
      kubectl apply -f /manifests/database.yaml
      kubectl apply -f /manifests/redis.yaml
      kubectl apply -f /manifests/frontend.yaml
      kubectl apply -f /manifests/ingress.yaml
      kubectl apply -f /manifests/monitoring.yaml
      
      # Wait for services to be ready
      kubectl wait --for=condition=ready pod -l app=postgres -n "$NAMESPACE" --timeout=600s
      kubectl wait --for=condition=ready pod -l app=redis -n "$NAMESPACE" --timeout=300s
      
      # Restore data
      latest_backup=$(aws s3 ls "s3://$BACKUP_BUCKET/postgres/" | sort | tail -n 1 | awk '{print $4}')
      restore_database "$latest_backup"
      restore_redis
      
      # Verify health
      kubectl get pods -n "$NAMESPACE"
      kubectl logs -l app=frontend -n "$NAMESPACE" --tail=50
      
      echo "Full disaster recovery completed"
    }
    
    case "${1:-}" in
      "database")
        restore_database "${2:-latest}"
        ;;
      "redis")
        restore_redis
        ;;
      "full")
        full_recovery
        ;;
      *)
        echo "Usage: $0 {database|redis|full} [backup_file]"
        exit 1
        ;;
    esac
```

## Security and Compliance

### Pod Security Standards

```yaml
# pod-security.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: education-platform
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
---
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: education-platform-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
  readOnlyRootFilesystem: true
```

### RBAC Configuration

```yaml
# rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: education-platform-sa
  namespace: education-platform
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: education-platform
  name: education-platform-role
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps", "secrets"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: education-platform-binding
  namespace: education-platform
subjects:
- kind: ServiceAccount
  name: education-platform-sa
  namespace: education-platform
roleRef:
  kind: Role
  name: education-platform-role
  apiGroup: rbac.authorization.k8s.io
```

This comprehensive Kubernetes orchestration guide provides the complete foundation for deploying and managing the 7P Education Platform at scale, ensuring high availability, security, and operational excellence in production environments.