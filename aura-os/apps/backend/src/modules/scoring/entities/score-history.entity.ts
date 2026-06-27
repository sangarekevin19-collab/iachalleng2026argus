import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('score_history')
export class ScoreHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  scoreId: string;

  @Index()
  @Column()
  companyId: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  previousScore: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  newScore: number;

  @Column({ type: 'jsonb', default: {} })
  changeReason: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
