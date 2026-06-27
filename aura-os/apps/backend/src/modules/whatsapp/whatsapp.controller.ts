import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';

import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WhatsappBusinessService } from './services/whatsapp-business.service';
import { WhatsappWebhookService } from './services/whatsapp-webhook.service';
import { WhatsappAutomationService } from './services/whatsapp-automation.service';
import { SendMessageDto, SendTemplateMessageDto, SendBulkMessageDto } from './dto/send-message.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { WebhookEventDto } from './dto/webhook-event.dto';
import { WhatsappConversation } from './entities/whatsapp-conversation.entity';
import { WhatsappTemplate } from './entities/whatsapp-template.entity';
import { WhatsappCampaign } from './entities/whatsapp-campaign.entity';

@ApiTags('WhatsApp Business')
@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly whatsappBusinessService: WhatsappBusinessService,
    private readonly whatsappWebhookService: WhatsappWebhookService,
    private readonly whatsappAutomationService: WhatsappAutomationService,
  ) {}

  @Post('send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a WhatsApp message' })
  async sendMessage(@CurrentUser('companyId') companyId: string, @Body() dto: SendMessageDto) {
    const message = await this.whatsappBusinessService.sendMessage(dto.to, dto.message, dto.type, dto.mediaUrl);
    return { success: true, data: message };
  }

  @Post('send-template')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a WhatsApp template message' })
  async sendTemplateMessage(@CurrentUser('companyId') companyId: string, @Body() dto: SendTemplateMessageDto) {
    const message = await this.whatsappBusinessService.sendTemplateMessage(dto.to, dto.templateName, dto.variables);
    return { success: true, data: message };
  }

  @Post('send-bulk')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send bulk WhatsApp messages' })
  async sendBulkMessages(@CurrentUser('companyId') companyId: string, @Body() dto: SendBulkMessageDto) {
    const result = await this.whatsappBusinessService.sendBulkMessages(
      dto.recipients,
      dto.message,
      dto.type,
      dto.templateName,
      dto.variables,
    );
    return { success: true, data: result };
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive WhatsApp webhook events' })
  async handleWebhook(@Body() event: WebhookEventDto) {
    const entry = event?.entry?.[0];
    if (!entry) return { received: true };

    const changes = entry.changes?.[0];
    if (!changes) return { received: true };

    const value = changes.value;

    if (value?.messages && value.messages.length > 0) {
      await this.whatsappWebhookService.handleIncomingMessage(event);
    }

    if (value?.statuses && value.statuses.length > 0) {
      await this.whatsappWebhookService.handleMessageStatus(event);
    }

    return { received: true };
  }

  @Get('conversations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List WhatsApp conversations' })
  async getConversations(
    @CurrentUser('companyId') companyId: string,
    @Query('status') status?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const where: any = { companyId };
    if (status) where.status = status;

    const [data, total] = await this.whatsappBusinessService['conversationsRepository'].findAndCount({
      where,
      order: { lastMessageAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { success: true, data, total, page, limit };
  }

  @Get('conversations/:id/messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get conversation messages' })
  async getConversationMessages(@Param('id') conversationId: string) {
    const messages = await this.whatsappBusinessService.getConversationMessages(conversationId);
    return { success: true, data: messages };
  }

  @Post('templates')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a WhatsApp template' })
  async createTemplate(@CurrentUser('companyId') companyId: string, @Body() dto: CreateTemplateDto) {
    const template = this.whatsappBusinessService['templatesRepository'].create({
      companyId,
      name: dto.name,
      language: dto.language || 'fr',
      category: dto.category,
      header: dto.header,
      body: dto.body,
      footer: dto.footer,
      buttons: dto.buttons,
      variables: dto.variables,
    });
    const saved = await this.whatsappBusinessService['templatesRepository'].save(template);
    return { success: true, data: saved };
  }

  @Get('templates')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List WhatsApp templates' })
  async getTemplates(@CurrentUser('companyId') companyId: string) {
    const templates = await this.whatsappBusinessService['templatesRepository'].find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
    return { success: true, data: templates };
  }

  @Post('campaigns')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a WhatsApp campaign' })
  async createCampaign(@CurrentUser('companyId') companyId: string, @Body() dto: CreateCampaignDto) {
    const campaign = await this.whatsappAutomationService.scheduleCampaign(companyId, {
      name: dto.name,
      templateId: dto.templateId,
      templateName: dto.templateName,
      recipients: dto.recipients || [],
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      targetAudience: dto.targetAudience,
    });
    return { success: true, data: campaign };
  }

  @Get('campaigns')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List WhatsApp campaigns' })
  async getCampaigns(@CurrentUser('companyId') companyId: string) {
    const campaigns = await this.whatsappAutomationService['campaignsRepository'].find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
    return { success: true, data: campaigns };
  }

  @Post('campaigns/:id/send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Execute a WhatsApp campaign' })
  async sendCampaign(@Param('id') campaignId: string) {
    const campaign = await this.whatsappAutomationService.sendBulkCampaign(campaignId);
    return { success: true, data: campaign };
  }

  @Post('auto-reply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Configure auto-reply' })
  async setupAutoReply(
    @CurrentUser('companyId') companyId: string,
    @Body() config: { enabled: boolean; welcomeMessage?: string; awayMessage?: string; workingHours?: { start: string; end: string } },
  ) {
    await this.whatsappAutomationService.setupAutoReply(companyId, config);
    return { success: true, message: 'Auto-reply configured' };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get WhatsApp statistics' })
  async getStats(@CurrentUser('companyId') companyId: string) {
    const stats = await this.whatsappAutomationService.getStats(companyId);
    return { success: true, data: stats };
  }

  @Post('send-invoice')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send invoice via WhatsApp' })
  async sendInvoice(
    @CurrentUser('companyId') companyId: string,
    @Body() invoiceData: Record<string, any>,
  ) {
    const message = await this.whatsappAutomationService.sendInvoice(companyId, invoiceData);
    return { success: true, data: message };
  }

  @Post('send-receipt')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send receipt via WhatsApp' })
  async sendReceipt(
    @CurrentUser('companyId') companyId: string,
    @Body() receiptData: Record<string, any>,
  ) {
    const message = await this.whatsappAutomationService.sendReceipt(companyId, receiptData);
    return { success: true, data: message };
  }

  @Post('reminder')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a reminder' })
  async createReminder(
    @CurrentUser('companyId') companyId: string,
    @Body() data: { phone: string; message: string; scheduledAt: string },
  ) {
    const reminder = await this.whatsappAutomationService.createReminder(
      companyId,
      data.phone,
      data.message,
      new Date(data.scheduledAt),
    );
    return { success: true, data: reminder };
  }

  @Get('history/:phone')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get conversation history by phone' })
  async getHistory(@CurrentUser('companyId') companyId: string, @Param('phone') phone: string) {
    const history = await this.whatsappAutomationService.getConversationHistory(companyId, phone);
    return { success: true, data: history };
  }

  @Post('daily-report')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send daily report' })
  async sendDailyReport(@CurrentUser('companyId') companyId: string) {
    await this.whatsappAutomationService.sendDailyReport(companyId);
    return { success: true, message: 'Daily report sent' };
  }

  @Post('relance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger automatic follow-up for unpaid invoices' })
  async triggerRelance(@CurrentUser('companyId') companyId: string) {
    const count = await this.whatsappAutomationService.relanceAutomática(companyId);
    return { success: true, message: `${count} relances envoyées` };
  }
}
