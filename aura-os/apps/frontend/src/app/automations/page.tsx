'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

type WorkflowStatus = 'draft' | 'active' | 'paused' | 'error' | 'archived';
type WorkflowCategory = 'marketing' | 'crm' | 'whatsapp' | 'email' | 'finance' | 'hr' | 'support' | 'sales' | 'operations' | 'growth' | 'custom';

interface Workflow {
  id: string;
  name: string;
  description: string;
  category: WorkflowCategory;
  status: WorkflowStatus;
  agentId?: string;
  executionCount: number;
  successCount: number;
  errorCount: number;
  lastExecutedAt?: string;
  createdAt: string;
}

interface Stats {
  totalWorkflows: number;
  activeWorkflows: number;
  draftWorkflows: number;
  errorWorkflows: number;
  totalExecutions: number;
  successRate: number;
  byCategory: Record<string, number>;
}

const categoryLabels: Record<WorkflowCategory, string> = {
  marketing: 'Marketing',
  crm: 'CRM',
  whatsapp: 'WhatsApp',
  email: 'Email',
  finance: 'Finance',
  hr: 'RH',
  support: 'Support',
  sales: 'Ventes',
  operations: 'Opérations',
  growth: 'Croissance',
  custom: 'Personnalisé',
};

const categoryIcons: Record<WorkflowCategory, string> = {
  marketing: '📢',
  crm: '👥',
  whatsapp: '💬',
  email: '📧',
  finance: '💰',
  hr: '🎓',
  support: '🛠️',
  sales: '📈',
  operations: '⚙️',
  growth: '🚀',
  custom: '🔧',
};

const statusColors: Record<WorkflowStatus, string> = {
  draft: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  paused: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  error: 'bg-red-500/20 text-red-400 border-red-500/30',
  archived: 'bg-gray-600/20 text-gray-500 border-gray-600/30',
};

const statusLabels: Record<WorkflowStatus, string> = {
  draft: 'Brouillon',
  active: 'Actif',
  paused: 'En pause',
  error: 'Erreur',
  archived: 'Archivé',
};

