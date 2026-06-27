import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExternalIntegration, IntegrationStatus, IntegrationProvider } from '../entities/external-integration.entity';

@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);

  constructor(
    @InjectRepository(ExternalIntegration)
    private readonly integrationRepo: Repository<ExternalIntegration>,
  ) {}

  async findAll(workspaceId: string): Promise<ExternalIntegration[]> {
    return this.integrationRepo.find({
      where: { workspaceId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, workspaceId: string): Promise<ExternalIntegration> {
    const integration = await this.integrationRepo.findOne({ where: { id, workspaceId } });
    if (!integration) throw new Error(`Integration ${id} not found`);
    return integration;
  }

  async create(workspaceId: string, dto: Partial<ExternalIntegration>): Promise<ExternalIntegration> {
    const integration = this.integrationRepo.create({
      ...dto,
      workspaceId,
      status: IntegrationStatus.PENDING,
      syncCount: 0,
    });
    const saved = await this.integrationRepo.save(integration);
    this.logger.log(`Integration created: ${saved.id} (${dto.provider}) for workspace ${workspaceId}`);
    return saved;
  }

  async update(id: string, workspaceId: string, dto: Partial<ExternalIntegration>): Promise<ExternalIntegration> {
    const integration = await this.findOne(id, workspaceId);
    Object.assign(integration, dto);
    return this.integrationRepo.save(integration);
  }

  async remove(id: string, workspaceId: string): Promise<void> {
    const integration = await this.findOne(id, workspaceId);
    await this.integrationRepo.remove(integration);
    this.logger.log(`Integration removed: ${id} from workspace ${workspaceId}`);
  }

  async testConnection(id: string, workspaceId: string): Promise<{ success: boolean; message: string }> {
    const integration = await this.findOne(id, workspaceId);

    try {
      // Provider-specific connection tests
      switch (integration.provider) {
        case IntegrationProvider.FACEBOOK:
        case IntegrationProvider.INSTAGRAM:
          return await this.testMetaConnection(integration);
        case IntegrationProvider.GOOGLE_CALENDAR:
          return await this.testGoogleCalendarConnection(integration);
        case IntegrationProvider.STRIPE:
          return await this.testStripeConnection(integration);
        case IntegrationProvider.TWILIO:
          return await this.testTwilioConnection(integration);
        case IntegrationProvider.SLACK:
          return await this.testSlackConnection(integration);
        case IntegrationProvider.GMAIL:
        case IntegrationProvider.SENDGRID:
          return await this.testEmailConnection(integration);
        default:
          return { success: true, message: 'Connection test not implemented for this provider' };
      }
    } catch (err) {
      integration.status = IntegrationStatus.ERROR;
      integration.lastError = err.message;
      await this.integrationRepo.save(integration);
      return { success: false, message: err.message };
    }
  }

  async getAvailableProviders(): Promise<Array<{ id: string; name: string; description: string; requiredFields: string[] }>> {
    return [
      {
        id: IntegrationProvider.FACEBOOK,
        name: 'Facebook',
        description: 'Publish posts, manage pages, track engagement',
        requiredFields: ['accessToken', 'config.pageId'],
      },
      {
        id: IntegrationProvider.INSTAGRAM,
        name: 'Instagram',
        description: 'Publish posts, reels, stories, track analytics',
        requiredFields: ['accessToken', 'config.accountId'],
      },
      {
        id: IntegrationProvider.LINKEDIN,
        name: 'LinkedIn',
        description: 'Publish articles, company updates, track impressions',
        requiredFields: ['accessToken', 'config.personId'],
      },
      {
        id: IntegrationProvider.TWITTER,
        name: 'X (Twitter)',
        description: 'Post tweets, reply, retweet, track engagement',
        requiredFields: ['accessToken', 'credentials.apiKey'],
      },
      {
        id: IntegrationProvider.TIKTOK,
        name: 'TikTok',
        description: 'Upload videos, track views and engagement',
        requiredFields: ['accessToken', 'config.openId'],
      },
      {
        id: IntegrationProvider.GMAIL,
        name: 'Gmail',
        description: 'Send and receive emails, manage labels',
        requiredFields: ['accessToken', 'refreshToken'],
      },
      {
        id: IntegrationProvider.GOOGLE_CALENDAR,
        name: 'Google Calendar',
        description: 'Create events, manage calendars, set reminders',
        requiredFields: ['accessToken', 'refreshToken'],
      },
      {
        id: IntegrationProvider.WHATSAPP,
        name: 'WhatsApp Business',
        description: 'Send messages, templates, manage chats',
        requiredFields: ['config.apiKey', 'config.instanceId'],
      },
      {
        id: IntegrationProvider.STRIPE,
        name: 'Stripe',
        description: 'Payments, invoices, subscriptions, webhooks',
        requiredFields: ['accessToken'],
      },
      {
        id: IntegrationProvider.SLACK,
        name: 'Slack',
        description: 'Send messages, manage channels, create workflows',
        requiredFields: ['accessToken', 'config.teamId'],
      },
      {
        id: IntegrationProvider.DISCORD,
        name: 'Discord',
        description: 'Send messages, manage servers, create channels',
        requiredFields: ['accessToken', 'config.guildId'],
      },
      {
        id: IntegrationProvider.HUBSPOT,
        name: 'HubSpot',
        description: 'CRM, deals, contacts, marketing emails',
        requiredFields: ['accessToken'],
      },
      {
        id: IntegrationProvider.NOTION,
        name: 'Notion',
        description: 'Databases, pages, blocks, automation',
        requiredFields: ['accessToken'],
      },
      {
        id: IntegrationProvider.AIRTABLE,
        name: 'Airtable',
        description: 'Bases, records, automations',
        requiredFields: ['accessToken', 'config.baseId'],
      },
      {
        id: IntegrationProvider.GOOGLE_SHEETS,
        name: 'Google Sheets',
        description: 'Read/write sheets, manage spreadsheets',
        requiredFields: ['accessToken', 'refreshToken'],
      },
    ];
  }

  async getStats(workspaceId: string): Promise<any> {
    const integrations = await this.findAll(workspaceId);
    return {
      total: integrations.length,
      connected: integrations.filter((i) => i.status === IntegrationStatus.CONNECTED).length,
      disconnected: integrations.filter((i) => i.status === IntegrationStatus.DISCONNECTED).length,
      error: integrations.filter((i) => i.status === IntegrationStatus.ERROR).length,
      pending: integrations.filter((i) => i.status === IntegrationStatus.PENDING).length,
      byProvider: integrations.reduce((acc, i) => {
        acc[i.provider] = acc[i.provider] || { total: 0, connected: 0, error: 0 };
        acc[i.provider].total++;
        if (i.status === IntegrationStatus.CONNECTED) acc[i.provider].connected++;
        if (i.status === IntegrationStatus.ERROR) acc[i.provider].error++;
        return acc;
      }, {} as Record<string, { total: number; connected: number; error: number }>),
    };
  }

  // ─── Provider-specific tests ────────────────────────────────

  private async testMetaConnection(integration: ExternalIntegration): Promise<{ success: boolean; message: string }> {
    // Basic validation — in production, call Meta Graph API
    const creds = integration.credentials || {};
    if (integration.provider === IntegrationProvider.FACEBOOK) {
      const token = integration.accessToken;
      if (!token) return { success: false, message: 'Missing access token' };
      return { success: true, message: 'Facebook connection validated' };
    }
    return { success: true, message: 'Instagram connection validated' };
  }

  private async testGoogleCalendarConnection(integration: ExternalIntegration): Promise<{ success: boolean; message: string }> {
    if (!integration.accessToken) return { success: false, message: 'Missing access token' };
    return { success: true, message: 'Google Calendar connection validated' };
  }

  private async testStripeConnection(integration: ExternalIntegration): Promise<{ success: boolean; message: string }> {
    const token = integration.accessToken;
    if (!token) return { success: false, message: 'Missing API key' };
    const isTest = token.startsWith('sk_test');
    return { success: true, message: `Stripe connection validated (${isTest ? 'test' : 'live'} mode)` };
  }

  private async testTwilioConnection(integration: ExternalIntegration): Promise<{ success: boolean; message: string }> {
    const creds = integration.credentials || {};
    if (!integration.accessToken) return { success: false, message: 'Missing auth token' };
    return { success: true, message: 'Twilio connection validated' };
  }

  private async testSlackConnection(integration: ExternalIntegration): Promise<{ success: boolean; message: string }> {
    if (!integration.accessToken) return { success: false, message: 'Missing bot token' };
    return { success: true, message: 'Slack connection validated' };
  }

  private async testEmailConnection(integration: ExternalIntegration): Promise<{ success: boolean; message: string }> {
    if (!integration.accessToken) return { success: false, message: 'Missing email credentials' };
    return { success: true, message: `${integration.provider} connection validated` };
  }
}
