import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, Brackets } from 'typeorm';
import { Product } from './entities/product.entity';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
  ) {}

  async findById(id: string): Promise<Product | null> {
    return this.productsRepository.findOne({ where: { id } });
  }

  async findAllByCompany(companyId: string, page = 1, limit = 50): Promise<{ data: Product[]; total: number }> {
    const [data, total] = await this.productsRepository.findAndCount({
      where: { companyId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async findByBarcode(companyId: string, barcode: string): Promise<Product | null> {
    return this.productsRepository.findOne({ where: { companyId, barcode } });
  }

  async findBySku(companyId: string, sku: string): Promise<Product | null> {
    return this.productsRepository.findOne({ where: { companyId, sku } });
  }

  async create(data: Partial<Product>): Promise<Product> {
    const product = this.productsRepository.create(data);
    return this.productsRepository.save(product);
  }

  async update(id: string, data: Partial<Product>): Promise<Product> {
    await this.productsRepository.update(id, data);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.productsRepository.delete(id);
  }

  async updateStock(id: string, quantity: number, type: 'in' | 'out'): Promise<Product> {
    const product = await this.findById(id);
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    if (type === 'out') {
      if (product.stock < quantity) {
        throw new BadRequestException(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${quantity}`);
      }
      product.stock -= quantity;
    } else {
      product.stock += quantity;
    }

    this.logger.log(`Stock ${type} for ${product.name}: ${quantity} units. New stock: ${product.stock}`);
    return this.productsRepository.save(product);
  }

  async adjustStock(id: string, adjustment: number, reason?: string): Promise<Product> {
    const product = await this.findById(id);
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    const newStock = product.stock + adjustment;
    if (newStock < 0) {
      throw new BadRequestException(`Stock cannot be negative. Current: ${product.stock}, Adjustment: ${adjustment}`);
    }

    product.stock = newStock;
    this.logger.log(`Stock adjusted for ${product.name}: ${adjustment > 0 ? '+' : ''}${adjustment}. Reason: ${reason || 'Manual adjustment'}`);
    return this.productsRepository.save(product);
  }

  async getLowStock(companyId: string): Promise<Product[]> {
    return this.productsRepository
      .createQueryBuilder('product')
      .where('product.companyId = :companyId', { companyId })
      .andWhere('product.stock <= product.minStock')
      .andWhere('product.isActive = :isActive', { isActive: true })
      .getMany();
  }

  async getStockAlerts(companyId: string): Promise<{ product: Product; currentStock: number; minStock: number; deficit: number }[]> {
    const products = await this.productsRepository
      .createQueryBuilder('product')
      .where('product.companyId = :companyId', { companyId })
      .andWhere('product.isActive = :isActive', { isActive: true })
      .andWhere(
        new Brackets(qb => {
          qb.where('product.stock <= product.minStock')
            .orWhere('product.stock = 0');
        }),
      )
      .orderBy('product.stock', 'ASC')
      .getMany();

    return products.map(product => ({
      product,
      currentStock: product.stock,
      minStock: product.minStock,
      deficit: Math.max(0, product.minStock - product.stock),
    }));
  }

  async bulkImport(products: Partial<Product>[]): Promise<{ created: Product[]; errors: { index: number; error: string }[] }> {
    const created: Product[] = [];
    const errors: { index: number; error: string }[] = [];

    for (let i = 0; i < products.length; i++) {
      try {
        const product = this.productsRepository.create(products[i]);
        const saved = await this.productsRepository.save(product);
        created.push(saved);
      } catch (error) {
        errors.push({ index: i, error: error.message });
      }
    }

    this.logger.log(`Bulk import completed: ${created.length} created, ${errors.length} errors`);
    return { created, errors };
  }

  async getInventorySummary(companyId: string): Promise<{
    totalProducts: number;
    totalStock: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    categories: { name: string; count: number }[];
  }> {
    const products = await this.productsRepository.find({ where: { companyId, isActive: true } });

    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    const totalValue = products.reduce((sum, p) => sum + Number(p.costPrice) * p.stock, 0);
    const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= p.minStock).length;
    const outOfStockCount = products.filter(p => p.stock === 0).length;

    const categoryMap = new Map<string, number>();
    for (const product of products) {
      const cat = product.category || 'Non catégorisé';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    }
    const categories = Array.from(categoryMap.entries()).map(([name, count]) => ({ name, count }));

    return { totalProducts, totalStock, totalValue, lowStockCount, outOfStockCount, categories };
  }

  async searchProducts(companyId: string, query: string, limit = 20): Promise<Product[]> {
    return this.productsRepository
      .createQueryBuilder('product')
      .where('product.companyId = :companyId', { companyId })
      .andWhere(
        new Brackets(qb => {
          qb.where('product.name ILIKE :query', { query: `%${query}%` })
            .orWhere('product.sku ILIKE :query', { query: `%${query}%` })
            .orWhere('product.barcode ILIKE :query', { query: `%${query}%` });
        }),
      )
      .andWhere('product.isActive = :isActive', { isActive: true })
      .take(limit)
      .getMany();
  }
}
