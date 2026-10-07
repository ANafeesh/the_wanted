import React from 'react';
import SectionHeading from './SectionHeading';
import ProductImage from './ProductImage';

/**
 * Shop By Category section.
 * - Dynamically extracts categories from products.json
 * - Uses first available photo of each category
 * - Clean 4:3 editorial ratio
 * - 3 columns on desktop, 2 on tablet, 1 on small phones
 * - Last tile spans remaining columns if not multiple of 3, preventing orphan tiles
 * - Click sets Shop filter and scrolls smoothly to #shop
 */
export default function CategoryTiles({ products = [], onSelectCategory }) {
  // Extract unique categories dynamically
  const categories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean))
  );

  if (categories.length === 0) return null;

  const handleTileClick = (category) => {
    if (onSelectCategory) {
      onSelectCategory(category);
    }
    const shopElem = document.getElementById('shop');
    if (shopElem) {
      shopElem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const count = categories.length;
  const remainderDesktop = count % 3;
  const remainderTablet = count % 2;

  return (
    <section
      id="shop-by-category"
      className="py-14 md:py-20 bg-[#f4f2ee] border-t border-[#dcd8d2] text-[#0a0a0b]"
      aria-label="Shop By Category"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="SHOP BY CATEGORY"
          subtitle="Explore the factory floor collection sorted by apparel categories."
          theme="light"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
          {categories.map((category, idx) => {
            const isLast = idx === count - 1;
            let spanClass = '';
            if (isLast) {
              if (remainderTablet === 1) {
                spanClass += ' md:col-span-2';
              }
              if (remainderDesktop === 1) {
                spanClass += ' lg:col-span-3';
              } else if (remainderDesktop === 2) {
                spanClass += ' lg:col-span-2';
              } else {
                spanClass += ' lg:col-span-1';
              }
            }

            // Find products in this category and get first available image
            const matchingProducts = products.filter((p) => p.category === category);
            const firstProductWithImage = matchingProducts.find(
              (p) => p.images && p.images.length > 0
            );
            const categoryImage = firstProductWithImage?.images?.[0];

            return (
              <div
                key={category}
                role="button"
                tabIndex={0}
                onClick={() => handleTileClick(category)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleTileClick(category);
                  }
                }}
                className={`group relative aspect-4/3 w-full bg-[#e9e5de] border border-[#dcd8d2] hover:border-[#0a0a0b] overflow-hidden cursor-pointer transition-all duration-300 shadow-xs hover:shadow-md focus-visible:outline-2 focus-visible:outline-[#e0261f] ${spanClass}`}
                aria-label={`Shop ${category} collection, ${matchingProducts.length} pieces`}
              >
                {/* 4:3 Category Photo */}
                {categoryImage ? (
                  <ProductImage
                    images={[categoryImage]}
                    alt={`${category} collection`}
                    animateReveal={true}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-[#e9e5de] p-4 text-center">
                    <span className="font-['Work_Sans',sans-serif] text-xs font-semibold uppercase tracking-wider text-[#5c5a5e]">
                      Photo coming soon
                    </span>
                  </div>
                )}

                {/* Subtle Readability Gradient behind Category Name */}
                <div
                  className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/85 via-black/45 to-transparent flex flex-col justify-end p-3.5 sm:p-4 pointer-events-none"
                  aria-hidden="true"
                >
                  <span className="font-mono text-[10px] font-bold text-[#e0261f] tracking-widest uppercase mb-0.5">
                    {matchingProducts.length} {matchingProducts.length === 1 ? 'PIECE' : 'PIECES'}
                  </span>
                  <h3 className="font-['Anton',sans-serif] text-base sm:text-xl md:text-2xl text-white tracking-wider uppercase leading-tight group-hover:translate-x-1 transition-transform">
                    {category}
                  </h3>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
