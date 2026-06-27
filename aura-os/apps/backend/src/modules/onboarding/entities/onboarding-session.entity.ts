import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('onboarding_sessions')
export class OnboardingSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @Index()
  @Column()
  companyId: string;

  @Column({ default: 'phase_1' })
  currentPhase: string;

  @Column({ type: 'jsonb', default: {} })
  responses: Record<string, any>;

  @Column({ type: 'jsonb', default: [] })
  questions: Record<string, any>[];

  @Column({ default: false })
  isComplete: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
