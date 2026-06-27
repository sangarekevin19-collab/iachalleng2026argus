import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AuraCoreService } from './aura-core.service';
import { Agent } from '../modules/agents/entities/agent.entity';
import { Company } from '../modules/companies/entities/company.entity';
import { AgentsModule } from '../modules/agents/agents.module';
import { MemoryModule } from '../modules/memory/memory.module';
import { DashboardEngineModule } from '../dashboard-engine/dashboard-engine.module';
import { GrowthEngineModule } from '../growth-engine/growth-engine.module';
import { SocialMediaModule } from '../social-media/social-media.module';

@Global()
@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Company, Agent]),
    AgentsModule,
    MemoryModule,
    DashboardEngineModule,
    GrowthEngineModule,
    SocialMediaModule,
  ],
  providers: [AuraCoreService],
  exports: [AuraCoreService],
})
export class AuraCoreModule {}
