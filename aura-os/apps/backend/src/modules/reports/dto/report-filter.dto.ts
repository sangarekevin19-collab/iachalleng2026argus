import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ReportFilterDto {
  @ApiPropertyOptional({ enum: ['daily', 'weekly', 'monthly', 'custom'] })
  @IsOptional()
  @IsString()
  @IsEnum(['daily', 'weekly', 'monthly', 'custom'])
  type: string;

  @ApiPropertyOptional({ enum: ['generating', 'completed', 'failed'] })
  @IsOptional()
  @IsString()
  @IsEnum(['generating', 'completed', 'failed'])
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number;
}
