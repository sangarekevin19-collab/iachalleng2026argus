import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  SENDING = 'sending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('whatsapp_campaigns')
@Index(['companyId'])
@Index(['status'])
export class WhatsappCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'uuid', nullable: true })
  templateId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  templateName: string;

  @Column({ type: 'jsonb', default: {} })
  targetAudience: Record<string, any>;

  @Column({ type: 'jsonb', default: [] })
  recipients: string[];

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'enum', enum: CampaignStatus, default: CampaignStatus.DRAFT })
  status: CampaignStatus;

  @Column({ type: 'jsonb', default: { total: 0, sent: 0, delivered: 0, read: 0, failed: 0, replied: 0 } })
  stats: {
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    replied: number;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
