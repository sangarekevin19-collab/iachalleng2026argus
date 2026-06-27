import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('workflow_versions')
export class WorkflowVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  workflowId: string;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'jsonb' })
  nodes: Record<string, any>[];

  @Column({ type: 'jsonb' })
  connections: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  changeDescription: string;

  @Column({ nullable: true })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;
}
