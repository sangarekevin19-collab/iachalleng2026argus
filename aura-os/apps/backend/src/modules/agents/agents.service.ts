import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from './entities/agent.entity';
import { LlmService } from './services/llm.service';

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(
    @InjectRepository(Agent)
    private agentsRepository: Repository<Agent>,
    private readonly llmService: LlmService,
  ) {}

  async findById(id: string): Promise<Agent | null> {
    return this.agentsRepository.findOne({ where: { id } });
  }

  async findAllByCompany(companyId: string): Promise<Agent[]> {
    return this.agentsRepository.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(data: Partial<Agent>): Promise<Agent> {
    const agent = this.agentsRepository.create(data);
    return this.agentsRepository.save(agent);
  }

  async update(id: string, data: Partial<Agent>): Promise<Agent> {
    await this.agentsRepository.update(id, data);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.agentsRepository.delete(id);
  }

  async getAgentDashboard(companyId: string): Promise<{
    totalAgents: number;
    activeAgents: number;
    totalTasksCompleted: number;
    averageRating: number;
    agents: Agent[];
    agentsByType: Record<string, number>;
    mostActiveAgent: Agent | null;
    topRatedAgent: Agent | null;
  }> {
    const agents = await this.findAllByCompany(companyId);
    const activeAgents = agents.filter((a) => a.isActive);

    const totalTasksCompleted = agents.reduce(
      (sum, a) => sum + (a.tasksCompleted || 0),
      0,
    );

    const ratedAgents = agents.filter((a) => a.rating && a.rating > 0);
    const averageRating =
      ratedAgents.length > 0
        ? ratedAgents.reduce((sum, a) => sum + Number(a.rating), 0) /
          ratedAgents.length
        : 0;

    const agentsByType: Record<string, number> = {};
    for (const agent of agents) {
      agentsByType[agent.type] = (agentsByType[agent.type] || 0) + 1;
    }

    const sortedByTasks = [...agents].sort(
      (a, b) => (b.tasksCompleted || 0) - (a.tasksCompleted || 0),
    );
    const mostActiveAgent = sortedByTasks[0] || null;

    const sortedByRating = [...agents]
      .filter((a) => a.rating && a.rating > 0)
      .sort((a, b) => Number(b.rating) - Number(a.rating));
    const topRatedAgent = sortedByRating[0] || null;

    return {
      totalAgents: agents.length,
      activeAgents: activeAgents.length,
      totalTasksCompleted,
      averageRating: Math.round(averageRating * 100) / 100,
      agents,
      agentsByType,
      mostActiveAgent,
      topRatedAgent,
    };
  }

  async activateAgent(agentId: string): Promise<Agent> {
    const agent = await this.findById(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    agent.isActive = true;
    agent.lastActive = new Date();
    return this.agentsRepository.save(agent);
  }

  async deactivateAgent(agentId: string): Promise<Agent> {
    const agent = await this.findById(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    agent.isActive = false;
    return this.agentsRepository.save(agent);
  }

  async updateAgentConfig(agentId: string, config: Record<string, any>): Promise<Agent> {
    const agent = await this.findById(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    agent.config = { ...agent.config, ...config };
    return this.agentsRepository.save(agent);
  }

  async getAgentConversation(
    companyId: string,
    agentId: string,
  ): Promise<Record<string, any>[]> {
    const agent = await this.agentsRepository.findOne({
      where: { id: agentId, companyId },
    });
    if (!agent) {
      throw new Error(`Agent ${agentId} not found for company ${companyId}`);
    }
    return agent.conversationHistory || [];
  }

  async sendMessageToAgent(
    companyId: string,
    agentId: string,
    message: string,
    language?: string,
  ): Promise<{ response: string; agent: Agent; timestamp: Date }> {
    const agent = await this.agentsRepository.findOne({
      where: { id: agentId, companyId },
    });
    if (!agent) {
      throw new Error(`Agent ${agentId} not found for company ${companyId}`);
    }
    if (!agent.isActive) {
      throw new Error(`Agent ${agent.name} is currently inactive`);
    }

    const conversationHistory = agent.conversationHistory || [];
    const messages = conversationHistory
      .slice(-20)
      .map((entry) => ({
        role: entry.role || 'user',
        content: entry.content || '',
      }));

    const context = {
      agentName: agent.name,
      agentType: agent.type,
      companyId,
      language: language || 'fr',
    };

    const response = await this.llmService.generateResponse(
      agent.systemPrompt || '',
      [...messages, { role: 'user', content: message }],
      context,
    );

    const timestamp = new Date();
    const updatedHistory = [
      ...conversationHistory,
      { role: 'user', content: message, timestamp },
      { role: 'assistant', content: response, timestamp },
    ];

    agent.conversationHistory = updatedHistory;
    agent.lastActive = timestamp;
    agent.tasksCompleted = (agent.tasksCompleted || 0) + 1;
    const savedAgent = await this.agentsRepository.save(agent);

    return {
      response,
      agent: savedAgent,
      timestamp,
    };
  }

  async getRecommendedAgents(companyId: string): Promise<{
    recommendedTypes: string[];
    reason: string;
  }> {
    const agents = await this.findAllByCompany(companyId);
    const existingTypes = new Set(agents.map((a) => a.type));

    const recommendedTypes: string[] = [];

    if (!existingTypes.has('fraud_detector')) {
      recommendedTypes.push('fraud_detector');
    }
    if (!existingTypes.has('crisis_predictor')) {
      recommendedTypes.push('crisis_predictor');
    }
    if (!existingTypes.has('forecast_agent')) {
      recommendedTypes.push('forecast_agent');
    }
    if (!existingTypes.has('strategy_agent')) {
      recommendedTypes.push('strategy_agent');
    }
    if (!existingTypes.has('innovation_ai')) {
      recommendedTypes.push('innovation_ai');
    }
    if (!existingTypes.has('ai_university')) {
      recommendedTypes.push('ai_university');
    }

    const activeAgentCount = agents.filter((a) => a.isActive).length;
    let reason = '';

    if (activeAgentCount < 5) {
      reason = 'Votre entreprise bénéficierait d\'agents supplémentaires pour couvrir plus de fonctions.';
    } else if (recommendedTypes.length > 0) {
      reason = 'Ces agents peuvent compléter votre écosystème actuel et apporter une valeur ajoutée significative.';
    } else {
      reason = 'Votre écosystème d\'agents est déjà complet et bien configuré.';
    }

    return { recommendedTypes, reason };
  }

  async rateAgent(agentId: string, rating: number): Promise<Agent> {
    const agent = await this.findById(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const currentRating = Number(agent.rating) || 0;
    const newRating = currentRating === 0
      ? rating
      : Math.round(((currentRating + rating) / 2) * 100) / 100;

    agent.rating = newRating;
    return this.agentsRepository.save(agent);
  }
}
