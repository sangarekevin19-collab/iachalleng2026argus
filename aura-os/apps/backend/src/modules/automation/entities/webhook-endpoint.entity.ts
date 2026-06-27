import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum WebhookStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
}

@Entity('webhook_endpoints')
export class WebhookEndpoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  workspaceId: string;

  @Column()
  provider: string;

  @Column()
  url: string;

  @Column({ nullable: true })
  secret: string;

  @Column({ type: 'enum', enum: WebhookStatus, default: WebhookStatus.ACTIVE })
  status: WebhookStatus;

  @Column({ nullable: true })
  n8nWebhookId: string;

  @Column({ type: 'jsonb', default: [] })
  events: string[];

  @Column({ nullable: true })
  workflowId: string;

  @Column({ type: 'int', default: 0 })
  callCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastCalledAt: Date;

  @Column({ type: 'text', nullable: true })
  lastError: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
