import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Twilio from 'twilio';

@Injectable()
export class SmsService {
  private client: Twilio.Twilio | null = null;
  private readonly logger = new Logger(SmsService.name);

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('twilio.accountSid');
    const authToken = this.configService.get<string>('twilio.authToken');
    if (accountSid && authToken && accountSid.startsWith('AC')) {
      this.client = Twilio(accountSid, authToken);
    }
  }

  async sendOtp(phone: string, otp: string, firstName: string): Promise<void> {
    const message = `AURA OS - Bonjour ${firstName}, votre code de vérification est : ${otp}. Ce code expire dans 10 minutes.`;
    await this.sendSms(phone, message);
  }

  async sendSms(to: string, body: string): Promise<void> {
    try {
      if (!this.client) {
        this.logger.warn(`SMS not configured. Would send to ${to}: ${body}`);
        return;
      }
      const fromNumber = this.configService.get<string>('twilio.fromNumber');
      await this.client.messages.create({ body, from: fromNumber, to });
      this.logger.log(`SMS sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${to}: ${error.message}`);
      throw error;
    }
  }

  async sendWhatsApp(to: string, body: string): Promise<void> {
    try {
      if (!this.client) {
        this.logger.warn(`WhatsApp not configured. Would send to ${to}: ${body}`);
        return;
      }
      const fromNumber = `whatsapp:${this.configService.get<string>('twilio.whatsappNumber')}`;
      await this.client.messages.create({
        body,
        from: fromNumber,
        to: `whatsapp:${to}`,
      });
      this.logger.log(`WhatsApp sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp to ${to}: ${error.message}`);
      throw error;
    }
  }

  async sendWhatsAppReceipt(to: string, receiptData: Record<string, any>): Promise<void> {
    const lines = receiptData.items.map(
      (item: any) => `• ${item.name} x${item.quantity} = ${item.total} ${receiptData.currency}`,
    );

    const message = `🧾 *Reçu - ${receiptData.companyName}*

N° ${receiptData.receiptNumber}
Date: ${receiptData.date}

${lines.join('\n')}

━━━━━━━━━━━━━━━
*Total: ${receiptData.total} ${receiptData.currency}*
━━━━━━━━━━━━━━━

Merci pour votre achat ! 🙏`;

    await this.sendWhatsApp(to, message);
  }
}
