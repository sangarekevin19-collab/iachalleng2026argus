import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WhatsappConversation, ConversationStatus } from '../entities/whatsapp-conversation.entity';
import { WhatsappMessage, MessageDirection, MessageType, MessageStatus } from '../entities/whatsapp-message.entity';
import { WhatsappTemplate, TemplateStatus } from '../entities/whatsapp-template.entity';
import { WhatsappCampaign, CampaignStatus } from '../entities/whatsapp-campaign.entity';
import { WhatsappBusinessService } from './whatsapp-business.service';
import { PosService } from '../../pos/pos.service';
import { CrmService } from '../../crm/crm.service';
import { CompaniesService } from '../../companies/companies.service';

@Injectable()
export class WhatsappAutomationService {
  private readonly logger = new Logger(WhatsappAutomationService.name);

  constructor(
    @InjectRepository(WhatsappConversation)
    private conversationsRepository: Repository<WhatsappConversation>,
    @InjectRepository(WhatsappMessage)
    private messagesRepository: Repository<WhatsappMessage>,
    @InjectRepository(WhatsappTemplate)
    private templatesRepository: Repository<WhatsappTemplate>,
    @InjectRepository(WhatsappCampaign)
    private campaignsRepository: Repository<WhatsappCampaign>,
    private whatsappBusinessService: WhatsappBusinessService,
    private posService: PosService,
    private crmService: CrmService,
    private companiesService: CompaniesService,
  ) {}

  async setupAutoReply(companyId: string, config: { enabled: boolean; welcomeMessage?: string; awayMessage?: string; workingHours?: { start: string; end: string } }): Promise<void> {
    await this.companiesService.updateSettings(companyId, {
      whatsappAutoReply: config,
    });
    this.logger.log(`Auto-reply configured for company ${companyId}`);
  }

  async createReminder(companyId: string, phone: string, message: string, scheduledAt: Date): Promise<WhatsappMessage> {
    const conversation = await this.whatsappBusinessService.findOrCreateConversation(companyId, phone);

    const reminderMessage = this.messagesRepository.create({
      companyId,
      conversationId: conversation.id,
      direction: MessageDirection.OUTBOUND,
      type: MessageType.TEXT,
      content: { text: message, scheduledAt },
      status: MessageStatus.SENT,
      sentAt: scheduledAt,
      metadata: { isReminder: true },
    });

    const saved = await this.messagesRepository.save(reminderMessage);
    this.logger.log(`Reminder created for ${phone} at ${scheduledAt}`);
    return saved;
  }

  async sendInvoice(companyId: string, invoiceData: Record<string, any>, channel: string = 'whatsapp'): Promise<WhatsappMessage> {
    const phone = invoiceData.customerPhone || invoiceData.customerWhatsapp;
    if (!phone) {
      throw new Error('Customer phone number is required');
    }

    const items = invoiceData.items || [];
    const lines = items.map(
      (item: any) => `• ${item.name} x${item.quantity} = ${item.total} ${invoiceData.currency || 'USD'}`,
    );

    const message = `📄 *Facture - ${invoiceData.companyName || 'AURA OS'}*

N° ${invoiceData.invoiceNumber}
Date: ${invoiceData.date}
Client: ${invoiceData.customerName || 'Client'}

${lines.join('\n')}

━━━━━━━━━━━━━━━
*Total: ${invoiceData.total} ${invoiceData.currency || 'USD'}*
━━━━━━━━━━━━━━━

${invoiceData.dueDate ? `Échéance: ${invoiceData.dueDate}` : ''}

Merci de votre confiance ! 🙏`;

    const result = await this.whatsappBusinessService.sendMessage(phone, message);
    this.logger.log(`Invoice sent to ${phone} via ${channel}`);
    return result;
  }

  async sendReceipt(companyId: string, receiptData: Record<string, any>, channel: string = 'whatsapp'): Promise<WhatsappMessage> {
    const phone = receiptData.customerPhone || receiptData.customerWhatsapp;
    if (!phone) {
      throw new Error('Customer phone number is required');
    }

    const items = receiptData.items || [];
    const lines = items.map(
      (item: any) => `• ${item.name} x${item.quantity} = ${item.total} ${receiptData.currency || 'USD'}`,
    );

    const message = `🧾 *Reçu - ${receiptData.companyName || 'AURA OS'}*

N° ${receiptData.receiptNumber}
Date: ${receiptData.date}
${receiptData.customerName ? `Client: ${receiptData.customerName}` : ''}

${lines.join('\n')}

━━━━━━━━━━━━━━━
*Total: ${receiptData.total} ${receiptData.currency || 'USD'}*
━━━━━━━━━━━━━━━

Merci pour votre achat ! 🙏`;

    const result = await this.whatsappBusinessService.sendMessage(phone, message);
    this.logger.log(`Receipt sent to ${phone} via ${channel}`);
    return result;
  }

