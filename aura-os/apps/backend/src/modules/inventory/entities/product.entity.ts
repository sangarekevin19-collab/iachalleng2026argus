import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  companyId: string;

  @Column()
  name: string;

  @Column()
  sku: string;

  @Column({ nullable: true })
  barcode: string;

  @Column({ nullable: true })
  category: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  costPrice: number;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ type: 'int', default: 0 })
  minStock: number;

  @Column({ default: 'unit' })
  unit: string;

  @Column({ type: 'jsonb', default: [] })
  images: string[];

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  performanceScore: number;

  @Column({ default: 'F' })
  scoreGrade: string;

  @Column({ type: 'int', default: 0 })
  salesRank: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
