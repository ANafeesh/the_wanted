import React, { useState, useEffect } from 'react';

/**
 * Fast purposeful Preloader component.
 * Preloads the initial frame sequence and displays brand logo and progress bar.
 */
export default function Preloader({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);
  const [totalFrames, setTotalFrames] = useState(192);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const isMobile = window.innerWidth < 720;
    const count = isMobile ? 96 : 192;
    setTotalFrames(count);

    const folder = isMobile ? 'mobile' : 'desktop';
    const images = new Array(count);
    let loaded = 0;

    const updateProgress = () => {
      loaded += 1;
      setLoadedCount(loaded);
      const pct = Math.round((loaded / count) * 100);
      setProgress(pct);

      if (loaded >= count) {
        setTimeout(() => {
          onComplete({ images, isMobile, count });
        }, 200);
      }
    };

    // Preload image sequence
    for (let i = 0; i < count; i++) {
      const frameNum = String(i + 1).padStart(3, '0');
      const src = `/frames/${folder}/frame_${frameNum}.webp`;
      const img = new Image();
      img.src = src;
      img.onload = () => {
        images[i] = img;
        updateProgress();
      };
      img.onerror = () => {
        images[i] = img;
        updateProgress();
      };
    }

    // Safety timeout (max 6s)
    const timeout = setTimeout(() => {
      if (loaded < count) {
        onComplete({ images, isMobile, count });
      }
    }, 6000);

    return () => clearTimeout(timeout);
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0a0a0b] flex items-center justify-center p-6 text-[#f4f2ee]"
      role="dialog"
      aria-label="Loading The Wanted Experience"
      aria-modal="true"
    >
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        {/* Brand Logo */}
        <div className="mb-8">
          {!logoError ? (
            <img
              src="/logo.png"
              alt="the WANTED"
              className="h-14 sm:h-16 w-auto object-contain block mx-auto"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="flex flex-col items-center leading-none">
              <div className="flex items-baseline gap-1">
                <span className="font-['Work_Sans',sans-serif] font-extrabold italic text-sm text-[#e0261f]">the</span>
                <span className="font-['Anton',sans-serif] text-3xl text-[#e0261f]">WANTED</span>
              </div>
              <div className="flex gap-1 text-[11px] text-[#f58b25] mt-1">
                <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar Track & Fill */}
        <div className="w-full h-1.5 bg-[#141416] border border-[#2a2a2d] overflow-hidden mb-4" aria-hidden="true">
          <div
            className="h-full bg-[#e0261f] transition-all duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Progress Metadata */}
        <div className="w-full flex justify-between items-center font-mono text-[11px] text-[#a09da0]">
          <span className="tracking-widest uppercase">
            INITIALIZING [{loadedCount}/{totalFrames}]
          </span>
          <span className="font-bold text-[#f4f2ee]">{progress}%</span>
        </div>
      </div>
    </div>
  );
}
