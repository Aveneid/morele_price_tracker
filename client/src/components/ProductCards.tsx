import { useState } from "react";
import { ImageOff, TrendingDown, TrendingUp } from "lucide-react";
import { getPriceChangePercent } from "@/lib/productSort";

type CardProduct = {
  id: number;
  name: string;
  category: string | null;
  imageUrl: string | null;
  currentPrice: number | null;
  previousPrice: number | null;
  lastCheckedAt: Date | string | null;
};

export const formatPrice = (cents: number | null) =>
  cents ? `${(cents / 100).toFixed(2)} zł` : "—";

export function ProductThumbnail({
  src,
  alt,
  className = "",
  iconClassName = "w-5 h-5",
}: {
  src: string | null;
  alt: string;
  className?: string;
  iconClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`flex items-center justify-center bg-gray-50 overflow-hidden ${className}`}>
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="max-w-full max-h-full object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <ImageOff className={`text-gray-300 ${iconClassName}`} aria-hidden="true" />
      )}
    </div>
  );
}

export function PriceChange({ product }: { product: Pick<CardProduct, "currentPrice" | "previousPrice"> }) {
  const change = getPriceChangePercent(product);
  if (change === null) return <span className="text-gray-400">—</span>;

  const percentage = Math.abs(change).toFixed(1);
  if (change < 0) {
    return (
      <div className="flex items-center gap-1">
        <TrendingDown className="w-4 h-4 text-green-600" />
        <span className="text-green-600 font-medium">-{percentage}%</span>
      </div>
    );
  }
  if (change > 0) {
    return (
      <div className="flex items-center gap-1">
        <TrendingUp className="w-4 h-4 text-red-600" />
        <span className="text-red-600 font-medium">+{percentage}%</span>
      </div>
    );
  }
  return <span className="text-gray-600">No change</span>;
}

export function ProductGrid<T extends CardProduct>({
  products,
  onSelect,
}: {
  products: T[];
  onSelect: (product: T) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
      {products.map(product => (
        <button
          key={product.id}
          type="button"
          onClick={() => onSelect(product)}
          className="group flex flex-col text-left bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md hover:border-blue-300 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <ProductThumbnail
            src={product.imageUrl}
            alt={product.name}
            className="aspect-square w-full p-4 border-b border-gray-100"
            iconClassName="w-10 h-10"
          />
          <div className="flex flex-col flex-1 p-4 gap-2">
            {product.category && (
              <span className="text-xs text-gray-500 truncate">{product.category}</span>
            )}
            <h3
              className="text-sm font-medium text-blue-600 group-hover:underline line-clamp-2 min-h-[2.5rem]"
              title={product.name}
            >
              {product.name}
            </h3>
            <div className="mt-auto flex items-end justify-between gap-2 pt-2">
              <span className="text-lg font-bold text-gray-900">
                {formatPrice(product.currentPrice)}
              </span>
              <span className="text-sm">
                <PriceChange product={product} />
              </span>
            </div>
            <span className="text-xs text-gray-500">
              Checked:{" "}
              {product.lastCheckedAt
                ? new Date(product.lastCheckedAt).toLocaleString("pl-PL")
                : "Never"}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
