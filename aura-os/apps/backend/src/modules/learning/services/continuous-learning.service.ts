import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LlmService } from '../../agents/services/llm.service';
import { LearningEvent } from '../entities/learning-event.entity';
import { DetectedPattern } from '../entities/detected-pattern.entity';
import { SuggestedAction, SuggestedActionType, SuggestionPriority } from '../entities/suggested-action.entity';
import { PatternDetectorService } from './pattern-detector.service';
import { CreateLearningEventDto } from '../dto/create-learning-event.dto';
import { ReviewSuggestionDto } from '../dto/review-suggestion.dto';

export interface LearningResult {
  eventsProcessed: number;
  patternsDetected: number;
  suggestionsGenerated: number;
  autoAdapted: number;
  summary: string;
}

@Injectable()
export class ContinuousLearningService {
  private readonly logger = new Logger(ContinuousLearningService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly patternDetector: PatternDetectorService,
    @InjectRepository(LearningEvent)
    private readonly eventRepo: Repository<LearningEvent>,
    @InjectRepository(DetectedPattern)
    private readonly patternRepo: Repository<DetectedPattern>,
    @InjectRepository(SuggestedAction)
    private readonly suggestionRepo: Repository<SuggestedAction>,
  ) {}

  async recordEvent(dto: CreateLearningEventDto, companyId: string, userId?: string): Promise<LearningEvent> {
    const event = this.eventRepo.create({
      ...dto,
      companyId,
      userId: userId || null,
    });
    return this.eventRepo.save(event);
  }

  async getEvents(
    companyId: string,
    filters?: { category?: string; eventType?: string; impact?: string; page?: number; limit?: number },
  ): Promise<{ data: LearningEvent[]; total: number }> {
    const { category, eventType, impact, page = 1, limit = 20 } = filters || {};
    const query = this.eventRepo.createQueryBuilder('event').where('event.companyId = :companyId', { companyId });

    if (category) query.andWhere('event.category = :category', { category });
    if (eventType) query.andWhere('event.eventType = :eventType', { eventType });
    if (impact) query.andWhere('event.impact = :impact', { impact });

    const [data, total] = await query
      .orderBy('event.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async analyzeAndLearn(companyId: string): Promise<LearningResult> {
    const events = await this.eventRepo.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
      take: 200,
    });

    const patterns = await this.patternDetector.detectPatterns(companyId);
    const suggestions = await this.generateSuggestions(companyId);
    let autoAdapted = 0;

    for (const suggestion of suggestions) {
      if (this.shouldAutoAdapt(suggestion)) {
        await this.autoAdapt(suggestion);
        autoAdapted++;
      }
    }

    const result: LearningResult = {
      eventsProcessed: events.length,
      patternsDetected: patterns.length,
      suggestionsGenerated: suggestions.length,
      autoAdapted,
      summary: `Analyse terminée: ${events.length} événements traités, ${patterns.length} patterns détectés, ${suggestions.length} suggestions générées, ${autoAdapted} adaptations automatiques.`,
    };

