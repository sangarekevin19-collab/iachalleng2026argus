import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';
import { ReportGeneratorService } from './services/report-generator.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { ReportFilterDto } from './dto/report-filter.dto';
import { SendReportDto } from './dto/send-report.dto';
import { EmailService } from '../../shared/services/email.service';
import { WhatsappBusinessService } from '../whatsapp/services/whatsapp-business.service';
import { CompaniesService } from '../companies/companies.service';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly reportGenerator: ReportGeneratorService,
    private readonly emailService: EmailService,
    private readonly whatsappBusinessService: WhatsappBusinessService,
    private readonly companiesService: CompaniesService,
  ) {}

  @Post('daily')
  @ApiOperation({ summary: 'Generate daily report' })
  async generateDaily(@Req() req: any, @Body() dto: GenerateReportDto) {
    return this.reportsService.generateDailyReport(
      req.user.companyId,
      dto.date,
    );
  }

  @Post('weekly')
  @ApiOperation({ summary: 'Generate weekly report' })
  async generateWeekly(@Req() req: any, @Body() dto: GenerateReportDto) {
    return this.reportsService.generateWeeklyReport(
      req.user.companyId,
      dto.date,
    );
  }

  @Post('monthly')
  @ApiOperation({ summary: 'Generate monthly report' })
  async generateMonthly(@Req() req: any, @Body() dto: GenerateReportDto) {
    return this.reportsService.generateMonthlyReport(
      req.user.companyId,
      dto.date,
    );
  }

  @Post('custom')
  @ApiOperation({ summary: 'Generate custom date range report' })
  async generateCustom(@Req() req: any, @Body() dto: GenerateReportDto) {
    return this.reportsService.generateCustomReport(
      req.user.companyId,
      dto.startDate,
      dto.endDate,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all reports with filters' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listReports(@Req() req: any, @Query() filters: ReportFilterDto) {
    return this.reportsService.getReports(req.user.companyId, filters);
  }

  @Get('dashboard/summary')
  @ApiOperation({ summary: 'Get dashboard summary data for current period' })
  async getDashboardSummary(@Req() req: any) {
    const today = new Date().toISOString().split('T')[0];
    const existingReports = await this.reportsService.getReports(req.user.companyId, {
      type: 'daily',
      status: 'completed',
      startDate: today,
      endDate: today,
      page: 1,
      limit: 1,
    });

    if (existingReports.data.length > 0 && existingReports.data[0].status === 'completed') {
      return this.reportGenerator.generateDashboardData(existingReports.data[0]);
    }

    const report = await this.reportsService.generateDailyReport(req.user.companyId, today);
    return this.reportGenerator.generateDashboardData(report);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get report by ID' })
  async getById(@Param('id') id: string) {
    return this.reportsService.getReportById(id);
  }

  @Get(':id/whatsapp')
  @ApiOperation({ summary: 'Get WhatsApp-friendly summary of a report' })
  async getWhatsAppSummary(@Param('id') id: string) {
    const report = await this.reportsService.getReportById(id);
    const summary = this.reportGenerator.generateWhatsAppSummary(report);
    return { summary };
  }

  @Get(':id/email-preview')
  @ApiOperation({ summary: 'Preview email HTML for a report' })
  async getEmailPreview(@Param('id') id: string) {
    const report = await this.reportsService.getReportById(id);
    const html = this.reportGenerator.generateEmailHtml(report);
    return { html };
  }

  @Post(':id/regenerate')
  @ApiOperation({ summary: 'Regenerate a report' })
  async regenerate(@Param('id') id: string) {
    return this.reportsService.regenerateReport(id);
  }

  @Post(':id/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send report via configured channels' })
  async sendReport(@Param('id') id: string, @Body() dto: SendReportDto, @Req() req: any) {
    const report = await this.reportsService.getReportById(id);
    const company = await this.companiesService.findById(req.user.companyId);
    const channels = dto.channels || [];
    const results: Record<string, boolean> = {};

    for (const channel of channels) {
      try {
        if (channel === 'email') {
          const emailHtml = this.reportGenerator.generateEmailHtml(report);
          await this.emailService.sendReport(company?.email || req.user.email, {
            date: report.period?.startDate
              ? new Date(report.period.startDate).toLocaleDateString('fr-FR')
              : new Date().toLocaleDateString('fr-FR'),
            totalSales: report.content?.summary?.totalSales || 0,
            revenue: report.content?.summary?.revenue || 0,
            customersServed: report.content?.customers?.totalCustomers || 0,
            healthScore: report.content?.healthScore || company?.healthScore || 0,
            html: emailHtml,
          });
          results[channel] = true;
        } else if (channel === 'whatsapp') {
          const whatsappSummary = this.reportGenerator.generateWhatsAppSummary(report);
          const ownerPhone = company?.phone || company?.ownerPhone;
          if (ownerPhone) {
            await this.whatsappBusinessService.sendMessage(ownerPhone, whatsappSummary);
            results[channel] = true;
          } else {
            results[channel] = false;
          }
        }
      } catch (error) {
        results[channel] = false;
      }
    }

    if (channels.length > 0) {
      report.sentVia = [...new Set([...(report.sentVia || []), ...channels.filter(c => results[c])])];
      report.sentAt = new Date();
      await this.reportsService.updateReport(report);
    }

    return { success: true, results, sentVia: report.sentVia };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a report' })
  async deleteReport(@Param('id') id: string) {
    await this.reportsService.deleteReport(id);
  }
}
