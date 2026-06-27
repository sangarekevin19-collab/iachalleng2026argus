import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

export enum LearningEventType {
  SALE_MADE = 'sale_made',
  SALE_CANCELLED = 'sale_cancelled',
  STOCK_ADJUSTED = 'stock_adjusted',
  EMPLOYEE_ACTION = 'employee_action',
  CUSTOMER_INTERACTION = 'customer_interaction',
  DECISION_MADE = 'decision_made',
  FEEDBACK_RECEIVED = 'feedback_received',
  ERROR_OCCURRED = 'error_occurred',
  PATTERN_DETECTED = 'pattern_detected',
}

export enum LearningEventCategory {
  SALES = 'sales',
  INVENTORY = 'inventory',
  FINANCE = 'finance',
  CUSTOMER = 'customer',
  EMPLOYEE = 'employee',
  OPERATIONS = 'operations',
  STRATEGY = 'strategy',
}

export enum LearningEventImpact {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral',
}

@Entity('learning_events')
export class LearningEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  companyId: string;

  @Index()
  @Column({ nullable: true })
  userId: string;

  @Column({
    type: 'enum',
    enum: LearningEventType,
    default: LearningEventType.SALE_MADE,
  })
  eventType: string;

  @Column({
    type: 'enum',
    enum: LearningEventCategory,
    default: LearningEventCategory.OPERATIONS,
  })
  category: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @Column({
    type: 'enum',
    enum: LearningEventImpact,
    default: LearningEventImpact.NEUTRAL,
  })
  impact: string;

  @Column({ type: 'text', nullable: true })
  lesson: string;

  @Column({ type: 'text', nullable: true })
  actionTaken: string;

  @Column({ nullable: true })
  patternId: string;

  @CreateDateColumn()
  createdAt: Date;
}
