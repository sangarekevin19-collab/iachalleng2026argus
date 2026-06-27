import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as Twilio from 'twilio';
import { WhatsappConversation } from '../entities/whatsapp-conversation.entity';
import { WhatsappMessage, MessageDirection, MessageType, MessageStatus } from '../entities/whatsapp-message.entity';
import { SendMessageType } from '../dto/send-message.dto';

@Injectable()
export class WhatsappBusinessService {
  private client: Twilio.Twilio | null = null;
  private readonly logger = new Logger(WhatsappBusinessService.name);

  constructor(
    private configService: ConfigService,
    @InjectRepository(WhatsappConversation)
    private conversationsRepository: Repository<WhatsappConversation>,
    @InjectRepository(WhatsappMessage)
    private messagesRepository: Repository<WhatsappMessage>,
  ) {
    const accountSid = this.configService.get<string>('twilio.accountSid');
    const authToken = this.configService.get<string>('twilio.authToken');
    if (accountSid && authToken && accountSid.startsWith('AC')) {
      this.client = Twilio(accountSid, authToken);
    }
  }

  async sendMessage(to: string, message: string, type: SendMessageType = SendMessageType.TEXT, mediaUrl?: string): Promise<WhatsappMessage> {
    const companyId = this.configService.get<string>('whatsapp.companyId') || 'default';
    let externalId: string | null = null;

    try {
      if (!this.client) {
        this.logger.warn(`WhatsApp not configured. Would send to ${to}: ${message}`);
      } else {
        const fromNumber = `whatsapp:${this.configService.get<string>('twilio.whatsappNumber')}`;
        const toNumber = `whatsapp:${to}`;

        let twilioMessage;
        if (type === SendMessageType.IMAGE && mediaUrl) {
          twilioMessage = await this.client.messages.create({
            body: message,
            from: fromNumber,
            to: toNumber,
            mediaUrl: [mediaUrl],
          });
        } else if (type === SendMessageType.DOCUMENT && mediaUrl) {
          twilioMessage = await this.client.messages.create({
            body: message,
            from: fromNumber,
            to: toNumber,
            mediaUrl: [mediaUrl],
          });
        } else {
          twilioMessage = await this.client.messages.create({
            body: message,
            from: fromNumber,
            to: toNumber,
          });
        }
        externalId = twilioMessage.sid;
        this.logger.log(`WhatsApp message sent to ${to}, SID: ${externalId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp message to ${to}: ${error.message}`);
    }

    const conversation = await this.findOrCreateConversation(companyId, to);

    const whatsappMessage = this.messagesRepository.create({
      companyId,
      conversationId: conversation.id,
      direction: MessageDirection.OUTBOUND,
      type: this.mapSendTypeToMessageType(type),
      content: { text: message, mediaUrl },
      status: externalId ? MessageStatus.SENT : MessageStatus.FAILED,
      externalId,
      sentAt: new Date(),
    });

    return this.messagesRepository.save(whatsappMessage);
  }

  async sendTemplateMessage(to: string, templateName: string, variables: Record<string, any> = {}): Promise<WhatsappMessage> {
    const companyId = this.configService.get<string>('whatsapp.companyId') || 'default';
    let externalId: string | null = null;

    try {
      if (!this.client) {
        this.logger.warn(`WhatsApp not configured. Would send template ${templateName} to ${to}`);
      } else {
        const fromNumber = `whatsapp:${this.configService.get<string>('twilio.whatsappNumber')}`;
        const toNumber = `whatsapp:${to}`;

        const twilioMessage = await this.client.messages.create({
          from: fromNumber,
          to: toNumber,
          contentSid: templateName,
          contentVariables: JSON.stringify(variables),
        });
        externalId = twilioMessage.sid;
        this.logger.log(`WhatsApp template ${templateName} sent to ${to}, SID: ${externalId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp template to ${to}: ${error.message}`);
    }

    const conversation = await this.findOrCreateConversation(companyId, to);

    const whatsappMessage = this.messagesRepository.create({
      companyId,
      conversationId: conversation.id,
      direction: MessageDirection.OUTBOUND,
      type: MessageType.TEMPLATE,
      content: { templateName, variables },
      status: externalId ? MessageStatus.SENT : MessageStatus.FAILED,
      externalId,
      sentAt: new Date(),
    });

    return this.messagesRepository.save(whatsappMessage);
  }

  async sendBulkMessages(recipients: string[], message: string, type: SendMessageType = SendMessageType.TEXT, templateName?: string, variables?: Record<string, any>): Promise<{ success: number; failed: number; results: WhatsappMessage[] }> {
    let success = 0;
    let failed = 0;
    const results: WhatsappMessage[] = [];

    const rateLimit = this.configService.get<number>('whatsapp.rateLimitPerSecond', 1);
    const delayMs = 1000 / rateLimit;

    for (let i = 0; i < recipients.length; i++) {
      try {
        const recipient = recipients[i];
        let result: WhatsappMessage;

        if (templateName) {
          result = await this.sendTemplateMessage(recipient, templateName, variables || {});
        } else {
          result = await this.sendMessage(recipient, message, type);
        }

        if (result.status === MessageStatus.SENT || result.status === MessageStatus.DELIVERED) {
          success++;
        } else {
          failed++;
        }
        results.push(result);

        if (i < recipients.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        this.logger.error(`Bulk send failed for recipient ${recipients[i]}: ${error.message}`);
        failed++;
      }
    }

    this.logger.log(`Bulk send completed: ${success} success, ${failed} failed out of ${recipients.length}`);
    return { success, failed, results };
  }

  async uploadMedia(file: Buffer, contentType: string): Promise<string> {
    if (!this.client) {
      this.logger.warn('WhatsApp not configured. Mock media upload.');
      return `https://mock-media-url.com/${Date.now()}`;
    }

    try {
      const media = await this.client.messages.create({
        from: `whatsapp:${this.configService.get<string>('twilio.whatsappNumber')}`,
        to: `whatsapp:${this.configService.get<string>('twilio.whatsappNumber')}`,
        mediaUrl: [],
      });
      return (media as any).media?.[0]?.url || '';
    } catch (error) {
      this.logger.error(`Failed to upload media: ${error.message}`);
      throw error;
    }
  }

  async getMessageStatus(externalId: string): Promise<{ status: string; timestamp?: string }> {
    if (!this.client) {
      this.logger.warn('WhatsApp not configured. Returning mock status.');
      return { status: 'delivered', timestamp: new Date().toISOString() };
    }

    try {
      const message = await this.client.messages(externalId).fetch();
      return {
        status: message.status,
        timestamp: message.dateUpdated?.toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to get message status for ${externalId}: ${error.message}`);
      return { status: 'unknown' };
    }
  }

  async getConversationMessages(conversationId: string): Promise<WhatsappMessage[]> {
    return this.messagesRepository.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
  }

  async updateMessageStatus(externalId: string, status: MessageStatus, timestamp?: Date): Promise<void> {
    const message = await this.messagesRepository.findOne({ where: { externalId } });
    if (!message) {
      return;
    }

    message.status = status;
    if (status === MessageStatus.DELIVERED) {
      message.deliveredAt = timestamp || new Date();
    } else if (status === MessageStatus.READ) {
      message.readAt = timestamp || new Date();
    }

    await this.messagesRepository.save(message);
  }

  async findOrCreateConversation(companyId: string, phone: string): Promise<WhatsappConversation> {
    let conversation = await this.conversationsRepository.findOne({
      where: { companyId, customerPhone: phone },
    });

    if (!conversation) {
      conversation = this.conversationsRepository.create({
        companyId,
        customerPhone: phone,
        customerWhatsapp: phone,
        unreadCount: 0,
        labels: [],
        metadata: {},
      });
      conversation = await this.conversationsRepository.save(conversation);
    }

    return conversation;
  }

  async updateConversationLastMessage(conversationId: string, message: string): Promise<void> {
    await this.conversationsRepository.update(conversationId, {
      lastMessage: message,
      lastMessageAt: new Date(),
    });
  }

  private mapSendTypeToMessageType(type: SendMessageType): MessageType {
    switch (type) {
      case SendMessageType.IMAGE:
        return MessageType.IMAGE;
      case SendMessageType.DOCUMENT:
        return MessageType.DOCUMENT;
      case SendMessageType.TEMPLATE:
        return MessageType.TEMPLATE;
      case SendMessageType.INTERACTIVE:
        return MessageType.INTERACTIVE;
      default:
        return MessageType.TEXT;
    }
  }
}
