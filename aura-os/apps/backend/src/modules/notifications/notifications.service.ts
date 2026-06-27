import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { SmsService } from '../../shared/services/sms.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    private smsService: SmsService,
  ) {}

  async create(data: Partial<Notification>): Promise<Notification> {
    const notification = this.notificationsRepository.create(data);
    return this.notificationsRepository.save(notification);
  }

  async markRead(id: string): Promise<Notification> {
    await this.notificationsRepository.update(id, { isRead: true });
    return this.notificationsRepository.findOne({ where: { id } });
  }

  async getUnread(userId: string): Promise<Notification[]> {
    return this.notificationsRepository.find({
      where: { userId, isRead: false },
      order: { createdAt: 'DESC' },
    });
  }

  async getByUser(userId: string, page = 1, limit = 20): Promise<{ data: Notification[]; total: number }> {
    const [data, total] = await this.notificationsRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notificationsRepository.update({ userId, isRead: false }, { isRead: true });
  }

  async notifyViaWhatsApp(phone: string, message: string): Promise<void> {
    await this.smsService.sendWhatsApp(phone, message);
  }

  async sendReceiptNotification(sale: {
    customerWhatsapp?: string;
    customerPhone?: string;
    customerName?: string;
    receiptNumber: string;
    companyName: string;
    date: string;
    items: { name: string; quantity: number; total: number }[];
    total: number;
    currency: string;
  }): Promise<void> {
    if (sale.customerWhatsapp) {
      await this.smsService.sendWhatsAppReceipt(sale.customerWhatsapp, {
        companyName: sale.companyName,
        receiptNumber: sale.receiptNumber,
        date: sale.date,
        items: sale.items,
        total: sale.total,
        currency: sale.currency,
      });
    }
  }

  async sendInvoiceNotification(invoice: {
    customerWhatsapp?: string;
    customerPhone?: string;
    customerName?: string;
    invoiceNumber: string;
    companyName: string;
    date: string;
    items: { name: string; quantity: number; total: number }[];
    total: number;
    currency: string;
    dueDate?: string;
  }): Promise<void> {
    const phone = invoice.customerWhatsapp || invoice.customerPhone;
    if (!phone) return;

    const lines = invoice.items.map(
      (item: any) => `• ${item.name} x${item.quantity} = ${item.total} ${invoice.currency}`,
    );

    const message = `📄 *Facture - ${invoice.companyName}*

N° ${invoice.invoiceNumber}
Date: ${invoice.date}
Client: ${invoice.customerName || 'Client'}

${lines.join('\n')}

━━━━━━━━━━━━━━━
*Total: ${invoice.total} ${invoice.currency}*
━━━━━━━━━━━━━━━

${invoice.dueDate ? `Échéance: ${invoice.dueDate}` : ''}

Merci de votre confiance ! 🙏`;

    await this.smsService.sendWhatsApp(phone, message);
  }

  async sendLowStockAlert(product: {
    name: string;
    stock: number;
    minStock: number;
    unit: string;
  }): Promise<void> {
    const message = `⚠️ *Alerte Stock - AURA OS*

Produit: ${product.name}
Stock actuel: ${product.stock} ${product.unit}
Stock minimum: ${product.minStock} ${product.unit}

Veuillez réapprovisionner ce produit rapidement.`;

    await this.smsService.sendWhatsApp(
      this.getAdminPhone(),
      message,
    );
  }

  async sendEmployeeNotification(phone: string, message: string): Promise<void> {
    await this.smsService.sendWhatsApp(phone, `📢 *Notification Employé - AURA OS*\n\n${message}`);
  }

  private getAdminPhone(): string {
    return process.env.ADMIN_PHONE || '';
  }
}
