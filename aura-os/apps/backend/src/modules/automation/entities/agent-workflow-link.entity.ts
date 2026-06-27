import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('agent_workflow_links')
export class AgentWorkflowLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  agentId: string;

  @Index()
  @Column()
  workflowId: string;

  @Column()
  workspaceId: string;

  @Column({ default: 'owner' })
  relationship: string;

  @Column({ type: 'jsonb', default: {} })
  config: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
