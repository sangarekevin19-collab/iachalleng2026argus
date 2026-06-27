import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LearningEvent } from './entities/learning-event.entity';
import { DetectedPattern } from './entities/detected-pattern.entity';
import { SuggestedAction } from './entities/suggested-action.entity';
import { ContinuousLearningService } from './services/continuous-learning.service';
import { PatternDetectorService } from './services/pattern-detector.service';
import { AdaptiveAgentService } from './services/adaptive-agent.service';
import { LearningController } from './learning.controller';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LearningEvent, DetectedPattern, SuggestedAction]),
    forwardRef(() => AgentsModule),
  ],
  controllers: [LearningController],
  providers: [ContinuousLearningService, PatternDetectorService, AdaptiveAgentService],
  exports: [ContinuousLearningService, PatternDetectorService, AdaptiveAgentService, TypeOrmModule],
})
export class LearningModule {}
