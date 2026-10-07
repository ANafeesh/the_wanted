import React, { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ProductImage from './ProductImage';
import { playTick } from '../utils/audio';
import { getProducts } from '../services/api';
import { SHOW_SAMPLE_TAG } from '../data/content';
import { ChevronLeft, ChevronRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

/**
 * New Arrivals Section:
 * - Desktop: GSAP pinned horizontal scroll that fits the viewport without clipping
 * - Top spacing accounts for the exact 72px navbar height
 * - Header, description, controls, and product cards are ALL visible simultaneously
 * - Proportionally sized cards (280px-320px desktop) with 4:5 image ratio
 * - Subtle center-card emphasis (scale 1.05, full opacity)
 * - Refined square controls with accessible labels
 * - Mobile (<720px): Native horizontal scrolling / scroll-snap (NO pinning)
 * - Tick sound on card center crossing via Web Audio API
 */
export default function NewArrivals({ onOpenQuickView, onAddToCart }) {
  const [products, setProducts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const cardsRef = useRef([]);
  const lastCenteredIndexRef = useRef(-1);
  const scrollTriggerInstanceRef = useRef(null);

  // Load products via service layer
  useEffect(() => {
    let isMounted = true;
    getProducts().then((data) => {
      if (isMounted) {
        setProducts(data || []);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Screen size & reduced motion detection
  useEffect(() => {
    const checkViewport = () => {
      setIsMobile(window.innerWidth < 720);
    };
    checkViewport();

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(motionQuery.matches);

    const handleMotionChange = (e) => setPrefersReducedMotion(e.matches);
    motionQuery.addEventListener('change', handleMotionChange);
    window.addEventListener('resize', checkViewport);

    return () => {
      motionQuery.removeEventListener('change', handleMotionChange);
      window.removeEventListener('resize', checkViewport);
    };
  }, []);

  // Center card detection to trigger tick sound
  const checkCenterCard = useCallback(() => {
    if (cardsRef.current.length === 0) return;

    const viewportCenter = window.innerWidth / 2;
    let closestIdx = -1;
    let minDistance = Infinity;

    cardsRef.current.forEach((card, idx) => {
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const cardCenter = rect.left + rect.width / 2;
      const distance = Math.abs(cardCenter - viewportCenter);

      if (distance < minDistance) {
        minDistance = distance;
        closestIdx = idx;
      }
    });

    if (closestIdx !== -1 && closestIdx !== lastCenteredIndexRef.current) {
      lastCenteredIndexRef.current = closestIdx;
      setCurrentIndex(closestIdx);
      playTick();
    }
  }, []);

  // Desktop GSAP ScrollTrigger Pinned Animation
  useEffect(() => {
    // Mobile or reduced motion uses native flow & scroll-snap
    if (isMobile || prefersReducedMotion || products.length === 0) {
      if (scrollTriggerInstanceRef.current) {
        scrollTriggerInstanceRef.current.kill();
        scrollTriggerInstanceRef.current = null;
      }
      return;
    }

    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const ctx = gsap.context(() => {
      // Calculate horizontal movement so cards slide smoothly across
      const getScrollAmount = () => -(track.scrollWidth - window.innerWidth + 120);

      const tween = gsap.to(track, {
        x: getScrollAmount,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          pin: true,
          scrub: 0.5,
          invalidateOnRefresh: true,
          start: 'top top',
          end: () => `+=${Math.max(track.scrollWidth - window.innerWidth + 400, 700)}`,
          onUpdate: () => {
            checkCenterCard();
          }
        }
      });

      scrollTriggerInstanceRef.current = tween.scrollTrigger;
    }, section);

    return () => {
      ctx.revert();
      if (scrollTriggerInstanceRef.current) {
        scrollTriggerInstanceRef.current.kill();
        scrollTriggerInstanceRef.current = null;
      }
    };
  }, [isMobile, prefersReducedMotion, products.length, checkCenterCard]);

  // Mobile scroll listener for center detection
  const handleMobileScroll = () => {
    if (isMobile || prefersReducedMotion) {
      checkCenterCard();
    }
  };

  // Manual Previous / Next navigation
  const scrollToIndex = (newIndex) => {
    const targetIdx = Math.max(0, Math.min(newIndex, products.length - 1));
    const targetCard = cardsRef.current[targetIdx];

    if (!targetCard) return;

    if (isMobile || prefersReducedMotion) {
      targetCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    } else {
      const st = scrollTriggerInstanceRef.current;
      if (st) {
        const totalCards = products.length;
        const progress = targetIdx / (totalCards - 1);
        const targetScroll = st.start + progress * (st.end - st.start);
        window.scrollTo({ top: targetScroll, behavior: 'smooth' });
      } else {
        targetCard.scrollIntoView({ behavior: 'smooth', inline: 'center' });
      }
    }

    if (targetIdx !== lastCenteredIndexRef.current) {
      lastCenteredIndexRef.current = targetIdx;
      setCurrentIndex(targetIdx);
      playTick();
    }
  };

  const handlePrev = () => scrollToIndex(currentIndex - 1);
  const handleNext = () => scrollToIndex(currentIndex + 1);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleNext();
    }
  };

  const formatPrice = (num) => `Rs. ${num?.toLocaleString('en-LK') || 0}`;

  if (products.length === 0) return null;

  return (
    <section
      id="new-arrivals"
      ref={sectionRef}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className="relative w-full bg-[#f4f2ee] text-[#0a0a0b] select-none focus-visible:outline-2 focus-visible:outline-[#e0261f] scroll-mt-[72px] sm:scroll-mt-20 md:scroll-mt-[84px]"
      aria-label="New Arrivals Interactive Showcase"
    >
      {/* 
        Container sizing:
        On desktop (pinned): Full viewport height (100vh / 100dvh), top padding is exactly 72px (navbar height),
        distributing header, cards, and controls neatly so nothing is ever clipped.
        On mobile/reduced motion: Flow container with normal vertical padding.
      */}
      <div
        className={`w-full flex flex-col justify-between ${
          isMobile || prefersReducedMotion
            ? 'pt-3 pb-12 sm:pt-20 sm:pb-16'
            : 'h-[100dvh] max-h-[1080px] pt-[72px] pb-4 overflow-hidden'
        }`}
      >
        {/* Header & Controls Bar */}
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 shrink-0 flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2">
          {/* Heading & Description */}
          <div>
            <h2 className="font-['Anton',sans-serif] text-3xl sm:text-4xl lg:text-5xl tracking-wide uppercase leading-tight text-[#0a0a0b]">
              NEW ARRIVALS
            </h2>
            <p className="font-['Work_Sans',sans-serif] text-xs sm:text-sm text-[#5c5a5e] max-w-xl mt-1 leading-snug">
              <span>Explore the latest factory arrivals. </span>
              <span className="touch-helper">Swipe to browse.</span>
              <span className="mouse-helper">Use arrow keys or buttons to navigate.</span>
            </p>
          </div>

          {/* Previous / Next Refined Square Controls */}
          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto" aria-label="New arrivals navigation">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="w-11 h-11 min-h-[44px] min-w-[44px] border border-[#dcd8d2] bg-white text-[#0a0a0b] flex items-center justify-center hover:bg-[#e0261f] hover:text-white hover:border-[#e0261f] disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-[#0a0a0b] disabled:hover:border-[#dcd8d2] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#e0261f]"
              aria-label="Previous arrivals"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <span className="font-mono text-xs tracking-widest text-[#5c5a5e] px-1 font-semibold min-w-14 text-center">
              {String(currentIndex + 1).padStart(2, '0')} / {String(products.length).padStart(2, '0')}
            </span>
            <button
              type="button"
              onClick={handleNext}
              disabled={currentIndex === products.length - 1}
              className="w-11 h-11 min-h-[44px] min-w-[44px] border border-[#dcd8d2] bg-white text-[#0a0a0b] flex items-center justify-center hover:bg-[#e0261f] hover:text-white hover:border-[#e0261f] disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-[#0a0a0b] disabled:hover:border-[#dcd8d2] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#e0261f]"
              aria-label="Next arrivals"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Horizontal Track Wrapper */}
        <div
          className={`w-full ${
            isMobile || prefersReducedMotion
              ? 'mt-6 overflow-hidden'
              : 'flex-1 flex items-center overflow-hidden py-2'
          }`}
        >
          <div
            ref={trackRef}
            onScroll={handleMobileScroll}
            className={`flex items-center ${
              isMobile || prefersReducedMotion
                ? 'overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar gap-4 px-4 pb-4'
                : 'w-max gap-5 lg:gap-6 px-6 sm:px-12 lg:px-20'
            }`}
            style={{ willChange: 'transform' }}
          >
            {products.map((product, idx) => {
              const isCenter = currentIndex === idx;
              const hasDiscount =
                typeof product.originalPrice === 'number' &&
                typeof product.price === 'number' &&
                product.originalPrice > product.price;

              const discountPercent = hasDiscount
                ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
                : 0;

              return (
                <div
                  key={product.id}
                  ref={(el) => (cardsRef.current[idx] = el)}
                  onClick={() => onOpenQuickView(product, { current: cardsRef.current[idx] })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenQuickView(product, { current: cardsRef.current[idx] });
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  className={`group relative shrink-0 bg-white border transition-all duration-300 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#e0261f] ${
                    isMobile || prefersReducedMotion
                      ? 'w-[76vw] max-w-[290px] snap-center shadow-xs'
                      : 'w-[260px] md:w-[280px] lg:w-[300px] xl:w-[320px]'
                  } ${
                    isCenter
                      ? 'scale-[1.05] z-10 border-[#0a0a0b] shadow-xl opacity-100'
                      : 'opacity-85 scale-[0.98] border-[#dcd8d2] hover:opacity-100 hover:border-[#0a0a0b]'
                  }`}
                  aria-label={`Quick view ${product.name}, price ${formatPrice(product.price)}`}
                >
                  {/* 4:5 Photo Container */}
                  <div className="relative aspect-4/5 w-full bg-[#e9e5de] overflow-hidden border-b border-[#dcd8d2]">
                    <ProductImage
                      images={product.images}
                      alt={product.name}
                      hoverable={true}
                      className="w-full h-full object-cover"
                    />

                    {/* Discount Badge */}
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

                    {/* Hover Quick View Ribbon */}
                    <div className="absolute bottom-0 inset-x-0 bg-[#0a0a0b]/90 py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity text-center">
                      <span className="font-['Anton',sans-serif] text-[11px] tracking-widest text-white uppercase">
                        QUICK VIEW
                      </span>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-3.5 sm:p-4 flex flex-col justify-between bg-white">
                    <div>
                      <div className="font-mono text-[10px] font-semibold tracking-wider text-[#5c5a5e] uppercase mb-0.5">
                        {product.category}
                      </div>
                      <h3 className="font-['Anton',sans-serif] text-base sm:text-lg text-[#0a0a0b] tracking-wide uppercase line-clamp-1 group-hover:text-[#e0261f] transition-colors">
                        {product.name}
                      </h3>
                    </div>

                    <div className="mt-2.5 pt-2.5 border-t border-[#dcd8d2] flex items-baseline justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className="font-['Anton',sans-serif] text-base text-[#0a0a0b]">
                          {formatPrice(product.price)}
                        </span>
                        {typeof product.originalPrice === 'number' && (
                          <span className="font-['Work_Sans',sans-serif] text-xs text-[#5c5a5e] line-through">
                            {formatPrice(product.originalPrice)}
                          </span>
                        )}
                      </div>
                      <span className="font-['Work_Sans',sans-serif] text-xs font-semibold text-[#e0261f] uppercase tracking-wider group-hover:translate-x-0.5 transition-transform">
                        VIEW →
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Small Bottom Clearance on desktop */}
        {!isMobile && !prefersReducedMotion && <div className="h-2 shrink-0" />}
      </div>
    </section>
  );
}
