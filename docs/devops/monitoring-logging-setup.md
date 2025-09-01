# Monitoring and Logging Setup Guide for 7P Education Platform

## Overview and Architecture

Comprehensive monitoring and logging infrastructure is essential for maintaining the reliability, performance, and security of educational platforms. The 7P Education Platform implements a multi-layered observability strategy using industry-standard tools and practices to ensure optimal user experience and operational excellence.

### Observability Strategy

**Three Pillars of Observability**
- **Metrics**: Quantitative measurements of system behavior and performance
- **Logs**: Discrete events and application state changes with contextual information
- **Traces**: Request flow tracking across distributed system components

**Key Benefits for Educational Platforms**
- **Proactive Issue Detection**: Identify problems before they impact students and educators
- **Performance Optimization**: Data-driven insights for system tuning and resource allocation
- **Security Monitoring**: Real-time threat detection and compliance monitoring
- **Capacity Planning**: Historical data analysis for informed scaling decisions
- **User Experience Insights**: Understanding application performance from user perspective

## Monitoring Stack Architecture

### Core Components Overview

```yaml
# monitoring-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
  labels:
    name: monitoring
    purpose: observability
---
apiVersion: v1
kind: Namespace
metadata:
  name: logging
  labels:
    name: logging
    purpose: log-aggregation
```

### Prometheus Monitoring Setup

**Prometheus Configuration**
```yaml
# prometheus-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: monitoring
  labels:
    app: prometheus
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 65534
        fsGroup: 65534
      containers:
      - name: prometheus
        image: prom/prometheus:v2.45.0
        ports:
        - containerPort: 9090
          name: prometheus
        args:
        - '--config.file=/etc/prometheus/prometheus.yml'
        - '--storage.tsdb.path=/prometheus'
        - '--web.console.libraries=/usr/share/prometheus/console_libraries'
        - '--web.console.templates=/usr/share/prometheus/consoles'
        - '--storage.tsdb.retention.time=15d'
        - '--storage.tsdb.retention.size=10GB'
        - '--web.enable-lifecycle'
        - '--web.external-url=https://prometheus.education.example.com'
        - '--web.enable-admin-api'
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 1000m
            memory: 2Gi
        volumeMounts:
        - name: config-volume
          mountPath: /etc/prometheus
        - name: storage-volume
          mountPath: /prometheus
        - name: rules-volume
          mountPath: /etc/prometheus/rules
        livenessProbe:
          httpGet:
            path: /-/healthy
            port: 9090
          initialDelaySeconds: 30
          timeoutSeconds: 10
        readinessProbe:
          httpGet:
            path: /-/ready
            port: 9090
          initialDelaySeconds: 5
          timeoutSeconds: 5
      volumes:
      - name: config-volume
        configMap:
          name: prometheus-config
      - name: storage-volume
        persistentVolumeClaim:
          claimName: prometheus-storage
      - name: rules-volume
        configMap:
          name: prometheus-rules
      serviceAccountName: prometheus
---
apiVersion: v1
kind: Service
metadata:
  name: prometheus-service
  namespace: monitoring
  labels:
    app: prometheus
spec:
  selector:
    app: prometheus
  ports:
  - port: 9090
    targetPort: 9090
    name: prometheus
  type: ClusterIP
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: prometheus-storage
  namespace: monitoring
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: fast-ssd
```

