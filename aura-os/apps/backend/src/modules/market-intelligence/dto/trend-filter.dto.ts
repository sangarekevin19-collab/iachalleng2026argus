import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class TrendFilterDto {
  @ApiPropertyOptional({ enum: ['product', 'category', 'region', 'season'] })
  @IsOptional()
  @IsString()
  @IsEnum(['product', 'category', 'region', 'season'])
  category: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region: string;

  @ApiPropertyOptional({ enum: ['rising', 'declining', 'stable', 'seasonal', 'new'] })
  @IsOptional()
  @IsString()
  @IsEnum(['rising', 'declining', 'stable', 'seasonal', 'new'])
  trendType: string;

  @ApiPropertyOptional({ enum: ['high', 'medium', 'low'] })
  @IsOptional()
  @IsString()
  @IsEnum(['high', 'medium', 'low'])
  impact: string;

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
