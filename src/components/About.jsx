import React from 'react';
import { siteContent } from '../data/content';
import SectionHeading from './SectionHeading';
import { Truck, Store } from 'lucide-react';

/**
 * About Section (id="about") in light editorial theme.
 */
export default function About() {
  const { about, fulfillment } = siteContent;

  return (
    <section id="about" className="py-14 md:py-20 bg-[#f4f2ee] border-t border-[#dcd8d2] text-[#0a0a0b]" aria-label="About The Outlet">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title={about.title}
          subtitle={about.statement}
          theme="light"
        />

        {/* Fulfillment availability badge/banner */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[#dcd8d2] font-mono text-xs uppercase text-[#0a0a0b] font-semibold mb-6">
          <Truck className="w-4 h-4 text-[#e0261f]" />
          <span>{fulfillment?.line || 'Delivery by post or collect from our shop.'}</span>
          <Store className="w-4 h-4 text-[#e0261f]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 mt-2">
          {about.details.map((item, index) => (
            <div
              key={index}
              className="p-6 sm:p-7 bg-white border border-[#dcd8d2] hover:border-[#0a0a0b] transition-colors relative shadow-xs"
            >
              <h3 className="font-['Anton',sans-serif] text-lg sm:text-xl tracking-wider text-[#0a0a0b] uppercase mb-2">
                {item.title}
              </h3>
              <p className="font-['Work_Sans',sans-serif] text-sm text-[#5c5a5e] leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