**Prometheus Configuration File**
```yaml
# prometheus-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
      external_labels:
        cluster: 'education-platform'
        environment: 'production'
    
    rule_files:
    - "/etc/prometheus/rules/*.yml"
    
    alerting:
      alertmanagers:
      - static_configs:
        - targets:
          - alertmanager:9093
    
    scrape_configs:
    # Prometheus self-monitoring
    - job_name: 'prometheus'
      static_configs:
      - targets: ['localhost:9090']
    
    # Kubernetes API Server
    - job_name: 'kubernetes-apiservers'
      kubernetes_sd_configs:
      - role: endpoints
        namespaces:
          names:
          - default
      scheme: https
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        insecure_skip_verify: true
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
      relabel_configs:
      - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
        action: keep
        regex: default;kubernetes;https
    
    # Kubernetes Nodes
    - job_name: 'kubernetes-nodes'
      kubernetes_sd_configs:
      - role: node
      scheme: https
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        insecure_skip_verify: true
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
      relabel_configs:
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)
      - target_label: __address__
        replacement: kubernetes.default.svc:443
      - source_labels: [__meta_kubernetes_node_name]
        regex: (.+)
        target_label: __metrics_path__
        replacement: /api/v1/nodes/$1/proxy/metrics
    
    # Kubernetes Pods
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
    
    # Education Platform Application
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
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_scheme]
        action: replace
        target_label: __scheme__
        regex: (https?)
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_service_annotation_prometheus_io_port]
        action: replace
        target_label: __address__
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
      - action: labelmap
        regex: __meta_kubernetes_service_label_(.+)
      - source_labels: [__meta_kubernetes_namespace]
        action: replace
        target_label: kubernetes_namespace
      - source_labels: [__meta_kubernetes_service_name]
        action: replace
        target_label: kubernetes_name
    
    # Node Exporter
    - job_name: 'node-exporter'
      kubernetes_sd_configs:
      - role: endpoints
        namespaces:
          names:
          - monitoring
      relabel_configs:
      - source_labels: [__meta_kubernetes_endpoints_name]
        action: keep
        regex: node-exporter
      - source_labels: [__meta_kubernetes_endpoint_address_target_name]
        action: replace
        target_label: instance
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)
    
    # PostgreSQL Exporter
    - job_name: 'postgres-exporter'
      kubernetes_sd_configs:
      - role: service
        namespaces:
          names:
          - education-platform
      relabel_configs:
      - source_labels: [__meta_kubernetes_service_name]
        action: keep
        regex: postgres-exporter
    
    # Redis Exporter
    - job_name: 'redis-exporter'
      kubernetes_sd_configs:
      - role: service
        namespaces:
          names:
          - education-platform
      relabel_configs:
      - source_labels: [__meta_kubernetes_service_name]
        action: keep
        regex: redis-exporter
```

### Grafana Dashboard Setup

**Grafana Deployment**
```yaml
# grafana-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: monitoring
  labels:
    app: grafana
spec:
  replicas: 1
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 472
        fsGroup: 472
      containers:
      - name: grafana
        image: grafana/grafana:10.0.0
        ports:
        - containerPort: 3000
          name: grafana
        env:
        - name: GF_SECURITY_ADMIN_USER
          valueFrom:
            secretKeyRef:
              name: grafana-credentials
              key: admin-user
        - name: GF_SECURITY_ADMIN_PASSWORD
          valueFrom:
            secretKeyRef:
              name: grafana-credentials
              key: admin-password
        - name: GF_SECURITY_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: grafana-credentials
              key: secret-key
        - name: GF_INSTALL_PLUGINS
          value: "grafana-piechart-panel,grafana-worldmap-panel,grafana-clock-panel"
        - name: GF_SERVER_ROOT_URL
          value: "https://grafana.education.example.com"
        - name: GF_SMTP_ENABLED
          value: "true"
        - name: GF_SMTP_HOST
          value: "smtp.gmail.com:587"
        - name: GF_SMTP_USER
          valueFrom:
            secretKeyRef:
              name: smtp-credentials
              key: username
        - name: GF_SMTP_PASSWORD
          valueFrom:
            secretKeyRef:
              name: smtp-credentials
              key: password
        - name: GF_SMTP_FROM_ADDRESS
          value: "alerts@education.example.com"
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        volumeMounts:
        - name: grafana-storage
          mountPath: /var/lib/grafana
        - name: grafana-config
          mountPath: /etc/grafana/provisioning
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          timeoutSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          timeoutSeconds: 5
      volumes:
      - name: grafana-storage
        persistentVolumeClaim:
          claimName: grafana-storage
      - name: grafana-config
        configMap:
          name: grafana-config
---
apiVersion: v1
kind: Service
metadata:
  name: grafana-service
  namespace: monitoring
  labels:
    app: grafana
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "3000"
spec:
  selector:
    app: grafana
  ports:
  - port: 3000
    targetPort: 3000
    name: grafana
  type: ClusterIP
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: grafana-storage
  namespace: monitoring
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: fast-ssd
```

