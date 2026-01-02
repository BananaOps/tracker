# Tracker Helm Chart

A Helm chart for deploying Tracker, an open-source deployment tracking and catalog management solution.

## Description

Tracker is a comprehensive API solution for tracking deployments, managing catalogs, and handling events. This Helm chart deploys Tracker along with an optional MongoDB database for data persistence.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.0+
- Gateway API CRDs (if using HTTPRoute)

## Installation

### Add Repository (if applicable)

```bash
helm repo add tracker https://your-repo-url
helm repo update
```

### Install Chart

```bash
# Install with default values
helm install tracker ./tracker

# Install with custom values
helm install tracker ./tracker -f custom-values.yaml

# Install in specific namespace
helm install tracker ./tracker -n tracker --create-namespace
```

### Using Helmfile

```bash
cd tracker/
helmfile sync
```

## Upgrading

```bash
helm upgrade tracker ./tracker

# With helmfile
helmfile apply
```

## Uninstalling

```bash
helm uninstall tracker

# With helmfile
helmfile destroy
```

## Configuration

The following table lists the configurable parameters of the Tracker chart and their default values.

### Global Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of Tracker replicas | `1` |
| `nameOverride` | String to override the chart name | `""` |
| `fullnameOverride` | String to fully override tracker.fullname | `""` |

### MongoDB Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `mongodb.enabled` | Enable MongoDB deployment | `true` |
| `mongodb.auth.enabled` | Enable MongoDB authentication | `false` |
| `mongodb.useStatefulSet` | Use StatefulSet for MongoDB | `true` |

### Database Environment

| Parameter | Description | Default |
|-----------|-------------|---------|
| `env.db.host` | MongoDB host | `tracker-mongodb` |
| `env.db.port` | MongoDB port | `27017` |

### Jira Integration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `env.jira.domain` | Jira domain for ticket creation | `jira.company.com` |
| `env.jira.projectKey` | Jira project key for quick ticket creation | `""` |

### Slack Integration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `env.slack.workspace` | Slack workspace name | `your-workspace` |
| `env.slack.eventsChannel` | Slack channel ID for deployment events | `""` |

### Image Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `image.repository` | Tracker image repository | `bananaops/tracker` |
| `image.pullPolicy` | Image pull policy | `IfNotPresent` |
| `image.tag` | Image tag (defaults to chart appVersion) | `""` |
| `imagePullSecrets` | Image pull secrets | `[]` |

### Service Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `service.type` | Kubernetes Service type | `ClusterIP` |
| `service.grpc.port` | gRPC port | `8765` |
| `service.http.port` | HTTP port | `8080` |
| `service.metrics.port` | Metrics port | `8081` |
| `service.annotations` | Service annotations | `{}` |

### Ingress Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ingress.enabled` | Enable ingress | `true` |
| `ingress.className` | Ingress class name | `traefik` |
| `ingress.annotations` | Ingress annotations | `{}` |
| `ingress.hosts` | Ingress hosts configuration | See values.yaml |
| `ingress.tls` | Ingress TLS configuration | `[]` |

**Ingress Example:**

```yaml
ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: tracker.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: tracker-tls
      hosts:
        - tracker.example.com
```

### Gateway API / HTTPRoute Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `gateway.enabled` | Enable HTTPRoute (Gateway API) | `true` |
| `gateway.name` | Gateway name to attach to | `gateway-tracker` |
| `gateway.namespace` | Gateway namespace (defaults to release namespace) | `""` |
| `gateway.pathType` | Path match type (Exact, PathPrefix, RegularExpression) | `Exact` |
| `gateway.annotations` | HTTPRoute annotations | `{}` |
| `gateway.hosts` | HTTPRoute hosts configuration | See values.yaml |

**Gateway Example:**

```yaml
gateway:
  enabled: true
  name: my-gateway
  namespace: gateway-system
  pathType: PathPrefix
  annotations:
    alerting: tracker-team
  hosts:
    - host: tracker.example.com
      paths:
        - path: /api
        - path: /docs
```

**Path Types:**
- `Exact`: Matches the exact path
- `PathPrefix`: Matches requests with the path prefix
- `RegularExpression`: Matches using regex pattern

### Resource Management

| Parameter | Description | Default |
|-----------|-------------|---------|
| `resources.limits.cpu` | CPU limit | `250m` |
| `resources.limits.memory` | Memory limit | `128Mi` |
| `resources.requests.cpu` | CPU request | `250m` |
| `resources.requests.memory` | Memory request | `128Mi` |

**Resource Example:**

```yaml
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi
```

### Monitoring Configuration

#### Prometheus ServiceMonitor

| Parameter | Description | Default |
|-----------|-------------|---------|
| `prometheus.monitor.enabled` | Enable Prometheus ServiceMonitor | `false` |
| `prometheus.monitor.additionalLabels` | Additional labels for ServiceMonitor | `{}` |
| `prometheus.monitor.relabelings` | RelabelConfigs for ServiceMonitor | `[]` |
| `prometheus.monitor.scrapeTimeout` | Scrape timeout | `10s` |

#### VictoriaMetrics ServiceScrape

| Parameter | Description | Default |
|-----------|-------------|---------|
| `victoriametrics.monitor.enabled` | Enable VictoriaMetrics ServiceScrape | `true` |
| `victoriametrics.monitor.additionalLabels` | Additional labels for ServiceScrape | `{}` |
| `victoriametrics.monitor.relabelings` | RelabelConfigs for ServiceScrape | `[]` |
| `victoriametrics.monitor.scrapeTimeout` | Scrape timeout | `10s` |

