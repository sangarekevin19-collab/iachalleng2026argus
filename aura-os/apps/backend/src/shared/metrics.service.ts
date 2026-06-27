import { Injectable, OnModuleInit } from '@nestjs/common';
import * as promClient from 'prom-client';

/**
 * Prometheus Metrics Service for AURA OS
 * Exposes custom metrics at /health/metrics
 *
 * Metrics tracked:
 * - HTTP requests/responses
 * - Agent activity (tasks, response time)
 * - Workflow executions (count, duration, success/failure)
 * - OpenAI API usage (tokens, costs)
 * - External integration health
 */
@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry: promClient.Registry;

  // ─── HTTP Metrics ──────────────────────────────────────────
  private httpRequestsTotal: promClient.Counter;
  private httpErrorsTotal: promClient.Counter;
  private httpRequestDuration: promClient.Histogram;

  // ─── Agent Metrics ─────────────────────────────────────────
  private agentTasksCompleted: promClient.Counter;
  private agentResponseDuration: promClient.Histogram;
  private activeAgents: promClient.Gauge;

  // ─── Workflow Metrics ──────────────────────────────────────
  private workflowExecutionsTotal: promClient.Counter;
  private workflowSuccessTotal: promClient.Counter;
  private workflowErrorsTotal: promClient.Counter;
  private workflowDuration: promClient.Histogram;
  private activeWorkflows: promClient.Gauge;

  // ─── OpenAI / LLM Metrics ──────────────────────────────────
  private openaiTokensTotal: promClient.Counter;
  private openaiCostUsd: promClient.Counter;
  private openaiRequestsTotal: promClient.Counter;
  private openaiRequestDuration: promClient.Histogram;

  // ─── Integration Metrics ───────────────────────────────────
  private integrationHealth: promClient.Gauge;
  private integrationSyncTotal: promClient.Counter;
  private integrationErrorsTotal: promClient.Counter;

  constructor() {
    this.registry = new promClient.Registry();
    this.registry.setDefaultLabels({
      app: 'aura-os',
      environment: process.env.NODE_ENV || 'development',
    });
    promClient.collectDefaultMetrics({ register: this.registry });
  }

  onModuleInit(): void {
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    // ─── HTTP ────────────────────────────────────────────────
    this.httpRequestsTotal = new promClient.Counter({
      name: 'aura_http_requests_total',
      help: 'Total HTTP requests received',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    });

    this.httpErrorsTotal = new promClient.Counter({
      name: 'aura_http_errors_total',
      help: 'Total HTTP errors (4xx, 5xx)',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new promClient.Histogram({
      name: 'aura_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });

    // ─── Agents ──────────────────────────────────────────────
    this.agentTasksCompleted = new promClient.Counter({
      name: 'aura_agent_tasks_completed_total',
      help: 'Total tasks completed by agents',
      labelNames: ['agent', 'type'],
      registers: [this.registry],
    });

    this.agentResponseDuration = new promClient.Histogram({
      name: 'aura_agent_response_duration_seconds',
      help: 'Agent response time in seconds',
      labelNames: ['agent'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
      registers: [this.registry],
    });

    this.activeAgents = new promClient.Gauge({
      name: 'aura_active_agents',
      help: 'Number of currently active agents',
      registers: [this.registry],
    });

    // ─── Workflows ───────────────────────────────────────────
    this.workflowExecutionsTotal = new promClient.Counter({
      name: 'aura_workflow_executions_total',
      help: 'Total workflow executions',
      labelNames: ['workflow', 'workflow_name', 'trigger_type'],
      registers: [this.registry],
    });

    this.workflowSuccessTotal = new promClient.Counter({
      name: 'aura_workflow_success_total',
      help: 'Total successful workflow executions',
      labelNames: ['workflow', 'workflow_name'],
      registers: [this.registry],
    });

    this.workflowErrorsTotal = new promClient.Counter({
      name: 'aura_workflow_errors_total',
      help: 'Total failed workflow executions',
      labelNames: ['workflow', 'workflow_name'],
      registers: [this.registry],
    });

    this.workflowDuration = new promClient.Histogram({
      name: 'aura_workflow_duration_seconds',
      help: 'Workflow execution duration in seconds',
      labelNames: ['workflow', 'workflow_name'],
      buckets: [0.5, 1, 2, 5, 10, 30, 60, 120, 300, 600],
      registers: [this.registry],
    });

    this.activeWorkflows = new promClient.Gauge({
      name: 'aura_active_workflows',
      help: 'Number of active workflows',
      registers: [this.registry],
    });

    // ─── OpenAI / LLM ────────────────────────────────────────
    this.openaiTokensTotal = new promClient.Counter({
      name: 'aura_openai_tokens_total',
      help: 'Total OpenAI tokens consumed',
      labelNames: ['agent', 'type', 'model'],
      registers: [this.registry],
    });

    this.openaiCostUsd = new promClient.Counter({
      name: 'aura_openai_cost_usd_total',
      help: 'Total OpenAI API cost in USD',
      labelNames: ['agent', 'model'],
      registers: [this.registry],
    });

    this.openaiRequestsTotal = new promClient.Counter({
      name: 'aura_openai_requests_total',
      help: 'Total OpenAI API requests',
      labelNames: ['agent', 'model', 'status'],
      registers: [this.registry],
    });

    this.openaiRequestDuration = new promClient.Histogram({
      name: 'aura_openai_request_duration_seconds',
      help: 'OpenAI API request duration',
      labelNames: ['model'],
      buckets: [0.5, 1, 2, 5, 10, 20, 30],
      registers: [this.registry],
    });

    // ─── Integrations ────────────────────────────────────────
    this.integrationHealth = new promClient.Gauge({
      name: 'aura_integration_health',
      help: 'Integration health status (1=healthy, 0=error)',
      labelNames: ['provider'],
      registers: [this.registry],
    });

    this.integrationSyncTotal = new promClient.Counter({
      name: 'aura_integration_sync_total',
      help: 'Total integration sync operations',
      labelNames: ['provider', 'status'],
      registers: [this.registry],
    });

    this.integrationErrorsTotal = new promClient.Counter({
      name: 'aura_integration_errors_total',
      help: 'Total integration errors',
      labelNames: ['provider'],
      registers: [this.registry],
    });
  }

  // ─── HTTP Methods ─────────────────────────────────────────

  recordHttpRequest(method: string, route: string, status: number, duration: number): void {
    this.httpRequestsTotal.inc({ method, route, status: String(status) });
    this.httpRequestDuration.observe({ method, route }, duration);
    if (status >= 400) {
      this.httpErrorsTotal.inc({ method, route, status: String(status) });
    }
  }

  // ─── Agent Methods ────────────────────────────────────────

  recordAgentTask(agent: string, type: string): void {
    this.agentTasksCompleted.inc({ agent, type });
  }

  recordAgentResponseTime(agent: string, duration: number): void {
    this.agentResponseDuration.observe({ agent }, duration);
  }

  setActiveAgents(count: number): void {
    this.activeAgents.set(count);
  }

  // ─── Workflow Methods ─────────────────────────────────────

  recordWorkflowExecution(workflow: string, workflowName: string, triggerType: string): void {
    this.workflowExecutionsTotal.inc({ workflow, workflow_name: workflowName, trigger_type: triggerType });
  }

  recordWorkflowSuccess(workflow: string, workflowName: string): void {
    this.workflowSuccessTotal.inc({ workflow, workflow_name: workflowName });
  }

  recordWorkflowError(workflow: string, workflowName: string, _errorMessage?: string): void {
    this.workflowErrorsTotal.inc({ workflow, workflow_name: workflowName });
  }

  recordWorkflowDuration(workflow: string, workflowName: string, duration: number): void {
    this.workflowDuration.observe({ workflow, workflow_name: workflowName }, duration);
  }

  setActiveWorkflows(count: number): void {
    this.activeWorkflows.set(count);
  }

  // ─── OpenAI Methods ───────────────────────────────────────

  recordOpenAITokens(agent: string, type: string, model: string, tokens: number): void {
    this.openaiTokensTotal.inc({ agent, type, model }, tokens);
  }

  recordOpenAICost(agent: string, model: string, costUsd: number): void {
    this.openaiCostUsd.inc({ agent, model }, costUsd);
  }

  recordOpenAIRequest(agent: string, model: string, status: string, duration: number): void {
    this.openaiRequestsTotal.inc({ agent, model, status });
    this.openaiRequestDuration.observe({ model }, duration);
  }

  // ─── Integration Methods ─────────────────────────────────

  setIntegrationHealth(provider: string, healthy: boolean): void {
    this.integrationHealth.set({ provider }, healthy ? 1 : 0);
  }

  recordIntegrationSync(provider: string, status: string): void {
    this.integrationSyncTotal.inc({ provider, status });
  }

  recordIntegrationError(provider: string): void {
    this.integrationErrorsTotal.inc({ provider });
  }

  // ─── Metrics Export ───────────────────────────────────────

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getRegistry(): promClient.Registry {
    return this.registry;
  }
}
