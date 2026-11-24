'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Product } from '@/lib/monday';

const ROTATION_MS = 30_000;
const REFRESH_MS = 60 * 60 * 1000;
const CARDS_PER_PAGE = 3;

function discount(product: Product): number {
  if (!product.listPrice || product.listPrice <= product.salePrice) return 0;
  return Math.round(((product.listPrice - product.salePrice) / product.listPrice) * 100);
}

function statusLabel(product: Product): string {
  const reason = product.onlineSaleReason.trim().toLocaleLowerCase('nb-NO');
  if (reason.includes('demo')) return 'DEMOVARE';
  if (reason.includes('brukt')) return 'BRUKT';
  if (reason.includes('lagerslitt')) return 'LAGERSLITT';
  if (reason.includes('utgått')) return 'UTGÅTT MODELL';
  if (discount(product) > 0) return `-${discount(product)} %`;
  return 'LAGERKUPP';
}

function details(product: Product): string[] {
  const values = [
    product.productionYear ? `Årsmodell ${product.productionYear}` : '',
    product.brand || '',
    product.shortInfo || '',
  ].filter(Boolean);
  return values.slice(0, 3);
}

function ProductCard({ product }: { product: Product }) {
  const productUrl = `https://tilbudsboden.no/product/${product.id}`;
  const saving = Math.max(0, product.listPrice - product.salePrice);

  return (
    <article className="relative grid min-h-0 grid-rows-[54%_46%] overflow-hidden rounded-[30px] border border-white/10 bg-white text-neutral-950 shadow-[0_26px_70px_rgba(0,0,0,0.28)]">
      <div className="relative flex min-h-0 items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-200 p-7">
        <span className="absolute left-6 top-6 z-10 rounded-full bg-red-600 px-5 py-2 text-[25px] font-black tracking-wide text-white shadow-lg">
          {statusLabel(product)}
        </span>
        <img
          src={`/api/product-image/${product.id}/0`}
          alt=""
          className="h-full w-full object-contain"
          onError={(event) => { event.currentTarget.src = '/tilbudsbodenlogo.svg'; }}
        />
      </div>

      <div className="flex min-h-0 flex-col p-7 pt-8">
        <h2 className="line-clamp-2 h-[82px] w-full overflow-hidden text-[36px] font-black leading-[1.06] tracking-tight">
          {product.name}
        </h2>

        <div className="mt-3 grid h-[158px] shrink-0 grid-cols-[1fr_154px] gap-5 overflow-visible">
          <ul className="space-y-1 text-[18px] font-semibold leading-tight text-neutral-600">
            {details(product).slice(0, 2).map((item) => (
              <li key={item} className="line-clamp-2">{String.fromCharCode(8226)} {item}</li>
            ))}
          </ul>

          <div className="flex flex-col items-center self-start overflow-visible">
            <div className="rounded-2xl border-4 border-neutral-950 bg-white p-2 shadow-lg">
              <img src={`/api/product-qr/${product.id}`} alt={`QR-kode til ${productUrl}`} className="block h-[128px] w-[128px] object-contain" />
            </div>
            <span className="mt-2 whitespace-nowrap text-[14px] font-black uppercase tracking-wide text-neutral-950">Skann for mer</span>
          </div>
        </div>

        <div className="mt-auto">
          <div className="flex items-baseline gap-4">
            <div className="whitespace-nowrap text-[54px] font-black leading-none tracking-tight text-red-600">
              {product.salePrice.toLocaleString('nb-NO', { maximumFractionDigits: 0 })} kr
            </div>
            {product.listPrice > product.salePrice && (
              <div className="whitespace-nowrap text-[19px] font-bold text-neutral-500 line-through">
                {product.listPrice.toLocaleString('nb-NO', { maximumFractionDigits: 0 })} kr
              </div>
            )}
          </div>
          <p className="mt-2 whitespace-nowrap text-[16px] font-semibold text-neutral-500">Pris inkl. mva.</p>
          {saving > 0 && <p className="mt-1 whitespace-nowrap text-[18px] font-black text-neutral-700">Du sparer {saving.toLocaleString('nb-NO', { maximumFractionDigits: 0 })} kr</p>}
        </div>
      </div>
    </article>
  );
}

