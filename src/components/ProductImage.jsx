import React, { useState, useEffect, useRef } from 'react';

/**
 * Clean photo-first ProductImage component.
 * - Shows neutral #e9e5de placeholder with correct aspect ratio while loading
 * - Reveals image smoothly starting 200px before entering viewport (run once)
 * - Visible by default, never leaving an empty area
 * - Fallback with #e9e5de on missing or broken images
 */
export default function ProductImage({
  images = [],
  alt = '',
  className = '',
  hoverable = false,
  activeIdx = 0,
  loading = 'lazy',
  animateReveal = true
}) {
  const [primaryFailed, setPrimaryFailed] = useState(false);
  const [secondaryFailed, setSecondaryFailed] = useState(false);
  const [isRevealed, setIsRevealed] = useState(!animateReveal);
  const [isLoaded, setIsLoaded] = useState(false);

  const containerRef = useRef(null);

  useEffect(() => {
    if (!animateReveal) {
      setIsRevealed(true);
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsRevealed(true);
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setIsRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRevealed(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px', threshold: 0 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [animateReveal]);

  const primaryImage = images && images.length > activeIdx ? images[activeIdx] : images?.[0];
  const secondaryImage = hoverable && images && images.length > 1 ? images[1] : null;

  if (!primaryImage || primaryFailed) {
    return (
      <div
        className={`w-full h-full bg-[#e9e5de] border border-[#dcd8d2] flex flex-col items-center justify-center p-4 text-center select-none ${className}`}
        aria-label={`${alt} - Photo coming soon`}
      >
        <span className="font-['Work_Sans',sans-serif] text-xs font-semibold uppercase tracking-wider text-[#5c5a5e]">
          Photo coming soon
        </span>
      </div>
    );
  }

  const primarySrc = primaryImage.startsWith('/') || primaryImage.startsWith('http') || primaryImage.startsWith('data:')
    ? primaryImage
    : `/products/${primaryImage}`;

  const secondarySrc = secondaryImage
    ? (secondaryImage.startsWith('/') || secondaryImage.startsWith('http') || secondaryImage.startsWith('data:')
      ? secondaryImage
      : `/products/${secondaryImage}`)
    : null;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-[#e9e5de] ${className}`}
    >
      {/* Primary Image */}
      <img
        src={primarySrc}
        alt={alt}
        loading={loading}
        onLoad={() => setIsLoaded(true)}
        onError={() => setPrimaryFailed(true)}
        className={`w-full h-full object-cover object-center transition-all duration-500 ease-out ${
          isRevealed && isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.98]'
        } ${
          hoverable && secondarySrc && !secondaryFailed
            ? 'group-hover:opacity-0 group-hover:scale-105'
            : hoverable
            ? 'group-hover:scale-105'
            : ''
        }`}
      />

      {/* Secondary Hover Image (fades in smoothly when available) */}
      {hoverable && secondarySrc && !secondaryFailed && (
        <img
          src={secondarySrc}
          alt={`${alt} - Detail View`}
          loading="lazy"
          onError={() => setSecondaryFailed(true)}
          className="absolute inset-0 w-full h-full object-cover object-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"
        />
      )}
    </div>
  );
}

