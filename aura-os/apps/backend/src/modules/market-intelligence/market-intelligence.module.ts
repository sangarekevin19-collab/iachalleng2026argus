import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketTrend } from './entities/market-trend.entity';
import { CompetitorInsight } from './entities/competitor-insight.entity';
import { MarketOpportunity } from './entities/market-opportunity.entity';
import { MarketIntelligenceService } from './services/market-intelligence.service';
import { MarketAnalyzerService } from './services/market-analyzer.service';
import { MarketIntelligenceController } from './market-intelligence.controller';
import { AgentsModule } from '../agents/agents.module';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketTrend, CompetitorInsight, MarketOpportunity]),
    forwardRef(() => AgentsModule),
    forwardRef(() => CompaniesModule),
  ],
  controllers: [MarketIntelligenceController],
  providers: [MarketIntelligenceService, MarketAnalyzerService],
  exports: [MarketIntelligenceService, MarketAnalyzerService, TypeOrmModule],
})
export class MarketIntelligenceModule {}
