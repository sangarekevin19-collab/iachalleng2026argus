import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompaniesService } from './companies.service';

@ApiTags('companies')
@Controller('companies')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current user company' })
  async getCurrent(@Req() req: any) {
    return this.companiesService.findById(req.user.companyId);
  }

  @Patch('current')
  @ApiOperation({ summary: 'Update company info' })
  async update(@Req() req: any, @Body() data: Record<string, any>) {
    return this.companiesService.update(req.user.companyId, data);
  }

  @Get('digital-twin')
  @ApiOperation({ summary: 'Get digital twin of the company' })
  async getDigitalTwin(@Req() req: any) {
    const company = await this.companiesService.findById(req.user.companyId);
    return company?.digitalTwin || {};
  }

  @Get('health-score')
  @ApiOperation({ summary: 'Get company health score' })
  async getHealthScore(@Req() req: any) {
    const company = await this.companiesService.findById(req.user.companyId);
    return { score: company?.healthScore || 0 };
  }
}
