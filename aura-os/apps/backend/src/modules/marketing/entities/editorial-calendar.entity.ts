import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum CalendarStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

@Entity('editorial_calendars')
@Index(['companyId'])
@Index(['status'])
export class EditorialCalendar {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ type: 'jsonb', default: [] })
  items: {
    date: string;
    contentId: string;
    platform: string;
    status: string;
    notes: string;
  }[];

  @Column({ type: 'enum', enum: CalendarStatus, default: CalendarStatus.DRAFT })
  status: CalendarStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
