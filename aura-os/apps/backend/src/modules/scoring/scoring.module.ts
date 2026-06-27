import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Score } from './entities/score.entity';
import { ScoreHistory } from './entities/score-history.entity';
import { ScoringEngineService } from './services/scoring-engine.service';
import { ScoringService } from './services/scoring.service';
import { ScoringController } from './scoring.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Score, ScoreHistory])],
  controllers: [ScoringController],
  providers: [ScoringEngineService, ScoringService],
  exports: [ScoringService, ScoringEngineService, TypeOrmModule],
})
export class ScoringModule {}
