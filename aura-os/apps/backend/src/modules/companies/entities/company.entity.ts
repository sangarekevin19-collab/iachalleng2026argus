import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ length: 2 })
  countryCode: string;

  @Column()
  city: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  logo: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any>;

  @Column({ nullable: true })
  industry: string;

  @Column({ nullable: true })
  sector: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  healthScore: number;

  @Column({ type: 'jsonb', nullable: true })
  businessModel: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  aiProfile: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  digitalTwin: Record<string, any>;

  @Column({ default: 'pending' })
  onboardingStatus: string;

  @Column({ type: 'int', default: 0 })
  onboardingStep: number;

  @Column({ type: 'jsonb', nullable: true })
  interviewData: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  reportSettings: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  @Column()
  ownerId: string;

  @Column({ nullable: true })
  ownerPhone: string;

  @Column({ nullable: true })
  ownerEmail: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