    this.logger.log(result.summary);
    return result;
  }

  async generateSuggestions(companyId: string): Promise<SuggestedAction[]> {
    const patterns = await this.patternRepo.find({
      where: { companyId, isActive: true },
      order: { confidence: 'DESC' },
      take: 20,
    });

    const recentEvents = await this.eventRepo.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    if (patterns.length === 0 && recentEvents.length < 5) {
      return [];
    }

    const systemPrompt = `Tu es un consultant business intelligent pour AURA OS, un système d'exploitation d'entreprise en Afrique de l'Ouest.

En te basant sur les patterns détectés et les événements récents, génère des suggestions actionnables.

Patterns détectés:
${JSON.stringify(patterns.map(p => ({ name: p.name, type: p.patternType, confidence: p.confidence, data: p.data })))}

Événements récents:
${JSON.stringify(recentEvents.slice(0, 20).map(e => ({ type: e.eventType, category: e.category, description: e.description, impact: e.impact })))}

Génère des suggestions avec:
- Actions sûres (ajustement stock, descriptions produits) = auto-admissibles
- Actions critiques (licenciement, investissement majeur) = nécessitent approbation humaine

Réponds en JSON: [{"title":"...","description":"...","type":"create_agent|adjust_inventory|change_pricing|launch_campaign|hire_employee|cut_costs|invest|other","priority":"critical|high|medium|low","expectedImpact":{"metric":"...","currentValue":0,"expectedValue":0,"improvementPercent":0},"source":"pattern_detector","requiresApproval":boolean}]`;

    try {
      const response = await this.llmService.generateResponse(
        systemPrompt,
        [{ role: 'user', content: 'Génère des suggestions actionnables basées sur ces données.' }],
        { companyId },
      );

      const suggestions: Partial<SuggestedAction>[] = JSON.parse(response);
      const saved: SuggestedAction[] = [];

      for (const suggestion of suggestions) {
        const entity = await this.suggestionRepo.save(
          this.suggestionRepo.create({
            ...suggestion,
            companyId,
            status: 'pending',
            requiresApproval: suggestion.requiresApproval !== undefined ? suggestion.requiresApproval : true,
          }),
        );
        saved.push(entity);
      }

      return saved;
    } catch (error) {
      this.logger.error(`Error generating suggestions: ${error.message}`);
      return [];
    }
  }

  async reviewSuggestion(id: string, dto: ReviewSuggestionDto): Promise<SuggestedAction | null> {
    const suggestion = await this.suggestionRepo.findOne({ where: { id } });
    if (!suggestion) return null;

    suggestion.status = dto.status;
    if (dto.status === 'approved') {
      suggestion.approvedAt = new Date();
    }

    return this.suggestionRepo.save(suggestion);
  }

  async implementSuggestion(id: string, userId?: string): Promise<SuggestedAction | null> {
    const suggestion = await this.suggestionRepo.findOne({ where: { id } });
    if (!suggestion) return null;

    if (suggestion.requiresApproval && suggestion.status !== 'approved') {
      this.logger.warn(`Suggestion ${id} requires approval before implementation`);
      return suggestion;
    }

    suggestion.status = 'implemented';
    suggestion.implementedAt = new Date();
    suggestion.result = { implementedBy: userId, implementedAt: new Date() };

    this.logger.log(`Suggestion "${suggestion.title}" implemented for company ${suggestion.companyId}`);
    return this.suggestionRepo.save(suggestion);
  }

  async getSuggestions(companyId: string, status?: string): Promise<SuggestedAction[]> {
    const query = this.suggestionRepo.createQueryBuilder('s').where('s.companyId = :companyId', { companyId });
    if (status) query.andWhere('s.status = :status', { status });
    return query.orderBy('s.createdAt', 'DESC').getMany();
  }

  async getPatterns(companyId: string): Promise<DetectedPattern[]> {
    return this.patternRepo.find({
      where: { companyId, isActive: true },
      order: { confidence: 'DESC' },
    });
  }

  async getLearningDashboard(companyId: string): Promise<Record<string, any>> {
    const [eventsCount, patternsCount, suggestions, implementedCount] = await Promise.all([
      this.eventRepo.count({ where: { companyId } }),
      this.patternRepo.count({ where: { companyId, isActive: true } }),
      this.suggestionRepo.find({ where: { companyId } }),
      this.suggestionRepo.count({ where: { companyId, status: 'implemented' } }),
    ]);

    const pendingSuggestions = suggestions.filter(s => s.status === 'pending').length;
    const approvedSuggestions = suggestions.filter(s => s.status === 'approved').length;
    const rejectedSuggestions = suggestions.filter(s => s.status === 'rejected').length;

    const positiveEvents = await this.eventRepo.count({ where: { companyId, impact: 'positive' } });
    const negativeEvents = await this.eventRepo.count({ where: { companyId, impact: 'negative' } });

    return {
      eventsCount,
      patternsCount,
      suggestionsCount: suggestions.length,
      implementedCount,
      pendingSuggestions,
      approvedSuggestions,
      rejectedSuggestions,
      positiveEvents,
      negativeEvents,
      lastUpdated: new Date(),
    };
  }

  async getAutoAdaptationLog(companyId: string): Promise<Record<string, any>[]> {
    const implemented = await this.suggestionRepo.find({
      where: { companyId, status: 'implemented' },
      order: { implementedAt: 'DESC' },
      take: 50,
    });

    return implemented.map(s => ({
      id: s.id,
      title: s.title,
      type: s.type,
      implementedAt: s.implementedAt,
      result: s.result,
      source: s.source,
    }));
  }

  shouldAutoAdapt(suggestion: SuggestedAction): boolean {
    const autoAdaptableTypes = [
      SuggestedActionType.ADJUST_INVENTORY,
      SuggestedActionType.CHANGE_PRICING,
    ];

    if (autoAdaptableTypes.includes(suggestion.type as SuggestedActionType)) {
      return suggestion.priority !== SuggestionPriority.CRITICAL;
    }

    return false;
  }

  async autoAdapt(suggestion: SuggestedAction): Promise<void> {
    if (!this.shouldAutoAdapt(suggestion)) {
      return;
    }

    this.logger.log(`Auto-adapting suggestion: ${suggestion.title} (${suggestion.type})`);

    suggestion.status = 'implemented';
    suggestion.implementedAt = new Date();
    suggestion.result = {
      autoAdapted: true,
      adaptedAt: new Date(),
      note: 'Adaptation automatique par le système d\'apprentissage',
    };

    await this.suggestionRepo.save(suggestion);

    await this.recordEvent(
      {
        eventType: 'pattern_detected',
        category: 'operations',
        description: `Adaptation automatique: ${suggestion.title}`,
        data: { suggestionId: suggestion.id, type: suggestion.type },
        impact: 'positive',
        lesson: `Le système a automatiquement adapté: ${suggestion.title}`,
        actionTaken: `Action de type ${suggestion.type} implémentée automatiquement`,
      },
      suggestion.companyId,
    );
  }
}
