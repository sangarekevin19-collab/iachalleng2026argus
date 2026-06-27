import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  companyId: string;

  @Index()
  @Column()
  userId: string;

  @Column()
  employeeId: string;

  @Column()
  role: string;

  @Column({ nullable: true })
  department: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  salary: number;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ type: 'date', nullable: true })
  hireDate: Date;

  @Column({ default: 'active' })
  status: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  averageScore: number;

  @Column({ default: 'F' })
  scoreGrade: string;

  @Column({ type: 'timestamp', nullable: true })
  lastScoreAt: Date;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
