'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';

interface Message {
  id: string;
  role: 'aura' | 'user';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function InterviewPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const setOnboardingComplete = useAuthStore((s) => s.setOnboardingComplete);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [generating, setGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isTyping, scrollToBottom]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!accessToken) { router.push('/auth/login'); return; }
    startInterview();
  }, [accessToken, isHydrated]);

  // ─── Start interview ───

  const startInterview = async () => {
    setIsLoading(true);
    setIsTyping(true);
    try {
      const response = await fetch(`${API}/onboarding/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      if (data.firstQuestion) {
        addAuraMessage(data.firstQuestion);
        setQuestionCount(1);
      }
    } catch {
      addAuraMessage("Bienvenue sur AURA OS ! 🎯 Pour commencer, quel est le nom de votre entreprise et que vendez-vous ?");
      setQuestionCount(1);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  // ─── Add aura message ───

  const addAuraMessage = (content: string, streaming = false) => {
    const id = `aura-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setMessages((prev) => [...prev, { id, role: 'aura', content, timestamp: new Date(), isStreaming: streaming }]);
    return id;
  };

  const updateStreamingMessage = (id: string, content: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content } : m)));
  };

  // ─── Stream response with word-by-word typing effect ───

  const streamResponse = async (answer: string, allMessages: Message[]) => {
    const conversationMessages = [
      ...allMessages.map((m) => ({ role: m.role === 'aura' ? 'assistant' : 'user', content: m.content })),
    ];

    const messageId = addAuraMessage('', true);
    let fullText = '';

    try {
      const response = await fetch(`${API}/onboarding/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ answer, messages: conversationMessages }),
      });

      if (!response.ok) {
        updateStreamingMessage(messageId, "Une erreur est survenue. Pouvez-vous répéter ?");
        return;
      }

      const data = await response.json();

      // ─── LLM decided interview is complete ───
      if (data.isComplete) {
        const summary = data.summary || "Merci ! J'ai maintenant une compréhension complète de votre entreprise.";
        // Replace the streaming message with the summary
        setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, content: summary, isStreaming: false } : m)));
        setIsComplete(true);

        // Auto-generate platform
        setGenerating(true);
        try {
          const genResponse = await fetch(`${API}/onboarding/generate-platform`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          });
          if (genResponse.ok) {
            await genResponse.json();
          }
        } catch { /* non-blocking */ }

        setOnboardingComplete();
        setTimeout(() => router.push('/onboarding/creating'), 2500);
        return;
      }

      // ─── Next question — typing effect ───
      const question = data.nextQuestion;
      if (question) {
        const words = question.split(' ');
        for (let i = 0; i < words.length; i++) {
          fullText += (i > 0 ? ' ' : '') + words[i];
          updateStreamingMessage(messageId, fullText);
          await new Promise((resolve) => setTimeout(resolve, 15 + Math.random() * 25));
        }
        setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, isStreaming: false } : m)));
        setQuestionCount((c) => c + 1);
      }
    } catch {
      updateStreamingMessage(messageId, "Pouvez-vous me donner plus de détails à ce sujet ?");
    }
  };

  // ─── Send message ───

  const handleSend = async () => {
    if (!input.trim() || isLoading || isComplete) return;
    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    setIsTyping(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    const newMessages = [...messages, { id: `user-${Date.now()}`, role: 'user' as const, content: userMessage, timestamp: new Date() }];
    setMessages(newMessages);

    try {
      await streamResponse(userMessage, newMessages);
    } catch {
      addAuraMessage("Pouvez-vous me donner plus de détails ?");
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  // ─── Progress: LLM decides, so we estimate ───
  const progress = Math.min((questionCount / 15) * 100, 90);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0015] via-[#1a0a2e] to-[#0d1b2a]" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-600/8 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-600/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      </div>

      {/* ─── HEADER ─── */}
      <div className="glass-strong border-b border-white/[0.06] px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl gradient-aura flex items-center justify-center shadow-lg shadow-violet-500/20 animate-glow-pulse">
            <span className="text-lg">✦</span>
          </div>
          <div>
            <h1 className="font-bold text-white text-sm">Interview AURA</h1>
            <p className="text-xs text-slate-400">
              {isComplete ? '✅ Analyse terminée' : generating ? '⚡ Génération en cours...' : `${questionCount} questions · ${Math.round(progress)}%`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:block w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full gradient-aura rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>

      {/* ─── MESSAGES ─── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5 max-w-3xl mx-auto w-full">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {message.role === 'aura' && (
                <div className="w-9 h-9 rounded-xl gradient-aura flex items-center justify-center flex-shrink-0 mt-1 shadow-lg shadow-violet-500/20">
                  <span className="text-sm">✦</span>
                </div>
              )}
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                message.role === 'aura'
                  ? 'glass border border-white/[0.08] text-slate-200 rounded-tl-sm'
                  : 'gradient-playland text-white rounded-tr-sm shadow-lg shadow-violet-500/15'
              }`}>
                {message.role === 'aura' ? (
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                    {message.isStreaming && (
                      <span className="inline-block w-1.5 h-4 bg-violet-400 ml-0.5 animate-pulse rounded-sm" />
                    )}
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed">{message.content}</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-9 h-9 rounded-xl gradient-aura flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/20">
              <span className="text-sm">✦</span>
            </div>
            <div className="glass border border-white/[0.08] rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ─── INPUT ─── */}
      <div className="glass-strong border-t border-white/[0.06] p-4 sticky bottom-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={isComplete ? "Interview terminée — AURA génère votre plateforme..." : "Partagez votre expérience..."}
                className="w-full h-12 px-4 rounded-xl glass border border-white/[0.08] text-white placeholder-slate-500 focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-sm"
                disabled={isLoading || isComplete}
              />
            </div>
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || isComplete}
              size="lg"
              className="gradient-playland hover:opacity-90 text-white shadow-lg shadow-violet-500/25 rounded-xl px-6 transition-all hover:scale-105"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>➤</span>
              )}
            </Button>
          </div>
          <p className="text-center text-[10px] text-slate-600 mt-2">
            {isComplete
              ? '✨ AURA analyse vos réponses et génère votre plateforme personnalisée...'
              : 'Appuyez sur Entrée · AURA adapte ses questions à votre métier · L\'IA décide quand l\'interview est terminée'}
          </p>
        </div>
      </div>
    </div>
  );
}
