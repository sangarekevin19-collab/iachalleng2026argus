import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

export enum CompetitorType {
  DIRECT = 'direct',
  INDIRECT = 'indirect',
  POTENTIAL = 'potential',
}

export enum InsightType {
  PRICING = 'pricing',
  PRODUCT = 'product',
  PROMOTION = 'promotion',
  LOCATION = 'location',
  ONLINE_PRESENCE = 'online_presence',
  CUSTOMER_SENTIMENT = 'customer_sentiment',
}

export enum InsightImpact {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

@Entity('competitor_insights')
export class CompetitorInsight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  companyId: string;

  @Column()
  competitorName: string;

  @Column({
    type: 'enum',
    enum: CompetitorType,
    default: CompetitorType.DIRECT,
  })
  competitorType: CompetitorType;

  @Column({
    type: 'enum',
    enum: InsightType,
    default: InsightType.PRODUCT,
  })
  insightType: InsightType;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  source: string;

  @Column({
    type: 'enum',
    enum: InsightImpact,
    default: InsightImpact.MEDIUM,
  })
  impact: InsightImpact;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @Column({ type: 'timestamptz', nullable: true })
  detectedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
