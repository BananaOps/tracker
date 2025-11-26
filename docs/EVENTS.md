# Events Guide

This guide covers everything you need to know about working with events in Tracker.

## Overview

Events are the core of Tracker. They represent significant occurrences in your infrastructure and applications, such as deployments, incidents, configuration changes, and operational activities.

## Event Types

Tracker supports five main event types:

| Type | Value | Description | Use Case |
|------|-------|-------------|----------|
| **Deployment** | `1` | Application or service deployments | Track releases to production |
| **Operation** | `2` | Operational activities | Maintenance windows, migrations |
| **Drift** | `3` | Configuration drift detection | Terraform/IaC changes |
| **Incident** | `4` | System incidents and outages | Track problems and resolutions |
| **RPA Usage** | `5` | Robotic Process Automation | Monitor automation executions |

## Event Structure

### Complete Event Schema

```json
{
  "title": "Deploy user-service v2.1.0 to production",
  "attributes": {
    "message": "Deployed via GitHub Actions workflow",
    "source": "github_actions",
    "type": 1,
    "priority": 2,
    "relatedId": "parent-event-uuid",
    "service": "user-service",
    "status": 3,
    "environment": 7,
    "impact": 2,
    "startDate": "2024-01-15T10:00:00Z",
    "endDate": "2024-01-15T10:05:00Z",
    "owner": "platform-team",
    "stakeHolders": ["backend-team", "ops-team"],
    "notification": true,
    "notifications": ["slack", "email"]
  },
  "links": {
    "pullRequestLink": "https://github.com/org/repo/pull/123",
    "ticket": "PROJ-456"
  }
}
```

### Field Descriptions

#### Required Fields

- **title** (string): Short, descriptive title of the event
- **attributes.type** (int): Event type (1-5, see table above)
- **attributes.service** (string): Service or component name

#### Optional Fields

- **attributes.message** (string): Detailed description
- **attributes.source** (string): Event origin (e.g., `github_actions`, `jenkins`, `manual`)
- **attributes.priority** (int): Priority level (1=P1/Critical, 5=P5/Low)
- **attributes.status** (int): Current status (see Status Values below)
- **attributes.environment** (int): Target environment (see Environment Values below)
- **attributes.impact** (int): Business impact level (1=Low, 3=High)
- **attributes.owner** (string): Team or person responsible
- **attributes.stakeHolders** (array): List of affected teams
- **links.pullRequestLink** (string): GitHub/GitLab PR URL
- **links.ticket** (string): Jira/Linear ticket ID

### Status Values

| Status | Value | Description |
|--------|-------|-------------|
| Start | `1` | Event started |
| Success | `3` | Completed successfully |
| Failure | `4` | Failed |
| Warning | `5` | Completed with warnings |
| Error | `6` | Error occurred |
| Open | `7` | Issue opened |
| Close | `8` | Issue closed |
| Done | `9` | Task completed |

### Environment Values

| Environment | Value |
|-------------|-------|
| Development | `1` |
| Integration | `2` |
| TNR | `3` |
| UAT | `4` |
| Recette | `5` |
| Pre-production | `6` |
| Production | `7` |
| MCO | `8` |

## REST API

### Create Event

```bash
POST /api/v1alpha1/event
```

**Example:**
```bash
curl -X POST http://localhost:8080/api/v1alpha1/event \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Deploy user-service v2.1.0 to production",
    "attributes": {
      "message": "Deployed via GitHub Actions",
      "type": 1,
      "priority": 2,
      "service": "user-service",
      "status": 3,
      "environment": 7,
      "owner": "platform-team"
    },
    "links": {
      "pullRequestLink": "https://github.com/org/repo/pull/123",
      "ticket": "PROJ-456"
    }
  }'
```

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "title": "Deploy user-service v2.1.0 to production",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### Update Event

```bash
PUT /api/v1alpha1/event
```

**Example:**
```bash
curl -X PUT http://localhost:8080/api/v1alpha1/event \
  -H "Content-Type: application/json" \
  -d '{
    "id": "507f1f77bcf86cd799439011",
    "title": "Deploy user-service v2.1.0 to production",
    "attributes": {
      "status": 3,
      "endDate": "2024-01-15T10:05:00Z"
    }
  }'
```

