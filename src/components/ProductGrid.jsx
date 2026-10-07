import React from 'react';
import ProductCard from './ProductCard';
import SectionHeading from './SectionHeading';

/**
 * Shop Section featuring dynamically generated category filters,
 * auto-fill grid with sensible minimum card width,
 * loading skeletons, and error retry state.
 */
export default function ProductGrid({
  products = [],
  loading = false,
  error = null,
  onRetry = null,
  activeCategory = 'ALL',
  onSelectCategory,
  onOpenQuickView,
  onAddToCart
}) {
  // Dynamically generate unique categories
  const uniqueCategories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean))
  );
  const categories = ['ALL', ...uniqueCategories];

  const filteredProducts = activeCategory === 'ALL'
    ? products
    : products.filter(
        (p) => p.category && p.category.toLowerCase() === activeCategory.toLowerCase()
      );

  return (
    <section id="shop" className="py-14 md:py-20 bg-[#f4f2ee] border-t border-[#dcd8d2] text-[#0a0a0b]" aria-label="Shop Outlet Collection">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="SHOP ALL PIECES"
          subtitle="Direct factory overrun garments and surplus stock. Filter by category below."
          theme="light"
        />

        {/* Dynamic Category Filter Bar */}
        {!loading && !error && products.length > 0 && categories.length > 1 && (
          <div
            className="flex flex-wrap gap-2 mb-8 pb-3 border-b border-[#dcd8d2]"
            role="tablist"
            aria-label="Filter products by category"
          >
            {categories.map((cat) => {
              const isActive = activeCategory.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onSelectCategory(cat)}
                  className={`px-3.5 py-1.5 font-['Anton',sans-serif] text-xs sm:text-sm tracking-wider uppercase transition-all cursor-pointer border focus-visible:outline-2 focus-visible:outline-[#e0261f] ${
                    isActive
                      ? 'bg-[#0a0a0b] border-[#0a0a0b] text-white shadow-xs'
                      : 'bg-white border-[#dcd8d2] text-[#0a0a0b] font-medium hover:border-[#0a0a0b]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )}

        {/* Loading Skeletons */}
        {loading ? (
          <div
            className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-4 sm:gap-6"
            aria-busy="true"
            aria-label="Loading products catalog"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
              <div key={idx} className="bg-white border border-[#dcd8d2] flex flex-col animate-pulse">
                <div className="aspect-4/5 w-full bg-[#e9e5de]" />
                <div className="p-3.5 sm:p-4 space-y-2.5">
                  <div className="h-2.5 w-1/3 bg-[#e7e4dd]" />
                  <div className="h-4 w-3/4 bg-[#e7e4dd]" />
                  <div className="pt-2.5 border-t border-[#dcd8d2] flex justify-between items-center">
                    <div className="h-4 w-1/3 bg-[#e7e4dd]" />
                    <div className="h-3 w-10 bg-[#e7e4dd]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error State with Try Again Button */
          <div className="py-16 px-6 border border-[#e0261f]/40 bg-white text-center my-6 shadow-xs" role="alert">
            <h3 className="font-['Anton',sans-serif] text-xl md:text-2xl tracking-wider text-[#e0261f] uppercase mb-2">
              UNABLE TO LOAD PRODUCTS
            </h3>
            <p className="font-['Work_Sans',sans-serif] text-sm text-[#5c5a5e] max-w-md mx-auto mb-5">
              {error}
            </p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="px-6 py-2.5 bg-[#0a0a0b] text-white font-['Anton',sans-serif] text-xs sm:text-sm tracking-widest uppercase hover:bg-[#e0261f] transition-colors cursor-pointer border border-[#0a0a0b] focus-visible:outline-2 focus-visible:outline-[#e0261f]"
              >
                TRY AGAIN
              </button>
            )}
          </div>
        ) : filteredProducts.length === 0 ? (
          /* Empty Filter State */
          <div className="py-16 px-6 border border-[#dcd8d2] bg-white text-center my-6 shadow-xs">
            <h3 className="font-['Anton',sans-serif] text-xl md:text-2xl tracking-wider text-[#0a0a0b] uppercase mb-1.5">
              New stock arriving soon
            </h3>
            <p className="font-['Work_Sans',sans-serif] text-xs sm:text-sm text-[#5c5a5e] max-w-md mx-auto">
              Check back shortly or follow our announcements for upcoming factory inventory updates.
            </p>
          </div>
        ) : (
          /* Auto-fill Product Grid */
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-4 sm:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onOpenQuickView={onOpenQuickView}
                onAddToCart={onAddToCart}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
