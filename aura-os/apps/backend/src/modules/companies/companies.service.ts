import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private companiesRepository: Repository<Company>,
  ) {}

  async findById(id: string): Promise<Company | null> {
    return this.companiesRepository.findOne({ where: { id } });
  }

  async update(id: string, data: Partial<Company>): Promise<Company> {
    await this.companiesRepository.update(id, data);
    return this.findById(id);
  }

  async findAll(): Promise<Company[]> {
    return this.companiesRepository.find({ where: { isActive: true } });
  }

  async updateSettings(id: string, settings: Record<string, any>): Promise<void> {
    const company = await this.findById(id);
    await this.companiesRepository.update(id, {
      reportSettings: { ...company.reportSettings, ...settings },
    });
  }

  async updateOnboardingStatus(id: string, status: string, step: number): Promise<void> {
    await this.companiesRepository.update(id, {
      onboardingStatus: status,
      onboardingStep: step,
    });
  }

  async updateDigitalTwin(id: string, twinData: Record<string, any>): Promise<void> {
    const company = await this.findById(id);
    await this.companiesRepository.update(id, {
      digitalTwin: { ...company.digitalTwin, ...twinData },
    });
  }

  async updateHealthScore(id: string, score: number): Promise<void> {
    await this.companiesRepository.update(id, { healthScore: score });
  }
}
