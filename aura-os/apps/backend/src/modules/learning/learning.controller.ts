import { Controller, Get, Post, Put, Param, Query, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ContinuousLearningService } from './services/continuous-learning.service';
import { AdaptiveAgentService } from './services/adaptive-agent.service';
import { CreateLearningEventDto } from './dto/create-learning-event.dto';
import { ReviewSuggestionDto } from './dto/review-suggestion.dto';

@ApiTags('learning')
@Controller('learning')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LearningController {
  constructor(
    private readonly continuousLearningService: ContinuousLearningService,
    private readonly adaptiveAgentService: AdaptiveAgentService,
  ) {}

  @Post('events')
  @ApiOperation({ summary: 'Record a learning event' })
  async recordEvent(@Req() req: any, @Body() dto: CreateLearningEventDto) {
    return this.continuousLearningService.recordEvent(dto, req.user.companyId, req.user.userId);
  }

  @Get('events')
  @ApiOperation({ summary: 'List learning events' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'eventType', required: false })
  @ApiQuery({ name: 'impact', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getEvents(@Req() req: any, @Query() query: any) {
    return this.continuousLearningService.getEvents(req.user.companyId, query);
  }

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run learning analysis pipeline' })
  async analyze(@Req() req: any) {
    return this.continuousLearningService.analyzeAndLearn(req.user.companyId);
  }

  @Get('patterns')
  @ApiOperation({ summary: 'List detected patterns' })
  async getPatterns(@Req() req: any) {
    return this.continuousLearningService.getPatterns(req.user.companyId);
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'List suggested actions' })
  @ApiQuery({ name: 'status', required: false })
  async getSuggestions(@Req() req: any, @Query('status') status?: string) {
    return this.continuousLearningService.getSuggestions(req.user.companyId, status);
  }

  @Put('suggestions/:id/review')
  @ApiOperation({ summary: 'Approve or reject a suggestion' })
  async reviewSuggestion(@Param('id') id: string, @Body() dto: ReviewSuggestionDto) {
    return this.continuousLearningService.reviewSuggestion(id, dto);
  }

  @Post('suggestions/:id/implement')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Implement a suggestion' })
  async implementSuggestion(@Param('id') id: string, @Req() req: any) {
    return this.continuousLearningService.implementSuggestion(id, req.user.userId);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get learning dashboard' })
  async getDashboard(@Req() req: any) {
    return this.continuousLearningService.getLearningDashboard(req.user.companyId);
  }

  @Get('adaptation-log')
  @ApiOperation({ summary: 'Get auto-adaptation history' })
  async getAdaptationLog(@Req() req: any) {
    return this.continuousLearningService.getAutoAdaptationLog(req.user.companyId);
  }

  @Get('agent-suggestions')
  @ApiOperation({ summary: 'Get suggested new agents' })
  async getAgentSuggestions(@Req() req: any) {
    return this.adaptiveAgentService.suggestNewAgent(req.user.companyId);
  }
}
