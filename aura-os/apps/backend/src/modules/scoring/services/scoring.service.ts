import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Score, ScoreTargetType, ScoreTrend, ScoreGrade } from '../entities/score.entity';
import { ScoreHistory } from '../entities/score-history.entity';
import { CalculateScoreDto } from '../dto/calculate-score.dto';
import { UpdateScoreDto } from '../dto/update-score.dto';
import { ScoreFilterDto } from '../dto/score-filter.dto';
import { ScoringEngineService, HealthScoreFactors } from './scoring-engine.service';

@Injectable()
export class ScoringService {
  constructor(
    @InjectRepository(Score)
    private scoresRepository: Repository<Score>,
    @InjectRepository(ScoreHistory)
    private scoreHistoryRepository: Repository<ScoreHistory>,
    private scoringEngine: ScoringEngineService,
  ) {}

  async calculateAndSaveScore(
    companyId: string,
    dto: CalculateScoreDto,
    calculatedBy: string = 'system',
  ): Promise<Score> {
    const existingScore = await this.scoresRepository.findOne({
      where: {
        companyId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        category: dto.category,
      },
    });

    const calculation = this.scoringEngine.calculateScore(
      dto.targetType,
      dto.targetId,
      dto.factors,
    );

    const previousScore = existingScore ? Number(existingScore.score) : 0;
    const trend = this.scoringEngine.determineTrend(previousScore, calculation.score);

    if (existingScore) {
      const historyEntry = this.scoreHistoryRepository.create({
        scoreId: existingScore.id,
        companyId,
        previousScore,
        newScore: calculation.score,
        changeReason: {
          factors: dto.factors,
          previousFactors: existingScore.factors,
          changeType: 'recalculation',
        },
      });
      await this.scoreHistoryRepository.save(historyEntry);

      existingScore.previousScore = previousScore;
      existingScore.score = calculation.score;
      existingScore.trend = trend;
      existingScore.grade = calculation.grade;
      existingScore.factors = calculation.factors;
      existingScore.calculatedBy = calculatedBy;
      existingScore.notes = dto.notes || existingScore.notes;
      existingScore.calculatedAt = new Date();

      return this.scoresRepository.save(existingScore);
    }

    const newScore = this.scoresRepository.create({
      companyId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      targetName: dto.targetName,
      category: dto.category,
      score: calculation.score,
      previousScore: 0,
      trend,
      grade: calculation.grade,
      factors: calculation.factors,
      weight: 1,
      calculatedBy,
      notes: dto.notes,
      calculatedAt: new Date(),
    });

    return this.scoresRepository.save(newScore);
  }

  async getScores(companyId: string, filters: ScoreFilterDto): Promise<{ data: Score[]; total: number }> {
    const query = this.scoresRepository.createQueryBuilder('score').where('score.companyId = :companyId', { companyId });

    if (filters.targetType) {
      query.andWhere('score.targetType = :targetType', { targetType: filters.targetType });
    }
    if (filters.category) {
      query.andWhere('score.category = :category', { category: filters.category });
    }
    if (filters.grade) {
      query.andWhere('score.grade = :grade', { grade: filters.grade });
    }
    if (filters.minScore !== undefined) {
      query.andWhere('score.score >= :minScore', { minScore: filters.minScore });
    }
    if (filters.maxScore !== undefined) {
      query.andWhere('score.score <= :maxScore', { maxScore: filters.maxScore });
    }

    const sortBy = filters.sortBy || 'score';
    const sortOrder = sortBy.startsWith('-') ? 'ASC' : 'DESC';
    const sortField = sortBy.replace('-', '');
    query.orderBy(`score.${sortField}`, sortOrder);

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    query.skip((page - 1) * limit).take(limit);

    const [data, total] = await query.getManyAndCount();
    return { data, total };
  }

  async getScoreById(id: string): Promise<Score> {
    const score = await this.scoresRepository.findOne({ where: { id } });
    if (!score) {
      throw new NotFoundException(`Score with id ${id} not found`);
    }
    return score;
  }

  async getScoreHistory(scoreId: string): Promise<ScoreHistory[]> {
    return this.scoreHistoryRepository.find({
      where: { scoreId },
      order: { createdAt: 'DESC' },
    });
  }

  async getTargetScore(companyId: string, targetType: ScoreTargetType, targetId: string): Promise<Score | null> {
    return this.scoresRepository.findOne({
      where: { companyId, targetType, targetId },
      order: { updatedAt: 'DESC' },
    });
  }

