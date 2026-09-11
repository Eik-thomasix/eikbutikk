'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ShoppingBag, ArrowLeft, MapPin, Award, Loader2 } from 'lucide-react';
import { Product } from '@/lib/monday';
import CheckoutModal from '@/components/CheckoutModal';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        const found = (data.products || []).find((p: Product) => p.id === params.id);
        
        if (found) {
          setProduct(found);
          // Sjekker at bilder finnes og at matrisen ikke er tom
          const initialImage = (found.images && found.images.length > 0) 
            ? found.images[0] 
            : (found.imageUrl || '/honda.png');
          setSelectedImage(initialImage);
        }
      } catch (err) {
        console.error('Feil ved henting av produkt:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-600 mb-2" />
        <p className="text-sm text-gray-500">Laster produktdetaljer...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Produktet ble ikke funnet</h2>
        <button
          onClick={() => router.push('/')}
          className="bg-neutral-900 text-white px-4 py-2 rounded-lg text-sm font-semibold"
        >
          Tilbake til nettbutikken
        </button>
      </div>
    );
  }

  const productImages = (product.images && product.images.length > 0) 
    ? product.images 
    : [product.imageUrl || '/honda.png'];

  const discount =
    product.listPrice > product.salePrice
      ? Math.round(((product.listPrice - product.salePrice) / product.listPrice) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header Navigation med Logo */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-red-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Tilbake til alle tilbud
          </button>

          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <img src="/EIKLOGO.png" alt="Eiksenteret Logo" className="h-9 object-contain" />
            <span className="font-bold text-gray-900 text-base hidden sm:inline">Eikbutikk.no</span>
          </div>
        </div>
      </header>

      {/* Hovedinnhold */}
      <main className="max-w-7xl mx-auto px-4 py-8 flex-grow w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* VENSTRE: Bildegalleri */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="w-full h-96 md:h-[480px] bg-gray-50 rounded-xl overflow-hidden relative border border-gray-100 p-4 flex items-center justify-center">
              <img
                src={selectedImage || productImages[0]}
                alt={product.name}
                className="max-h-full max-w-full object-contain transition-all duration-300"
                onError={(e) => {
                  // Fallback om bildet feiler ved lasting
                  (e.target as HTMLImageElement).src = '/honda.png';
                }}
              />
              {discount > 0 && (
                <span className="absolute top-4 left-4 bg-red-600 text-white font-extrabold text-sm px-3 py-1 rounded-md shadow">
                  -{discount}% TILBUD
                </span>
              )}
            </div>

            {productImages.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {productImages.map((imgUrl, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(imgUrl)}
                    className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 p-1 bg-gray-50 flex items-center justify-center ${
                      selectedImage === imgUrl ? 'border-red-600 scale-105 shadow' : 'border-gray-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img 
                      src={imgUrl} 
                      alt={`Bilde ${index + 1}`} 
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/honda.png';
                      }} 
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* HØYRE: Produktdetaljer & Kjøp */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold text-gray-400 mb-2">
                Varenr: {product.itemNumber} | Kategori: {product.category}
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
                    <span className="font-bold block">Kun henting i butikk</span>
                    <span>Verkstedveien 2, 8402 Sortland</span>
                  </div>
                </div>
              ) : (
                <div className="mb-6 text-xs bg-blue-50 text-blue-800 p-3 rounded-xl border border-blue-200 font-medium flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <div>
                    <span className="font-bold block">Henting eller Postpakke</span>
                    <span>Kan sendes per post eller hentes i butikken.</span>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 mb-6">
                <div className="text-xs text-gray-500 mb-1 font-semibold uppercase">Tilbudspris på nett</div>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl md:text-4xl font-extrabold text-red-600">
                    {product.salePrice.toLocaleString('no-NO')} kr
                  </span>
                  {product.listPrice > product.salePrice && (
                    <span className="text-base text-gray-400 line-through">
                      {product.listPrice.toLocaleString('no-NO')} kr
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowCheckout(true)}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-lg shadow-md hover:shadow-lg"
            >
              <ShoppingBag className="w-5 h-5" /> Kjøp med Vipps nå
            </button>
          </div>
        </div>

        {/* Beskrivelse fra Monday AI */}
        <div className="mt-8 bg-white rounded-2xl p-6 md:p-8 border border-gray-200 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-100 pb-3">
            Produktinformasjon & Spesifikasjoner
          </h3>
          
          <div
            className="prose prose-red max-w-none text-gray-700 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
          />
        </div>
      </main>

      {showCheckout && (
        <CheckoutModal
          product={product}
          onClose={() => setShowCheckout(false)}
          onSuccess={() => {
            setShowCheckout(false);
            router.push('/');
          }}
        />
      )}
    </div>
  );
}