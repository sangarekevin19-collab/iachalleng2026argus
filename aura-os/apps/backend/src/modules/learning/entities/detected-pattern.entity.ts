import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum PatternType {
  SALES_CYCLE = 'sales_cycle',
  CUSTOMER_BEHAVIOR = 'customer_behavior',
  SEASONAL = 'seasonal',
  OPERATIONAL = 'operational',
  ANOMALY = 'anomaly',
  FRAUD_RISK = 'fraud_risk',
}

export enum PatternFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  SEASONAL = 'seasonal',
}

@Entity('detected_patterns')
export class DetectedPattern {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  companyId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: PatternType,
    default: PatternType.SALES_CYCLE,
  })
  patternType: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  confidence: number;

  @Column({
    type: 'enum',
    enum: PatternFrequency,
    default: PatternFrequency.WEEKLY,
  })
  frequency: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  firstDetectedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastSeenAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
