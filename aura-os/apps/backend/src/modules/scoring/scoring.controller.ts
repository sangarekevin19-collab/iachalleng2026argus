import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';

import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ScoringService } from './services/scoring.service';
import { ScoringEngineService } from './services/scoring-engine.service';
import { CalculateScoreDto } from './dto/calculate-score.dto';
import { UpdateScoreDto } from './dto/update-score.dto';
import { ScoreFilterDto } from './dto/score-filter.dto';
import { ScoreTargetType } from './entities/score.entity';

@ApiTags('scoring')
@Controller('scoring')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ScoringController {
  constructor(
    private readonly scoringService: ScoringService,
    private readonly scoringEngine: ScoringEngineService,
  ) {}

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate score for a target' })
  async calculateScore(@Req() req: any, @Body() dto: CalculateScoreDto) {
    return this.scoringService.calculateAndSaveScore(req.user.companyId, dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List scores with filters' })
  async getScores(@Req() req: any, @Query() filters: ScoreFilterDto) {
    return this.scoringService.getScores(req.user.companyId, filters);
  }

  @Get('health')
  @ApiOperation({ summary: 'Get company health score' })
  async getHealth(@Req() req: any) {
    return this.scoringService.getCompanyHealth(req.user.companyId);
  }

  @Get('health/history')
  @ApiOperation({ summary: 'Get health score history' })
  async getHealthHistory(@Req() req: any) {
    const healthScore = await this.scoringService.getTargetScore(
      req.user.companyId,
      ScoreTargetType.COMPANY,
      req.user.companyId,
    );
    if (!healthScore) {
      return { data: [] };
    }
    const history = await this.scoringService.getScoreHistory(healthScore.id);
    return { data: history };
  }

  @Get('report')
  @ApiOperation({ summary: 'Full scoring report' })
  async getReport(@Req() req: any) {
    return this.scoringService.generateScoreReport(req.user.companyId);
  }

  @Get('top/:type')
  @ApiOperation({ summary: 'Top performers' })
  async getTop(@Req() req: any, @Param('type') type: ScoreTargetType, @Query('limit') limit: number = 10) {
    return this.scoringService.getTopScores(req.user.companyId, type, limit || 10);
  }

  @Get('bottom/:type')
  @ApiOperation({ summary: 'Bottom performers' })
  async getBottom(@Req() req: any, @Param('type') type: ScoreTargetType, @Query('limit') limit: number = 10) {
    return this.scoringService.getBottomScores(req.user.companyId, type, limit || 10);
  }

  @Get('distribution/:type')
  @ApiOperation({ summary: 'Score distribution by grade' })
  async getDistribution(@Req() req: any, @Param('type') type: ScoreTargetType) {
    return this.scoringService.getScoreDistribution(req.user.companyId, type);
  }

  @Get('recommendations/:type/:id')
  @ApiOperation({ summary: 'Improvement recommendations' })
  async getRecommendations(
    @Req() req: any,
    @Param('type') type: ScoreTargetType,
    @Param('id') id: string,
  ) {
    return this.scoringService.getImprovementRecommendations(req.user.companyId, type, id);
  }

  @Post('recalculate-all')
  @ApiOperation({ summary: 'Recalculate all scores' })
  async recalculateAll(@Req() req: any) {
    return this.scoringService.recalculateAllScores(req.user.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get score detail' })
  async getScoreById(@Param('id') id: string) {
    return this.scoringService.getScoreById(id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Score history' })
  async getScoreHistory(@Param('id') id: string) {
    return this.scoringService.getScoreHistory(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Manual score adjustment' })
  async updateScore(@Param('id') id: string, @Req() req: any, @Body() dto: UpdateScoreDto) {
    return this.scoringService.updateScoreManually(id, dto, req.user.id);
  }
}
