import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum SuggestedActionType {
  CREATE_AGENT = 'create_agent',
  ADJUST_INVENTORY = 'adjust_inventory',
  CHANGE_PRICING = 'change_pricing',
  LAUNCH_CAMPAIGN = 'launch_campaign',
  HIRE_EMPLOYEE = 'hire_employee',
  CUT_COSTS = 'cut_costs',
  INVEST = 'invest',
  OTHER = 'other',
}

export enum SuggestionPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum SuggestionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  IMPLEMENTED = 'implemented',
}

@Entity('suggested_actions')
export class SuggestedAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  companyId: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: SuggestedActionType,
    default: SuggestedActionType.OTHER,
  })
  type: string;

  @Column({
    type: 'enum',
    enum: SuggestionPriority,
    default: SuggestionPriority.MEDIUM,
  })
  priority: string;

  @Column({
    type: 'enum',
    enum: SuggestionStatus,
    default: SuggestionStatus.PENDING,
  })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  expectedImpact: Record<string, any>;

  @Column({ nullable: true })
  source: string;

  @Column({ default: false })
  requiresApproval: boolean;

  @Column({ nullable: true })
  approvedBy: string;

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  implementedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
