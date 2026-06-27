import { Injectable } from '@nestjs/common';
import { ScoreTargetType, ScoreGrade, ScoreTrend } from '../entities/score.entity';

export interface EmployeeScoreFactors {
  salesVolume: number;
  punctuality: number;
  customerRating: number;
  attendance: number;
  seniority: number;
  peerReview: number;
  weightedScore: number;
}

export interface ProductScoreFactors {
  salesVelocity: number;
  margin: number;
  stockTurnover: number;
  returnRate: number;
  popularity: number;
  shelfLife: number;
  weightedScore: number;
}

export interface CustomerScoreFactors {
  purchaseFrequency: number;
  totalSpent: number;
  paymentPunctuality: number;
  loyalty: number;
  referralRate: number;
  weightedScore: number;
}

export interface SupplierScoreFactors {
  deliveryPunctuality: number;
  quality: number;
  priceCompetitiveness: number;
  responsiveness: number;
  defectRate: number;
  weightedScore: number;
}

export interface HealthScoreFactors {
  financialHealth: number;
  financialDetails: {
    revenueGrowth: number;
    profitMargin: number;
    cashFlow: number;
    debtRatio: number;
  };
  operationalHealth: number;
  operationalDetails: {
    stockLevels: number;
    deliveryPerformance: number;
    processEfficiency: number;
  };
  customerHealth: number;
  customerDetails: {
    satisfaction: number;
    retentionRate: number;
    newVsReturning: number;
  };
  teamHealth: number;
  teamDetails: {
    satisfaction: number;
    turnoverRate: number;
    productivity: number;
  };
  growthHealth: number;
  growthDetails: {
    salesGrowth: number;
    marketShare: number;
    innovation: number;
  };
  weightedScore: number;
  recommendations: string[];
}

export interface ScoreCalculation {
  score: number;
  factors: Record<string, any>;
  grade: ScoreGrade;
  trend: ScoreTrend;
}

@Injectable()
export class ScoringEngineService {
  calculateScore(
    targetType: ScoreTargetType,
    targetId: string,
    targetData: any,
  ): ScoreCalculation {
    switch (targetType) {
      case ScoreTargetType.EMPLOYEE:
        return this.buildCalculation(
          this.calculateEmployeeScore(
            targetData.employeeData || {},
            targetData.salesData || {},
            targetData.attendanceData || {},
          ),
        );
      case ScoreTargetType.PRODUCT:
        return this.buildCalculation(
          this.calculateProductScore(
            targetData.productData || {},
            targetData.salesData || {},
            targetData.inventoryData || {},
          ),
        );
      case ScoreTargetType.CUSTOMER:
        return this.buildCalculation(
          this.calculateCustomerScore(
            targetData.customerData || {},
            targetData.purchaseHistory || {},
            targetData.paymentHistory || {},
          ),
        );
      case ScoreTargetType.SUPPLIER:
        return this.buildCalculation(
          this.calculateSupplierScore(
            targetData.supplierData || {},
            targetData.deliveryHistory || {},
            targetData.qualityData || {},
          ),
        );
      case ScoreTargetType.COMPANY:
        return this.buildHealthCalculation(
          this.calculateCompanyHealthScore(targetData || {}),
        );
      default:
        return { score: 0, factors: {}, grade: ScoreGrade.F, trend: ScoreTrend.STABLE };
    }
  }

  private buildCalculation(
    factors: EmployeeScoreFactors | ProductScoreFactors | CustomerScoreFactors | SupplierScoreFactors,
  ): ScoreCalculation {
    const weightedScore = Math.round(factors.weightedScore * 100) / 100;
    return {
      score: weightedScore,
      factors: { ...factors },
      grade: this.determineGrade(weightedScore),
      trend: ScoreTrend.STABLE,
    };
  }

  private buildHealthCalculation(health: HealthScoreFactors): ScoreCalculation {
    const weightedScore = Math.round(health.weightedScore * 100) / 100;
    return {
      score: weightedScore,
      factors: {
        financialHealth: health.financialHealth,
        financialDetails: health.financialDetails,
        operationalHealth: health.operationalHealth,
        operationalDetails: health.operationalDetails,
        customerHealth: health.customerHealth,
        customerDetails: health.customerDetails,
        teamHealth: health.teamHealth,
        teamDetails: health.teamDetails,
        growthHealth: health.growthHealth,
        growthDetails: health.growthDetails,
        recommendations: health.recommendations,
      },
      grade: this.determineGrade(weightedScore),
      trend: ScoreTrend.STABLE,
    };
  }

