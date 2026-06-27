'use client';

import { useEffect } from 'react';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Auth error boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🔐</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Erreur d&apos;authentification</h2>
        <p className="text-gray-500 mb-6">
          Un problème est survenu lors de l&apos;authentification. Veuillez réessayer.
        </p>
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:brightness-110 transition-all"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
