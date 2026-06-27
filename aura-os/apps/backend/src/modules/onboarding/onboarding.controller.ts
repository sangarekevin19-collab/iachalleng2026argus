import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OnboardingService, InterviewMessage } from './onboarding.service';
import { LlmService } from '../agents/services/llm.service';

interface RequestWithUser {
  user: { sub: string; companyId: string; [key: string]: any };
}

@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  private readonly logger = new Logger(OnboardingController.name);

  constructor(
    private readonly onboardingService: OnboardingService,
    private readonly llmService: LlmService,
  ) {}

  // ─── Start interview ───

  @Post('start')
  async startInterview(@Req() req: RequestWithUser) {
    const userId = req.user.sub;
    const companyId = req.user.companyId;
    this.logger.log(`[Onboarding] startInterview user=${userId} company=${companyId}`);

    return this.onboardingService.startInterview(userId, companyId);
  }

  // ─── Submit answer — LLM decides everything ───

  @Post('answer')
  async submitAnswer(
    @Body() body: { answer: string; messages: InterviewMessage[] },
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.sub;
    this.logger.debug(`[Onboarding] answer user=${userId} "${body.answer?.substring(0, 50)}..."`);

    const session = await this.onboardingService.findByUser(userId);
    if (!session) {
      throw new HttpException('Session non trouvée. Lancez d\'abord /start', HttpStatus.NOT_FOUND);
    }

    return this.onboardingService.submitAnswer(userId, body.answer, body.messages);
  }

  // ─── Generate full platform (called automatically after interview completes) ───

  @Post('generate-platform')
  async generatePlatform(@Req() req: RequestWithUser) {
    const userId = req.user.sub;
    this.logger.log(`[Onboarding] generatePlatform user=${userId}`);

    const session = await this.onboardingService.findByUser(userId);
    if (!session) {
      throw new HttpException('Session non trouvée', HttpStatus.NOT_FOUND);
    }

    return this.onboardingService.generateFullPlatform(userId);
  }

  // ─── Get session state ───

  @Post('session')
  async getSession(@Req() req: RequestWithUser) {
    const userId = req.user.sub;
    return this.onboardingService.findByUser(userId);
  }

  // ─── Mark onboarding complete ───

  @Post('complete')
  async completeOnboarding(@Req() req: RequestWithUser) {
    const userId = req.user.sub;
    this.logger.log(`[Onboarding] complete user=${userId}`);

    return this.onboardingService.markComplete(userId);
  }
}
