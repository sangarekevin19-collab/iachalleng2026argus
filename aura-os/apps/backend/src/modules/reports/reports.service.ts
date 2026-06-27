import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Report, ReportType, ReportFormat, ReportStatus } from './entities/report.entity';
import { PosService } from '../pos/pos.service';
import { FinanceService } from '../finance/finance.service';
import { InventoryService } from '../inventory/inventory.service';
import { CrmService } from '../crm/crm.service';
import { EmployeesService } from '../employees/employees.service';
import { ReportFilterDto } from './dto/report-filter.dto';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(Report)
    private reportsRepository: Repository<Report>,
    private posService: PosService,
    private financeService: FinanceService,
    private inventoryService: InventoryService,
    private crmService: CrmService,
    private employeesService: EmployeesService,
  ) {}

  async generateDailyReport(companyId: string, date?: string): Promise<Report> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    this.logger.log(`Generating daily report for company ${companyId} on ${targetDate}`);

    const report = this.reportsRepository.create({
      companyId,
      type: ReportType.DAILY,
      title: `Rapport journalier - ${targetDate}`,
      format: ReportFormat.HTML,
      status: ReportStatus.GENERATING,
      period: { startDate: targetDate, endDate: targetDate },
      sentVia: [],
    });
    const savedReport = await this.reportsRepository.save(report);

    try {
      const dayStart = new Date(targetDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setHours(23, 59, 59, 999);

      const [salesData, financialData, inventoryData, customerData, employeeData, yesterdayComparison, lastWeekComparison] = await Promise.all([
        this.compileSalesData(companyId, dayStart, dayEnd),
        this.compileFinancialData(companyId, dayStart, dayEnd),
        this.compileInventoryData(companyId),
        this.compileCustomerData(companyId, dayStart, dayEnd),
        this.compileEmployeeData(companyId, dayStart, dayEnd),
        this.getYesterdayComparison(companyId, targetDate),
        this.getLastWeekComparison(companyId, targetDate),
      ]);

      const aiInsights = this.generateAIInsights({
        sales: salesData,
        financial: financialData,
        customers: customerData,
        inventory: inventoryData,
      });

      const avgBasket = salesData.totalSales > 0 ? salesData.totalRevenue / salesData.totalSales : 0;

      savedReport.content = {
        summary: {
          totalSales: salesData.totalSales,
          totalRevenue: salesData.totalRevenue,
          totalItems: salesData.totalItems,
          avgBasket: avgBasket,
          revenue: salesData.totalRevenue,
        },
        sales: salesData,
        financial: financialData,
        inventory: inventoryData,
        customers: customerData,
        employees: employeeData,
        aiInsights,
        comparison: {
          vsYesterday: yesterdayComparison,
          vsLastWeek: lastWeekComparison,
        },
        healthScore: this.calculateHealthScore(salesData, financialData, inventoryData, customerData),
      };
      savedReport.status = ReportStatus.COMPLETED;
      savedReport.generatedAt = new Date();

      return this.reportsRepository.save(savedReport);
    } catch (error) {
      this.logger.error(`Failed to generate daily report: ${error.message}`);
      savedReport.status = ReportStatus.FAILED;
      savedReport.content = { error: error.message };
      await this.reportsRepository.save(savedReport);
      throw error;
    }
  }

  async generateWeeklyReport(companyId: string, date?: string): Promise<Report> {
    const targetDate = date ? new Date(date) : new Date();
    const weekStart = new Date(targetDate);
    weekStart.setDate(targetDate.getDate() - targetDate.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const startStr = weekStart.toISOString().split('T')[0];
    const endStr = weekEnd.toISOString().split('T')[0];

    const report = this.reportsRepository.create({
      companyId,
      type: ReportType.WEEKLY,
      title: `Rapport hebdomadaire - Semaine du ${startStr}`,
      format: ReportFormat.HTML,
      status: ReportStatus.GENERATING,
      period: { startDate: startStr, endDate: endStr },
      sentVia: [],
    });
    const savedReport = await this.reportsRepository.save(report);

    try {
      const [salesData, financialData, inventoryData, customerData, employeeData] = await Promise.all([
        this.compileSalesData(companyId, weekStart, weekEnd),
        this.compileFinancialData(companyId, weekStart, weekEnd),
        this.compileInventoryData(companyId),
        this.compileCustomerData(companyId, weekStart, weekEnd),
        this.compileEmployeeData(companyId, weekStart, weekEnd),
      ]);

      const aiInsights = this.generateAIInsights({
        sales: salesData,
        financial: financialData,
        customers: customerData,
        inventory: inventoryData,
      });

      const avgBasket = salesData.totalSales > 0 ? salesData.totalRevenue / salesData.totalSales : 0;

      savedReport.content = {
        summary: {
          totalSales: salesData.totalSales,
          totalRevenue: salesData.totalRevenue,
          totalItems: salesData.totalItems,
          avgBasket: avgBasket,
          revenue: salesData.totalRevenue,
        },
        sales: salesData,
        financial: financialData,
        inventory: inventoryData,
        customers: customerData,
        employees: employeeData,
        aiInsights,
        healthScore: this.calculateHealthScore(salesData, financialData, inventoryData, customerData),
      };
      savedReport.status = ReportStatus.COMPLETED;
      savedReport.generatedAt = new Date();

      return this.reportsRepository.save(savedReport);
    } catch (error) {
      this.logger.error(`Failed to generate weekly report: ${error.message}`);
      savedReport.status = ReportStatus.FAILED;
      savedReport.content = { error: error.message };
      await this.reportsRepository.save(savedReport);
      throw error;
    }
  }

  async generateMonthlyReport(companyId: string, date?: string): Promise<Report> {
    const targetDate = date ? new Date(date) : new Date();
    const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const monthLabel = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;

    const report = this.reportsRepository.create({
      companyId,
      type: ReportType.MONTHLY,
      title: `Rapport mensuel - ${monthLabel}`,
      format: ReportFormat.HTML,
      status: ReportStatus.GENERATING,
      period: { startDate: monthStart.toISOString().split('T')[0], endDate: monthEnd.toISOString().split('T')[0] },
      sentVia: [],
    });
    const savedReport = await this.reportsRepository.save(report);

    try {
      const [salesData, financialData, inventoryData, customerData, employeeData] = await Promise.all([
        this.compileSalesData(companyId, monthStart, monthEnd),
        this.compileFinancialData(companyId, monthStart, monthEnd),
        this.compileInventoryData(companyId),
        this.compileCustomerData(companyId, monthStart, monthEnd),
        this.compileEmployeeData(companyId, monthStart, monthEnd),
      ]);

      const aiInsights = this.generateAIInsights({
        sales: salesData,
        financial: financialData,
        customers: customerData,
        inventory: inventoryData,
      });

      const avgBasket = salesData.totalSales > 0 ? salesData.totalRevenue / salesData.totalSales : 0;

      savedReport.content = {
        summary: {
          totalSales: salesData.totalSales,
          totalRevenue: salesData.totalRevenue,
          totalItems: salesData.totalItems,
          avgBasket: avgBasket,
          revenue: salesData.totalRevenue,
        },
        sales: salesData,
        financial: financialData,
        inventory: inventoryData,
        customers: customerData,
        employees: employeeData,
        aiInsights,
        healthScore: this.calculateHealthScore(salesData, financialData, inventoryData, customerData),
      };
      savedReport.status = ReportStatus.COMPLETED;
      savedReport.generatedAt = new Date();

      return this.reportsRepository.save(savedReport);
    } catch (error) {
      this.logger.error(`Failed to generate monthly report: ${error.message}`);
      savedReport.status = ReportStatus.FAILED;
      savedReport.content = { error: error.message };
      await this.reportsRepository.save(savedReport);
      throw error;
    }
  }

  async generateCustomReport(companyId: string, startDate: string, endDate: string): Promise<Report> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const report = this.reportsRepository.create({
      companyId,
      type: ReportType.CUSTOM,
      title: `Rapport personnalisé - ${startDate} au ${endDate}`,
      format: ReportFormat.HTML,
      status: ReportStatus.GENERATING,
      period: { startDate, endDate },
      sentVia: [],
    });
    const savedReport = await this.reportsRepository.save(report);

    try {
      const [salesData, financialData, inventoryData, customerData, employeeData] = await Promise.all([
        this.compileSalesData(companyId, start, end),
        this.compileFinancialData(companyId, start, end),
        this.compileInventoryData(companyId),
        this.compileCustomerData(companyId, start, end),
        this.compileEmployeeData(companyId, start, end),
      ]);

      const aiInsights = this.generateAIInsights({
        sales: salesData,
        financial: financialData,
        customers: customerData,
        inventory: inventoryData,
      });

      const avgBasket = salesData.totalSales > 0 ? salesData.totalRevenue / salesData.totalSales : 0;

      savedReport.content = {
        summary: {
          totalSales: salesData.totalSales,
          totalRevenue: salesData.totalRevenue,
          totalItems: salesData.totalItems,
          avgBasket: avgBasket,
          revenue: salesData.totalRevenue,
        },
        sales: salesData,
        financial: financialData,
        inventory: inventoryData,
        customers: customerData,
        employees: employeeData,
        aiInsights,
        healthScore: this.calculateHealthScore(salesData, financialData, inventoryData, customerData),
      };
      savedReport.status = ReportStatus.COMPLETED;
      savedReport.generatedAt = new Date();

      return this.reportsRepository.save(savedReport);
    } catch (error) {
      this.logger.error(`Failed to generate custom report: ${error.message}`);
      savedReport.status = ReportStatus.FAILED;
      savedReport.content = { error: error.message };
      await this.reportsRepository.save(savedReport);
      throw error;
    }
  }

  async getReports(companyId: string, filters: ReportFilterDto): Promise<{ data: Report[]; total: number }> {
    const where: any = { companyId };

    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.startDate && filters.endDate) {
      where.createdAt = Between(new Date(filters.startDate), new Date(filters.endDate));
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;

    const [data, total] = await this.reportsRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async getReportById(id: string): Promise<Report> {
    const report = await this.reportsRepository.findOne({ where: { id } });
    if (!report) {
      throw new NotFoundException(`Report ${id} not found`);
    }
    return report;
  }

  async regenerateReport(id: string): Promise<Report> {
    const existing = await this.getReportById(id);
    const period = existing.period || {};

    switch (existing.type) {
      case ReportType.DAILY:
        return this.generateDailyReport(existing.companyId, period.startDate);
      case ReportType.WEEKLY:
        return this.generateWeeklyReport(existing.companyId, period.startDate);
      case ReportType.MONTHLY:
        return this.generateMonthlyReport(existing.companyId, period.startDate);
      case ReportType.CUSTOM:
        return this.generateCustomReport(existing.companyId, period.startDate, period.endDate);
      default:
        throw new Error(`Unknown report type: ${existing.type}`);
    }
  }

  async deleteReport(id: string): Promise<void> {
    const report = await this.getReportById(id);
    await this.reportsRepository.remove(report);
  }

  async updateReport(report: Report): Promise<Report> {
    return this.reportsRepository.save(report);
  }

  async compileSalesData(companyId: string, startDate: Date, endDate: Date): Promise<any> {
    try {
      const dailySummary = await this.posService.getDailySummary(companyId, startDate.toISOString().split('T')[0]);

      const { data: sales } = await this.posService.getSales(companyId, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        page: 1,
        limit: 1000,
      } as any);

      const hourlyMap = new Map<number, { sales: number; revenue: number }>();
      for (let h = 0; h < 24; h++) {
        hourlyMap.set(h, { sales: 0, revenue: 0 });
      }

      const categoryMap = new Map<string, { count: number; revenue: number }>();

      for (const sale of sales) {
        const hour = new Date(sale.createdAt).getHours();
        const existing = hourlyMap.get(hour) || { sales: 0, revenue: 0 };
        existing.sales += 1;
        existing.revenue += Number(sale.total);
        hourlyMap.set(hour, existing);

        for (const item of sale.items) {
          const cat = item.category || 'Non catégorisé';
          const catExisting = categoryMap.get(cat) || { count: 0, revenue: 0 };
          catExisting.count += item.quantity;
          catExisting.revenue += Number(item.total);
          categoryMap.set(cat, catExisting);
        }
      }

      const hourlyBreakdown = Array.from(hourlyMap.entries()).map(([hour, data]) => ({
        hour,
        ...data,
      }));

      const categoryBreakdown = Array.from(categoryMap.entries()).map(([name, data]) => ({
        name,
        ...data,
      })).sort((a, b) => b.revenue - a.revenue);

      return {
        totalSales: dailySummary.totalSales,
        totalRevenue: dailySummary.totalRevenue,
        totalItems: dailySummary.totalItems,
        topProducts: dailySummary.topProducts,
        paymentBreakdown: dailySummary.paymentBreakdown,
        hourlyBreakdown,
        categoryBreakdown,
      };
    } catch (error) {
      this.logger.error(`Failed to compile sales data: ${error.message}`);
      return {
        totalSales: 0,
        totalRevenue: 0,
        totalItems: 0,
        topProducts: [],
        paymentBreakdown: [],
        hourlyBreakdown: [],
        categoryBreakdown: [],
      };
    }
  }

  async compileFinancialData(companyId: string, startDate: Date, endDate: Date): Promise<any> {
    try {
      const summary = await this.financeService.getSummary(companyId, startDate, endDate);
      const margin = summary.income > 0 ? ((summary.profit / summary.income) * 100) : 0;

      return {
        income: summary.income,
        expenses: summary.expenses,
        profit: summary.profit,
        margin: parseFloat(margin.toFixed(2)),
        transactionCount: summary.transactions.length,
      };
    } catch (error) {
      this.logger.error(`Failed to compile financial data: ${error.message}`);
      return { income: 0, expenses: 0, profit: 0, margin: 0, transactionCount: 0 };
    }
  }

  async compileInventoryData(companyId: string): Promise<any> {
    try {
      const [summary, stockAlerts] = await Promise.all([
        this.inventoryService.getInventorySummary(companyId),
        this.inventoryService.getStockAlerts(companyId),
      ]);

      return {
        summary,
        stockAlerts,
        lowStockCount: stockAlerts.length,
      };
    } catch (error) {
      this.logger.error(`Failed to compile inventory data: ${error.message}`);
      return {
        summary: { totalProducts: 0, totalStock: 0, totalValue: 0, lowStockCount: 0, outOfStockCount: 0, categories: [] },
        stockAlerts: [],
        lowStockCount: 0,
      };
    }
  }

  async compileCustomerData(companyId: string, startDate: Date, endDate: Date): Promise<any> {
    try {
      const contacts = await this.crmService.findAllContacts(companyId);

      const newContacts = contacts.filter(c => {
        const created = new Date(c.createdAt);
        return created >= startDate && created <= endDate;
      });

      const { data: sales } = await this.posService.getSales(companyId, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        page: 1,
        limit: 1000,
      } as any);

      const customerSalesMap = new Map<string, { name: string; phone: string; totalSpent: number; transactions: number }>();
      const uniqueCustomers = new Set<string>();

      for (const sale of sales) {
        const customerKey = sale.customerPhone || sale.customerName || sale.id;
        uniqueCustomers.add(customerKey);

        const existing = customerSalesMap.get(customerKey) || {
          name: sale.customerName || 'Client anonyme',
          phone: sale.customerPhone || '',
          totalSpent: 0,
          transactions: 0,
        };
        existing.totalSpent += Number(sale.total);
        existing.transactions += 1;
        customerSalesMap.set(customerKey, existing);
      }

      const topCustomers = Array.from(customerSalesMap.values())
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 5);

      return {
        totalCustomers: uniqueCustomers.size,
        newCustomers: newContacts.length,
        returningCustomers: Math.max(0, uniqueCustomers.size - newContacts.length),
        totalContacts: contacts.length,
        topCustomers,
      };
    } catch (error) {
      this.logger.error(`Failed to compile customer data: ${error.message}`);
      return { totalCustomers: 0, newCustomers: 0, returningCustomers: 0, totalContacts: 0, topCustomers: [] };
    }
  }

  async compileEmployeeData(companyId: string, startDate: Date, endDate: Date): Promise<any> {
    try {
      const { data: sales } = await this.posService.getSales(companyId, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        page: 1,
        limit: 1000,
      } as any);

      const employeeMap = new Map<string, { employeeId: string; name: string; salesCount: number; revenue: number; itemsSold: number }>();
      const employees = await this.employeesService.findAllByCompany(companyId);
      const employeeNameMap = new Map<string, string>();
      for (const emp of employees) {
        employeeNameMap.set(emp.id, emp.userId);
      }

      for (const sale of sales) {
        const empId = sale.employeeId || 'unknown';
        const empName = employeeNameMap.get(empId) || `Employé ${empId.slice(0, 8)}`;

        const existing = employeeMap.get(empId) || {
          employeeId: empId,
          name: empName,
          salesCount: 0,
          revenue: 0,
          itemsSold: 0,
        };
        existing.salesCount += 1;
        existing.revenue += Number(sale.total);
        existing.itemsSold += sale.items.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0);
        employeeMap.set(empId, existing);
      }

      const performance = Array.from(employeeMap.values())
        .sort((a, b) => b.revenue - a.revenue);

      return {
        totalEmployees: employees.length,
        activeEmployees: employeeMap.size,
        performance,
      };
    } catch (error) {
      this.logger.error(`Failed to compile employee data: ${error.message}`);
      return { totalEmployees: 0, activeEmployees: 0, performance: [] };
    }
  }

  generateAIInsights(companyId: string | any, reportData?: any): any {
    let data: any;
    if (typeof companyId === 'string') {
      return;
    }
    data = companyId;

    const insights: string[] = [];
    const anomalies: string[] = [];
    const patterns: string[] = [];

    const sales = data.sales || {};
    const financial = data.financial || {};
    const customers = data.customers || {};
    const inventory = data.inventory || {};

    if (sales.totalSales === 0) {
      insights.push('Aucune vente enregistrée aujourd\'hui. Vérifiez votre activité commerciale.');
      anomalies.push('Journée sans vente détectée.');
    } else {
      if (sales.avgBasket && sales.avgBasket > 0) {
        insights.push(`Panier moyen de ${sales.avgBasket.toFixed(0)}. Continuez à encourager les achats multiples.`);
      }

      if (sales.topProducts && sales.topProducts.length > 0) {
        const top = sales.topProducts[0];
        patterns.push(`${top.name} est le produit le plus vendu avec ${top.quantity} unités écoulées.`);
      }

      const peakHours = (sales.hourlyBreakdown || []).filter((h: any) => h.sales > 0);
      if (peakHours.length > 0) {
        const maxHour = peakHours.reduce((max: any, h: any) => h.sales > max.sales ? h : max, peakHours[0]);
        patterns.push(`Pic de vente à ${maxHour.hour}h avec ${maxHour.sales} transaction(s).`);
      }

      const cardPayments = (sales.paymentBreakdown || []).find((p: any) => p.method === 'CARD' || p.method === 'card');
      const cashPayments = (sales.paymentBreakdown || []).find((p: any) => p.method === 'CASH' || p.method === 'cash');
      if (cardPayments && cashPayments && cardPayments.count > cashPayments.count) {
        patterns.push('Les paiements par carte dépassent les paiements en espèces aujourd\'hui.');
      }
    }

    if (financial.margin !== undefined) {
      if (financial.margin < 10) {
        anomalies.push(`Marge bénéficiaire faible: ${financial.margin}%. Revoyez vos coûts ou vos prix de vente.`);
        insights.push('Marge bénéficiaire faible détectée. Envisagez d\'optimiser vos coûts ou d\'ajuster vos prix.');
      } else if (financial.margin < 20) {
        insights.push(`Marge bénéficiaire de ${financial.margin}%. Acceptable mais peut être améliorée.`);
      } else {
        insights.push(`Excellente marge bénéficiaire de ${financial.margin}%! Votre activité est rentable.`);
      }
    }

    if (financial.expenses > financial.income && financial.income > 0) {
      anomalies.push('Les dépenses dépassent les revenus. Action immédiate recommandée.');
    }

    if (inventory.lowStockCount > 0) {
      insights.push(`${inventory.lowStockCount} produit(s) en stock bas. Pensez à réapprovisionner.`);
    }

    if (inventory.stockAlerts && inventory.stockAlerts.length > 0) {
      const outOfStock = inventory.stockAlerts.filter((a: any) => a.currentStock === 0);
      if (outOfStock.length > 0) {
        anomalies.push(`${outOfStock.length} produit(s) en rupture de stock!`);
      }
    }

    if (customers.newCustomers > 0) {
      insights.push(`${customers.newCustomers} nouveau(x) client(s) aujourd'hui. Continuez à développer votre clientèle!`);
    }

    if (customers.returningCustomers > 0 && customers.newCustomers > 0) {
      const retentionRate = (customers.returningCustomers / (customers.returningCustomers + customers.newCustomers) * 100).toFixed(1);
      patterns.push(`Taux de fidélisation: ${retentionRate}% des clients d'aujourd'hui sont des clients récurrents.`);
    }

    if (insights.length === 0) {
      insights.push('Activité normale. Continuez votre bon travail!');
    }

    return {
      insights,
      anomalies,
      patterns,
      recommendations: insights.slice(0, 3),
    };
  }

  private async getYesterdayComparison(companyId: string, today: string): Promise<any> {
    try {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const yesterdaySales = await this.posService.getDailySummary(companyId, yesterdayStr);
      const todaySales = await this.posService.getDailySummary(companyId, today);

      const revenueChange = yesterdaySales.totalRevenue > 0
        ? ((todaySales.totalRevenue - yesterdaySales.totalRevenue) / yesterdaySales.totalRevenue) * 100
        : todaySales.totalRevenue > 0 ? 100 : 0;

      const salesChange = yesterdaySales.totalSales > 0
        ? ((todaySales.totalSales - yesterdaySales.totalSales) / yesterdaySales.totalSales) * 100
        : todaySales.totalSales > 0 ? 100 : 0;

      return {
        revenueChange: parseFloat(revenueChange.toFixed(1)),
        salesChange: parseFloat(salesChange.toFixed(1)),
        yesterdayRevenue: yesterdaySales.totalRevenue,
        todayRevenue: todaySales.totalRevenue,
      };
    } catch {
      return { revenueChange: 0, salesChange: 0 };
    }
  }

  private async getLastWeekComparison(companyId: string, today: string): Promise<any> {
    try {
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastWeekStr = lastWeek.toISOString().split('T')[0];

      const lastWeekSales = await this.posService.getDailySummary(companyId, lastWeekStr);
      const todaySales = await this.posService.getDailySummary(companyId, today);

      const revenueChange = lastWeekSales.totalRevenue > 0
        ? ((todaySales.totalRevenue - lastWeekSales.totalRevenue) / lastWeekSales.totalRevenue) * 100
        : todaySales.totalRevenue > 0 ? 100 : 0;

      return {
        revenueChange: parseFloat(revenueChange.toFixed(1)),
        lastWeekRevenue: lastWeekSales.totalRevenue,
        todayRevenue: todaySales.totalRevenue,
      };
    } catch {
      return { revenueChange: 0 };
    }
  }

  private calculateHealthScore(sales: any, financial: any, inventory: any, customers: any): number {
    let score = 0;

    if (sales.totalSales > 0) score += 25;
    if (sales.totalSales > 5) score += 10;
    if (sales.totalSales > 10) score += 5;

    if (financial.profit > 0) score += 20;
    if (financial.margin > 15) score += 5;

    if (inventory.lowStockCount === 0) score += 15;
    else if (inventory.lowStockCount <= 3) score += 8;

    if (customers.totalCustomers > 0) score += 10;
    if (customers.returningCustomers > 0) score += 5;
    if (customers.newCustomers > 0) score += 5;

    return Math.min(100, score);
  }
}
