import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReportsService } from '../reports.service';
import { ReportGeneratorService } from './report-generator.service';
import { CompaniesService } from '../../companies/companies.service';
import { EmailService } from '../../../shared/services/email.service';
import { WhatsappBusinessService } from '../../whatsapp/services/whatsapp-business.service';
import { Report, ReportStatus } from '../entities/report.entity';

@Injectable()
export class ReportSchedulerService {
  private readonly logger = new Logger(ReportSchedulerService.name);

  constructor(
    private reportsService: ReportsService,
    private reportGenerator: ReportGeneratorService,
    private companiesService: CompaniesService,
    private emailService: EmailService,
    private whatsappBusinessService: WhatsappBusinessService,
  ) {}

  @Cron('0 22 * * *')
  async handleDailyReportCron(): Promise<void> {
    this.logger.log('Starting daily report generation cron job');
    try {
      const companies = await this.companiesService.findAll();
      for (const company of companies) {
        try {
          const report = await this.reportsService.generateDailyReport(company.id);
          await this.sendReportToOwner(report, company);
          this.logger.log(`Daily report generated for company ${company.id}`);
        } catch (error) {
          this.logger.error(`Failed to generate daily report for company ${company.id}: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Daily report cron failed: ${error.message}`);
    }
    this.logger.log('Daily report generation cron job completed');
  }

  @Cron('0 22 * * 1')
  async handleWeeklyReportCron(): Promise<void> {
    this.logger.log('Starting weekly report generation cron job');
    try {
      const companies = await this.companiesService.findAll();
      for (const company of companies) {
        try {
          const report = await this.reportsService.generateWeeklyReport(company.id);
          await this.sendReportToOwner(report, company);
          this.logger.log(`Weekly report generated for company ${company.id}`);
        } catch (error) {
          this.logger.error(`Failed to generate weekly report for company ${company.id}: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Weekly report cron failed: ${error.message}`);
    }
    this.logger.log('Weekly report generation cron job completed');
  }

  @Cron('0 22 1 * *')
  async handleMonthlyReportCron(): Promise<void> {
    this.logger.log('Starting monthly report generation cron job');
    try {
      const companies = await this.companiesService.findAll();
      for (const company of companies) {
        try {
          const report = await this.reportsService.generateMonthlyReport(company.id);
          await this.sendReportToOwner(report, company);
          this.logger.log(`Monthly report generated for company ${company.id}`);
        } catch (error) {
          this.logger.error(`Failed to generate monthly report for company ${company.id}: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Monthly report cron failed: ${error.message}`);
    }
    this.logger.log('Monthly report generation cron job completed');
  }

  private async sendReportToOwner(report: Report, company: any): Promise<void> {
    if (report.status !== ReportStatus.COMPLETED) {
      return;
    }

    const settings = company.reportSettings || {};
    const channels = settings.channels || [];

    for (const channel of channels) {
      try {
        if (channel === 'email') {
          await this.sendReportViaEmail(report, company);
        } else if (channel === 'whatsapp') {
          await this.sendReportViaWhatsApp(report, company);
        }
      } catch (error) {
        this.logger.error(`Failed to send report ${report.id} via ${channel}: ${error.message}`);
      }
    }

    if (channels.length > 0) {
      report.sentVia = [...new Set([...(report.sentVia || []), ...channels])];
      report.sentAt = new Date();
      await this.reportsService.updateReport(report);
    }
  }

  private async sendReportViaEmail(report: Report, company: any): Promise<void> {
    const emailHtml = this.reportGenerator.generateEmailHtml(report);
    await this.emailService.sendReport(company.ownerEmail || company.email, {
      date: report.period?.startDate
        ? new Date(report.period.startDate).toLocaleDateString('fr-FR')
        : new Date().toLocaleDateString('fr-FR'),
      totalSales: report.content?.summary?.totalSales || 0,
      revenue: report.content?.summary?.revenue || 0,
      customersServed: report.content?.customers?.totalCustomers || 0,
      healthScore: report.content?.healthScore || company.healthScore || 0,
      html: emailHtml,
    });
    this.logger.log(`Report ${report.id} sent via email for company ${company.id}`);
  }

  private async sendReportViaWhatsApp(report: Report, company: any): Promise<void> {
    const whatsappSummary = this.reportGenerator.generateWhatsAppSummary(report);
    const ownerPhone = company.ownerPhone || company.phone;
    if (ownerPhone) {
      await this.whatsappBusinessService.sendMessage(ownerPhone, whatsappSummary);
      this.logger.log(`Report ${report.id} sent via WhatsApp for company ${company.id}`);
    }
  }
}
