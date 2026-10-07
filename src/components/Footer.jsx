import React, { useState } from 'react';
import { siteContent } from '../data/content';
import { MapPin, MessageSquare, Store, Clock, Phone, Navigation } from 'lucide-react';

/**
 * Footer / Contact Section (id="contact").
 * - High-contrast text with minimum 15px font size
 * - "Visit our shop" block displaying address, hours, phone from config
 * - "Get directions" button shown ONLY when mapUrl is set
 * - WhatsApp contact and copyright
 */
export default function Footer({ config = null }) {
  const [logoError, setLogoError] = useState(false);
  const { contact, footer } = siteContent;

  const shopAddress = config?.shop?.address || contact.address;
  const shopHours = config?.shop?.hours || contact.hours;
  const shopPhone = config?.shop?.phone || contact.whatsApp;
  const mapUrl = config?.shop?.mapUrl?.trim();

  return (
    <footer id="contact" className="bg-[#0a0a0b] text-white pt-20 pb-14 border-t border-black text-[15px]" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-14 pb-14 border-b border-[#2a2a2d]">
          {/* Brand Column */}
          <div className="space-y-4">
            <a href="#hero" className="inline-block select-none focus-visible:outline-2 focus-visible:outline-[#e0261f]">
              {!logoError ? (
                <img
                  src="/logo.png"
                  alt="The Wanted"
                  className="h-11 w-auto object-contain block"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="flex flex-col leading-none">
                  <div className="flex items-baseline gap-1">
                    <span className="font-['Work_Sans',sans-serif] font-extrabold italic text-sm text-[#e0261f]">the</span>
                    <span className="font-['Anton',sans-serif] text-3xl text-[#e0261f]">WANTED</span>
                  </div>
                  <div className="flex gap-1 text-[15px] text-[#f58b25] mt-1" aria-hidden="true">
                    <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                  </div>
                </div>
              )}
            </a>
            <p className="font-['Work_Sans',sans-serif] text-[15px] text-[#d6d3d0] leading-relaxed">
              {footer.tagline}
            </p>
          </div>

          {/* Visit Our Shop Block */}
          <div className="space-y-3.5">
            <h3 className="font-['Anton',sans-serif] text-lg tracking-wider uppercase text-white flex items-center gap-2">
              <Store className="w-5 h-5 text-[#e0261f]" aria-hidden="true" />
              VISIT OUR SHOP
            </h3>
            <div className="space-y-2 text-[15px] text-[#d6d3d0] font-['Work_Sans',sans-serif]">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#e0261f] shrink-0 mt-1" />
                <address className="not-italic leading-relaxed">{shopAddress}</address>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-[#e0261f] shrink-0 mt-1" />
                <span>{shopHours}</span>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-[#e0261f] shrink-0 mt-1" />
                <span className="font-mono text-white">{shopPhone}</span>
              </div>

              {/* Get Directions Button ONLY when mapUrl is set */}
              {mapUrl ? (
                <div className="pt-2">
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-white text-[#0a0a0b] font-['Anton',sans-serif] text-[15px] uppercase tracking-wider hover:bg-[#e0261f] hover:text-white transition-colors"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Get directions</span>
                  </a>
                </div>
              ) : null}
            </div>
          </div>

          {/* WhatsApp Contact Column */}
          <div className="space-y-3.5">
            <h3 className="font-['Anton',sans-serif] text-lg tracking-wider uppercase text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#e0261f]" aria-hidden="true" />
              WHATSAPP CONTACT
            </h3>
            <div className="font-['Work_Sans',sans-serif] text-[15px] text-[#d6d3d0]">
              <p className="text-white font-mono font-medium text-[15px]">{contact.whatsApp}</p>
              <p className="text-[15px] text-[#d6d3d0] mt-1.5 leading-relaxed">{contact.note}</p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-[15px] font-mono text-[#d6d3d0]">
          <div>{footer.copyright}</div>
          <div className="tracking-widest uppercase text-[15px]">
            FACTORY OVERRUNS & SURPLUS STOCK
          </div>
        </div>
      </div>
    </footer>
  );
}