  async sendDailyReport(companyId: string): Promise<void> {
    try {
      const summary = await this.posService.getDailySummary(companyId);
      const company = await this.companiesService.findById(companyId);

      const paymentLines = summary.paymentBreakdown
        .map((p: any) => `• ${p.method}: ${p.count} - ${p.total.toFixed(2)} USD`)
        .join('\n');

      const topProductLines = summary.topProducts
        .slice(0, 3)
        .map((p: any) => `• ${p.name}: ${p.quantity} vendus - ${p.revenue.toFixed(2)} USD`)
        .join('\n');

      const message = `📊 *Rapport Journalier - ${company?.name || 'AURA OS'}*

📅 Date: ${new Date().toLocaleDateString('fr-FR')}

💰 *Résumé des ventes*
• Nombre de ventes: ${summary.totalSales}
• Revenu total: ${summary.totalRevenue.toFixed(2)} USD
• Articles vendus: ${summary.totalItems}

💳 *Paiements*
${paymentLines || 'Aucun paiement'}

🏆 *Top Produits*
${topProductLines || 'Aucune vente'}

━━━━━━━━━━━━━━━
_AURA OS - Votre partenaire de confiance_`;

      const ownerPhone = company?.ownerPhone || company?.phone;
      if (ownerPhone) {
        await this.whatsappBusinessService.sendMessage(ownerPhone, message);
        this.logger.log(`Daily report sent to company ${companyId} owner`);
      }
    } catch (error) {
      this.logger.error(`Failed to send daily report for company ${companyId}: ${error.message}`);
    }
  }

  async scheduleCampaign(companyId: string, campaignData: { name: string; templateId?: string; templateName?: string; recipients: string[]; scheduledAt?: Date; targetAudience?: Record<string, any> }): Promise<WhatsappCampaign> {
    const campaign = this.campaignsRepository.create({
      companyId,
      name: campaignData.name,
      templateId: campaignData.templateId,
      templateName: campaignData.templateName,
      recipients: campaignData.recipients,
      targetAudience: campaignData.targetAudience || {},
      scheduledAt: campaignData.scheduledAt,
      status: campaignData.scheduledAt ? CampaignStatus.SCHEDULED : CampaignStatus.DRAFT,
      stats: { total: campaignData.recipients.length, sent: 0, delivered: 0, read: 0, failed: 0, replied: 0 },
    });

    const saved = await this.campaignsRepository.save(campaign);
    this.logger.log(`Campaign "${campaignData.name}" created for company ${companyId}`);
    return saved;
  }

  async processScheduledTasks(): Promise<void> {
    const now = new Date();
    const pendingMessages = await this.messagesRepository.find({
      where: {
        sentAt: MoreThan(now),
        status: MessageStatus.SENT,
        direction: MessageDirection.OUTBOUND,
      },
    });

    for (const message of pendingMessages) {
      try {
        const content = message.content;
        if (content?.text) {
          await this.whatsappBusinessService.sendMessage(
            message.metadata?.phone || '',
            content.text,
          );
        }
      } catch (error) {
        this.logger.error(`Failed to process scheduled message ${message.id}: ${error.message}`);
      }
    }
  }

  async getConversationHistory(companyId: string, phone: string): Promise<{ conversation: WhatsappConversation; messages: WhatsappMessage[] }> {
    const conversation = await this.conversationsRepository.findOne({
      where: { companyId, customerPhone: phone },
    });

    if (!conversation) {
      throw new NotFoundException(`No conversation found for phone ${phone}`);
    }

    const messages = await this.messagesRepository.find({
      where: { conversationId: conversation.id },
      order: { createdAt: 'ASC' },
    });

    return { conversation, messages };
  }

