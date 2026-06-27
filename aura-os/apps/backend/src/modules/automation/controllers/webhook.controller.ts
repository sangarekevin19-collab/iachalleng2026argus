import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WebhookService } from '../services/webhook.service';
import { CreateWebhookDto } from '../dto/create-webhook.dto';

@ApiTags('automation/webhooks')
@ApiBearerAuth()
@Controller('automation/webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Get()
  @ApiOperation({ summary: 'List all webhooks' })
  async findAll(@Req() req: any) {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    return this.webhookService.findAll(workspaceId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a webhook endpoint' })
  async create(@Body() dto: CreateWebhookDto, @Req() req: any) {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    return this.webhookService.create(workspaceId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a webhook' })
  async remove(@Param('id') id: string, @Req() req: any) {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    return this.webhookService.remove(id, workspaceId);
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a webhook' })
  async deactivate(@Param('id') id: string, @Req() req: any) {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    return this.webhookService.deactivate(id, workspaceId);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate a webhook' })
  async activate(@Param('id') id: string, @Req() req: any) {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    return this.webhookService.activate(id, workspaceId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get webhook statistics' })
  async getStats(@Req() req: any) {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    return this.webhookService.getStats(workspaceId);
  }
}