### Get Event by ID

```bash
GET /api/v1alpha1/event/{id}
```

**Example:**
```bash
curl http://localhost:8080/api/v1alpha1/event/507f1f77bcf86cd799439011
```

### Delete Event

```bash
DELETE /api/v1alpha1/event/{id}
```

**Example:**
```bash
curl -X DELETE http://localhost:8080/api/v1alpha1/event/507f1f77bcf86cd799439011
```

### List Events

```bash
GET /api/v1alpha1/events/list?per_page=10&page=1
```

**Example:**
```bash
# Get first 10 events
curl "http://localhost:8080/api/v1alpha1/events/list?per_page=10&page=1"

# Get next 10 events
curl "http://localhost:8080/api/v1alpha1/events/list?per_page=10&page=2"
```

### Search Events

```bash
GET /api/v1alpha1/events/search?priority=1&service=user-service&start_date=2024-01-01
```

**Query Parameters:**
- `priority` (int): Filter by priority (1-5)
- `service` (string): Filter by service name
- `type` (int): Filter by event type (1-5)
- `environment` (int): Filter by environment (1-8)
- `status` (int): Filter by status
- `start_date` (string): Filter events after this date (ISO 8601)
- `end_date` (string): Filter events before this date (ISO 8601)

**Examples:**
```bash
# Find all P1 incidents
curl "http://localhost:8080/api/v1alpha1/events/search?priority=1&type=4"

# Find production deployments
curl "http://localhost:8080/api/v1alpha1/events/search?type=1&environment=7"

# Find events for a specific service
curl "http://localhost:8080/api/v1alpha1/events/search?service=user-service"

# Find events in date range
curl "http://localhost:8080/api/v1alpha1/events/search?start_date=2024-01-01&end_date=2024-01-31"
```

### Today's Events

```bash
GET /api/v1alpha1/events/today?per_page=10&page=1
```

**Example:**
```bash
curl "http://localhost:8080/api/v1alpha1/events/today"
```

## gRPC API

### Create Event

```bash
grpcurl --plaintext -d '{
  "title": "Deploy user-service v2.1.0",
  "attributes": {
    "message": "Deployed via GitHub Actions",
    "type": "1",
    "priority": "2",
    "service": "user-service",
    "status": "3",
    "environment": "7",
    "start_date": "2024-01-15T10:00:00Z",
    "end_date": "2024-01-15T10:05:00Z"
  },
  "links": {
    "pull_request_link": "https://github.com/org/repo/pull/123"
  }
}' localhost:8765 tracker.event.v1alpha1.EventService/CreateEvent
```

### List Events

```bash
grpcurl --plaintext localhost:8765 tracker.event.v1alpha1.EventService/ListEvents
```

### Get Event

```bash
grpcurl --plaintext -d '{
  "id": "507f1f77bcf86cd799439011"
}' localhost:8765 tracker.event.v1alpha1.EventService/GetEvent
```

### Search Events

```bash
# By priority
grpcurl --plaintext -d '{
  "priority": "1"
}' localhost:8765 tracker.event.v1alpha1.EventService/SearchEvents

# By date range
grpcurl --plaintext -d '{
  "start_date": "2024-01-01",
  "end_date": "2024-01-31"
}' localhost:8765 tracker.event.v1alpha1.EventService/SearchEvents
```

## Use Cases

### 1. Track Deployments

```bash
curl -X POST http://localhost:8080/api/v1alpha1/event \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Deploy API v3.2.0 to production",
    "attributes": {
      "message": "New features: user preferences, dark mode",
      "type": 1,
      "priority": 2,
      "service": "api-service",
      "status": 3,
      "environment": 7,
      "owner": "backend-team",
      "startDate": "2024-01-15T14:00:00Z",
      "endDate": "2024-01-15T14:10:00Z"
    },
    "links": {
      "pullRequestLink": "https://github.com/org/api/pull/234",
      "ticket": "FEAT-789"
    }
  }'
```

### 2. Report Incidents

