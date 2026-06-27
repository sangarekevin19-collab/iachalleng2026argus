import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LlmService } from '../modules/agents/services/llm.service';
import { MemoryService } from '../modules/memory/memory.service';

export interface GrowthAnalysis {
  companyId: string;
  timestamp: Date;
  marketPosition: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  recommendations: GrowthRecommendation[];
  goals: GrowthGoal[];
  competitorInsights: CompetitorInsight[];
}

export interface GrowthRecommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  impactScore: number;
  effortScore: number;
  priority: string;
  actionPlan: string[];
  expectedROI: string;
  timeframe: string;
}

export interface GrowthGoal {
  id: string;
  metric: string;
  currentValue: number;
  targetValue: number;
  deadline: Date;
  progress: number;
}

export interface CompetitorInsight {
  name: string;
  strength: string;
  weakness: string;
  marketShare?: string;
  differentiation: string;
}

@Injectable()
export class GrowthEngineService {
  private readonly logger = new Logger('GrowthEngine');

  constructor(
    private readonly llmService: LlmService,
    private readonly memoryService: MemoryService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async runDailyAnalysis(): Promise<void> {
    this.logger.log('Growth Engine - Running daily analysis...');
  }

  async analyzeCompany(companyProfile: any, metrics: any): Promise<GrowthAnalysis> {
    const profileStr = JSON.stringify({
      name: companyProfile.name || 'Entreprise',
      sector: companyProfile.sector || 'General',
      size: companyProfile.size || 'PME',
      country: companyProfile.country || 'Afrique de l Ouest',
      city: companyProfile.city || '',
      summary: companyProfile.interviewSummary || '',
      clients: companyProfile.targetClients || [],
      challenges: companyProfile.challenges || [],
      objectives: companyProfile.objectives || [],
    }, null, 2);

    const metricsStr = JSON.stringify(metrics, null, 2);

    const systemPrompt = 'Tu es un expert en strategie de croissance pour les PME africaines. Analyse l entreprise et propose un plan de croissance actionnable.\n\nPROFIL ENTREPRISE:\n' + profileStr + '\n\nMETRIQUES:\n' + metricsStr + '\n\nCONTEXTE MARCHE AFRICAIN:\n- Marche en croissance rapide\n- Digitalisation acceleree\n- Mobile-first\n- Concurrence locale et internationale\n- Fidelisation critique\n\nReponds UNIQUEMENT en JSON valide avec: marketPosition (strengths, weaknesses, opportunities, threats), recommendations (type, title, description, impactScore 1-10, effortScore 1-10, priority, actionPlan, expectedROI, timeframe), goals (metric, currentValue, targetValue, deadline, progress), competitorInsights.';

    try {
      const response = await this.llmService.generateResponse(systemPrompt, [
        { role: 'user', content: 'Analyse cette entreprise et propose un plan de croissance complet.' },
      ]);

      let jsonStr = response.replace(/```json/gi, '').replace(/```/g, '');
      const start = jsonStr.indexOf('{');
      const end = jsonStr.lastIndexOf('}');
      if (start >= 0 && end > start) {
        jsonStr = jsonStr.substring(start, end + 1);
        const parsed = JSON.parse(jsonStr);

        return {
          companyId: companyProfile.id,
          timestamp: new Date(),
          marketPosition: parsed.marketPosition || { strengths: [], weaknesses: [], opportunities: [], threats: [] },
          recommendations: (parsed.recommendations || []).map((r: any, i: number) => ({
            id: 'rec-' + Date.now() + '-' + i,
            type: r.type || 'general',
            title: r.title || 'Recommendation',
            description: r.description || '',
            impactScore: r.impactScore || 5,
            effortScore: r.effortScore || 5,
            priority: r.priority || 'medium',
            actionPlan: r.actionPlan || [],
            expectedROI: r.expectedROI || '',
            timeframe: r.timeframe || '3 mois',
          })),
          goals: (parsed.goals || []).map((g: any, i: number) => ({
            id: 'goal-' + Date.now() + '-' + i,
            metric: g.metric || '',
            currentValue: g.currentValue || 0,
            targetValue: g.targetValue || 0,
            deadline: new Date(g.deadline || Date.now() + 90 * 86400000),
            progress: g.progress || 0,
          })),
          competitorInsights: parsed.competitorInsights || [],
        };
      }
    } catch (error: any) {
      this.logger.error('Growth analysis failed: ' + error.message);
    }

    return {
      companyId: companyProfile.id,
      timestamp: new Date(),
      marketPosition: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
      recommendations: [],
      goals: [],
      competitorInsights: [],
    };
  }

  async detectOpportunities(companyProfile: any, marketData: any): Promise<GrowthRecommendation[]> {
    const systemPrompt = 'Tu es un detecteur d opportunites business pour les PME africaines. PROFIL: ' + (companyProfile.name || 'Entreprise') + ' (' + (companyProfile.sector || 'general') + '). Identifie 3-5 opportunites de croissance immediates. Reponds UNIQUEMENT en JSON: {opportunities:[{type,title,description,impactScore,effortScore,priority,actionPlan,expectedROI,timeframe}]}';

    try {
      const response = await this.llmService.generateResponse(systemPrompt, [
        { role: 'user', content: JSON.stringify({ profile: companyProfile, market: marketData }) },
      ]);

      let jsonStr = response.replace(/```json/gi, '').replace(/```/g, '');
      const start = jsonStr.indexOf('{');
      const end = jsonStr.lastIndexOf('}');
      if (start >= 0 && end > start) {
        jsonStr = jsonStr.substring(start, end + 1);
        const parsed = JSON.parse(jsonStr);
        return parsed.opportunities || [];
      }
    } catch (error: any) {
      this.logger.error('Opportunity detection failed: ' + error.message);
    }

    return [];
  }
}
