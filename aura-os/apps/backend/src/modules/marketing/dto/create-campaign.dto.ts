import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber, IsDateString, IsArray } from 'class-validator';
import { CampaignObjective } from '../entities/marketing-campaign.entity';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsEnum(CampaignObjective)
  @IsNotEmpty()
  objective: CampaignObjective;

  @IsOptional()
  targetAudience: {
    demographics: string[];
    interests: string[];
    location: string;
    ageRange: string;
  };

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  platforms: string[];

  @IsNumber()
  @IsOptional()
  budget: number = 0;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}