**Grafana Configuration**
```yaml
# grafana-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-config
  namespace: monitoring
data:
  datasources.yml: |
    apiVersion: 1
    datasources:
    - name: Prometheus
      type: prometheus
      access: proxy
      url: http://prometheus-service:9090
      isDefault: true
      editable: true
    - name: Loki
      type: loki
      access: proxy
      url: http://loki:3100
      editable: true
    - name: Jaeger
      type: jaeger
      access: proxy
      url: http://jaeger-query:16686
      editable: true
  
  dashboards.yml: |
    apiVersion: 1
    providers:
    - name: 'default'
      orgId: 1
      folder: ''
      type: file
      disableDeletion: false
      updateIntervalSeconds: 10
      allowUiUpdates: true
      options:
        path: /var/lib/grafana/dashboards
    - name: 'education-platform'
      orgId: 1
      folder: 'Education Platform'
      type: file
      disableDeletion: false
      updateIntervalSeconds: 10
      allowUiUpdates: true
      options:
        path: /var/lib/grafana/dashboards/education-platform
  
  notifiers.yml: |
    notifiers:
    - name: email-alerts
      type: email
      uid: email1
      org_id: 1
      is_default: true
      settings:
        addresses: "ops-team@education.example.com;alerts@education.example.com"
        subject: "[ALERT] Education Platform - {{ .GroupLabels.alertname }}"
        single_email: false
    - name: slack-alerts
      type: slack
      uid: slack1
      org_id: 1
      settings:
        url: "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
        channel: "#alerts"
        username: "Grafana"
        title: "Education Platform Alert"
        text: "{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}"
```

### Alertmanager Configuration

**Alertmanager Deployment**
```yaml
# alertmanager-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: alertmanager
  namespace: monitoring
  labels:
    app: alertmanager
spec:
  replicas: 1
  selector:
    matchLabels:
      app: alertmanager
  template:
    metadata:
      labels:
        app: alertmanager
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 65534
        fsGroup: 65534
      containers:
      - name: alertmanager
        image: prom/alertmanager:v0.25.0
        ports:
        - containerPort: 9093
          name: alertmanager
        args:
        - '--config.file=/etc/alertmanager/alertmanager.yml'
        - '--storage.path=/alertmanager'
        - '--data.retention=120h'
        - '--web.external-url=https://alertmanager.education.example.com'
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
        volumeMounts:
        - name: config-volume
          mountPath: /etc/alertmanager
        - name: storage-volume
          mountPath: /alertmanager
        livenessProbe:
          httpGet:
            path: /-/healthy
            port: 9093
          initialDelaySeconds: 30
          timeoutSeconds: 10
        readinessProbe:
          httpGet:
            path: /-/ready
            port: 9093
          initialDelaySeconds: 5
          timeoutSeconds: 5
      volumes:
      - name: config-volume
        configMap:
          name: alertmanager-config
      - name: storage-volume
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: alertmanager
  namespace: monitoring
  labels:
    app: alertmanager
spec:
  selector:
    app: alertmanager
  ports:
  - port: 9093
    targetPort: 9093
    name: alertmanager
  type: ClusterIP
```

**Alertmanager Configuration**
```yaml
# alertmanager-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alertmanager-config
  namespace: monitoring
data:
  alertmanager.yml: |
    global:
      smtp_smarthost: 'smtp.gmail.com:587'
      smtp_from: 'alerts@education.example.com'
      smtp_auth_username: 'alerts@education.example.com'
      smtp_auth_password: 'your-app-password'
      smtp_auth_identity: 'alerts@education.example.com'
      
    route:
      group_by: ['alertname', 'cluster', 'service']
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 12h
      receiver: 'default-receiver'
      routes:
      - match:
          severity: critical
        receiver: 'critical-alerts'
        group_wait: 10s
        repeat_interval: 5m
      - match:
          severity: warning
        receiver: 'warning-alerts'
        group_wait: 60s
        repeat_interval: 30m
      - match:
          alertname: DeadMansSwitch
        receiver: 'deadman-switch'
        repeat_interval: 5m
    
    receivers:
    - name: 'default-receiver'
      email_configs:
      - to: 'ops-team@education.example.com'
        subject: '[ALERT] Education Platform - {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Severity: {{ .Labels.severity }}
          Instance: {{ .Labels.instance }}
          Time: {{ .StartsAt }}
          {{ end }}
    
    - name: 'critical-alerts'
      email_configs:
      - to: 'ops-team@education.example.com,management@education.example.com'
        subject: '[CRITICAL] Education Platform - {{ .GroupLabels.alertname }}'
        body: |
          🚨 CRITICAL ALERT 🚨
          
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Severity: {{ .Labels.severity }}
          Instance: {{ .Labels.instance }}
          Time: {{ .StartsAt }}
          
          Please investigate immediately!
          {{ end }}
      slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#critical-alerts'
        title: '🚨 Critical Alert - Education Platform'
        text: |
          {{ range .Alerts }}
          *Alert:* {{ .Annotations.summary }}
          *Description:* {{ .Annotations.description }}
          *Severity:* {{ .Labels.severity }}
          *Instance:* {{ .Labels.instance }}
          {{ end }}
        color: 'danger'
    
    - name: 'warning-alerts'
      email_configs:
      - to: 'ops-team@education.example.com'
        subject: '[WARNING] Education Platform - {{ .GroupLabels.alertname }}'
        body: |
          ⚠️ WARNING ALERT ⚠️
          
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Severity: {{ .Labels.severity }}
          Instance: {{ .Labels.instance }}
          Time: {{ .StartsAt }}
          {{ end }}
      slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#alerts'
        title: '⚠️ Warning - Education Platform'
        text: |
          {{ range .Alerts }}
          *Alert:* {{ .Annotations.summary }}
          *Description:* {{ .Annotations.description }}
          *Instance:* {{ .Labels.instance }}
          {{ end }}
        color: 'warning'
    
    - name: 'deadman-switch'
      slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#monitoring'
        title: '💀 Monitoring Health Check'
        text: 'Education Platform monitoring is alive and well!'
        color: 'good'
    
    inhibit_rules:
    - source_match:
        severity: 'critical'
      target_match:
        severity: 'warning'
      equal: ['alertname', 'cluster', 'service']
```

