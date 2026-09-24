'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag, Phone, Mail, MapPin, Tag, Clock, Award, PackageX,
  Loader2, ShieldCheck, CheckCircle2, AlertTriangle, XCircle,
} from 'lucide-react';
import { Product } from '@/lib/monday';
import CheckoutModal from '@/components/CheckoutModal';

type StockInfo = { text: string; wrapperClass: string; icon: React.ReactNode };
type ProductCardProps = {
  product: Product;
  onOpenProduct: (productId: string) => void;
  onBuyWithVipps: (product: Product) => void;
  onBuyWithKlarna: () => void;
  calculateDiscount: (listPrice: number, salePrice: number) => number;
  isNewItem: (dateString: string) => boolean;
  getStockInfo: (stock: number) => StockInfo;
};

function ProductCard({ product, onOpenProduct, onBuyWithVipps, onBuyWithKlarna, calculateDiscount, isNewItem, getStockInfo }: ProductCardProps) {
  const cardRef = useRef<HTMLElement | null>(null);
  const viewRegistered = useRef(false);

  useEffect(() => {
    const card = cardRef.current;
    if (!card || viewRegistered.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting || viewRegistered.current) return;
      viewRegistered.current = true;
      observer.disconnect();
      void fetch('/api/products/view', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, type: 'home' }), keepalive: true,
      }).catch((error) => console.error(`Kunne ikke registrere forsidevisning for ${product.id}:`, error));
    }, { threshold: 0.5 });
    observer.observe(card);
    return () => observer.disconnect();
  }, [product.id]);

  const discount = calculateDiscount(product.listPrice, product.salePrice);
  const savings = Math.max(0, product.listPrice - product.salePrice);
  const stock = Number.isFinite(product.stock) ? product.stock : 0;
  const stockInfo = getStockInfo(stock);
  const isOutOfStock = stock <= 0;

  return (
    <article ref={cardRef} data-product-id={product.id} className={`relative flex flex-col overflow-hidden rounded-lg border bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all duration-300 sm:rounded-xl ${isOutOfStock ? 'border-gray-300 opacity-80' : 'border-gray-200 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.10)]'}`}>
      <div className="absolute left-2 top-2 z-10 flex flex-col gap-1 sm:left-3 sm:top-3 sm:gap-1.5">
        {discount > 0 && (
          <span className="-rotate-2 rounded-md border border-white/40 bg-gradient-to-r from-red-700 via-red-600 to-orange-500 px-2 py-1 text-[9px] font-black text-white shadow-[0_4px_10px_rgba(220,38,38,0.45)] ring-1 ring-red-800/20 sm:rounded-lg sm:px-3 sm:py-1.5 sm:text-xs sm:shadow-[0_5px_14px_rgba(220,38,38,0.55)]">
            🔥 SPAR {savings.toLocaleString('no-NO')} KR
          </span>
        )}
        {isNewItem(product.createdAt) && (
          <span className="flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[9px] font-bold text-white shadow-sm sm:px-2.5 sm:text-xs"><Clock className="h-3 w-3" />NY SISTE 3 DAGER</span>
        )}
      </div>

      <div onClick={() => onOpenProduct(product.id)} className="group relative flex h-32 cursor-pointer items-center justify-center overflow-hidden border-b border-gray-100 bg-gray-50 p-2 sm:h-64 sm:p-6">
        <img src={product.images?.[0] || '/tilbudsbodenlogo.svg'} alt={product.name} className={`max-h-full max-w-full object-contain transition-transform duration-300 ${isOutOfStock ? 'grayscale' : 'group-hover:scale-105'}`} onError={(event) => { event.currentTarget.src = '/tilbudsbodenlogo.svg'; }} />
      </div>

      <div className="flex flex-grow flex-col justify-between p-3 sm:p-5">
        <div>
          <div className="mb-1 line-clamp-1 text-[10px] font-medium text-gray-400 sm:text-xs">Varenr: {product.itemNumber} | {product.category}</div>
          <h4 onClick={() => onOpenProduct(product.id)} className="mb-2 line-clamp-2 min-h-[2.5rem] cursor-pointer text-sm font-bold leading-snug text-gray-900 transition-colors hover:text-red-600 sm:min-h-[3.25rem] sm:text-lg">{product.name}</h4>
          <p className="mb-4 hidden line-clamp-2 text-sm text-gray-600 sm:block">{product.shortInfo}</p>
        </div>
        <div>
          {product.pickupOnly ? (
            <div className="mb-2 flex items-center gap-1 rounded border border-amber-200 bg-amber-50 p-1.5 text-[10px] font-medium text-amber-800 sm:mb-3 sm:p-2 sm:text-xs"><MapPin className="h-3.5 w-3.5" />Må hentes i butikk på Sortland</div>
          ) : (
            <div className="mb-2 flex items-center gap-1 rounded border border-blue-200 bg-blue-50 p-1.5 text-[10px] font-medium text-blue-800 sm:mb-3 sm:p-2 sm:text-xs"><Award className="h-3.5 w-3.5" />Kan sendes som postpakke / Hentes</div>
          )}

          <div className={`mb-2 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold sm:mb-2.5 sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-xs ${stockInfo.wrapperClass}`} aria-label={`Lagerstatus: ${stockInfo.text}`}>
            {stockInfo.icon}<span>{stockInfo.text}</span>
          </div>

          <div className="mb-1 flex flex-col items-start gap-1 sm:flex-row sm:items-end sm:gap-5">
            <span className="text-xl font-black leading-none tracking-tight text-red-600 sm:text-3xl">
              {product.salePrice.toLocaleString('no-NO')} kr
            </span>
            {product.listPrice > product.salePrice && (
              <span className="flex flex-row items-baseline gap-1 leading-none text-gray-600 sm:translate-y-[2px] sm:flex-col sm:self-end sm:gap-0">
                <span className="text-[9px] font-bold uppercase tracking-wide text-gray-500 sm:mb-1 sm:text-[10px] sm:tracking-wider">
                  Veil. pris:
                </span>
                <span className="text-[11px] font-extrabold leading-none text-gray-800 sm:text-sm">
                  {product.listPrice.toLocaleString('no-NO')} kr
                </span>
              </span>
            )}
          </div>
          <p className="mb-2 text-[10px] font-medium text-gray-500 sm:mb-2.5 sm:text-xs">Inkl. mva.</p>

          <div className="pt-1">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1.8fr_0.8fr] sm:gap-3">
              <button type="button" onClick={() => onBuyWithVipps(product)} disabled={isOutOfStock} className="group flex min-h-[42px] transform items-center justify-center gap-1.5 rounded-xl sm:min-h-[60px] sm:gap-2 sm:rounded-2xl bg-gradient-to-b from-[#ff7040] to-[#ff5b24] px-2 py-2 text-xs font-extrabold text-white sm:px-4 sm:py-4 sm:text-base shadow-[0_4px_14px_rgba(255,90,30,0.25)] ring-1 ring-black/5 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:from-[#ff8458] hover:to-[#e54812] hover:shadow-[0_7px_20px_rgba(255,90,30,0.35)] active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-400 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:scale-100">
                <ShoppingBag className="h-4 w-4 transition-transform duration-200 group-hover:scale-110 sm:h-5 sm:w-5" />
                <span className="sm:hidden">{isOutOfStock ? 'Utsolgt' : 'Vipps'}</span>
                <span className="hidden sm:inline">{isOutOfStock ? 'Utsolgt' : 'Kjøp med Vipps'}</span>
              </button>
              <button type="button" onClick={onBuyWithKlarna} disabled={isOutOfStock} className="flex min-h-[40px] transform items-center justify-center rounded-xl sm:min-h-[56px] sm:rounded-2xl border-2 border-[#ff8fb0] bg-[#ffb3c7] px-2 py-2 text-xs font-extrabold leading-tight text-gray-950 sm:px-3 sm:py-3.5 sm:text-sm shadow-[0_5px_14px_rgba(255,143,176,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:border-[#ff5f8f] hover:bg-[#ff7fa6] hover:shadow-[0_9px_22px_rgba(255,95,143,0.42)] active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-100 disabled:text-gray-500 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:scale-100">
                <span className="sm:hidden">{isOutOfStock ? 'Utsolgt' : 'Klarna'}</span>
                <span className="hidden sm:inline">
                  {isOutOfStock ? 'Utsolgt' : 'Betal senere med Klarna'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [klarnaMessage, setKlarnaMessage] = useState('');

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/products', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Kunne ikke hente produkter.');
      setProducts(data.products || []);
    } catch (error) { console.error('Feil ved henting av produkter:', error); setProducts([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => { if (!klarnaMessage) return; const timeout = window.setTimeout(() => setKlarnaMessage(''), 5000); return () => window.clearTimeout(timeout); }, [klarnaMessage]);

  const isNewItem = (dateString: string) => { const itemDate = new Date(dateString); const threeDaysAgo = new Date(); threeDaysAgo.setDate(threeDaysAgo.getDate() - 3); return itemDate >= threeDaysAgo; };
  const calculateDiscount = (listPrice: number, salePrice: number) => !listPrice || listPrice <= salePrice ? 0 : Math.round(((listPrice - salePrice) / listPrice) * 100);
  const getStockInfo = (stock: number): StockInfo => {
    if (stock <= 0) return { text: 'UTSOLGT', wrapperClass: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle className="h-4 w-4" aria-hidden="true" /> };
    if (stock <= 5) return { text: `🔥 ${stock} stk igjen`, wrapperClass: 'bg-orange-50 text-orange-800 border-orange-300 shadow-sm', icon: <AlertTriangle className="h-4 w-4 text-red-600" aria-hidden="true" /> };
    return { text: `${stock} stk på lager`, wrapperClass: 'bg-green-50 text-green-700 border-green-200', icon: <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> };
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="z-50 bg-neutral-900 px-4 py-2 text-sm text-white"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 md:flex-row"><div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2"><span className="flex items-center gap-1"><MapPin className="h-4 w-4 text-red-600" />Verkstedveien 2, 8402 Sortland</span><span className="flex items-center gap-1"><Phone className="h-4 w-4 text-red-600" />76 12 13 60</span><span className="flex items-center gap-1"><Mail className="h-4 w-4 text-red-600" />sortland@eiksenteret.no</span></div><div className="text-xs text-gray-400">Org.nr: 936 858 031 | Eiksenteret Sortland</div></div></header>
      <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-[0_3px_12px_rgba(0,0,0,0.06)]"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3"><div className="flex cursor-pointer items-center gap-4" onClick={() => router.push('/')}><img src="/tilbudsbodenlogo.svg" alt="Tilbudsboden.no - fra Eiksenteret Sortland" className="h-10 object-contain md:h-12" /><div className="border-l border-gray-300 pl-4"><h1 className="text-lg font-bold leading-none tracking-tight text-gray-900 md:text-xl">Tilbudsboden.no</h1><p className="mt-1 text-xs text-gray-500">Restpartier, kampanjevarer og gode kjøp fra Eiksenteret Sortland</p></div></div><div className="hidden items-center gap-4 sm:flex"><span className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"><Tag className="h-3.5 w-3.5" />Direkte fra lageret på Sortland</span></div></div></nav>
      <section className="mx-auto w-full max-w-7xl px-4 pb-2 pt-4">
        <div className="relative h-[280px] overflow-hidden rounded-2xl border border-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.08)] sm:h-[320px]">
          <img
            src="/EiksenteretSortland.png"
            alt="Eiksenteret Sortland Butikk"
            className="h-full w-full object-cover object-[center_65%]"
          />
          <div className="absolute inset-0 flex items-center justify-end bg-gradient-to-l from-black/90 via-black/60 to-black/10 p-6 md:p-10 md:pr-16">
            <div className="max-w-xl text-right text-white">
              <span className="mb-2 inline-block rounded bg-red-600 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white">
                Velkommen til Tilbudsboden.no
              </span>
              <h2 className="mb-2 text-xl font-extrabold tracking-tight text-white md:text-4xl">
                Restpartier, kampanjevarer og gode kjøp
              </h2>
              <p className="hidden text-sm leading-relaxed text-gray-100 sm:block">
                Her finner du restpartier, kampanjevarer, utstillingsmodeller og ekstra gode kjøp direkte fra lageret og butikken vår på Sortland.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto w-full max-w-7xl px-4 pt-4">
        <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.03)] md:flex-row md:items-center md:justify-center">
          {[
            'Alt inkludert – ingen overraskelser',
            'Rask levering eller hent i butikk',
            'Lokal faghandel – Eiksenteret Sortland',
          ].map((item, index) => (
            <div
              key={item}
              className={`flex min-h-12 flex-1 items-center justify-start gap-2 px-4 py-3 text-sm font-bold text-gray-800 md:justify-center md:text-center ${
                index > 0
                  ? 'border-t border-gray-200 md:border-l md:border-t-0'
                  : ''
              }`}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-700">
                ✓
              </span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>
      <main className="mx-auto w-full max-w-7xl flex-grow px-3 py-6 sm:px-4 sm:py-8">
        {klarnaMessage && <div role="status" className="mb-6 rounded-xl border border-[#ffb3c7] bg-[#fff0f5] p-4 text-center text-sm font-semibold text-gray-900">{klarnaMessage}</div>}
        <div className="mb-5 flex items-center justify-between sm:mb-8"><h3 className="text-xl font-bold text-gray-900 sm:text-2xl">Aktuelle tilbud</h3><span className="text-xs text-gray-500 sm:text-sm">{products.length} varer tilgjengelig nå</span></div>
        {loading ? <div className="flex flex-col items-center justify-center gap-2 py-20 text-gray-500"><Loader2 className="h-8 w-8 animate-spin text-red-600" /><p className="text-sm">Laster inn tilbud...</p></div> : products.length === 0 ? <div className="mx-auto max-w-lg rounded-xl border border-gray-200 bg-white p-12 text-center"><PackageX className="mx-auto mb-3 h-12 w-12 text-gray-400" /><h4 className="mb-1 text-lg font-bold text-gray-800">Ingen aktive varer ennå</h4><p className="text-sm text-gray-500">Når en vare blir utsolgt eller en ny vare lagres i Monday, oppdateres listen automatisk.</p></div> : <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">{products.map((product) => <ProductCard key={product.id} product={product} onOpenProduct={(id) => router.push(`/product/${id}`)} onBuyWithVipps={setSelectedProduct} onBuyWithKlarna={() => setKlarnaMessage('Klarna lanseres snart på Tilbudsboden.no. Betalingsvalget er foreløpig ikke aktivert.')} calculateDiscount={calculateDiscount} isNewItem={isNewItem} getStockInfo={getStockInfo} />)}</div>}
      </main>
      {selectedProduct && <CheckoutModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onSuccess={loadProducts} />}
      <footer className="mt-12 border-t border-neutral-800 bg-neutral-900 py-12 text-sm text-gray-400"><div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 md:grid-cols-3"><div><div className="mb-4 inline-block rounded-lg bg-white p-2"><img src="/tilbudsbodenlogo.svg" alt="Tilbudsboden.no - fra Eiksenteret Sortland" className="h-8 object-contain" /></div><p className="mb-1 font-semibold text-white">Eiksenteret Sortland</p><p className="mb-1">Verkstedveien 2, 8402 Sortland</p><p className="mb-1">Telefon: 76 12 13 60</p><p>E-post: sortland@eiksenteret.no</p></div><div><h5 className="mb-3 text-base font-bold text-white">Om Tilbudsboden.no</h5><p className="mb-3 text-xs leading-relaxed">Tilbudsboden.no er Eiksenteret Sortland sin nettkanal for salg av restpartier, kampanjevarer, utstillingsmodeller og ekstra gode kjøp. Registrert org.nr: 936 858 031.</p><button onClick={() => router.push('/vilkar')} className="flex items-center gap-1 text-xs font-bold text-red-500 underline hover:text-red-400"><ShieldCheck className="h-4 w-4" />Les våre fullstendige Salgsvilkår</button></div><div><h5 className="mb-3 text-base font-bold text-white">Betaling & Forbehold</h5><p className="mb-2 text-xs leading-relaxed">Vi tilbyr enkel betaling med Vipps. Alle varer registrert solgt blir klargjort for enten henting i butikk i Verkstedveien 2 eller sending per post.</p><p className="mb-2 text-[11px] font-medium leading-relaxed text-gray-500">Alle priser på Tilbudsboden.no er oppgitt inkl. mva.</p><p className="border-t border-neutral-800 pt-2 text-[11px] italic leading-relaxed text-gray-500"><strong>Forbehold:</strong> Vi tar forbehold om skrivefeil, feilprising, spesifikasjonsendringer og at varer kan være utsolgt ved mellomdagssalg i butikk.</p></div></div></footer>
    </div>
  );
}
