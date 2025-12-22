# Catalog Guide

This guide covers everything you need to know about managing your service catalog in Tracker.

## Overview

The Catalog feature helps you maintain an inventory of all your modules, libraries, projects, containers, and other software components across your organization. It provides a centralized view of your technology stack, versions, and ownership.

## Catalog Item Types

| Type | Value | Description | Examples |
|------|-------|-------------|----------|
| **Module** | `1` | Reusable code modules | Terraform modules, shared libraries |
| **Library** | `2` | Code libraries | npm packages, Python packages |
| **Workflow** | `3` | CI/CD workflows | GitHub Actions, Jenkins pipelines |
| **Project** | `4` | Complete projects | Microservices, applications |
| **Chart** | `5` | Helm charts | Kubernetes deployments |
| **Package** | `6` | Distributed packages | Docker images, artifacts |
| **Container** | `7` | Container images | Docker, OCI containers |

## Supported Languages

| Language | Value | Icon |
|----------|-------|------|
| Go | `1` | 🐹 |
| Java | `2` | ☕ |
| Kotlin | `3` | 🟣 |
| Python | `4` | 🐍 |
| JavaScript | `5` | 💛 |
| TypeScript | `6` | 💙 |
| Terraform | `7` | 🟪 |
| Helm | `8` | ⎈ |
| YAML | `9` | 📄 |
| Docker | `10` | 🐳 |
| PHP | `11` | 🐘 |
| Rust | `12` | 🦀 |
| Groovy | `13` | 📜 |

## Catalog Item Structure

### Complete Schema

```json
{
  "name": "user-service",
  "type": 4,
  "languages": 1,
  "owner": "backend-team",
  "version": "2.1.0",
  "link": "https://docs.example.com/user-service",
  "description": "User management microservice with authentication",
  "repository": "https://github.com/org/user-service",
  "dependenciesIn": ["database", "redis-cache", "auth-service"],
  "dependenciesOut": ["api-gateway", "web-app"],
  "sla": {
    "level": 1,
    "uptimePercentage": 99.99,
    "responseTimeMs": 100,
    "description": "Critical service for all authentication flows"
  }
}
```

### Field Descriptions

#### Required Fields

- **name** (string): Unique identifier for the catalog item
- **type** (int): Item type (1-7, see table above)
- **languages** (int): Primary programming language

#### Optional Fields

- **owner** (string): Team or person responsible
- **version** (string): Current version (semver recommended)
- **link** (string): Documentation URL
- **description** (string): Brief description
- **repository** (string): Source code repository URL
- **dependenciesIn** (array): Upstream dependencies (services this service depends on)
- **dependenciesOut** (array): Downstream dependencies (services that depend on this service)
- **sla** (object): Service Level Agreement configuration

#### SLA Configuration

The `sla` object defines service level targets:

- **level** (int): SLA level (1=Critical, 2=High, 3=Medium, 4=Low)
- **uptimePercentage** (float): Target uptime percentage (e.g., 99.99)
- **responseTimeMs** (int): Target response time in milliseconds
- **description** (string): Additional SLA details

**SLA Levels:**
| Level | Value | Uptime Target | Use Case |
|-------|-------|---------------|----------|
| Critical | `1` | 99.99% | Mission-critical services |
| High | `2` | 99.9% | Important production services |
| Medium | `3` | 99.5% | Standard services |
| Low | `4` | 99% | Non-critical services |

## REST API

### Create or Update Catalog Item

```bash
PUT /api/v1alpha1/catalog
```

**Example - Add a microservice:**
```bash
curl -X PUT http://localhost:8080/api/v1alpha1/catalog \
  -H "Content-Type: application/json" \
  -d '{
    "name": "user-service",
    "type": 4,
    "languages": 1,
    "owner": "backend-team",
    "version": "2.1.0",
    "description": "User management microservice",
    "repository": "https://github.com/org/user-service",
    "link": "https://docs.example.com/user-service"
  }'
```

**Example - Add a Terraform module:**
```bash
curl -X PUT http://localhost:8080/api/v1alpha1/catalog \
  -H "Content-Type: application/json" \
  -d '{
    "name": "terraform/aws-vpc",
    "type": 1,
    "languages": 7,
    "owner": "platform-team",
    "version": "1.5.0",
    "description": "AWS VPC module with standard configuration",
    "repository": "https://github.com/org/terraform-modules"
  }'
```

**Example - Add a Docker image:**
```bash
curl -X PUT http://localhost:8080/api/v1alpha1/catalog \
  -H "Content-Type: application/json" \
  -d '{
    "name": "api-gateway",
    "type": 7,
    "languages": 1,
    "owner": "platform-team",
    "version": "3.2.1",
    "description": "API Gateway container image",
    "repository": "https://hub.docker.com/r/org/api-gateway"
  }'
```

### Get Catalog Item

```bash
GET /api/v1alpha1/catalog?name={name}
```

