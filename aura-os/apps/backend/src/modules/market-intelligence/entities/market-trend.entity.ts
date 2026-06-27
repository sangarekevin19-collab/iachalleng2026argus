import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

export enum TrendType {
  RISING = 'rising',
  DECLINING = 'declining',
  STABLE = 'stable',
  SEASONAL = 'seasonal',
  NEW = 'new',
}

export enum TrendCategory {
  PRODUCT = 'product',
  CATEGORY = 'category',
  REGION = 'region',
  SEASON = 'season',
}

export enum TrendImpact {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

@Entity('market_trends')
export class MarketTrend {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  companyId: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  source: string;

  @Column({
    type: 'enum',
    enum: TrendCategory,
    default: TrendCategory.PRODUCT,
  })
  category: TrendCategory;

  @Column({ nullable: true })
  region: string;

  @Column({
    type: 'enum',
    enum: TrendType,
    default: TrendType.STABLE,
  })
  trendType: TrendType;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  confidence: number;

  @Column({
    type: 'enum',
    enum: TrendImpact,
    default: TrendImpact.MEDIUM,
  })
  impact: TrendImpact;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  relatedProducts: string[];

  @Column({ default: false })
  actionRequired: boolean;

  @Column({ type: 'jsonb', nullable: true })
  suggestedActions: string[];

  @Column({ type: 'timestamptz', nullable: true })
  detectedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
