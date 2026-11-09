import { unstable_cache } from 'next/cache';
import { fetchProductsFromMonday } from '@/lib/monday';

export const PRODUCT_CACHE_SECONDS = 60 * 10;

export const getCachedProducts = unstable_cache(
  async () => {
    console.info('[products-cache] Oppdaterer produktkatalogen fra datakilden.');

    const products = await fetchProductsFromMonday();
    if (!Array.isArray(products) || products.length === 0) {
      throw new Error('Produktkatalogen kunne ikke oppdateres med en gyldig produktliste.');
    }

    return products;
  },
  ['tilbudsboden-product-catalog-v3'],
  {
    revalidate: PRODUCT_CACHE_SECONDS,
    tags: ['product-catalog'],
  }
);