## Logging Infrastructure

### Loki Logging Stack

**Loki Deployment**
```yaml
# loki-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: loki
  namespace: logging
  labels:
    app: loki
spec:
  replicas: 1
  selector:
    matchLabels:
      app: loki
  template:
    metadata:
      labels:
        app: loki
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 10001
        fsGroup: 10001
      containers:
      - name: loki
        image: grafana/loki:2.8.0
        ports:
        - containerPort: 3100
          name: loki
        args:
        - '-config.file=/etc/loki/local-config.yaml'
        - '-target=all'
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        volumeMounts:
        - name: config-volume
          mountPath: /etc/loki
        - name: storage-volume
          mountPath: /loki
        livenessProbe:
          httpGet:
            path: /ready
            port: 3100
          initialDelaySeconds: 45
          timeoutSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3100
          initialDelaySeconds: 10
          timeoutSeconds: 5
      volumes:
      - name: config-volume
        configMap:
          name: loki-config
      - name: storage-volume
        persistentVolumeClaim:
          claimName: loki-storage
---
apiVersion: v1
kind: Service
metadata:
  name: loki
  namespace: logging
  labels:
    app: loki
spec:
  selector:
    app: loki
  ports:
  - port: 3100
    targetPort: 3100
    name: loki
  type: ClusterIP
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: loki-storage
  namespace: logging
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: fast-ssd
```

**Loki Configuration**
```yaml
# loki-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: loki-config
  namespace: logging
data:
  local-config.yaml: |
    auth_enabled: false
    
    server:
      http_listen_port: 3100
      grpc_listen_port: 9096
    
    common:
      path_prefix: /loki
      storage:
        filesystem:
          chunks_directory: /loki/chunks
          rules_directory: /loki/rules
      replication_factor: 1
      ring:
        instance_addr: 127.0.0.1
        kvstore:
          store: inmemory
    
    schema_config:
      configs:
        - from: 2020-10-24
          store: boltdb-shipper
          object_store: filesystem
          schema: v11
          index:
            prefix: index_
            period: 24h
    
    storage_config:
      boltdb_shipper:
        active_index_directory: /loki/boltdb-shipper-active
        cache_location: /loki/boltdb-shipper-cache
        cache_ttl: 24h
        shared_store: filesystem
      filesystem:
        directory: /loki/chunks
    
    compactor:
      working_directory: /loki/boltdb-shipper-compactor
      shared_store: filesystem
    
    limits_config:
      reject_old_samples: true
      reject_old_samples_max_age: 168h
      ingestion_rate_mb: 16
      ingestion_burst_size_mb: 32
      per_stream_rate_limit: 5MB
      per_stream_rate_limit_burst: 20MB
      max_streams_per_user: 10000
      max_line_size: 256KB
    
    chunk_store_config:
      max_look_back_period: 0s
    
    table_manager:
      retention_deletes_enabled: false
      retention_period: 0s
    
    ruler:
      storage:
        type: local
        local:
          directory: /loki/rules
      rule_path: /loki/rules
      alertmanager_url: http://alertmanager.monitoring:9093
      ring:
        kvstore:
          store: inmemory
      enable_api: true
    
    analytics:
      reporting_enabled: false
```

### Promtail Log Collection