export default function AutomationsPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [view, setView] = useState<'list' | 'grid'>('grid');

  useEffect(() => {
    if (!isHydrated) return;
    if (!accessToken) {
      router.push('/auth/login');
      return;
    }
    fetchData();
  }, [accessToken, isHydrated, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const [wfRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/automation/workflows`, { headers }),
        axios.get(`${API_URL}/automation/workflows/stats`, { headers }),
      ]);
      setWorkflows(wfRes.data || []);
      setStats(statsRes.data || null);
    } catch (err) {
      console.error('Failed to fetch automations:', err);
      setWorkflows([]);
      setStats({
        totalWorkflows: 0,
        activeWorkflows: 0,
        draftWorkflows: 0,
        errorWorkflows: 0,
        totalExecutions: 0,
        successRate: 0,
        byCategory: {},
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredWorkflows = workflows.filter((w) => {
    const matchSearch = searchQuery === '' || 
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = filterCategory === 'all' || w.category === filterCategory;
    const matchStatus = filterStatus === 'all' || w.status === filterStatus;
    return matchSearch && matchCategory && matchStatus;
  });

  const activeCategories = Object.keys(stats?.byCategory || {}) as WorkflowCategory[];

  if (!isHydrated) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                  ⚡ Automations
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  {workflows.length} workflow{workflows.length > 1 ? 's' : ''} · Moteur n8n
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchData}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                title="Rafraîchir"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={() => router.push('/automations/new')}
                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 font-medium text-sm transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nouveau Workflow
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Workflows" value={stats?.totalWorkflows || 0} icon="📊" color="violet" />
          <StatCard label="Actifs" value={stats?.activeWorkflows || 0} icon="✅" color="green" />
          <StatCard label="Exécutions" value={stats?.totalExecutions || 0} icon="🔄" color="cyan" />
          <StatCard
            label="Taux de succès"
            value={`${stats?.successRate || 0}%`}
            icon="📈"
            color={stats && stats.successRate >= 70 ? 'green' : stats && stats.successRate >= 40 ? 'yellow' : 'red'}
          />
        </div>

        {/* Category Stats */}
        {activeCategories.length > 0 && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">Par catégorie</h2>
            <div className="flex flex-wrap gap-2">
              {activeCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(filterCategory === cat ? 'all' : cat)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                    filterCategory === cat
                      ? 'bg-violet-600/30 border-violet-500/50 text-violet-300'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {categoryIcons[cat as WorkflowCategory] || '🔹'} {categoryLabels[cat as WorkflowCategory] || cat}
                  <span className="ml-1.5 text-xs text-gray-500">({stats?.byCategory[cat]})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
          <div className="relative flex-1 w-full md:w-auto">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Rechercher un workflow..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/25"
            />
          </div>
          <div className="flex gap-2 items-center">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white text-sm focus:outline-none focus:border-violet-500/50"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="draft">Brouillon</option>
              <option value="paused">En pause</option>
              <option value="error">Erreur</option>
            </select>
            <div className="flex rounded-lg bg-gray-900 border border-gray-800 overflow-hidden">
              <button
                onClick={() => setView('grid')}
                className={`p-2.5 ${view === 'grid' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setView('list')}
                className={`p-2.5 ${view === 'list' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">Aucun workflow trouvé</h3>
            <p className="text-gray-500 mb-6">Créez votre première automatisation pour connecter AURA au monde extérieur</p>
            <button
              onClick={() => router.push('/automations/new')}
              className="px-6 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 font-medium transition-colors"
            >
              Créer un workflow
            </button>
          </div>
        ) : (
          <div className={view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
            {filteredWorkflows.map((wf) => (
              <WorkflowCard key={wf.id} workflow={wf} view={view} router={router} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
  const colorMap: Record<string, string> = {
    violet: 'from-violet-500/10 to-violet-600/5 border-violet-500/20',
    green: 'from-green-500/10 to-green-600/5 border-green-500/20',
    cyan: 'from-cyan-500/10 to-cyan-600/5 border-cyan-500/20',
    yellow: 'from-yellow-500/10 to-yellow-600/5 border-yellow-500/20',
    red: 'from-red-500/10 to-red-600/5 border-red-500/20',
  };

  return (
    <div className={`bg-gradient-to-br ${colorMap[color] || colorMap.cyan} rounded-xl p-4 border`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs text-gray-400 font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function WorkflowCard({ workflow: wf, view, router }: { workflow: Workflow; view: string; router: any }) {
  if (view === 'list') {
    return (
      <button
        onClick={() => router.push(`/automations/${wf.id}`)}
        className="w-full text-left bg-gray-900 rounded-xl border border-gray-800 p-4 hover:border-violet-500/30 transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{categoryIcons[wf.category] || '🔹'}</span>
            <div>
              <h3 className="font-semibold text-white group-hover:text-violet-300 transition-colors">{wf.name}</h3>
              <p className="text-sm text-gray-500 truncate max-w-md">{wf.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[wf.status]}`}>
              {statusLabels[wf.status]}
            </span>
            <span className="text-sm text-gray-500">{wf.executionCount} exec.</span>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={() => router.push(`/automations/${wf.id}`)}
      className="text-left bg-gray-900 rounded-xl border border-gray-800 p-5 hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5 transition-all group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{categoryIcons[wf.category] || '🔹'}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[wf.status]}`}>
            {statusLabels[wf.status]}
          </span>
        </div>
        <span className="text-xs text-gray-600">{categoryLabels[wf.category] || wf.category}</span>
      </div>

      {/* Info */}
      <h3 className="font-semibold text-white mb-1 group-hover:text-violet-300 transition-colors truncate">
        {wf.name}
      </h3>
      <p className="text-sm text-gray-500 line-clamp-2 min-h-[2.5rem]">{wf.description}</p>

      {/* Stats */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-800">
        <div className="text-center">
          <span className="block text-lg font-bold text-white">{wf.executionCount}</span>
          <span className="text-xs text-gray-500">Exécutions</span>
        </div>
        <div className="text-center">
          <span className="block text-lg font-bold text-green-400">{wf.successCount}</span>
          <span className="text-xs text-gray-500">Succès</span>
        </div>
        <div className="text-center">
          <span className="block text-lg font-bold text-red-400">{wf.errorCount}</span>
          <span className="text-xs text-gray-500">Erreurs</span>
        </div>
        {wf.lastExecutedAt && (
          <div className="ml-auto text-xs text-gray-600">
            {new Date(wf.lastExecutedAt).toLocaleDateString('fr-FR')}
          </div>
        )}
      </div>
    </button>
  );
}
