import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './entities/contact.entity';
import { Deal } from './entities/deal.entity';

@Injectable()
export class CrmService {
  constructor(
    @InjectRepository(Contact)
    private contactsRepository: Repository<Contact>,
    @InjectRepository(Deal)
    private dealsRepository: Repository<Deal>,
  ) {}

  async findContactById(id: string): Promise<Contact | null> {
    return this.contactsRepository.findOne({ where: { id } });
  }

  async findAllContacts(companyId: string): Promise<Contact[]> {
    return this.contactsRepository.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
  }

  async createContact(data: Partial<Contact>): Promise<Contact> {
    const contact = this.contactsRepository.create(data);
    return this.contactsRepository.save(contact);
  }

  async updateContact(id: string, data: Partial<Contact>): Promise<Contact> {
    await this.contactsRepository.update(id, data);
    return this.findContactById(id);
  }

  async removeContact(id: string): Promise<void> {
    await this.contactsRepository.delete(id);
  }

  async findDealById(id: string): Promise<Deal | null> {
    return this.dealsRepository.findOne({ where: { id } });
  }

  async findAllDeals(companyId: string): Promise<Deal[]> {
    return this.dealsRepository.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
  }

  async getDealsPipeline(companyId: string): Promise<Record<string, Deal[]>> {
    const deals = await this.findAllDeals(companyId);
    const pipeline: Record<string, Deal[]> = {};
    for (const deal of deals) {
      if (!pipeline[deal.stage]) {
        pipeline[deal.stage] = [];
      }
      pipeline[deal.stage].push(deal);
    }
    return pipeline;
  }

  async createDeal(data: Partial<Deal>): Promise<Deal> {
    const deal = this.dealsRepository.create(data);
    return this.dealsRepository.save(deal);
  }

  async updateDeal(id: string, data: Partial<Deal>): Promise<Deal> {
    await this.dealsRepository.update(id, data);
    return this.findDealById(id);
  }

  async removeDeal(id: string): Promise<void> {
    await this.dealsRepository.delete(id);
  }
}
