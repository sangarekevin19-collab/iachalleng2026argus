import { Module, Global } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { GrowthEngineService } from './growth-engine.service';
import { AgentsModule } from '../modules/agents/agents.module';
import { MemoryModule } from '../modules/memory/memory.module';

@Global()
@Module({
  imports: [ScheduleModule.forRoot(), AgentsModule, MemoryModule],
  providers: [GrowthEngineService],
  exports: [GrowthEngineService],
})
export class GrowthEngineModule {}
