import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private settingsRepository: Repository<Setting>,
  ) {}

  async get(companyId: string, key: string): Promise<Setting | null> {
    return this.settingsRepository.findOne({ where: { companyId, key } });
  }

  async set(companyId: string, key: string, value: Record<string, any>, category = 'general'): Promise<Setting> {
    const existing = await this.get(companyId, key);
    if (existing) {
      existing.value = value;
      existing.category = category;
      return this.settingsRepository.save(existing);
    }
    const setting = this.settingsRepository.create({ companyId, key, value, category });
    return this.settingsRepository.save(setting);
  }

  async getByCategory(companyId: string, category: string): Promise<Setting[]> {
    return this.settingsRepository.find({
      where: { companyId, category },
      order: { key: 'ASC' },
    });
  }

  async getAll(companyId: string): Promise<Setting[]> {
    return this.settingsRepository.find({
      where: { companyId },
      order: { category: 'ASC', key: 'ASC' },
    });
  }
}
