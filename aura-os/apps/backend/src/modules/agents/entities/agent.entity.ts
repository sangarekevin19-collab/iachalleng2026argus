import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('agents')
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  companyId: string;

  @Column()
  name: string;

  @Column()
  type: string;

  @Column()
  role: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  color: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  systemPrompt: string;

  @Column({ type: 'jsonb', default: [] })
  tools: Record<string, any>[];

  @Column({ type: 'jsonb', default: {} })
  memory: Record<string, any>;

  @Column({ type: 'jsonb', default: {} })
  permissions: Record<string, any>;

  @Column({ type: 'jsonb', default: {} })
  config: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastActive: Date;

  @Column({ type: 'int', default: 0 })
  tasksCompleted: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Index()
  @Column({ nullable: true })
  parentAgentId: string;

  @Column({ type: 'jsonb', default: [] })
  dependencies: string[];

  @Column({ nullable: true })
  communicationStyle: string;

  @Column({ type: 'jsonb', default: [] })
  languages: string[];

  @Column({ type: 'jsonb', default: [] })
  conversationHistory: Record<string, any>[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
