# AURA OS — Deployment Guide

## Quick Start (All-in-One)

```powershell
# Start everything: App + Monitoring + n8n
.\start-aura.ps1
```

Or manually:

```powershell
# Core services
docker compose up -d

# Monitoring stack
docker compose -f docker-compose.monitoring.yml up -d
```

## Services & Ports

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | AURA OS UI |
| Backend API | http://localhost:4000 | NestJS API |
| n8n | http://localhost:5678 | Automation Engine |
| MinIO Console | http://localhost:9001 | S3 Storage |
| Prometheus | http://localhost:9090 | Metrics |
| Grafana | http://localhost:3001 | Dashboards |
| Loki | http://localhost:3100 | Logs |
| cAdvisor | http://localhost:8080 | Container metrics |
| Postgres | localhost:5432 | Database |
| Redis | localhost:6379 | Cache |
| Elasticsearch | localhost:9200 | Search |

## Default Credentials

| Service | User | Password |
|---------|------|----------|
| Grafana | admin | admin |
| n8n | admin | aura_n8n_secure_2026 |
| MinIO | auraadmin | aura_minio_2026 |
| Postgres | aura | aura_password |

## Architecture

```
                    ┌─────────────┐
                    │   Users     │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Frontend   │ :3000
                    │  Next.js    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Backend    │ :4000
                    │  NestJS     │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
   ┌──────▼──────┐  ┌─────▼──────┐  ┌──────▼──────┐
   │  n8n        │  │  Postgres  │  │  Redis      │
   │  :5678      │  │  :5432     │  │  :6379      │
   └──────┬──────┘  └────────────┘  └─────────────┘
          │
   ┌──────▼──────┐
   │  External   │
   │  Services   │
   └─────────────┘

   ┌─────────────────────────────────────────┐
   │  Monitoring Stack                        │
   │  Prometheus :9090 → Grafana :3001        │
   │  Loki :3100 → Promtail → Logs            │
   │  cAdvisor :8080 → Container metrics      │
   │  Exporters → Postgres, Redis, Node       │
   └─────────────────────────────────────────┘
```

## Grafana Dashboards

3 dashboards are auto-provisioned:

1. **AURA OS — System Overview** — Health, CPU, memory, disk, API response time, containers
2. **AURA OS — Workflow Monitoring** — Executions, success/failure rate, duration, top workflows
3. **AURA OS — AI Agents** — Active agents, tasks, token usage, API costs, response time

## Prometheus Metrics

Custom metrics exposed at `GET /health/metrics`:

| Metric | Type | Description |
|--------|------|-------------|
| `aura_http_requests_total` | Counter | Total HTTP requests |
| `aura_http_errors_total` | Counter | HTTP errors (4xx/5xx) |
| `aura_request_duration_seconds` | Histogram | Response time |
| `aura_agent_tasks_completed_total` | Counter | Agent tasks |
| `aura_agent_response_duration_seconds` | Histogram | Agent response time |
| `aura_active_agents` | Gauge | Active agents |
| `aura_workflow_executions_total` | Counter | Workflow executions |
| `aura_workflow_success_total` | Counter | Successful workflows |
| `aura_workflow_errors_total` | Counter | Failed workflows |
| `aura_workflow_duration_seconds` | Histogram | Workflow duration |
| `aura_active_workflows` | Gauge | Active workflows |
| `aura_openai_tokens_total` | Counter | OpenAI tokens |
| `aura_openai_cost_usd_total` | Counter | API cost in USD |
| `aura_openai_requests_total` | Counter | API requests |
| `aura_integration_health` | Gauge | Integration status |
| `aura_integration_sync_total` | Counter | Sync operations |

## Alerts

15 alert rules configured in `monitoring/prometheus/alerts.yml`:

- **Critical**: Backend down, n8n down, Postgres down, Redis down, high memory
- **Warning**: High CPU, high response time, high error rate, disk space, high DB connections, workflow failures

## Troubleshooting

```powershell
# Check all containers
docker compose ps
docker compose -f docker-compose.monitoring.yml ps

# View logs
docker compose logs -f backend
docker compose logs -f n8n
docker compose -f docker-compose.monitoring.yml logs -f grafana

# Restart a service
docker compose restart backend
docker compose -f docker-compose.monitoring.yml restart grafana

# Full restart
docker compose down && docker compose -f docker-compose.monitoring.yml down
.\start-aura.ps1
```
