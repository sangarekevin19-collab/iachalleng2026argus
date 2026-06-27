'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';

export default function PasscodePage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    if (isHydrated && !accessToken) {
      router.push('/auth/login');
    }
  }, [isHydrated, accessToken]);
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleDigit = (digit: string) => {
    if (step === 'create') {
      if (passcode.length < 6) {
        setPasscode((prev) => prev + digit);
        setError('');
      }
    } else {
      if (confirmPasscode.length < 6) {
        setConfirmPasscode((prev) => prev + digit);
        setError('');
      }
    }
  };

  const handleDelete = () => {
    if (step === 'create') {
      setPasscode((prev) => prev.slice(0, -1));
    } else {
      setConfirmPasscode((prev) => prev.slice(0, -1));
    }
    setError('');
  };

  const handleNext = () => {
    if (passcode.length !== 6) {
      setError('Le code doit contenir 6 chiffres');
      return;
    }
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (confirmPasscode !== passcode) {
      setError('Les codes ne correspondent pas');
      setConfirmPasscode('');
      return;
    }

    setIsLoading(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/set-passcode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ passcode }),
      });
    } catch {
      // Continue
    }

    router.push('/onboarding/welcome');
  };

  const currentCode = step === 'create' ? passcode : confirmPasscode;

  return (
    <div className="min-h-screen gradient-aura flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white/5 animate-pulse-slow" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm text-center relative z-10"
      >
        <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-lg border border-white/30 flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">🔐</span>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">
          {step === 'create' ? 'Créez votre code secret' : 'Confirmez votre code'}
        </h1>
        <p className="text-white/60 mb-8">
          {step === 'create'
            ? 'Ce code vous permettra de vous connecter rapidement'
            : 'Entrez le même code pour confirmer'}
        </p>

        {/* Dots */}
        <div className="flex justify-center gap-4 mb-8">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full transition-all ${
                i < currentCode.length
                  ? 'bg-white scale-110'
                  : 'bg-white/20 border-2 border-white/30'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-red-300 text-sm mb-4">{error}</p>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key) => (
            <button
              key={key || 'empty'}
              onClick={() => {
                if (key === 'del') handleDelete();
                else if (key) handleDigit(key);
              }}
              disabled={!key}
              className={`h-16 rounded-2xl text-2xl font-semibold transition-all ${
                key === 'del'
                  ? 'bg-white/10 text-white/60 hover:bg-white/20'
                  : key
                  ? 'bg-white/15 text-white hover:bg-white/25 active:scale-95'
                  : 'invisible'
              }`}
            >
              {key === 'del' ? '⌫' : key}
            </button>
          ))}
        </div>

        {step === 'create' ? (
          <Button
            className="w-full mt-6 bg-white text-primary hover:bg-white/90"
            size="lg"
            onClick={handleNext}
            disabled={passcode.length !== 6}
          >
            Continuer
          </Button>
        ) : (
          <Button
            className="w-full mt-6 bg-white text-primary hover:bg-white/90"
            size="lg"
            onClick={handleConfirm}
            isLoading={isLoading}
            disabled={confirmPasscode.length !== 6}
          >
            Confirmer
          </Button>
        )}

        {step === 'confirm' && (
          <button
            onClick={() => { setStep('create'); setPasscode(''); setConfirmPasscode(''); }}
            className="text-white/60 text-sm mt-4 hover:text-white"
          >
            Recommencer
          </button>
        )}
      </motion.div>
    </div>
  );
}
