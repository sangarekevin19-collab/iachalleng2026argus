import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, Like, In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Sale, SaleStatus, PaymentMethod as SalePaymentMethod } from './entities/sale.entity';
import { PaymentMethod as ReceiptPaymentMethod } from './entities/receipt.entity';
import { Receipt } from './entities/receipt.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SaleFilterDto } from './dto/sale-filter.dto';
import { ReceiptGeneratorService } from './services/receipt-generator.service';
import { InventoryService } from '../inventory/inventory.service';
import { CompaniesService } from '../companies/companies.service';
import { SmsService } from '../../shared/services/sms.service';
import { EmailService } from '../../shared/services/email.service';

@Injectable()
export class PosService {
  private readonly logger = new Logger(PosService.name);

  constructor(
    @InjectRepository(Sale)
    private salesRepository: Repository<Sale>,
    @InjectRepository(Receipt)
    private receiptsRepository: Repository<Receipt>,
    private receiptGenerator: ReceiptGeneratorService,
    private inventoryService: InventoryService,
    private companiesService: CompaniesService,
    private smsService: SmsService,
    private emailService: EmailService,
  ) {}

  async createSale(companyId: string, employeeId: string, dto: CreateSaleDto): Promise<Sale> {
    const receiptNumber = `RCP-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;

    let subtotal = 0;
    const enrichedItems: Record<string, any>[] = [];

    for (const item of dto.items) {
      const product = await this.inventoryService.findById(item.productId);
      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }
      if (product.stock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${product.name}. Available: ${product.stock}`);
      }

      const itemTotal = Number(product.price) * item.quantity;
      subtotal += itemTotal;

      enrichedItems.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: Number(product.price),
        total: itemTotal,
      });

      await this.inventoryService.updateStock(product.id, item.quantity, 'out');
    }

    const discount = dto.discount || 0;
    const tax = dto.tax || 0;
    const total = subtotal + tax - discount;

    const sale = this.salesRepository.create({
      companyId,
      employeeId,
      items: enrichedItems,
      subtotal,
      tax,
      discount,
      total,
      currency: 'USD',
      paymentMethod: dto.paymentMethod,
      mobileMoneyProvider: dto.mobileMoneyProvider || null,
      status: SaleStatus.COMPLETED,
      receiptNumber,
      customerName: dto.customerName || null,
      customerPhone: dto.customerPhone || null,
      customerWhatsapp: dto.customerWhatsapp || null,
      customerId: dto.customerId || null,
      notes: dto.notes || null,
      sentVia: [],
    });

    const savedSale = await this.salesRepository.save(sale);

    const company = await this.companiesService.findById(companyId);
    const receipt = await this.generateReceiptEntity(savedSale, enrichedItems, company);
    savedSale.sentVia = [];

    if (dto.sendVia && dto.sendVia.length > 0) {
      await this.sendReceiptViaChannels(receipt, dto.sendVia, dto.customerPhone, dto.customerWhatsapp, dto.customerName);
      savedSale.sentVia = dto.sendVia;
      await this.salesRepository.save(savedSale);
    }

    this.logger.log(`Sale ${savedSale.receiptNumber} created for company ${companyId}`);
    return savedSale;
  }

  async getSales(companyId: string, filters: SaleFilterDto): Promise<{ data: Sale[]; total: number; page: number; limit: number }> {
    const where: any = { companyId };

    if (filters.startDate && filters.endDate) {
      where.createdAt = Between(new Date(filters.startDate), new Date(filters.endDate));
    } else if (filters.startDate) {
      where.createdAt = MoreThanOrEqual(new Date(filters.startDate));
    } else if (filters.endDate) {
      where.createdAt = LessThanOrEqual(new Date(filters.endDate));
    }

    if (filters.paymentMethod) {
      where.paymentMethod = filters.paymentMethod;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.receiptNumber) {
      where.receiptNumber = Like(`%${filters.receiptNumber}%`);
    }

    if (filters.customerSearch) {
      where.customerName = Like(`%${filters.customerSearch}%`);
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;

    const [data, total] = await this.salesRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async getSaleById(id: string): Promise<Sale> {
    const sale = await this.salesRepository.findOne({ where: { id } });
    if (!sale) {
      throw new NotFoundException(`Sale ${id} not found`);
    }
    return sale;
  }

  async cancelSale(id: string, reason?: string): Promise<Sale> {
    const sale = await this.getSaleById(id);

    if (sale.status === SaleStatus.CANCELLED) {
      throw new BadRequestException('Sale is already cancelled');
    }

    if (sale.status === SaleStatus.REFUNDED) {
      throw new BadRequestException('Cannot cancel a refunded sale');
    }

    for (const item of sale.items) {
      await this.inventoryService.updateStock(item.productId, item.quantity, 'in');
    }

    sale.status = SaleStatus.CANCELLED;
    sale.cancellationReason = { reason: reason || 'Cancelled by user', cancelledAt: new Date() };

    this.logger.log(`Sale ${sale.receiptNumber} cancelled`);
    return this.salesRepository.save(sale);
  }

  async refundSale(id: string, reason?: string): Promise<Sale> {
    const sale = await this.getSaleById(id);

    if (sale.status === SaleStatus.REFUNDED) {
      throw new BadRequestException('Sale is already refunded');
    }

    if (sale.status === SaleStatus.CANCELLED) {
      throw new BadRequestException('Cannot refund a cancelled sale');
    }

    for (const item of sale.items) {
      await this.inventoryService.updateStock(item.productId, item.quantity, 'in');
    }

    sale.status = SaleStatus.REFUNDED;
    sale.cancellationReason = { reason: reason || 'Refunded', refundedAt: new Date() };

    this.logger.log(`Sale ${sale.receiptNumber} refunded`);
    return this.salesRepository.save(sale);
  }

  async getDailySummary(companyId: string, date?: string): Promise<{
    totalSales: number;
    totalRevenue: number;
    totalItems: number;
    topProducts: { name: string; quantity: number; revenue: number }[];
    paymentBreakdown: { method: string; count: number; total: number }[];
  }> {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const sales = await this.salesRepository.find({
      where: {
        companyId,
        createdAt: Between(startOfDay, endOfDay),
        status: In([SaleStatus.COMPLETED, SaleStatus.PENDING]),
      },
    });

    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total), 0);
    const totalItems = sales.reduce((sum, s) => sum + s.items.reduce((is, i) => is + (i.quantity || 0), 0), 0);

    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    const paymentMap = new Map<string, { count: number; total: number }>();

    for (const sale of sales) {
      for (const item of sale.items) {
        const existing = productMap.get(item.productId) || { name: item.productName || 'Unknown', quantity: 0, revenue: 0 };
        existing.quantity += item.quantity;
        existing.revenue += Number(item.total);
        productMap.set(item.productId, existing);
      }

      const method = sale.paymentMethod;
      const existing = paymentMap.get(method) || { count: 0, total: 0 };
      existing.count += 1;
      existing.total += Number(sale.total);
      paymentMap.set(method, existing);
    }

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const paymentBreakdown = Array.from(paymentMap.entries()).map(([method, data]) => ({
      method,
      ...data,
    }));

    return { totalSales, totalRevenue, totalItems, topProducts, paymentBreakdown };
  }

  async getReceipt(receiptNumber: string): Promise<Receipt> {
    const receipt = await this.receiptsRepository.findOne({ where: { receiptNumber } });
    if (!receipt) {
      throw new NotFoundException(`Receipt ${receiptNumber} not found`);
    }
    return receipt;
  }

  async resendReceipt(receiptNumber: string, channels: string[]): Promise<Receipt> {
    const receipt = await this.getReceipt(receiptNumber);
    const sale = await this.getSaleById(receipt.saleId);

    await this.sendReceiptViaChannels(receipt, channels, sale.customerPhone, sale.customerWhatsapp, sale.customerName);

    const updatedChannels = [...new Set([...(sale.sentVia || []), ...channels])];
    sale.sentVia = updatedChannels;
    await this.salesRepository.save(sale);

    return receipt;
  }

  async generateReceiptPdf(receiptNumber: string): Promise<Buffer> {
    const receipt = await this.getReceipt(receiptNumber);
    return this.receiptGenerator.generateReceiptPdf(receipt);
  }

  async getSalesTrend(companyId: string, days: number = 30): Promise<{ date: string; totalSales: number; totalRevenue: number }[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sales = await this.salesRepository.find({
      where: {
        companyId,
        createdAt: Between(startDate, endDate),
        status: In([SaleStatus.COMPLETED, SaleStatus.PENDING]),
      },
      order: { createdAt: 'ASC' },
    });

    const dailyMap = new Map<string, { totalSales: number; totalRevenue: number }>();

    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      dailyMap.set(key, { totalSales: 0, totalRevenue: 0 });
    }

    for (const sale of sales) {
      const key = sale.createdAt.toISOString().split('T')[0];
      const existing = dailyMap.get(key) || { totalSales: 0, totalRevenue: 0 };
      existing.totalSales += 1;
      existing.totalRevenue += Number(sale.total);
      dailyMap.set(key, existing);
    }

    return Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));
  }

  async getTopProducts(companyId: string, limit: number = 10): Promise<{ productId: string; name: string; totalQuantity: number; totalRevenue: number }[]> {
    const sales = await this.salesRepository.find({
      where: {
        companyId,
        status: In([SaleStatus.COMPLETED, SaleStatus.PENDING]),
      },
    });

    const productMap = new Map<string, { productId: string; name: string; totalQuantity: number; totalRevenue: number }>();

    for (const sale of sales) {
      for (const item of sale.items) {
        const existing = productMap.get(item.productId) || {
          productId: item.productId,
          name: item.productName || 'Unknown',
          totalQuantity: 0,
          totalRevenue: 0,
        };
        existing.totalQuantity += item.quantity;
        existing.totalRevenue += Number(item.total);
        productMap.set(item.productId, existing);
      }
    }

    return Array.from(productMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit);
  }

  async getCustomerBalances(companyId: string): Promise<{ customerName: string; customerPhone: string; totalOwed: number; salesCount: number; lastSale: Date }[]> {
    const creditSales = await this.salesRepository.find({
      where: {
        companyId,
        paymentMethod: SalePaymentMethod.CREDIT,
        status: In([SaleStatus.COMPLETED, SaleStatus.PENDING]),
      },
      order: { createdAt: 'DESC' },
    });

    const customerMap = new Map<string, { customerName: string; customerPhone: string; totalOwed: number; salesCount: number; lastSale: Date }>();

    for (const sale of creditSales) {
      const key = sale.customerPhone || sale.customerName || sale.id;
      const existing = customerMap.get(key) || {
        customerName: sale.customerName || 'Client anonyme',
        customerPhone: sale.customerPhone || '',
        totalOwed: 0,
        salesCount: 0,
        lastSale: sale.createdAt,
      };
      existing.totalOwed += Number(sale.total);
      existing.salesCount += 1;
      if (sale.createdAt > existing.lastSale) {
        existing.lastSale = sale.createdAt;
      }
      customerMap.set(key, existing);
    }

    return Array.from(customerMap.values()).sort((a, b) => b.totalOwed - a.totalOwed);
  }

  async getTodaySales(companyId: string): Promise<Sale[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.salesRepository.find({
      where: {
        companyId,
        createdAt: Between(today, tomorrow),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async listSales(companyId: string, page = 1, limit = 20): Promise<{ data: Sale[]; total: number }> {
    const [data, total] = await this.salesRepository.findAndCount({
      where: { companyId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  private async generateReceiptEntity(sale: Sale, items: Record<string, any>[], company: any): Promise<Receipt> {
    const receipt = this.receiptsRepository.create({
      saleId: sale.id,
      companyId: sale.companyId,
      receiptNumber: sale.receiptNumber,
      companyName: company?.name || 'AURA OS',
      companyAddress: company?.address || null,
      companyPhone: company?.phone || null,
      companyLogo: company?.logo || null,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      items,
      subtotal: sale.subtotal,
      tax: sale.tax,
      discount: sale.discount,
      total: sale.total,
      currency: sale.currency,
      paymentMethod: this.mapPaymentMethod(sale.paymentMethod),
      mobileMoneyProvider: sale.mobileMoneyProvider,
      footer: 'Merci pour votre achat ! À bientôt 🙏',
      sentVia: [],
      generatedAt: new Date(),
    });
    return this.receiptsRepository.save(receipt);
  }

  private mapPaymentMethod(method: SalePaymentMethod): ReceiptPaymentMethod {
    const map: Record<SalePaymentMethod, ReceiptPaymentMethod> = {
      [SalePaymentMethod.CASH]: ReceiptPaymentMethod.CASH,
      [SalePaymentMethod.MOBILE_MONEY]: ReceiptPaymentMethod.MOBILE_MONEY,
      [SalePaymentMethod.CARD]: ReceiptPaymentMethod.CARD,
      [SalePaymentMethod.CREDIT]: ReceiptPaymentMethod.CREDIT,
    };
    return map[method] || ReceiptPaymentMethod.CASH;
  }

  private async sendReceiptViaChannels(
    receipt: Receipt,
    channels: string[],
    customerPhone?: string,
    customerWhatsapp?: string,
    customerName?: string,
  ): Promise<void> {
    for (const channel of channels) {
      try {
        if (channel === 'whatsapp' && customerWhatsapp) {
          await this.smsService.sendWhatsAppReceipt(customerWhatsapp, {
            companyName: receipt.companyName,
            receiptNumber: receipt.receiptNumber,
            date: receipt.generatedAt?.toLocaleDateString('fr-FR') || new Date().toLocaleDateString('fr-FR'),
            items: receipt.items,
            total: Number(receipt.total),
            currency: receipt.currency,
          });
        } else if (channel === 'sms' && customerPhone) {
          const itemCount = receipt.items?.length || 0;
          const message = `Reçu ${receipt.receiptNumber}\n${receipt.companyName}\nTotal: ${receipt.total} ${receipt.currency}\n${itemCount} article(s)\nMerci pour votre achat !`;
          await this.smsService.sendSms(customerPhone, message);
        } else if (channel === 'email' && customerPhone) {
          await this.emailService.sendReceipt(customerPhone, {
            receiptNumber: receipt.receiptNumber,
            date: receipt.generatedAt?.toLocaleDateString('fr-FR') || new Date().toLocaleDateString('fr-FR'),
            total: Number(receipt.total),
            currency: receipt.currency,
            companyName: receipt.companyName,
          });
        }
      } catch (error) {
        this.logger.error(`Failed to send receipt via ${channel}: ${error.message}`);
      }
    }
  }
}
