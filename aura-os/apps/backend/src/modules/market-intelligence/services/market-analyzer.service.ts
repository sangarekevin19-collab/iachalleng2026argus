import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LlmService } from '../../agents/services/llm.service';
import { MarketTrend } from '../entities/market-trend.entity';
import { CompetitorInsight } from '../entities/competitor-insight.entity';
import { MarketOpportunity } from '../entities/market-opportunity.entity';

export interface MarketAnalysis {
  trends: Partial<MarketTrend>[];
  opportunities: Partial<MarketOpportunity>[];
  threats: string[];
  recommendations: string[];
}

export interface MarketOverview {
  totalTrends: number;
  risingTrends: number;
  activeOpportunities: number;
  highImpactInsights: number;
  competitorCount: number;
  lastAnalysisDate: Date;
  topOpportunities: MarketOpportunity[];
  topTrends: MarketTrend[];
}

export interface MarketReport {
  generatedAt: Date;
  overview: MarketOverview;
  trends: MarketTrend[];
  opportunities: MarketOpportunity[];
  competitorInsights: CompetitorInsight[];
  recommendations: string[];
  seasonalOutlook: Record<string, any>;
}

@Injectable()
export class MarketAnalyzerService {
  private readonly logger = new Logger(MarketAnalyzerService.name);

  constructor(
    private readonly llmService: LlmService,
    @InjectRepository(MarketTrend)
    private readonly trendRepo: Repository<MarketTrend>,
    @InjectRepository(CompetitorInsight)
    private readonly insightRepo: Repository<CompetitorInsight>,
    @InjectRepository(MarketOpportunity)
    private readonly opportunityRepo: Repository<MarketOpportunity>,
  ) {}

  async analyzeLocalMarket(
    companyId: string,
    sector: string,
    country: string,
    region: string,
  ): Promise<MarketAnalysis> {
    const systemPrompt = `Tu est un expert en analyse de marché en Afrique de l'Ouest. Analyse les conditions de marché pour une entreprise du secteur "${sector}" située en "${region}, ${country}".

Prends en compte les réalités du marché africain:
- Événements saisonniers: Tabaski, Ramadan, récoltes, saison des pluies
- Cycles agricoles et leur impact sur le pouvoir d'achat
- Dynamiques de l'économie informelle
- Tendances d'urbanisation
- Pénétration mobile et commerce digital

Réponds en JSON avec: { "trends": [{"title":"...","description":"...","category":"product|category|region|season","trendType":"rising|declining|stable|seasonal|new","confidence":0-100,"impact":"high|medium|low","relatedProducts":[...],"suggestedActions":[...]}], "opportunities": [{"title":"...","description":"...","type":"new_product|new_market|new_supplier|partnership|pricing|seasonal","potentialRevenue":number,"confidence":0-100,"effort":"low|medium|high"}], "threats": ["..."], "recommendations": ["..."] }`;

    const userPrompt = `Analyse le marché pour: secteur=${sector}, pays=${country}, région=${region}. Fournis une analyse détaillée avec tendances, opportunités, menaces et recommandations.`;

    try {
      const response = await this.llmService.generateResponse(
        systemPrompt,
        [{ role: 'user', content: userPrompt }],
        { sector, country, region },
      );

      const analysis: MarketAnalysis = JSON.parse(response);

      if (analysis.trends) {
        for (const trend of analysis.trends) {
          await this.trendRepo.save(
            this.trendRepo.create({
              ...trend,
              companyId,
              detectedAt: new Date(),
            }),
          );
        }
      }

      if (analysis.opportunities) {
        for (const opp of analysis.opportunities) {
          await this.opportunityRepo.save(
            this.opportunityRepo.create({
              ...opp,
              companyId,
            }),
          );
        }
      }

      return analysis;
    } catch (error) {
      this.logger.error(`Error analyzing local market: ${error.message}`);
      return {
        trends: [],
        opportunities: [],
        threats: [],
        recommendations: ['Erreur lors de l\'analyse. Vérifiez la configuration OPENAI_API_KEY.'],
      };
    }
  }

