# Locks Guide

This guide covers everything you need to know about using distributed locks in Tracker.

## Overview

The Locks feature provides distributed locking capabilities to coordinate operations across services and prevent concurrent execution of critical tasks. This is essential for ensuring data consistency and avoiding race conditions in distributed systems.

## What are Distributed Locks?

Distributed locks are synchronization mechanisms that allow multiple processes or services to coordinate access to shared resources. They ensure that only one process can execute a critical section of code at a time.

### Common Use Cases

- **Deployment Coordination**: Prevent multiple simultaneous deployments
- **Database Migrations**: Ensure migrations run only once
- **Batch Processing**: Avoid duplicate job execution
- **Resource Management**: Control access to limited resources
- **Configuration Updates**: Serialize configuration changes

## Lock Structure

### Complete Schema

```json
{
  "id": "507f1f77bcf86cd799439011",
  "service": "production-deployment",
  "who": "ci-pipeline-123",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### Field Descriptions

- **id** (string, auto-generated): Unique lock identifier (UUID)
- **service** (string, required): Name of the locked resource or operation
- **who** (string, required): Identifier of the lock owner (user, service, pipeline ID)
- **createdAt** (timestamp, auto-generated): Lock creation time

## REST API

### Create Lock

Acquire a lock for a specific resource.

```bash
POST /api/v1alpha1/lock
```

**Request:**
```json
{
  "service": "production-deployment",
  "who": "ci-pipeline-123"
}
```

**Example:**
```bash
curl -X POST http://localhost:8080/api/v1alpha1/lock \
  -H "Content-Type: application/json" \
  -d '{
    "service": "production-deployment",
    "who": "ci-pipeline-123"
  }'
```

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "service": "production-deployment",
  "who": "ci-pipeline-123",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

**Error Response (Lock Already Exists):**
```json
{
  "error": "lock already exists",
  "existingLock": {
    "id": "existing-lock-id",
    "who": "other-pipeline",
    "createdAt": "2024-01-15T09:55:00Z"
  }
}
```

### Get Lock

Check if a lock exists and who owns it.

```bash
GET /api/v1alpha1/lock/{id}
```

**Example:**
```bash
curl "http://localhost:8080/api/v1alpha1/lock/507f1f77bcf86cd799439011"
```

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "service": "production-deployment",
  "who": "ci-pipeline-123",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### Release Lock

Release a lock when the operation is complete.

```bash
GET /api/v1alpha1/unlock/{id}
```

**Example:**
```bash
curl "http://localhost:8080/api/v1alpha1/unlock/507f1f77bcf86cd799439011"
```

**Response:**
```json
{
  "success": true,
  "message": "Lock released successfully"
}
```

### List All Locks

View all active locks in the system.

```bash
GET /api/v1alpha1/locks/list?per_page=10&page=1
```

**Example:**
```bash
# Get first 10 locks
curl "http://localhost:8080/api/v1alpha1/locks/list?per_page=10&page=1"

# Get all locks
curl "http://localhost:8080/api/v1alpha1/locks/list?per_page=100"
```

**Response:**
```json
{
  "locks": [
    {
      "id": "507f1f77bcf86cd799439011",
      "service": "production-deployment",
      "who": "ci-pipeline-123",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "perPage": 10
}
```

## gRPC API

### Create Lock

```bash
grpcurl --plaintext -d '{
  "service": "production-deployment",
  "who": "ci-pipeline-123"
}' localhost:8765 tracker.lock.v1alpha1.LockService/CreateLock
```

### Get Lock

```bash
grpcurl --plaintext -d '{
  "id": "507f1f77bcf86cd799439011"
}' localhost:8765 tracker.lock.v1alpha1.LockService/GetLock
```

### Release Lock

```bash
grpcurl --plaintext -d '{
  "id": "507f1f77bcf86cd799439011"
}' localhost:8765 tracker.lock.v1alpha1.LockService/UnLock
```

### List Locks

```bash
grpcurl --plaintext localhost:8765 tracker.lock.v1alpha1.LockService/ListLocks
```

## Use Cases

### 1. Prevent Concurrent Deployments

Ensure only one deployment runs at a time:

```bash
#!/bin/bash
# deploy.sh

# Try to acquire lock
LOCK_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1alpha1/lock \
  -H "Content-Type: application/json" \
  -d "{
    \"service\": \"production-deployment\",
    \"who\": \"${CI_PIPELINE_ID}\"
  }")

LOCK_ID=$(echo $LOCK_RESPONSE | jq -r '.id')

