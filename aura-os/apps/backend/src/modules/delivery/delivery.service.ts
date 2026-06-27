import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Delivery } from './entities/delivery.entity';

@Injectable()
export class DeliveryService {
  constructor(
    @InjectRepository(Delivery)
    private deliveryRepository: Repository<Delivery>,
  ) {}

  async findById(id: string): Promise<Delivery | null> {
    return this.deliveryRepository.findOne({ where: { id } });
  }

  async findAllByCompany(companyId: string): Promise<Delivery[]> {
    return this.deliveryRepository.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(data: Partial<Delivery>): Promise<Delivery> {
    const delivery = this.deliveryRepository.create(data);
    return this.deliveryRepository.save(delivery);
  }

  async update(id: string, data: Partial<Delivery>): Promise<Delivery> {
    await this.deliveryRepository.update(id, data);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.deliveryRepository.delete(id);
  }

  async updateStatus(id: string, status: string): Promise<Delivery> {
    const updateData: any = { status };
    if (status === 'delivered') {
      updateData.deliveredAt = new Date();
    }
    await this.deliveryRepository.update(id, updateData);
    return this.findById(id);
  }
}
