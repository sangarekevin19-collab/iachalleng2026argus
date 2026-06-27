import { IsOptional, IsString, IsEnum, IsArray, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateReportDto {
  @ApiProperty({ enum: ['daily', 'weekly', 'monthly', 'custom'] })
  @IsString()
  @IsEnum(['daily', 'weekly', 'monthly', 'custom'])
  type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sendVia: string[];
}