  async detectTrends(companyId: string): Promise<MarketTrend[]> {
    const existingTrends = await this.trendRepo.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    const systemPrompt = `Tu es un analyste de tendances de marché en Afrique. Analyse les données de vente et d'inventaire pour détecter les tendances émergentes.

Identifie:
- Produits en hausse ou en baisse
- Patterns saisonniers (Tabaski, Ramadan, récoltes, saison des pluies)
- Changements dans les habitudes d'achat
- Nouvelles demandes émergentes

Réponds en JSON: [{"title":"...","description":"...","category":"...","trendType":"...","confidence":0-100,"impact":"...","relatedProducts":[...],"suggestedActions":[...]}]`;

    try {
      const response = await this.llmService.generateResponse(
        systemPrompt,
        [{ role: 'user', content: JSON.stringify({ companyId, existingTrends }) }],
        { companyId },
      );

      const trends: Partial<MarketTrend>[] = JSON.parse(response);
      const saved: MarketTrend[] = [];

      for (const trend of trends) {
        const entity = await this.trendRepo.save(
          this.trendRepo.create({
            ...trend,
            companyId,
            detectedAt: new Date(),
          }),
        );
        saved.push(entity);
      }

      return saved;
    } catch (error) {
      this.logger.error(`Error detecting trends: ${error.message}`);
      return existingTrends;
    }
  }

  async identifyOpportunities(companyId: string): Promise<MarketOpportunity[]> {
    const trends = await this.trendRepo.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    const systemPrompt = `Tu es un stratège business spécialisé sur les marchés africains. En croisant les tendances de marché avec les données de l'entreprise, identifie des opportunités concrètes.

Types d'opportunités à considérer:
- Nouveaux produits adaptés au marché local
- Nouveaux marchés géographiques (villes voisines, zones rurales)
- Fournisseurs alternatifs (import local vs international)
- Partenariats stratégiques
- Optimisation des prix selon la saison
- Opportunités saisonnières (Tabaski, Ramadan, fêtes nationales, récoltes)

Réponds en JSON: [{"title":"...","description":"...","type":"new_product|new_market|new_supplier|partnership|pricing|seasonal","potentialRevenue":number,"confidence":0-100,"effort":"low|medium|high","actionPlan":{...}}]`;

    try {
      const response = await this.llmService.generateResponse(
        systemPrompt,
        [{ role: 'user', content: JSON.stringify({ companyId, trends }) }],
        { companyId },
      );

      const opportunities: Partial<MarketOpportunity>[] = JSON.parse(response);
      const saved: MarketOpportunity[] = [];

      for (const opp of opportunities) {
        const entity = await this.opportunityRepo.save(
          this.opportunityRepo.create({
            ...opp,
            companyId,
          }),
        );
        saved.push(entity);
      }

      return saved;
    } catch (error) {
      this.logger.error(`Error identifying opportunities: ${error.message}`);
      return [];
    }
  }

  async analyzeCompetitors(companyId: string, sector: string): Promise<CompetitorInsight[]> {
    const systemPrompt = `Tu es un analyste concurrentiel spécialisé sur les marchés africains. Pour une entreprise du secteur "${sector}", génère un cadre d'analyse concurrentielle.

Fournis:
1. Les types de concurrents à surveiller (directs, indirects, potentiels)
2. Les axes d'analyse: prix, produits, promotions, présence en ligne, sentiment client
3. Des suggestions de surveillance
4. Les menaces concurrentielles typiques dans ce secteur en Afrique de l'Ouest

Réponds en JSON: [{"competitorName":"...","competitorType":"direct|indirect|potential","insightType":"pricing|product|promotion|location|online_presence|customer_sentiment","title":"...","description":"...","source":"...","impact":"high|medium|low","data":{...}}]`;

    try {
      const response = await this.llmService.generateResponse(
        systemPrompt,
        [{ role: 'user', content: JSON.stringify({ companyId, sector }) }],
        { companyId, sector },
      );

      const insights: Partial<CompetitorInsight>[] = JSON.parse(response);
      const saved: CompetitorInsight[] = [];

      for (const insight of insights) {
        const entity = await this.insightRepo.save(
          this.insightRepo.create({
            ...insight,
            companyId,
            detectedAt: new Date(),
          }),
        );
        saved.push(entity);
      }

      return saved;
    } catch (error) {
      this.logger.error(`Error analyzing competitors: ${error.message}`);
      return [];
    }
  }

