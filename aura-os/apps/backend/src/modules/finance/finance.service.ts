import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Transaction } from './entities/transaction.entity';

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(Transaction)
    private transactionsRepository: Repository<Transaction>,
  ) {}

  async recordTransaction(data: Partial<Transaction>): Promise<Transaction> {
    const transaction = this.transactionsRepository.create(data);
    return this.transactionsRepository.save(transaction);
  }

  async getIncome(companyId: string, startDate: Date, endDate: Date): Promise<number> {
    const result = await this.transactionsRepository
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'total')
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.type = :type', { type: 'income' })
      .andWhere('t.date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getRawOne();
    return parseFloat(result?.total || 0);
  }

  async getExpenses(companyId: string, startDate: Date, endDate: Date): Promise<number> {
    const result = await this.transactionsRepository
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'total')
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.type = :type', { type: 'expense' })
      .andWhere('t.date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getRawOne();
    return parseFloat(result?.total || 0);
  }

  async getProfit(companyId: string, startDate: Date, endDate: Date): Promise<number> {
    const income = await this.getIncome(companyId, startDate, endDate);
    const expenses = await this.getExpenses(companyId, startDate, endDate);
    return income - expenses;
  }

  async getSummary(companyId: string, startDate: Date, endDate: Date) {
    const income = await this.getIncome(companyId, startDate, endDate);
    const expenses = await this.getExpenses(companyId, startDate, endDate);
    const profit = income - expenses;
    const transactions = await this.transactionsRepository.find({
      where: {
        companyId,
        date: Between(startDate, endDate),
      },
      order: { date: 'DESC' },
    });
    return { income, expenses, profit, transactions };
  }

  async listTransactions(companyId: string, page = 1, limit = 20) {
    const [data, total] = await this.transactionsRepository.findAndCount({
      where: { companyId },
      order: { date: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }
}