**Promtail DaemonSet**
```yaml
# promtail-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: promtail
  namespace: logging
  labels:
    app: promtail
spec:
  selector:
    matchLabels:
      app: promtail
  template:
    metadata:
      labels:
        app: promtail
    spec:
      serviceAccount: promtail
      containers:
      - name: promtail
        image: grafana/promtail:2.8.0
        args:
        - '-config.file=/etc/promtail/config.yml'
        - '-client.url=http://loki.logging:3100/loki/api/v1/push'
        ports:
        - containerPort: 3101
          name: promtail
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
        securityContext:
          runAsUser: 0
          privileged: true
        volumeMounts:
        - name: config-volume
          mountPath: /etc/promtail
        - name: varlog
          mountPath: /var/log
          readOnly: true
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
        - name: positions
          mountPath: /run/promtail
        env:
        - name: HOSTNAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
      volumes:
      - name: config-volume
        configMap:
          name: promtail-config
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
      - name: positions
        hostPath:
          path: /run/promtail
          type: DirectoryOrCreate
      tolerations:
      - key: node-role.kubernetes.io/master
        effect: NoSchedule
      - key: node-role.kubernetes.io/control-plane
        effect: NoSchedule
```

**Promtail Configuration**
```yaml
# promtail-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: promtail-config
  namespace: logging
data:
  config.yml: |
    server:
      http_listen_port: 3101
      grpc_listen_port: 0
    
    positions:
      filename: /run/promtail/positions.yaml
    
    clients:
    - url: http://loki.logging:3100/loki/api/v1/push
      tenant_id: education-platform
    
    scrape_configs:
    # Kubernetes pod logs
    - job_name: kubernetes-pods
      kubernetes_sd_configs:
      - role: pod
      pipeline_stages:
      - cri: {}
      relabel_configs:
      - source_labels:
        - __meta_kubernetes_pod_controller_name
        regex: ([0-9a-z-.]+?)(-[0-9a-f]{8,10})?
        target_label: __tmp_controller_name
      - source_labels:
        - __meta_kubernetes_pod_label_app_kubernetes_io_name
        - __meta_kubernetes_pod_label_app
        - __tmp_controller_name
        - __meta_kubernetes_pod_name
        regex: ^;*([^;]+)(;.*)?$
        target_label: app
        replacement: $1
      - source_labels:
        - __meta_kubernetes_pod_label_app_kubernetes_io_instance
        - __meta_kubernetes_pod_label_instance
        regex: ^;*([^;]+)(;.*)?$
        target_label: instance
        replacement: $1
      - source_labels:
        - __meta_kubernetes_pod_label_app_kubernetes_io_component
        - __meta_kubernetes_pod_label_component
        regex: ^;*([^;]+)(;.*)?$
        target_label: component
        replacement: $1
      - action: replace
        source_labels:
        - __meta_kubernetes_pod_node_name
        target_label: node_name
      - action: replace
        source_labels:
        - __meta_kubernetes_namespace
        target_label: namespace
      - action: replace
        replacement: $1
        separator: /
        source_labels:
        - namespace
        - app
        target_label: job
      - action: replace
        source_labels:
        - __meta_kubernetes_pod_name
        target_label: pod
      - action: replace
        source_labels:
        - __meta_kubernetes_pod_container_name
        target_label: container
      - action: replace
        source_labels:
        - __meta_kubernetes_pod_uid
        - __meta_kubernetes_pod_container_name
        target_label: __path__
        separator: /
        replacement: /var/log/pods/*$1/*.log
      - action: labelmap
        regex: __meta_kubernetes_pod_label_(.+)
      - action: labelmap
        regex: __meta_kubernetes_pod_annotation_(.+)
        replacement: annotation_$1
    
    # System logs
    - job_name: system
      static_configs:
      - targets:
        - localhost
        labels:
          job: syslog
          __path__: /var/log/syslog
      
    # Education Platform specific logs
    - job_name: education-platform
      kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
          - education-platform
      pipeline_stages:
      - cri: {}
      - json:
          expressions:
            level: level
            timestamp: timestamp
            message: message
            user_id: user_id
            session_id: session_id
            course_id: course_id
            request_id: request_id
      - timestamp:
          source: timestamp
          format: RFC3339
      - labels:
          level:
          user_id:
          session_id:
          course_id:
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: (frontend|api|auth-service|course-service)
      - source_labels: [__meta_kubernetes_namespace]
        action: replace
        target_label: namespace
      - source_labels: [__meta_kubernetes_pod_name]
        action: replace
        target_label: pod
      - source_labels: [__meta_kubernetes_pod_container_name]
        action: replace
        target_label: container
```