export default function StorskjermPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      const response = await fetch('/api/products', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Produktkatalog svarte ${response.status}`);
      const data = await response.json();
      const active = (Array.isArray(data.products) ? data.products : [])
        .filter((product: Product) => Number(product.stock) > 0)
        .sort((a: Product, b: Product) => {
          const discountDifference = discount(b) - discount(a);
          if (discountDifference !== 0) return discountDifference;
          return (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0);
        });

      if (active.length > 0) {
        setProducts(active);
        setPageIndex((current) => Math.min(current, Math.max(0, Math.ceil(active.length / CARDS_PER_PAGE) - 1)));
      }
    } catch (error) {
      console.error('[storskjerm] Beholder sist lastede produkter:', error);
    } finally {
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    const refresh = window.setInterval(loadProducts, REFRESH_MS);
    return () => window.clearInterval(refresh);
  }, [loadProducts]);

  const pages = useMemo(() => {
    const result: Product[][] = [];
    for (let index = 0; index < products.length; index += CARDS_PER_PAGE) {
      result.push(products.slice(index, index + CARDS_PER_PAGE));
    }
    return result;
  }, [products]);

  useEffect(() => {
    if (pages.length <= 1) return;
    const rotation = window.setInterval(() => {
      setPageIndex((current) => (current + 1) % pages.length);
      setCycle((current) => current + 1);
    }, ROTATION_MS);
    return () => window.clearInterval(rotation);
  }, [pages.length]);

  const visible = pages[pageIndex] || [];

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#3b3b3b_0%,#171717_42%,#050505_100%)] text-white">
      <div className="grid h-full grid-rows-[126px_1fr_92px] px-12 pb-8 pt-7">
        <header className="flex items-center justify-between border-b border-white/15 pb-5">
          <div className="flex items-center gap-8">
            <div className="rounded-2xl bg-white px-5 py-3 shadow-xl">
              <img src="/tilbudsbodenlogo.svg" alt="Tilbudsboden.no" className="h-[66px] w-auto" />
            </div>
            <div>
              <h1 className="text-[46px] font-black leading-none tracking-tight">Gode kjøp akkurat nå</h1>
              <p className="mt-2 text-[23px] font-semibold text-neutral-300">Demo · brukt · restpartier · utgående modeller</p>
            </div>
          </div>
          <div className="rounded-full border border-red-500/60 bg-red-600/20 px-7 py-3 text-[24px] font-black text-red-100">
            {products.length} aktive tilbud
          </div>
        </header>

        <section className="grid min-h-0 grid-cols-3 gap-7 py-7">
          {visible.map((product) => <ProductCard key={product.id} product={product} />)}

          {!hasLoaded && (
            <div className="col-span-3 flex items-center justify-center text-[38px] font-black text-neutral-300">
              Henter dagens tilbud …
            </div>
          )}

          {hasLoaded && visible.length === 0 && (
            <div className="col-span-3 flex flex-col items-center justify-center text-center">
              <img src="/tilbudsbodenlogo.svg" alt="Tilbudsboden.no" className="mb-8 h-28 rounded-2xl bg-white p-6" />
              <h2 className="text-[48px] font-black">Nye tilbud kommer snart</h2>
              <p className="mt-4 text-[28px] text-neutral-300">Se hele utvalget på tilbudsboden.no</p>
            </div>
          )}
        </section>

        <footer className="relative flex items-center justify-between overflow-hidden rounded-2xl bg-white/10 px-8">
          <div className="text-[26px] font-black">Skann QR-koden eller spør oss i kassen!</div>
          <div className="text-[24px] font-bold text-neutral-300">tilbudsboden.no · Eiksenteret Sortland</div>
          <div
            key={`${pageIndex}-${cycle}`}
            className="absolute bottom-0 left-0 h-2 bg-red-600"
            style={{ animation: `storskjerm-progress ${ROTATION_MS}ms linear forwards` }}
          />
        </footer>
      </div>

      <style jsx global>{`
        html, body { width: 100%; height: 100%; overflow: hidden; }
        @keyframes storskjerm-progress { from { width: 0%; } to { width: 100%; } }
      `}</style>
    </main>
  );
}