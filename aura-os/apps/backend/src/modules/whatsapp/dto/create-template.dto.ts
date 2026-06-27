import { IsNotEmpty, IsOptional, IsString, IsEnum, IsObject, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TemplateCategory } from '../entities/whatsapp-template.entity';

export class TemplateHeaderDto {
  @IsNotEmpty()
  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;
}

export class TemplateButtonDto {
  @IsNotEmpty()
  @IsString()
  type: string;

  @IsNotEmpty()
  @IsString()
  text: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class CreateTemplateDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsNotEmpty()
  @IsEnum(TemplateCategory)
  category: TemplateCategory;

  @IsOptional()
  @IsObject()
  @Type(() => TemplateHeaderDto)
  header?: TemplateHeaderDto;

  @IsNotEmpty()
  @IsString()
  body: string;

  @IsOptional()
  @IsString()
  footer?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateButtonDto)
  buttons?: TemplateButtonDto[];

  @IsOptional()
  @IsArray()
  variables?: Record<string, any>[];
}
