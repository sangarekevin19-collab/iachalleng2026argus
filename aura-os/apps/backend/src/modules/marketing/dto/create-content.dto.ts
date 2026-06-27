import { IsEnum, IsNotEmpty, IsOptional, IsString, IsDateString, IsArray } from 'class-validator';
import { ContentType, ContentPlatform } from '../entities/marketing-content.entity';

export enum ContentTone {
  PROFESSIONAL = 'professional',
  CASUAL = 'casual',
  HUMOROUS = 'humorous',
  INSPIRATIONAL = 'inspirational',
  URGENT = 'urgent',
}

export class CreateContentDto {
  @IsEnum(ContentType)
  @IsNotEmpty()
  type: ContentType;

  @IsString()
  @IsOptional()
  title: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsEnum(ContentPlatform)
  @IsOptional()
  platform: ContentPlatform = ContentPlatform.ALL;

  @IsEnum(ContentTone)
  @IsOptional()
  tone: ContentTone = ContentTone.PROFESSIONAL;

  @IsString()
  @IsNotEmpty()
  topic: string;

  @IsString()
  @IsOptional()
  targetAudience: string;

  @IsString()
  @IsOptional()
  callToAction: string;

  @IsDateString()
  @IsOptional()
  scheduledAt: string;

  @IsString()
  @IsOptional()
  language: string = 'fr';

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  hashtags: string[];
}
