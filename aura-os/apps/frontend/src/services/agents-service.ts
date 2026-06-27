import api from '@/lib/api';

export interface Agent {
  id: string;
  name: string;
  type: string;
  role: string;
  emoji: string;
  color: string;
  isActive: boolean;
  rating: number;
  tasksCompleted: number;
  lastActive: Date | null;
  communicationStyle: string;
  languages: string[];
  systemPrompt?: string;
  tools?: string[];
  permissions?: string[];
  dependantAgents?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AgentMessage {
  id: string;
  agentId: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

export interface AgentConversation {
  agentId: string;
  messages: AgentMessage[];
}

export interface CreateAgentData {
  name: string;
  type: string;
  role: string;
  emoji?: string;
  color?: string;
  systemPrompt?: string;
  tools?: string[];
  permissions?: string[];
  communicationStyle?: string;
  languages?: string[];
}

export interface UpdateAgentConfig {
  name?: string;
  role?: string;
  systemPrompt?: string;
  tools?: string[];
  permissions?: string[];
  communicationStyle?: string;
  languages?: string[];
  color?: string;
}

const AGENT_EMOJIS: Record<string, string> = {
  directeur: '🧠',
  comptable: '📊',
  commercial: '💼',
  marketing: '📱',
  rh: '👥',
  stock: '📦',
  livraison: '🚚',
  support: '🎧',
  juridique: '⚖️',
  innovation: '💡',
  fraude: '🔍',
  predicteur: '🔮',
  marche: '🌍',
  whatsapp: '💬',
  negociateur: '🤝',
  designer: '🎨',
};

const AGENT_COLORS: Record<string, string> = {
  directeur: '#8B5CF6',
  comptable: '#10B981',
  commercial: '#F59E0B',
  marketing: '#EC4899',
  rh: '#3B82F6',
  stock: '#F97316',
  livraison: '#14B8A6',
  support: '#6366F1',
  juridique: '#64748B',
  innovation: '#EAB308',
  fraude: '#EF4444',
  predicteur: '#7C3AED',
  marche: '#059669',
  whatsapp: '#25D366',
  negociateur: '#0EA5E9',
  designer: '#F472B6',
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

function getEmojiForType(type: string): string {
  return AGENT_EMOJIS[type] || '🤖';
}

function getColorForType(type: string): string {
  return AGENT_COLORS[type] || '#667eea';
}

const SIMULATED_RESPONSES: Record<string, string[]> = {
  directeur: [
    "J'ai analysé les données de performance de votre entreprise. Voici mes recommandations stratégiques pour optimiser vos opérations.",
    "Les indicateurs clés montrent une tendance positive. Je suggère de renforcer les secteurs qui montrent des signes de faiblesse.",
    "En tant qu'orchestrateur principal, je coordonne les actions de tous les agents. Tout est sous contrôle.",
  ],
  comptable: [
    "Les comptes sont à jour. J'ai détecté quelques anomalies dans les dépenses du mois dernier que je vous recommande de vérifier.",
    "Le bilan financier montre une santé solide. Les prévisions de trésorerie pour le prochain trimestre sont positives.",
    "J'ai préparé le rapport fiscal mensuel. Toutes les déclarations sont conformes à la réglementation en vigueur.",
  ],
  commercial: [
    "Les opportunités de vente sont en hausse. J'ai identifié 15 prospects qualifiés pour cette semaine.",
    "Le pipeline commercial est bien rempli. Le taux de conversion s'est amélioré de 12% ce mois-ci.",
    "Je recommande de lancer une campagne ciblée sur les clients inactifs pour augmenter les revenus récurrents.",
  ],
  default: [
    "Message bien reçu. Je traite votre demande et je reviens vers vous avec une analyse détaillée.",
    "J'ai bien compris votre requête. Permettez-moi de compiler les données pertinentes pour vous.",
    "C'est une excellente question. Voici ce que je peux vous dire sur le sujet.",
    "Je suis en train d'analyser les données en temps réel. Voici les résultats préliminaires.",
  ],
};

function getSimulatedResponse(agentType: string): string {
  const responses = SIMULATED_RESPONSES[agentType] || SIMULATED_RESPONSES.default;
  return responses[Math.floor(Math.random() * responses.length)];
}

const mockAgents: Agent[] = [
  { id: '1', name: 'Directeur AURA', type: 'directeur', role: 'Orchestrateur principal', emoji: '🧠', color: '#8B5CF6', isActive: true, rating: 4.8, tasksCompleted: 156, lastActive: new Date(), communicationStyle: 'professionnel', languages: ['fr', 'en'], tools: ['analytics', 'reporting', 'coordination'], permissions: ['read', 'write', 'admin'] },
  { id: '2', name: 'Comptable IA', type: 'comptable', role: 'Gestion financière et comptabilité', emoji: '📊', color: '#10B981', isActive: true, rating: 4.5, tasksCompleted: 89, lastActive: new Date(), communicationStyle: 'précis', languages: ['fr'], tools: ['accounting', 'invoicing', 'tax'], permissions: ['read', 'write'] },
  { id: '3', name: 'Commercial IA', type: 'commercial', role: 'Gestion des ventes et prospects', emoji: '💼', color: '#F59E0B', isActive: true, rating: 4.2, tasksCompleted: 67, lastActive: new Date(), communicationStyle: 'persuasif', languages: ['fr', 'en'], tools: ['crm', 'sales', 'prospecting'], permissions: ['read', 'write'] },
  { id: '4', name: 'Marketing IA', type: 'marketing', role: 'Stratégie marketing et réseaux sociaux', emoji: '📱', color: '#EC4899', isActive: true, rating: 4.0, tasksCompleted: 45, lastActive: new Date(), communicationStyle: 'créatif', languages: ['fr', 'en'], tools: ['social_media', 'content', 'analytics'], permissions: ['read', 'write'] },
  { id: '5', name: 'RH IA', type: 'rh', role: 'Gestion des employés et recrutement', emoji: '👥', color: '#3B82F6', isActive: true, rating: 3.8, tasksCompleted: 23, lastActive: new Date(), communicationStyle: 'empathique', languages: ['fr'], tools: ['hr', 'recruitment', 'payroll'], permissions: ['read', 'write'] },
  { id: '6', name: 'Stock IA', type: 'stock', role: 'Gestion des stocks et inventaire', emoji: '📦', color: '#F97316', isActive: true, rating: 4.6, tasksCompleted: 234, lastActive: new Date(), communicationStyle: 'direct', languages: ['fr'], tools: ['inventory', 'forecasting', 'orders'], permissions: ['read', 'write'] },
  { id: '7', name: 'Livraison IA', type: 'livraison', role: 'Gestion des livraisons et livreurs', emoji: '🚚', color: '#14B8A6', isActive: false, rating: 0, tasksCompleted: 0, lastActive: null, communicationStyle: 'efficace', languages: ['fr'], tools: ['routing', 'tracking', 'logistics'], permissions: ['read'] },
  { id: '8', name: 'Support IA', type: 'support', role: 'Support client et assistance', emoji: '🎧', color: '#6366F1', isActive: true, rating: 4.1, tasksCompleted: 78, lastActive: new Date(), communicationStyle: 'chaleureux', languages: ['fr', 'en'], tools: ['tickets', 'chat', 'knowledge_base'], permissions: ['read', 'write'] },
  { id: '9', name: 'Juridique IA', type: 'juridique', role: 'Conformité et conseils juridiques', emoji: '⚖️', color: '#64748B', isActive: false, rating: 0, tasksCompleted: 0, lastActive: null, communicationStyle: 'formel', languages: ['fr'], tools: ['contracts', 'compliance', 'legal_research'], permissions: ['read'] },
  { id: '10', name: 'Innovation IA', type: 'innovation', role: 'Recherche et innovation produits', emoji: '💡', color: '#EAB308', isActive: true, rating: 3.5, tasksCompleted: 12, lastActive: new Date(), communicationStyle: 'visionnaire', languages: ['fr', 'en'], tools: ['research', 'trends', 'prototyping'], permissions: ['read', 'write'] },
  { id: '11', name: 'Détecteur de Fraude', type: 'fraude', role: 'Surveillance et détection d\'anomalies', emoji: '🔍', color: '#EF4444', isActive: true, rating: 4.9, tasksCompleted: 312, lastActive: new Date(), communicationStyle: 'analytique', languages: ['fr'], tools: ['monitoring', 'anomaly_detection', 'alerts'], permissions: ['read', 'write', 'admin'] },
  { id: '12', name: 'Prédicteur de Crise', type: 'predicteur', role: 'Anticipation des risques et crises', emoji: '🔮', color: '#7C3AED', isActive: true, rating: 4.3, tasksCompleted: 56, lastActive: new Date(), communicationStyle: 'précautionneux', languages: ['fr'], tools: ['risk_analysis', 'forecasting', 'scenario_planning'], permissions: ['read', 'write'] },
  { id: '13', name: 'Marché Africain', type: 'marche', role: 'Veille marché africain et tendances', emoji: '🌍', color: '#059669', isActive: true, rating: 4.4, tasksCompleted: 189, lastActive: new Date(), communicationStyle: 'info', languages: ['fr', 'en'], tools: ['market_research', 'trends', 'competitor_analysis'], permissions: ['read', 'write'] },
  { id: '14', name: 'Agent WhatsApp', type: 'whatsapp', role: 'Gestion WhatsApp Business', emoji: '💬', color: '#25D366', isActive: true, rating: 4.7, tasksCompleted: 445, lastActive: new Date(), communicationStyle: 'conversationnel', languages: ['fr', 'en'], tools: ['messaging', 'broadcast', 'automation'], permissions: ['read', 'write'] },
  { id: '15', name: 'Négociateur IA', type: 'negociateur', role: 'Négociation avec fournisseurs', emoji: '🤝', color: '#0EA5E9', isActive: true, rating: 3.9, tasksCompleted: 34, lastActive: new Date(), communicationStyle: 'stratégique', languages: ['fr', 'en'], tools: ['negotiation', 'supplier_management', 'contracts'], permissions: ['read', 'write'] },
  { id: '16', name: 'Designer IA', type: 'designer', role: 'Création visuelle et marketing', emoji: '🎨', color: '#F472B6', isActive: true, rating: 4.0, tasksCompleted: 67, lastActive: new Date(), communicationStyle: 'créatif', languages: ['fr'], tools: ['design', 'branding', 'visual_content'], permissions: ['read', 'write'] },
];

const conversations: Record<string, AgentMessage[]> = {};

function getAgentConversation(agentId: string): AgentMessage[] {
  if (!conversations[agentId]) {
    const agent = mockAgents.find(a => a.id === agentId);
    if (agent) {
      conversations[agentId] = [
        {
          id: generateId(),
          agentId,
          role: 'agent',
          content: `Bonjour ! Je suis ${agent.name}, ${agent.role}. Comment puis-je vous aider aujourd'hui ?`,
          timestamp: new Date(Date.now() - 60000),
        },
      ];
    } else {
      conversations[agentId] = [];
    }
  }
  return conversations[agentId];
}

export const agentsService = {
  async getAgents(): Promise<Agent[]> {
    try {
      const response = await api.get<Agent[]>('/agents');
      return response.data;
    } catch {
      return mockAgents;
    }
  },

  async getAgentById(id: string): Promise<Agent | null> {
    try {
      const response = await api.get<Agent>(`/agents/${id}`);
      return response.data;
    } catch {
      return mockAgents.find(a => a.id === id) || null;
    }
  },

  async createAgent(data: CreateAgentData): Promise<Agent> {
    try {
      const response = await api.post<Agent>('/agents', data);
      return response.data;
    } catch {
      const newAgent: Agent = {
        id: generateId(),
        name: data.name,
        type: data.type,
        role: data.role,
        emoji: data.emoji || getEmojiForType(data.type),
        color: data.color || getColorForType(data.type),
        isActive: false,
        rating: 0,
        tasksCompleted: 0,
        lastActive: null,
        communicationStyle: data.communicationStyle || 'professionnel',
        languages: data.languages || ['fr'],
        systemPrompt: data.systemPrompt,
        tools: data.tools || [],
        permissions: data.permissions || ['read'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockAgents.push(newAgent);
      return newAgent;
    }
  },

  async updateAgentConfig(id: string, config: UpdateAgentConfig): Promise<Agent | null> {
    try {
      const response = await api.patch<Agent>(`/agents/${id}/config`, config);
      return response.data;
    } catch {
      const agent = mockAgents.find(a => a.id === id);
      if (!agent) return null;
      Object.assign(agent, config, { updatedAt: new Date() });
      return agent;
    }
  },

  async activateAgent(id: string): Promise<boolean> {
    try {
      await api.post(`/agents/${id}/activate`);
      return true;
    } catch {
      const agent = mockAgents.find(a => a.id === id);
      if (agent) {
        agent.isActive = true;
        return true;
      }
      return false;
    }
  },

  async deactivateAgent(id: string): Promise<boolean> {
    try {
      await api.post(`/agents/${id}/deactivate`);
      return true;
    } catch {
      const agent = mockAgents.find(a => a.id === id);
      if (agent) {
        agent.isActive = false;
        return true;
      }
      return false;
    }
  },

  async sendMessageToAgent(id: string, message: string): Promise<AgentMessage> {
    try {
      const response = await api.post<AgentMessage>(`/agents/${id}/messages`, { content: message });
      return response.data;
    } catch {
      const agent = mockAgents.find(a => a.id === id);
      const userMessage: AgentMessage = {
        id: generateId(),
        agentId: id,
        role: 'user',
        content: message,
        timestamp: new Date(),
      };

      const conv = getAgentConversation(id);
      conv.push(userMessage);

      const agentResponse: AgentMessage = {
        id: generateId(),
        agentId: id,
        role: 'agent',
        content: getSimulatedResponse(agent?.type || 'default'),
        timestamp: new Date(),
      };
      conv.push(agentResponse);

      return agentResponse;
    }
  },

  async getAgentConversation(id: string): Promise<AgentMessage[]> {
    try {
      const response = await api.get<AgentMessage[]>(`/agents/${id}/messages`);
      return response.data;
    } catch {
      return getAgentConversation(id);
    }
  },

  async rateAgent(id: string, rating: number): Promise<boolean> {
    try {
      await api.post(`/agents/${id}/rate`, { rating });
      return true;
    } catch {
      const agent = mockAgents.find(a => a.id === id);
      if (agent) {
        agent.rating = rating;
        return true;
      }
      return false;
    }
  },

  async getRecommendedAgents(): Promise<Agent[]> {
    try {
      const response = await api.get<Agent[]>('/agents/recommended');
      return response.data;
    } catch {
      return mockAgents.filter(a => a.isActive).sort((a, b) => b.rating - a.rating).slice(0, 5);
    }
  },
};
