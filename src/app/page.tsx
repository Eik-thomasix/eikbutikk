import React from 'react';
import { ShoppingBag, Phone, Mail, MapPin, Tag, Clock, Award, PackageX } from 'lucide-react';
import { fetchProductsFromMonday, Product } from '@/lib/monday';

export const revalidate = 30; // Server-side oppdatering hvert 30. sekund

export default async function HomePage() {
  const products = await fetchProductsFromMonday();

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
      {/* Topplinje med kontaktinfo og Butikkadresse */}
      <header className="bg-neutral-900 text-white text-sm py-2 px-4">
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

      {/* Hovedmeny / Branding */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 text-white font-extrabold text-2xl px-3 py-1 rounded tracking-wider">
              EIK
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">Eikbutikk.no</h1>
              <p className="text-xs text-gray-500">Kupp & tilbudsvarer fra Eiksenteret Sortland</p>
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
      <section className="bg-gradient-to-r from-neutral-900 to-neutral-800 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto text-center md:text-left">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-3">
            Gjør et kupp på maskiner og utstyr
          </h2>
          <p className="text-gray-300 max-w-2xl text-base md:text-lg">
            Her legger våre fagfolk ut utstillingsmodeller, overskuddsvarer og spesiell-tilbud direkte fra butikken i Verkstedveien.
          </p>
        </div>
      </section>

      {/* Produktliste */}
      <main className="max-w-7xl mx-auto px-4 py-10 flex-grow w-full">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Aktuelle Kupp & Tilbud
          </h3>
          <span className="text-sm text-gray-500">
            {products.length} varer tilgjengelig nå
          </span>
        </div>

        {products.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-gray-200 max-w-lg mx-auto">
            <PackageX className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h4 className="text-lg font-bold text-gray-800 mb-1">Ingen aktive varer ennå</h4>
            <p className="text-sm text-gray-500">
              Legg til et produkt i Monday.com og sett statusen til <strong className="text-gray-700">Aktiv</strong> for å vise det her.
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
                  {/* Badges */}
                  <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
                    {discount > 0 && (
                      <span className="bg-red-600 text-white font-bold text-xs px-2.5 py-1 rounded-md shadow-sm">
                        -{discount}% RABATT
                      </span>
                    )}
                    {isNew && (
                      <span className="bg-emerald-600 text-white font-bold text-xs px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1">
                        <Clock className="w-3 h-3" /> NY SISTE 3 DAGER
                      </span>
                    )}
                  </div>

                  {/* Produktbilde */}
                  <div className="h-56 bg-gray-100 relative overflow-hidden group">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Produktinnhold */}
                  <div className="p-5 flex-grow flex flex-col justify-between">
                    <div>
                      <div className="text-xs text-gray-400 font-medium mb-1">
                        Varenr: {product.itemNumber} | {product.category}
                      </div>
                      <h4 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
                        {product.name}
                      </h4>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {product.shortInfo}
                      </p>
                    </div>

                    <div>
                      {/* Fraktinfo */}
                      {product.pickupOnly ? (
                        <div className="mb-3 text-xs bg-amber-50 text-amber-800 p-2 rounded border border-amber-200 font-medium flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> Må hentes i butikk på Sortland
                        </div>
                      ) : (
                        <div className="mb-3 text-xs bg-blue-50 text-blue-800 p-2 rounded border border-blue-200 font-medium flex items-center gap-1">
                          <Award className="w-3.5 h-3.5" /> Kan sendes som postpakke / Hentes
                        </div>
                      )}

                      {/* Priser */}
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

                      <button className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
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

      {/* Bunntekst / Footer */}
      <footer className="bg-neutral-900 text-gray-400 text-sm py-10 border-t border-neutral-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h5 className="text-white font-bold mb-3 text-base">Eiksenteret Sortland</h5>
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
            <h5 className="text-white font-bold mb-3 text-base">Betaling & Betingelser</h5>
            <p className="text-xs leading-relaxed">
              Vi tilbyr enkel betaling med Vipps. Alle varer registrert solgt blir klargjort for enten henting i butikk eller sending.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}