  async updateScoreManually(id: string, dto: UpdateScoreDto, userId: string): Promise<Score> {
    const score = await this.getScoreById(id);

    const previousScore = Number(score.score);

    if (dto.score !== undefined) {
      const historyEntry = this.scoreHistoryRepository.create({
        scoreId: id,
        companyId: score.companyId,
        previousScore,
        newScore: dto.score,
        changeReason: {
          changeType: 'manual',
          changedBy: userId,
          previousFactors: score.factors,
          newFactors: dto.factors || score.factors,
        },
      });
      await this.scoreHistoryRepository.save(historyEntry);

      score.previousScore = previousScore;
      score.score = dto.score;
      score.grade = this.scoringEngine.determineGrade(dto.score);
      score.trend = this.scoringEngine.determineTrend(previousScore, dto.score);
      score.calculatedBy = userId;
    }

    if (dto.factors) {
      score.factors = { ...score.factors, ...dto.factors };
    }

    if (dto.notes !== undefined) {
      score.notes = dto.notes;
    }

    score.calculatedAt = new Date();

    return this.scoresRepository.save(score);
  }

  async recalculateAllScores(companyId: string): Promise<void> {
    const scores = await this.scoresRepository.find({ where: { companyId } });

    for (const score of scores) {
      const calculation = this.scoringEngine.calculateScore(
        score.targetType,
        score.targetId,
        score.factors,
      );

      const previousScore = Number(score.score);
      const trend = this.scoringEngine.determineTrend(previousScore, calculation.score);

      const historyEntry = this.scoreHistoryRepository.create({
        scoreId: score.id,
        companyId,
        previousScore,
        newScore: calculation.score,
        changeReason: {
          changeType: 'batch_recalculation',
          previousFactors: score.factors,
        },
      });
      await this.scoreHistoryRepository.save(historyEntry);

      score.previousScore = previousScore;
      score.score = calculation.score;
      score.trend = trend;
      score.grade = calculation.grade;
      score.factors = calculation.factors;
      score.calculatedAt = new Date();

      await this.scoresRepository.save(score);
    }
  }

  async getTopScores(companyId: string, targetType: ScoreTargetType, limit: number = 10): Promise<Score[]> {
    return this.scoresRepository.find({
      where: { companyId, targetType },
      order: { score: 'DESC' },
      take: limit,
    });
  }

  async getBottomScores(companyId: string, targetType: ScoreTargetType, limit: number = 10): Promise<Score[]> {
    return this.scoresRepository.find({
      where: { companyId, targetType },
      order: { score: 'ASC' },
      take: limit,
    });
  }

  async getScoreDistribution(companyId: string, targetType: ScoreTargetType): Promise<{ grade: ScoreGrade; count: number }[]> {
    const scores = await this.scoresRepository.find({
      where: { companyId, targetType },
    });

    const distribution: Record<string, number> = {};
    for (const grade of Object.values(ScoreGrade)) {
      distribution[grade] = 0;
    }

    for (const score of scores) {
      distribution[score.grade] = (distribution[score.grade] || 0) + 1;
    }

    return Object.entries(distribution).map(([grade, count]) => ({
      grade: grade as ScoreGrade,
      count,
    }));
  }

  async getCompanyHealth(companyId: string): Promise<HealthScoreFactors> {
    const healthScore = await this.scoresRepository.findOne({
      where: {
        companyId,
        targetType: ScoreTargetType.COMPANY,
      },
      order: { updatedAt: 'DESC' },
    });

    if (healthScore && healthScore.factors) {
      return healthScore.factors as unknown as HealthScoreFactors;
    }

    return this.scoringEngine.calculateCompanyHealthScore({});
  }

