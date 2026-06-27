import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnboardingSession } from './entities/onboarding-session.entity';
import { LlmService } from '../agents/services/llm.service';
import { AgentFactoryService } from '../agents/agent-factory.service';
import { CompaniesService } from '../companies/companies.service';

// ─── Types ─────────────────────────────────────────────────────

export interface InterviewMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompanyProfile {
  sector: string;
  sub_sector: string;
  activity_description: string;
  size: string;
  country: string;
  city: string;
  products: string[];
  services: string[];
  target_clients: string[];
  objectives: string[];
  challenges: string[];
  estimated_revenue: string;
  business_processes: string[];
  tools_used: string[];
  communication_channels: string[];
  priority_needs: string[];
  opportunities: string[];
  risks: string[];
}

export interface DashboardConfig {
  modules: Array<{ id: string; name: string; icon: string; order: number }>;
  pages: Array<{ id: string; name: string; route: string; icon: string }>;
  widgets: Array<{ id: string; type: string; title: string; config: Record<string, any> }>;
  kpis: Array<{ id: string; name: string; target: string; unit: string }>;
  automations: Array<{ id: string; name: string; trigger: string; action: string }>;
  navigation: Array<{ id: string; label: string; icon: string; route: string; order: number }>;
}

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

export interface WorkflowConfig {
  name: string;
  description: string;
  steps: string[];
  trigger: string;
}

export interface FullPlatformConfig {
  company_profile: CompanyProfile;
  dashboard_config: DashboardConfig;
  agents_config: AgentConfig[];
  workflows: WorkflowConfig[];
}

// ─── Interview system prompt — LLM is the interviewer ───────────

const INTERVIEW_SYSTEM = `Tu es AURA, l'intelligence artificielle d'AURA OS. Tu conduis un entretien stratégique avec un entrepreneur.

OBJECTIF : Comprendre en profondeur son entreprise pour créer une plateforme IA 100% personnalisée.

RÈGLES ABSOLUES :
- UNE SEULE question à la fois, naturelle et conversationnelle
- Adapte chaque question aux réponses précédentes
- Pose des questions SPÉCIFIQUES au métier, pas génériques
- Explore en profondeur : activité détaillée, produits/services, clients (qui, combien, comment), équipe, finances, défis, objectifs, outils, besoins, concurrence, marchés, processus métier
- Entre 8 et 20 questions selon la complexité
- Ton : chaleureux, professionnel, curieux, efficace
- Sois bref mais précis (2-3 phrases max par question)

DÉCISION DE FIN :
- Quand tu as suffisamment d'informations pour concevoir une plateforme complète, termine avec : INTERVIEW_COMPLETE: [résumé détaillé de l'entreprise en 3-5 phrases]
- Ne termine PAS avant d'avoir exploré tous les aspects clés
- Si l'utilisateur donne des réponses vagues, pose des questions de clarification

FORMAT : Réponds UNIQUEMENT avec la question suivante, ou INTERVIEW_COMPLETE: [résumé] si c'est terminé.`;

// ─── Platform generation prompt — LLM designs everything ───────