## Application Metrics Integration

### Custom Metrics Implementation

**Express.js Metrics Middleware**
```javascript
// metrics-middleware.js
const promClient = require('prom-client');
const express = require('express');

// Create custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const activeUsers = new promClient.Gauge({
  name: 'education_platform_active_users',
  help: 'Number of currently active users',
  labelNames: ['user_type']
});

const courseEnrollments = new promClient.Counter({
  name: 'education_platform_course_enrollments_total',
  help: 'Total number of course enrollments',
  labelNames: ['course_id', 'user_type']
});

const videoWatchTime = new promClient.Histogram({
  name: 'education_platform_video_watch_duration_seconds',
  help: 'Duration of video watching sessions',
  labelNames: ['course_id', 'video_id', 'user_type'],
  buckets: [30, 60, 300, 600, 1200, 1800, 3600]
});

const databaseOperations = new promClient.Histogram({
  name: 'education_platform_database_operation_duration_seconds',
  help: 'Duration of database operations',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
});

const authenticationAttempts = new promClient.Counter({
  name: 'education_platform_auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['method', 'status']
});

// Register default metrics
promClient.register.setDefaultLabels({
  app: 'education-platform',
  version: process.env.APP_VERSION || 'unknown'
});

promClient.collectDefaultMetrics({
  timeout: 5000,
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
});

// Metrics middleware
function metricsMiddleware(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    
    httpRequestDuration
      .labels(req.method, route, res.statusCode)
      .observe(duration);
    
    httpRequestsTotal
      .labels(req.method, route, res.statusCode)
      .inc();
  });
  
  next();
}

// Business metrics functions
function recordUserActivity(userId, userType) {
  activeUsers.labels(userType).inc();
}

function recordCourseEnrollment(courseId, userType) {
  courseEnrollments.labels(courseId, userType).inc();
}

function recordVideoWatchTime(courseId, videoId, userType, duration) {
  videoWatchTime.labels(courseId, videoId, userType).observe(duration);
}

function recordDatabaseOperation(operation, table, duration) {
  databaseOperations.labels(operation, table).observe(duration);
}

function recordAuthAttempt(method, status) {
  authenticationAttempts.labels(method, status).inc();
}

// Metrics endpoint
function createMetricsEndpoint() {
  const router = express.Router();
  
  router.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', promClient.register.contentType);
      const metrics = await promClient.register.metrics();
      res.end(metrics);
    } catch (error) {
      res.status(500).end(error.message);
    }
  });
  
  return router;
}

module.exports = {
  metricsMiddleware,
  recordUserActivity,
  recordCourseEnrollment,
  recordVideoWatchTime,
  recordDatabaseOperation,
  recordAuthAttempt,
  createMetricsEndpoint,
  metrics: {
    httpRequestDuration,
    httpRequestsTotal,
    activeUsers,
    courseEnrollments,
    videoWatchTime,
    databaseOperations,
    authenticationAttempts
  }
};
```

### Database Monitoring

**PostgreSQL Exporter**
```yaml
# postgres-exporter.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres-exporter
  namespace: education-platform
  labels:
    app: postgres-exporter
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres-exporter
  template:
    metadata:
      labels:
        app: postgres-exporter
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9187"
    spec:
      containers:
      - name: postgres-exporter
        image: prometheuscommunity/postgres-exporter:v0.12.0
        ports:
        - containerPort: 9187
          name: metrics
        env:
        - name: DATA_SOURCE_NAME
          valueFrom:
            secretKeyRef:
              name: postgres-exporter-credentials
              key: data-source-name
        - name: PG_EXPORTER_EXTEND_QUERY_PATH
          value: "/etc/postgres-exporter/queries.yaml"
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
        volumeMounts:
        - name: queries-config
          mountPath: /etc/postgres-exporter
        livenessProbe:
          httpGet:
            path: /
            port: 9187
          initialDelaySeconds: 30
          timeoutSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 9187
          initialDelaySeconds: 5
          timeoutSeconds: 5
      volumes:
      - name: queries-config
        configMap:
          name: postgres-exporter-queries
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-exporter
  namespace: education-platform
  labels:
    app: postgres-exporter
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "9187"
spec:
  selector:
    app: postgres-exporter
  ports:
  - port: 9187
    targetPort: 9187
    name: metrics
  type: ClusterIP
```

