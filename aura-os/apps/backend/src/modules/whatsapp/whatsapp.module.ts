import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { WhatsappConversation } from './entities/whatsapp-conversation.entity';
import { WhatsappMessage } from './entities/whatsapp-message.entity';
import { WhatsappTemplate } from './entities/whatsapp-template.entity';
import { WhatsappCampaign } from './entities/whatsapp-campaign.entity';
import { WhatsappBusinessService } from './services/whatsapp-business.service';
import { WhatsappWebhookService } from './services/whatsapp-webhook.service';
import { WhatsappAutomationService } from './services/whatsapp-automation.service';
import { WhatsappController } from './whatsapp.controller';
import { CrmModule } from '../crm/crm.module';
import { PosModule } from '../pos/pos.module';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WhatsappConversation,
      WhatsappMessage,
      WhatsappTemplate,
      WhatsappCampaign,
    ]),
    ScheduleModule.forRoot(),
    forwardRef(() => CrmModule),
    forwardRef(() => PosModule),
    CompaniesModule,
  ],
  controllers: [WhatsappController],
  providers: [
    WhatsappBusinessService,
    WhatsappWebhookService,
    WhatsappAutomationService,
  ],
  exports: [
    WhatsappBusinessService,
    WhatsappAutomationService,
    WhatsappWebhookService,
  ],
})
export class WhatsappModule {}
