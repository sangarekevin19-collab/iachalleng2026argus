import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemoryEntry } from './entities/memory-entry.entity';

@Injectable()
export class MemoryService {
  constructor(
    @InjectRepository(MemoryEntry)
    private memoryRepository: Repository<MemoryEntry>,
  ) {}

  async store(data: Partial<MemoryEntry>): Promise<MemoryEntry> {
    const entry = this.memoryRepository.create(data);
    return this.memoryRepository.save(entry);
  }

  async search(companyId: string, query: string): Promise<MemoryEntry[]> {
    return this.memoryRepository
      .createQueryBuilder('memory')
      .where('memory.companyId = :companyId', { companyId })
      .andWhere('memory.content ILIKE :query', { query: `%${query}%` })
      .orderBy('memory.createdAt', 'DESC')
      .limit(20)
      .getMany();
  }

  async getByType(companyId: string, type: string): Promise<MemoryEntry[]> {
    return this.memoryRepository.find({
      where: { companyId, type },
      order: { createdAt: 'DESC' },
    });
  }

  async getRecent(companyId: string, limit = 50): Promise<MemoryEntry[]> {
    return this.memoryRepository.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getHistory(companyId: string, userId: string): Promise<MemoryEntry[]> {
    return this.memoryRepository.find({
      where: { companyId, userId },
      order: { createdAt: 'DESC' },
    });
  }
}
