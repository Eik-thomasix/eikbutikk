'use client';

import { CheckCircle, Home } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function OrderConfirmedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [secondsRemaining, setSecondsRemaining] = useState(8);

  const orderNumber =
    searchParams.get('ordrenr') || 'Ordrenummer ikke tilgjengelig';

  useEffect(() => {
    const countdown = window.setInterval(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    const redirect = window.setTimeout(() => {
      router.replace('/');
    }, 8000);

    return () => {
      window.clearInterval(countdown);
      window.clearTimeout(redirect);
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 flex items-center justify-center">
      <section className="w-full max-w-xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
        <div className="h-2 bg-red-600" />

        <div className="p-7 text-center sm:p-10">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-12 w-12 text-green-600" aria-hidden="true" />
          </div>

          <p className="mb-2 text-sm font-bold uppercase tracking-widest text-red-600">
            Eikbutikk.no
          </p>

          <h1 className="mb-4 text-3xl font-extrabold text-gray-900">
            Takk for handelen!
          </h1>

          <p className="mx-auto mb-3 max-w-md text-gray-700">
            Betalingen er godkjent, og bestillingen er registrert hos
            Eiksenteret Sortland.
          </p>

          <p className="mx-auto mb-7 max-w-md text-sm leading-relaxed text-gray-500">
            Bestillingen blir behandlet manuelt. Du blir kontaktet dersom vi
            trenger flere opplysninger om henting eller levering.
          </p>

          <div className="mb-7 rounded-xl border border-gray-200 bg-gray-50 p-5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Ordrenummer
            </p>
            <p className="break-all text-xl font-extrabold text-red-600">
              {orderNumber}
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.replace('/')}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3.5 font-bold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
          >
            <Home className="h-5 w-5" aria-hidden="true" />
            Tilbake til forsiden
          </button>

          <p className="mt-5 text-xs text-gray-400" aria-live="polite">
            Du sendes automatisk til forsiden om {secondsRemaining} sekunder.
          </p>
        </div>
      </section>
    </main>
  );
}

export default function OrderConfirmedPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-sm text-gray-500">Laster ordrebekreftelse...</p>
        </main>
      }
    >
      <OrderConfirmedContent />
    </Suspense>
  );
}
