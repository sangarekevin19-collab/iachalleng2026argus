import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendReportDto {
  @ApiProperty({ type: [String], example: ['email', 'whatsapp'] })
  @IsArray()
  @IsString({ each: true })
  channels: string[];
}