**Monitoring Example:**

```yaml
prometheus:
  monitor:
    enabled: true
    additionalLabels:
      prometheus: kube-prometheus
    scrapeTimeout: 30s
```

### Autoscaling Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `autoscaling.enabled` | Enable Horizontal Pod Autoscaler | `false` |
| `autoscaling.minReplicas` | Minimum number of replicas | `1` |
| `autoscaling.maxReplicas` | Maximum number of replicas | `2` |
| `autoscaling.targetCPUUtilizationPercentage` | Target CPU utilization | `80` |
| `autoscaling.targetMemoryUtilizationPercentage` | Target memory utilization | `80` |

**Autoscaling Example:**

```yaml
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 75
```

### Security Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `podSecurityContext` | Pod security context | `{}` |
| `securityContext` | Container security context | `{}` |
| `podAnnotations` | Pod annotations | `{}` |

**Security Example:**

```yaml
podSecurityContext:
  fsGroup: 2000
  runAsNonRoot: true
  runAsUser: 1000

securityContext:
  capabilities:
    drop:
    - ALL
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
```

### Node Assignment

| Parameter | Description | Default |
|-----------|-------------|---------|
| `nodeSelector` | Node labels for pod assignment | `{}` |
| `tolerations` | Tolerations for pod assignment | `[]` |
| `affinity` | Affinity rules for pod assignment | `{}` |

**Node Assignment Example:**

```yaml
nodeSelector:
  workload: api

tolerations:
  - key: "dedicated"
    operator: "Equal"
    value: "api"
    effect: "NoSchedule"

affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
              - key: app.kubernetes.io/name
                operator: In
                values:
                  - tracker
          topologyKey: kubernetes.io/hostname
```

## Common Configurations

### Production Configuration

```yaml
replicaCount: 3

image:
  repository: your-registry.com/tracker
  tag: "0.12.0"
  pullPolicy: Always

resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 500m
    memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

mongodb:
  enabled: true
  auth:
    enabled: true
    rootPassword: "secure-password"
  persistence:
    enabled: true
    size: 20Gi

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
  hosts:
    - host: tracker.production.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: tracker-tls
      hosts:
        - tracker.production.com

env:
  jira:
    domain: "company.atlassian.net"
    projectKey: "TRACK"
  slack:
    workspace: "company"
    eventsChannel: "C01234ABCDE"

prometheus:
  monitor:
    enabled: true
    additionalLabels:
      prometheus: kube-prometheus
```

### Development Configuration

```yaml
replicaCount: 1

image:
  repository: bananaops/tracker
  tag: "latest"
  pullPolicy: Always

resources:
  limits:
    cpu: 250m
    memory: 128Mi
  requests:
    cpu: 100m
    memory: 64Mi

mongodb:
  enabled: true
  auth:
    enabled: false

ingress:
  enabled: true
  className: traefik
  hosts:
    - host: tracker.local
      paths:
        - path: /
          pathType: Prefix

gateway:
  enabled: false
```

### Using External MongoDB

```yaml
mongodb:
  enabled: false

env:
  db:
    host: "mongodb.external.com"
    port: 27017
```

## Ports

Tracker exposes the following ports:

- **8080**: HTTP API endpoint
- **8765**: gRPC endpoint
- **8081**: Metrics endpoint (Prometheus compatible)

## Environment Variables

The following environment variables are automatically configured:

- `DB_HOST`: MongoDB host
- `DB_PORT`: MongoDB port
- `HTTP_PORT`: HTTP server port
- `GRPC_PORT`: gRPC server port
- `JIRA_DOMAIN`: Jira integration domain
- `JIRA_PROJECT_KEY`: Jira project key
- `SLACK_WORKSPACE`: Slack workspace name
- `SLACK_EVENTS_CHANNEL`: Slack events channel ID

## Accessing Tracker

### Port Forwarding (Development)

```bash
kubectl port-forward svc/tracker 8080:8080 -n tracker

# Access the API
curl http://localhost:8080/health
```

### Through Ingress

```bash
curl https://tracker.example.com/health
```

## Monitoring

Tracker exposes Prometheus-compatible metrics on port 8081:

```bash
kubectl port-forward svc/tracker 8081:8081
curl http://localhost:8081/metrics
```

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n tracker
kubectl describe pod <pod-name> -n tracker
kubectl logs <pod-name> -n tracker
```

### Check Service

```bash
kubectl get svc -n tracker
kubectl describe svc tracker -n tracker
```

### Check Ingress/HTTPRoute

```bash
# For Ingress
kubectl get ingress -n tracker
kubectl describe ingress tracker -n tracker

# For HTTPRoute
kubectl get httproute -n tracker
kubectl describe httproute tracker -n tracker
```

### Common Issues

**Pod fails to start:**
- Check MongoDB connectivity
- Verify image pull secrets if using private registry
- Review resource limits

**Cannot access service:**
- Verify ingress/httproute configuration
- Check gateway configuration and status
- Verify DNS resolution

**MongoDB connection errors:**
- Check MongoDB pod status
- Verify service name and port
- Check authentication credentials

## Support

For issues and questions:
- GitHub Issues: [tracker repository]
- Documentation: [tracker docs]

## License

[Specify your license]
