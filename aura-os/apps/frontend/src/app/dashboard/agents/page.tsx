'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/auth-store';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface Agent {
  id: string;
  name: string;
  type: string;
  role: string;
  avatar: string;
  color: string;
  isActive: boolean;
  description: string;
  systemPrompt: string;
  tools: string[];
  memory: Record<string, any>;
  config: Record<string, any>;
  tasksCompleted: number;
  rating: number;
  lastActive: string;
  communicationStyle: string;
  languages: string[];
}

interface PlatformData {
  company_profile: any;
  agents_config: Agent[];
  workflows: any[];
}

export default function AgentsPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  useEffect(() => {
    if (!isHydrated) return;
    if (!accessToken) { router.push('/auth/login'); return; }
    loadAgents();
  }, [accessToken, isHydrated]);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const sessionRes = await fetch(`${API}/onboarding/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      });
      const session = await sessionRes.json();

      if (session?.isComplete && session?.responses?._fullPlatformConfig) {
        const platform: PlatformData = session.responses._fullPlatformConfig;
        setAgents(platform.agents_config || []);
      } else {
        // Fallback: fetch from agents endpoint
        const agentsRes = await fetch(`${API}/agents`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (agentsRes.ok) {
          const data = await agentsRes.json();
          setAgents(data || []);
        }
      }
    } catch (error) {
      console.error('Agents load error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080810' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-400">Chargement des agents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ background: '#080810' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">🤖 Vos Agents IA</h1>
          <p className="text-sm text-slate-400">
            {agents.length} agents générés par AURA pour votre entreprise
          </p>
        </motion.div>

        {/* Agent Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent, i) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -4 }}
              onClick={() => setSelectedAgent(agent)}
              className="rounded-2xl p-5 border border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl cursor-pointer shadow-xl shadow-black/20"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${agent.color}30, ${agent.color}10)`, border: `1px solid ${agent.color}20` }}>
                  {agent.avatar || '🤖'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{agent.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{agent.role}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-400">Actif</span>
                </div>
              </div>

              {agent.description && (
                <p className="text-xs text-slate-400 line-clamp-2 mb-3">{agent.description}</p>
              )}

              {/* Tools */}
              {agent.tools && agent.tools.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {agent.tools.slice(0, 4).map((tool, j) => (
                    <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400">
                      {tool}
                    </span>
                  ))}
                  {agent.tools.length > 4 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400">
                      +{agent.tools.length - 4}
                    </span>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>Tâches: {agent.tasksCompleted || 0}</span>
                <span>⭐ {agent.rating || 0}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty state */}
        {agents.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-20">
            <span className="text-6xl mb-4 block">🤖</span>
            <h3 className="text-xl font-bold text-white mb-2">Aucun agent pour le moment</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Terminez l'interview AURA pour que le LLM génère vos agents IA personnalisés.
            </p>
            <button onClick={() => router.push('/onboarding/interview')}
              className="mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-medium text-sm hover:opacity-90 transition-opacity">
              Commencer l'interview
            </button>
          </motion.div>
        )}

        {/* Agent Detail Modal */}
        {selectedAgent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedAgent(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-lg rounded-2xl p-6 border border-white/[0.08] bg-[#101018] shadow-2xl max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ background: `linear-gradient(135deg, ${selectedAgent.color}30, ${selectedAgent.color}10)` }}>
                  {selectedAgent.avatar || '🤖'}
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">{selectedAgent.name}</h2>
                  <p className="text-sm text-slate-400">{selectedAgent.role}</p>
                </div>
              </div>

              {selectedAgent.description && (
                <div className="mb-4">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Description</h4>
                  <p className="text-sm text-slate-400">{selectedAgent.description}</p>
                </div>
              )}

              {selectedAgent.tools && selectedAgent.tools.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Outils</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedAgent.tools.map((tool, i) => (
                      <span key={i} className="text-xs px-3 py-1 rounded-full bg-white/[0.06] text-slate-300">
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedAgent.systemPrompt && (
                <div className="mb-4">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Prompt Système</h4>
                  <pre className="text-[10px] text-slate-500 whitespace-pre-wrap bg-white/[0.02] rounded-xl p-4 border border-white/[0.06] max-h-40 overflow-y-auto">
                    {selectedAgent.systemPrompt}
                  </pre>
                </div>
              )}

              <button onClick={() => setSelectedAgent(null)}
                className="w-full mt-4 px-4 py-2 rounded-xl bg-white/[0.06] text-slate-300 text-sm hover:bg-white/[0.1] transition-colors">
                Fermer
              </button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