**Example:**
```bash
curl "http://localhost:8080/api/v1alpha1/catalog?name=user-service"
```

### Delete Catalog Item

```bash
DELETE /api/v1alpha1/catalog?name={name}
```

**Example:**
```bash
curl -X DELETE "http://localhost:8080/api/v1alpha1/catalog?name=user-service"
```

### List Catalog Items

```bash
GET /api/v1alpha1/catalogs/list?per_page=10&page=1
```

**Example:**
```bash
# Get first 10 items
curl "http://localhost:8080/api/v1alpha1/catalogs/list?per_page=10&page=1"

# Get next 10 items
curl "http://localhost:8080/api/v1alpha1/catalogs/list?per_page=10&page=2"
```

## gRPC API

### Create or Update Catalog Item

```bash
grpcurl --plaintext -d '{
  "name": "user-service",
  "type": 4,
  "languages": 1,
  "owner": "backend-team",
  "version": "2.1.0",
  "description": "User management microservice",
  "repository": "https://github.com/org/user-service"
}' localhost:8765 tracker.catalog.v1alpha1.CatalogService/CreateUpdateCatalog
```

### Get Catalog Item

```bash
grpcurl --plaintext -d '{
  "name": "user-service"
}' localhost:8765 tracker.catalog.v1alpha1.CatalogService/GetCatalog
```

### List Catalog Items

```bash
grpcurl --plaintext localhost:8765 tracker.catalog.v1alpha1.CatalogService/ListCatalogs
```

## Use Cases

### 1. Track Microservices with SLA and Dependencies

Maintain an inventory of all your microservices with their dependencies and SLA targets:

```bash
curl -X PUT http://localhost:8080/api/v1alpha1/catalog \
  -H "Content-Type: application/json" \
  -d '{
    "name": "payment-service",
    "type": 4,
    "languages": 2,
    "owner": "payments-team",
    "version": "1.8.3",
    "description": "Payment processing service with Stripe integration",
    "repository": "https://github.com/org/payment-service",
    "link": "https://docs.example.com/payments",
    "dependenciesIn": ["user-service", "database", "stripe-api"],
    "dependenciesOut": ["api-gateway", "mobile-app"],
    "sla": {
      "level": 1,
      "uptimePercentage": 99.99,
      "responseTimeMs": 200,
      "description": "Critical payment processing service"
    }
  }'
```

### 2. Manage Shared Libraries

Track shared libraries across teams:

```bash
curl -X PUT http://localhost:8080/api/v1alpha1/catalog \
  -H "Content-Type: application/json" \
  -d '{
    "name": "@org/ui-components",
    "type": 2,
    "languages": 6,
    "owner": "frontend-team",
    "version": "2.5.0",
    "description": "Shared React component library",
    "repository": "https://github.com/org/ui-components",
    "link": "https://storybook.example.com"
  }'
```

### 3. Document Terraform Modules

Keep track of infrastructure modules:

```bash
curl -X PUT http://localhost:8080/api/v1alpha1/catalog \
  -H "Content-Type: application/json" \
  -d '{
    "name": "terraform/aws-eks",
    "type": 1,
    "languages": 7,
    "owner": "platform-team",
    "version": "2.0.1",
    "description": "AWS EKS cluster module with best practices",
    "repository": "https://github.com/org/terraform-aws-eks"
  }'
```

### 4. Track Container Images

Monitor Docker images and versions:

```bash
curl -X PUT http://localhost:8080/api/v1alpha1/catalog \
  -H "Content-Type: application/json" \
  -d '{
    "name": "nginx-proxy",
    "type": 7,
    "languages": 10,
    "owner": "ops-team",
    "version": "1.21.6-alpine",
    "description": "Nginx reverse proxy with custom configuration",
    "repository": "https://hub.docker.com/r/org/nginx-proxy"
  }'
```

### 5. Catalog Helm Charts

Document Kubernetes deployments:

```bash
curl -X PUT http://localhost:8080/api/v1alpha1/catalog \
  -H "Content-Type: application/json" \
  -d '{
    "name": "app-chart",
    "type": 5,
    "languages": 8,
    "owner": "platform-team",
    "version": "0.5.2",
    "description": "Standard application Helm chart",
    "repository": "https://github.com/org/helm-charts"
  }'
```

## Best Practices

### 1. Use Consistent Naming

**Good naming conventions:**
- Microservices: `user-service`, `payment-service`
- Libraries: `@org/component-name`, `org-utils`
- Terraform modules: `terraform/aws-vpc`, `terraform/gcp-network`
- Docker images: `app-name`, `service-name`

**Avoid:**
- Inconsistent casing: `UserService` vs `user-service`
- Unclear names: `service1`, `module-x`

### 2. Keep Versions Updated

- Use semantic versioning (semver): `MAJOR.MINOR.PATCH`
- Update catalog when deploying new versions
- Track breaking changes in major versions

### 3. Link to Documentation