**Custom PostgreSQL Queries**
```yaml
# postgres-exporter-queries.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-exporter-queries
  namespace: education-platform
data:
  queries.yaml: |
    pg_database_size:
      query: "SELECT datname, pg_database_size(datname) as size FROM pg_database"
      master: true
      metrics:
        - datname:
            usage: "LABEL"
            description: "Name of the database"
        - size:
            usage: "GAUGE"
            description: "Database size in bytes"
    
    pg_active_connections:
      query: "SELECT datname, count(*) as active FROM pg_stat_activity WHERE state = 'active' GROUP BY datname"
      master: true
      metrics:
        - datname:
            usage: "LABEL"
            description: "Database name"
        - active:
            usage: "GAUGE"
            description: "Number of active connections"
    
    pg_table_sizes:
      query: |
        SELECT 
          schemaname,
          tablename,
          pg_total_relation_size(schemaname||'.'||tablename) as total_size,
          pg_relation_size(schemaname||'.'||tablename) as table_size
        FROM pg_tables 
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
      master: true
      metrics:
        - schemaname:
            usage: "LABEL"
            description: "Schema name"
        - tablename:
            usage: "LABEL"
            description: "Table name"
        - total_size:
            usage: "GAUGE"
            description: "Total table size including indexes"
        - table_size:
            usage: "GAUGE"
            description: "Table size excluding indexes"
    
    education_platform_user_stats:
      query: |
        SELECT 
          'total_users' as metric,
          count(*) as value
        FROM users
        UNION ALL
        SELECT 
          'active_users_24h' as metric,
          count(*) as value
        FROM users 
        WHERE last_login > NOW() - INTERVAL '24 hours'
        UNION ALL
        SELECT 
          'total_courses' as metric,
          count(*) as value
        FROM courses
        UNION ALL
        SELECT 
          'total_enrollments' as metric,
          count(*) as value
        FROM enrollments
      master: true
      metrics:
        - metric:
            usage: "LABEL"
            description: "Metric name"
        - value:
            usage: "GAUGE"
            description: "Metric value"
```

### Redis Monitoring

**Redis Exporter**
```yaml
# redis-exporter.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-exporter
  namespace: education-platform
  labels:
    app: redis-exporter
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis-exporter
  template:
    metadata:
      labels:
        app: redis-exporter
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9121"
    spec:
      containers:
      - name: redis-exporter
        image: oliver006/redis_exporter:v1.52.0
        ports:
        - containerPort: 9121
          name: metrics
        env:
        - name: REDIS_ADDR
          value: "redis://redis-service:6379"
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: password
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 100m
            memory: 128Mi
        livenessProbe:
          httpGet:
            path: /
            port: 9121
          initialDelaySeconds: 30
          timeoutSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 9121
          initialDelaySeconds: 5
          timeoutSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: redis-exporter
  namespace: education-platform
  labels:
    app: redis-exporter
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "9121"
spec:
  selector:
    app: redis-exporter
  ports:
  - port: 9121
    targetPort: 9121
    name: metrics
  type: ClusterIP
```

## Distributed Tracing

### Jaeger Implementation

**Jaeger All-in-One Deployment**
```yaml
# jaeger-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jaeger
  namespace: monitoring
  labels:
    app: jaeger
spec:
  replicas: 1
  selector:
    matchLabels:
      app: jaeger
  template:
    metadata:
      labels:
        app: jaeger
    spec:
      containers:
      - name: jaeger
        image: jaegertracing/all-in-one:1.46
        ports:
        - containerPort: 16686
          name: query
        - containerPort: 14268
          name: collector
        - containerPort: 14250
          name: grpc
        - containerPort: 6831
          name: agent
          protocol: UDP
        - containerPort: 6832
          name: agent-binary
          protocol: UDP
        env:
        - name: COLLECTOR_ZIPKIN_HOST_PORT
          value: ":9411"
        - name: SPAN_STORAGE_TYPE
          value: "memory"
        - name: JAEGER_DISABLED
          value: "false"
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /
            port: 16686
          initialDelaySeconds: 30
          timeoutSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 16686
          initialDelaySeconds: 5
          timeoutSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: jaeger-query
  namespace: monitoring
  labels:
    app: jaeger
spec:
  selector:
    app: jaeger
  ports:
  - port: 16686
    targetPort: 16686
    name: query
  type: ClusterIP
---
apiVersion: v1
kind: Service
metadata:
  name: jaeger-collector
  namespace: monitoring
  labels:
    app: jaeger
spec:
  selector:
    app: jaeger
  ports:
  - port: 14268
    targetPort: 14268
    name: collector
  - port: 14250
    targetPort: 14250
    name: grpc
  - port: 9411
    targetPort: 9411
    name: zipkin
  type: ClusterIP
---
apiVersion: v1
kind: Service
metadata:
  name: jaeger-agent
  namespace: monitoring
  labels:
    app: jaeger
spec:
  selector:
    app: jaeger
  ports:
  - port: 6831
    targetPort: 6831
    name: agent
    protocol: UDP
  - port: 6832
    targetPort: 6832
    name: agent-binary
    protocol: UDP
  type: ClusterIP
```

