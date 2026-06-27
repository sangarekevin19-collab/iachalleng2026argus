import { IsEnum, IsNotEmpty, IsOptional, IsString, IsArray, IsBoolean } from 'class-validator';

export enum ImageStyle {
  REALISTIC = 'realistic',
  CARTOON = 'cartoon',
  MINIMALIST = 'minimalist',
  AFRICAN = 'african',
  VIBRANT = 'vibrant',
  PROFESSIONAL = 'professional',
}

export enum ImageDimensions {
  SQUARE = 'square',
  PORTRAIT = 'portrait',
  LANDSCAPE = 'landscape',
  STORY = 'story',
}

export class GenerateImageDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsEnum(ImageStyle)
  @IsOptional()
  style: ImageStyle = ImageStyle.VIBRANT;

  @IsEnum(ImageDimensions)
  @IsOptional()
  dimensions: ImageDimensions = ImageDimensions.SQUARE;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  brandColors: string[];

  @IsBoolean()
  @IsOptional()
  includeLogo: boolean = false;
}
