'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';

const AFRICAN_COUNTRIES = [
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', dial: '+226' },
  { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮', dial: '+225' },
  { code: 'SN', name: 'Sénégal', flag: '🇸🇳', dial: '+221' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱', dial: '+223' },
  { code: 'NE', name: 'Niger', flag: '🇳🇪', dial: '+227' },
  { code: 'BJ', name: 'Bénin', flag: '🇧🇯', dial: '+229' },
  { code: 'TG', name: 'Togo', flag: '🇹🇬', dial: '+228' },
  { code: 'CM', name: 'Cameroun', flag: '🇨🇲', dial: '+237' },
  { code: 'GA', name: 'Gabon', flag: '🇬🇦', dial: '+241' },
  { code: 'CD', name: 'RDC', flag: '🇨🇩', dial: '+243' },
  { code: 'CG', name: 'Congo', flag: '🇨🇬', dial: '+242' },
  { code: 'TD', name: 'Tchad', flag: '🇹🇩', dial: '+235' },
  { code: 'CF', name: 'Centrafrique', flag: '🇨🇫', dial: '+236' },
  { code: 'GN', name: 'Guinée', flag: '🇬🇳', dial: '+224' },
  { code: 'MG', name: 'Madagascar', flag: '🇲🇬', dial: '+261' },
  { code: 'MA', name: 'Maroc', flag: '🇲🇦', dial: '+212' },
  { code: 'TN', name: 'Tunisie', flag: '🇹🇳', dial: '+216' },
  { code: 'DZ', name: 'Algérie', flag: '🇩🇿', dial: '+213' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', dial: '+234' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', dial: '+233' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', dial: '+254' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼', dial: '+250' },
  { code: 'ET', name: 'Éthiopie', flag: '🇪🇹', dial: '+251' },
  { code: 'ZA', name: 'Afrique du Sud', flag: '🇿🇦', dial: '+27' },
];

export default function RegisterPage() {
  const router = useRouter();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(AFRICAN_COUNTRIES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    city: '',
    companyName: '',
    whatsapp: '',
    preferredOtpChannel: 'sms' as 'sms' | 'email' | 'whatsapp',
  });

  const updateForm = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleRegister = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          countryCode: selectedCountry.code,
          phone: form.phone.startsWith('+') ? form.phone : `${selectedCountry.dial}${form.phone}`,
          whatsapp: form.whatsapp ? (form.whatsapp.startsWith('+') ? form.whatsapp : `${selectedCountry.dial}${form.whatsapp}`) : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de l\'inscription');
      }

      const fullPhone = form.phone.startsWith('+') ? form.phone : selectedCountry.dial + form.phone;
      const verifyParams = new URLSearchParams({
        phone: fullPhone,
        channel: form.preferredOtpChannel || (form.email ? 'email' : 'sms'),
      });
      if (form.email && (form.preferredOtpChannel === 'email' || !form.preferredOtpChannel)) {
        verifyParams.set('email', form.email);
      }
      router.push(`/auth/verify?${verifyParams.toString()}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-aura relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                <span className="text-3xl">🧠</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold">AURA OS</h1>
                <p className="text-white/70 text-sm">African Unified Reasoning Assistant</p>
              </div>
            </div>

            <h2 className="text-4xl font-bold leading-tight mb-6">
              Le cerveau numérique<br />de votre entreprise
            </h2>
            <p className="text-lg text-white/80 mb-8 max-w-md">
              Le premier système d'exploitation intelligent conçu pour les PME africaines.
              L'IA qui comprend, gère et développe votre entreprise.
            </p>

            <div className="space-y-4">
              {[
                '🤖 Agents IA autonomes',
                '📊 Dashboard intelligent',
                '💰 POS ultra-simple',
                '📱 Intégration WhatsApp',
                '📈 Rapports automatiques',
              ].map((feature, i) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3 text-white/90"
                >
                  <span className="text-lg">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -top-10 -left-10 w-60 h-60 rounded-full bg-white/5" />
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 rounded-xl gradient-aura flex items-center justify-center">
              <span className="text-2xl">🧠</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gradient">AURA OS</h1>
              <p className="text-xs text-gray-500">Votre cerveau numérique</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Créer votre compte</h2>
              <p className="text-gray-500 mt-1">Commencez avec votre entreprise en quelques minutes</p>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-2 mb-8">
              {[1, 2].map((s) => (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                      step >= s
                        ? 'gradient-aura text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {s}
                  </div>
                  <span className={`text-sm ${step >= s ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                    {s === 1 ? 'Vous' : 'Entreprise'}
                  </span>
                  {s < 2 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-primary' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                    <input
                      type="text"
                      value={form.firstName}
                      onChange={(e) => updateForm('firstName', e.target.value)}
                      className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      placeholder="Amadou"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                    <input
                      type="text"
                      value={form.lastName}
                      onChange={(e) => updateForm('lastName', e.target.value)}
                      className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      placeholder="Diallo"
                    />
                  </div>
                </div>

                {/* Country Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
                  <button
                    type="button"
                    onClick={() => setShowCountryPicker(!showCountryPicker)}
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 flex items-center justify-between hover:border-primary/50 transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-xl">{selectedCountry.flag}</span>
                      <span className="text-gray-900">{selectedCountry.name}</span>
                    </span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showCountryPicker && (
                    <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                      {AFRICAN_COUNTRIES.map((country) => (
                        <button
                          key={country.code}
                          type="button"
                          onClick={() => {
                            setSelectedCountry(country);
                            setShowCountryPicker(false);
                          }}
                          className={`w-full px-4 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors ${
                            selectedCountry.code === country.code ? 'bg-primary/5 text-primary' : ''
                          }`}
                        >
                          <span className="text-lg">{country.flag}</span>
                          <span className="text-sm">{country.name}</span>
                          <span className="text-xs text-gray-400 ml-auto">{country.dial}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <div className="flex gap-2">
                    <div className="h-12 px-3 rounded-xl border border-gray-200 bg-gray-50 flex items-center text-sm text-gray-600 font-medium">
                      {selectedCountry.dial}
                    </div>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => updateForm('phone', e.target.value)}
                      className="flex-1 h-12 px-4 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      placeholder="XX XX XX XX"
                    />
                  </div>
                </div>

                {/* Email (optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-gray-400 font-normal">(optionnel)</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateForm('email', e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="amadou@example.com"
                  />
                </div>

                {/* WhatsApp (optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    WhatsApp <span className="text-gray-400 font-normal">(optionnel)</span>
                  </label>
                  <input
                    type="tel"
                    value={form.whatsapp}
                    onChange={(e) => updateForm('whatsapp', e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="XX XX XX XX"
                  />
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => {
                    if (!form.firstName || !form.lastName || !form.phone) {
                      setError('Veuillez remplir tous les champs obligatoires');
                      return;
                    }
                    setStep(2);
                  }}
                >
                  Continuer
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'entreprise</label>
                  <input
                    type="text"
                    value={form.companyName}
                    onChange={(e) => updateForm('companyName', e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="Diallo Quincaillerie"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => updateForm('city', e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="Bobo-Dioulasso"
                  />
                </div>

                {/* OTP Channel */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comment recevoir votre code de vérification ?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'sms', label: 'SMS', icon: '📱' },
                      { value: 'email', label: 'Email', icon: '📧' },
                      { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
                    ].map((channel) => (
                      <button
                        key={channel.value}
                        type="button"
                        onClick={() => updateForm('preferredOtpChannel', channel.value)}
                        className={`p-3 rounded-xl border-2 transition-all text-center ${
                          form.preferredOtpChannel === channel.value
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-xl block mb-1">{channel.icon}</span>
                        <span className="text-xs font-medium">{channel.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={() => setStep(1)}>
                    Retour
                  </Button>
                  <Button
                    className="flex-1"
                    size="lg"
                    isLoading={isLoading}
                    onClick={handleRegister}
                  >
                    Créer mon compte
                  </Button>
                </div>
              </motion.div>
            )}

            <p className="text-center text-sm text-gray-500 mt-6">
              Déjà un compte ?{' '}
              <Link href="/auth/login" className="text-primary font-semibold hover:underline">
                Se connecter
              </Link>
            </p>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            En continuant, vous acceptez les{' '}
            <Link href="/terms" className="underline">conditions d'utilisation</Link>
            {' '}et la{' '}
            <Link href="/privacy" className="underline">politique de confidentialité</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
