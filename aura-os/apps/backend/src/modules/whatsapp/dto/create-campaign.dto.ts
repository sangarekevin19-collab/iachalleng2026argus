import { IsNotEmpty, IsOptional, IsString, IsObject, IsArray, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class TargetAudienceDto {
  @IsOptional()
  @IsString()
  segment?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;
}

export class CreateCampaignDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  templateName?: string;

  @IsOptional()
  @IsObject()
  @Type(() => TargetAudienceDto)
  targetAudience?: TargetAudienceDto;

  @IsOptional()
  @IsArray()
  recipients?: string[];

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
