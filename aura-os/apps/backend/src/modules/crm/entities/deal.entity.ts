import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('deals')
export class Deal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  companyId: string;

  @Index()
  @Column()
  contactId: string;

  @Column()
  title: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  value: number;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ default: 'lead' })
  stage: string;

  @Column({ type: 'int', default: 0 })
  probability: number;

  @Column({ type: 'date', nullable: true })
  expectedCloseDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
