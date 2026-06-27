import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('contacts')
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  companyId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  whatsapp: string;

  @Column({ nullable: true })
  source: string;

  @Column({ default: 'prospect' })
  type: string;

  @Column({ type: 'jsonb', default: [] })
  tags: string[];

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  customerScore: number;

  @Column({ default: 'F' })
  scoreGrade: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  lifetimeValue: number;

  @Column({ type: 'timestamp', nullable: true })
  lastPurchaseAt: Date;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
