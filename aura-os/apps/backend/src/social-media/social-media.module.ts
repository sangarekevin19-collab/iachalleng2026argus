import { Module, Global } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SocialMediaService } from './social-media.service';
import { AgentsModule } from '../modules/agents/agents.module';
import { MemoryModule } from '../modules/memory/memory.module';

@Global()
@Module({
  imports: [ScheduleModule.forRoot(), AgentsModule, MemoryModule],
  providers: [SocialMediaService],
  exports: [SocialMediaService],
})
export class SocialMediaModule {}
