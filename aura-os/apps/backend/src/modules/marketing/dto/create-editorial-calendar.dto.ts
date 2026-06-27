import { IsNotEmpty, IsOptional, IsString, IsDateString, IsArray } from 'class-validator';

export class CreateEditorialCalendarDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsArray()
  @IsOptional()
  items: {
    date: string;
    contentId: string;
    platform: string;
    status: string;
    notes: string;
  }[];
}
