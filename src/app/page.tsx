'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Phone, Mail, MapPin, Tag, Clock, Award, PackageX, Loader2 } from 'lucide-react';
import { Product } from '@/lib/monday';
import CheckoutModal from '@/components/CheckoutModal';

export default function HomePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error('Feil ved henting av produkter:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const isNewItem = (dateString: string) => {
    const itemDate = new Date(dateString);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return itemDate >= threeDaysAgo;
  };

  const calculateDiscount = (listPrice: number, salePrice: number) => {
    if (!listPrice || listPrice <= salePrice) return 0;
    return Math.round(((listPrice - salePrice) / listPrice) * 100);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Topplinje */}
      <header className="bg-neutral-900 text-white text-sm py-2 px-4 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-red-600" />
              Verkstedveien 2, 8402 Sortland
            </span>
            <span className="flex items-center gap-1">
              <Phone className="w-4 h-4 text-red-600" />
              76 12 13 60
            </span>
            <span className="flex items-center gap-1">
              <Mail className="w-4 h-4 text-red-600" />
              sortland@eiksenteret.no
            </span>
          </div>
          <div className="text-xs text-gray-400">
            Org.nr: 936 858 031 | Eiksenteret Sortland
          </div>
        </div>
      </header>

      {/* Hovedmeny */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => router.push('/')}>
            <img
              src="/EIKLOGO.png"
              alt="Eiksenteret Sortland Logo"
              className="h-10 md:h-12 object-contain"
            />
            <div className="border-l border-gray-300 pl-4">
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-gray-900 leading-none">Eikbutikk.no</h1>
              <p className="text-xs text-gray-500 mt-1">Gode kjøp og tilbud fra Eiksenteret Sortland</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="bg-red-50 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-red-200 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" /> Direkte fra lageret på Sortland
            </span>
          </div>
        </div>
      </nav>

      {/* Hero-seksjon */}
      <section className="max-w-7xl mx-auto px-4 pt-4 pb-2 w-full">
        <div className="relative rounded-2xl overflow-hidden shadow-md border border-gray-200 bg-neutral-900">
          <img
            src="/EiksenteretSortland.png"
            alt="Eiksenteret Sortland Butikk"
            className="w-full h-auto max-h-[280px] object-contain bg-neutral-900"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/90 via-neutral-950/60 to-transparent flex items-center p-6 md:p-10">
            <div className="max-w-xl text-white">
              <span className="inline-block bg-red-600 text-white font-bold text-xs uppercase tracking-widest px-3 py-1 rounded mb-2">
                Velkommen til Eikbutikk.no
              </span>
              <h2 className="text-xl md:text-3xl font-extrabold mb-2 tracking-tight text-white">
                Utvalgte kvalitetsprodukter og gode tilbud
              </h2>
              <p className="text-gray-200 text-xs md:text-sm leading-relaxed hidden sm:block">
                Her publiserer våre fagfolk utstillingsmodeller, overskuddsvarer og spesiell-tilbud direkte fra vårt lager og butikk i Verkstedveien 2 på Sortland.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Produktliste */}
      <main className="max-w-7xl mx-auto px-4 py-10 flex-grow w-full">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Aktuelle tilbud
          </h3>
          <span className="text-sm text-gray-500">
            {products.length} varer tilgjengelig nå
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            <p className="text-sm">Laster inn tilbud...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-gray-200 max-w-lg mx-auto">
            <PackageX className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h4 className="text-lg font-bold text-gray-800 mb-1">Ingen aktive varer ennå</h4>
            <p className="text-sm text-gray-500">
              Når en vare blir utsolgt eller ny lagres i Monday, oppdateres listen automatisk.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => {
              const discount = calculateDiscount(product.listPrice, product.salePrice);
              const isNew = isNewItem(product.createdAt);

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden flex flex-col relative"
                >
                  <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
                    {discount > 0 && (
                      <span className="bg-red-600 text-white font-bold text-xs px-2.5 py-1 rounded-md shadow-sm">
                        -{discount}% TILBUD
                      </span>
                    )}
                    {isNew && (
                      <span className="bg-emerald-600 text-white font-bold text-xs px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1">
                        <Clock className="w-3 h-3" /> NY SISTE 3 DAGER
                      </span>
                    )}
                  </div>

                  <div
                    onClick={() => router.push(`/product/${product.id}`)}
                    className="h-64 bg-gray-50 p-6 flex items-center justify-center relative overflow-hidden group cursor-pointer border-b border-gray-100"
                  >
                    <img
                      src={
                        product.images && product.images.length > 0
                          ? product.images[0]
                          : 'https://images.unsplash.com/photo-1592417817098-8f3d6eb16082?auto=format&fit=crop&w=600&q=80'
                      }
                      alt={product.name}
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  <div className="p-5 flex-grow flex flex-col justify-between">
                    <div>
                      <div className="text-xs text-gray-400 font-medium mb-1">
                        Varenr: {product.itemNumber} | {product.category}
                      </div>

                      <h4
                        onClick={() => router.push(`/product/${product.id}`)}
                        className="text-lg font-bold text-gray-900 mb-2 line-clamp-1 cursor-pointer hover:text-red-600 transition-colors"
                      >
                        {product.name}
                      </h4>

                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {product.shortInfo}
                      </p>
                    </div>

                    <div>
                      {product.pickupOnly ? (
                        <div className="mb-3 text-xs bg-amber-50 text-amber-800 p-2 rounded border border-amber-200 font-medium flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> Må hentes i butikk på Sortland
                        </div>
                      ) : (
                        <div className="mb-3 text-xs bg-blue-50 text-blue-800 p-2 rounded border border-blue-200 font-medium flex items-center gap-1">
                          <Award className="w-3.5 h-3.5" /> Kan sendes som postpakke / Hentes
                        </div>
                      )}

                      <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-2xl font-extrabold text-red-600">
                          {product.salePrice.toLocaleString('no-NO')} kr
                        </span>
                        {product.listPrice > product.salePrice && (
                          <span className="text-sm text-gray-400 line-through">
                            {product.listPrice.toLocaleString('no-NO')} kr
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => setSelectedProduct(product)}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ShoppingBag className="w-4 h-4" /> Kjøp med Vipps
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {selectedProduct && (
        <CheckoutModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onSuccess={loadProducts}
        />
      )}

      {/* Footer med Forbehold */}
      <footer className="bg-neutral-900 text-gray-400 text-sm py-12 border-t border-neutral-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="inline-block bg-white p-2 rounded-lg mb-4">
              <img src="/EIKLOGO.png" alt="Eiksenteret Logo" className="h-8 object-contain" />
            </div>
            <p className="mb-1 text-white font-semibold">Eiksenteret Sortland</p>
            <p className="mb-1">Verkstedveien 2, 8402 Sortland</p>
            <p className="mb-1">Telefon: 76 12 13 60</p>
            <p>E-post: sortland@eiksenteret.no</p>
          </div>
          <div>
            <h5 className="text-white font-bold mb-3 text-base">Om Eikbutikk.no</h5>
            <p className="text-xs leading-relaxed">
              Eikbutikk.no er Eiksenteret Sortland sin nettkanal for salg av tilbudsvarer, utstillingsmodeller og utvalgte produkter fra vårt sortiment. Registrert org.nr: 936 858 031.
            </p>
          </div>
          <div>
            <h5 className="text-white font-bold mb-3 text-base">Betaling & Forbehold</h5>
            <p className="text-xs leading-relaxed mb-2">
              Vi tilbyr enkel betaling med Vipps. Alle varer registrert solgt blir klargjort for enten henting i butikk i Verkstedveien 2 eller sending per post.
            </p>
            <p className="text-[11px] text-gray-500 leading-relaxed italic border-t border-neutral-800 pt-2">
              <strong>Forbehold:</strong> Vi tar forbehold om skrivefeil, feilprising, spesifikasjonsendringer og at varer kan være utsolgt (mellomdagssalg i butikk).
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}