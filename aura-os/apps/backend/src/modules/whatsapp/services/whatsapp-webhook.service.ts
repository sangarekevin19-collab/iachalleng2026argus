import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsappConversation, ConversationStatus } from '../entities/whatsapp-conversation.entity';
import { WhatsappMessage, MessageDirection, MessageType, MessageStatus } from '../entities/whatsapp-message.entity';
import { WhatsappBusinessService } from './whatsapp-business.service';
import { CrmService } from '../../crm/crm.service';

@Injectable()
export class WhatsappWebhookService {
  private readonly logger = new Logger(WhatsappWebhookService.name);

  constructor(
    @InjectRepository(WhatsappConversation)
    private conversationsRepository: Repository<WhatsappConversation>,
    @InjectRepository(WhatsappMessage)
    private messagesRepository: Repository<WhatsappMessage>,
    @Inject(forwardRef(() => WhatsappBusinessService))
    private whatsappBusinessService: WhatsappBusinessService,
    private crmService: CrmService,
  ) {}

  async handleIncomingMessage(event: any): Promise<void> {
    try {
      const entry = event?.entry?.[0];
      if (!entry) return;

      const changes = entry.changes?.[0];
      if (!changes || changes.field !== 'messages') return;

      const value = changes.value;
      const message = value?.messages?.[0];
      if (!message) return;

      const phoneNumberId = value?.metadata?.phone_number_id;
      const contact = value?.contacts?.[0];
      const from = message.from;
      const customerName = contact?.profile?.name || 'Client';
      const companyId = await this.resolveCompanyId(phoneNumberId);

      if (!companyId) {
        this.logger.warn(`No company found for phone number ID: ${phoneNumberId}`);
        return;
      }

      const conversation = await this.whatsappBusinessService.findOrCreateConversation(companyId, from);
      await this.conversationsRepository.update(conversation.id, {
        customerName,
        customerWhatsapp: from,
        unreadCount: () => 'unread_count + 1',
        status: ConversationStatus.ACTIVE,
      } as any);

      const messageType = this.mapWhatsAppTypeToMessageType(message.type);
      const content = this.extractMessageContent(message);

      const whatsappMessage = this.messagesRepository.create({
        companyId,
        conversationId: conversation.id,
        direction: MessageDirection.INBOUND,
        type: messageType,
        content,
        status: MessageStatus.DELIVERED,
        externalId: message.id,
        sentAt: new Date(parseInt(message.timestamp) * 1000),
        deliveredAt: new Date(),
      });
      await this.messagesRepository.save(whatsappMessage);

      await this.whatsappBusinessService.updateConversationLastMessage(conversation.id, content.text || message.type);

      await this.linkToCrm(companyId, from, customerName);

      await this.processAutoReply(companyId, from, conversation.id, content.text || '');

      this.logger.log(`Incoming message processed from ${from} for company ${companyId}`);
    } catch (error) {
      this.logger.error(`Error handling incoming message: ${error.message}`);
    }
  }

  async handleMessageStatus(event: any): Promise<void> {
    try {
      const entry = event?.entry?.[0];
      if (!entry) return;

      const changes = entry.changes?.[0];
      if (!changes || changes.field !== 'messages') return;

      const statuses = changes.value?.statuses;
      if (!statuses || statuses.length === 0) return;

      for (const status of statuses) {
        const externalId = status.id;
        const statusType = status.status;
        const timestamp = status.timestamp ? new Date(parseInt(status.timestamp) * 1000) : undefined;

        let messageStatus: MessageStatus;
        switch (statusType) {
          case 'delivered':
            messageStatus = MessageStatus.DELIVERED;
            break;
          case 'read':
            messageStatus = MessageStatus.READ;
            break;
          case 'failed':
            messageStatus = MessageStatus.FAILED;
            break;
          default:
            messageStatus = MessageStatus.SENT;
        }

        await this.whatsappBusinessService.updateMessageStatus(externalId, messageStatus, timestamp);
        this.logger.log(`Message ${externalId} status updated to ${messageStatus}`);
      }
    } catch (error) {
      this.logger.error(`Error handling message status: ${error.message}`);
    }
  }

  async handleOptIn(phone: string, companyId: string): Promise<void> {
    const conversation = await this.whatsappBusinessService.findOrCreateConversation(companyId, phone);
    await this.conversationsRepository.update(conversation.id, {
      status: ConversationStatus.ACTIVE,
      metadata: { ...conversation.metadata, optedIn: true, optedInAt: new Date() },
    } as any);
    this.logger.log(`Opt-in recorded for ${phone}`);
  }

