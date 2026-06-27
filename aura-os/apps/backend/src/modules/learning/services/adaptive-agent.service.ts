import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../../agents/services/llm.service';

export interface AgentSuggestion {
  agentType: string;
  reason: string;
  expectedBenefit: string;
  priority: string;
  suggestedPrompt: string;
}

interface PerformanceTrend {
  agentId: string;
  period: string;
  metrics: {
    responseQuality: number;
    taskCompletionRate: number;
    userSatisfaction: number;
    errorRate: number;
  };
  trend: 'improving' | 'stable' | 'declining';
  recommendations: string[];
}

@Injectable()
export class AdaptiveAgentService {
  private readonly logger = new Logger(AdaptiveAgentService.name);

  constructor(
    private readonly llmService: LlmService,
  ) {}

  async adaptAgentBehavior(companyId: string, agentId: string, learningData: Record<string, any>): Promise<void> {
    this.logger.log(`Adapting agent ${agentId} for company ${companyId}`);

    const systemPrompt = `Tu est un expert en optimisation d'agents IA. En te basant sur les données d'apprentissage, suggère des ajustements au comportement de l'agent.

Données d'apprentissage:
${JSON.stringify(learningData)}

Réponds en JSON: {"adjustments":[{"parameter":"...","currentValue":"...","suggestedValue":"...","reason":"..."}]}`;

    try {
      const response = await this.llmService.generateResponse(
        systemPrompt,
        [{ role: 'user', content: 'Suggère des ajustements pour cet agent.' }],
        { companyId, agentId },
      );

      const result = JSON.parse(response);
      this.logger.log(`Agent adaptation result: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error(`Error adapting agent behavior: ${error.message}`);
    }
  }

  async suggestNewAgent(companyId: string): Promise<AgentSuggestion | null> {
    const systemPrompt = `Tu est un architecte de systèmes IA pour AURA OS. Analyse les opérations d'une entreprise et suggère si un nouvel agent IA serait bénéfique.

Considère les types d'agents:
- sales_agent: optimisation des ventes
- inventory_agent: gestion des stocks
- finance_agent: gestion financière
- crm_agent: relation client
- marketing_agent: marketing et campagnes
- hr_agent: gestion des employés
- delivery_agent: logistique et livraison
- market_intelligence_agent: analyse de marché
- learning_agent: apprentissage continu

Réponds en JSON: {"needed":boolean,"agentType":"...","reason":"...","expectedBenefit":"...","priority":"high|medium|low","suggestedPrompt":"..."}`;

    try {
      const response = await this.llmService.generateResponse(
        systemPrompt,
        [{ role: 'user', content: `Analyse si un nouvel agent est nécessaire pour l'entreprise ${companyId}.` }],
        { companyId },
      );

      const result = JSON.parse(response);
      if (result.needed) {
        return {
          agentType: result.agentType,
          reason: result.reason,
          expectedBenefit: result.expectedBenefit,
          priority: result.priority,
          suggestedPrompt: result.suggestedPrompt,
        };
      }
      return null;
    } catch (error) {
      this.logger.error(`Error suggesting new agent: ${error.message}`);
      return null;
    }
  }

  async optimizeAgentPrompts(companyId: string): Promise<void> {
    this.logger.log(`Optimizing agent prompts for company ${companyId}`);

    const systemPrompt = `Tu est un expert en prompt engineering. Optimise les prompts des agents IA pour une meilleure performance.

Génère des prompts optimisés qui:
- Sont plus précis et actionnables
- Incluent des exemples contextuels (Afrique de l'Ouest)
- Gèrent les cas limites
- Favorisent les réponses structurées

Réponds en JSON: {"optimizedPrompts":[{"agentType":"...","optimizedPrompt":"...","improvements":"..."}]}`;

    try {
      const response = await this.llmService.generateResponse(
        systemPrompt,
        [{ role: 'user', content: 'Optimise les prompts des agents pour cette entreprise.' }],
        { companyId },
      );

      const result = JSON.parse(response);
      this.logger.log(`Prompt optimization result: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error(`Error optimizing agent prompts: ${error.message}`);
    }
  }

  async getAgentPerformanceTrend(agentId: string): Promise<PerformanceTrend> {
    const systemPrompt = `Tu est un analyste de performance IA. Évalue la tendance de performance d'un agent.

Réponds en JSON: {"agentId":"...","period":"last_30_days","metrics":{"responseQuality":0-100,"taskCompletionRate":0-100,"userSatisfaction":0-100,"errorRate":0-100},"trend":"improving|stable|declining","recommendations":["..."]}`;

    try {
      const response = await this.llmService.generateResponse(
        systemPrompt,
        [{ role: 'user', content: `Évalue la performance de l'agent ${agentId}.` }],
        { agentId },
      );

      return JSON.parse(response);
    } catch (error) {
      this.logger.error(`Error getting agent performance trend: ${error.message}`);
      return {
        agentId,
        period: 'last_30_days',
        metrics: {
          responseQuality: 0,
          taskCompletionRate: 0,
          userSatisfaction: 0,
          errorRate: 0,
        },
        trend: 'stable',
        recommendations: ['Erreur lors de l\'évaluation.'],
      };
    }
  }
}
