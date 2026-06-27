import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from './entities/sale.entity';
import { Receipt } from './entities/receipt.entity';
import { PosService } from './pos.service';
import { PosController } from './pos.controller';
import { ReceiptGeneratorService } from './services/receipt-generator.service';
import { InventoryModule } from '../inventory/inventory.module';
import { CompaniesModule } from '../companies/companies.module';
import { SmsService } from '../../shared/services/sms.service';
import { EmailService } from '../../shared/services/email.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale, Receipt]),
    InventoryModule,
    CompaniesModule,
  ],
  controllers: [PosController],
  providers: [
    PosService,
    ReceiptGeneratorService,
    SmsService,
    EmailService,
  ],
  exports: [PosService, TypeOrmModule],
})
export class PosModule {}