  calculateEmployeeScore(
    employeeData: any,
    salesData: any,
    attendanceData: any,
  ): EmployeeScoreFactors {
    const salesVolume = this.normalize(
      salesData.totalSales || salesData.monthlyAverage || 0,
      0,
      salesData.benchmark || 100,
    );
    const punctuality = attendanceData.punctualityRate ?? attendanceData.onTimePercentage ?? 80;
    const customerRating = this.normalize(
      (employeeData.averageRating || 3),
      1,
      5,
    ) * 20;
    const attendance = attendanceData.attendanceRate ?? attendanceData.daysPresent ?? 85;
    const seniority = this.calculateSeniorityScore(employeeData.hireDate);
    const peerReview = employeeData.peerReviewScore ?? employeeData.teamRating ?? 70;

    const weightedScore =
      salesVolume * 0.30 +
      punctuality * 0.20 +
      customerRating * 0.15 +
      attendance * 0.20 +
      seniority * 0.10 +
      peerReview * 0.05;

    return {
      salesVolume: Math.round(salesVolume * 100) / 100,
      punctuality: Math.round(punctuality * 100) / 100,
      customerRating: Math.round(customerRating * 100) / 100,
      attendance: Math.round(attendance * 100) / 100,
      seniority: Math.round(seniority * 100) / 100,
      peerReview: Math.round(peerReview * 100) / 100,
      weightedScore: Math.min(100, Math.max(0, weightedScore)),
    };
  }

  calculateProductScore(
    productData: any,
    salesData: any,
    inventoryData: any,
  ): ProductScoreFactors {
    const salesVelocity = this.normalize(
      salesData.unitsSold || salesData.velocity || 0,
      0,
      salesData.benchmark || 200,
    );
    const margin = this.calculateMarginScore(productData.price, productData.costPrice);
    const stockTurnover = this.normalize(
      inventoryData.turnoverRate || inventoryData.annualTurnover || 0,
      0,
      12,
    ) * 100 / 12;
    const returnRate = this.calculateReturnRateScore(
      salesData.returnedUnits || 0,
      salesData.totalUnits || 1,
    );
    const popularity = this.normalize(
      salesData.popularityScore || salesData.views || salesData.wishlistCount || 0,
      0,
      salesData.popularityBenchmark || 500,
    );
    const shelfLife = this.calculateShelfLifeScore(productData.expiryDate, productData.createdAt);

    const weightedScore =
      salesVelocity * 0.25 +
      margin * 0.20 +
      stockTurnover * 0.20 +
      returnRate * 0.15 +
      popularity * 0.10 +
      shelfLife * 0.10;

    return {
      salesVelocity: Math.round(salesVelocity * 100) / 100,
      margin: Math.round(margin * 100) / 100,
      stockTurnover: Math.round(stockTurnover * 100) / 100,
      returnRate: Math.round(returnRate * 100) / 100,
      popularity: Math.round(popularity * 100) / 100,
      shelfLife: Math.round(shelfLife * 100) / 100,
      weightedScore: Math.min(100, Math.max(0, weightedScore)),
    };
  }

  calculateCustomerScore(
    customerData: any,
    purchaseHistory: any,
    paymentHistory: any,
  ): CustomerScoreFactors {
    const purchaseFrequency = this.normalize(
      purchaseHistory.orderCount || purchaseHistory.frequency || 0,
      0,
      purchaseHistory.benchmark || 50,
    );
    const totalSpent = this.normalize(
      purchaseHistory.totalAmount || customerData.totalSpent || 0,
      0,
      purchaseHistory.spendingBenchmark || 10000,
    );
    const paymentPunctuality = this.calculatePaymentPunctuality(paymentHistory);
    const loyalty = this.calculateLoyaltyScore(customerData.firstPurchaseAt, purchaseHistory.orderCount);
    const referralRate = this.normalize(
      purchaseHistory.referralCount || customerData.referrals || 0,
      0,
      20,
    );

    const weightedScore =
      purchaseFrequency * 0.20 +
      totalSpent * 0.25 +
      paymentPunctuality * 0.25 +
      loyalty * 0.15 +
      referralRate * 0.15;

    return {
      purchaseFrequency: Math.round(purchaseFrequency * 100) / 100,
      totalSpent: Math.round(totalSpent * 100) / 100,
      paymentPunctuality: Math.round(paymentPunctuality * 100) / 100,
      loyalty: Math.round(loyalty * 100) / 100,
      referralRate: Math.round(referralRate * 100) / 100,
      weightedScore: Math.min(100, Math.max(0, weightedScore)),
    };
  }