const PLATFORM_GENERATION_SYSTEM = `Tu es AURA, expert en conception de plateformes IA pour PME. Tu dois concevoir une plateforme COMPLÈTE à partir de l'interview.

⚠️ RÈGLE ABSOLUE : Ta réponse doit être UNIQUEMENT un JSON valide. Pas de texte avant, pas de texte après, pas de markdown, pas de \`\`\`json. JUSTE le JSON.

Utilise EXACTEMENT cette structure (remplace les valeurs entre guillemets par les données réelles) :

{
  "company_profile": {
    "sector": "secteur en français",
    "sub_sector": "sous-secteur",
    "activity_description": "description de l'activité",
    "size": "micro ou small ou medium ou large",
    "country": "pays",
    "city": "ville",
    "products": ["produit1", "produit2"],
    "services": ["service1"],
    "target_clients": ["type client"],
    "objectives": ["objectif1"],
    "challenges": ["défi1"],
    "estimated_revenue": "fourchette",
    "business_processes": ["processus1"],
    "tools_used": ["outil1"],
    "communication_channels": ["canal1"],
    "priority_needs": ["besoin1"],
    "opportunities": ["opportunité1"],
    "risks": ["risque1"]
  },
  "dashboard_config": {
    "modules": [
      {"id": "overview", "name": "Vue d'ensemble", "icon": "📊", "order": 0},
      {"id": "agents", "name": "Agents IA", "icon": "🤖", "order": 1},
      {"id": "settings", "name": "Paramètres", "icon": "⚙️", "order": 2}
    ],
    "pages": [],
    "widgets": [
      {"id": "w1", "type": "kpi", "title": "Indicateur clé", "icon": "📊", "color": "#6366F1", "position": {"x": 0, "y": 0, "w": 4, "h": 2}, "config": {"value": "—", "unit": ""}},
      {"id": "w2", "type": "list", "title": "Liste", "icon": "📋", "color": "#10B981", "position": {"x": 4, "y": 0, "w": 4, "h": 2}, "config": {"items": ["Élément 1"]}},
      {"id": "w3", type": "alert", "title": "Alertes", "icon": "⚠️", "color": "#F59E0B", "position": {"x": 8, "y": 0, "w": 4, "h": 2}, "config": {"alerts": [{"level": "info", "text": "Aucune alerte"}]}}
    ],
    "kpis": [
      {"id": "k1", "name": "KPI 1", "target": "", "unit": ""}
    ],
    "automations": [],
    "navigation": [
      {"id": "overview", "label": "Vue d'ensemble", "icon": "📊", "route": "/dashboard", "order": 0},
      {"id": "agents", "label": "Agents IA", "icon": "🤖", "route": "/dashboard/agents", "order": 1},
      {"id": "settings", "label": "Paramètres", "icon": "⚙️", "route": "/dashboard/settings", "order": 2}
    ]
  },
  "agents_config": [
    {
      "name": "Agent",
      "mission": "Mission",
      "role": "Rôle",
      "objectives": ["objectif"],
      "tools": ["outil"],
      "kpis": ["kpi"],
      "emoji": "🤖",
      "color": "#6366F1",
      "priority": 10
    }
  ],
  "workflows": []
}

IMPORTANT : Adapte chaque valeur aux données de l'entreprise. Les modules, widgets, KPIs et agents doivent être SPÉCIFIQUES au secteur d'activité. Au moins 3 modules, 3 widgets, 1 agent, 1 KPI.

JSON UNIQUEMENT — PAS DE TEXTE AVANT OU APRÈS.`;

