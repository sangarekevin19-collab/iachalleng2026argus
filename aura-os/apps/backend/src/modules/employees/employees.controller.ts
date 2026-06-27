import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmployeesService } from './employees.service';

@ApiTags('employees')
@Controller('employees')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @ApiOperation({ summary: 'List all employees for the company' })
  async findAll(@Req() req: any) {
    return this.employeesService.findAllByCompany(req.user.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get employee by ID' })
  async findOne(@Param('id') id: string) {
    return this.employeesService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new employee' })
  async create(@Req() req: any, @Body() data: Record<string, any>) {
    return this.employeesService.create({ ...data, companyId: req.user.companyId });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an employee' })
  async update(@Param('id') id: string, @Body() data: Record<string, any>) {
    return this.employeesService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an employee' })
  async remove(@Param('id') id: string) {
    return this.employeesService.remove(id);
  }
}
