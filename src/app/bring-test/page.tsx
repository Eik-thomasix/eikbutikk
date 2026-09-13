'use client';

import { FormEvent, useState } from 'react';

type ApiResult = {
  success?: boolean;
  message?: string;
  orderId?: string;
  mondayItemId?: string;
  trackingNumber?: string;
  date?: string;
  pdf?: string;
  testMode?: boolean;
  mondayUpdated?: boolean;
  trackingUrl?: string;
  labelUrl?: string;
  details?: unknown;
};

export default function BringTestPage() {
  const [orderId, setOrderId] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [loading, setLoading] = useState<'bring' | 'monday' | null>(null);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [error, setError] = useState('');

  async function callApi(url: string, headers: HeadersInit = {}) {
    setResult(null);
    setError('');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ orderId: orderId.trim() }),
    });
    const data = (await response.json()) as ApiResult;
    setResult(data);
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Testen kunne ikke gjennomføres.');
    }
  }

  async function runBringTest(event: FormEvent) {
    event.preventDefault();
    setLoading('bring');
    try {
      await callApi('/api/bring/create-shipment', {
        'x-admin-secret': adminSecret,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Ukjent feil.');
    } finally {
      setLoading(null);
    }
  }

  async function runMondayTest() {
    setLoading('monday');
    try {
      await callApi('/api/monday/test-update');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Ukjent feil.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-lg sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-600">
          Eikbutikk.no
        </p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900">
          Bring og Monday-test
        </h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          Bruk en betalt ordre med Postsending. Bring-testen oppretter en
          testsending. Monday-testen skriver testverdier i tre fraktkolonner.
        </p>

        <form onSubmit={runBringTest} className="mt-6 space-y-5">
          <div>
            <label htmlFor="orderId" className="block text-sm font-semibold text-gray-800">
              Ordrenummer
            </label>
            <input
              id="orderId"
              required
              value={orderId}
              onChange={(event) => setOrderId(event.target.value)}
              placeholder="EIK-07014172"
              className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
          </div>

          <div>
            <label htmlFor="adminSecret" className="block text-sm font-semibold text-gray-800">
              Bring admin-hemmelighet
            </label>
            <input
              id="adminSecret"
              type="password"
              value={adminSecret}
              onChange={(event) => setAdminSecret(event.target.value)}
              placeholder="Verdien fra BRING_ADMIN_SECRET"
              className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="submit"
              disabled={loading !== null || !orderId.trim() || !adminSecret}
              className="rounded-lg bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {loading === 'bring' ? 'Kjører Bring-test...' : 'Kjør Bring-test'}
            </button>

            <button
              type="button"
              onClick={runMondayTest}
              disabled={loading !== null || !orderId.trim()}
              className="rounded-lg bg-neutral-900 px-5 py-3 font-bold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {loading === 'monday'
                ? 'Oppdaterer Monday...'
                : 'Test Monday-oppdatering'}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <strong>Testen feilet:</strong> {error}
          </div>
        )}

        {result?.success && (
          <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
            <strong>Test fullført.</strong> {result.message}
          </div>
        )}

        {result && (
          <section className="mt-6">
            <h2 className="text-base font-bold text-gray-900">Teknisk svar</h2>
            <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-neutral-900 p-4 text-xs text-green-300">
              {JSON.stringify(result, null, 2)}
            </pre>

            <div className="mt-4 flex flex-wrap gap-3">
              {result.labelUrl && (
                <a href={result.labelUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white">
                  Åpne Bring-etikett
                </a>
              )}
              {result.trackingUrl && (
                <a href={result.trackingUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold text-gray-800">
                  Åpne sporing
                </a>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
