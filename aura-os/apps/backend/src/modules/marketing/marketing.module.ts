import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketingContent } from './entities/marketing-content.entity';
import { EditorialCalendar } from './entities/editorial-calendar.entity';
import { MarketingCampaign } from './entities/marketing-campaign.entity';
import { MarketingController } from './marketing.controller';
import { MarketingService } from './services/marketing.service';
import { AiContentGeneratorService } from './services/ai-content-generator.service';
import { AiImageGeneratorService } from './services/ai-image-generator.service';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketingContent, EditorialCalendar, MarketingCampaign]),
    SharedModule,
  ],
  controllers: [MarketingController],
  providers: [MarketingService, AiContentGeneratorService, AiImageGeneratorService],
  exports: [MarketingService, AiContentGeneratorService, AiImageGeneratorService],
})
export class MarketingModule {}
