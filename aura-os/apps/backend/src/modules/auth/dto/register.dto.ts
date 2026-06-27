import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsPhoneNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Amadou' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Diallo' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: '+226XXXXXXXX' })
  @IsPhoneNumber()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'amadou@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'BF' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(2)
  countryCode: string;

  @ApiProperty({ example: 'Bobo-Dioulasso' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'Diallo Quincaillerie' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ example: '+226XXXXXXXX' })
  @IsPhoneNumber()
  @IsOptional()
  whatsapp?: string;

  @ApiPropertyOptional({ description: 'Preferred OTP channel', enum: ['sms', 'email', 'whatsapp'] })
  @IsString()
  @IsOptional()
  preferredOtpChannel?: 'sms' | 'email' | 'whatsapp';
}
