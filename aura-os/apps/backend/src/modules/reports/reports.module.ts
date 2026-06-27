import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from './entities/report.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ReportGeneratorService } from './services/report-generator.service';
import { ReportSchedulerService } from './services/report-scheduler.service';
import { PosModule } from '../pos/pos.module';
import { FinanceModule } from '../finance/finance.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CrmModule } from '../crm/crm.module';
import { EmployeesModule } from '../employees/employees.module';
import { CompaniesModule } from '../companies/companies.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { EmailService } from '../../shared/services/email.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Report]),
    forwardRef(() => PosModule),
    forwardRef(() => FinanceModule),
    forwardRef(() => InventoryModule),
    forwardRef(() => CrmModule),
    forwardRef(() => EmployeesModule),
    forwardRef(() => CompaniesModule),
    forwardRef(() => WhatsappModule),
  ],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportGeneratorService,
    ReportSchedulerService,
    EmailService,
  ],
  exports: [ReportsService, ReportGeneratorService, TypeOrmModule],
})
export class ReportsModule {}
