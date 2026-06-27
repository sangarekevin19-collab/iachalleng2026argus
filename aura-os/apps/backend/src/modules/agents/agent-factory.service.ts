import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from './entities/agent.entity';
import { LlmService } from './services/llm.service';

// ─── Interfaces ────────────────────────────────────────────────

export interface AgentConfig {
  name: string;
  mission: string;
  role: string;
  objectives: string[];
  tools: string[];
  kpis: string[];
  emoji: string;
  color: string;
  priority: number;
}

export interface CompanyProfile {
  name: string;
  sector: string;
  subSector?: string;
  activityDescription?: string;
  country?: string;
  city?: string;
  size?: string;
  businessModel?: string;
  targetClients?: string[];
  language?: string;
}

export interface FullPlatformConfig {
  companyProfile: CompanyProfile;
  agents_config: AgentConfig[];
}

// ─── Service ───────────────────────────────────────────────────

@Injectable()
export class AgentFactoryService {
  private readonly logger = new Logger(AgentFactoryService.name);

  constructor(
    @InjectRepository(Agent)
    private readonly agentsRepository: Repository<Agent>,
    private readonly llmService: LlmService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  //  ENTRY POINT — Generate ALL agents for a company (100% LLM)
  // ═══════════════════════════════════════════════════════════════

  async generateAllAgents(
    companyId: string,
    fullPlatformConfig: FullPlatformConfig,
  ): Promise<Agent[]> {
    const { companyProfile, agents_config } = fullPlatformConfig;

    if (!agents_config || agents_config.length === 0) {
      this.logger.warn(`No agents_config provided for company ${companyId}. Nothing to generate.`);
      return [];
    }

    this.logger.log(
      `Generating ${agents_config.length} agents for company ${companyId} (${companyProfile?.name || 'unknown'})`,
    );

    const createdAgents: Agent[] = [];

    for (const agentConfig of agents_config) {
      try {
        // Step 1 — Generate the detailed system prompt via LLM
        const systemPrompt = await this.generateAgentSystemPrompt(
          agentConfig,
          companyProfile,
        );

        // Step 2 — Build the agent entity
        const agentData: Partial<Agent> = {
          companyId,
          name: agentConfig.name,
          type: this.buildAgentType(agentConfig),
          role: agentConfig.role,
          description: agentConfig.mission,
          systemPrompt,
          tools: (agentConfig.tools || []).map((t) => ({ name: t })) as unknown as Record<string, any>[],
          permissions: { canOperate: true },
          avatar: agentConfig.emoji || '🤖',
          color: agentConfig.color || '#6366F1',
          isActive: true,
          config: {
            objectives: agentConfig.objectives || [],
            kpis: agentConfig.kpis || [],
            priority: agentConfig.priority ?? 5,
          },
          memory: {},
          communicationStyle: 'professionnel',
          languages: ['fr'],
        };

        // Step 3 — Upsert (non-destructive: update if same type exists)
        const saved = await this.upsertAgent(companyId, agentData);
        createdAgents.push(saved);

        this.logger.log(
          `Agent "${saved.name}" (${saved.type}) — priority ${agentConfig.priority} — ${saved.id}`,
        );
      } catch (error: any) {
        this.logger.error(
          `Failed to generate agent "${agentConfig.name}": ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Done: ${createdAgents.length}/${agents_config.length} agents generated for company ${companyId}`,
    );

    return createdAgents;
  }

  // ═══════════════════════════════════════════════════════════════
  //  LLM — Generate a detailed system prompt for one agent
  // ═══════════════════════════════════════════════════════════════

  async generateAgentSystemPrompt(
    agentConfig: AgentConfig,
    companyProfile: CompanyProfile,
  ): Promise<string> {
    const systemPrompt = [
      'Tu es un expert en conception d\'agents IA.',
      'Ta tâche est de générer un prompt système détaillé et professionnel pour un agent IA spécialisé.',
      'Le prompt doit être directement utilisable comme "system prompt" pour un LLM.',
      '',
      'Le prompt doit inclure :',
      '1. Le rôle exact de l\'agent (qui il est, pour quelle entreprise)',
      '2. Ses responsabilités précises (ce qu\'il fait concrètement)',
      '3. Ses règles de communication (ton, langue, format de réponse)',
      '4. Ses limites (ce qu\'il ne doit PAS faire)',
      '5. Le format de réponse attendu (structuré, actionnable)',
      '6. Des exemples de tâches qu\'il peut recevoir',
      '',
      'Langue : français.',
      'Sois détaillé, structuré et professionnel.',
      'Réponds UNIQUEMENT avec le prompt système, sans explication supplémentaire.',
    ].join('\n');

    const userPrompt = [
      '═══ AGENT À CONFIGURER ═══',
      `Nom : ${agentConfig.name}`,
      `Mission : ${agentConfig.mission}`,
      `Rôle : ${agentConfig.role}`,
      `Objectifs : ${(agentConfig.objectives || []).join(', ')}`,
      `Outils disponibles : ${(agentConfig.tools || []).join(', ')}`,
      `KPIs : ${(agentConfig.kpis || []).join(', ')}`,
      '',
      '═══ PROFIL DE L\'ENTREPRISE ═══',
      `Nom : ${companyProfile?.name || 'Non spécifié'}`,
      `Secteur : ${companyProfile?.sector || 'Non spécifié'}`,
      `Sous-secteur : ${companyProfile?.subSector || 'Non spécifié'}`,
      `Activité : ${companyProfile?.activityDescription || 'Non spécifiée'}`,
      `Pays : ${companyProfile?.country || 'Non spécifié'}`,
      `Taille : ${companyProfile?.size || 'Non spécifiée'}`,
      `Modèle économique : ${companyProfile?.businessModel || 'Non spécifié'}`,
      `Clients cibles : ${(companyProfile?.targetClients || []).join(', ')}`,
    ].join('\n');

    // Attempt 1 — Full prompt
    try {
      const response = await this.llmService.generateResponse(systemPrompt, [
        { role: 'user', content: userPrompt },
      ]);

      if (response && response.trim().length > 50) {
        return response.trim();
      }

      this.logger.warn(
        `LLM returned short/empty response for agent "${agentConfig.name}", retrying with minimalist prompt`,
      );
    } catch (error: any) {
      this.logger.warn(
        `LLM call failed for agent "${agentConfig.name}": ${error.message}. Retrying with minimalist prompt.`,
      );
    }

    // Attempt 2 — Minimalist prompt (retry)
    try {
      const minimalistSystem =
        'Génère un prompt système détaillé en français pour un agent IA. Inclure : rôle, responsabilités, règles, limites, format de réponse, exemples. Sois professionnel et structuré.';

      const minimalistUser = [
        `Agent: ${agentConfig.name}`,
        `Mission: ${agentConfig.mission}`,
        `Rôle: ${agentConfig.role}`,
        `Objectifs: ${(agentConfig.objectives || []).join(', ')}`,
        `Outils: ${(agentConfig.tools || []).join(', ')}`,
        `Entreprise: ${companyProfile?.name || 'N/A'} (${companyProfile?.sector || 'N/A'})`,
      ].join('\n');

      const response = await this.llmService.generateResponse(minimalistSystem, [
        { role: 'user', content: minimalistUser },
      ]);

      if (response && response.trim().length > 50) {
        return response.trim();
      }
    } catch (error: any) {
      this.logger.warn(
        `Minimalist retry also failed for agent "${agentConfig.name}": ${error.message}. Using fallback.`,
      );
    }

    // Final fallback — Build a prompt from available data (no LLM)
    return this.buildFallbackPrompt(agentConfig, companyProfile);
  }

  // ═══════════════════════════════════════════════════════════════
  //  QUERY — Get agents by company
  // ═══════════════════════════════════════════════════════════════

  async getAgentsByCompany(companyId: string): Promise<Agent[]> {
    return this.agentsRepository.find({
      where: { companyId, isActive: true },
      order: { createdAt: 'ASC' },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  QUERY — Get single agent by ID
  // ═══════════════════════════════════════════════════════════════

  async getAgentById(id: string): Promise<Agent | null> {
    return this.agentsRepository.findOne({ where: { id } });
  }

  // ═══════════════════════════════════════════════════════════════
  //  PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Build a snake_case type string from the agent name.
   * e.g. "Ventes POS" → "ventes_pos"
   */
  private buildAgentType(agentConfig: AgentConfig): string {
    return agentConfig.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // strip accents
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '_');
  }

  /**
   * Upsert: update if an agent with the same type exists for this company,
   * otherwise create a new one.
   */
  private async upsertAgent(
    companyId: string,
    agentData: Partial<Agent>,
  ): Promise<Agent> {
    const existing = await this.agentsRepository.findOne({
      where: { companyId, type: agentData.type as string },
    });

    if (existing) {
      // Update — preserve stats (tasksCompleted, rating, conversationHistory)
      const updated = this.agentsRepository.merge(existing, {
        name: agentData.name,
        role: agentData.role,
        description: agentData.description,
        systemPrompt: agentData.systemPrompt,
        tools: agentData.tools,
        permissions: agentData.permissions,
        avatar: agentData.avatar,
        color: agentData.color,
        config: agentData.config,
        communicationStyle: agentData.communicationStyle || existing.communicationStyle,
        languages: agentData.languages || existing.languages,
        isActive: true,
      });

      const saved = await this.agentsRepository.save(updated);
      this.logger.log(`Updated agent: "${saved.name}" (${saved.type})`);
      return saved;
    }

    // Create new
    const agent = this.agentsRepository.create({
      companyId,
      name: agentData.name || 'Agent',
      type: agentData.type || 'custom_agent',
      role: agentData.role || 'Agent IA',
      description: agentData.description,
      systemPrompt: agentData.systemPrompt,
      tools: agentData.tools || [],
      permissions: agentData.permissions || {},
      avatar: agentData.avatar || '🤖',
      color: agentData.color || '#6366F1',
      config: agentData.config || {},
      memory: {},
      communicationStyle: agentData.communicationStyle || 'professionnel',
      languages: agentData.languages || ['fr'],
      isActive: true,
    } as Agent);

    const saved = await this.agentsRepository.save(agent);
    this.logger.log(`Created agent: "${saved.name}" (${saved.type})`);
    return saved;
  }

  /**
   * Final fallback: build a structured prompt from available data
   * when the LLM is completely unreachable.
   */
  private buildFallbackPrompt(
    agentConfig: AgentConfig,
    companyProfile: CompanyProfile,
  ): string {
    const lines = [
      `Tu es l'agent IA "${agentConfig.name}" pour ${companyProfile?.name || 'l\'entreprise'}.`,
      '',
      `## Rôle`,
      agentConfig.role,
      '',
      `## Mission`,
      agentConfig.mission,
      '',
    ];

    if (agentConfig.objectives && agentConfig.objectives.length > 0) {
      lines.push('## Objectifs', ...agentConfig.objectives.map((o) => `- ${o}`), '');
    }

    if (agentConfig.tools && agentConfig.tools.length > 0) {
      lines.push('## Outils disponibles', ...agentConfig.tools.map((t) => `- ${t}`), '');
    }

    if (agentConfig.kpis && agentConfig.kpis.length > 0) {
      lines.push('## KPIs', ...agentConfig.kpis.map((k) => `- ${k}`), '');
    }

    lines.push(
      '',
      '## Règles de communication',
      '- Réponds en français.',
      '- Sois professionnel, concis et actionnable.',
      '- Structure tes réponses avec des titres et des listes.',
      '- Propose toujours des actions concrètes.',
      '',
      '## Limites',
      '- Ne fais pas de promesses que l\'entreprise ne peut pas tenir.',
      '- Si tu n\'as pas assez d\'informations, pose des questions.',
      '',
      '## Format de réponse',
      'Utilise le markdown : titres, listes, gras pour les points clés.',
    );

    return lines.join('\n');
  }
}
