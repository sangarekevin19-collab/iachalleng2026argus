import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ScheduleStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
}

@Entity('automation_schedules')
export class AutomationSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  workflowId: string;

  @Column()
  workspaceId: string;

  @Column({ type: 'enum', enum: ScheduleStatus, default: ScheduleStatus.ACTIVE })
  status: ScheduleStatus;

  @Column()
  cronExpression: string;

  @Column({ nullable: true })
  timezone: string;

  @Column({ type: 'jsonb', default: {} })
  inputData: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  nextRunAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastRunAt: Date;

  @Column({ type: 'int', default: 0 })
  runCount: number;

  @Column({ type: 'int', nullable: true })
  maxRuns: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
