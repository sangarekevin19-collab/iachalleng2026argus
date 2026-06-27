# AURA OS — Architecture Complète v2.0

## 🏗️ Vision

Transformer AURA OS d'un SaaS avec chatbot en une **plateforme d'entreprise autonome** réellement intelligente, personnalisée métier par métier, capable d'accompagner et de faire croître une entreprise presque comme une équipe complète de collaborateurs IA.

---

## 📊 Audit de l'existant

### Problèmes identifiés

#### 1. Interview lente
- **Cause** : Appel LLM synchrone bloquant, pas de streaming SSE, pas de préchargement
- **Impact** : L'utilisateur attend 5-15s entre chaque question
- **Solution** : Streaming SSE + préchargement async + cache de questions

#### 2. Dashboard générique
- **Cause** : Composants statiques, sections hardcodées, pas de personnalisation par métier
- **Impact** : Tous les utilisateurs voient la même interface
- **Solution** : Dashboard engine dynamique généré par LLM à partir du profil entreprise

#### 3. Agents non personnalisés
- **Cause** : Templates statiques par secteur, pas de génération dynamique
- **Impact** : Agents génériques, pas adaptés au contexte spécifique
- **Solution** : Génération LLM dynamique basée sur l'interview complète

#### 4. Mémoire absente
- **Cause** : MemoryService basique (CRUD simple), pas de mémoire contextuelle
- **Impact** : AURA ne "connait" pas l'entreprise entre les sessions
- **Solution** : Système de mémoire multi-niveaux (court/moyen/long terme) + vector DB

#### 5. Pas d'orchestrateur
- **Cause** : Pas de cerveau central, agents indépendants sans coordination
- **Impact** : Pas d'autonomie, pas de détection proactive de problèmes
- **Solution** : AURA CORE — orchestrateur central avec boucle d'autonomie

#### 6. Pas de publication réseaux sociaux
- **Cause** : Module marketing existant mais pas connecté aux APIs sociales
- **Impact** : Pas de génération/pilotage de contenu social
- **Solution** : Social Media Engine avec OAuth, planification, publication auto

#### 7. UX non premium
- **Cause** : UI basique, animations simples, pas de micro-interactions
- **Impact** : Produit qui ne semble pas "premium"
- **Solution** : Refonte complète inspirée de Linear/Notion/Stripe

#### 8. Problèmes techniques
- **Duplication** : Code répété dans les controllers/services
- **Pas de tests** : 0 tests E2E, seulement 2 tests unitaires
- **Pas de rate limiting** par endpoint
- **Pas de cache** Redis pour les réponses LLM
- **Pas de queue** pour les tâches async
- **Pas de monitoring** des performances
- **Pas de gestion d'erreurs** centralisée

---

## 🏛️ Architecture Nouvelle