// ─── Service ───────────────────────────────────────────────────

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger('OnboardingService');

  constructor(
    @InjectRepository(OnboardingSession)
    private onboardingRepository: Repository<OnboardingSession>,
    private readonly llmService: LlmService,
    private readonly agentFactory: AgentFactoryService,
    private readonly companiesService: CompaniesService,
  ) {}

  // ─── CRUD ─────────────────────────────────────────────────────

  async findById(id: string): Promise<OnboardingSession | null> {
    return this.onboardingRepository.findOne({ where: { id } });
  }

  async findByUser(userId: string): Promise<OnboardingSession | null> {
    return this.onboardingRepository.findOne({ where: { userId } });
  }

  async create(userId: string, companyId: string): Promise<OnboardingSession> {
    const session = this.onboardingRepository.create({
      userId,
      companyId,
      currentPhase: 'phase_1',
      responses: {
        _questionIndex: 0,
        _messages: [],
        _businessSummary: '',
        _businessType: '',
        _analysis: null,
        _fullPlatformConfig: null,
      },
      questions: [],
      isComplete: false,
      startedAt: new Date(),
    });
    return this.onboardingRepository.save(session);
  }

  async markComplete(userId: string): Promise<OnboardingSession> {
    const session = await this.findByUser(userId);
    if (!session) throw new NotFoundException('Session not found');
    await this.onboardingRepository.update(session.id, {
      isComplete: true,
      completedAt: new Date(),
      currentPhase: 'completed',
    });
    return this.findById(session.id);
  }

  // ─── Start interview — LLM generates first question ───────────

  async startInterview(userId: string, companyId: string): Promise<{
    sessionId: string;
    firstQuestion: string;
    questionIndex: number;
  }> {
    let session = await this.findByUser(userId);
    if (!session) session = await this.create(userId, companyId);

    // Reset state
    session.responses = {
      _questionIndex: 0,
      _messages: [],
      _businessSummary: '',
      _businessType: '',
      _analysis: null,
      _fullPlatformConfig: null,
    };
    session.questions = [];
    session.isComplete = false;
    session.currentPhase = 'phase_1';
    await this.onboardingRepository.save(session);

    // LLM generates the first question
    let firstQuestion: string;
    try {
      firstQuestion = await this.llmService.generateResponse(INTERVIEW_SYSTEM, [
        { role: 'user', content: "Commence l'interview. Accueille l'utilisateur chaleureusement, explique brièvement le rôle d'AURA, et pose la première question pour découvrir son entreprise. Sois bref et engageant." },
      ]);
    } catch (error: any) {
      this.logger.error(`Start interview LLM error: ${error.message}`);
      firstQuestion = "Bienvenue sur AURA OS ! 🎯 Je suis votre assistant IA. Je vais vous poser quelques questions pour comprendre votre entreprise et créer une plateforme 100% adaptée à vos besoins. Pour commencer, quel est le nom de votre entreprise et que vendez-vous ou quel service proposez-vous ?";
    }

    return { sessionId: session.id, firstQuestion, questionIndex: 0 };
  }

  // ─── Submit answer — LLM decides everything ───────────────────

  async submitAnswer(
    userId: string,
    answer: string,
    messages: InterviewMessage[],
  ): Promise<{
    isComplete: boolean;
    summary?: string;
    nextQuestion?: string;
    questionIndex: number;
    responses: any;
  }> {
    const session = await this.findByUser(userId);
    if (!session) throw new NotFoundException('Session not found');

    const responses = session.responses || {};
    const questionIndex = responses._questionIndex || 0;
    const history: InterviewMessage[] = responses._messages || [];

    // Add user message
    history.push({ role: 'user', content: answer });

    // Build conversation for LLM
    const conversation: InterviewMessage[] = [
      { role: 'system', content: INTERVIEW_SYSTEM },
      ...history,
    ];

    let llmResponse: string;

    try {
      llmResponse = await this.llmService.generateResponse('', conversation);
    } catch (error: any) {
      this.logger.error(`Answer LLM error: ${error.message}`);
      // One retry
      try {
        llmResponse = await this.llmService.generateResponse('', conversation);
      } catch {
        llmResponse = "Merci pour cette information. Pouvez-vous m'en dire plus à ce sujet ?";
      }
    }

    // Check if LLM decided interview is complete
    const completeIndex = llmResponse.indexOf('INTERVIEW_COMPLETE');
    const isComplete = completeIndex >= 0;

    if (isComplete) {
      const summary = llmResponse.substring(completeIndex + 'INTERVIEW_COMPLETE:'.length).trim();
      responses._businessSummary = summary;
      history.push({ role: 'assistant', content: summary });

      await this.onboardingRepository.update(session.id, {
        responses: { ...responses, _messages: history, _questionIndex: questionIndex + 1 },
        questions: [...(session.questions || []), { question: 'Interview complete', answer }],
        isComplete: true,
        currentPhase: 'completed',
      });

      return { isComplete: true, summary, questionIndex: questionIndex + 1, responses };
    }

    // Store assistant response
    history.push({ role: 'assistant', content: llmResponse });
    await this.onboardingRepository.update(session.id, {
      responses: { ...responses, _messages: history, _questionIndex: questionIndex + 1 },
      questions: [...(session.questions || []), { question: llmResponse, answer }],
      currentPhase: 'phase_1',
    });

    return { isComplete: false, nextQuestion: llmResponse, questionIndex: questionIndex + 1, responses };
  }

  // ─── Generate full platform — LLM designs everything ──────────

  async generateFullPlatform(userId: string): Promise<FullPlatformConfig & { agents: any[] }> {
    const session = await this.findByUser(userId);
    if (!session) throw new NotFoundException('Session not found');

    const responses = session.responses || {};
    const transcript = (session.questions || [])
      .map((q: any) => `Q: ${q.question}\nA: ${q.answer}`)
      .join('\n\n');
    const summary = responses._businessSummary || '';

    this.logger.log(`Generating full platform for user ${userId} (${transcript.length} chars transcript)`);

    // ─── Step 1: LLM generates complete platform config ──────────
    let platformConfig: FullPlatformConfig;

    try {
      const userPrompt = `═══ TRANSCRIPT DE L'INTERVIEW ═══\n${transcript}\n\n═══ RÉSUMÉ ═══\n${summary}`;

      const llmResponse = await this.llmService.generateResponse(PLATFORM_GENERATION_SYSTEM, [
        { role: 'user', content: userPrompt },
      ]);

      // Parse JSON
      let jsonStr = llmResponse.replace(/```json/gi, '').replace(/```/g, '');
      const start = jsonStr.indexOf('{');
      const end = jsonStr.lastIndexOf('}');
      if (start >= 0 && end > start) {
        jsonStr = jsonStr.substring(start, end + 1);
        platformConfig = JSON.parse(jsonStr);
      } else {
        throw new Error('No valid JSON in LLM response');
      }
    } catch (error: any) {
      this.logger.error(`Platform generation LLM error: ${error.message}`);
      // Retry once
      try {
        const userPrompt = `Génère le JSON complet pour l'entreprise décrite ci-dessous. JSON UNIQUEMENT.\n\nTranscript:\n${transcript}\n\nRésumé:\n${summary}`;
        const retryResponse = await this.llmService.generateResponse(
          'Tu es un expert en conception de plateformes IA. Génère UNIQUEMENT un JSON valide. Pas de texte avant ou après.',
          [{ role: 'user', content: userPrompt }],
        );
        let jsonStr = retryResponse.replace(/```json/gi, '').replace(/```/g, '');
        const start = jsonStr.indexOf('{');
        const end = jsonStr.lastIndexOf('}');
        if (start >= 0 && end > start) {
          jsonStr = jsonStr.substring(start, end + 1);
          platformConfig = JSON.parse(jsonStr);
        } else {
          throw new Error('Retry also failed');
        }
      } catch (retryError: any) {
        this.logger.error(`Platform generation retry failed: ${retryError.message}`);
        throw new Error('Impossible de générer la plateforme. Veuillez réessayer.');
      }
    }

    // ─── Step 2: Store full platform config in session ────────────
    responses._fullPlatformConfig = platformConfig;
    await this.onboardingRepository.update(session.id, { responses });

    // ─── Step 3: Update company profile ───────────────────────────
    try {
      const company = await this.companiesService.findById(session.companyId);
      if (company && platformConfig.company_profile) {
        const cp = platformConfig.company_profile;
        await this.companiesService.update(session.companyId, {
          sector: cp.sector || company.sector,
          industry: cp.sub_sector || company.industry,
          aiProfile: {
            ...(company.aiProfile || {}),
            company_profile: cp,
            dashboard: platformConfig,
          },
          businessModel: {
            ...((company.businessModel as any) || {}),
            description: cp.activity_description,
            products: cp.products,
            services: cp.services,
            target_clients: cp.target_clients,
          },
        } as any);
      }
    } catch (error: any) {
      this.logger.error(`Company update error: ${error.message}`);
    }

    // ─── Step 4: Generate agents via AgentFactory ────────────────
    let agents: any[] = [];
    try {
      agents = await this.agentFactory.generateAllAgents(session.companyId, {
        companyProfile: {
          name: platformConfig.company_profile?.sector || 'Entreprise',
          sector: platformConfig.company_profile?.sector || 'other',
          subSector: platformConfig.company_profile?.sub_sector,
          activityDescription: platformConfig.company_profile?.activity_description,
          country: platformConfig.company_profile?.country,
          city: platformConfig.company_profile?.city,
          size: platformConfig.company_profile?.size,
          targetClients: platformConfig.company_profile?.target_clients,
          language: 'fr',
        },
        agents_config: platformConfig.agents_config,
      });
      this.logger.log(`Created ${agents.length} agents for company ${session.companyId}`);
    } catch (error: any) {
      this.logger.error(`Agent generation error: ${error.message}`);
    }

    return {
      ...platformConfig,
      agents,
    };
  }
}
