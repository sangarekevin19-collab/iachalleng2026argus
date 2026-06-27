import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendReceiptDto {
  @ApiProperty({ description: 'Channels to resend receipt via', example: ['whatsapp', 'sms'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  channels: string[];
}
