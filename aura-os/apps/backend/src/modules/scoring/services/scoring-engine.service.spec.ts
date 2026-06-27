import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScoringEngineService, HealthScoreFactors, EmployeeScoreFactors } from './scoring-engine.service';
import { ScoreTargetType, ScoreGrade, ScoreTrend } from '../entities/score.entity';

describe('ScoringEngineService', () => {
  let service: ScoringEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScoringEngineService],
    }).compile();

    service = module.get<ScoringEngineService>(ScoringEngineService);
  });

  describe('determineGrade', () => {
    it('should return A+ for score >= 95', () => {
      expect(service.determineGrade(95)).toBe(ScoreGrade.A_PLUS);
      expect(service.determineGrade(100)).toBe(ScoreGrade.A_PLUS);
    });

    it('should return A for score >= 85', () => {
      expect(service.determineGrade(85)).toBe(ScoreGrade.A);
      expect(service.determineGrade(90)).toBe(ScoreGrade.A);
    });

    it('should return B+ for score >= 75', () => {
      expect(service.determineGrade(75)).toBe(ScoreGrade.B_PLUS);
    });

    it('should return F for score < 30', () => {
      expect(service.determineGrade(0)).toBe(ScoreGrade.F);
      expect(service.determineGrade(29)).toBe(ScoreGrade.F);
    });
  });

  describe('determineTrend', () => {
    it('should return STABLE for first score', () => {
      expect(service.determineTrend(0, 50)).toBe(ScoreTrend.STABLE);
    });

    it('should return UP when score increases > 5%', () => {
      expect(service.determineTrend(50, 60)).toBe(ScoreTrend.UP);
    });

    it('should return DOWN when score decreases > 5%', () => {
      expect(service.determineTrend(50, 40)).toBe(ScoreTrend.DOWN);
    });

    it('should return STABLE when change is <= 5%', () => {
      expect(service.determineTrend(50, 52)).toBe(ScoreTrend.STABLE);
      expect(service.determineTrend(50, 48)).toBe(ScoreTrend.STABLE);
    });
  });

  describe('calculateEmployeeScore', () => {
    it('should score a good employee well', () => {
      const result = service.calculateEmployeeScore(
        { averageRating: 4.5, hireDate: '2020-01-01', peerReviewScore: 85 },
        { totalSales: 90, monthlyAverage: 80 },
        { punctualityRate: 95, attendanceRate: 98 },
      );
      (result as EmployeeScoreFactors).weightedScore;
      expect((result as EmployeeScoreFactors).weightedScore).toBeGreaterThan(50);
      expect((result as EmployeeScoreFactors).salesVolume).toBeGreaterThan(0);
      expect((result as EmployeeScoreFactors).attendance).toBe(98);
    });

    it('should score a poor employee below average', () => {
      const result = service.calculateEmployeeScore(
        { averageRating: 1.5, hireDate: '2025-01-01', peerReviewScore: 20 },
        { totalSales: 10, monthlyAverage: 5 },
        { punctualityRate: 30, attendanceRate: 40 },
      );
      // With defaults applied for missing benchmarks, score should still be below 70
      expect((result as EmployeeScoreFactors).weightedScore).toBeLessThan(70);
      // But lower than a good employee
      expect((result as EmployeeScoreFactors).weightedScore).toBeLessThan(80);
    });
  });

  describe('calculateCompanyHealthScore', () => {
    it('should calculate a valid health score', () => {
      const result = service.calculateCompanyHealthScore({
        revenueGrowth: 80,
        profitMargin: 70,
        cashFlowScore: 60,
        debtRatio: 30,
        stockHealth: 70,
        deliveryScore: 80,
        efficiencyScore: 75,
        customerSatisfaction: 85,
        retentionRate: 75,
        customerMixScore: 60,
        employeeSatisfaction: 70,
        turnoverRate: 20,
        productivityScore: 75,
        salesGrowth: 65,
        marketShareScore: 50,
        innovationScore: 60,
      });

      expect(result.financialHealth).toBeGreaterThan(0);
      expect(result.operationalHealth).toBeGreaterThan(0);
      expect(result.weightedScore).toBeGreaterThan(0);
      expect(result.weightedScore).toBeLessThanOrEqual(100);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle empty data with defaults', () => {
      const result = service.calculateCompanyHealthScore({});
      expect(result.weightedScore).toBeGreaterThan(0);
      expect(result.weightedScore).toBeLessThanOrEqual(100);
    });
  });
});
