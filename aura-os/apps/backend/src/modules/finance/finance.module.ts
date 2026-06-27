import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction])],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService, TypeOrmModule],
})
export class FinanceModule {}
