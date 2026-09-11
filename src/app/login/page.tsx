'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ShieldAlert } from 'lucide-react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (data.success) {
        // Tvinger en hard omdirigering slik at cookien registreres umiddelbart av middleware
        window.location.href = '/';
      } else {
        setError('Feil passord. Vennligst prøv igjen.');
      }
    } catch (err) {
      setError('Det oppstod en feil ved tilkobling.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
        <div className="bg-neutral-950 p-8 text-white text-center border-b border-neutral-800">
          <img src="/EIKLOGO.png" alt="Eiksenteret" className="h-12 mx-auto mb-3 object-contain" />
          <h1 className="text-xl font-bold">Eikbutikk.no</h1>
          <p className="text-gray-400 text-xs mt-1">Eiksenteret Sortland - Intern Portefølje</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Passord for tilgang
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Skriv inn passord..."
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none transition-all text-gray-900 text-sm"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs flex items-center gap-2 border border-red-200">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
          >
            {loading ? 'Sjekker passord...' : 'Lås opp plattformen'}
          </button>
        </form>

        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 text-center text-xs text-gray-500">
          Verkstedveien 2, 8402 Sortland | Org.nr: 936 858 031
        </div>
      </div>
    </div>
  );
}