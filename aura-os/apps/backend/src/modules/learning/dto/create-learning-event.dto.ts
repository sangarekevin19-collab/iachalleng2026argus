import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLearningEventDto {
  @ApiProperty({ enum: ['sale_made', 'sale_cancelled', 'stock_adjusted', 'employee_action', 'customer_interaction', 'decision_made', 'feedback_received', 'error_occurred', 'pattern_detected'] })
  @IsString()
  @IsEnum(['sale_made', 'sale_cancelled', 'stock_adjusted', 'employee_action', 'customer_interaction', 'decision_made', 'feedback_received', 'error_occurred', 'pattern_detected'])
  eventType: string;

  @ApiProperty({ enum: ['sales', 'inventory', 'finance', 'customer', 'employee', 'operations', 'strategy'] })
  @IsString()
  @IsEnum(['sales', 'inventory', 'finance', 'customer', 'employee', 'operations', 'strategy'])
  category: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  data: Record<string, any>;

  @ApiProperty({ enum: ['positive', 'negative', 'neutral'] })
  @IsString()
  @IsEnum(['positive', 'negative', 'neutral'])
  impact: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lesson: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actionTaken: string;
}
