import React, { useState, useEffect, useRef } from 'react';
import ProductImage from './ProductImage';
import { SHOW_SAMPLE_TAG } from '../data/content';
import { X, Check } from 'lucide-react';

/**
 * Accessible Product Quick View Modal with light editorial styling.
 */
export default function QuickViewModal({
  isOpen,
  onClose,
  product,
  onAddToCart,
  triggerRef
}) {
  const [selectedSize, setSelectedSize] = useState('');
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [justAdded, setJustAdded] = useState(false);

  const modalRef = useRef(null);
  const closeBtnRef = useRef(null);
  const previousActiveElement = useRef(null);

  useEffect(() => {
    if (product) {
      if (product.sizes && product.sizes.length > 0) {
        setSelectedSize(product.sizes[0]);
      } else {
        setSelectedSize('Standard');
      }
      setActiveImageIdx(0);
      setJustAdded(false);
    }
  }, [product]);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = triggerRef?.current || document.activeElement;
      document.body.style.overflow = 'hidden';

      setTimeout(() => {
        if (closeBtnRef.current) {
          closeBtnRef.current.focus();
        } else if (modalRef.current) {
          modalRef.current.focus();
        }
      }, 50);
    } else {
      document.body.style.overflow = '';
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, triggerRef]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        if (!modalRef.current) return;
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const hasDiscount =
    typeof product.originalPrice === 'number' &&
    typeof product.price === 'number' &&
    product.originalPrice > product.price;

  const discountPercent = hasDiscount
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const formatPrice = (num) => `Rs. ${num?.toLocaleString('en-LK') || 0}`;

  const handleAdd = () => {
    onAddToCart({
      productId: product.id,
      size: selectedSize || 'Standard'
    });

    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
  };

  const images = Array.isArray(product.images) ? product.images : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-view-title"
    >
      <div
        className="fixed inset-0 cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative z-10 w-full max-w-4xl max-h-[95dvh] md:max-h-[88dvh] overflow-y-auto bg-white border border-[#dcd8d2] text-[#0a0a0b] shadow-2xl flex flex-col md:flex-row focus-visible:outline-none"
      >
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-2 bg-white text-[#0a0a0b] hover:bg-[#e0261f] hover:text-white transition-colors cursor-pointer border border-[#dcd8d2] focus-visible:outline-2 focus-visible:outline-[#e0261f]"
          aria-label="Close product quick view"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>

        {/* Gallery Column */}
        <div className="w-full md:w-1/2 p-5 sm:p-6 md:p-8 flex flex-col border-b md:border-b-0 md:border-r border-[#dcd8d2] bg-[#f4f2ee]">
          <div className="relative aspect-4/5 w-full bg-[#e9e5de] border border-[#dcd8d2] overflow-hidden">
            {images.length > 0 ? (
              <ProductImage
                images={images}
                activeIdx={activeImageIdx}
                alt={product.name}
                animateReveal={false}
                className="w-full h-full object-cover"
                loading="eager"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 text-[#5c5a5e]">
                <span className="font-['Work_Sans',sans-serif] text-xs font-semibold uppercase tracking-wider">
                  Photo coming soon
                </span>
              </div>
            )}

            {hasDiscount && (
              <div className="absolute top-2.5 left-2.5 bg-[#e0261f] text-white font-['Anton',sans-serif] text-xs px-2.5 py-1 tracking-wider uppercase">
                -{discountPercent}%
              </div>
            )}

            {SHOW_SAMPLE_TAG && product.sample && (
              <div className="absolute top-2.5 right-2.5 bg-[#0a0a0b]/85 text-white font-mono text-[9px] px-2 py-0.5 tracking-wider uppercase font-semibold">
                Sample photo
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-2.5 mt-3 overflow-x-auto pb-1" role="tablist" aria-label="Product image thumbnails">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  role="tab"
                  aria-selected={activeImageIdx === idx}
                  onClick={() => setActiveImageIdx(idx)}
                  className={`w-14 h-18 shrink-0 border cursor-pointer p-0.5 bg-white transition-all focus-visible:outline-2 focus-visible:outline-[#e0261f] ${
                    activeImageIdx === idx ? 'border-[#0a0a0b] shadow-xs' : 'border-[#dcd8d2] hover:border-[#5c5a5e]'
                  }`}
                  aria-label={`View photo ${idx + 1} of ${product.name}`}
                >
                  <img
                    src={img.startsWith('/') ? img : `/products/${img}`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info Column */}
        <div className="w-full md:w-1/2 p-5 sm:p-6 md:p-8 flex flex-col justify-between bg-white">
          <div>
            <div className="font-mono text-xs font-bold tracking-[0.2em] text-[#e0261f] uppercase mb-1.5">
              {product.category}
            </div>

            <h2
              id="quick-view-title"
              className="font-['Anton',sans-serif] text-2xl sm:text-3xl lg:text-4xl tracking-wider uppercase text-[#0a0a0b] leading-tight mb-3"
            >
              {product.name}
            </h2>

            <div className="flex items-baseline gap-3 mb-4 pb-4 border-b border-[#dcd8d2]">
              <span className="font-['Anton',sans-serif] text-2xl sm:text-3xl text-[#0a0a0b] tracking-wide">
                {formatPrice(product.price)}
              </span>
              {typeof product.originalPrice === 'number' && product.originalPrice > product.price && (
                <span className="font-['Work_Sans',sans-serif] text-sm text-[#5c5a5e] line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>

            {product.description && (
              <div className="mb-5">
                <div className="font-mono text-[11px] font-semibold text-[#5c5a5e] uppercase tracking-wider mb-1">
                  DETAILS:
                </div>
                <p className="font-['Work_Sans',sans-serif] text-sm text-[#5c5a5e] leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            {product.sizes && product.sizes.length > 0 && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-[11px] font-semibold text-[#5c5a5e] uppercase tracking-wider">
                    AVAILABLE SIZES
                  </span>
                </div>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Select size">
                  {product.sizes.map((size) => {
                    const isSelected = selectedSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setSelectedSize(size)}
                        className={`min-w-10 h-10 px-2.5 border font-['Anton',sans-serif] text-xs sm:text-sm tracking-wider uppercase transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[#e0261f] ${
                          isSelected
                            ? 'bg-[#0a0a0b] border-[#0a0a0b] text-white'
                            : 'bg-white border-[#dcd8d2] text-[#0a0a0b] hover:border-[#0a0a0b]'
                        }`}
                        aria-label={`Size ${size}`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#dcd8d2]">
            <button
              type="button"
              onClick={handleAdd}
              className={`w-full py-3.5 px-5 font-['Anton',sans-serif] text-base tracking-widest uppercase flex items-center justify-center gap-2.5 transition-colors cursor-pointer border focus-visible:outline-2 focus-visible:outline-offset-2 ${
                justAdded
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-[#e0261f] border-[#e0261f] text-white hover:bg-[#c81e18]'
              }`}
            >
              {justAdded ? (
                <>
                  <Check className="w-4 h-4" aria-hidden="true" />
                  <span>ADDED TO BAG</span>
                </>
              ) : (
                <>
                  <span>ADD TO BAG</span>
                  <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
