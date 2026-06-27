import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contact } from './entities/contact.entity';
import { Deal } from './entities/deal.entity';
import { CrmService } from './crm.service';
import { CrmController } from './crm.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Contact, Deal])],
  controllers: [CrmController],
  providers: [CrmService],
  exports: [CrmService, TypeOrmModule],
})
export class CrmModule {}