  calculateSupplierScore(
    supplierData: any,
    deliveryHistory: any,
    qualityData: any,
  ): SupplierScoreFactors {
    const deliveryPunctuality = this.normalize(
      deliveryHistory.onTimeDeliveries || 0,
      0,
      deliveryHistory.totalDeliveries || 1,
    ) * 100;
    const quality = qualityData.qualityScore ?? qualityData.inspectionScore ?? 75;
    const priceCompetitiveness = this.normalize(
      supplierData.priceScore || 70,
      0,
      100,
    );
    const responsiveness = supplierData.responseTimeScore ?? qualityData.communicationScore ?? 70;
    const defectRate = this.calculateDefectRateScore(
      qualityData.defectiveUnits || 0,
      qualityData.totalUnitsReceived || 1,
    );

    const weightedScore =
      deliveryPunctuality * 0.30 +
      quality * 0.25 +
      priceCompetitiveness * 0.20 +
      responsiveness * 0.15 +
      defectRate * 0.10;

    return {
      deliveryPunctuality: Math.round(deliveryPunctuality * 100) / 100,
      quality: Math.round(quality * 100) / 100,
      priceCompetitiveness: Math.round(priceCompetitiveness * 100) / 100,
      responsiveness: Math.round(responsiveness * 100) / 100,
      defectRate: Math.round(defectRate * 100) / 100,
      weightedScore: Math.min(100, Math.max(0, weightedScore)),
    };
  }

  calculateCompanyHealthScore(companyData: any): HealthScoreFactors {
    const financialDetails = {
      revenueGrowth: this.clamp(companyData.revenueGrowth ?? companyData.financial?.revenueGrowth ?? 50),
      profitMargin: this.clamp(companyData.profitMargin ?? companyData.financial?.profitMargin ?? 50),
      cashFlow: this.clamp(companyData.cashFlowScore ?? companyData.financial?.cashFlow ?? 50),
      debtRatio: this.clamp(100 - (companyData.debtRatio ?? companyData.financial?.debtRatio ?? 50)),
    };
    const financialHealth =
      financialDetails.revenueGrowth * 0.30 +
      financialDetails.profitMargin * 0.30 +
      financialDetails.cashFlow * 0.20 +
      financialDetails.debtRatio * 0.20;

    const operationalDetails = {
      stockLevels: this.clamp(companyData.stockHealth ?? companyData.operational?.stockLevels ?? 60),
      deliveryPerformance: this.clamp(companyData.deliveryScore ?? companyData.operational?.deliveryPerformance ?? 70),
      processEfficiency: this.clamp(companyData.efficiencyScore ?? companyData.operational?.processEfficiency ?? 65),
    };
    const operationalHealth =
      operationalDetails.stockLevels * 0.35 +
      operationalDetails.deliveryPerformance * 0.35 +
      operationalDetails.processEfficiency * 0.30;

    const customerDetails = {
      satisfaction: this.clamp(companyData.customerSatisfaction ?? companyData.customer?.satisfaction ?? 70),
      retentionRate: this.clamp(companyData.retentionRate ?? companyData.customer?.retentionRate ?? 65),
      newVsReturning: this.clamp(companyData.customerMixScore ?? companyData.customer?.newVsReturning ?? 50),
    };
    const customerHealth =
      customerDetails.satisfaction * 0.40 +
      customerDetails.retentionRate * 0.35 +
      customerDetails.newVsReturning * 0.25;

    const teamDetails = {
      satisfaction: this.clamp(companyData.employeeSatisfaction ?? companyData.team?.satisfaction ?? 70),
      turnoverRate: this.clamp(100 - (companyData.turnoverRate ?? companyData.team?.turnoverRate ?? 30)),
      productivity: this.clamp(companyData.productivityScore ?? companyData.team?.productivity ?? 65),
    };
    const teamHealth =
      teamDetails.satisfaction * 0.35 +
      teamDetails.turnoverRate * 0.35 +
      teamDetails.productivity * 0.30;

    const growthDetails = {
      salesGrowth: this.clamp(companyData.salesGrowth ?? companyData.growth?.salesGrowth ?? 55),
      marketShare: this.clamp(companyData.marketShareScore ?? companyData.growth?.marketShare ?? 50),
      innovation: this.clamp(companyData.innovationScore ?? companyData.growth?.innovation ?? 45),
    };
    const growthHealth =
      growthDetails.salesGrowth * 0.40 +
      growthDetails.marketShare * 0.30 +
      growthDetails.innovation * 0.30;

    const weightedScore =
      financialHealth * 0.30 +
      operationalHealth * 0.25 +
      customerHealth * 0.20 +
      teamHealth * 0.15 +
      growthHealth * 0.10;

    const recommendations = this.generateRecommendations({
      financialHealth,
      financialDetails,
      operationalHealth,
      operationalDetails,
      customerHealth,
      customerDetails,
      teamHealth,
      teamDetails,
      growthHealth,
      growthDetails,
    });

    return {
      financialHealth: Math.round(financialHealth * 100) / 100,
      financialDetails: {
        revenueGrowth: Math.round(financialDetails.revenueGrowth * 100) / 100,
        profitMargin: Math.round(financialDetails.profitMargin * 100) / 100,
        cashFlow: Math.round(financialDetails.cashFlow * 100) / 100,
        debtRatio: Math.round(financialDetails.debtRatio * 100) / 100,
      },
      operationalHealth: Math.round(operationalHealth * 100) / 100,
      operationalDetails: {
        stockLevels: Math.round(operationalDetails.stockLevels * 100) / 100,
        deliveryPerformance: Math.round(operationalDetails.deliveryPerformance * 100) / 100,
        processEfficiency: Math.round(operationalDetails.processEfficiency * 100) / 100,
      },
      customerHealth: Math.round(customerHealth * 100) / 100,
      customerDetails: {
        satisfaction: Math.round(customerDetails.satisfaction * 100) / 100,
        retentionRate: Math.round(customerDetails.retentionRate * 100) / 100,
        newVsReturning: Math.round(customerDetails.newVsReturning * 100) / 100,
      },
      teamHealth: Math.round(teamHealth * 100) / 100,
      teamDetails: {
        satisfaction: Math.round(teamDetails.satisfaction * 100) / 100,
        turnoverRate: Math.round(teamDetails.turnoverRate * 100) / 100,
        productivity: Math.round(teamDetails.productivity * 100) / 100,
      },
      growthHealth: Math.round(growthHealth * 100) / 100,
      growthDetails: {
        salesGrowth: Math.round(growthDetails.salesGrowth * 100) / 100,
        marketShare: Math.round(growthDetails.marketShare * 100) / 100,
        innovation: Math.round(growthDetails.innovation * 100) / 100,
      },
      weightedScore: Math.min(100, Math.max(0, Math.round(weightedScore * 100) / 100)),
      recommendations,
    };
  }

