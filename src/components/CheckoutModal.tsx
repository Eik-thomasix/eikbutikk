'use client';

import React, { useState } from 'react';

interface Product {
  id: string;
  name: string;
  salePrice: number;
}

interface CheckoutModalProps {
  isOpen?: boolean;
  onClose: () => void;
  product: Product;
  onSuccess?: () => void;
}

export default function CheckoutModal({ 
  isOpen = true, 
  onClose, 
  product, 
  onSuccess 
}: CheckoutModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleVippsPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/vipps/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product,
          customer: {
            name,
            email,
            phone,
            address,
            postalCode,
            city,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Kunne ikke starte betalingen med Vipps.');
      }

      if (onSuccess) {
        await onSuccess();
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Mottok ingen omdirigerings-URL fra Vipps.');
      }
    } catch (err: any) {
      console.error('❌ Feil ved opprettelse av betaling:', err);
      setErrorMessage(err.message || 'Det oppstod en feil. Prøv igjen senere.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold mb-4 text-gray-800">Kasse - {product.name}</h2>
        <p className="text-gray-600 mb-6">Totalpris: <strong>{product.salePrice} kr</strong></p>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleVippsPayment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Fullt navn</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-gray-900"
              placeholder="Ola Nordmann"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">E-post</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-gray-900"
              placeholder="ola@example.no"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Telefonnummer</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-gray-900"
              placeholder="48161242"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Adresse</label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-gray-900"
              placeholder="Storgata 1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Postnummer</label>
              <input
                type="text"
                required
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-gray-900"
                placeholder="8400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Poststed</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-gray-900"
                placeholder="Sortland"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-[#ff5b24] hover:bg-[#e04b18] text-white font-bold py-3 px-4 rounded-md shadow transition duration-200 flex items-center justify-center gap-2"
          >
            {loading ? 'Behandler...' : 'Betal med Vipps nå'}
          </button>
        </form>
      </div>
    </div>
  );
}