  async handleOptOut(phone: string, companyId: string): Promise<void> {
    const conversation = await this.conversationsRepository.findOne({
      where: { companyId, customerPhone: phone },
    });
    if (conversation) {
      await this.conversationsRepository.update(conversation.id, {
        status: ConversationStatus.BLOCKED,
        metadata: { ...conversation.metadata, optedOut: true, optedOutAt: new Date() },
      } as any);
      this.logger.log(`Opt-out recorded for ${phone}`);
    }
  }

  private async processAutoReply(companyId: string, phone: string, conversationId: string, messageText: string): Promise<void> {
    const lowerText = messageText.toLowerCase().trim();

    const autoReplies: Record<string, string> = {
      bonjour: 'Bonjour ! Bienvenue chez AURA OS. Comment puis-je vous aider aujourd\'hui ?',
      aide: 'Voici nos services disponibles :\n\n1. Informations sur nos produits\n2. Support technique\n3. Facturation\n4. Rendez-vous\n\nTapez le numéro de votre choix.',
      prix: 'Pour connaître nos tarifs, veuillez nous contacter au +225 XX XX XX XX ou visitez notre site web.',
      merci: 'Merci pour votre message ! N\'hésitez pas si vous avez d\'autres questions.',
      horaires: 'Nous sommes ouverts du lundi au vendredi de 8h à 18h, et le samedi de 9h à 14h.',
      adresse: 'Notre adresse : [Adresse de l\'entreprise]. Nous sommes joignables au +225 XX XX XX XX.',
    };

    for (const [keyword, reply] of Object.entries(autoReplies)) {
      if (lowerText.includes(keyword)) {
        await this.whatsappBusinessService.sendMessage(phone, reply);
        this.logger.log(`Auto-reply sent to ${phone} for keyword: ${keyword}`);
        return;
      }
    }

    if (lowerText.match(/^\d+$/)) {
      const optionReplies: Record<string, string> = {
        '1': 'Voici nos produits et services :\n\n• Solution POS complète\n• Gestion d\'inventaire\n• CRM intégré\n• Rapports automatisés\n\nPlus de détails sur notre site.',
        '2': 'Notre équipe support est disponible :\n\n📞 +225 XX XX XX XX\n📧 support@aura-os.com\n\nNous répondons sous 24h.',
        '3': 'Pour toute question facturation, veuillez contacter :\n\n📞 +225 XX XX XX XX\n📧 facturation@aura-os.com',
        '4': 'Pour prendre rendez-vous, veuillez nous indiquer :\n\n• La date souhaitée\n• L\'heure préférée\n• Le motif du rendez-vous\n\nNous vous confirmerons rapidement.',
      };

      const optionReply = optionReplies[lowerText];
      if (optionReply) {
        await this.whatsappBusinessService.sendMessage(phone, optionReply);
        this.logger.log(`Auto-reply sent to ${phone} for option: ${lowerText}`);
      }
    }
  }

  private async linkToCrm(companyId: string, phone: string, customerName: string): Promise<void> {
    try {
      const existingContacts = await this.crmService.findAllContacts(companyId);
      const existingContact = existingContacts.find(
        (c) => c.phone === phone || c.whatsapp === phone,
      );

      if (!existingContact) {
        await this.crmService.createContact({
          companyId,
          name: customerName,
          phone,
          whatsapp: phone,
          source: 'whatsapp',
          metadata: { firstContactAt: new Date() },
        });
        this.logger.log(`New CRM contact created for ${phone}`);
      }
    } catch (error) {
      this.logger.error(`Failed to link WhatsApp message to CRM: ${error.message}`);
    }
  }

  private mapWhatsAppTypeToMessageType(type: string): MessageType {
    switch (type) {
      case 'image':
        return MessageType.IMAGE;
      case 'document':
        return MessageType.DOCUMENT;
      case 'interactive':
        return MessageType.INTERACTIVE;
      default:
        return MessageType.TEXT;
    }
  }

  private extractMessageContent(message: any): Record<string, any> {
    const content: Record<string, any> = {};

    if (message.text) {
      content.text = message.text.body;
    }
    if (message.image) {
      content.image = { id: message.image.id, caption: message.image.caption };
    }
    if (message.document) {
      content.document = { id: message.document.id, filename: message.document.filename, caption: message.document.caption };
    }
    if (message.interactive) {
      content.interactive = message.interactive;
    }

    return content;
  }

  private async resolveCompanyId(phoneNumberId: string): Promise<string | null> {
    return 'default-company-id';
  }
}
