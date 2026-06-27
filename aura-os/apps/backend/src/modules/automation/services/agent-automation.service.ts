import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentWorkflowLink } from '../entities/agent-workflow-link.entity';
import { AutomationWorkflow, WorkflowStatus } from '../entities/automation-workflow.entity';
import { WorkflowExecution } from '../entities/workflow-execution.entity';

@Injectable()
export class AgentAutomationService {
  private readonly logger = new Logger(AgentAutomationService.name);

  constructor(
    @InjectRepository(AgentWorkflowLink)
    private readonly linkRepo: Repository<AgentWorkflowLink>,
    @InjectRepository(AutomationWorkflow)
    private readonly workflowRepo: Repository<AutomationWorkflow>,
    @InjectRepository(WorkflowExecution)
    private readonly executionRepo: Repository<WorkflowExecution>,
  ) {}

  async linkWorkflowToAgent(
    agentId: string,
    workflowId: string,
    workspaceId: string,
    relationship: string = 'owner',
  ): Promise<AgentWorkflowLink> {
    const link = this.linkRepo.create({
      agentId,
      workflowId,
      workspaceId,
      relationship,
    });
    return this.linkRepo.save(link);
  }

  async removeAgentWorkflowLink(agentId: string, workflowId: string): Promise<void> {
    await this.linkRepo.delete({ agentId, workflowId });
  }

  async getAgentWorkflows(agentId: string, workspaceId: string): Promise<AutomationWorkflow[]> {
    const links = await this.linkRepo.find({ where: { agentId, isActive: true } });
    const workflowIds = links.map((l) => l.workflowId);
    if (workflowIds.length === 0) return [];

    return this.workflowRepo
      .createQueryBuilder('w')
      .where('w.id IN (:...ids)', { ids: workflowIds })
      .andWhere('w.workspaceId = :workspaceId', { workspaceId })
      .andWhere('w.isActive = true')
      .getMany();
  }

  async getAgentExecutions(agentId: string, workspaceId: string, limit = 20): Promise<WorkflowExecution[]> {
    const agentWorkflows = await this.getAgentWorkflows(agentId, workspaceId);
    const workflowIds = agentWorkflows.map((w) => w.id);
    if (workflowIds.length === 0) return [];

    return this.executionRepo
      .createQueryBuilder('e')
      .where('e.workflowId IN (:...ids)', { ids: workflowIds })
      .orderBy('e.startedAt', 'DESC')
      .limit(limit)
      .getMany();
  }

  async delegateExecution(
    agentId: string,
    workflowId: string,
    inputData?: Record<string, any>,
  ): Promise<WorkflowExecution> {
    this.logger.log(`Agent ${agentId} delegating execution to workflow ${workflowId}`);

    const workflow = await this.workflowRepo.findOne({ where: { id: workflowId } });
    if (!workflow) throw new Error(`Workflow ${workflowId} not found`);
    if (workflow.status !== WorkflowStatus.ACTIVE) {
      throw new Error(`Workflow ${workflowId} is not active`);
    }

    const execution = this.executionRepo.create({
      workflowId,
      status: 'pending' as any,
      triggerType: 'agent' as any,
      triggeredBy: agentId,
      agentId,
      inputData: inputData || {},
      startedAt: new Date(),
    });

    return this.executionRepo.save(execution);
  }

  async getWorkflowPerformanceForAgent(workflowId: string): Promise<{
    total: number;
    success: number;
    failed: number;
    successRate: number;
    lastRun?: Date;
  }> {
    const workflow = await this.workflowRepo.findOne({ where: { id: workflowId } });
    if (!workflow) throw new Error(`Workflow ${workflowId} not found`);

    return {
      total: workflow.executionCount,
      success: workflow.successCount,
      failed: workflow.errorCount,
      successRate: workflow.executionCount > 0
        ? Math.round((workflow.successCount / workflow.executionCount) * 100)
        : 0,
      lastRun: workflow.lastExecutedAt || undefined,
    };
  }

  async listAgentWorkflowLinks(agentId: string, workspaceId: string): Promise<{
    links: AgentWorkflowLink[];
    workflows: AutomationWorkflow[];
  }> {
    const links = await this.linkRepo.find({ where: { agentId, isActive: true } });
    const workflowIds = links.map((l) => l.workflowId);
    const workflows = workflowIds.length > 0
      ? await this.workflowRepo.findByIds(workflowIds)
      : [];

    return { links, workflows };
  }
}
