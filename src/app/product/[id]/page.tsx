'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ShoppingBag,
  ArrowLeft,
  MapPin,
  Award,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Truck,
  CheckCircle2,
} from 'lucide-react';
import { Product } from '@/lib/monday';
import CheckoutModal from '@/components/CheckoutModal';

function getLocalDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const completionStarted = useRef(false);
  const productViewStarted = useRef(false);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [completingPayment, setCompletingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const rawProductId = params?.id;
  const productId = Array.isArray(rawProductId)
    ? rawProductId[0]
    : rawProductId;
  const vippsOrder = searchParams.get('vipps_order') || '';

  useEffect(() => {
    async function loadProduct() {
      try {
        const response = await fetch('/api/products', {
          cache: 'no-store',
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.message || 'Kunne ikke hente produktet.'
          );
        }

        const found = (data.products || []).find(
          (candidate: Product) => candidate.id === productId
        );

        if (found) {
          setProduct(found);
          const initialImage =
            found.images && found.images.length > 0
              ? found.images[0]
              : '/honda.png';
          setSelectedImage(initialImage);
        }
      } catch (error) {
        console.error('Feil ved henting av produkt:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [productId]);

  useEffect(() => {
    if (!productId || productViewStarted.current) {
      return;
    }

    const storageKey =
      `eikbutikk:product-view:${productId}:${getLocalDateKey()}`;

    try {
      if (window.localStorage.getItem(storageKey)) {
        return;
      }
    } catch (error) {
      console.warn('Kunne ikke lese visningsstatus lokalt:', error);
    }

    productViewStarted.current = true;

    async function registerProductView() {
      try {
        const response = await fetch('/api/products/view', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId,
            type: 'product',
          }),
          keepalive: true,
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data?.message || 'Kunne ikke registrere produktvisning.'
          );
        }

        try {
          window.localStorage.setItem(storageKey, 'registered');
        } catch (error) {
          console.warn('Kunne ikke lagre visningsstatus lokalt:', error);
        }
      } catch (error) {
        productViewStarted.current = false;
        console.error(
          `Kunne ikke registrere produktvisning for ${productId}:`,
          error
        );
      }
    }

    void registerProductView();
  }, [productId]);

  useEffect(() => {
    if (!vippsOrder || completionStarted.current) {
      return;
    }

    completionStarted.current = true;
    setCompletingPayment(true);
    setPaymentError('');

    async function completePayment() {
      try {
        const response = await fetch(
          '/api/vipps/complete-payment',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              reference: vippsOrder,
            }),
            cache: 'no-store',
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data?.message ||
              'Betalingen kunne ikke ferdigbehandles.'
          );
        }

        const redirectUrl =
          data.redirect ||
          `/ordre-bekreftet?ordrenr=${encodeURIComponent(
            vippsOrder
          )}`;

        router.replace(redirectUrl);
      } catch (error) {
        console.error(
          'Feil ved ferdigbehandling av betaling:',
          error
        );

        setPaymentError(
          error instanceof Error
            ? error.message
            : 'Det oppstod en feil ved kontroll av betalingen.'
        );
        setCompletingPayment(false);
      }
    }

    void completePayment();
  }, [router, vippsOrder]);

  const retryPaymentCompletion = () => {
    completionStarted.current = false;
    setPaymentError('');
    setCompletingPayment(false);

    window.setTimeout(() => {
      window.location.reload();
    }, 50);
  };

  if (completingPayment) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-red-600 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Kontrollerer betalingen
        </h1>
        <p className="max-w-md text-sm text-gray-600">
          Vi bekrefter betalingen hos Vipps og registrerer ordren.
          Ikke lukk denne siden.
        </p>
      </div>
    );
  }

  if (paymentError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-lg">
          <AlertCircle className="mx-auto mb-4 h-14 w-14 text-red-600" />
          <h1 className="mb-3 text-2xl font-bold text-gray-900">
            Vi kunne ikke ferdigbehandle ordren
          </h1>
          <p className="mb-2 text-sm text-gray-600">
            {paymentError}
          </p>
          <p className="mb-6 text-xs text-gray-500">
            Ikke gjennomfør en ny betaling før statusen er kontrollert.
            Ordrenummer: {vippsOrder}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={retryPaymentCompletion}
              className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700"
            >
              Prøv kontrollen på nytt
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="rounded-xl border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Til forsiden
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-600 mb-2" />
        <p className="text-sm text-gray-500">
          Laster produktdetaljer...
        </p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Produktet ble ikke funnet
        </h2>
        <button
          onClick={() => router.push('/')}
          className="bg-neutral-900 text-white px-4 py-2 rounded-lg text-sm font-semibold"
        >
          Tilbake til nettbutikken
        </button>
      </div>
    );
  }

  const productImages =
    product.images && product.images.length > 0
      ? product.images
      : ['/honda.png'];

  const discount =
    product.listPrice > product.salePrice
      ? Math.round(
          ((product.listPrice - product.salePrice) /
            product.listPrice) *
            100
        )
      : 0;
  const savings = Math.max(
    0,
    product.listPrice - product.salePrice
  );
  const isOutOfStock = product.stock <= 0;
  const compactDescriptionHtml = product.descriptionHtml
    .replace(/<p(?:\s[^>]*)?>(?:\s|&nbsp;|<br\s*\/?\s*>)*<\/p>/gi, '')
    .replace(/(?:<br\s*\/?\s*>\s*){2,}/gi, '<br />')
    .replace(/(?:&nbsp;\s*){2,}/gi, ' ');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-red-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Tilbake til alle tilbud
          </button>

          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => router.push('/')}
          >
            <img
              src="/EIKLOGO.png"
              alt="Eiksenteret Logo"
              className="h-9 object-contain"
            />
            <span className="font-bold text-gray-900 text-base hidden sm:inline">
              Eikbutikk.no
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 flex-grow w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="w-full h-96 md:h-[480px] bg-gray-50 rounded-xl overflow-hidden relative border border-gray-100 p-4 flex items-center justify-center">
              <img
                src={selectedImage || productImages[0]}
                alt={product.name}
                className="max-h-full max-w-full object-contain transition-all duration-300"
                onError={(event) => {
                  event.currentTarget.src = '/honda.png';
                }}
              />

              {discount > 0 && (
                <span className="absolute top-4 left-4 bg-red-600 text-white font-extrabold text-sm px-3 py-1 rounded-md shadow">
                  SPAR {discount} %
                </span>
              )}
            </div>

            {productImages.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {productImages.map((imgUrl, index) => (
                  <button
                    key={`${imgUrl}-${index}`}
                    onClick={() => setSelectedImage(imgUrl)}
                    className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 p-1 bg-gray-50 flex items-center justify-center ${
                      selectedImage === imgUrl
                        ? 'border-red-600 scale-105 shadow'
                        : 'border-gray-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`Bilde ${index + 1}`}
                      className="max-h-full max-w-full object-contain"
                      onError={(event) => {
                        event.currentTarget.src = '/honda.png';
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold text-gray-400 mb-2">
                Varenr: {product.itemNumber} | Kategori:{' '}
                {product.category}
              </div>

              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3">
                {product.name}
              </h1>

              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                {product.shortInfo}
              </p>

              {product.pickupOnly ? (
                <div className="mb-6 text-xs bg-amber-50 text-amber-800 p-3 rounded-xl border border-amber-200 font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <div>
                    <span className="font-bold block">
                      Kun henting i butikk
                    </span>
                    <span>Verkstedveien 2, 8402 Sortland</span>
                  </div>
                </div>
              ) : (
                <div className="mb-6 text-xs bg-blue-50 text-blue-800 p-3 rounded-xl border border-blue-200 font-medium flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <div>
                    <span className="font-bold block">
                      Henting eller Postpakke
                    </span>
                    <span>
                      Kan sendes per post eller hentes i butikken.
                    </span>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 mb-5">
                <div className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wide">
                  Tilbudspris på nett
                </div>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-3xl md:text-4xl font-extrabold text-red-600">
                    {product.salePrice.toLocaleString('no-NO')} kr
                  </span>
                  {product.listPrice > product.salePrice && (
                    <span className="text-base text-gray-400 line-through">
                      {product.listPrice.toLocaleString('no-NO')} kr
                    </span>
                  )}
                </div>
                {savings > 0 && (
                  <div className="mt-2 inline-flex rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700">
                    Du sparer {savings.toLocaleString('no-NO')} kr
                  </div>
                )}
              </div>

              <div className="mb-5 grid gap-2 text-sm text-gray-700 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                  <ShieldCheck className="h-4 w-4 flex-shrink-0 text-green-700" />
                  <span className="font-semibold">Trygg betaling med Vipps</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                  <Truck className="h-4 w-4 flex-shrink-0 text-blue-700" />
                  <span className="font-semibold">
                    {product.pickupOnly
                      ? 'Hentes på Sortland'
                      : 'Frakt beregnes i kassen'}
                  </span>
                </div>
                <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                  isOutOfStock
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-green-200 bg-green-50 text-green-700'
                }`}>
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  <span className="font-semibold">
                    {isOutOfStock
                      ? 'Utsolgt'
                      : `${product.stock} stk på lager`}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowCheckout(true)}
              disabled={product.stock <= 0}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-lg shadow-md hover:shadow-lg"
            >
              <ShoppingBag className="w-5 h-5" />
              {product.stock > 0
                ? 'Kjøp med Vipps nå'
                : 'Utsolgt'}
            </button>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-2xl p-6 md:p-8 border border-gray-200 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-100 pb-3">
            Produktinformasjon & Spesifikasjoner
          </h3>

          <div
            className="product-description max-w-none text-sm text-gray-700"
            dangerouslySetInnerHTML={{
              __html: compactDescriptionHtml,
            }}
          />

          <style jsx global>{`
            .product-description {
              line-height: 1.5;
            }

            .product-description p {
              margin: 0.45rem 0 !important;
            }

            .product-description h1,
            .product-description h2,
            .product-description h3,
            .product-description h4,
            .product-description h5,
            .product-description h6 {
              margin: 1rem 0 0.35rem !important;
              line-height: 1.3;
            }

            .product-description ul,
            .product-description ol {
              margin: 0.45rem 0 !important;
              padding-left: 1.25rem;
            }

            .product-description li {
              margin: 0.2rem 0 !important;
            }

            .product-description hr {
              margin: 0.9rem 0 !important;
            }

            .product-description br {
              line-height: 0.65;
            }

            .product-description > :first-child {
              margin-top: 0 !important;
            }

            .product-description > :last-child {
              margin-bottom: 0 !important;
            }
          `}</style>
        </div>
      </main>

      {showCheckout && (
        <CheckoutModal
          product={product}
          onClose={() => setShowCheckout(false)}
          onSuccess={() => {
            setShowCheckout(false);
          }}
        />
      )}
    </div>
  );
}
