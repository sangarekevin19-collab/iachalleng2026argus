'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import Link from 'next/link';

// ─── Floating orb component ───
function FloatingOrb({ delay, size, x, y, color }: { delay: number; size: number; x: string; y: string; color: string }) {
  return (
    <motion.div
      className="absolute rounded-full blur-3xl opacity-30 pointer-events-none"
      style={{ width: size, height: size, left: x, top: y, background: color }}
      animate={{
        x: [0, 30, -20, 10, 0],
        y: [0, -25, 15, -10, 0],
        scale: [1, 1.1, 0.95, 1.05, 1],
      }}
      transition={{
        duration: 12 + delay * 2,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
    />
  );
}

// ─── Particle field ───
function ParticleField() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 20 + 15,
    delay: Math.random() * 5,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white/20"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// ─── Glowing border card ───
function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-300, 300], [5, -5]), { stiffness: 100, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [-300, 300], [-5, 5]), { stiffness: 100, damping: 30 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  }, [mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      className={`relative ${className}`}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Glow effect behind card */}
      <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-xl opacity-60" />
      <div className="relative bg-white/[0.07] backdrop-blur-2xl border border-white/[0.12] rounded-3xl shadow-2xl shadow-black/40">
        {children}
      </div>
    </motion.div>
  );
}

// ─── Animated mesh gradient background ───
function MeshBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base dark gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#0a0a1a] to-slate-950" />

      {/* Animated mesh blobs */}
      <FloatingOrb delay={0} size={500} x="10%" y="10%" color="radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)" />
      <FloatingOrb delay={2} size={400} x="60%" y="20%" color="radial-gradient(circle, rgba(168,85,247,0.35) 0%, transparent 70%)" />
      <FloatingOrb delay={4} size={450} x="30%" y="60%" color="radial-gradient(circle, rgba(236,72,153,0.3) 0%, transparent 70%)" />
      <FloatingOrb delay={6} size={350} x="70%" y="70%" color="radial-gradient(circle, rgba(59,130,246,0.35) 0%, transparent 70%)" />
      <FloatingOrb delay={3} size={300} x="80%" y="40%" color="radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)" />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Particles */}
      <ParticleField />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
    </div>
  );
}

// ─── Main Login Page ───
export default function LoginPage() {
  const router = useRouter();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);

  const [phone, setPhone] = useState('');
  const [passcode, setPasscode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'phone' | 'passcode'>('phone');
  const [shakeError, setShakeError] = useState(false);

  const triggerShake = () => {
    setShakeError(true);
    setTimeout(() => setShakeError(false), 600);
  };

  const handlePhoneSubmit = () => {
    if (!phone || phone.length < 8) {
      setError('Numéro de téléphone invalide');
      triggerShake();
      return;
    }
    setError('');
    setStep('passcode');
  };

  const handleLogin = async () => {
    if (!passcode || passcode.length < 4) {
      setError('Code secret invalide');
      triggerShake();
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, passcode }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Identifiants invalides');
      }

      setTokens(data.accessToken, data.refreshToken);
      setUser(data.userId, data.companyId, data.phone);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') action();
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* ─── Animated Background ─── */}
      <MeshBackground />

      {/* ─── Content ─── */}
      <div className="relative z-10 w-full max-w-md px-6">
        {/* ─── Logo & Title ─── */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-10"
        >
          {/* Animated logo */}
          <motion.div
            className="relative w-20 h-20 mx-auto mb-6"
            animate={{ rotateY: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-2xl shadow-purple-500/30" />
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="AURA OS" className="w-14 h-14 object-contain" />
            </div>
            {/* Orbiting dot */}
            <motion.div
              className="absolute w-3 h-3 bg-white rounded-full shadow-lg shadow-white/50"
              style={{ top: -6, left: '50%', marginLeft: -6 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>

          <motion.h1
            className="text-4xl font-bold bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            AURA OS
          </motion.h1>
          <motion.p
            className="text-white/40 mt-2 text-sm tracking-widest uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Intelligence Artificielle pour PME
          </motion.p>
        </motion.div>

        {/* ─── Glass Card ─── */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <GlassCard className="p-8">
            <AnimatePresence mode="wait">
              {step === 'phone' ? (
                <motion.div
                  key="phone"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="text-xl font-semibold text-white mb-1">Connexion</h2>
                  <p className="text-white/40 text-sm mb-6">Entrez votre numéro de téléphone</p>

                  <div className="space-y-4">
                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => { setPhone(e.target.value); setError(''); }}
                        onKeyDown={(e) => handleKeyDown(e, handlePhoneSubmit)}
                        className="relative w-full h-14 px-5 rounded-2xl bg-white/[0.06] border border-white/[0.1] text-white placeholder-white/30 focus:border-indigo-500/50 focus:bg-white/[0.08] outline-none transition-all duration-300 text-lg"
                        placeholder="+226 XX XX XX XX"
                        autoFocus
                      />
                    </div>

                    <Button
                      className="w-full h-14 text-base font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]"
                      onClick={handlePhoneSubmit}
                    >
                      Continuer →
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="passcode"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <button
                    onClick={() => { setStep('phone'); setError(''); }}
                    className="text-white/40 hover:text-white/70 text-sm mb-4 flex items-center gap-1 transition-colors"
                  >
                    ← Retour
                  </button>

                  <h2 className="text-xl font-semibold text-white mb-1">Code secret</h2>
                  <p className="text-white/40 text-sm mb-2">Entrez votre code à 6 chiffres</p>
                  <p className="text-white/25 text-xs mb-6">Numéro : {phone}</p>

                  {/* Passcode dots */}
                  <div className="flex justify-center gap-3 mb-6">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <motion.div
                        key={i}
                        className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                          i < passcode.length
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 border-transparent shadow-lg shadow-indigo-500/30'
                            : 'bg-white/10 border-white/20'
                        }`}
                        animate={i < passcode.length ? { scale: [0.8, 1.2, 1] } : {}}
                        transition={{ duration: 0.2 }}
                      />
                    ))}
                  </div>

                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={passcode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setPasscode(val);
                        setError('');
                        if (val.length === 6) {
                          setTimeout(() => handleLogin(), 200);
                        }
                      }}
                      onKeyDown={(e) => handleKeyDown(e, handleLogin)}
                      className="relative w-full h-14 px-5 rounded-2xl bg-white/[0.06] border border-white/[0.1] text-white text-center text-2xl tracking-[0.5em] font-bold placeholder-white/20 focus:border-indigo-500/50 focus:bg-white/[0.08] outline-none transition-all duration-300"
                      placeholder="• • • • • •"
                      autoFocus
                    />
                  </div>

                  <Button
                    className="w-full h-14 mt-4 text-base font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                    isLoading={isLoading}
                    onClick={handleLogin}
                    disabled={passcode.length < 4}
                  >
                    Se connecter
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ─── Error ─── */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="overflow-hidden"
                >
                  <motion.div
                    animate={shakeError ? { x: [-10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center"
                  >
                    {error}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </motion.div>

        {/* ─── Footer ─── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-8"
        >
          <p className="text-white/30 text-sm">
            Pas encore de compte ?{' '}
            <Link href="/auth/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Créer un compte
            </Link>
          </p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <span className="text-white/15 text-xs">Sécurisé par IA</span>
            <span className="text-white/10">•</span>
            <span className="text-white/15 text-xs">Chiffrement E2E</span>
            <span className="text-white/10">•</span>
            <span className="text-white/15 text-xs">Hébergement local</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
