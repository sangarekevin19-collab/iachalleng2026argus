import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DeliveryService } from './delivery.service';

@ApiTags('delivery')
@Controller('delivery')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Get()
  @ApiOperation({ summary: 'List all deliveries for the company' })
  async findAll(@Req() req: any) {
    return this.deliveryService.findAllByCompany(req.user.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get delivery by ID' })
  async findOne(@Param('id') id: string) {
    return this.deliveryService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new delivery' })
  async create(@Req() req: any, @Body() data: Record<string, any>) {
    return this.deliveryService.create({ ...data, companyId: req.user.companyId });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a delivery' })
  async update(@Param('id') id: string, @Body() data: Record<string, any>) {
    return this.deliveryService.update(id, data);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update delivery status' })
  async updateStatus(@Param('id') id: string, @Body() dto: { status: string }) {
    return this.deliveryService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a delivery' })
  async remove(@Param('id') id: string) {
    return this.deliveryService.remove(id);
  }
}