if [ "$LOCK_ID" == "null" ]; then
  echo "Deployment already in progress"
  exit 1
fi

# Perform deployment
echo "Deploying application..."
./deploy-app.sh

# Release lock
curl "http://localhost:8080/api/v1alpha1/unlock/${LOCK_ID}"
```

### 2. Database Migration Coordination

Prevent duplicate migrations:

```bash
#!/bin/bash
# migrate.sh

# Acquire migration lock
LOCK_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1alpha1/lock \
  -H "Content-Type: application/json" \
  -d '{
    "service": "database-migration",
    "who": "migration-job-'$(date +%s)'"
  }')

LOCK_ID=$(echo $LOCK_RESPONSE | jq -r '.id')

if [ "$LOCK_ID" == "null" ]; then
  echo "Migration already running"
  exit 0
fi

# Run migrations
echo "Running database migrations..."
npm run migrate

# Release lock
curl "http://localhost:8080/api/v1alpha1/unlock/${LOCK_ID}"
```

### 3. Batch Job Coordination

Ensure batch jobs don't overlap:

```bash
# Acquire lock for nightly batch job
curl -X POST http://localhost:8080/api/v1alpha1/lock \
  -H "Content-Type: application/json" \
  -d '{
    "service": "nightly-report-generation",
    "who": "cron-job-'$(hostname)'"
  }'
```

### 4. Configuration Update Serialization

Prevent concurrent configuration changes:

```bash
# Lock before updating configuration
curl -X POST http://localhost:8080/api/v1alpha1/lock \
  -H "Content-Type: application/json" \
  -d '{
    "service": "config-update-production",
    "who": "admin-'$USER'"
  }'
```

## Best Practices

### 1. Use Descriptive Service Names

**Good:**
- `production-deployment`
- `database-migration-users-table`
- `nightly-report-generation`
- `config-update-production`

**Bad:**
- `lock1`
- `deployment`
- `job`

### 2. Include Identifying Information in "who"

**Good:**
- `ci-pipeline-${PIPELINE_ID}`
- `user-${USERNAME}-${TIMESTAMP}`
- `cron-job-${HOSTNAME}`
- `migration-${VERSION}`

**Bad:**
- `user`
- `pipeline`
- `job`

### 3. Always Release Locks

Use try-finally or trap to ensure locks are released:

```bash
#!/bin/bash

# Acquire lock
LOCK_ID=$(curl -s -X POST http://localhost:8080/api/v1alpha1/lock \
  -H "Content-Type: application/json" \
  -d '{"service":"deployment","who":"pipeline"}' | jq -r '.id')

# Ensure lock is released on exit
trap "curl http://localhost:8080/api/v1alpha1/unlock/${LOCK_ID}" EXIT

# Perform work
./deploy.sh
```

### 4. Handle Lock Acquisition Failures

```bash
#!/bin/bash

acquire_lock() {
  local max_attempts=5
  local attempt=1
  
  while [ $attempt -le $max_attempts ]; do
    LOCK_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1alpha1/lock \
      -H "Content-Type: application/json" \
      -d "{\"service\":\"deployment\",\"who\":\"pipeline\"}")
    
    LOCK_ID=$(echo $LOCK_RESPONSE | jq -r '.id')
    
    if [ "$LOCK_ID" != "null" ]; then
      echo "Lock acquired: $LOCK_ID"
      return 0
    fi
    
    echo "Lock unavailable, attempt $attempt/$max_attempts"
    sleep 30
    ((attempt++))
  done
  
  echo "Failed to acquire lock after $max_attempts attempts"
  return 1
}

if acquire_lock; then
  # Perform work
  ./deploy.sh
  # Release lock
  curl "http://localhost:8080/api/v1alpha1/unlock/${LOCK_ID}"
else
  exit 1
fi
```

### 5. Set Appropriate Timeouts

Consider implementing lock timeouts in your application logic:

```bash
#!/bin/bash

LOCK_TIMEOUT=1800  # 30 minutes

# Acquire lock
LOCK_ID=$(curl -s -X POST http://localhost:8080/api/v1alpha1/lock \
  -H "Content-Type: application/json" \
  -d '{"service":"deployment","who":"pipeline"}' | jq -r '.id')

# Run with timeout
timeout $LOCK_TIMEOUT ./deploy.sh

