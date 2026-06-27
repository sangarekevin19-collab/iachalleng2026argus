import { Controller, Get, Post, Body, Param, Query, UseGuards, Req, Res, HttpStatus } from '@nestjs/common';

import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PosService } from './pos.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SaleFilterDto } from './dto/sale-filter.dto';
import { ResendReceiptDto } from './dto/resend-receipt.dto';

@ApiTags('pos')
@Controller('pos')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Post('sales')
  @ApiOperation({ summary: 'Create a new sale' })
  async createSale(@Req() req: any, @Body() dto: CreateSaleDto) {
    return this.posService.createSale(req.user.companyId, req.user.id, dto);
  }

  @Get('sales')
  @ApiOperation({ summary: 'List sales with filters' })
  async getSales(@Req() req: any, @Query() filters: SaleFilterDto) {
    return this.posService.getSales(req.user.companyId, filters);
  }

  @Get('sales/today')
  @ApiOperation({ summary: 'Get today sales' })
  async getTodaySales(@Req() req: any) {
    return this.posService.getTodaySales(req.user.companyId);
  }

  @Get('sales/daily-summary')
  @ApiOperation({ summary: 'Get daily sales summary' })
  async getDailySummary(@Req() req: any, @Query('date') date?: string) {
    return this.posService.getDailySummary(req.user.companyId, date);
  }

  @Get('sales/:id')
  @ApiOperation({ summary: 'Get sale by ID' })
  async getSaleById(@Param('id') id: string) {
    return this.posService.getSaleById(id);
  }

  @Post('sales/:id/cancel')
  @ApiOperation({ summary: 'Cancel a sale' })
  async cancelSale(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.posService.cancelSale(id, reason);
  }

  @Post('sales/:id/refund')
  @ApiOperation({ summary: 'Refund a sale' })
  async refundSale(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.posService.refundSale(id, reason);
  }

  @Get('receipts/:receiptNumber')
  @ApiOperation({ summary: 'Get receipt by receipt number' })
  async getReceipt(@Param('receiptNumber') receiptNumber: string) {
    return this.posService.getReceipt(receiptNumber);
  }

  @Get('sales/:saleId/receipt')
  @ApiOperation({ summary: 'Get receipt for a sale' })
  async getReceiptBySaleId(@Param('saleId') saleId: string) {
    return this.posService.getReceipt(saleId);
  }

  @Post('receipts/:receiptNumber/resend')
  @ApiOperation({ summary: 'Resend receipt via specified channels' })
  async resendReceipt(@Param('receiptNumber') receiptNumber: string, @Body() dto: ResendReceiptDto) {
    return this.posService.resendReceipt(receiptNumber, dto.channels);
  }

  @Get('receipts/:receiptNumber/pdf')
  @ApiOperation({ summary: 'Download receipt as PDF/HTML' })
  async downloadReceiptPdf(@Param('receiptNumber') receiptNumber: string, @Res() res: Response) {
    const buffer = await this.posService.generateReceiptPdf(receiptNumber);
    res.set({
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="receipt-${receiptNumber}.html"`,
      'Content-Length': buffer.length,
    });
    res.status(HttpStatus.OK).send(buffer);
  }

  @Get('analytics/trend')
  @ApiOperation({ summary: 'Get sales trend over time' })
  async getSalesTrend(@Req() req: any, @Query('days') days: number = 30) {
    return this.posService.getSalesTrend(req.user.companyId, days || 30);
  }

  @Get('analytics/top-products')
  @ApiOperation({ summary: 'Get top selling products' })
  async getTopProducts(@Req() req: any, @Query('limit') limit: number = 10) {
    return this.posService.getTopProducts(req.user.companyId, limit || 10);
  }

  @Get('customers/balances')
  @ApiOperation({ summary: 'Get customer credit balances' })
  async getCustomerBalances(@Req() req: any) {
    return this.posService.getCustomerBalances(req.user.companyId);
  }
}
