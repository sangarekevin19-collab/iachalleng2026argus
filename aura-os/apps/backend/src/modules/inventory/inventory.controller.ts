import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'List all products for the company' })
  async findAll(@Req() req: any) {
    return this.inventoryService.findAllByCompany(req.user.companyId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search products by name, SKU, or barcode' })
  async search(@Req() req: any, @Query('q') query: string) {
    return this.inventoryService.searchProducts(req.user.companyId, query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get inventory summary' })
  async getSummary(@Req() req: any) {
    return this.inventoryService.getInventorySummary(req.user.companyId);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get low stock alerts' })
  async getLowStock(@Req() req: any) {
    return this.inventoryService.getLowStock(req.user.companyId);
  }

  @Get('alerts/low-stock')
  @ApiOperation({ summary: 'Get all stock alerts with deficit info' })
  async getStockAlerts(@Req() req: any) {
    return this.inventoryService.getStockAlerts(req.user.companyId);
  }

  @Get('alerts/all')
  @ApiOperation({ summary: 'Get all stock alerts (low + out of stock)' })
  async getAllAlerts(@Req() req: any) {
    return this.inventoryService.getStockAlerts(req.user.companyId);
  }

  @Post('products/bulk')
  @ApiOperation({ summary: 'Bulk import products' })
  async bulkImport(@Req() req: any, @Body() products: Record<string, any>[]) {
    return this.inventoryService.bulkImport(
      products.map(p => ({ ...p, companyId: req.user.companyId })),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  async findOne(@Param('id') id: string) {
    return this.inventoryService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  async create(@Req() req: any, @Body() data: Record<string, any>) {
    return this.inventoryService.create({ ...data, companyId: req.user.companyId });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product' })
  async update(@Param('id') id: string, @Body() data: Record<string, any>) {
    return this.inventoryService.update(id, data);
  }

  @Patch(':id/stock')
  @ApiOperation({ summary: 'Update product stock (in/out)' })
  async updateStock(
    @Param('id') id: string,
    @Body() dto: { quantity: number; type: 'in' | 'out' },
  ) {
    return this.inventoryService.updateStock(id, dto.quantity, dto.type);
  }

  @Post(':id/adjust')
  @ApiOperation({ summary: 'Manually adjust stock (positive or negative adjustment)' })
  async adjustStock(
    @Param('id') id: string,
    @Body() dto: { adjustment: number; reason?: string },
  ) {
    return this.inventoryService.adjustStock(id, dto.adjustment, dto.reason);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product' })
  async remove(@Param('id') id: string) {
    return this.inventoryService.remove(id);
  }
}
