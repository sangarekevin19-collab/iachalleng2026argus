import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum CampaignObjective {
  AWARENESS = 'awareness',
  ENGAGEMENT = 'engagement',
  TRAFFIC = 'traffic',
  CONVERSIONS = 'conversions',
  LOYALTY = 'loyalty',
}

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  COMPLETED = 'completed',
  PAUSED = 'paused',
}

@Entity('marketing_campaigns')
@Index(['companyId'])
@Index(['status'])
@Index(['objective'])
export class MarketingCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: CampaignObjective })
  objective: CampaignObjective;

  @Column({ type: 'jsonb', default: {} })
  targetAudience: {
    demographics: string[];
    interests: string[];
    location: string;
    ageRange: string;
  };

  @Column({ type: 'jsonb', default: [] })
  platforms: string[];

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  budget: number;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ type: 'jsonb', default: [] })
  contentIds: string[];

  @Column({ type: 'enum', enum: CampaignStatus, default: CampaignStatus.DRAFT })
  status: CampaignStatus;

  @Column({ type: 'jsonb', default: {} })
  stats: {
    impressions: number;
    reach: number;
    engagement: number;
    clicks: number;
    conversions: number;
    spend: number;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