### Application Tracing Integration

**OpenTelemetry Tracing Setup**
```javascript
// tracing.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus');

// Configure resource
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'education-platform-frontend',
  [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION || '1.0.0',
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
});

// Configure tracing
const jaegerExporter = new JaegerExporter({
  endpoint: process.env.JAEGER_ENDPOINT || 'http://jaeger-collector.monitoring:14268/api/traces',
});

// Configure metrics
const prometheusExporter = new PrometheusExporter({
  port: 9090,
  endpoint: '/metrics',
});

// Initialize SDK
const sdk = new NodeSDK({
  resource,
  traceExporter: jaegerExporter,
  metricReader: new PeriodicExportingMetricReader({
    exporter: prometheusExporter,
    exportIntervalMillis: 1000,
  }),
  instrumentations: [
    // Auto-instrumentation packages
    require('@opentelemetry/auto-instrumentations-node').getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false, // Disable file system instrumentation for performance
      },
    }),
  ],
});

// Start tracing
sdk.start();

console.log('OpenTelemetry tracing initialized successfully');

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('OpenTelemetry terminated'))
    .catch((error) => console.error('Error terminating OpenTelemetry', error))
    .finally(() => process.exit(0));
});

module.exports = sdk;
```

## Alert Rules and Dashboards

### Prometheus Alert Rules

```yaml
# prometheus-rules.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-rules
  namespace: monitoring
data:
  education-platform.yml: |
    groups:
    - name: education-platform.rules
      interval: 30s
      rules:
      # High-level service availability
      - alert: ServiceDown
        expr: up{job="education-platform"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Education Platform service is down"
          description: "Service {{ $labels.instance }} has been down for more than 1 minute"
      
      # Application performance alerts
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="education-platform"}[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}s for {{ $labels.instance }}"
      
      - alert: HighErrorRate
        expr: rate(http_requests_total{job="education-platform",status_code=~"5.."}[5m]) / rate(http_requests_total{job="education-platform"}[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} for {{ $labels.instance }}"
      
      # Database alerts
      - alert: DatabaseConnectionsHigh
        expr: pg_stat_activity_count > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High number of database connections"
          description: "Database has {{ $value }} active connections"
      
      - alert: DatabaseReplicationLag
        expr: pg_replication_lag_seconds > 30
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Database replication lag is high"
          description: "Replication lag is {{ $value }}s"
      
      # Memory and CPU alerts
      - alert: HighMemoryUsage
        expr: (container_memory_usage_bytes{namespace="education-platform"} / container_spec_memory_limit_bytes) * 100 > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value }}% for {{ $labels.pod }}"
      
      - alert: HighCPUUsage
        expr: rate(container_cpu_usage_seconds_total{namespace="education-platform"}[5m]) * 100 > 80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage"
          description: "CPU usage is {{ $value }}% for {{ $labels.pod }}"
      
      # Education-specific alerts
      - alert: LowActiveUsers
        expr: education_platform_active_users < 10
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Low number of active users"
          description: "Only {{ $value }} users are currently active"
      
      - alert: HighVideoLoadFailures
        expr: rate(education_platform_video_load_failures_total[5m]) > 0.1
        for: 3m
        labels:
          severity: critical
        annotations:
          summary: "High video load failure rate"
          description: "Video load failure rate is {{ $value }}/s"
      
      # Infrastructure alerts
      - alert: KubernetesNodeNotReady
        expr: kube_node_status_condition{condition="Ready",status="true"} == 0
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Kubernetes node not ready"
          description: "Node {{ $labels.node }} has been not ready for more than 10 minutes"
      
      - alert: PodCrashLooping
        expr: rate(kube_pod_container_status_restarts_total{namespace="education-platform"}[15m]) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Pod is crash looping"
          description: "Pod {{ $labels.pod }} in namespace {{ $labels.namespace }} is restarting frequently"
```

This comprehensive monitoring and logging setup guide provides the complete observability infrastructure needed for the 7P Education Platform, ensuring proactive monitoring, efficient troubleshooting, and optimal performance management across all system components.