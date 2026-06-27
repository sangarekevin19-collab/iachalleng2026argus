import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowTemplate } from '../entities/workflow-template.entity';

@Injectable()
export class WorkflowTemplateService {
  private readonly logger = new Logger(WorkflowTemplateService.name);

  constructor(
    @InjectRepository(WorkflowTemplate)
    private readonly templateRepo: Repository<WorkflowTemplate>,
  ) {}

  async findAll(category?: string): Promise<WorkflowTemplate[]> {
    const where: any = { isActive: true };
    if (category) where.category = category;
    return this.templateRepo.find({ where, order: { usageCount: 'DESC' } });
  }

  async findOne(id: string): Promise<WorkflowTemplate> {
    return this.templateRepo.findOne({ where: { id } });
  }

  async create(dto: Partial<WorkflowTemplate>): Promise<WorkflowTemplate> {
    const template = this.templateRepo.create({
      ...dto,
      isSystem: false,
      usageCount: 0,
    });
    return this.templateRepo.save(template);
  }

  async update(id: string, dto: Partial<WorkflowTemplate>): Promise<WorkflowTemplate> {
    const template = await this.findOne(id);
    if (!template) throw new Error(`Template ${id} not found`);
    Object.assign(template, dto);
    return this.templateRepo.save(template);
  }

  async remove(id: string): Promise<void> {
    const template = await this.findOne(id);
    if (template?.isSystem) throw new Error('Cannot delete system template');
    await this.templateRepo.remove(template);
  }

  async incrementUsage(id: string): Promise<void> {
    await this.templateRepo.increment({ id }, 'usageCount', 1);
  }

  async getCategories(): Promise<string[]> {
    const result = await this.templateRepo
      .createQueryBuilder('t')
      .select('DISTINCT t.category', 'category')
      .where('t.isActive = true')
      .getRawMany();
    return result.map((r) => r.category);
  }

  async getSystemTemplates(): Promise<WorkflowTemplate[]> {
    return this.templateRepo.find({
      where: { isSystem: true, isActive: true },
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  async findSuitable(industry?: string, category?: string): Promise<WorkflowTemplate[]> {
    const qb = this.templateRepo.createQueryBuilder('t')
      .where('t.isActive = true');

    if (industry) qb.andWhere('t.industry = :industry', { industry });
    if (category) qb.andWhere('t.category = :category', { category });

    return qb.orderBy('t.usageCount', 'DESC').limit(10).getMany();
  }
}
