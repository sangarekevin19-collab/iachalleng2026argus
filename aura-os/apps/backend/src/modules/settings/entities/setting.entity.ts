import { Entity, Column, PrimaryGeneratedColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('settings')
export class Setting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  companyId: string;

  @Column()
  key: string;

  @Column({ type: 'jsonb', default: {} })
  value: Record<string, any>;

  @Column({ default: 'general' })
  category: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
