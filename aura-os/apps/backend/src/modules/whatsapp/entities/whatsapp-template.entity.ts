import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum TemplateCategory {
  MARKETING = 'marketing',
  UTILITY = 'utility',
  AUTHENTICATION = 'authentication',
}

export enum TemplateStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('whatsapp_templates')
@Index(['companyId', 'name', 'language'], { unique: true })
export class WhatsappTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 10, default: 'fr' })
  language: string;

  @Column({ type: 'enum', enum: TemplateCategory })
  category: TemplateCategory;

  @Column({ type: 'jsonb', nullable: true })
  header: Record<string, any>;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  footer: string;

  @Column({ type: 'jsonb', default: [] })
  buttons: Record<string, any>[];

  @Column({ type: 'jsonb', default: [] })
  variables: Record<string, any>[];

  @Column({ type: 'enum', enum: TemplateStatus, default: TemplateStatus.PENDING })
  status: TemplateStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  externalId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
