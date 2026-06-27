import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IntegrationService } from '../services/integration.service';

@ApiTags('automation/integrations')
@ApiBearerAuth()
@Controller('automation/integrations')
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  @Get()
  @ApiOperation({ summary: 'List all integrations' })
  async findAll(@Req() req: any) {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    return this.integrationService.findAll(workspaceId);
  }

  @Get('providers')
  @ApiOperation({ summary: 'List available integration providers' })
  async getProviders() {
    return this.integrationService.getAvailableProviders();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get integration statistics' })
  async getStats(@Req() req: any) {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    return this.integrationService.getStats(workspaceId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new integration' })
  async create(@Body() dto: any, @Req() req: any) {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    return this.integrationService.create(workspaceId, { ...dto, ownerId: req.userId });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an integration' })
  async update(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    return this.integrationService.update(id, workspaceId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an integration' })
  async remove(@Param('id') id: string, @Req() req: any) {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    return this.integrationService.remove(id, workspaceId);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test integration connection' })
  async testConnection(@Param('id') id: string, @Req() req: any) {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    return this.integrationService.testConnection(id, workspaceId);
  }
}
