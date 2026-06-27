import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
}

export enum TriggerType {
  MANUAL = 'manual',
  SCHEDULE = 'schedule',
  WEBHOOK = 'webhook',
  EVENT = 'event',
  AGENT = 'agent',
  API = 'api',
}

@Entity('workflow_executions')
export class WorkflowExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  workflowId: string;

  @Column({ type: 'enum', enum: ExecutionStatus, default: ExecutionStatus.PENDING })
  status: ExecutionStatus;

  @Column({ type: 'enum', enum: TriggerType, default: TriggerType.MANUAL })
  triggerType: TriggerType;

  @Column({ nullable: true })
  triggeredBy: string;

  @Column({ nullable: true })
  agentId: string;

  @Column({ type: 'jsonb', default: {} })
  inputData: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  error: string;

  @Column({ type: 'jsonb', nullable: true })
  errorDetails: Record<string, any>;

  @Column({ type: 'int', default: 0 })
  duration: number;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @CreateDateColumn()
  startedAt: Date;

  @UpdateDateColumn()
  finishedAt: Date;

  @Column({ type: 'jsonb', default: [] })
  stepResults: Record<string, any>[];

  @Column({ nullable: true })
  n8nExecutionId: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
