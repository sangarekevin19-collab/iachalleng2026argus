import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LlmService } from '../../agents/services/llm.service';
import { LearningEvent } from '../entities/learning-event.entity';
import { DetectedPattern, PatternType } from '../entities/detected-pattern.entity';

@Injectable()
export class PatternDetectorService {
  private readonly logger = new Logger(PatternDetectorService.name);

  constructor(
    private readonly llmService: LlmService,
    @InjectRepository(LearningEvent)
    private readonly eventRepo: Repository<LearningEvent>,
    @InjectRepository(DetectedPattern)
    private readonly patternRepo: Repository<DetectedPattern>,
  ) {}

  async detectPatterns(companyId: string): Promise<DetectedPattern[]> {
    const events = await this.eventRepo.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
      take: 200,
    });

    if (events.length < 5) {
      this.logger.log(`Not enough events (${events.length}) for pattern detection for company ${companyId}`);
      return [];
    }

    const [salesPatterns, customerPatterns, operationalPatterns, anomalies] = await Promise.all([
      this.detectSalesPatterns(events),
      this.detectCustomerPatterns(events),
      this.detectOperationalPatterns(events),
      this.detectAnomalies(events),
    ]);

    const allPatterns = [...salesPatterns, ...customerPatterns, ...operationalPatterns, ...anomalies];
    const saved: DetectedPattern[] = [];

    for (const pattern of allPatterns) {
      const existing = await this.patternRepo.findOne({
        where: { companyId, name: pattern.name, patternType: pattern.patternType },
      });

      if (existing) {
        existing.confidence = pattern.confidence;
        existing.data = pattern.data;
        existing.lastSeenAt = new Date();
        existing.updatedAt = new Date();
        const updated = await this.patternRepo.save(existing);
        saved.push(updated);
      } else {
        const entity = await this.patternRepo.save(
          this.patternRepo.create({
            ...pattern,
            companyId,
            firstDetectedAt: new Date(),
            lastSeenAt: new Date(),
            isActive: true,
          }),
        );
        saved.push(entity);
      }
    }

    return saved;
  }

  async detectSalesPatterns(events: LearningEvent[]): Promise<Partial<DetectedPattern>[]> {
    const salesEvents = events.filter(e => e.category === 'sales');
    if (salesEvents.length < 3) return [];

    const hourlyDistribution: Record<number, number> = {};
    const dailyDistribution: Record<string, number> = {};
    const productFrequency: Record<string, number> = {};

    for (const event of salesEvents) {
      const hour = new Date(event.createdAt).getHours();
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;

      const day = new Date(event.createdAt).toLocaleDateString('fr-FR', { weekday: 'long' });
      dailyDistribution[day] = (dailyDistribution[day] || 0) + 1;

      if (event.data?.products) {
        for (const product of event.data.products) {
          const name = typeof product === 'string' ? product : product.name || product.productName;
          if (name) productFrequency[name] = (productFrequency[name] || 0) + 1;
        }
      }
    }

    const patterns: Partial<DetectedPattern>[] = [];

    const peakHours = Object.entries(hourlyDistribution)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour, 10));

    if (peakHours.length > 0) {
      patterns.push({
        name: 'Heures de pointe identifiées',
        description: `Les ventes sont concentrées aux heures: ${peakHours.join(', ')}h`,
        patternType: PatternType.SALES_CYCLE,
        confidence: 75,
        frequency: 'daily',
        data: { peakHours, hourlyDistribution },
      });
    }

    const peakDays = Object.entries(dailyDistribution)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([day]) => day);

    if (peakDays.length > 0) {
      patterns.push({
        name: 'Jours de pointe identifiés',
        description: `Les meilleurs jours de vente: ${peakDays.join(', ')}`,
        patternType: PatternType.SALES_CYCLE,
        confidence: 70,
        frequency: 'weekly',
        data: { peakDays, dailyDistribution },
      });
    }

    const topProducts = Object.entries(productFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    if (topProducts.length > 0) {
      patterns.push({
        name: 'Produits les plus vendus',
        description: `Produits phares: ${topProducts.map(([p]) => p).join(', ')}`,
        patternType: PatternType.SALES_CYCLE,
        confidence: 85,
        frequency: 'weekly',
        data: { topProducts },
      });
    }

    const systemPrompt = `Tu es un analyste de données de vente en Afrique de l'Ouest. Analyse les événements de vente suivants et identifie les patterns :

${JSON.stringify(salesEvents.slice(0, 30).map(e => ({ type: e.eventType, description: e.description, data: e.data, createdAt: e.createdAt })))}

Identifie des patterns de vente comme:
- Tendances saisonnières (Tabaski, Ramadan, récoltes, rentrée scolaire)
- Correlations entre jours et produits
- Cycles de vente récurrents

Réponds en JSON: [{"name":"...","description":"...","patternType":"sales_cycle","confidence":0-100,"frequency":"daily|weekly|monthly|seasonal","data":{...}}]`;

    try {
      const response = await this.llmService.generateResponse(
        systemPrompt,
        [{ role: 'user', content: 'Analyse ces données de vente et identifie les patterns.' }],
        { eventCount: salesEvents.length },
      );

      const llmPatterns: Partial<DetectedPattern>[] = JSON.parse(response);
      patterns.push(...llmPatterns);
    } catch (error) {
      this.logger.warn(`LLM pattern detection failed: ${error.message}`);
    }

    return patterns;
  }

  async detectCustomerPatterns(events: LearningEvent[]): Promise<Partial<DetectedPattern>[]> {
    const customerEvents = events.filter(e => e.category === 'customer');
    if (customerEvents.length < 3) return [];

    const patterns: Partial<DetectedPattern>[] = [];

    const positiveEvents = customerEvents.filter(e => e.impact === 'positive');
    const negativeEvents = customerEvents.filter(e => e.impact === 'negative');
    const sentimentRatio = customerEvents.length > 0 ? positiveEvents.length / customerEvents.length : 0.5;

    patterns.push({
      name: 'Ratio de satisfaction client',
      description: `${Math.round(sentimentRatio * 100)}% d'interactions positives`,
      patternType: PatternType.CUSTOMER_BEHAVIOR,
      confidence: 80,
      frequency: 'weekly',
      data: {
        positiveCount: positiveEvents.length,
        negativeCount: negativeEvents.length,
        ratio: sentimentRatio,
        churnRisk: sentimentRatio < 0.5 ? 'high' : sentimentRatio < 0.7 ? 'medium' : 'low',
      },
    });

    if (negativeEvents.length >= 3) {
      patterns.push({
        name: 'Signaux de risque de churn',
        description: `${negativeEvents.length} interactions négatives détectées`,
        patternType: PatternType.CUSTOMER_BEHAVIOR,
        confidence: Math.min(95, 50 + negativeEvents.length * 5),
        frequency: 'weekly',
        data: { negativeEvents: negativeEvents.map(e => ({ description: e.description, date: e.createdAt })) },
      });
    }

    return patterns;
  }

  async detectOperationalPatterns(events: LearningEvent[]): Promise<Partial<DetectedPattern>[]> {
    const opsEvents = events.filter(e => e.category === 'operations' || e.category === 'inventory');
    if (opsEvents.length < 3) return [];

    const patterns: Partial<DetectedPattern>[] = [];
    const errorEvents = opsEvents.filter(e => e.eventType === 'error_occurred');

    if (errorEvents.length >= 2) {
      patterns.push({
        name: 'Erreurs opérationnelles récurrentes',
        description: `${errorEvents.length} erreurs détectées dans les opérations`,
        patternType: PatternType.OPERATIONAL,
        confidence: Math.min(90, 50 + errorEvents.length * 10),
        frequency: 'weekly',
        data: {
          errorCount: errorEvents.length,
          recentErrors: errorEvents.slice(0, 5).map(e => ({ description: e.description, date: e.createdAt })),
        },
      });
    }

    const stockEvents = opsEvents.filter(e => e.eventType === 'stock_adjusted');
    if (stockEvents.length >= 3) {
      patterns.push({
        name: 'Ajustements de stock fréquents',
        description: `${stockEvents.length} ajustements de stock récents`,
        patternType: PatternType.OPERATIONAL,
        confidence: 70,
        frequency: 'weekly',
        data: { adjustmentCount: stockEvents.length },
      });
    }

    return patterns;
  }

  async detectAnomalies(events: LearningEvent[]): Promise<Partial<DetectedPattern>[]> {
    if (events.length < 10) return [];

    const patterns: Partial<DetectedPattern>[] = [];
    const salesEvents = events.filter(e => e.eventType === 'sale_made');

    if (salesEvents.length >= 5) {
      const saleValues = salesEvents
        .filter(e => e.data?.total || e.data?.amount || e.data?.revenue)
        .map(e => Number(e.data.total || e.data.amount || e.data.revenue));

      if (saleValues.length >= 5) {
        const mean = saleValues.reduce((a, b) => a + b, 0) / saleValues.length;
        const stdDev = Math.sqrt(saleValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / saleValues.length);

        for (let i = 0; i < saleValues.length; i++) {
          const zScore = stdDev > 0 ? (saleValues[i] - mean) / stdDev : 0;
          if (Math.abs(zScore) > 2) {
            patterns.push({
              name: `Anomalie de vente détectée (${zScore > 0 ? 'pic' : 'creux'})`,
              description: `Vente de ${saleValues[i]}XOF détectée comme ${zScore > 0 ? 'anormalement haute' : 'anormalement basse'} (moyenne: ${Math.round(mean)}XOF)`,
              patternType: PatternType.ANOMALY,
              confidence: Math.min(95, Math.round(Math.abs(zScore) * 25)),
              frequency: 'daily',
              data: { value: saleValues[i], mean, zScore, date: salesEvents[i]?.createdAt },
            });
          }
        }
      }
    }

    const cancelledSales = events.filter(e => e.eventType === 'sale_cancelled');
    if (cancelledSales.length >= 3) {
      patterns.push({
        name: 'Taux d\'annulation élevé',
        description: `${cancelledSales.length} ventes annullées détectées`,
        patternType: PatternType.ANOMALY,
        confidence: Math.min(90, 50 + cancelledSales.length * 8),
        frequency: 'weekly',
        data: {
          cancelledCount: cancelledSales.length,
          totalSales: salesEvents.length,
          cancelRate: salesEvents.length > 0 ? cancelledSales.length / salesEvents.length : 0,
        },
      });
    }

    return patterns;
  }
}