  async getImprovementRecommendations(
    companyId: string,
    targetType: ScoreTargetType,
    targetId: string,
  ): Promise<string[]> {
    const score = await this.getTargetScore(companyId, targetType, targetId);
    if (!score) {
      return ['Aucune donnée de notation disponible pour cette cible.'];
    }

    const recommendations: string[] = [];
    const factors = score.factors;

    if (targetType === ScoreTargetType.EMPLOYEE) {
      if ((factors.salesVolume || 0) < 50) {
        recommendations.push('Augmenter le volume de ventes : fixer des objectifs hebdomadaires et suivre les performances.');
      }
      if ((factors.punctuality || 0) < 70) {
        recommendations.push('Améliorer la ponctualité : mettre en place un système de rappels et de suivi des horaires.');
      }
      if ((factors.customerRating || 0) < 60) {
        recommendations.push('Améliorer la satisfaction client : formation sur le service client et feedback régulier.');
      }
      if ((factors.attendance || 0) < 70) {
        recommendations.push('Améliorer la présence : identifier les causes d\'absence et mettre en place des solutions.');
      }
    }

    if (targetType === ScoreTargetType.PRODUCT) {
      if ((factors.salesVelocity || 0) < 50) {
        recommendations.push('Stimuler les ventes : revoir la stratégie de prix et augmenter la visibilité du produit.');
      }
      if ((factors.margin || 0) < 50) {
        recommendations.push('Améliorer la marge : renégocier le prix d\'achat ou augmenter le prix de vente.');
      }
      if ((factors.stockTurnover || 0) < 50) {
        recommendations.push('Optimiser la rotation des stocks : ajuster les quantités commandées et les promotions.');
      }
    }

    if (targetType === ScoreTargetType.CUSTOMER) {
      if ((factors.purchaseFrequency || 0) < 50) {
        recommendations.push('Augmenter la fréquence d\'achat : offrir des promotions personnalisées et des rappels.');
      }
      if ((factors.paymentPunctuality || 0) < 70) {
        recommendations.push('Améliorer la ponctualité des paiements : mettre en place des rappels automatiques et des pénalités.');
      }
      if ((factors.loyalty || 0) < 50) {
        recommendations.push('Renforcer la fidélité : créer un programme de fidélité avec des avantages exclusifs.');
      }
    }

    if (targetType === ScoreTargetType.SUPPLIER) {
      if ((factors.deliveryPunctuality || 0) < 70) {
        recommendations.push('Améliorer la ponctualité des livraisons : renégocier les délais et suivre les performances.');
      }
      if ((factors.quality || 0) < 70) {
        recommendations.push('Améliorer la qualité : mettre en place des contrôles qualité plus stricts.');
      }
    }

    if (targetType === ScoreTargetType.COMPANY) {
      const healthFactors = factors as unknown as HealthScoreFactors;
      if (healthFactors.recommendations) {
        return healthFactors.recommendations;
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Les performances sont satisfaisantes. Continuer à maintenir les standards actuels.');
    }

    return recommendations;
  }

  async generateScoreReport(companyId: string): Promise<any> {
    const allScores = await this.scoresRepository.find({ where: { companyId } });

    const report = {
      companyId,
      generatedAt: new Date(),
      summary: {
        totalScores: allScores.length,
        averageScore: 0,
        gradeDistribution: {} as Record<string, number>,
        trendDistribution: { up: 0, down: 0, stable: 0 },
      },
      byType: {} as Record<string, { count: number; averageScore: number; topPerformer: string; bottomPerformer: string }>,
      healthScore: null as HealthScoreFactors | null,
      topPerformers: {} as Record<string, Score[]>,
      bottomPerformers: {} as Record<string, Score[]>,
    };

    if (allScores.length > 0) {
      report.summary.averageScore =
        Math.round((allScores.reduce((sum, s) => sum + Number(s.score), 0) / allScores.length) * 100) / 100;
    }

    for (const score of allScores) {
      report.summary.gradeDistribution[score.grade] = (report.summary.gradeDistribution[score.grade] || 0) + 1;
      report.summary.trendDistribution[score.trend]++;

      if (!report.byType[score.targetType]) {
        report.byType[score.targetType] = { count: 0, averageScore: 0, topPerformer: '', bottomPerformer: '' };
      }
      report.byType[score.targetType].count++;
    }

    for (const type of Object.values(ScoreTargetType)) {
      const typeScores = allScores.filter((s) => s.targetType === type);
      if (typeScores.length > 0) {
        const sorted = [...typeScores].sort((a, b) => Number(b.score) - Number(a.score));
        report.byType[type].averageScore =
          Math.round((typeScores.reduce((sum, s) => sum + Number(s.score), 0) / typeScores.length) * 100) / 100;
        report.byType[type].topPerformer = sorted[0]?.targetName || '';
        report.byType[type].bottomPerformer = sorted[sorted.length - 1]?.targetName || '';
        report.topPerformers[type] = sorted.slice(0, 5);
        report.bottomPerformers[type] = sorted.slice(-5).reverse();
      }
    }

    report.healthScore = await this.getCompanyHealth(companyId);

    return report;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async autoRecalculateScores(): Promise<void> {
    const companies = await this.scoresRepository
      .createQueryBuilder('score')
      .select('DISTINCT score.companyId', 'companyId')
      .getRawMany();

    for (const { companyId } of companies) {
      await this.recalculateAllScores(companyId);
    }
  }
}
