import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum ScoreTargetType {
  EMPLOYEE = 'employee',
  PRODUCT = 'product',
  CUSTOMER = 'customer',
  SUPPLIER = 'supplier',
  COMPANY = 'company',
  AI_AGENT = 'ai_agent',
}

export enum ScoreTrend {
  UP = 'up',
  DOWN = 'down',
  STABLE = 'stable',
}

export enum ScoreGrade {
  A_PLUS = 'A+',
  A = 'A',
  B_PLUS = 'B+',
  B = 'B',
  C_PLUS = 'C+',
  C = 'C',
  D = 'D',
  F = 'F',
}

@Entity('scores')
export class Score {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  companyId: string;

  @Index()
  @Column({ type: 'enum', enum: ScoreTargetType })
  targetType: ScoreTargetType;

  @Index()
  @Column()
  targetId: string;

  @Column()
  targetName: string;

  @Column()
  category: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  score: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  previousScore: number;

  @Column({ type: 'enum', enum: ScoreTrend, default: ScoreTrend.STABLE })
  trend: ScoreTrend;

  @Column({ type: 'jsonb', default: {} })
  factors: Record<string, any>;

  @Column({ type: 'enum', enum: ScoreGrade, default: ScoreGrade.F })
  grade: ScoreGrade;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1 })
  weight: number;

  @Column({ default: 'system' })
  calculatedBy: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  calculatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
