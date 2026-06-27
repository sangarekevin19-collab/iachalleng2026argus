'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/auth-store';

const STEPS = [
  { label: 'Analyse des données...', icon: '🔍', duration: 2000 },
  { label: 'Création du jumeau numérique...', icon: '🏢', duration: 2500 },
  { label: 'Génération des agents IA...', icon: '🤖', duration: 3000 },
  { label: 'Configuration de la mémoire...', icon: '🧠', duration: 2000 },
  { label: 'Préparation de votre dashboard...', icon: '📊', duration: 2000 },
  { label: 'Finalisation...', icon: '✨', duration: 1500 },
];

export default function CreatingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let totalTime = 0;
    const timers: NodeJS.Timeout[] = [];

    STEPS.forEach((step, index) => {
      const timer = setTimeout(() => {
        setCurrentStep(index);
        setProgress(((index + 1) / STEPS.length) * 100);
      }, totalTime);
      timers.push(timer);
      totalTime += step.duration;
    });

    const finalTimer = setTimeout(() => {
      router.push('/dashboard');
    }, totalTime + 500);
    timers.push(finalTimer);

    return () => timers.forEach(clearTimeout);
  }, [router]);

  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0015] via-[#1a0a2e] to-[#0d1b2a]" />
        <div className="absolute top-20 left-20 w-72 h-72 bg-violet-600/15 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute inset-0 dot-pattern opacity-20" />
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg text-center relative z-10">

        {/* Circular progress with avatar */}
        <div className="relative w-40 h-40 mx-auto mb-8">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
            <motion.circle cx="60" cy="60" r="54" fill="none" stroke="url(#progressGrad)" strokeWidth="6"
              strokeLinecap="round" strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.5 }} />
            <defs>
              <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="50%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="w-24 h-24 rounded-2xl gradient-aura flex items-center justify-center shadow-2xl shadow-violet-500/30">
              <span className="text-4xl">✦</span>
            </motion.div>
          </div>
        </div>

        <h1 className="text-3xl font-black text-white mb-2">Création en cours</h1>
        <p className="text-white/40 mb-8">AURA construit votre cerveau numérique d'entreprise</p>

        {/* Progress bar */}
        <div className="w-full bg-white/5 rounded-full h-2 mb-8 overflow-hidden">
          <motion.div className="h-full gradient-aura rounded-full" initial={{ width: 0 }}
            animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
        </div>

        {/* Steps */}
        <div className="space-y-2">
          {STEPS.map((step, index) => (
            <motion.div key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: index <= currentStep ? 1 : 0.3, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                index === currentStep ? 'glass border border-violet-500/20 shadow-lg shadow-violet-500/5' :
                index < currentStep ? 'glass' : ''
              }`}>
              <span className="text-xl">{step.icon}</span>
              <span className={`text-sm font-medium ${index <= currentStep ? 'text-white' : 'text-white/20'}`}>
                {step.label}
              </span>
              {index < currentStep && <span className="ml-auto text-emerald-400 text-sm">✓</span>}
              {index === currentStep && (
                <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1, repeat: Infinity }}
                  className="ml-auto w-2 h-2 rounded-full bg-violet-400" />
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
