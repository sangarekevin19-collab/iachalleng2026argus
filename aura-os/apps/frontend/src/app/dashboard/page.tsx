'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/auth-store';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// ─── Types (dynamically shaped by LLM config) ───

interface NavItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  order: number;
}

interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  icon: string;
  color: string;
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, any>;
}

interface AgentSummary {
  id: string;
  name: string;
  role: string;
  avatar: string;
  color: string;
  isActive: boolean;
  status: string;
}

interface DashboardTheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  chartColors: string[];
}

interface DashboardConfig {
  modules: Array<{ id: string; name: string; icon: string; order: number }>;
  pages: Array<{ id: string; name: string; route: string; icon: string }>;
  widgets: WidgetConfig[];
  kpis: Array<{ id: string; name: string; target: string; unit: string }>;
  automations: Array<{ id: string; name: string; trigger: string; action: string }>;
  navigation: NavItem[];
}

interface PlatformData {
  company_profile: {
    sector: string;
    sub_sector: string;
    activity_description: string;
    size: string;
    country: string;
    city: string;
    [key: string]: any;
  };
  dashboard_config: DashboardConfig;
  agents_config: AgentSummary[];
  workflows: any[];
  business_summary?: string;
  business_type?: string;
  analysis?: any;
}

// ─── KPI Card ───

