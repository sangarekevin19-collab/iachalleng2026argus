import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MarketIntelligenceService } from './services/market-intelligence.service';
import { MarketAnalyzerService } from './services/market-analyzer.service';
import { CreateTrendDto } from './dto/create-trend.dto';
import { TrendFilterDto } from './dto/trend-filter.dto';
import { CompaniesService } from '../companies/companies.service';

@ApiTags('market-intelligence')
@Controller('market-intelligence')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MarketIntelligenceController {
  constructor(
    private readonly marketIntelligenceService: MarketIntelligenceService,
    private readonly marketAnalyzerService: MarketAnalyzerService,
    private readonly companiesService: CompaniesService,
  ) {}

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run full market analysis' })
  async analyze(@Req() req: any) {
    const company = await this.companiesService.findById(req.user.companyId);
    return this.marketAnalyzerService.analyzeLocalMarket(
      req.user.companyId,
      company?.sector || 'general',
      company?.countryCode || 'SN',
      company?.city || 'Dakar',
    );
  }

  @Get('trends')
  @ApiOperation({ summary: 'List market trends' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'region', required: false })
  @ApiQuery({ name: 'trendType', required: false })
  @ApiQuery({ name: 'impact', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getTrends(@Req() req: any, @Query() filters: TrendFilterDto) {
    return this.marketIntelligenceService.getTrends(req.user.companyId, filters);
  }

  @Get('opportunities')
  @ApiOperation({ summary: 'List market opportunities' })
  @ApiQuery({ name: 'status', required: false })
  async getOpportunities(@Req() req: any, @Query('status') status?: string) {
    return this.marketIntelligenceService.getOpportunities(req.user.companyId, status);
  }

  @Get('competitors')
  @ApiOperation({ summary: 'Get competitor insights' })
  async getCompetitorInsights(@Req() req: any) {
    return this.marketIntelligenceService.getCompetitorInsights(req.user.companyId);
  }

  @Get('overview')
  @ApiOperation({ summary: 'Get market overview dashboard' })
  async getOverview(@Req() req: any) {
    return this.marketAnalyzerService.getMarketOverview(req.user.companyId);
  }

  @Get('report')
  @ApiOperation({ summary: 'Generate full market intelligence report' })
  async getReport(@Req() req: any) {
    return this.marketAnalyzerService.generateMarketReport(req.user.companyId);
  }

  @Put('opportunities/:id')
  @ApiOperation({ summary: 'Update opportunity status' })
  async updateOpportunity(@Param('id') id: string, @Body() body: { status: string; result?: Record<string, any> }) {
    return this.marketIntelligenceService.updateOpportunityStatus(id, body.status, body.result);
  }

  @Delete('trends/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a market trend' })
  async deleteTrend(@Param('id') id: string) {
    await this.marketIntelligenceService.deleteTrend(id);
  }
}
