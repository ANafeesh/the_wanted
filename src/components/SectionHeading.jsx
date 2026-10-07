import React, { useEffect, useRef, useState } from 'react';

/**
 * Section Heading with a subtle one-time reveal animation on viewport entry.
 * Light editorial theme styling.
 */
export default function SectionHeading({
  tag = '',
  title = '',
  subtitle = '',
  className = '',
  align = 'left',
  theme = 'light' // 'light' or 'dark'
}) {
  const containerRef = useRef(null);
  const [hasRevealed, setHasRevealed] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setHasRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  const alignClass = align === 'center' ? 'text-center items-center' : 'text-left items-start';
  const isDark = theme === 'dark';

  return (
    <div
      ref={containerRef}
      className={`flex flex-col mb-6 md:mb-8 ${alignClass} ${className}`}
    >
      {/* Title with Mask / Slide-up Reveal */}
      <div className="overflow-hidden">
        <h2
          className={`font-['Anton',sans-serif] text-3xl sm:text-4xl md:text-5xl tracking-wide uppercase leading-tight transition-transform duration-700 ease-out ${
            isDark ? 'text-[#f4f2ee]' : 'text-[#0a0a0b]'
          } ${
            hasRevealed || prefersReducedMotion ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          {title}
        </h2>
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p
          className={`font-['Work_Sans',sans-serif] text-sm md:text-base max-w-2xl mt-2 leading-relaxed transition-opacity duration-700 delay-150 ${
            isDark ? 'text-[#d6d3d0]' : 'text-[#5c5a5e]'
          } ${
            hasRevealed || prefersReducedMotion ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
