'use client';

import React, { useState } from 'react';
import { Product } from '@/lib/monday';
import { X, MapPin, Truck, Smartphone, AlertCircle, Loader2 } from 'lucide-react';

interface CheckoutModalProps {
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CheckoutModal({ product, onClose }: CheckoutModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'Henting i butikk' | 'Postpakke'>(
    'Henting i butikk'
  );

  const handleStartVippsPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      // 1. Lagre midlertidig kundedata i localStorage før omdirigering til Vipps
      const pendingOrder = {
        product,
        customer: { name, phone, email, deliveryMethod },
      };
      localStorage.setItem('eik_pending_order', JSON.stringify(pendingOrder));

      // 2. Opprett betalingsøkt hos Vipps via backend-endepunktet
      const res = await fetch('/api/vipps/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product,
          customer: { name, phone, email, deliveryMethod },
        }),
      });

      const data = await res.json();

      if (data.success && data.url) {
        // Send kunden direkte til Vipps sin betalingsportal
        window.location.href = data.url;
      } else {
        setErrorMessage(data.message || 'Kunne ikke starte Vipps betaling. Vennligst prøv igjen.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Feil ved Vipps-oppstart:', err);
      setErrorMessage('Tilkoblingsfeil mot betalingstjenesten.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden relative border border-gray-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-[#ff5b24] text-white p-2.5 rounded-xl shadow-sm">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Kjøp med Vipps</h3>
              <p className="text-xs text-gray-500">Eiksenteret Sortland (Org.nr 936 858 031)</p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 flex gap-4 items-center">
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-16 h-16 object-contain rounded-lg bg-white p-1 border"
            />
            <div>
              <h4 className="font-bold text-gray-900 text-sm">{product.name}</h4>
              <p className="text-xs text-gray-500">Varenr: {product.itemNumber}</p>
              <p className="text-lg font-extrabold text-red-600 mt-1">
                {product.salePrice.toLocaleString('no-NO')} kr
              </p>
            </div>
          </div>

          <form onSubmit={handleStartVippsPayment} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Fullt Navn
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ola Nordmann"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 outline-none text-sm text-gray-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Telefon (Vipps)
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="900 00 000"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 outline-none text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  E-post (kvittering)
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ola@example.no"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 outline-none text-sm text-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                Leveringsmetode
              </label>
              <div className="grid grid-cols-1 gap-2">
                <label
                  className={`p-3 border rounded-xl flex items-center gap-3 cursor-pointer transition-all ${
                    deliveryMethod === 'Henting i butikk'
                      ? 'border-red-600 bg-red-50/50 text-red-900'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="delivery"
                    checked={deliveryMethod === 'Henting i butikk'}
                    onChange={() => setDeliveryMethod('Henting i butikk')}
                    className="accent-red-600"
                  />
                  <MapPin className="w-5 h-5 text-red-600" />
                  <div className="text-xs">
                    <div className="font-bold">Hentes i butikk (Gratis)</div>
                    <div className="text-gray-500">Verkstedveien 2, 8402 Sortland</div>
                  </div>
                </label>

                {!product.pickupOnly && (
                  <label
                    className={`p-3 border rounded-xl flex items-center gap-3 cursor-pointer transition-all ${
                      deliveryMethod === 'Postpakke'
                        ? 'border-red-600 bg-red-50/50 text-red-900'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="delivery"
                      checked={deliveryMethod === 'Postpakke'}
                      onChange={() => setDeliveryMethod('Postpakke')}
                      className="accent-red-600"
                    />
                    <Truck className="w-5 h-5 text-blue-600" />
                    <div className="text-xs">
                      <div className="font-bold">Sendes som Postpakke</div>
                      <div className="text-gray-500">Beregnes / klargjøres av butikk</div>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs">
                {errorMessage}
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Forbehold:</strong> Vi tar forbehold om skrive- og trykkfeil i pris og spesifikasjoner, samt endringer i lagerbeholdning (mellomdagssalg). Ved avvik vil vi kontakte deg omgående.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ff5b24] hover:bg-[#e04b19] text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-base mt-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Kobler til Vipps...
                </>
              ) : (
                'Betal med Vipps nå'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}