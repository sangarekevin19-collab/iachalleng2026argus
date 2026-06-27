import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';

@Injectable()
export class N8nProvider {
  private readonly http: AxiosInstance;
  private readonly logger = new Logger(N8nProvider.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly defaultTimeout: number;
  private readonly maxRetries: number;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('n8n.url', 'http://localhost:5678');
    this.apiKey = this.configService.get<string>('n8n.apiKey', '');
    this.defaultTimeout = this.configService.get<number>('n8n.defaultTimeout', 30000);
    this.maxRetries = this.configService.get<number>('n8n.maxRetries', 3);

    this.http = axios.create({
      baseURL: `${this.baseUrl}/api/v1`,
      timeout: this.defaultTimeout,
      headers: {
        'X-N8N-API-KEY': this.apiKey,
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.http.interceptors.request.use((config) => {
      this.logger.debug(`n8n API Request: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    // Response interceptor for error handling
    this.http.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const retries = (error.config as any)?._retryCount || 0;
        if (retries < this.maxRetries && this.isRetryable(error)) {
          (error.config as any)._retryCount = retries + 1;
          const delay = Math.pow(2, retries) * 1000;
          this.logger.warn(`n8n retry ${retries + 1}/${this.maxRetries} after ${delay}ms`);
          await new Promise((r) => setTimeout(r, delay));
          return this.http.request(error.config!);
        }
        return Promise.reject(error);
      },
    );
  }

  private isRetryable(error: AxiosError): boolean {
    if (!error.response) return true;
    const status = error.response.status;
    return status === 429 || status === 502 || status === 503 || status === 504;
  }

  // ─── Workflows ──────────────────────────────────────────────

  async getWorkflows(): Promise<any[]> {
    const res = await this.http.get('/workflows');
    return res.data.data || [];
  }

  async getWorkflow(id: string): Promise<any> {
    const res = await this.http.get(`/workflows/${id}`);
    return res.data.data;
  }

  async createWorkflow(workflowData: {
    name: string;
    nodes: any[];
    connections: Record<string, any>;
    settings?: Record<string, any>;
    staticData?: Record<string, any>;
    tags?: string[];
  }): Promise<any> {
    const res = await this.http.post('/workflows', {
      name: workflowData.name,
      nodes: workflowData.nodes,
      connections: workflowData.connections,
      settings: workflowData.settings || {
        saveExecutionProgress: true,
        saveManualExecutions: true,
        saveDataErrorExecution: 'all',
        saveDataSuccessExecution: 'all',
        executionTimeout: 3600,
        timezone: 'Europe/Paris',
      },
      staticData: workflowData.staticData || {},
      tags: workflowData.tags || [],
    });
    return res.data.data;
  }

  async updateWorkflow(id: string, workflowData: Partial<{
    name: string;
    nodes: any[];
    connections: Record<string, any>;
    settings: Record<string, any>;
  }>): Promise<any> {
    const res = await this.http.patch(`/workflows/${id}`, workflowData);
    return res.data.data;
  }

  async deleteWorkflow(id: string): Promise<void> {
    await this.http.delete(`/workflows/${id}`);
  }

  async activateWorkflow(id: string): Promise<any> {
    const res = await this.http.patch(`/workflows/${id}/activate`);
    return res.data.data;
  }

  async deactivateWorkflow(id: string): Promise<any> {
    const res = await this.http.patch(`/workflows/${id}/deactivate`);
    return res.data.data;
  }

  // ─── Executions ─────────────────────────────────────────────

  async executeWorkflow(id: string, inputData?: Record<string, any>): Promise<any> {
    const res = await this.http.post(`/workflows/${id}/execute`, inputData || {});
    return res.data.data;
  }

  async getExecutions(workflowId?: string, limit = 20): Promise<any[]> {
    const params: any = { limit };
    if (workflowId) params.workflowId = workflowId;
    const res = await this.http.get('/executions', { params });
    return res.data.data || [];
  }

  async getExecution(id: string): Promise<any> {
    const res = await this.http.get(`/executions/${id}`);
    return res.data.data;
  }

  async deleteExecution(id: string): Promise<void> {
    await this.http.delete(`/executions/${id}`);
  }

  // ─── Webhooks ───────────────────────────────────────────────

  async registerWebhook(webhookConfig: {
    workflowId: string;
    method: string;
    path: string;
    responseMode?: string;
  }): Promise<string> {
    // n8n webhooks are created via workflow nodes, but we can construct the URL
    const webhookPath = webhookConfig.path.replace(/^\//, '');
    const isProd = this.configService.get<string>('nodeEnv') === 'production';
    if (isProd) {
      const callbackUrl = this.configService.get<string>('n8n.callbackUrl', '');
      return `${callbackUrl}/webhook/${webhookPath}`;
    }
    return `${this.baseUrl}/webhook/${webhookPath}`;
  }

  buildWebhookUrl(webhookPath: string): string {
    const path = webhookPath.replace(/^\//, '');
    const callbackUrl = this.configService.get<string>('n8n.callbackUrl', '');
    if (callbackUrl) {
      return `${callbackUrl}/webhook/${path}`;
    }
    return `${this.baseUrl}/webhook/${path}`;
  }

  // ─── Credentials ────────────────────────────────────────────

  async getCredentials(): Promise<any[]> {
    const res = await this.http.get('/credentials');
    return res.data.data || [];
  }

  async getCredential(id: string): Promise<any> {
    const res = await this.http.get(`/credentials/${id}`);
    return res.data.data;
  }

  // ─── Tags ───────────────────────────────────────────────────

  async getTags(): Promise<any[]> {
    const res = await this.http.get('/tags');
    return res.data.data || [];
  }

  // ─── Health Check ───────────────────────────────────────────

  async healthCheck(): Promise<{ status: string; version?: string }> {
    try {
      const res = await this.http.get('/health', { timeout: 5000 });
      return { status: 'healthy', version: res.data?.version };
    } catch {
      return { status: 'unhealthy' };
    }
  }
}
