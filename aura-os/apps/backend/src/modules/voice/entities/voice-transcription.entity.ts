import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum TranscriptionStatus {
  PROCESSING = 'processing',
  MATCHED = 'matched',
  PARTIAL = 'partial',
  FAILED = 'failed',
  CONFIRMED = 'confirmed',
}

@Entity('voice_transcriptions')
export class VoiceTranscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  companyId: string;

  @Index()
  @Column()
  userId: string;

  @Column({ nullable: true })
  audioUrl: string;

  @Column({ type: 'text', nullable: true })
  transcribedText: string;

  @Column({ type: 'text', nullable: true })
  processedText: string;

  @Column({ type: 'jsonb', default: [] })
  extractedItems: Record<string, any>[];

  @Index()
  @Column({ nullable: true })
  saleId: string;

  @Column({ type: 'enum', enum: TranscriptionStatus, default: TranscriptionStatus.PROCESSING })
  status: TranscriptionStatus;

  @Column({ nullable: true })
  language: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  overallConfidence: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
