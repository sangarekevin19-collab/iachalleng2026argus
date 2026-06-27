import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ERROR = 'error',
  ARCHIVED = 'archived',
}

export enum WorkflowCategory {
  MARKETING = 'marketing',
  CRM = 'crm',
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
  FINANCE = 'finance',
  HR = 'hr',
  SUPPORT = 'support',
  SALES = 'sales',
  OPERATIONS = 'operations',
  GROWTH = 'growth',
  CUSTOM = 'custom',
}

@Entity('automation_workflows')
export class AutomationWorkflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  workspaceId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: WorkflowCategory, default: WorkflowCategory.CUSTOM })
  category: WorkflowCategory;

  @Column({ type: 'enum', enum: WorkflowStatus, default: WorkflowStatus.DRAFT })
  status: WorkflowStatus;

  @Column({ nullable: true })
  n8nWorkflowId: string;

  @Column({ type: 'jsonb', default: {} })
  n8nConfig: Record<string, any>;

  @Column({ type: 'jsonb', default: [] })
  nodes: Record<string, any>[];

  @Column({ type: 'jsonb', default: {} })
  connections: Record<string, any>;

  @Column({ type: 'jsonb', default: [] })
  triggers: Record<string, any>[];

  @Column({ type: 'jsonb', default: [] })
  requiredPermissions: string[];

  @Column({ default: false })
  requiresApproval: boolean;

  @Column({ nullable: true })
  createdBy: string;

  @Column({ nullable: true })
  agentId: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({ type: 'int', default: 0 })
  executionCount: number;

  @Column({ type: 'int', default: 0 })
  successCount: number;

  @Column({ type: 'int', default: 0 })
  errorCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastExecutedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastErrorAt: Date;

  @Column({ type: 'text', nullable: true })
  lastErrorMessage: string;

  @Column({ type: 'jsonb', default: {} })
  scheduleConfig: Record<string, any>;

  @Column({ type: 'int', default: 3 })
  maxRetries: number;

  @Column({ type: 'int', default: 30000 })
  timeoutMs: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
