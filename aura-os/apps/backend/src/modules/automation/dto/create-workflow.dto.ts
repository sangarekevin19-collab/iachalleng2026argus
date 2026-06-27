import { IsString, IsOptional, IsEnum, IsArray, IsBoolean, IsObject, IsUUID } from 'class-validator';
import { WorkflowCategory } from '../entities/automation-workflow.entity';

export class CreateWorkflowDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(WorkflowCategory)
  category?: WorkflowCategory;

  @IsOptional()
  @IsArray()
  nodes?: Record<string, any>[];

  @IsOptional()
  @IsObject()
  connections?: Record<string, any>;

  @IsOptional()
  @IsArray()
  triggers?: Record<string, any>[];

  @IsOptional()
  @IsArray()
  requiredPermissions?: string[];

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @IsOptional()
  @IsUUID()
  agentId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsObject()
  scheduleConfig?: Record<string, any>;
}
