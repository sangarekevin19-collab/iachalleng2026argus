import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// Entities
import { AutomationWorkflow } from './entities/automation-workflow.entity';
import { WorkflowExecution } from './entities/workflow-execution.entity';
import { WorkflowTemplate } from './entities/workflow-template.entity';
import { WebhookEndpoint } from './entities/webhook-endpoint.entity';
import { ExternalIntegration } from './entities/external-integration.entity';
import { AutomationLog } from './entities/automation-log.entity';
import { AgentWorkflowLink } from './entities/agent-workflow-link.entity';
import { AutomationSchedule } from './entities/automation-schedule.entity';
import { WorkflowVersion } from './entities/workflow-version.entity';

// Providers
import { N8nProvider } from './providers/n8n.provider';

// Services
import { WorkflowService } from './services/workflow.service';
import { ExecutionService } from './services/execution.service';
import { WebhookService } from './services/webhook.service';
import { IntegrationService } from './services/integration.service';
import { WorkflowTemplateService } from './services/workflow-template.service';
import { WorkflowGeneratorService } from './services/workflow-generator.service';
import { AgentAutomationService } from './services/agent-automation.service';

// Controllers
import { WorkflowController } from './controllers/workflow.controller';
import { ExecutionController } from './controllers/execution.controller';
import { WebhookController } from './controllers/webhook.controller';
import { IntegrationController } from './controllers/integration.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AutomationWorkflow,
      WorkflowExecution,
      WorkflowTemplate,
      WebhookEndpoint,
      ExternalIntegration,
      AutomationLog,
      AgentWorkflowLink,
      AutomationSchedule,
      WorkflowVersion,
    ]),
    ConfigModule,
  ],
  controllers: [
    WorkflowController,
    ExecutionController,
    WebhookController,
    IntegrationController,
  ],
  providers: [
    N8nProvider,
    WorkflowService,
    ExecutionService,
    WebhookService,
    IntegrationService,
    WorkflowTemplateService,
    WorkflowGeneratorService,
    AgentAutomationService,
  ],
  exports: [
    WorkflowService,
    ExecutionService,
    WebhookService,
    IntegrationService,
    WorkflowTemplateService,
    WorkflowGeneratorService,
    AgentAutomationService,
    N8nProvider,
  ],
})
export class AutomationModule {}
