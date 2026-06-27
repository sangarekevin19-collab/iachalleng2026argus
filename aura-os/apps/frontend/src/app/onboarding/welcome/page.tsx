'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';

const AURA_MESSAGES = [
  { text: "Bonjour ! Je suis AURA, votre Directeur IA.", delay: 500 },
  { text: "Je suis le cerveau numérique de votre entreprise. Je vais apprendre à vous connaître, comprendre votre activité, et construire votre jumeau numérique.", delay: 2000 },
  { text: "Ensemble, nous allons créer une équipe d'agents IA spécialisés qui géreront automatiquement votre entreprise.", delay: 3500 },
  { text: "Mais d'abord, j'ai besoin de vous poser des questions. Autant qu'il faudra. Chaque réponse m'aide à mieux comprendre votre entreprise.", delay: 5000 },
  { text: "Êtes-vous prêt à commencer ?", delay: 6500 },
];

export default function WelcomePage() {
  const router = useRouter();
  const [visibleMessages, setVisibleMessages] = useState<number[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    if (isHydrated && !accessToken) router.push('/auth/login');
  }, [isHydrated, accessToken]);

  useEffect(() => {
    AURA_MESSAGES.forEach((msg, index) => {
      setTimeout(() => setVisibleMessages((prev) => [...prev, index]), msg.delay);
    });
  }, []);

  const handleStart = async () => {
    setIsLoading(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/onboarding/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      });
    } catch { /* continue */ }
    router.push('/onboarding/interview');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0015] via-[#1a0a2e] to-[#0d1b2a]" />
        <div className="absolute top-10 left-10 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-cyan-600/8 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-1/3 left-1/4 w-48 h-48 bg-orange-500/8 rounded-full blur-3xl animate-float-delayed" style={{ animationDelay: '1s' }} />
        {/* Dot pattern overlay */}
        <div className="absolute inset-0 dot-pattern opacity-30" />
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
        className="w-full max-w-2xl relative z-10">

        {/* AURA Avatar */}
        <div className="text-center mb-8">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="w-28 h-28 rounded-3xl gradient-aura flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-violet-500/30 animate-glow-pulse">
            <span className="text-5xl">✦</span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="text-4xl font-black text-white tracking-tight">
            AURA
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="text-white/40 text-sm tracking-[3px] uppercase mt-1">
            African Unified Reasoning Assistant
          </motion.p>
        </div>

        {/* Chat Messages */}
        <div className="glass-strong rounded-3xl p-6 mb-6 min-h-[300px]">
          <AnimatePresence>
            {visibleMessages.map((index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                className="flex gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl gradient-aura flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/20">
                  <span className="text-sm">✦</span>
                </div>
                <div className="glass rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                  <p className="text-white/90 text-sm leading-relaxed">{AURA_MESSAGES[index].text}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {visibleMessages.length < AURA_MESSAGES.length && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-xl gradient-aura flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/20">
                <span className="text-sm">✦</span>
              </div>
              <div className="glass rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Action Buttons */}
        {visibleMessages.length >= AURA_MESSAGES.length && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {!accepted ? (
              <div className="glass-strong rounded-2xl p-6">
                <h3 className="text-white font-bold mb-3 text-lg">Conditions d'utilisation</h3>
                <div className="text-white/60 text-sm space-y-2 mb-5 max-h-40 overflow-y-auto pr-2">
                  <p>1. AURA OS collecte les données de votre entreprise pour créer votre jumeau numérique.</p>
                  <p>2. Vos données sont chiffrées et stockées de manière sécurisée.</p>
                  <p>3. Les agents IA agissent sous votre supervision et validation.</p>
                  <p>4. Vous pouvez exporter vos données à tout moment.</p>
                  <p>5. L'utilisation de la plateforme est soumise aux lois de votre pays.</p>
                </div>
                <Button className="w-full gradient-playland hover:opacity-90 text-white font-semibold shadow-lg shadow-violet-500/25"
                  size="lg" onClick={() => setAccepted(true)}>
                  J'accepte les conditions
                </Button>
              </div>
            ) : (
              <Button className="w-full gradient-aura hover:opacity-90 text-white font-bold text-lg shadow-2xl shadow-violet-500/30 animate-glow-pulse"
                size="xl" isLoading={isLoading} onClick={handleStart}>
                Commencer l'interview →
              </Button>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
