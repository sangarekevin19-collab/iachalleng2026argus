import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from './entities/agent.entity';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { AgentFactoryService } from './agent-factory.service';
import { LlmService } from './services/llm.service';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agent]),
    CompaniesModule,
  ],
  controllers: [AgentsController],
  providers: [AgentsService, AgentFactoryService, LlmService],
  exports: [AgentsService, AgentFactoryService, LlmService, TypeOrmModule],
})
export class AgentsModule {}
