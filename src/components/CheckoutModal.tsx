'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, MapPin, Package } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  salePrice: number;
  itemNumber?: string;
  stock?: number;
  weight: number;
  pickupOnly: boolean;
}

interface CheckoutModalProps {
  isOpen?: boolean;
  onClose: () => void;
  product: Product;
  onSuccess?: () => void | Promise<void>;
}

type DeliveryMethod = 'Postsending' | 'Henting i butikk';

type ShippingResult = {
  shippingPrice: number;
  pickupOnly: boolean;
  deliveryMethod: DeliveryMethod;
  weight: number;
  postalCode: string;
  message: string;
};

function formatPrice(value: number): string {
  return value.toLocaleString('no-NO');
}

export default function CheckoutModal({
  isOpen = true,
  onClose,
  product,
  onSuccess,
}: CheckoutModalProps) {
  const forcedPickup = product.pickupOnly || product.weight > 70;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(
    forcedPickup ? 'Henting i butikk' : 'Postsending'
  );
  const [shippingPrice, setShippingPrice] = useState(0);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingReady, setShippingReady] = useState(forcedPickup);
  const [shippingMessage, setShippingMessage] = useState(
    forcedPickup
      ? 'Produktet må hentes hos Eiksenteret Sortland.'
      : ''
  );
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const totalPrice = useMemo(
    () => product.salePrice + shippingPrice,
    [product.salePrice, shippingPrice]
  );

  useEffect(() => {
    if (forcedPickup) {
      setDeliveryMethod('Henting i butikk');
      setShippingPrice(0);
      setShippingReady(true);
      setShippingMessage(
        'Produktet må hentes hos Eiksenteret Sortland.'
      );
    }
  }, [forcedPickup]);

  useEffect(() => {
    if (deliveryMethod === 'Henting i butikk') {
      setShippingPrice(0);
      setShippingReady(true);
      setShippingLoading(false);
      setShippingMessage(
        'Henting i butikk er kostnadsfritt. Vi gir beskjed når varen er klar.'
      );
      return;
    }

    const normalizedPostalCode = postalCode.replace(/\D/g, '').slice(0, 4);

    if (normalizedPostalCode.length !== 4) {
      setShippingPrice(0);
      setShippingReady(false);
      setShippingMessage('Skriv inn postnummer for å beregne frakt.');
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setShippingLoading(true);
      setShippingReady(false);
      setShippingMessage('Beregner frakt...');

      try {
        const response = await fetch('/api/shipping/calculate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            weight: product.weight,
            pickupOnly: product.pickupOnly,
            postalCode: normalizedPostalCode,
          }),
          signal: controller.signal,
          cache: 'no-store',
        });

        const data = (await response.json()) as
          | ({ success: true } & ShippingResult)
          | { success: false; message?: string };

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Kunne ikke beregne frakt.');
        }

        if (data.pickupOnly) {
          setDeliveryMethod('Henting i butikk');
          setShippingPrice(0);
          setShippingReady(true);
          setShippingMessage(data.message);
          return;
        }

        setShippingPrice(data.shippingPrice);
        setShippingReady(true);
        setShippingMessage(data.message);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setShippingPrice(0);
        setShippingReady(false);
        setShippingMessage(
          error instanceof Error
            ? error.message
            : 'Kunne ikke beregne frakt.'
        );
      } finally {
        setShippingLoading(false);
      }
    }, 400);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [
    deliveryMethod,
    postalCode,
    product.pickupOnly,
    product.weight,
  ]);

  if (!isOpen) return null;

  const handleVippsPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage('');

    const normalizedPostalCode = postalCode.replace(/\D/g, '').slice(0, 4);

    if (normalizedPostalCode.length !== 4) {
      setErrorMessage('Postnummer må bestå av fire sifre.');
      return;
    }

    if (deliveryMethod === 'Postsending' && !shippingReady) {
      setErrorMessage(
        'Frakt må være beregnet før betalingen kan startes.'
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/vipps/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product: {
            ...product,
            shippingPrice,
            totalPrice,
          },
          customer: {
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            address: address.trim(),
            postalCode: normalizedPostalCode,
            city: city.trim(),
            deliveryMethod,
          },
          shipping: {
            price: shippingPrice,
            weight: product.weight,
            deliveryMethod,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Kunne ikke starte betalingen med Vipps.'
        );
      }

      if (onSuccess) {
        await onSuccess();
      }

      if (!data.url) {
        throw new Error('Mottok ingen omdirigeringsadresse fra Vipps.');
      }

      window.location.href = data.url;
    } catch (error) {
      console.error('Feil ved opprettelse av betaling:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Det oppstod en feil. Prøv igjen senere.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label="Lukk kassen"
          className="absolute right-4 top-4 text-xl text-gray-400 hover:text-gray-700 disabled:cursor-not-allowed"
        >
          ×
        </button>

        <h2 className="pr-10 text-2xl font-bold text-gray-900">Kasse</h2>
        <p className="mt-1 text-sm text-gray-600">{product.name}</p>

        <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
          <div className="flex justify-between gap-4 py-1">
            <span className="text-gray-600">Varepris</span>
            <strong>{formatPrice(product.salePrice)} kr</strong>
          </div>
          <div className="flex justify-between gap-4 py-1">
            <span className="text-gray-600">Frakt</span>
            <strong>
              {shippingLoading
                ? 'Beregner...'
                : shippingPrice > 0
                  ? `${formatPrice(shippingPrice)} kr`
                  : '0 kr'}
            </strong>
          </div>
          <div className="mt-2 flex justify-between gap-4 border-t border-gray-300 pt-3 text-lg">
            <span className="font-bold text-gray-900">Totalt</span>
            <strong className="text-red-600">
              {formatPrice(totalPrice)} kr
            </strong>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Oppgitt produktvekt: {product.weight} kg
          </p>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}



        <form onSubmit={handleVippsPayment} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Fullt navn
            </label>
            <input
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-gray-900 shadow-sm"
              placeholder="Ola Nordmann"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              E-post
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-gray-900 shadow-sm"
              placeholder="ola@example.no"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Telefonnummer
            </label>
            <input
              type="tel"
              required
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-gray-900 shadow-sm"
              placeholder="48161242"
            />
          </div>

          <fieldset>
            <legend className="mb-2 block text-sm font-medium text-gray-700">
              Leveringsmåte
            </legend>

            <div className="grid gap-3 sm:grid-cols-2">
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${
                  deliveryMethod === 'Postsending'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200'
                } ${forcedPickup ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="Postsending"
                  checked={deliveryMethod === 'Postsending'}
                  disabled={forcedPickup}
                  onChange={() => setDeliveryMethod('Postsending')}
                />
                <Package className="h-5 w-5 text-red-600" />
                <span className="text-sm font-semibold">Postsending</span>
              </label>

              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${
                  deliveryMethod === 'Henting i butikk'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="Henting i butikk"
                  checked={deliveryMethod === 'Henting i butikk'}
                  onChange={() => setDeliveryMethod('Henting i butikk')}
                />
                <MapPin className="h-5 w-5 text-red-600" />
                <span className="text-sm font-semibold">
                  Henting i butikk
                </span>
              </label>
            </div>
          </fieldset>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Adresse
            </label>
            <input
              type="text"
              required
              autoComplete="street-address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-gray-900 shadow-sm"
              placeholder="Storgata 1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Postnummer
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                autoComplete="postal-code"
                maxLength={4}
                value={postalCode}
                onChange={(event) =>
                  setPostalCode(
                    event.target.value.replace(/\D/g, '').slice(0, 4)
                  )
                }
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-gray-900 shadow-sm"
                placeholder="8400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Poststed
              </label>
              <input
                type="text"
                required
                autoComplete="address-level2"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-gray-900 shadow-sm"
                placeholder="Sortland"
              />
            </div>
          </div>

          {shippingMessage && (
            <div
              className={`rounded-lg border p-3 text-sm ${
                shippingReady
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}
            >
              {shippingMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={
              loading ||
              shippingLoading ||
              (deliveryMethod === 'Postsending' && !shippingReady)
            }
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-[#ff5b24] px-4 py-3 font-bold text-white shadow transition duration-200 hover:bg-[#e04b18] disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
            {loading
              ? 'Behandler...'
              : `Betal ${formatPrice(totalPrice)} kr med Vipps`}
          </button>
        </form>
      </div>
    </div>
  );
}
