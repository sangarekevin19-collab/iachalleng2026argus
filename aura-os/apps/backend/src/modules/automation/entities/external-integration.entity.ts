import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum IntegrationStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  PENDING = 'pending',
}

export enum IntegrationProvider {
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  LINKEDIN = 'linkedin',
  TWITTER = 'twitter',
  TIKTOK = 'tiktok',
  GMAIL = 'gmail',
  OUTLOOK = 'outlook',
  GOOGLE_CALENDAR = 'google_calendar',
  WHATSAPP = 'whatsapp',
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  SLACK = 'slack',
  DISCORD = 'discord',
  HUBSPOT = 'hubspot',
  NOTION = 'notion',
  AIRTABLE = 'airtable',
  GOOGLE_SHEETS = 'google_sheets',
  TWILIO = 'twilio',
  SENDGRID = 'sendgrid',
  CUSTOM = 'custom',
}

@Entity('external_integrations')
export class ExternalIntegration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  workspaceId: string;

  @Column({ type: 'enum', enum: IntegrationProvider })
  provider: IntegrationProvider;

  @Column({ type: 'enum', enum: IntegrationStatus, default: IntegrationStatus.PENDING })
  status: IntegrationStatus;

  @Column({ type: 'text', nullable: true })
  accessToken: string;

  @Column({ type: 'text', nullable: true })
  refreshToken: string;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'jsonb', default: {} })
  config: Record<string, any>;

  @Column({ type: 'jsonb', default: [] })
  permissions: string[];

  @Column({ type: 'jsonb', default: {} })
  credentials: Record<string, any>;

  @Column({ nullable: true })
  ownerId: string;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncAt: Date;

  @Column({ type: 'text', nullable: true })
  lastError: string;

  @Column({ type: 'int', default: 0 })
  syncCount: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
