import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { WorkflowExecution, ExecutionStatus } from '../entities/workflow-execution.entity';
import { AutomationLog, LogLevel } from '../entities/automation-log.entity';
import { N8nProvider } from '../providers/n8n.provider';

@Injectable()
export class ExecutionService {
  private readonly logger = new Logger(ExecutionService.name);

  constructor(
    @InjectRepository(WorkflowExecution)
    private readonly executionRepo: Repository<WorkflowExecution>,
    @InjectRepository(AutomationLog)
    private readonly logRepo: Repository<AutomationLog>,
    private readonly n8nProvider: N8nProvider,
  ) {}

  async getRecentExecutions(workspaceId: string, limit = 50): Promise<WorkflowExecution[]> {
    return this.executionRepo
      .createQueryBuilder('e')
      .leftJoin('automation_workflows', 'w', 'w.id = e.workflowId')
      .where('w.workspaceId = :workspaceId', { workspaceId })
      .orderBy('e.startedAt', 'DESC')
      .limit(limit)
      .getMany();
  }

  async getExecutionsByStatus(workspaceId: string, status: ExecutionStatus): Promise<WorkflowExecution[]> {
    return this.executionRepo
      .createQueryBuilder('e')
      .leftJoin('automation_workflows', 'w', 'w.id = e.workflowId')
      .where('w.workspaceId = :workspaceId', { workspaceId })
      .andWhere('e.status = :status', { status })
      .orderBy('e.startedAt', 'DESC')
      .getMany();
  }

  async retryExecution(executionId: string, workflowId: string): Promise<WorkflowExecution> {
    const original = await this.executionRepo.findOne({ where: { id: executionId, workflowId } });
    if (!original) throw new Error('Execution not found');

    // Create new execution with same input
    const retry = this.executionRepo.create({
      workflowId,
      status: ExecutionStatus.PENDING,
      triggerType: original.triggerType,
      triggeredBy: original.triggeredBy,
      agentId: original.agentId,
      inputData: original.inputData,
      startedAt: new Date(),
      retryCount: original.retryCount + 1,
    });

    return this.executionRepo.save(retry);
  }

  async cancelExecution(executionId: string): Promise<void> {
    const execution = await this.executionRepo.findOne({ where: { id: executionId } });
    if (!execution) throw new Error('Execution not found');

    if (execution.n8nExecutionId) {
      try {
        // n8n doesn't have a direct cancel via API, but we can mark it
        this.logger.warn(`Attempting to cancel n8n execution ${execution.n8nExecutionId}`);
      } catch (err) {
        this.logger.warn(`Failed to cancel n8n execution: ${err.message}`);
      }
    }

    execution.status = ExecutionStatus.CANCELLED;
    execution.finishedAt = new Date();
    await this.executionRepo.save(execution);
  }

  async getExecutionStats(workspaceId: string, days = 7): Promise<any> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const executions = await this.executionRepo
      .createQueryBuilder('e')
      .leftJoin('automation_workflows', 'w', 'w.id = e.workflowId')
      .where('w.workspaceId = :workspaceId', { workspaceId })
      .andWhere('e.startedAt >= :since', { since })
      .getMany();

    const total = executions.length;
    const success = executions.filter((e) => e.status === ExecutionStatus.SUCCESS).length;
    const failed = executions.filter((e) => e.status === ExecutionStatus.FAILED).length;
    const running = executions.filter((e) => e.status === ExecutionStatus.RUNNING).length;
    const avgDuration = executions.filter((e) => e.duration > 0).reduce((sum, e) => sum + e.duration, 0) / (total || 1);

    return {
      period: `${days}d`,
      total,
      success,
      failed,
      running,
      successRate: total > 0 ? Math.round((success / total) * 100) : 0,
      avgDuration: Math.round(avgDuration),
      byDay: this.groupByDay(executions),
    };
  }

  private groupByDay(executions: WorkflowExecution[]): Record<string, { total: number; success: number; failed: number }> {
    const groups: Record<string, { total: number; success: number; failed: number }> = {};
    for (const e of executions) {
      const day = e.startedAt.toISOString().split('T')[0];
      if (!groups[day]) groups[day] = { total: 0, success: 0, failed: 0 };
      groups[day].total++;
      if (e.status === ExecutionStatus.SUCCESS) groups[day].success++;
      if (e.status === ExecutionStatus.FAILED) groups[day].failed++;
    }
    return groups;
  }

  async cleanupOldExecutions(days = 30): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const result = await this.executionRepo.delete({
      startedAt: LessThan(cutoff),
    });

    return result.affected || 0;
  }
}
