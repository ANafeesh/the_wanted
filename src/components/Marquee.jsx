import React from 'react';

/**
 * Editorial horizontal marquee kept as a dark contrast band.
 * Requirements:
 * - background: #0a0a0b
 * - text: white
 * - THE WANTED + star accents
 * - Slow movement, pauses on hover, disabled under reduced motion
 */
export default function Marquee({ className = '' }) {
  const content = (
    <div className="flex items-center space-x-8 px-4">
      <span className="font-['Anton',sans-serif] text-xl md:text-2xl tracking-[0.15em] text-white uppercase">
        THE WANTED
      </span>
      <span className="text-[#f58b25] text-lg select-none" aria-hidden="true">★</span>
      <span className="font-['Work_Sans',sans-serif] text-sm md:text-base font-semibold tracking-[0.2em] text-[#d6d3d0] uppercase">
        FACTORY OUTLET
      </span>
      <span className="text-[#e0261f] text-lg select-none" aria-hidden="true">★</span>
      <span className="font-['Anton',sans-serif] text-xl md:text-2xl tracking-[0.15em] text-white uppercase">
        THE WANTED
      </span>
      <span className="text-[#f58b25] text-lg select-none" aria-hidden="true">★</span>
      <span className="font-['Work_Sans',sans-serif] text-sm md:text-base font-semibold tracking-[0.2em] text-[#d6d3d0] uppercase">
        FACTORY SURPLUS
      </span>
      <span className="text-[#e0261f] text-lg select-none" aria-hidden="true">★</span>
    </div>
  );

  return (
    <aside
      className={`w-full overflow-hidden bg-[#0a0a0b] py-3.5 select-none text-white border-y border-black/40 ${className}`}
      aria-label="The Wanted Brand Marquee"
    >
      <div className="animate-marquee flex items-center">
        {content}
        {content}
        {content}
        {content}
      </div>
    </aside>
  );
}
