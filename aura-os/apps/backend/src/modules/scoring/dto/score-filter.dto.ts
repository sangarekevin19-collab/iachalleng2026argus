import { IsOptional, IsEnum, IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ScoreTargetType, ScoreGrade } from '../entities/score.entity';

export class ScoreFilterDto {
  @ApiPropertyOptional({ enum: ScoreTargetType })
  @IsOptional()
  @IsEnum(ScoreTargetType)
  targetType?: ScoreTargetType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: ScoreGrade })
  @IsOptional()
  @IsEnum(ScoreGrade)
  grade?: ScoreGrade;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minScore?: number;

  @ApiPropertyOptional({ maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Max(100)
  maxScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}
