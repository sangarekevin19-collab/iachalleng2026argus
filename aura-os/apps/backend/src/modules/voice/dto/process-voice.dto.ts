import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const SUPPORTED_LANGUAGES = ['fr', 'fr-FR', 'fr-african', 'bm', 'dy', 'ff', 'en'];
const SUPPORTED_CURRENCIES = ['XOF', 'USD', 'EUR', 'XAF', 'NGN', 'GHS'];

export class ProcessVoiceDto {
  @ApiProperty({ description: 'Audio encodé en base64' })
  @IsString()
  audioBase64: string;

  @ApiPropertyOptional({ description: 'Code langue', default: 'fr-FR', enum: SUPPORTED_LANGUAGES })
  @IsOptional()
  @IsIn(SUPPORTED_LANGUAGES)
  language?: string = 'fr-FR';

  @ApiPropertyOptional({ description: 'Devise', default: 'XOF', enum: SUPPORTED_CURRENCIES })
  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES)
  currency?: string = 'XOF';
}
