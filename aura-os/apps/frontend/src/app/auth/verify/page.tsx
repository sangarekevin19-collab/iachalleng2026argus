'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import Link from 'next/link';

export default function VerifyOtpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';
  const email = searchParams.get('email') || '';
  const channel = searchParams.get('channel') || 'sms';
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newCode.every((d) => d) && value) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (otpCode?: string) => {
    const fullCode = otpCode || code.join('');
    if (fullCode.length !== 6) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: fullCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Code invalide');
      }

      setTokens(data.accessToken, data.refreshToken);
      setUser(data.userId, data.companyId, data.phone);
      router.push('/onboarding/passcode');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Code invalide ou expiré');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setCountdown(60);
    setError('');
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
    } catch {
      // Silent fail
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl gradient-aura flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {channel === 'email' ? 'Vérifiez votre email' : 'Vérifiez votre numéro'}
          </h1>
          <p className="text-gray-500 mt-2">
            Entrez le code envoyé {channel === 'email' ? 'à' : 'au'}{' '}
            <span className="font-semibold text-gray-700">
              {channel === 'email' && email ? email : phone}
            </span>
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm text-center">
              {error}
            </div>
          )}

          <div className="flex justify-center gap-3 mb-6">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all ${
                  digit
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20'
                }`}
                autoFocus={index === 0}
              />
            ))}
          </div>

          <Button
            className="w-full"
            size="lg"
            isLoading={isLoading}
            onClick={() => handleVerify()}
            disabled={code.some((d) => !d)}
          >
            Vérifier
          </Button>

          <div className="mt-6 text-center">
            {countdown > 0 ? (
              <p className="text-sm text-gray-500">
                Renvoyer le code dans <span className="font-semibold">{countdown}s</span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                className="text-sm text-primary font-semibold hover:underline"
              >
                Renvoyer le code
              </button>
            )}
          </div>

          <p className="text-center text-sm text-gray-500 mt-4">
            <Link href="/auth/register" className="text-primary font-semibold hover:underline">
              Changer de numéro
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
