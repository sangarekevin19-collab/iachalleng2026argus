import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

export enum ReportType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom',
}

export enum ReportFormat {
  PDF = 'pdf',
  HTML = 'html',
  WHATSAPP = 'whatsapp',
  TEXT = 'text',
}

export enum ReportStatus {
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  companyId: string;

  @Column({
    type: 'enum',
    enum: ReportType,
    default: ReportType.DAILY,
  })
  type: ReportType;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'jsonb', default: {} })
  content: Record<string, any>;

  @Column({
    type: 'enum',
    enum: ReportFormat,
    default: ReportFormat.HTML,
  })
  format: ReportFormat;

  @Column({ type: 'jsonb', nullable: true })
  period: Record<string, any>;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.GENERATING,
  })
  status: ReportStatus;

  @Column({ nullable: true })
  fileUrl: string;

  @Column({ type: 'jsonb', default: [] })
  sentVia: string[];

  @Column({ type: 'timestamptz', nullable: true })
  generatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