```
┌─────────────────────────────────────────────────────────────────┐
│                        AURA OS v2.0                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    AURA CORE (Orchestrateur)              │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────────────┐   │   │
│  │  │ Task Queue │ │ Scheduler  │ │ Autonomy Engine    │   │   │
│  │  │ (BullMQ)   │ │ (Cron)     │ │ (Detect→Act→Learn) │   │   │
│  │  └────────────┘ └────────────┘ └────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 Agent System (Multi-Agents)               │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │ Agent    │ │ Agent    │ │ Agent    │ │ Agent    │   │   │
│  │  │ Logique  │ │ Marketing│ │ Client   │ │ Croissance│   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │          Agent Factory (LLM Generation)           │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Memory System (Multi-Niveaux)                │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────────────┐   │   │
│  │  │ Short-Term │ │ Long-Term  │ │ Vector DB          │   │   │
│  │  │ (Redis)    │ │ (Postgres) │ │ (ChromaDB/Pinecone)│   │   │
│  │  └────────────┘ └────────────┘ └────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           Dashboard Engine (Dynamique)                    │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────────────┐   │   │
│  │  │ Sector     │ │ Module     │ │ Widget             │   │   │
│  │  │ Config     │ │ Registry   │ │ Renderer           │   │   │
│  │  └────────────┘ └────────────┘ └────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │          Social Media Engine (Auto-Publish)               │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────────────┐   │   │
│  │  │ OAuth      │ │ Content    │ │ Scheduler          │   │   │
│  │  │ Manager    │ │ Generator  │ │ & Publisher        │   │   │
│  │  └────────────┘ └────────────┘ └────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │          Growth Engine (Moteur de Croissance)             │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────────────┐   │   │
│  │  │ Market     │ │ Competitor │ │ Opportunity        │   │   │
│  │  │ Analyzer   │ │ Tracker    │ │ Detector           │   │   │
│  │  └────────────┘ └────────────┘ └────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Structure des fichiers (Nouvelle)

```
apps/backend/src/
├── aura-core/                          # 🧠 Cerveau central
│   ├── aura-core.module.ts
│   ├── aura-core.service.ts            # Orchestrateur principal
│   ├── autonomy-engine.service.ts      # Boucle d'autonomie
│   ├── task-queue.service.ts           # File d'attente (BullMQ)
│   └── scheduler.service.ts            # Planification
│
├── agents/                             # 🤖 Système multi-agents
│   ├── agents.module.ts
│   ├── agents.controller.ts
│   ├── agents.service.ts
│   ├── agent-factory.service.ts        # Génération dynamique LLM
│   ├── agent-executor.service.ts       # Exécution des agents
│   ├── agent-memory.service.ts         # Mémoire partagée
│   ├── entities/agent.entity.ts
│   ├── enums/agent-type.enum.ts
│   └── services/
│       ├── llm.service.ts             # LLM avec streaming
│       └── llm-cache.service.ts       # Cache Redis réponses LLM
│
├── memory/                            # 💾 Système de mémoire
│   ├── memory.module.ts
│   ├── memory.service.ts              # Orchestrateur mémoire
│   ├── short-term-memory.service.ts   # Redis (session)
│   ├── long-term-memory.service.ts    # Postgres (historique)
│   ├── vector-memory.service.ts       # ChromaDB (sémantique)
│   └── entities/memory-entry.entity.ts
│
├── dashboard-engine/                  # 📊 Dashboard dynamique
│   ├── dashboard-engine.module.ts
│   ├── dashboard-engine.service.ts     # Génération dashboard
│   ├── sector-config.service.ts       # Config par métier
│   ├── module-registry.service.ts     # Registre des modules
│   └── sectors/                       # Configurations par secteur
│       ├── delivery.config.ts
│       ├── restaurant.config.ts
│       ├── clinic.config.ts
│       ├── hotel.config.ts
│       ├── commerce.config.ts
│       ├── beauty.config.ts
│       ├── school.config.ts
│       ├── agriculture.config.ts
│       ├── construction.config.ts
│       └── ...
│
├── social-media/                      # 📱 Réseaux sociaux
│   ├── social-media.module.ts
│   ├── social-media.controller.ts
│   ├── social-media.service.ts
│   ├── oauth-manager.service.ts
│   ├── content-generator.service.ts
│   ├── publisher.service.ts
│   ├── scheduler.service.ts
│   ├── platforms/
│   │   ├── facebook.service.ts
│   │   ├── instagram.service.ts
│   │   ├── linkedin.service.ts
│   │   ├── tiktok.service.ts
│   │   └── twitter.service.ts
│   └── entities/
│       ├── social-account.entity.ts
│       ├── social-post.entity.ts
│       └── social-campaign.entity.ts
│
├── growth-engine/                     # 🚀 Moteur de croissance
│   ├── growth-engine.module.ts
│   ├── growth-engine.service.ts
│   ├── market-analyzer.service.ts
│   ├── competitor-tracker.service.ts
│   ├── opportunity-detector.service.ts
│   └── recommendation.service.ts
│
├── onboarding/                        # 🎯 Onboarding optimisé
│   ├── onboarding.module.ts
│   ├── onboarding.controller.ts        # SSE streaming
│   ├── onboarding.service.ts
│   ├── interview-engine.service.ts     # Engine d'interview
│   └── preload.service.ts             # Préchargement questions
│
├── modules/                           # Modules métier existants (refactorés)
│   ├── auth/
│   ├── crm/
│   ├── finance/
│   ├── inventory/
│   ├── pos/
│   ├── delivery/
│   ├── employees/
│   ├── reports/
│   ├── marketing/
│   ├── whatsapp/
│   ├── voice/
│   ├── scoring/
│   ├── learning/
│   ├── market-intelligence/
│   └── settings/
│
└── shared/                            # Services partagés
    ├── services/
    │   ├── email.service.ts
    │   ├── sms.service.ts
    │   ├── encryption.service.ts
    │   ├── redis.service.ts
    │   └── storage.service.ts
    ├── interceptors/
    │   ├── logging.interceptor.ts
    │   ├── cache.interceptor.ts
    │   └── transform.interceptor.ts
    ├── filters/
    │   └── global-exception.filter.ts
    └── guards/
        ├── jwt-auth.guard.ts
        └── roles.guard.ts
