import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CrmService } from './crm.service';

@ApiTags('crm')
@Controller('crm')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get('contacts')
  @ApiOperation({ summary: 'List all contacts' })
  async findAllContacts(@Req() req: any) {
    return this.crmService.findAllContacts(req.user.companyId);
  }

  @Get('contacts/:id')
  @ApiOperation({ summary: 'Get contact by ID' })
  async findContact(@Param('id') id: string) {
    return this.crmService.findContactById(id);
  }

  @Post('contacts')
  @ApiOperation({ summary: 'Create a new contact' })
  async createContact(@Req() req: any, @Body() data: Record<string, any>) {
    return this.crmService.createContact({ ...data, companyId: req.user.companyId });
  }

  @Patch('contacts/:id')
  @ApiOperation({ summary: 'Update a contact' })
  async updateContact(@Param('id') id: string, @Body() data: Record<string, any>) {
    return this.crmService.updateContact(id, data);
  }

  @Delete('contacts/:id')
  @ApiOperation({ summary: 'Delete a contact' })
  async removeContact(@Param('id') id: string) {
    return this.crmService.removeContact(id);
  }

  @Get('deals')
  @ApiOperation({ summary: 'List all deals' })
  async findAllDeals(@Req() req: any) {
    return this.crmService.findAllDeals(req.user.companyId);
  }

  @Get('deals/pipeline')
  @ApiOperation({ summary: 'Get deals pipeline grouped by stage' })
  async getPipeline(@Req() req: any) {
    return this.crmService.getDealsPipeline(req.user.companyId);
  }

  @Get('deals/:id')
  @ApiOperation({ summary: 'Get deal by ID' })
  async findDeal(@Param('id') id: string) {
    return this.crmService.findDealById(id);
  }

  @Post('deals')
  @ApiOperation({ summary: 'Create a new deal' })
  async createDeal(@Req() req: any, @Body() data: Record<string, any>) {
    return this.crmService.createDeal({ ...data, companyId: req.user.companyId });
  }

  @Patch('deals/:id')
  @ApiOperation({ summary: 'Update a deal' })
  async updateDeal(@Param('id') id: string, @Body() data: Record<string, any>) {
    return this.crmService.updateDeal(id, data);
  }

  @Delete('deals/:id')
  @ApiOperation({ summary: 'Delete a deal' })
  async removeDeal(@Param('id') id: string) {
    return this.crmService.removeDeal(id);
  }
}
