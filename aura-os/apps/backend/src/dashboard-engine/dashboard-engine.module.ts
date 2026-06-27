import { Module, Global } from '@nestjs/common';
import { DashboardEngineService } from './dashboard-engine.service';
import { CompaniesModule } from '../modules/companies/companies.module';

@Global()
@Module({
  imports: [CompaniesModule],
  providers: [DashboardEngineService],
  exports: [DashboardEngineService],
})
export class DashboardEngineModule {}
