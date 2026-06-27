import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private employeesRepository: Repository<Employee>,
  ) {}

  async findById(id: string): Promise<Employee | null> {
    return this.employeesRepository.findOne({ where: { id } });
  }

  async findAllByCompany(companyId: string): Promise<Employee[]> {
    return this.employeesRepository.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(data: Partial<Employee>): Promise<Employee> {
    const employee = this.employeesRepository.create(data);
    return this.employeesRepository.save(employee);
  }

  async update(id: string, data: Partial<Employee>): Promise<Employee> {
    await this.employeesRepository.update(id, data);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.employeesRepository.delete(id);
  }
}
