import React, { useRef, useState } from 'react';
import ProductImage from './ProductImage';
import { SHOW_SAMPLE_TAG } from '../data/content';
import { Plus, Check } from 'lucide-react';

/**
 * Compact image-first ProductCard for the light editorial theme.
 * - 4:5 aspect ratio with object-cover
 * - Second image fades in smoothly on hover (when available)
 * - Primary image zooms slightly on hover
 * - Price & original price crossed out (when available)
 * - Dynamic percentage discount
 * - Compact Quick Add button
 * - "Sample photo" tag when SHOW_SAMPLE_TAG && product.sample
 */
export default function ProductCard({
  product,
  onOpenQuickView,
  onAddToCart
}) {
  const cardRef = useRef(null);
  const [justAdded, setJustAdded] = useState(false);

  const hasDiscount =
    typeof product.originalPrice === 'number' &&
    typeof product.price === 'number' &&
    product.originalPrice > product.price;

  const discountPercent = hasDiscount
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const formatPrice = (num) => `Rs. ${num?.toLocaleString('en-LK') || 0}`;

  const handleCardClick = () => {
    if (onOpenQuickView) {
      onOpenQuickView(product, cardRef);
    }
  };

  const handleQuickAdd = (e) => {
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart({
        productId: product.id,
        size: product.sizes?.[0] || 'Standard'
      });
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1200);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick();
    }
  };

  return (
    <article
      ref={cardRef}
      tabIndex={0}
      role="button"
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      className="group relative flex flex-col bg-white border border-[#dcd8d2] hover:border-[#0a0a0b] transition-all duration-300 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#e0261f]"
      aria-label={`View ${product.name}, price ${formatPrice(product.price)}`}
    >
      {/* 4:5 Aspect Ratio Media Container */}
      <div className="relative aspect-4/5 w-full bg-[#e9e5de] overflow-hidden border-b border-[#dcd8d2]">
        <ProductImage
          images={product.images}
          alt={product.name}
          hoverable={true}
          animateReveal={true}
          className="w-full h-full object-cover"
        />

        {/* Dynamic Discount Badge */}
        {hasDiscount && (
          <div className="absolute top-2.5 left-2.5 z-10 bg-[#e0261f] text-white font-['Anton',sans-serif] text-[11px] px-2 py-0.5 tracking-wider uppercase">
            -{discountPercent}%
          </div>
        )}

        {/* Sample Photo Tag */}
        {SHOW_SAMPLE_TAG && product.sample && (
          <div className="absolute top-2.5 right-2.5 z-10 bg-[#0a0a0b]/85 text-white font-mono text-[9px] px-2 py-0.5 tracking-wider uppercase font-semibold">
            Sample photo
          </div>
        )}

        {/* Quick Add Overlay Button on desktop hover */}
        <div className="absolute bottom-0 inset-x-0 p-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            type="button"
            onClick={handleQuickAdd}
            className={`w-full py-2 px-3 font-['Anton',sans-serif] text-[11px] tracking-widest uppercase transition-colors flex items-center justify-center gap-1.5 cursor-pointer border ${
              justAdded
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'bg-[#0a0a0b] border-[#0a0a0b] text-white hover:bg-[#e0261f] hover:border-[#e0261f]'
            }`}
            aria-label={`Quick add ${product.name} to cart`}
          >
            {justAdded ? (
              <>
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                <span>ADDED</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>QUICK ADD</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Product Information */}
      <div className="p-3.5 sm:p-4 flex flex-col grow justify-between bg-white">
        <div>
          <div className="font-mono text-[10px] font-semibold tracking-wider text-[#5c5a5e] uppercase mb-0.5">
            {product.category}
          </div>
          <h3 className="font-['Anton',sans-serif] text-base sm:text-lg text-[#0a0a0b] tracking-wide uppercase line-clamp-1 group-hover:text-[#e0261f] transition-colors">
            {product.name}
          </h3>
        </div>

        {/* Pricing */}
        <div className="mt-2.5 pt-2.5 border-t border-[#dcd8d2] flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-['Anton',sans-serif] text-base text-[#0a0a0b]">
              {formatPrice(product.price)}
            </span>
            {typeof product.originalPrice === 'number' && product.originalPrice > product.price && (
              <span className="font-['Work_Sans',sans-serif] text-xs text-[#5c5a5e] line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
          <span className="font-['Work_Sans',sans-serif] text-xs font-semibold text-[#e0261f] tracking-wider uppercase group-hover:translate-x-0.5 transition-transform">
            VIEW →
          </span>
        </div>
      </div>
    </article>
  );
}