  determineGrade(score: number): ScoreGrade {
    if (score >= 95) return ScoreGrade.A_PLUS;
    if (score >= 85) return ScoreGrade.A;
    if (score >= 75) return ScoreGrade.B_PLUS;
    if (score >= 65) return ScoreGrade.B;
    if (score >= 55) return ScoreGrade.C_PLUS;
    if (score >= 45) return ScoreGrade.C;
    if (score >= 30) return ScoreGrade.D;
    return ScoreGrade.F;
  }

  determineTrend(previousScore: number, newScore: number): ScoreTrend {
    if (previousScore === 0) return ScoreTrend.STABLE;
    const changePercent = ((newScore - previousScore) / previousScore) * 100;
    if (changePercent > 5) return ScoreTrend.UP;
    if (changePercent < -5) return ScoreTrend.DOWN;
    return ScoreTrend.STABLE;
  }

  private normalize(value: number, min: number, max: number): number {
    if (max === min) return 50;
    return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  }

  private clamp(value: number): number {
    return Math.min(100, Math.max(0, value));
  }

  private calculateSeniorityScore(hireDate: string | Date | null): number {
    if (!hireDate) return 50;
    const hire = new Date(hireDate);
    const now = new Date();
    const months = (now.getFullYear() - hire.getFullYear()) * 12 + (now.getMonth() - hire.getMonth());
    if (months <= 1) return 20;
    if (months <= 3) return 40;
    if (months <= 6) return 55;
    if (months <= 12) return 70;
    if (months <= 24) return 80;
    if (months <= 48) return 90;
    return 100;
  }

  private calculateMarginScore(price: number, costPrice: number): number {
    if (!price || price === 0) return 0;
    const cost = costPrice || 0;
    const margin = ((price - cost) / price) * 100;
    if (margin >= 60) return 100;
    if (margin >= 40) return 85;
    if (margin >= 25) return 70;
    if (margin >= 10) return 50;
    if (margin >= 5) return 30;
    return 10;
  }

