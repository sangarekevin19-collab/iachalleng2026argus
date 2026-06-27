import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewSuggestionDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsString()
  @IsEnum(['approved', 'rejected'])
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes: string;
}
