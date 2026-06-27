import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowService } from '../services/workflow.service';
import { CreateWorkflowDto } from '../dto/create-workflow.dto';
import { UpdateWorkflowDto } from '../dto/update-workflow.dto';
import { ExecuteWorkflowDto } from '../dto/execute-workflow.dto';

@ApiTags('automation/workflows')
@ApiBearerAuth()
@Controller('automation/workflows')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Get()
  @ApiOperation({ summary: 'List all workflows for workspace' })
  async findAll(
    @Req() req: any,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('agentId') agentId?: string,
  ) {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    return this.workflowService.findAll(workspaceId, { category, status, agentId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow by ID' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    return this.workflowService.findOne(id, workspaceId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new workflow' })
  async create(@Body() dto: CreateWorkflowDto, @Req() req: any) {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    return this.workflowService.create(workspaceId, { ...dto, createdBy: req.userId });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a workflow' })
  async update(@Param('id') id: string, @Body() dto: UpdateWorkflowDto, @Req() req: any) {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    return this.workflowService.update(id, workspaceId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a workflow' })
  async remove(@Param('id') id: string, @Req() req: any) {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    return this.workflowService.remove(id, workspaceId);
  }

  @Post(':id/deploy')
  @ApiOperation({ summary: 'Deploy workflow to n8n' })
  async deploy(@Param('id') id: string, @Req() req: any) {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    return this.workflowService.deployToN8n(id, workspaceId);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate a workflow' })
  async activate(@Param('id') id: string, @Req() req: any) {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    return this.workflowService.activate(id, workspaceId);
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a workflow' })
  async deactivate(@Param('id') id: string, @Req() req: any) {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    return this.workflowService.deactivate(id, workspaceId);
  }

  @Post(':id/run')
  @ApiOperation({ summary: 'Execute a workflow' })
  async execute(@Param('id') id: string, @Body() dto: ExecuteWorkflowDto, @Req() req: any) {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    return this.workflowService.execute(id, workspaceId, dto.inputData, req.userId, dto.agentId);
  }

  @Get(':id/executions')
  @ApiOperation({ summary: 'Get workflow executions' })
  async getExecutions(@Param('id') id: string, @Req() req: any, @Query('limit') limit?: number) {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    return this.workflowService.getExecutions(id, workspaceId, limit ? parseInt(limit as unknown as string, 10) : 20);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get workflow versions' })
  async getVersions(@Param('id') id: string, @Req() req: any) {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    return this.workflowService.getVersions(id, workspaceId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get automation stats' })
  async getStats(@Req() req: any) {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    return this.workflowService.getStats(workspaceId);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Get workflow logs' })
  async getLogs(@Param('id') id: string, @Req() req: any, @Query('limit') limit?: number) {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    return this.workflowService.getLogs(id, workspaceId, limit ? parseInt(limit as unknown as string, 10) : 50);
  }
}