Always provide:
- Repository URL for source code
- Documentation link for usage guides
- API documentation for libraries

### 4. Assign Clear Ownership

- Use team names, not individual names
- Keep ownership updated when teams change
- Use consistent team naming

### 5. Write Descriptive Descriptions

**Good:**
- "User management microservice with authentication and authorization"
- "Shared React component library with Storybook documentation"

**Bad:**
- "User service"
- "Components"

## Automation Examples

### GitHub Actions - Auto-Update Catalog

```yaml
name: Update Catalog

on:
  push:
    tags:
      - 'v*'

jobs:
  update-catalog:
    runs-on: ubuntu-latest
    steps:
      - name: Extract version
        id: version
        run: echo "VERSION=${GITHUB_REF#refs/tags/v}" >> $GITHUB_OUTPUT

      - name: Update Tracker Catalog
        run: |
          curl -X PUT ${{ secrets.TRACKER_URL }}/api/v1alpha1/catalog \
            -H "Content-Type: application/json" \
            -d '{
              "name": "${{ github.repository }}",
              "type": 4,
              "languages": 1,
              "owner": "${{ github.repository_owner }}",
              "version": "${{ steps.version.outputs.VERSION }}",
              "repository": "${{ github.server_url }}/${{ github.repository }}"
            }'
```

### CI/CD Integration

Update catalog after successful deployment:

```bash
#!/bin/bash
# update-catalog.sh

SERVICE_NAME="user-service"
VERSION=$(cat VERSION)
OWNER="backend-team"

curl -X PUT ${TRACKER_URL}/api/v1alpha1/catalog \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"${SERVICE_NAME}\",
    \"type\": 4,
    \"languages\": 1,
    \"owner\": \"${OWNER}\",
    \"version\": \"${VERSION}\",
    \"repository\": \"https://github.com/org/${SERVICE_NAME}\"
  }"
```

## Querying the Catalog

### Find All Services by Team

```bash
# Get all catalog items
curl "http://localhost:8080/api/v1alpha1/catalogs/list?per_page=100" | \
  jq '.items[] | select(.owner == "backend-team")'
```

### List All Terraform Modules

```bash
curl "http://localhost:8080/api/v1alpha1/catalogs/list?per_page=100" | \
  jq '.items[] | select(.type == 1 and .languages == 7)'
```

### Find Outdated Versions

Compare catalog versions with latest releases to identify outdated components.

## Dependency Visualization

The Tracker UI provides powerful dependency visualization features:

### Service Detail Page

Navigate to `/catalog/{service-name}` to view:
- **Interactive dependency graph** showing upstream and downstream dependencies
- **SLA metrics** with color-coded badges
- **Dependency counts** (in/out)
- **Service information** (type, language, owner, version)
- **Links** to repository and documentation

### Global Dependencies View

Navigate to `/catalog/dependencies` to view:
- **Complete dependency graph** of all services
- **Filter by SLA level** to focus on critical services
- **Search functionality** to find specific services
- **Statistics** showing total services and dependencies

### Understanding Dependencies

- **Upstream Dependencies (In)**: Services that this service depends on
  - Example: `payment-service` depends on `user-service`, `database`, `stripe-api`
  - If an upstream service fails, this service may be impacted

- **Downstream Dependencies (Out)**: Services that depend on this service
  - Example: `api-gateway`, `mobile-app` depend on `payment-service`
  - If this service fails, downstream services will be impacted

### Dependency Graph Features

- **Interactive navigation**: Click on any service node to view its details
- **Color coding**: Nodes are colored by SLA level (red=critical, orange=high, yellow=medium, green=low)
- **Zoom and pan**: Use mouse wheel to zoom, drag to pan
- **Minimap**: Overview of the entire graph in the corner
- **Animated edges**: Flow direction is indicated by animated arrows

## Integration with Events

Link catalog items to deployment events:

```bash
# Deploy and create event
curl -X POST http://localhost:8080/api/v1alpha1/event \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Deploy user-service v2.1.0",
    "attributes": {
      "type": 1,
      "service": "user-service",
      "status": 3,
      "environment": 7
    }
  }'

# Update catalog with new version
curl -X PUT http://localhost:8080/api/v1alpha1/catalog \
  -H "Content-Type: application/json" \
  -d '{
    "name": "user-service",
    "version": "2.1.0"
  }'
```

## Troubleshooting

### Item Not Appearing in List

1. Verify item was created (check response)
2. Check pagination parameters
3. Ensure name is unique

### Cannot Update Item

- Use PUT, not POST
- Include all required fields
- Verify name matches exactly

### Duplicate Items

- Catalog uses `name` as unique identifier
- PUT will update existing items with same name
- Use different names for different environments

## Next Steps

- [Events Guide](./EVENTS.md) - Track deployments and changes
- [Configuration Guide](./CONFIGURATION.md) - Configure Tracker
- [API Specification](./api-specification.md) - Full API reference
