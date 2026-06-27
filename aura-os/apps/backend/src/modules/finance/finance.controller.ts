import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';

import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FinanceService } from './finance.service';

@ApiTags('finance')
@Controller('finance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post('transactions')
  @ApiOperation({ summary: 'Record a new transaction' })
  async recordTransaction(@Req() req: any, @Body() data: Record<string, any>) {
    return this.financeService.recordTransaction({ ...data, companyId: req.user.companyId });
  }

  @Get('transactions')
  @ApiOperation({ summary: 'List transactions' })
  async listTransactions(@Req() req: any, @Query('page') page: number = 1, @Query('limit') limit: number = 20) {
    return this.financeService.listTransactions(req.user.companyId, page || 1, limit || 20);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get financial summary for a date range' })
  async getSummary(
    @Req() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.financeService.getSummary(
      req.user.companyId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('income')
  @ApiOperation({ summary: 'Get total income for a date range' })
  async getIncome(
    @Req() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const total = await this.financeService.getIncome(
      req.user.companyId,
      new Date(startDate),
      new Date(endDate),
    );
    return { total };
  }

  @Get('expenses')
  @ApiOperation({ summary: 'Get total expenses for a date range' })
  async getExpenses(
    @Req() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const total = await this.financeService.getExpenses(
      req.user.companyId,
      new Date(startDate),
      new Date(endDate),
    );
    return { total };
  }

  @Get('profit')
  @ApiOperation({ summary: 'Get profit for a date range' })
  async getProfit(
    @Req() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const total = await this.financeService.getProfit(
      req.user.companyId,
      new Date(startDate),
      new Date(endDate),
    );
    return { total };
  }
}
