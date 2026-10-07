import React, { useEffect, useRef, useState } from 'react';
import { siteContent } from '../data/content';

/**
 * Interactive Hero Canvas Sequence with Lerp Smoothing.
 * - Dark & cinematic hero preserved
 * - Plain white text with soft text-shadow (no dark card/box/border)
 * - Tall smooth gradient transition at the bottom to #f4f2ee
 * - Top-anchored canvas image to keep "the WANTED" storefront sign fully visible
 */
export default function Hero({ preloadedData }) {
  const { hero } = siteContent;
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  const [currentProgress, setCurrentProgress] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const animFrameIdRef = useRef(null);
  const targetProgressRef = useRef(0);
  const currentProgressRef = useRef(0);
  const lastDrawnFrameRef = useRef(-1);

  const imagesRef = useRef({
    desktop: preloadedData?.isMobile ? null : preloadedData?.images,
    mobile: preloadedData?.isMobile ? preloadedData?.images : null,
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const isMobile = window.innerWidth < 720;
    const key = isMobile ? 'mobile' : 'desktop';

    if (!imagesRef.current[key]) {
      const count = isMobile ? 96 : 192;
      const folder = isMobile ? 'mobile' : 'desktop';
      const arr = new Array(count);

      for (let i = 0; i < count; i++) {
        const frameNum = String(i + 1).padStart(3, '0');
        const img = new Image();
        img.src = `/frames/${folder}/frame_${frameNum}.webp`;
        arr[i] = img;
      }
      imagesRef.current[key] = arr;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      lastDrawnFrameRef.current = -1;
      drawFrame(currentProgressRef.current);
    };

    const drawFrame = (progress) => {
      const activeFolder = window.innerWidth < 720 ? 'mobile' : 'desktop';
      const frameList = imagesRef.current[activeFolder];
      const count = activeFolder === 'mobile' ? 96 : 192;

      if (!frameList || frameList.length === 0) return;

      const frameIdx = Math.min(
        Math.max(Math.floor(progress * (count - 1)), 0),
        count - 1
      );

      const img = frameList[frameIdx];
      if (!img || !img.complete || img.naturalWidth === 0) return;

      const cw = canvas.width;
      const ch = canvas.height;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;

      let scale;
      let dw;
      let dh;
      let dx;
      let dy;

      const isPortrait = window.innerWidth < 720;
      if (isPortrait) {
        // Portrait screens (<720px): draw frame at about 62% of viewport height (using svh / canvas height)
        // With top just below the navbar (~72px), centered horizontally, cropping left and right sides
        dh = ch * 0.62;
        scale = dh / ih;
        dw = iw * scale;
        // Horizontally centered: keep center of the picture centered
        dx = (cw - dw) / 2;
        const dpr = cw / window.innerWidth;
        dy = 72 * dpr;
      } else {
        // Desktop / landscape screens: cover-fit anchored to top
        scale = Math.max(cw / iw, ch / ih);
        dw = iw * scale;
        dh = ih * scale;
        dx = (cw - dw) / 2;
        dy = 0; // Anchored to top so sign with "the" is never cropped
      }

      ctx.fillStyle = '#0a0a0b';
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, dx, dy, dw, dh);

      if (isPortrait) {
        const dpr = cw / window.innerWidth;
        // Soft gradient fade at top edge of the picture so there are no hard bands
        const fadeTopH = Math.min(dh * 0.1, 40 * dpr);
        const topGrad = ctx.createLinearGradient(0, dy, 0, dy + fadeTopH);
        topGrad.addColorStop(0, '#0a0a0b');
        topGrad.addColorStop(1, 'rgba(10, 10, 11, 0)');
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, dy, cw, fadeTopH);

        // Soft gradient fade at bottom edge of the picture so there are no hard bands
        const fadeBottomH = Math.min(dh * 0.14, 56 * dpr);
        const bottomGrad = ctx.createLinearGradient(0, dy + dh - fadeBottomH, 0, dy + dh);
        bottomGrad.addColorStop(0, 'rgba(10, 10, 11, 0)');
        bottomGrad.addColorStop(1, '#0a0a0b');
        ctx.fillStyle = bottomGrad;
        ctx.fillRect(0, dy + dh - fadeBottomH, cw, fadeBottomH);
      }

      lastDrawnFrameRef.current = frameIdx;
    };

    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const maxScroll = containerRef.current.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      const progress = Math.min(Math.max(scrolled / maxScroll, 0), 1);
      targetProgressRef.current = progress;
    };

    let lastReportedProgress = 0;
    const animate = () => {
      if (prefersReducedMotion) {
        if (lastDrawnFrameRef.current !== 0) {
          drawFrame(0);
        }
        animFrameIdRef.current = requestAnimationFrame(animate);
        return;
      }

      const diff = targetProgressRef.current - currentProgressRef.current;
      if (Math.abs(diff) > 0.0001) {
        currentProgressRef.current += diff * 0.14;
      } else {
        currentProgressRef.current = targetProgressRef.current;
      }

      drawFrame(currentProgressRef.current);

      if (Math.abs(currentProgressRef.current - lastReportedProgress) > 0.005) {
        lastReportedProgress = currentProgressRef.current;
        setCurrentProgress(currentProgressRef.current);
      }

      animFrameIdRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('scroll', handleScroll, { passive: true });

    resizeCanvas();
    handleScroll();
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('scroll', handleScroll);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [prefersReducedMotion]);

  const getStageOpacity = (stage) => {
    if (prefersReducedMotion) return stage === 1 ? 1 : 0;

    const p = currentProgress;
    if (stage === 1) {
      if (p <= 0.12) return 1;
      if (p <= 0.18) return (0.18 - p) / 0.06;
      return 0;
    }
    if (stage === 2) {
      if (p < 0.32) return 0;
      if (p <= 0.38) return (p - 0.32) / 0.06;
      if (p <= 0.58) return 1;
      if (p <= 0.64) return (0.64 - p) / 0.06;
      return 0;
    }
    if (stage === 3) {
      if (p < 0.82) return 0;
      if (p <= 0.88) return (p - 0.82) / 0.06;
      return 1;
    }
    return 0;
  };

  const stage1Opacity = getStageOpacity(1);
  const stage2Opacity = getStageOpacity(2);
  const stage3Opacity = getStageOpacity(3);

  const scrollToNewArrivals = () => {
    const elem = document.getElementById('new-arrivals');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="hero"
      ref={containerRef}
      className="relative w-full h-[300svh] bg-[#0a0a0b]"
      aria-label="The Wanted Hero Entrance Sequence"
    >
      {/* Sticky Fullscreen Canvas Area */}
      <div className="sticky top-0 left-0 w-full h-[100svh] overflow-hidden z-0">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover block"
          aria-hidden="true"
        />

        {/* Stage 1: Entrance Overlay (Plain white text, text in dark area below picture on phones) */}
        <div
          className="absolute inset-x-0 bottom-0 top-[calc(72px+62svh)] sm:top-0 sm:inset-0 flex flex-col items-center justify-center sm:justify-end pb-3 sm:pb-24 px-4 text-center pointer-events-none transition-transform duration-300"
          style={{
            opacity: stage1Opacity,
            pointerEvents: stage1Opacity > 0.1 ? 'auto' : 'none',
            transform: `translateY(${(1 - stage1Opacity) * 20}px)`
          }}
        >
          <div className="max-w-xl px-2 sm:px-4">
            <h1 className="font-['Anton',sans-serif] text-3xl sm:text-6xl md:text-7xl text-white tracking-wider uppercase leading-none drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]">
              {hero.stage1.title}
            </h1>
            <p className="font-['Work_Sans',sans-serif] text-xs sm:text-base md:text-lg text-[#f4f2ee] font-medium mt-1 sm:mt-2.5 max-w-lg mx-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
              {hero.stage1.desc}
            </p>
          </div>

          <div
            onClick={() => window.scrollBy({ top: window.innerHeight * 1.2, behavior: 'smooth' })}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                window.scrollBy({ top: window.innerHeight * 1.2, behavior: 'smooth' });
              }
            }}
            className="mt-2.5 sm:mt-5 flex flex-col items-center gap-0.5 sm:gap-1 cursor-pointer text-white hover:text-[#e0261f] transition-colors focus-visible:outline-2 focus-visible:outline-[#e0261f]"
            aria-label="Scroll to explore collection"
          >
            <span className="font-mono text-[10px] sm:text-xs font-bold tracking-widest uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
              {hero.stage1.scrollHint}
            </span>
            <span className="text-sm sm:text-lg animate-bounce drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]" aria-hidden="true">↓</span>
          </div>
        </div>

        {/* Stage 2: Middle Overlay */}
        <div
          className="absolute inset-x-0 bottom-0 top-[calc(72px+62svh)] sm:top-0 sm:inset-0 flex flex-col items-center justify-center px-4 text-center pointer-events-none transition-transform duration-300"
          style={{
            opacity: stage2Opacity,
            pointerEvents: stage2Opacity > 0.1 ? 'auto' : 'none',
            transform: `translateY(${(1 - stage2Opacity) * 20}px)`
          }}
        >
          <div className="max-w-lg p-2 sm:p-4">
            <span className="font-mono text-[10px] sm:text-xs font-bold tracking-[0.2em] text-[#e0261f] uppercase mb-1 sm:mb-2 block drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
              {hero.stage2.tag}
            </span>
            <h2 className="font-['Anton',sans-serif] text-2xl sm:text-5xl md:text-6xl text-white tracking-wider uppercase drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]">
              {hero.stage2.title}
            </h2>
            <p className="font-['Work_Sans',sans-serif] text-xs sm:text-base text-[#f4f2ee] font-medium mt-1 sm:mt-2.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
              {hero.stage2.desc}
            </p>
          </div>
        </div>

        {/* Stage 3: Arrival CTA Overlay */}
        <div
          className="absolute inset-x-0 bottom-0 top-[calc(72px+62svh)] sm:top-0 sm:inset-0 flex flex-col items-center justify-center px-4 text-center pointer-events-none transition-transform duration-300"
          style={{
            opacity: stage3Opacity,
            pointerEvents: stage3Opacity > 0.1 ? 'auto' : 'none',
            transform: `translateY(${(1 - stage3Opacity) * 20}px)`
          }}
        >
          <div className="max-w-lg p-2 sm:p-4">
            <span className="font-mono text-[10px] sm:text-xs font-bold tracking-[0.2em] text-[#e0261f] uppercase mb-1 sm:mb-2 block drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
              {hero.stage3.tag}
            </span>
            <h2 className="font-['Anton',sans-serif] text-2xl sm:text-5xl md:text-6xl text-white tracking-wider uppercase mb-1 sm:mb-2.5 drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]">
              {hero.stage3.title}
            </h2>
            <p className="font-['Work_Sans',sans-serif] text-xs sm:text-base text-[#f4f2ee] font-medium mb-2.5 sm:mb-5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
              {hero.stage3.desc}
            </p>
            <button
              type="button"
              onClick={scrollToNewArrivals}
              className="px-5 py-2.5 sm:px-6 sm:py-3.5 bg-[#e0261f] text-white font-['Anton',sans-serif] text-sm sm:text-base tracking-wider uppercase hover:bg-[#c81e18] transition-colors cursor-pointer border border-[#e0261f] focus-visible:outline-2 focus-visible:outline-white inline-flex items-center gap-2 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] min-h-[44px] min-w-[44px]"
            >
              <span>{hero.stage3.cta}</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Smooth gradient transition at the bottom of the hero into #f4f2ee (120px tall on mobile) */}
      <div
        className="absolute bottom-0 inset-x-0 h-[120px] sm:h-64 bg-gradient-to-b from-transparent via-[#0a0a0b]/80 via-35% via-[#242327]/60 via-65% to-[#f4f2ee] pointer-events-none z-10"
        aria-hidden="true"
      />
    </section>
  );
}
