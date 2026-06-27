import { IsString, IsOptional, IsBoolean, IsArray, IsNumber, IsJSON } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAgentDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  role: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  tools?: Record<string, any>[];

  @ApiPropertyOptional()
  @IsOptional()
  permissions?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  config?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentAgentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  dependencies?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  communicationStyle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  languages?: string[];
}
