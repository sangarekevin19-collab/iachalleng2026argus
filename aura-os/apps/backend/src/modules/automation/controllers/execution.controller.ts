import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExecutionService } from '../services/execution.service';

@ApiTags('automation/executions')
@ApiBearerAuth()
@Controller('automation/executions')
export class ExecutionController {
  constructor(private readonly executionService: ExecutionService) {}

  @Get()
  @ApiOperation({ summary: 'List recent executions' })
  async getRecent(@Req() req: any, @Query('limit') limit?: number) {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    return this.executionService.getRecentExecutions(workspaceId, limit ? parseInt(limit as unknown as string, 10) : 50);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get execution statistics' })
  async getStats(@Req() req: any, @Query('days') days?: number) {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    return this.executionService.getExecutionStats(workspaceId, days ? parseInt(days as unknown as string, 10) : 7);
  }

  @Get('status/:status')
  @ApiOperation({ summary: 'Get executions by status' })
  async getByStatus(@Param('status') status: string, @Req() req: any) {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    return this.executionService.getExecutionsByStatus(workspaceId, status as any);
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry a failed execution' })
  async retry(@Param('id') id: string, @Body() body: { workflowId: string }) {
    return this.executionService.retryExecution(id, body.workflowId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a running execution' })
  async cancel(@Param('id') id: string) {
    return this.executionService.cancelExecution(id);
  }
}
