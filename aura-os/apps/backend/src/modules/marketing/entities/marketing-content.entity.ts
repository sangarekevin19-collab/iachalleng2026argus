import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum ContentType {
  IMAGE = 'image',
  POST = 'post',
  CAMPAIGN = 'campaign',
  VIDEO_THUMBNAIL = 'video_thumbnail',
  STORY = 'story',
  AD = 'ad',
}

export enum ContentPlatform {
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  WHATSAPP = 'whatsapp',
  TIKTOK = 'tiktok',
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
  ALL = 'all',
}

export enum ContentStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  FAILED = 'failed',
}

@Entity('marketing_contents')
@Index(['companyId'])
@Index(['type'])
@Index(['status'])
@Index(['platform'])
export class MarketingContent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @Column({ type: 'enum', enum: ContentType })
  type: ContentType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', default: {} })
  content: Record<string, any>;

  @Column({ type: 'enum', enum: ContentPlatform, default: ContentPlatform.ALL })
  platform: ContentPlatform;

  @Column({ type: 'enum', enum: ContentStatus, default: ContentStatus.DRAFT })
  status: ContentStatus;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date;

  @Column({ type: 'jsonb', default: {} })
  engagement: {
    likes: number;
    shares: number;
    comments: number;
    reach: number;
    clicks: number;
  };

  @Column({ type: 'text', nullable: true })
  aiPrompt: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
