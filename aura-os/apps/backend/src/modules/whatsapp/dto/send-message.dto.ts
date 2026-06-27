import { IsNotEmpty, IsOptional, IsString, IsEnum, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum SendMessageType {
  TEXT = 'text',
  IMAGE = 'image',
  DOCUMENT = 'document',
  TEMPLATE = 'template',
  INTERACTIVE = 'interactive',
}

export class SendMessageDto {
  @IsNotEmpty()
  @IsString()
  to: string;

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsEnum(SendMessageType)
  type?: SendMessageType;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  templateName?: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;
}

export class SendTemplateMessageDto {
  @IsNotEmpty()
  @IsString()
  to: string;

  @IsNotEmpty()
  @IsString()
  templateName: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;
}

export class SendBulkMessageDto {
  @IsNotEmpty()
  recipients: string[];

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsEnum(SendMessageType)
  type?: SendMessageType;

  @IsOptional()
  @IsString()
  templateName?: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;
}
