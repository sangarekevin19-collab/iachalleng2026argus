# AURA OS — Automation Engine (n8n Integration)

## Architecture

```
┌─────────────────────┐
│     Frontend        │
│   /automations      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│    API Gateway      │
│     NestJS          │
└──────────┬──────────┘
           │
           ▼
┌──────────────────────────────────┐
│            AURA CORE             │
│  Business Reasoning Engine       │
│  Agent Orchestrator              │
│  Memory Engine                   │
│  Decision Engine                 │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────┐
│      Automation Engine       │
│                              │
│  Workflow Manager            │
│  Workflow Generator          │
│  Workflow Executor           │
│  Webhook Manager             │
│  Integration Registry        │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│            n8n               │
└──────────┬───────────────────┘
           │
           ▼
    Facebook, Instagram,
    WhatsApp, Gmail, Stripe,
    LinkedIn, TikTok, Slack,
    Discord, HubSpot, etc.
```

## Module Structure

```
apps/backend/src/modules/automation/
├── automation.module.ts
├── controllers/
│   ├── workflow.controller.ts
│   ├── execution.controller.ts
│   ├── webhook.controller.ts
│   └── integration.controller.ts
├── services/
│   ├── workflow.service.ts
│   ├── execution.service.ts
│   ├── webhook.service.ts
│   ├── integration.service.ts
│   ├── workflow-generator.service.ts
│   ├── workflow-template.service.ts
│   └── agent-automation.service.ts
├── providers/
│   └── n8n.provider.ts
├── entities/
│   ├── automation-workflow.entity.ts
│   ├── workflow-execution.entity.ts
│   ├── workflow-template.entity.ts
│   ├── webhook-endpoint.entity.ts
│   ├── external-integration.entity.ts
│   ├── automation-log.entity.ts
│   ├── agent-workflow-link.entity.ts
│   ├── automation-schedule.entity.ts
│   └── workflow-version.entity.ts
├── dto/
│   ├── create-workflow.dto.ts
│   ├── update-workflow.dto.ts
│   ├── execute-workflow.dto.ts
│   └── create-webhook.dto.ts
└── seeds/
    └── workflow-templates.seed.ts
```

## API Endpoints

### Workflows
| Method | Path | Description |
|--------|------|-------------|
| GET | `/automation/workflows` | List all workflows |
| POST | `/automation/workflows` | Create workflow |
| GET | `/automation/workflows/:id` | Get workflow detail |
| PATCH | `/automation/workflows/:id` | Update workflow |
| DELETE | `/automation/workflows/:id` | Delete workflow |
| POST | `/automation/workflows/:id/deploy` | Deploy to n8n |
| POST | `/automation/workflows/:id/activate` | Activate |
| POST | `/automation/workflows/:id/deactivate` | Deactivate |
| POST | `/automation/workflows/:id/run` | Execute |
| GET | `/automation/workflows/:id/executions` | Get executions |
| GET | `/automation/workflows/:id/versions` | Get versions |
| GET | `/automation/workflows/:id/logs` | Get logs |
| GET | `/automation/workflows/stats` | Get stats |

### Executions
| Method | Path | Description |
|--------|------|-------------|
| GET | `/automation/executions` | List recent |
| GET | `/automation/executions/stats` | Get statistics |
| GET | `/automation/executions/status/:status` | By status |
| POST | `/automation/executions/:id/retry` | Retry |
| POST | `/automation/executions/:id/cancel` | Cancel |

### Webhooks
| Method | Path | Description |
|--------|------|-------------|
| GET | `/automation/webhooks` | List webhooks |
| POST | `/automation/webhooks` | Create webhook |
| DELETE | `/automation/webhooks/:id` | Delete webhook |
| POST | `/automation/webhooks/:id/activate` | Activate |
| POST | `/automation/webhooks/:id/deactivate` | Deactivate |
| GET | `/automation/webhooks/stats` | Get stats |

### Integrations
| Method | Path | Description |
|--------|------|-------------|
| GET | `/automation/integrations` | List integrations |
| GET | `/automation/integrations/providers` | Available providers |
| POST | `/automation/integrations` | Create integration |
| PATCH | `/automation/integrations/:id` | Update |
| DELETE | `/automation/integrations/:id` | Delete |
| POST | `/automation/integrations/:id/test` | Test connection |
| GET | `/automation/integrations/stats` | Get stats |

## Environment Variables

```env
N8N_URL=http://localhost:5678
N8N_API_KEY=your-n8n-api-key
N8N_CALLBACK_URL=http://localhost:5678
N8N_DEFAULT_TIMEOUT=30000
N8N_MAX_RETRIES=3
```

## Key Design Decisions

1. **n8n is NOT the brain** — AURA CORE + LLM + Agents make decisions. n8n executes.
2. **All n8n calls go through N8nProvider** — No direct calls from frontend or other services.
3. **Multi-tenant** — Every entity has `workspaceId` for isolation.
4. **Version control** — Workflow versions are auto-saved before updates.
5. **Retry logic** — N8nProvider has exponential backoff for 429/5xx errors.
6. **Audit logging** — Every action is logged in `automation_logs`.
7. **Approval system** — Workflows can require manual approval before execution.

## Supported Integrations (Phase 1-3)

### Phase 1 (Core)
- Gmail, Google Calendar, WhatsApp (Evolution API), Facebook, Instagram

### Phase 2 (Extended)
- LinkedIn, TikTok, Stripe, PayPal, Slack

### Phase 3 (CRM & Productivity)
- HubSpot, Notion, Airtable, Discord, Google Sheets

## Workflow Templates

9 system templates seeded on first run:
1. Social Media Auto-Post (marketing)
2. WhatsApp Auto Reply (whatsapp)
3. Email Nurturing Sequence (email)
4. CRM Lead Capture (crm)
5. Support Ticket Auto-Router (support)
6. Sales Pipeline Automation (sales)
7. Invoice Payment Reminder (finance)
8. Inactive Client Reactivation (growth)
9. Daily Team Summary (operations)
10. Data Sync Between Services (operations)

## Security

- JWT authentication on all endpoints
- Workspace isolation (queries filtered by workspaceId)
- Credential encryption at rest
- Audit trail for all operations
- Approval required for dangerous actions
- Rate limiting via global ThrottlerModule