  async getMarketOverview(companyId: string): Promise<MarketOverview> {
    const [trends, opportunities, insights] = await Promise.all([
      this.trendRepo.find({ where: { companyId }, order: { createdAt: 'DESC' }, take: 10 }),
      this.opportunityRepo.find({ where: { companyId }, order: { createdAt: 'DESC' }, take: 10 }),
      this.insightRepo.find({ where: { companyId }, order: { createdAt: 'DESC' }, take: 10 }),
    ]);

    const risingTrends = trends.filter(t => t.trendType === 'rising' || t.trendType === 'new');
    const activeOpportunities = opportunities.filter(
      o => o.status === 'identified' || o.status === 'evaluating' || o.status === 'approved',
    );
    const highImpactInsights = insights.filter(i => i.impact === 'high');

    const lastAnalysisDate = trends.length > 0 ? trends[0].createdAt : new Date();

    return {
      totalTrends: trends.length,
      risingTrends: risingTrends.length,
      activeOpportunities: activeOpportunities.length,
      highImpactInsights: highImpactInsights.length,
      competitorCount: new Set(insights.map(i => i.competitorName)).size,
      lastAnalysisDate,
      topOpportunities: opportunities.slice(0, 5),
      topTrends: trends.slice(0, 5),
    };
  }

  async generateMarketReport(companyId: string): Promise<MarketReport> {
    const [trends, opportunities, insights] = await Promise.all([
      this.trendRepo.find({ where: { companyId }, order: { createdAt: 'DESC' } }),
      this.opportunityRepo.find({ where: { companyId }, order: { createdAt: 'DESC' } }),
      this.insightRepo.find({ where: { companyId }, order: { createdAt: 'DESC' } }),
    ]);

    const overview = await this.getMarketOverview(companyId);

    const systemPrompt = `Tu es un consultant en stratégie de marché en Afrique de l'Ouest. Génère un rapport d'intelligence de marché complet.

Inclure:
- Synthèse exécutive
- Recommandations stratégiques prioritaires
- Perspectives saisonnières (prochains événements: Tabaski, Ramadan, récoltes, saison des pluies)
- Plan d'action recommandé

Réponds en JSON: {"recommendations":[...],"seasonalOutlook":{"nextEvents":[...],"expectedImpact":[...],"preparationActions":[...]}}`;

    try {
      const response = await this.llmService.generateResponse(
        systemPrompt,
        [{ role: 'user', content: JSON.stringify({ trends: trends.slice(0, 10), opportunities: opportunities.slice(0, 10), insights: insights.slice(0, 10) }) }],
        { companyId },
      );

      const llmResult = JSON.parse(response);

      return {
        generatedAt: new Date(),
        overview,
        trends,
        opportunities,
        competitorInsights: insights,
        recommendations: llmResult.recommendations || [],
        seasonalOutlook: llmResult.seasonalOutlook || {},
      };
    } catch (error) {
      this.logger.error(`Error generating market report: ${error.message}`);
      return {
        generatedAt: new Date(),
        overview,
        trends,
        opportunities,
        competitorInsights: insights,
        recommendations: ['Erreur lors de la génération du rapport.'],
        seasonalOutlook: {},
      };
    }
  }
}
