import { IsString, IsOptional, IsArray, IsUUID } from 'class-validator';

export class CreateWebhookDto {
  @IsString()
  provider: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsArray()
  events?: string[];

  @IsOptional()
  @IsUUID()
  workflowId?: string;

  @IsOptional()
  @IsString()
  method?: string;
}
