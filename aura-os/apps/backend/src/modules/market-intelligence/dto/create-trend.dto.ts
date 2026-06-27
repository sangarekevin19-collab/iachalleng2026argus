import { IsOptional, IsString, IsEnum, IsNumber, IsArray, IsJSON, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateTrendDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description: string;

  @ApiProperty({ enum: ['product', 'category', 'region', 'season'] })
  @IsString()
  @IsEnum(['product', 'category', 'region', 'season'])
  category: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region: string;

  @ApiProperty({ enum: ['rising', 'declining', 'stable', 'seasonal', 'new'] })
  @IsString()
  @IsEnum(['rising', 'declining', 'stable', 'seasonal', 'new'])
  trendType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  confidence: number;

  @ApiProperty({ enum: ['high', 'medium', 'low'] })
  @IsString()
  @IsEnum(['high', 'medium', 'low'])
  impact: string;

  @ApiPropertyOptional()
  @IsOptional()
  data: Record<string, any>;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedProducts: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  suggestedActions: string[];
}