```bash
curl -X POST http://localhost:8080/api/v1alpha1/event \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Database connection pool exhausted",
    "attributes": {
      "message": "High traffic caused connection pool saturation",
      "type": 4,
      "priority": 1,
      "service": "database",
      "status": 7,
      "environment": 7,
      "impact": 3,
      "owner": "ops-team",
      "stakeHolders": ["backend-team", "frontend-team"]
    },
    "links": {
      "ticket": "INC-456"
    }
  }'
```

### 3. Track Configuration Drift

```bash
curl -X POST http://localhost:8080/api/v1alpha1/event \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Terraform drift detected in VPC configuration",
    "attributes": {
      "message": "Manual changes detected in security group rules",
      "type": 3,
      "priority": 3,
      "service": "infrastructure",
      "status": 7,
      "environment": 7,
      "owner": "platform-team"
    }
  }'
```

### 4. Monitor RPA Executions

```bash
curl -X POST http://localhost:8080/api/v1alpha1/event \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Invoice processing automation completed",
    "attributes": {
      "message": "Processed 250 invoices in 15 minutes",
      "type": 5,
      "priority": 1,
      "service": "invoice-automation",
      "status": 3,
      "startDate": "2024-01-15T09:00:00Z",
      "endDate": "2024-01-15T09:15:00Z"
    }
  }'
```

## Best Practices

### 1. Use Descriptive Titles

**Good:**
- "Deploy user-service v2.1.0 to production"
- "Database migration: add user_preferences table"
- "Incident: API gateway returning 503 errors"

**Bad:**
- "Deployment"
- "Migration"
- "Error"

### 2. Include Relevant Links

Always link to:
- Pull requests for deployments
- Tickets for incidents
- Documentation for operations

### 3. Set Appropriate Priority

- **P1 (Critical)**: Production outages, data loss
- **P2 (High)**: Major features, important fixes
- **P3 (Medium)**: Regular deployments, minor fixes
- **P4 (Low)**: Documentation, config changes
- **P5 (Trivial)**: Typo fixes, cosmetic changes

### 4. Track Event Lifecycle

Update event status as it progresses:
1. Create with `status: 1` (Start)
2. Update to `status: 3` (Success) or `status: 4` (Failure)
3. Set `endDate` when complete

### 5. Use Related Events

Link related events using `relatedId`:
```json
{
  "title": "Rollback user-service to v2.0.9",
  "attributes": {
    "relatedId": "original-deployment-id",
    "type": 1,
    "status": 1
  }
}
```

## Integration Examples

### GitHub Actions

```yaml
- name: Create Tracker Event
  run: |
    curl -X POST ${{ secrets.TRACKER_URL }}/api/v1alpha1/event \
      -H "Content-Type: application/json" \
      -d '{
        "title": "Deploy ${{ github.repository }} ${{ github.ref_name }}",
        "attributes": {
          "type": 1,
          "service": "${{ github.repository }}",
          "status": 3,
          "environment": 7,
          "owner": "${{ github.actor }}"
        },
        "links": {
          "pullRequestLink": "${{ github.event.pull_request.html_url }}"
        }
      }'
```

### Jenkins Pipeline

```groovy
post {
    success {
        sh """
            curl -X POST ${TRACKER_URL}/api/v1alpha1/event \
              -H 'Content-Type: application/json' \
              -d '{
                "title": "Deploy ${JOB_NAME} #${BUILD_NUMBER}",
                "attributes": {
                  "type": 1,
                  "service": "${JOB_NAME}",
                  "status": 3,
                  "environment": 7
                }
              }'
        """
    }
}
```

## Troubleshooting

### Event Not Appearing

1. Check event was created successfully (200 response)
2. Verify service name matches exactly
3. Check date filters in UI

### Cannot Update Event

- Ensure you're using PUT, not POST
- Include the event ID in the request body
- Verify event exists with GET request

### Search Returns No Results

- Check query parameters are correct
- Verify date format is ISO 8601
- Try searching without filters first

## Next Steps

- [Configuration Guide](./CONFIGURATION.md) - Configure Tracker
- [API Specification](./api-specification.md) - Full API reference
- [User Guide](./USER_GUIDE.md) - Web UI guide