function KpiCard({ kpi, theme, delay }: { kpi: any; theme: DashboardTheme; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.2 } }}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl p-5 shadow-xl shadow-black/20"
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 0%, ${theme.primary}15, transparent 70%)` }} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg"
            style={{ background: `linear-gradient(135deg, ${theme.primary}30, ${theme.primary}10)`, border: `1px solid ${theme.primary}20` }}>
            {kpi.icon || '📊'}
          </div>
        </div>
        <p className="text-3xl font-black text-white tracking-tight mb-1">{kpi.value || '—'}</p>
        <p className="text-xs text-slate-400 font-medium">{kpi.name || kpi.label || ''}</p>
        {kpi.target && <p className="text-[10px] text-slate-600 mt-1">Objectif: {kpi.target}</p>}
      </div>
    </motion.div>
  );
}

// ─── Dynamic Widget Renderer ───

function DynamicWidget({ widget, theme, delay }: { widget: WidgetConfig; theme: DashboardTheme; delay: number }) {
  const color = widget.color || theme.primary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl p-5 shadow-xl shadow-black/20"
      style={{ gridColumn: `span ${widget.position?.w || 4}` }}
    >
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xl">{widget.icon || '📄'}</span>
        <h3 className="text-sm font-bold text-white">{widget.title}</h3>
      </div>

      {/* Chart placeholder */}
      {widget.type === 'chart' && (
        <div className="h-32 flex items-end gap-1">
          {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((v, i) => (
            <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${v}%` }}
              transition={{ delay: delay + i * 0.05, duration: 0.6 }}
              className="flex-1 rounded-t-md"
              style={{ background: `linear-gradient(to top, ${color}80, ${color}30)` }} />
          ))}
        </div>
      )}

      {/* List */}
      {widget.type === 'list' && (
        <div className="space-y-2">
          {(widget.config?.items || ['Aucune donnée']).map((item: string, i: number) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + i * 0.1 }}
              className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs text-slate-300">{item}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Agent widget */}
      {widget.type === 'agent' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/30 to-pink-500/20 flex items-center justify-center text-lg">🤖</div>
            <div>
              <p className="text-sm font-medium text-white">Agents IA</p>
              <p className="text-[10px] text-emerald-400">● Opérationnels</p>
            </div>
          </div>
          <p className="text-xs text-slate-400">Vos agents analysent vos données en continu.</p>
        </div>
      )}

      {/* Quick actions */}
      {widget.type === 'quick-action' && (
        <div className="grid grid-cols-2 gap-2">
          {(widget.config?.actions || [{ label: 'Nouveau', icon: '➕' }, { label: 'Analyser', icon: '📊' }, { label: 'Planifier', icon: '📅' }, { label: 'Envoyer', icon: '📤' }]).map((action: any, i: number) => (
            <motion.button key={i} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all">
              <span className="text-sm">{action.icon}</span>
              <span className="text-xs text-slate-300 font-medium">{action.label}</span>
            </motion.button>
          ))}
        </div>
      )}

      {/* Calendar */}
      {widget.type === 'calendar' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Aujourd'hui</span>
            <span className="font-medium text-white">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
          {(widget.config?.events || ['Aucun événement']).map((item: string, i: number) => (
            <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: delay + i * 0.1 }}
              className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.03]">
              <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs text-slate-300">{item}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Alert */}
      {widget.type === 'alert' && (
        <div className="space-y-2">
          {(widget.config?.alerts || [{ level: 'info', text: 'Aucune alerte' }]).map((alert: any, i: number) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + i * 0.1 }}
              className={`flex items-center gap-3 p-3 rounded-xl border ${
                alert.level === 'warning' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-blue-500/10 border-blue-500/20'
              }`}>
              <span className="text-sm">{alert.level === 'warning' ? '⚠️' : 'ℹ️'}</span>
              <span className="text-xs text-slate-300">{alert.text}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Map */}
      {widget.type === 'map' && (
        <div className="h-32 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center border border-white/[0.05]">
          <div className="text-center">
            <span className="text-2xl block mb-1">🗺️</span>
            <p className="text-[10px] text-slate-500">Carte en temps réel</p>
          </div>
        </div>
      )}

      {/* Feed */}
      {widget.type === 'feed' && (
        <div className="space-y-2">
          {(widget.config?.items || []).map((item: any, i: number) => (
            <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: delay + i * 0.1 }}
              className="flex items-start gap-3 p-2 rounded-lg bg-white/[0.02]">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0">
                {(item.user || 'U')[0]}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400">{item.user} · {item.time}</p>
                <p className="text-xs text-slate-300">{item.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Table */}
      {widget.type === 'table' && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {(widget.config?.columns || ['Colonne 1']).map((col: string, i: number) => (
                  <th key={i} className="text-left py-2 px-3 text-slate-400 font-medium">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(widget.config?.rows || []).map((row: any[], i: number) => (
                <tr key={i} className="border-b border-white/[0.03]">
                  {row.map((cell: any, j: number) => (
                    <td key={j} className="py-2 px-3 text-slate-300">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* KPI widget */}
      {widget.type === 'kpi' && (
        <div className="text-center">
          <p className="text-4xl font-black text-white mb-1">{widget.config?.value || '—'}</p>
          <p className="text-xs text-slate-400">{widget.config?.unit || ''}</p>
        </div>
      )}

      {/* Default fallback */}
      {!['chart', 'list', 'agent', 'quick-action', 'calendar', 'alert', 'map', 'feed', 'table', 'kpi'].includes(widget.type) && (
        <div className="h-24 flex items-center justify-center">
          <div className="text-center">
            <span className="text-2xl block mb-1">{widget.icon || '📄'}</span>
            <p className="text-[10px] text-slate-500">Widget: {widget.type}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Welcome Banner ───

function WelcomeBanner({ profile, agents, theme }: { profile: any; agents: AgentSummary[]; theme: DashboardTheme }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
      className="relative overflow-hidden rounded-3xl p-8">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600/30 via-pink-600/20 to-orange-500/10" />
      <div className="absolute inset-0 backdrop-blur-xl" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 flex items-center justify-between">
        <div className="flex-1">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <p className="text-xs text-violet-300/80 font-medium uppercase tracking-wider mb-2">
              {profile?.sector || 'Entreprise'} · AURA OS
            </p>
            <h2 className="text-2xl font-black text-white mb-2">Bienvenue sur votre espace ✨</h2>
            {profile?.activity_description && (
              <p className="text-sm text-white/60 max-w-lg line-clamp-2">{profile.activity_description}</p>
            )}
          </motion.div>
          {agents.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              className="flex items-center gap-2 mt-4">
              <div className="flex -space-x-2">
                {agents.slice(0, 4).map((agent) => (
                  <div key={agent.id} className="w-8 h-8 rounded-full border-2 border-[#0d0d1f] flex items-center justify-center text-sm shadow-lg"
                    style={{ backgroundColor: agent.color + '40' }}>
                    {agent.avatar || '🤖'}
                  </div>
                ))}
              </div>
              <span className="text-xs text-white/50">{agents.length} agents actifs</span>
            </motion.div>
          )}
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="hidden lg:flex items-center justify-center w-32 h-32">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center animate-glow-pulse">
            <span className="text-4xl">✦</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Loading ───

function DashboardLoading() {
  return (
    <div className="min-h-screen flex" style={{ background: '#080810' }}>
      <aside className="w-[260px] border-r border-white/[0.06] p-4 flex flex-col" style={{ background: '#101018' }}>
        <div className="w-10 h-10 rounded-xl bg-white/5 animate-pulse mb-6" />
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (<div key={i} className="h-9 bg-white/[0.03] rounded-xl animate-pulse" />))}
        </div>
      </aside>
      <main className="flex-1 p-6">
        <div className="h-8 w-48 bg-white/5 rounded-lg animate-pulse mb-6" />
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (<div key={i} className="h-32 bg-white/[0.03] rounded-2xl animate-pulse" />))}
        </div>
        <div className="h-64 bg-white/[0.03] rounded-2xl animate-pulse" />
      </main>
    </div>
  );
}

// ─── Main Dashboard — 100% Dynamic ───

export default function DashboardPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  const [platformData, setPlatformData] = useState<PlatformData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;
    if (!accessToken) { router.push('/auth/login'); return; }
    loadPlatform();
  }, [accessToken, isHydrated]);

  const loadPlatform = async () => {
    setLoading(true);
    try {
      // 1. Get onboarding session (contains full platform config)
      const sessionRes = await fetch(`${API}/onboarding/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      });
      const session = await sessionRes.json();

      // 2. If onboarding complete, get full platform config
      let data: PlatformData;

      if (session?.isComplete && session?.responses?._fullPlatformConfig) {
        // Full platform config generated by LLM
        const raw = session.responses._fullPlatformConfig;
        // Validate and normalize — LLM may not follow exact schema
        if (raw.dashboard_config && raw.company_profile) {
          data = raw;
        } else {
          // LLM returned partial/wrap data — build dashboard from whatever we have
          const profile = raw.company_profile || raw.entreprise || raw || {};
          data = {
            company_profile: profile,
            dashboard_config: {
              modules: [
                { id: 'overview', name: 'Vue d\'ensemble', icon: '📊', order: 0 },
                { id: 'agents', name: 'Agents IA', icon: '🤖', order: 1 },
                { id: 'settings', name: 'Paramètres', icon: '⚙️', order: 2 },
              ],
              pages: [],
              widgets: [
                { id: 'w1', type: 'kpi', title: 'Activité', icon: '🌾', color: '#6366F1', position: { x: 0, y: 0, w: 4, h: 2 }, config: { value: profile.activity_description || profile.activite_principale || '—', unit: '' } },
                { id: 'w2', type: 'list', title: 'Objectifs 3-5 ans', icon: '🎯', color: '#10B981', position: { x: 4, y: 0, w: 4, h: 2 }, config: { items: profile.objectifs_3_5_ans || ['Non défini'] } },
                { id: 'w3', type: 'alert', title: 'Difficultés', icon: '⚠️', color: '#F59E0B', position: { x: 8, y: 0, w: 4, h: 2 }, config: { alerts: (profile.difficultes_principales || ['Aucune']).map((d: string) => ({ level: 'warning', text: d })) } },
                { id: 'w4', type: 'quick-action', title: 'Actions rapides', icon: '⚡', color: '#EC4899', position: { x: 0, y: 2, w: 12, h: 2 }, config: { actions: [{ label: 'Nouveau', icon: '➕' }, { label: 'Analyser', icon: '📊' }, { label: 'Planifier', icon: '📅' }, { label: 'Envoyer', icon: '📤' }] } },
              ],
              kpis: [
                { id: 'k1', name: 'Superficie', target: '', unit: `${profile.superficie_totale_ha || '?'} ha` },
                { id: 'k2', name: 'Volailles', target: '', unit: `${profile.volailles?.nombre_tetes || '?'} têtes` },
                { id: 'k3', name: 'Équipe', target: '', unit: `${profile.main_d_oeuvre?.salaries || 0} salariés` },
                { id: 'k4', name: 'Canaux', target: '', unit: (profile.commercialisation?.canals || []).join(', ') || '—' },
              ],
              automations: [],
              navigation: [
                { id: 'overview', label: 'Vue d\'ensemble', icon: '📊', route: '/dashboard', order: 0 },
                { id: 'agents', label: 'Agents IA', icon: '🤖', route: '/dashboard/agents', order: 1 },
                { id: 'settings', label: 'Paramètres', icon: '⚙️', route: '/dashboard/settings', order: 2 },
              ],
            },
            agents_config: [],
            workflows: [],
          };
        }
      } else if (session?.responses?._analysis) {
        // Partial data from analysis
        const analysis = session.responses._analysis;
        data = {
          company_profile: {
            sector: analysis.sector || 'other',
            sub_sector: analysis.subSector || '',
            activity_description: session.responses._businessSummary || '',
            size: analysis.size || 'medium',
            country: analysis.country || '',
            city: analysis.city || '',
            ...analysis,
          },
          dashboard_config: {
            modules: (analysis.recommendedSections || ['overview', 'settings']).map((id: string) => ({
              id, name: id, icon: '📄', order: 0,
            })),
            pages: [],
            widgets: [],
            kpis: [],
            automations: [],
            navigation: (analysis.recommendedSections || ['overview', 'settings']).map((id: string, i: number) => ({
              id, label: id, icon: '📄', route: id === 'overview' ? '/dashboard' : `/dashboard/${id}`, order: i,
            })),
          },
          agents_config: [],
          workflows: [],
          business_summary: session.responses._businessSummary || '',
          business_type: analysis.sector || 'other',
          analysis,
        };
      } else {
        // No data yet — redirect to interview
        router.push('/onboarding/interview');
        return;
      }

      setPlatformData(data);

      // Set active section from navigation
      if (data.dashboard_config?.navigation?.length > 0) {
        setActiveSection(data.dashboard_config.navigation[0].id);
      }
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <DashboardLoading />;
  if (!platformData) return null;

  const { company_profile, dashboard_config, agents_config } = platformData;
  const navItems = dashboard_config?.navigation || [];
  const widgets = dashboard_config?.widgets || [];
  const kpis = dashboard_config?.kpis || [];
  const agents = agents_config || [];
  const sector = company_profile?.sector || 'other';

  // Theme: use LLM-generated or fallback
  const theme: DashboardTheme = (dashboard_config as any)?.theme || {
    primary: '#6366F1', secondary: '#4338CA', accent: '#818CF8',
    background: '#080810', surface: '#101018',
    chartColors: ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#EC4899'],
  };

  return (
    <div className="min-h-screen flex" style={{ background: theme.background }}>
      {/* ─── SIDEBAR ─── */}
      <aside className={`${sidebarOpen ? 'w-[260px]' : 'w-[68px]'} flex flex-col flex-shrink-0 fixed h-full z-30 transition-all duration-300`}
        style={{ background: theme.surface, borderRight: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Logo */}
        <div className="p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/30">
              <span className="text-lg">✦</span>
            </div>
            {sidebarOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h1 className="font-black text-white text-sm tracking-wide">AURA OS</h1>
                <p className="text-[10px] font-medium capitalize" style={{ color: theme.accent }}>
                  {sector}
                </p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Nav — dynamically generated by LLM */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.sort((a, b) => a.order - b.order).map((item, i) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                activeSection === item.id
                  ? 'font-semibold shadow-lg'
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
              }`}
              style={activeSection === item.id ? {
                background: `linear-gradient(135deg, ${theme.primary}20, ${theme.secondary}10)`,
                border: `1px solid ${theme.primary}30`,
                color: theme.accent,
              } : {}}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {sidebarOpen && <span className="truncate font-medium">{item.label}</span>}
            </motion.button>
          ))}
        </nav>

        {/* Agents status */}
        {sidebarOpen && agents.length > 0 && (
          <div className="p-3 border-t border-white/[0.06]">
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-semibold">Agents IA</p>
              <div className="flex -space-x-2">
                {agents.slice(0, 5).map((agent) => (
                  <div key={agent.id} className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs shadow-md"
                    style={{ backgroundColor: agent.color + '40', borderColor: theme.surface }}>
                    {agent.avatar || '🤖'}
                  </div>
                ))}
                {agents.length > 5 && (
                  <div className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] text-slate-300 font-bold"
                    style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderColor: theme.surface }}>
                    +{agents.length - 5}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Toggle */}
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-3 border-t border-white/[0.06] text-slate-500 hover:text-violet-400 transition-colors text-center text-xs">
          {sidebarOpen ? '◀' : '▶'}
        </button>
      </aside>

      {/* ─── MAIN ─── */}
      <main className={`flex-1 overflow-y-auto transition-all duration-300 ${sidebarOpen ? 'ml-[260px]' : 'ml-[68px]'}`}>
        {/* Top bar */}
        <div className="sticky top-0 z-20 px-6 py-4 flex items-center justify-between"
          style={{ background: theme.surface + 'e6', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              {navItems.find(n => n.id === activeSection)?.icon || '📊'}
              {navItems.find(n => n.id === activeSection)?.label || activeSection}
            </h2>
            {company_profile?.activity_description && (
              <p className="text-xs text-slate-500 mt-0.5 max-w-md truncate">{company_profile.activity_description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={loadPlatform}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white border border-white/[0.08] hover:border-white/[0.15] transition-all">
              ↻ Actualiser
            </motion.button>
            <div className="relative">
              <button onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg"
                style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}>
                👤
              </button>
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div initial={{ opacity: 0, y: -5, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: 0.95 }}
                    className="absolute right-0 top-12 rounded-xl p-2 w-48 shadow-2xl border border-white/[0.08]"
                    style={{ background: theme.surface }}>
                    <button onClick={() => { setActiveSection('settings'); setShowUserMenu(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-white/10 rounded-lg transition-colors">
                      ⚙️ Paramètres
                    </button>
                    <button onClick={() => { useAuthStore.getState().logout(); router.push('/auth/login'); }}
                      className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                      🚪 Déconnexion
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div key={activeSection} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              {activeSection === 'overview' ? (
                <div className="space-y-6">
                  <WelcomeBanner profile={company_profile} agents={agents} theme={theme} />

                  {/* KPIs — from LLM config */}
                  {kpis.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {kpis.map((kpi, i) => (
                        <KpiCard key={kpi.id || i} kpi={kpi} theme={theme} delay={i * 0.08} />
                      ))}
                    </div>
                  )}

                  {/* Widgets — from LLM config */}
                  {widgets.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                      {widgets.map((widget, i) => (
                        <DynamicWidget key={widget.id} widget={widget} theme={theme} delay={0.3 + i * 0.05} />
                      ))}
                    </div>
                  )}

                  {/* Agents */}
                  {agents.length > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <span>🤖</span> Vos Agents IA
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {agents.map((agent, i) => (
                          <motion.div key={agent.id}
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 + i * 0.05 }}
                            whileHover={{ y: -4 }}
                            className="rounded-2xl p-5 border border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl cursor-pointer">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-lg"
                                style={{ background: `linear-gradient(135deg, ${agent.color}30, ${agent.color}10)`, border: `1px solid ${agent.color}20` }}>
                                {agent.avatar || '🤖'}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white">{agent.name}</p>
                                <p className="text-[10px] text-slate-400">{agent.role}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                              <span className="text-[10px] text-slate-500">Actif</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Workflows */}
                  {platformData.workflows?.length > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
                      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <span>⚡</span> Workflows Automatisés
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {platformData.workflows.map((wf: any, i: number) => (
                          <div key={i} className="rounded-xl p-4 border border-white/[0.08] bg-white/[0.03]">
                            <p className="text-sm font-medium text-white">{wf.name}</p>
                            <p className="text-xs text-slate-400 mt-1">{wf.description}</p>
                            <div className="flex items-center gap-2 mt-3">
                              <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
                                {wf.trigger}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  <div className="text-center py-6">
                    <p className="text-[10px] text-slate-700">
                      Propulsé par <span className="font-bold tracking-widest" style={{ color: theme.primary + '60' }}>ARGUS CORP</span> © 2026
                    </p>
                  </div>
                </div>
              ) : (
                /* ─── Non-overview sections — dynamically rendered ─── */
                <div className="space-y-6">
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-12 text-center border border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-white/[0.02]">
                    <span className="text-6xl mb-4 block">
                      {navItems.find(n => n.id === activeSection)?.icon || '📄'}
                    </span>
                    <h3 className="text-2xl font-black text-white mb-2">
                      {navItems.find(n => n.id === activeSection)?.label || activeSection}
                    </h3>
                    <p className="text-sm text-slate-400 max-w-md mx-auto">
                      Cette section est configurée par AURA pour votre activité ({sector}).
                    </p>
                  </motion.div>

                  {/* Related agents */}
                  {agents.filter(a => a.role?.toLowerCase().includes(activeSection)).length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-white mb-3">Agents liés</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {agents.filter(a => a.role?.toLowerCase().includes(activeSection)).map(agent => (
                          <div key={agent.id} className="rounded-xl p-4 border border-white/[0.08] bg-white/[0.04]">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                                style={{ backgroundColor: agent.color + '20' }}>
                                {agent.avatar || '🤖'}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white">{agent.name}</p>
                                <p className="text-[10px] text-slate-500">{agent.role}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