# Release lock
curl "http://localhost:8080/api/v1alpha1/unlock/${LOCK_ID}"
```

## Integration Examples

### GitHub Actions

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Acquire Deployment Lock
        id: lock
        run: |
          RESPONSE=$(curl -s -X POST ${{ secrets.TRACKER_URL }}/api/v1alpha1/lock \
            -H "Content-Type: application/json" \
            -d '{
              "service": "production-deployment",
              "who": "github-actions-${{ github.run_id }}"
            }')
          
          LOCK_ID=$(echo $RESPONSE | jq -r '.id')
          
          if [ "$LOCK_ID" == "null" ]; then
            echo "Deployment already in progress"
            exit 1
          fi
          
          echo "lock_id=$LOCK_ID" >> $GITHUB_OUTPUT

      - name: Deploy Application
        run: ./deploy.sh

      - name: Release Lock
        if: always()
        run: |
          curl "${{ secrets.TRACKER_URL }}/api/v1alpha1/unlock/${{ steps.lock.outputs.lock_id }}"
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any
    
    environment {
        TRACKER_URL = credentials('tracker-url')
        LOCK_ID = ''
    }
    
    stages {
        stage('Acquire Lock') {
            steps {
                script {
                    def response = sh(
                        script: """
                            curl -s -X POST ${TRACKER_URL}/api/v1alpha1/lock \
                              -H 'Content-Type: application/json' \
                              -d '{
                                "service": "production-deployment",
                                "who": "jenkins-${BUILD_NUMBER}"
                              }'
                        """,
                        returnStdout: true
                    ).trim()
                    
                    def json = readJSON text: response
                    LOCK_ID = json.id
                    
                    if (LOCK_ID == null) {
                        error('Failed to acquire deployment lock')
                    }
                }
            }
        }
        
        stage('Deploy') {
            steps {
                sh './deploy.sh'
            }
        }
    }
    
    post {
        always {
            script {
                if (LOCK_ID) {
                    sh "curl ${TRACKER_URL}/api/v1alpha1/unlock/${LOCK_ID}"
                }
            }
        }
    }
}
```

### Kubernetes CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-report
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: report-generator
            image: report-generator:latest
            env:
            - name: TRACKER_URL
              value: "http://tracker:8080"
            command:
            - /bin/bash
            - -c
            - |
              # Acquire lock
              LOCK_ID=$(curl -s -X POST ${TRACKER_URL}/api/v1alpha1/lock \
                -H "Content-Type: application/json" \
                -d "{\"service\":\"nightly-report\",\"who\":\"cronjob-${HOSTNAME}\"}" | jq -r '.id')
              
              if [ "$LOCK_ID" == "null" ]; then
                echo "Report generation already running"
                exit 0
              fi
              
              # Generate report
              /app/generate-report.sh
              
              # Release lock
              curl "${TRACKER_URL}/api/v1alpha1/unlock/${LOCK_ID}"
          restartPolicy: OnFailure
```

## Monitoring Locks

### Check Active Locks

```bash
# List all active locks
curl "http://localhost:8080/api/v1alpha1/locks/list" | jq '.locks'

# Find locks older than 1 hour
curl "http://localhost:8080/api/v1alpha1/locks/list" | \
  jq '.locks[] | select(.createdAt < (now - 3600 | todate))'
```

### Cleanup Stale Locks

If a process crashes without releasing a lock, you may need to manually clean it up:

```bash
# Get lock ID
LOCK_ID="507f1f77bcf86cd799439011"

# Force release
curl "http://localhost:8080/api/v1alpha1/unlock/${LOCK_ID}"
```

## Troubleshooting

### Lock Already Exists

**Problem:** Cannot acquire lock because it's already held.

**Solutions:**
1. Wait for the current operation to complete
2. Check if the lock owner is still active
3. If the owner crashed, manually release the lock
4. Implement retry logic with exponential backoff

### Lock Not Released

**Problem:** Lock remains after operation completes.

**Solutions:**
1. Ensure your script has proper error handling
2. Use `trap` or `try-finally` to guarantee cleanup
3. Implement lock timeouts
4. Monitor for stale locks

### Cannot Release Lock

**Problem:** Lock release fails.

**Solutions:**
1. Verify lock ID is correct
2. Check if lock still exists
3. Ensure you have permission to release the lock

## Limitations

- Locks do not have automatic expiration (TTL) - you must release them
- No lock renewal mechanism - long-running operations need careful handling
- No lock queuing - failed acquisitions must retry
- No distributed consensus - relies on database atomicity

## Next Steps

- [Events Guide](./EVENTS.md) - Track operations that use locks
- [Configuration Guide](./CONFIGURATION.md) - Configure Tracker
- [API Specification](./api-specification.md) - Full API reference
