// Product data now comes from the Kohler scrape — see scripts/scrape-kohler.mjs.
// This module stays as the import surface so components keep importing '@/lib/products';
// regenerating the catalogue never touches anything but products.generated.ts.

export type { Category, Product, Finish, FinishCode } from './products.generated';
export { products, featuredProducts, getProduct, relatedProducts } from './products.generated';
