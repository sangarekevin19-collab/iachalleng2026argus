import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AgentsService } from './agents.service';
import { AgentFactoryService } from './agent-factory.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentConfigDto } from './dto/update-agent-config.dto';
import { AgentMessageDto } from './dto/agent-message.dto';
import { RateAgentDto } from './dto/rate-agent.dto';

@ApiTags('agents')
@Controller('agents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AgentsController {
  constructor(
    private readonly agentsService: AgentsService,
    private readonly agentFactoryService: AgentFactoryService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all agents for the company' })
  async findAll(@Req() req: any) {
    return this.agentsService.findAllByCompany(req.user.companyId);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get agent dashboard with stats' })
  async getDashboard(@Req() req: any) {
    return this.agentsService.getAgentDashboard(req.user.companyId);
  }

  @Get('recommended')
  @ApiOperation({ summary: 'Get recommended new agents' })
  async getRecommended(@Req() req: any) {
    return this.agentsService.getRecommendedAgents(req.user.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get agent by ID' })
  async findOne(@Param('id') id: string) {
    return this.agentsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new agent' })
  async create(@Req() req: any, @Body() data: CreateAgentDto) {
    return this.agentsService.create({ ...data, companyId: req.user.companyId });
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate an agent' })
  async activate(@Param('id') id: string) {
    return this.agentsService.activateAgent(id);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate an agent' })
  async deactivate(@Param('id') id: string) {
    return this.agentsService.deactivateAgent(id);
  }

  @Put(':id/config')
  @ApiOperation({ summary: 'Update agent config' })
  async updateConfig(
    @Param('id') id: string,
    @Body() config: UpdateAgentConfigDto,
  ) {
    return this.agentsService.updateAgentConfig(id, config as Record<string, any>);
  }

  @Post(':id/message')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send message to agent' })
  async sendMessage(
    @Req() req: any,
    @Param('id') id: string,
    @Body() messageDto: AgentMessageDto,
  ) {
    return this.agentsService.sendMessageToAgent(
      req.user.companyId,
      id,
      messageDto.message,
      messageDto.language,
    );
  }

  @Get(':id/conversation')
  @ApiOperation({ summary: 'Get agent conversation history' })
  async getConversation(@Req() req: any, @Param('id') id: string) {
    return this.agentsService.getAgentConversation(req.user.companyId, id);
  }

  @Post(':id/rate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rate an agent' })
  async rateAgent(
    @Param('id') id: string,
    @Body() rateDto: RateAgentDto,
  ) {
    return this.agentsService.rateAgent(id, rateDto.rating);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an agent' })
  async update(@Param('id') id: string, @Body() data: Record<string, any>) {
    return this.agentsService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an agent' })
  async remove(@Param('id') id: string) {
    return this.agentsService.remove(id);
  }

  @Post('factory/generate')
  @ApiOperation({ summary: 'Generate all agents from interview data' })
  async generateFromInterview(@Req() req: any, @Body() interviewData: any) {
    return this.agentFactoryService.generateAllAgents(
      req.user.companyId,
      interviewData,
    );
  }

  @Post('factory/preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preview agents that would be generated' })
  async previewAgents(@Req() req: any, @Body() interviewData: any) {
    const company = await this.agentFactoryService['companiesService'].findById(req.user.companyId);
    const profile = {
      companyId: req.user.companyId,
      sector: interviewData?.sector || company?.sector || 'commerce',
      industry: interviewData?.industry || company?.industry,
      size: interviewData?.size || 'small',
      country: interviewData?.country || company?.countryCode || 'CI',
      city: interviewData?.city || company?.city,
      needs: interviewData?.needs || [],
      businessModel: interviewData?.businessModel,
      language: interviewData?.language || 'fr',
      interviewData,
    };
    // Use the new LLM-driven method
    return this.agentFactoryService.generateAllAgents(req.user.companyId, {
      companyProfile: { name: company?.name, sector: profile?.sector || 'other' },
      agents_config: [],
    });
  }
}