  private calculateDefectRateScore(defectiveUnits: number, totalUnits: number): number {
    if (totalUnits === 0) return 100;
    const defectRate = (defectiveUnits / totalUnits) * 100;
    if (defectRate <= 1) return 100;
    if (defectRate <= 3) return 85;
    if (defectRate <= 5) return 70;
    if (defectRate <= 10) return 50;
    if (defectRate <= 20) return 30;
    return 10;
  }

  private calculateReturnRateScore(returnedUnits: number, totalUnits: number): number {
    if (totalUnits === 0) return 100;
    const returnRate = (returnedUnits / totalUnits) * 100;
    if (returnRate <= 1) return 100;
    if (returnRate <= 3) return 90;
    if (returnRate <= 5) return 75;
    if (returnRate <= 10) return 55;
    if (returnRate <= 20) return 30;
    return 10;
  }

  private calculateShelfLifeScore(expiryDate: string | Date | null, createdAt: string | Date | null): number {
    if (!expiryDate) return 75;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysRemaining = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysRemaining < 0) return 0;
    if (daysRemaining <= 7) return 20;
    if (daysRemaining <= 30) return 50;
    if (daysRemaining <= 90) return 75;
    return 95;
  }

  private calculatePaymentPunctuality(paymentHistory: any): number {
    if (!paymentHistory) return 75;
    const onTime = paymentHistory.onTimePayments || 0;
    const total = paymentHistory.totalPayments || 1;
    const late = paymentHistory.latePayments || 0;
    const onTimeRate = (onTime / total) * 100;
    const latePenalty = (late / total) * 30;
    return Math.max(0, onTimeRate - latePenalty);
  }

  private calculateLoyaltyScore(firstPurchaseAt: string | Date | null, orderCount: number): number {
    let tenureScore = 50;
    if (firstPurchaseAt) {
      const first = new Date(firstPurchaseAt);
      const now = new Date();
      const months = (now.getFullYear() - first.getFullYear()) * 12 + (now.getMonth() - first.getMonth());
      tenureScore = this.normalize(months, 0, 36) * 100 / 36;
    }
    const frequencyScore = this.normalize(orderCount || 0, 0, 50);
    return tenureScore * 0.6 + frequencyScore * 0.4;
  }

  private generateRecommendations(details: any): string[] {
    const recs: string[] = [];
    if (details.financialDetails.revenueGrowth < 40) {
      recs.push('Augmenter la croissance du chiffre d\'affaires : diversifier les canaux de vente et cibler de nouveaux segments de marché.');
    }
    if (details.financialDetails.profitMargin < 40) {
      recs.push('Améliorer les marges bénéficiaires : renégocier les contrats fournisseurs et optimiser la structure de coûts.');
    }
    if (details.financialDetails.cashFlow < 40) {
      recs.push('Renforcer le flux de trésorerie : réduire les délais de paiement clients et optimiser le fonds de roulement.');
    }
    if (details.financialDetails.debtRatio < 40) {
      recs.push('Réduire le ratio d\'endettement : prioriser le remboursement des dettes à taux élevé.');
    }
    if (details.operationalDetails.stockLevels < 40) {
      recs.push('Optimiser la gestion des stocks : mettre en place un système de réapprovisionnement automatique.');
    }
    if (details.operationalDetails.deliveryPerformance < 40) {
      recs.push('Améliorer la performance de livraison : revoir les processus logistiques et les partenaires de livraison.');
    }
    if (details.customerDetails.satisfaction < 40) {
      recs.push('Augmenter la satisfaction client : mettre en place des enquêtes de satisfaction et un programme de fidélité.');
    }
    if (details.customerDetails.retentionRate < 40) {
      recs.push('Améliorer la rétention client : personnaliser l\'experience client et renforcer le service après-vente.');
    }
    if (details.teamDetails.satisfaction < 40) {
      recs.push('Améliorer la satisfaction des employés : investir dans la formation et les conditions de travail.');
    }
    if (details.teamDetails.turnoverRate < 40) {
      recs.push('Réduire le turnover : mettre en place des plans de carrière et améliorer la rémunération.');
    }
    if (details.growthDetails.salesGrowth < 40) {
      recs.push('Stimuler la croissance des ventes : investir dans le marketing digital et l\'expansion géographique.');
    }
    if (details.growthDetails.innovation < 40) {
      recs.push('Accélérer l\'innovation : allouer un budget R&D et encourager les initiatives internes.');
    }
    if (recs.length === 0) {
      recs.push('L\'entreprise se porte bien. Continuer à optimiser les processus existants et investir dans la croissance.');
    }
    return recs;
  }
}
