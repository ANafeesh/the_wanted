import React, { useEffect, useRef } from 'react';
import { X, Plus, Minus, Trash2, Truck, Store } from 'lucide-react';
import { siteContent } from '../data/content';

/**
 * Slide-in Cart Drawer in light editorial theme.
 * - Stores/receives only { productId, size, quantity }
 * - Never stores or trusts prices on client
 * - Displays prices and product metadata by looking up product by id
 * - Fulfillment summary line allowing customer to choose delivery by post or shop collection
 * - Estimated total with shipping calculation from config
 */
export default function Cart({
  isOpen,
  onClose,
  items = [],
  products = [],
  config = null,
  fulfillment = 'post',
  onFulfillmentChange,
  onUpdateQuantity,
  onRemoveItem,
  onOpenCheckout
}) {
  const drawerRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        if (drawerRef.current) {
          drawerRef.current.focus();
        }
      }, 50);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const getProduct = (productId) => products.find((p) => p.id === productId);

  const subtotal = items.reduce((sum, item) => {
    const p = getProduct(item.productId);
    return sum + (Number(p?.price) || 0) * item.quantity;
  }, 0);

  // Shipping calculation
  const isPost = fulfillment === 'post';
  let shippingFee = 0;
  let shippingDisplay = '';

  if (isPost) {
    const threshold = config?.freeShippingThreshold;
    const hasFreeThreshold = typeof threshold === 'number' && threshold !== null;
    const isFree = hasFreeThreshold && subtotal >= threshold;

    if (isFree) {
      shippingFee = 0;
      shippingDisplay = 'Free';
    } else if (typeof config?.shippingFee === 'number' && config.shippingFee > 0) {
      shippingFee = config.shippingFee;
      shippingDisplay = `Rs. ${config.shippingFee.toLocaleString('en-LK')}`;
    } else {
      shippingFee = 0;
      shippingDisplay = 'Delivered by post';
    }
  }

  const estimatedTotal = subtotal + shippingFee;
  const formatPrice = (num) => `Rs. ${num?.toLocaleString('en-LK') || 0}`;

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Cart Bag"
    >
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        ref={drawerRef}
        tabIndex={-1}
        className={`fixed top-0 right-0 h-[100dvh] w-full max-w-full sm:max-w-md bg-white border-l border-[#dcd8d2] text-[#0a0a0b] shadow-2xl flex flex-col justify-between transition-transform duration-300 ease-out z-10 focus-visible:outline-none ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#dcd8d2] flex items-center justify-between bg-white">
          <div>
            <div className="font-mono text-xs font-bold tracking-widest text-[#e0261f] uppercase mb-0.5">
              BAG ({items.length} {items.length === 1 ? 'ITEM' : 'ITEMS'})
            </div>
            <h2 className="font-['Anton',sans-serif] text-xl sm:text-2xl tracking-wider uppercase text-[#0a0a0b]">
              YOUR ORDER
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center border border-[#dcd8d2] bg-[#f4f2ee] text-[#0a0a0b] hover:bg-[#e0261f] hover:text-white hover:border-[#e0261f] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#e0261f]"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Item List / Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 bg-[#f4f2ee]">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <span className="font-['Anton',sans-serif] text-xl sm:text-2xl tracking-wider text-[#5c5a5e] uppercase mb-2">
                YOUR BAG IS EMPTY
              </span>
              <p className="font-['Work_Sans',sans-serif] text-sm text-[#5c5a5e] max-w-xs mb-6">
                Explore the outlet collection to add factory surplus pieces to your cart.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 min-h-[44px] border border-[#dcd8d2] bg-white font-['Anton',sans-serif] text-sm tracking-wider uppercase text-[#0a0a0b] hover:border-[#0a0a0b] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#e0261f]"
              >
                CONTINUE SHOPPING
              </button>
            </div>
          ) : (
            items.map((item) => {
              const product = getProduct(item.productId);
              const productName = product?.name || 'Item';
              const productPrice = Number(product?.price) || 0;
              const imageSrc = product?.images?.[0]
                ? (product.images[0].startsWith('/') ? product.images[0] : `/products/${product.images[0]}`)
                : '';

              return (
                <div
                  key={`${item.productId}-${item.size}`}
                  className="p-3.5 sm:p-4 bg-white border border-[#dcd8d2] flex gap-3.5 items-start shadow-xs"
                >
                  {/* Thumbnail */}
                  <div className="w-18 h-22 sm:w-20 sm:h-24 shrink-0 bg-[#e9e5de] border border-[#dcd8d2] overflow-hidden">
                    {imageSrc ? (
                      <img
                        src={imageSrc}
                        alt={productName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-center p-1 text-[10px] font-mono text-[#5c5a5e]">
                        NO PHOTO
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between h-22 sm:h-24">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className="font-['Anton',sans-serif] text-sm sm:text-base text-[#0a0a0b] tracking-wide uppercase line-clamp-1">
                          {productName}
                        </h3>
                        <span className="font-mono text-xs text-[#5c5a5e] block mt-0.5">
                          SIZE: {item.size}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.productId, item.size)}
                        className="text-[#5c5a5e] hover:text-[#e0261f] transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                        aria-label={`Remove ${productName} size ${item.size} from cart`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Quantity and Price */}
                    <div className="flex justify-between items-center pt-2 border-t border-[#dcd8d2]">
                      <div className="flex items-center border border-[#dcd8d2] bg-[#f4f2ee]">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.productId, item.size, item.quantity - 1)}
                          className="w-7 h-7 sm:w-7 sm:h-7 flex items-center justify-center text-[#0a0a0b] hover:bg-[#dcd8d2] transition-colors cursor-pointer"
                          aria-label={`Decrease quantity of ${productName}`}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono text-xs px-2 sm:px-2.5 font-bold text-[#0a0a0b]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.productId, item.size, item.quantity + 1)}
                          className="w-7 h-7 sm:w-7 sm:h-7 flex items-center justify-center text-[#0a0a0b] hover:bg-[#dcd8d2] transition-colors cursor-pointer"
                          aria-label={`Increase quantity of ${productName}`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="font-['Anton',sans-serif] text-sm sm:text-base text-[#0a0a0b]">
                        {formatPrice(productPrice * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer, Fulfillment Choice Summary & Checkout Trigger */}
        {items.length > 0 && (
          <div className="p-5 sm:p-6 border-t border-[#dcd8d2] bg-white space-y-4">
            {/* Fulfillment choice summary selector */}
            <div className="p-3 bg-[#f4f2ee] border border-[#dcd8d2] space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[11px] font-bold text-[#5c5a5e] uppercase tracking-wider">
                  RECEIVING ORDER VIA
                </span>
                <span className="font-mono text-[10px] text-[#e0261f] uppercase font-semibold">
                  {isPost ? 'ISLANDWIDE POST' : 'SHOP PICKUP'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Select fulfillment method">
                <button
                  type="button"
                  role="radio"
                  aria-checked={isPost}
                  onClick={() => onFulfillmentChange && onFulfillmentChange('post')}
                  className={`p-2 min-h-[44px] border text-left flex items-center gap-2 transition-colors cursor-pointer ${
                    isPost
                      ? 'border-[#0a0a0b] bg-white shadow-xs text-[#0a0a0b]'
                      : 'border-[#dcd8d2] bg-[#f4f2ee] text-[#5c5a5e] hover:border-[#5c5a5e]'
                  }`}
                >
                  <Truck className={`w-4 h-4 shrink-0 ${isPost ? 'text-[#e0261f]' : 'text-[#5c5a5e]'}`} />
                  <span className="font-['Anton',sans-serif] text-xs uppercase tracking-wide">
                    Delivery by post
                  </span>
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={!isPost}
                  onClick={() => onFulfillmentChange && onFulfillmentChange('pickup')}
                  className={`p-2 min-h-[44px] border text-left flex items-center gap-2 transition-colors cursor-pointer ${
                    !isPost
                      ? 'border-[#0a0a0b] bg-white shadow-xs text-[#0a0a0b]'
                      : 'border-[#dcd8d2] bg-[#f4f2ee] text-[#5c5a5e] hover:border-[#5c5a5e]'
                  }`}
                >
                  <Store className={`w-4 h-4 shrink-0 ${!isPost ? 'text-[#e0261f]' : 'text-[#5c5a5e]'}`} />
                  <span className="font-['Anton',sans-serif] text-xs uppercase tracking-wide">
                    Shop collection
                  </span>
                </button>
              </div>
            </div>

            {/* Totals Breakdown */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between items-baseline text-[#5c5a5e]">
                <span className="font-mono text-xs uppercase">SUBTOTAL</span>
                <span className="font-mono text-sm text-[#0a0a0b] font-medium">{formatPrice(subtotal)}</span>
              </div>

              {/* Shipping line: only shown for post */}
              {isPost && (
                <div className="flex justify-between items-baseline text-[#5c5a5e]">
                  <span className="font-mono text-xs uppercase">SHIPPING (POST)</span>
                  <span className="font-mono text-sm text-[#0a0a0b] font-medium">
                    {shippingDisplay}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-[#dcd8d2] flex justify-between items-baseline">
                <div>
                  <span className="font-['Anton',sans-serif] text-xs sm:text-sm tracking-widest text-[#5c5a5e] uppercase block">
                    ESTIMATED TOTAL:
                  </span>
                  <span className="text-[10px] font-mono text-[#5c5a5e]">
                    {isPost ? 'Delivered by post' : 'Collect from our shop'}
                  </span>
                </div>
                <span className="font-['Anton',sans-serif] text-xl sm:text-2xl text-[#0a0a0b]">
                  {formatPrice(estimatedTotal)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenCheckout}
              className="w-full py-3.5 min-h-[44px] bg-[#e0261f] text-white font-['Anton',sans-serif] text-base sm:text-lg tracking-widest uppercase hover:bg-[#c81e18] transition-colors cursor-pointer border border-[#e0261f] flex items-center justify-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <span>PROCEED TO CHECKOUT</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
