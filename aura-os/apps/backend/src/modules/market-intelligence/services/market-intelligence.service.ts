import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketTrend, TrendCategory, TrendType, TrendImpact } from '../entities/market-trend.entity';
import { CompetitorInsight } from '../entities/competitor-insight.entity';
import { MarketOpportunity, OpportunityStatus } from '../entities/market-opportunity.entity';
import { CreateTrendDto } from '../dto/create-trend.dto';
import { TrendFilterDto } from '../dto/trend-filter.dto';

@Injectable()
export class MarketIntelligenceService {
  private readonly logger = new Logger(MarketIntelligenceService.name);

  constructor(
    @InjectRepository(MarketTrend)
    private readonly trendRepo: Repository<MarketTrend>,
    @InjectRepository(CompetitorInsight)
    private readonly insightRepo: Repository<CompetitorInsight>,
    @InjectRepository(MarketOpportunity)
    private readonly opportunityRepo: Repository<MarketOpportunity>,
  ) {}

  async createTrend(dto: CreateTrendDto, companyId: string): Promise<MarketTrend> {
    const trend = this.trendRepo.create({
      title: dto.title,
      description: dto.description,
      category: dto.category as unknown as TrendCategory,
      region: dto.region,
      trendType: dto.trendType as unknown as TrendType,
      confidence: dto.confidence,
      impact: dto.impact as unknown as TrendImpact,
      data: dto.data,
      relatedProducts: dto.relatedProducts,
      suggestedActions: dto.suggestedActions,
      companyId,
      detectedAt: new Date(),
    });
    return this.trendRepo.save(trend);
  }

  async getTrends(companyId: string, filters: TrendFilterDto): Promise<{ data: MarketTrend[]; total: number }> {
    const { category, region, trendType, impact, page = 1, limit = 20 } = filters;
    const query = this.trendRepo.createQueryBuilder('trend').where('trend.companyId = :companyId', { companyId });

    if (category) query.andWhere('trend.category = :category', { category });
    if (region) query.andWhere('trend.region = :region', { region });
    if (trendType) query.andWhere('trend.trendType = :trendType', { trendType });
    if (impact) query.andWhere('trend.impact = :impact', { impact });

    const [data, total] = await query
      .orderBy('trend.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async getTrendById(id: string): Promise<MarketTrend | null> {
    return this.trendRepo.findOne({ where: { id } });
  }

  async deleteTrend(id: string): Promise<void> {
    await this.trendRepo.delete(id);
  }

  async createCompetitorInsight(dto: Partial<CompetitorInsight>, companyId: string): Promise<CompetitorInsight> {
    const insight = this.insightRepo.create({
      ...dto,
      companyId,
      detectedAt: new Date(),
    });
    return this.insightRepo.save(insight);
  }

  async getCompetitorInsights(companyId: string): Promise<CompetitorInsight[]> {
    return this.insightRepo.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
  }

  async createOpportunity(dto: Partial<MarketOpportunity>, companyId: string): Promise<MarketOpportunity> {
    const opportunity = this.opportunityRepo.create({
      ...dto,
      companyId,
    });
    return this.opportunityRepo.save(opportunity);
  }

  async getOpportunities(
    companyId: string,
    status?: string,
  ): Promise<{ data: MarketOpportunity[]; total: number }> {
    const query = this.opportunityRepo.createQueryBuilder('opp').where('opp.companyId = :companyId', { companyId });

    if (status) query.andWhere('opp.status = :status', { status });

    const [data, total] = await query
      .orderBy('opp.createdAt', 'DESC')
      .getManyAndCount();

    return { data, total };
  }

  async updateOpportunityStatus(id: string, status: OpportunityStatus | string, result?: Record<string, any>): Promise<MarketOpportunity | null> {
    const opportunity = await this.opportunityRepo.findOne({ where: { id } });
    if (!opportunity) return null;

    opportunity.status = status as OpportunityStatus;
    if (status === 'actioned') {
      opportunity.actionPlan = { ...opportunity.actionPlan, result };
    }

    return this.opportunityRepo.save(opportunity);
  }

  async markOpportunityActioned(id: string, result: Record<string, any>): Promise<MarketOpportunity | null> {
    return this.updateOpportunityStatus(id, 'actioned', result);
  }

  async getMarketDashboard(companyId: string): Promise<Record<string, any>> {
    const [trends, opportunities, insights] = await Promise.all([
      this.trendRepo.find({ where: { companyId }, order: { createdAt: 'DESC' }, take: 5 }),
      this.opportunityRepo.find({ where: { companyId }, order: { createdAt: 'DESC' }, take: 5 }),
      this.insightRepo.find({ where: { companyId }, order: { createdAt: 'DESC' }, take: 5 }),
    ]);

    const activeOpportunities = opportunities.filter(
      o => ['identified', 'evaluating', 'approved'].includes(o.status),
    );

    const highImpactTrends = trends.filter(t => t.impact === 'high');

    return {
      trends: { total: trends.length, highImpact: highImpactTrends.length, recent: trends },
      opportunities: { total: opportunities.length, active: activeOpportunities.length, recent: opportunities },
      competitorInsights: { total: insights.length, recent: insights },
      lastUpdated: new Date(),
    };
  }

  async scheduleAnalysis(companyId: string, frequency: string): Promise<{ scheduled: boolean; companyId: string; frequency: string }> {
    this.logger.log(`Scheduling market analysis for company ${companyId} with frequency: ${frequency}`);
    return { scheduled: true, companyId, frequency };
  }
}
