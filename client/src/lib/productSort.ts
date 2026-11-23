export type ProductSortKey = "added" | "name" | "price" | "change";
export type SortDirection = "asc" | "desc";
export type ProductSort = { key: ProductSortKey; dir: SortDirection };

type SortableProduct = {
  name: string;
  currentPrice: number | null;
  previousPrice: number | null;
  createdAt: Date | string;
};

export const DEFAULT_SORT: ProductSort = { key: "added", dir: "desc" };

export const SORT_OPTIONS: Array<{ value: string; label: string; sort: ProductSort }> = [
  { value: "added-desc", label: "Newest first", sort: { key: "added", dir: "desc" } },
  { value: "change-asc", label: "Biggest price drop", sort: { key: "change", dir: "asc" } },
  { value: "change-desc", label: "Biggest price rise", sort: { key: "change", dir: "desc" } },
  { value: "price-asc", label: "Price: low to high", sort: { key: "price", dir: "asc" } },
  { value: "price-desc", label: "Price: high to low", sort: { key: "price", dir: "desc" } },
  { value: "name-asc", label: "Name A–Z", sort: { key: "name", dir: "asc" } },
];

export const sortToValue = (sort: ProductSort) => `${sort.key}-${sort.dir}`;

/** Price change since the previous check, in percent (negative = cheaper). */
export function getPriceChangePercent(product: Pick<SortableProduct, "currentPrice" | "previousPrice">): number | null {
  if (!product.previousPrice || !product.currentPrice) return null;
  return ((product.currentPrice - product.previousPrice) / product.previousPrice) * 100;
}

function sortValue(product: SortableProduct, key: ProductSortKey): number | string | null {
  switch (key) {
    case "added":
      return new Date(product.createdAt).getTime();
    case "name":
      return product.name.toLocaleLowerCase("pl-PL");
    case "price":
      return product.currentPrice || null;
    case "change":
      return getPriceChangePercent(product);
  }
}

/** Returns a sorted copy. Products without a value (no price / no change yet) always go last. */
export function sortProducts<T extends SortableProduct>(products: T[], sort: ProductSort): T[] {
  const factor = sort.dir === "asc" ? 1 : -1;
  return [...products].sort((a, b) => {
    const va = sortValue(a, sort.key);
    const vb = sortValue(b, sort.key);
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    if (typeof va === "string" && typeof vb === "string") {
      return va.localeCompare(vb, "pl-PL") * factor;
    }
    return ((va as number) - (vb as number)) * factor;
  });
}