```

---

## 🔄 Flux de données

### 1. Interview → Dashboard → Agents

```
User → Interview (SSE Streaming)
     → LLM analyse réponses en temps réel
     → Interview complète
     → LLM génère profil entreprise complet
     → AgentFactory crée agents dynamiques
     → DashboardEngine génère dashboard personnalisé
     → MemorySystem stocke tout
     → AURA CORE commence la surveillance
```

### 2. Autonomie Loop

```
AURA CORE (toutes les 5 min)
  → Analyse des données (ventes, stock, clients...)
  → Détection d'anomalies
  → Si problème détecté :
    → Identifie la cause
    → Crée un plan d'action
    → Si action auto-admissible → exécute
    → Si action critique → notifie l'utilisateur
  → Apprend des résultats
  → Met à jour la mémoire
```

### 3. Social Media Auto

```
AURA CORE (quotidien)
  → Analyse le profil entreprise
  → Génère idées de contenu
  → Crée les visuels
  → Planifie les publications
  → Publie automatiquement
  → Analyse les performances
  → Ajuste la stratégie
```

---

## 📊 Base de données (Nouvelles tables)

```sql
-- AURA CORE
CREATE TABLE aura_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  priority INTEGER DEFAULT 5,
  data JSONB DEFAULT '{}',
  result JSONB DEFAULT '{}',
  scheduled_at TIMESTAMP,
  executed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Mémoire vectorielle
CREATE TABLE memory_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES agents(id),
  agent_id UUID REFERENCES agents(id),
  type VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  importance FLOAT DEFAULT 0.5,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_memory_vectors_embedding ON memory_vectors USING ivfflat (embedding vector_cosine_ops);

-- Dashboard dynamique
CREATE TABLE dashboard_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  sector VARCHAR(50) NOT NULL,
  layout JSONB NOT NULL,
  widgets JSONB DEFAULT '[]',
  theme JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Réseaux sociaux
CREATE TABLE social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  platform VARCHAR(20) NOT NULL,
  account_name VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  account_id UUID NOT NULL REFERENCES social_accounts(id),
  platform VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  media_urls TEXT[],
  status VARCHAR(20) DEFAULT 'draft',
  scheduled_at TIMESTAMP,
  published_at TIMESTAMP,
  platform_post_id VARCHAR(255),
  engagement JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Croissance
CREATE TABLE growth_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  impact_score FLOAT,
  effort_score FLOAT,
  priority INTEGER DEFAULT 5,
  status VARCHAR(20) DEFAULT 'pending',
  action_plan JSONB DEFAULT '{}',
  result JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎯 Configurations par secteur

### Livraison
Modules: deliveries, drivers, routes, fleet, fuel, customers, analytics
Agents: Agent Logistique, Agent Chauffeurs, Agent Maintenance, Agent Marketing, Agent Service Client

### Restaurant
Modules: pos, inventory, bookings, menu, delivery, loyalty, analytics, suppliers
Agents: Agent Cuisine, Agent Service, Agent Stocks, Agent Marketing, Agent Fidélisation

### Cabinet médical
Modules: appointments, patients, billing, pharmacy, doctors, analytics
Agents: Agent Rendez-vous, Agent Patients, Agent Facturation, Agent Pharmacie

### Agence immobilière
Modules: properties, prospects, visits, contracts, estimates, analytics
Agents: Agent Biens, Agent Prospection, Agent Visites, Agent Contrats

### Salon de coiffure
Modules: appointments, clients, products, loyalty, campaigns, analytics
Agents: Agent Planning, Agent Clientèle, Agent Produits, Agent Marketing

---

## 🔐 Sécurité

- Rate limiting par endpoint et par utilisateur
- Validation stricte de tous les inputs (DTOs + class-validator)
- Sanitization des sorties
- Audit trail complet
- Chiffrement des tokens OAuth en base
- Rotation automatique des tokens
- CORS strict
- Helmet headers
- CSRF protection

---

## 📈 Performance

- Cache Redis pour les réponses LLM (TTL adaptatif)
- Queue BullMQ pour les tâches async
- Connection pooling Postgres
- Lazy loading des modules
- Compression gzip/brotli
- CDN pour les assets statiques
- Pagination cursor-based
- Indexes optimisés

---

## 🧪 Tests

- Tests unitaires : Jest (couverture > 80%)
- Tests d'intégration : Supertest
- Tests E2E : Playwright
- Tests de charge : k6
- Mock LLM pour les tests
