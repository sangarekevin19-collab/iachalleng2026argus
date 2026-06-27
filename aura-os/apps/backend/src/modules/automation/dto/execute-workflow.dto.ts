import { IsOptional, IsObject, IsUUID } from 'class-validator';

export class ExecuteWorkflowDto {
  @IsOptional()
  @IsObject()
  inputData?: Record<string, any>;

  @IsOptional()
  @IsUUID()
  agentId?: string;
}
