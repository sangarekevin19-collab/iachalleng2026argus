import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutomationWorkflow, WorkflowStatus } from '../entities/automation-workflow.entity';
import { WorkflowExecution, ExecutionStatus, TriggerType } from '../entities/workflow-execution.entity';
import { AutomationLog, LogLevel } from '../entities/automation-log.entity';
import { WorkflowVersion } from '../entities/workflow-version.entity';
import { N8nProvider } from '../providers/n8n.provider';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    @InjectRepository(AutomationWorkflow)
    private readonly workflowRepo: Repository<AutomationWorkflow>,
    @InjectRepository(WorkflowExecution)
    private readonly executionRepo: Repository<WorkflowExecution>,
    @InjectRepository(AutomationLog)
    private readonly logRepo: Repository<AutomationLog>,
    @InjectRepository(WorkflowVersion)
    private readonly versionRepo: Repository<WorkflowVersion>,
    private readonly n8nProvider: N8nProvider,
  ) {}

  // ─── CRUD Workflows ─────────────────────────────────────────

  async findAll(workspaceId: string, filters?: { category?: string; status?: string; agentId?: string }): Promise<AutomationWorkflow[]> {
    const qb = this.workflowRepo.createQueryBuilder('w')
      .where('w.workspaceId = :workspaceId', { workspaceId })
      .andWhere('w.isActive = true')
      .orderBy('w.updatedAt', 'DESC');

    if (filters?.category) qb.andWhere('w.category = :category', { category: filters.category });
    if (filters?.status) qb.andWhere('w.status = :status', { status: filters.status });
    if (filters?.agentId) qb.andWhere('w.agentId = :agentId', { agentId: filters.agentId });

    return qb.getMany();
  }

  async findOne(id: string, workspaceId: string): Promise<AutomationWorkflow> {
    const workflow = await this.workflowRepo.findOne({ where: { id, workspaceId } });
    if (!workflow) throw new NotFoundException(`Workflow ${id} not found`);
    return workflow;
  }

  async create(workspaceId: string, dto: Partial<AutomationWorkflow>): Promise<AutomationWorkflow> {
    const workflow = this.workflowRepo.create({
      ...dto,
      workspaceId,
      status: WorkflowStatus.DRAFT,
      executionCount: 0,
      successCount: 0,
      errorCount: 0,
    });

    const saved = await this.workflowRepo.save(workflow);

    await this.log(saved.id, null, LogLevel.INFO, 'Workflow created', { workspaceId, name: dto.name });

    return saved;
  }

  async update(id: string, workspaceId: string, dto: Partial<AutomationWorkflow>): Promise<AutomationWorkflow> {
    const workflow = await this.findOne(id, workspaceId);

    // Save version before update
    if (workflow.n8nWorkflowId && (dto.nodes || dto.connections)) {
      await this.saveVersion(workflow);
    }

    Object.assign(workflow, dto);
    const updated = await this.workflowRepo.save(workflow);

    // Sync with n8n if it has an n8n workflow ID
    if (updated.n8nWorkflowId && (dto.nodes || dto.connections || dto.name)) {
      try {
        await this.n8nProvider.updateWorkflow(updated.n8nWorkflowId, {
          name: updated.name,
          nodes: updated.nodes,
          connections: updated.connections,
        });
      } catch (err) {
        this.logger.warn(`Failed to sync workflow ${id} with n8n: ${err.message}`);
      }
    }

    await this.log(id, null, LogLevel.INFO, 'Workflow updated', { workspaceId });
    return updated;
  }

  async remove(id: string, workspaceId: string): Promise<void> {
    const workflow = await this.findOne(id, workspaceId);

    // Delete from n8n first
    if (workflow.n8nWorkflowId) {
      try {
        await this.n8nProvider.deleteWorkflow(workflow.n8nWorkflowId);
      } catch (err) {
        this.logger.warn(`Failed to delete n8n workflow ${workflow.n8nWorkflowId}: ${err.message}`);
      }
    }

    await this.workflowRepo.remove(workflow);
    await this.log(id, null, LogLevel.INFO, 'Workflow deleted', { workspaceId });
  }

  // ─── Deploy to n8n ──────────────────────────────────────────

  async deployToN8n(id: string, workspaceId: string): Promise<AutomationWorkflow> {
    const workflow = await this.findOne(id, workspaceId);

    if (!workflow.nodes || workflow.nodes.length === 0) {
      throw new BadRequestException('Workflow has no nodes to deploy');
    }

    // Create in n8n
    const n8nWorkflow = await this.n8nProvider.createWorkflow({
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      tags: [workflow.category, workspaceId],
    });

    workflow.n8nWorkflowId = n8nWorkflow.id;
    workflow.n8nConfig = n8nWorkflow;
    workflow.status = WorkflowStatus.ACTIVE;

    const saved = await this.workflowRepo.save(workflow);
    await this.log(id, null, LogLevel.INFO, `Workflow deployed to n8n: ${n8nWorkflow.id}`, { workspaceId });

    return saved;
  }

  // ─── Activate / Deactivate ──────────────────────────────────

  async activate(id: string, workspaceId: string): Promise<AutomationWorkflow> {
    const workflow = await this.findOne(id, workspaceId);

    if (!workflow.n8nWorkflowId) {
      throw new BadRequestException('Workflow must be deployed to n8n first');
    }

    await this.n8nProvider.activateWorkflow(workflow.n8nWorkflowId);
    workflow.status = WorkflowStatus.ACTIVE;
    const saved = await this.workflowRepo.save(workflow);

    await this.log(id, null, LogLevel.INFO, 'Workflow activated', { workspaceId });
    return saved;
  }

  async deactivate(id: string, workspaceId: string): Promise<AutomationWorkflow> {
    const workflow = await this.findOne(id, workspaceId);

    if (workflow.n8nWorkflowId) {
      await this.n8nProvider.deactivateWorkflow(workflow.n8nWorkflowId);
    }

    workflow.status = WorkflowStatus.PAUSED;
    const saved = await this.workflowRepo.save(workflow);

    await this.log(id, null, LogLevel.INFO, 'Workflow deactivated', { workspaceId });
    return saved;
  }

  // ─── Execute ────────────────────────────────────────────────

  async execute(id: string, workspaceId: string, inputData?: Record<string, any>, triggeredBy?: string, agentId?: string): Promise<WorkflowExecution> {
    const workflow = await this.findOne(id, workspaceId);

    if (workflow.status !== WorkflowStatus.ACTIVE) {
      throw new BadRequestException('Workflow is not active');
    }

    if (!workflow.n8nWorkflowId) {
      throw new BadRequestException('Workflow not deployed to n8n');
    }

    // Create execution record
    const execution = this.executionRepo.create({
      workflowId: id,
      status: ExecutionStatus.PENDING,
      triggerType: agentId ? TriggerType.AGENT : TriggerType.MANUAL,
      triggeredBy: triggeredBy || 'system',
      agentId: agentId || null,
      inputData: inputData || {},
      startedAt: new Date(),
    });
    const savedExecution = await this.executionRepo.save(execution);

    try {
      // Execute on n8n
      const n8nResult = await this.n8nProvider.executeWorkflow(workflow.n8nWorkflowId, inputData);

      // Update execution
      savedExecution.status = ExecutionStatus.RUNNING;
      savedExecution.n8nExecutionId = n8nResult.id;
      await this.executionRepo.save(savedExecution);

      // Poll for completion (simplified — in production use webhook callbacks)
      const result = await this.pollExecution(n8nResult.id);

      savedExecution.status = result.finished ? ExecutionStatus.SUCCESS : ExecutionStatus.FAILED;
      savedExecution.result = result.data;
      savedExecution.finishedAt = new Date();
      savedExecution.duration = Date.now() - savedExecution.startedAt.getTime();

      if (!result.finished) {
        savedExecution.error = result.error || 'Execution failed';
        workflow.errorCount++;
        workflow.lastErrorAt = new Date();
        workflow.lastErrorMessage = savedExecution.error;
      } else {
        workflow.successCount++;
      }
    } catch (err) {
      savedExecution.status = ExecutionStatus.FAILED;
      savedExecution.error = err.message;
      savedExecution.finishedAt = new Date();
      savedExecution.duration = Date.now() - savedExecution.startedAt.getTime();
      workflow.errorCount++;
      workflow.lastErrorAt = new Date();
      workflow.lastErrorMessage = err.message;

      await this.log(id, savedExecution.id, LogLevel.ERROR, `Execution failed: ${err.message}`, { workspaceId });
    }

    workflow.executionCount++;
    workflow.lastExecutedAt = new Date();
    await this.workflowRepo.save(workflow);

    return this.executionRepo.save(savedExecution);
  }

  private async pollExecution(n8nExecutionId: string, maxAttempts = 30): Promise<any> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const exec = await this.n8nProvider.getExecution(n8nExecutionId);
        if (exec.finished !== undefined) {
          return { finished: exec.finished, data: exec.data, error: exec.error };
        }
      } catch {
        // Keep polling
      }
    }
    return { finished: false, error: 'Polling timeout' };
  }

  // ─── Executions ─────────────────────────────────────────────

  async getExecutions(workflowId: string, workspaceId: string, limit = 20): Promise<WorkflowExecution[]> {
    await this.findOne(workflowId, workspaceId); // verify access
    return this.executionRepo.find({
      where: { workflowId },
      order: { startedAt: 'DESC' },
      take: limit,
    });
  }

  async getExecutionById(executionId: string, workflowId: string, workspaceId: string): Promise<WorkflowExecution> {
    await this.findOne(workflowId, workspaceId); // verify access
    const execution = await this.executionRepo.findOne({ where: { id: executionId, workflowId } });
    if (!execution) throw new NotFoundException(`Execution ${executionId} not found`);
    return execution;
  }

  // ─── Versions ───────────────────────────────────────────────

  private async saveVersion(workflow: AutomationWorkflow): Promise<void> {
    const lastVersion = await this.versionRepo.findOne({
      where: { workflowId: workflow.id },
      order: { version: 'DESC' },
    });

    const version = this.versionRepo.create({
      workflowId: workflow.id,
      version: (lastVersion?.version || 0) + 1,
      nodes: workflow.nodes,
      connections: workflow.connections,
      changeDescription: `Auto-saved before update`,
    });

    await this.versionRepo.save(version);
  }

  async getVersions(workflowId: string, workspaceId: string): Promise<WorkflowVersion[]> {
    await this.findOne(workflowId, workspaceId);
    return this.versionRepo.find({
      where: { workflowId },
      order: { version: 'DESC' },
    });
  }

  // ─── Stats ──────────────────────────────────────────────────

  async getStats(workspaceId: string): Promise<any> {
    const workflows = await this.findAll(workspaceId);
    const totalExecutions = workflows.reduce((sum, w) => sum + w.executionCount, 0);
    const totalSuccess = workflows.reduce((sum, w) => sum + w.successCount, 0);
    const totalErrors = workflows.reduce((sum, w) => sum + w.errorCount, 0);

    return {
      totalWorkflows: workflows.length,
      activeWorkflows: workflows.filter((w) => w.status === WorkflowStatus.ACTIVE).length,
      draftWorkflows: workflows.filter((w) => w.status === WorkflowStatus.DRAFT).length,
      errorWorkflows: workflows.filter((w) => w.status === WorkflowStatus.ERROR).length,
      totalExecutions,
      totalSuccess,
      totalErrors,
      successRate: totalExecutions > 0 ? Math.round((totalSuccess / totalExecutions) * 100) : 0,
      byCategory: workflows.reduce((acc, w) => {
        acc[w.category] = (acc[w.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  // ─── Logging ────────────────────────────────────────────────

  private async log(
    workflowId: string | null,
    executionId: string | null,
    level: LogLevel,
    message: string,
    payload?: Record<string, any>,
  ): Promise<void> {
    const log = this.logRepo.create({
      workflowId,
      executionId,
      level,
      message,
      payload: payload || {},
    });
    await this.logRepo.save(log);
  }

  async getLogs(workflowId: string, workspaceId: string, limit = 50): Promise<AutomationLog[]> {
    await this.findOne(workflowId, workspaceId);
    return this.logRepo.find({
      where: { workflowId },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }
}
