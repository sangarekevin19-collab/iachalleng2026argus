import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum OpportunityType {
  NEW_PRODUCT = 'new_product',
  NEW_MARKET = 'new_market',
  NEW_SUPPLIER = 'new_supplier',
  PARTNERSHIP = 'partnership',
  PRICING = 'pricing',
  SEASONAL = 'seasonal',
}

export enum OpportunityEffort {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum OpportunityStatus {
  IDENTIFIED = 'identified',
  EVALUATING = 'evaluating',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ACTIONED = 'actioned',
}

@Entity('market_opportunities')
export class MarketOpportunity {
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
    enum: OpportunityType,
    default: OpportunityType.NEW_PRODUCT,
  })
  type: OpportunityType;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  potentialRevenue: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  confidence: number;

  @Column({
    type: 'enum',
    enum: OpportunityEffort,
    default: OpportunityEffort.MEDIUM,
  })
  effort: OpportunityEffort;

  @Column({
    type: 'enum',
    enum: OpportunityStatus,
    default: OpportunityStatus.IDENTIFIED,
  })
  status: OpportunityStatus;

  @Column({ type: 'jsonb', nullable: true })
  actionPlan: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