  async relanceAutomática(companyId: string): Promise<number> {
    const creditSales = await this.posService.getCustomerBalances(companyId);
    let relanceCount = 0;

    for (const customer of creditSales) {
      if (customer.totalOwed > 0 && customer.customerPhone) {
        const daysSinceLastSale = Math.floor(
          (Date.now() - new Date(customer.lastSale).getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysSinceLastSale >= 7) {
          const message = `Bonjour ${customer.customerName},

Nous espérons que vous allez bien. Nous vous contactons concernant votre solde impayé de ${customer.totalOwed.toFixed(2)} USD.

Pour régler votre paiement ou discuter d'un échéancier, n'hésitez pas à nous contacter.

Merci de votre attention.
- L'équipe AURA OS`;

          await this.whatsappBusinessService.sendMessage(customer.customerPhone, message);
          relanceCount++;
        }
      }
    }

    this.logger.log(`Relance automatique: ${relanceCount} messages envoyés pour company ${companyId}`);
    return relanceCount;
  }

  async sendBulkCampaign(campaignId: string): Promise<WhatsappCampaign> {
    const campaign = await this.campaignsRepository.findOne({ where: { id: campaignId } });
    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    await this.campaignsRepository.update(campaignId, { status: CampaignStatus.SENDING, sentAt: new Date() });

    try {
      const template = campaign.templateId
        ? await this.templatesRepository.findOne({ where: { id: campaign.templateId } })
        : null;

      const result = await this.whatsappBusinessService.sendBulkMessages(
        campaign.recipients,
        template?.body || 'Message de campagne',
        template ? undefined : undefined,
        template?.name,
        {},
      );

      await this.campaignsRepository.update(campaignId, {
        status: CampaignStatus.COMPLETED,
        completedAt: new Date(),
        stats: {
          total: campaign.recipients.length,
          sent: result.success,
          delivered: result.success,
          read: 0,
          failed: result.failed,
          replied: 0,
        },
      });

      this.logger.log(`Campaign ${campaignId} completed: ${result.success} sent, ${result.failed} failed`);
    } catch (error) {
      await this.campaignsRepository.update(campaignId, {
        status: CampaignStatus.FAILED,
      });
      this.logger.error(`Campaign ${campaignId} failed: ${error.message}`);
    }

    return this.campaignsRepository.findOne({ where: { id: campaignId } });
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleDailyReports(): Promise<void> {
    try {
      const companies = await this.companiesService.findAll();
      for (const company of companies) {
        const settings = company.settings || {};
        if (settings.whatsappDailyReport) {
          await this.sendDailyReport(company.id);
        }
      }
    } catch (error) {
      this.logger.error(`Daily report cron failed: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleScheduledCampaigns(): Promise<void> {
    try {
      const now = new Date();
      const scheduledCampaigns = await this.campaignsRepository.find({
        where: {
          status: CampaignStatus.SCHEDULED,
          scheduledAt: LessThanOrEqual(now),
        },
      });

      for (const campaign of scheduledCampaigns) {
        await this.sendBulkCampaign(campaign.id);
      }
    } catch (error) {
      this.logger.error(`Scheduled campaigns cron failed: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleRelanceAutomática(): Promise<void> {
    try {
      const companies = await this.companiesService.findAll();
      for (const company of companies) {
        const settings = company.settings || {};
        if (settings.whatsappAutoRelance) {
          await this.relanceAutomática(company.id);
        }
      }
    } catch (error) {
      this.logger.error(`Relance cron failed: ${error.message}`);
    }
  }

  async getStats(companyId: string): Promise<{
    totalConversations: number;
    activeConversations: number;
    totalMessages: number;
    inboundMessages: number;
    outboundMessages: number;
    totalTemplates: number;
    approvedTemplates: number;
    totalCampaigns: number;
    completedCampaigns: number;
  }> {
    const totalConversations = await this.conversationsRepository.count({ where: { companyId } });
    const activeConversations = await this.conversationsRepository.count({
      where: { companyId, status: ConversationStatus.ACTIVE },
    });
    const totalMessages = await this.messagesRepository.count({ where: { companyId } });
    const inboundMessages = await this.messagesRepository.count({
      where: { companyId, direction: MessageDirection.INBOUND },
    });
    const outboundMessages = await this.messagesRepository.count({
      where: { companyId, direction: MessageDirection.OUTBOUND },
    });
    const totalTemplates = await this.templatesRepository.count({ where: { companyId } });
    const approvedTemplates = await this.templatesRepository.count({
      where: { companyId, status: TemplateStatus.APPROVED },
    });
    const totalCampaigns = await this.campaignsRepository.count({ where: { companyId } });
    const completedCampaigns = await this.campaignsRepository.count({
      where: { companyId, status: CampaignStatus.COMPLETED },
    });

    return {
      totalConversations,
      activeConversations,
      totalMessages,
      inboundMessages,
      outboundMessages,
      totalTemplates,
      approvedTemplates,
      totalCampaigns,
      completedCampaigns,
    };
  }
}
