import { IsEnum, IsNotEmpty, IsOptional, IsString, IsObject, IsNumber, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScoreTargetType } from '../entities/score.entity';

export class CalculateScoreDto {
  @ApiProperty({ enum: ScoreTargetType })
  @IsEnum(ScoreTargetType)
  targetType: ScoreTargetType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  targetId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  targetName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  factors: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
