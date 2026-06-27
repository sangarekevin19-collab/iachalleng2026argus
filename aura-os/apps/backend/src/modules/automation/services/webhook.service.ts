import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookEndpoint, WebhookStatus } from '../entities/webhook-endpoint.entity';
import { AutomationLog, LogLevel } from '../entities/automation-log.entity';
import { N8nProvider } from '../providers/n8n.provider';
import { createHmac } from 'crypto';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectRepository(WebhookEndpoint)
    private readonly webhookRepo: Repository<WebhookEndpoint>,
    @InjectRepository(AutomationLog)
    private readonly logRepo: Repository<AutomationLog>,
    private readonly n8nProvider: N8nProvider,
  ) {}

  async findAll(workspaceId: string): Promise<WebhookEndpoint[]> {
    return this.webhookRepo.find({
      where: [{ workspaceId }],
      order: { createdAt: 'DESC' },
    });
  }

  async create(workspaceId: string, dto: Partial<WebhookEndpoint>): Promise<WebhookEndpoint> {
    const secret = createHmac('sha256', Math.random().toString(36))
      .update(dto.provider || 'default')
      .digest('hex')
      .substring(0, 32);

    const webhook = this.webhookRepo.create({
      ...dto,
      workspaceId,
      secret,
      status: WebhookStatus.ACTIVE,
      callCount: 0,
    });

    const saved = await this.webhookRepo.save(webhook);
    this.logger.log(`Webhook created: ${saved.id} for ${dto.provider} in workspace ${workspaceId}`);
    return saved;
  }

  async findOne(id: string, workspaceId: string): Promise<WebhookEndpoint> {
    const webhook = await this.webhookRepo.findOne({ where: { id, workspaceId } });
    if (!webhook) throw new Error(`Webhook ${id} not found`);
    return webhook;
  }

  async remove(id: string, workspaceId: string): Promise<void> {
    const webhook = await this.findOne(id, workspaceId);
    await this.webhookRepo.remove(webhook);
    this.logger.log(`Webhook deleted: ${id} in workspace ${workspaceId}`);
  }

  async deactivate(id: string, workspaceId: string): Promise<WebhookEndpoint> {
    const webhook = await this.findOne(id, workspaceId);
    webhook.status = WebhookStatus.INACTIVE;
    return this.webhookRepo.save(webhook);
  }

  async activate(id: string, workspaceId: string): Promise<WebhookEndpoint> {
    const webhook = await this.findOne(id, workspaceId);
    webhook.status = WebhookStatus.ACTIVE;
    return this.webhookRepo.save(webhook);
  }

  validateSignature(payload: string, signature: string, secret: string): boolean {
    if (!signature || !secret) return false;
    try {
      const expected = createHmac('sha256', secret).update(payload).digest('hex');
      return expected === signature;
    } catch {
      return false;
    }
  }

  async handleIncomingWebhook(
    provider: string,
    event: string,
    payload: Record<string, any>,
    workspaceId?: string,
  ): Promise<{ success: boolean; workflowId?: string; message: string }> {
    const webhook = await this.webhookRepo.findOne({
      where: { provider, status: WebhookStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });

    if (!webhook) {
      this.logger.warn(`No active webhook for provider: ${provider}, event: ${event}`);
      return { success: false, message: 'No matching webhook found' };
    }

    webhook.callCount++;
    webhook.lastCalledAt = new Date();
    await this.webhookRepo.save(webhook);

    await this.log(
      webhook.workflowId,
      null,
      LogLevel.INFO,
      `Webhook received: ${provider}/${event}`,
      { workspaceId, provider, event, webhookId: webhook.id },
    );

    return {
      success: true,
      workflowId: webhook.workflowId,
      message: 'Webhook processed',
    };
  }

  async getStats(workspaceId: string): Promise<any> {
    const webhooks = await this.findAll(workspaceId);
    return {
      total: webhooks.length,
      active: webhooks.filter((w) => w.status === WebhookStatus.ACTIVE).length,
      inactive: webhooks.filter((w) => w.status === WebhookStatus.INACTIVE).length,
      error: webhooks.filter((w) => w.status === WebhookStatus.ERROR).length,
      totalCalls: webhooks.reduce((sum, w) => sum + w.callCount, 0),
      providers: webhooks.reduce((acc, w) => {
        acc[w.provider] = (acc[w.provider] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  private async log(
    workflowId: string | null,
    executionId: string | null,
    level: LogLevel,
    message: string,
    payload?: Record<string, any>,
  ): Promise<void> {
    const log = this.logRepo.create({ workflowId, executionId, level, message, payload: payload || {} });
    await this.logRepo.save(log);
  }
}
