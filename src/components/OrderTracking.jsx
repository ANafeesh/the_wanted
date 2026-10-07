import React, { useState, useEffect } from 'react';
import SectionHeading from './SectionHeading';
import { getOrderStatus } from '../services/api';
import { siteContent } from '../data/content';
import { Search, CheckCircle2, Copy, Check, ExternalLink, Package, Clock, MapPin, AlertTriangle, Truck, Store, ArrowRight } from 'lucide-react';

const LAST_ORDER_KEY = 'the_wanted_last_order_ref_v1';

export default function OrderTracking({ config = null, initialReference = '' }) {
  const [reference, setReference] = useState(initialReference);
  const [phone, setPhone] = useState('');
  const [lastSavedRef, setLastSavedRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedTracking, setCopiedTracking] = useState(false);

  // Read last saved order reference on mount (no personal details stored)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAST_ORDER_KEY);
      if (saved) {
        setLastSavedRef(saved);
      }
    } catch {
      // Ignore storage error
    }
  }, []);

  // Sync if initialReference changes
  useEffect(() => {
    if (initialReference) {
      setReference(initialReference);
    }
  }, [initialReference]);

  const handleUseLastOrder = () => {
    if (lastSavedRef) {
      setReference(lastSavedRef);
      setErrorMessage('');
    }
  };

  const handleCopyTrackingNumber = (trackingNum) => {
    if (!trackingNum) return;
    navigator.clipboard.writeText(trackingNum).then(() => {
      setCopiedTracking(true);
      setTimeout(() => setCopiedTracking(false), 2000);
    }).catch(() => {});
  };

  const handleTrackSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setTrackedOrder(null);

    const cleanRef = reference.trim().toUpperCase();
    const cleanPhone = phone.trim();

    if (!cleanRef) {
      setErrorMessage('Please enter an order reference number (e.g. TW-123456).');
      return;
    }

    if (!cleanPhone) {
      setErrorMessage('Please enter the contact phone number used for this order.');
      return;
    }

    setLoading(true);

    try {
      const result = await getOrderStatus(cleanRef, cleanPhone);
      if (result) {
        setTrackedOrder(result);
      } else {
        setErrorMessage(siteContent.tracking.notFoundMessage);
      }
    } catch {
      setErrorMessage(siteContent.tracking.networkErrorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (num) => `Rs. ${num?.toLocaleString('en-LK') || 0}`;

  // Helper to determine step status in timeline
  const getStepState = (stepIndex, currentStatus, isPost) => {
    const postSteps = ['pending', 'confirmed', 'packed', 'posted', 'delivered'];
    const pickupSteps = ['pending', 'confirmed', 'ready_for_pickup', 'collected'];

    const stepOrder = isPost ? postSteps : pickupSteps;
    const currentIndex = stepOrder.indexOf(currentStatus);

    if (currentIndex === -1) {
      return 'pending'; // Fallback if cancelled / returned
    }

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  const isPost = trackedOrder?.fulfillment === 'post';
  const isCancelled = trackedOrder?.status === 'cancelled';
  const isReturned = trackedOrder?.status === 'returned';

  return (
    <section id="track-order" className="py-14 md:py-20 bg-[#f4f2ee] border-t border-[#dcd8d2] text-[#0a0a0b] scroll-mt-[72px] sm:scroll-mt-20 md:scroll-mt-[84px]" aria-label="Track Your Order">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title={siteContent.tracking.title}
          subtitle={siteContent.tracking.subtitle}
          theme="light"
        />

        {/* Tracking Lookup Form */}
        <div className="bg-white border border-[#dcd8d2] p-5 sm:p-7 shadow-xs">
          <form onSubmit={handleTrackSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="track-reference" className="block font-mono text-xs text-[#5c5a5e] uppercase tracking-wider mb-1 font-semibold">
                  ORDER REFERENCE *
                </label>
                <input
                  type="text"
                  id="track-reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder={siteContent.tracking.referencePlaceholder}
                  className="w-full p-2.5 sm:p-3 bg-white border border-[#dcd8d2] font-mono text-sm uppercase text-[#0a0a0b] focus:border-[#e0261f] focus-visible:outline-2 focus-visible:outline-[#e0261f]"
                />
              </div>

              <div>
                <label htmlFor="track-phone" className="block font-mono text-xs text-[#5c5a5e] uppercase tracking-wider mb-1 font-semibold">
                  PHONE NUMBER *
                </label>
                <input
                  type="tel"
                  id="track-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={siteContent.tracking.phonePlaceholder}
                  className="w-full p-2.5 sm:p-3 bg-white border border-[#dcd8d2] text-sm text-[#0a0a0b] focus:border-[#e0261f] focus-visible:outline-2 focus-visible:outline-[#e0261f]"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              {lastSavedRef ? (
                <button
                  type="button"
                  onClick={handleUseLastOrder}
                  className="text-xs font-mono text-[#e0261f] hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Track my last order ({lastSavedRef})</span>
                </button>
              ) : <div />}

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-[#e0261f] text-white font-['Anton',sans-serif] text-sm tracking-widest uppercase hover:bg-[#c81e18] transition-colors cursor-pointer border border-[#e0261f] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
                <span>{loading ? 'CHECKING STATUS...' : 'TRACK ORDER'}</span>
              </button>
            </div>
          </form>

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-4 p-3.5 bg-red-50 border border-red-300 text-red-900 text-xs font-mono flex items-start gap-2" role="alert">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Tracked Order Result */}
        {trackedOrder && (
          <div className="mt-8 bg-white border border-[#dcd8d2] p-5 sm:p-8 space-y-6 shadow-sm">
            {/* Order Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-5 border-b border-[#dcd8d2]">
              <div>
                <span className="font-mono text-xs text-[#5c5a5e] uppercase tracking-wider block">
                  ORDER REFERENCE
                </span>
                <span className="font-['Anton',sans-serif] text-2xl sm:text-3xl tracking-wider text-[#0a0a0b]">
                  {trackedOrder.reference}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs px-2.5 py-1 bg-[#f4f2ee] border border-[#dcd8d2] font-semibold uppercase flex items-center gap-1.5 text-[#0a0a0b]">
                  {isPost ? <Truck className="w-3.5 h-3.5 text-[#e0261f]" /> : <Store className="w-3.5 h-3.5 text-[#e0261f]" />}
                  {isPost ? 'DELIVERY BY POST' : 'SHOP COLLECTION'}
                </span>

                <span className={`font-mono text-xs px-2.5 py-1 uppercase font-bold text-white ${
                  isCancelled ? 'bg-red-700' : isReturned ? 'bg-amber-700' : 'bg-[#0a0a0b]'
                }`}>
                  {trackedOrder.status.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {/* Cancelled or Returned Warning Banner */}
            {isCancelled && (
              <div className="p-4 bg-red-50 border border-red-300 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs text-red-900">
                  <strong className="block font-bold uppercase mb-0.5">Order Cancelled</strong>
                  This order has been cancelled. For inquiries or re-ordering, please reach out via WhatsApp.
                </div>
              </div>
            )}

            {isReturned && (
              <div className="p-4 bg-amber-50 border border-amber-300 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900">
                  <strong className="block font-bold uppercase mb-0.5">Order Returned</strong>
                  This postal delivery has been returned to our outlet. Contact our team to arrange re-dispatch.
                </div>
              </div>
            )}

            {/* Progress Timeline */}
            {!isCancelled && !isReturned && (
              <div className="py-3">
                <span className="font-mono text-xs font-bold text-[#5c5a5e] uppercase tracking-wider block mb-4">
                  FULFILLMENT PROGRESS
                </span>

                {isPost ? (
                  /* Post Timeline: 5 steps */
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                      { name: 'Order placed', key: 'pending', time: trackedOrder.createdAt },
                      { name: 'Confirmed', key: 'confirmed' },
                      { name: 'Packed', key: 'packed' },
                      { name: 'Posted', key: 'posted', time: trackedOrder.postedAt },
                      { name: 'Delivered', key: 'delivered', time: trackedOrder.deliveredAt }
                    ].map((step, idx) => {
                      const state = getStepState(idx, trackedOrder.status, true);
                      const isComplete = state === 'completed';
                      const isCurrent = state === 'current';

                      return (
                        <div
                          key={step.key}
                          className={`p-3 border text-left flex flex-col justify-between transition-colors ${
                            isCurrent
                              ? 'border-[#0a0a0b] bg-[#f4f2ee] ring-1 ring-[#0a0a0b]'
                              : isComplete
                              ? 'border-emerald-300 bg-emerald-50'
                              : 'border-[#dcd8d2] bg-white opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-mono text-[10px] font-bold text-[#5c5a5e]">
                              STEP {idx + 1}
                            </span>
                            {isComplete && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                            {isCurrent && <Clock className="w-3.5 h-3.5 text-[#e0261f]" />}
                          </div>
                          <span className={`font-['Anton',sans-serif] text-xs sm:text-sm uppercase tracking-wide ${
                            isCurrent ? 'text-[#0a0a0b]' : isComplete ? 'text-emerald-900' : 'text-[#5c5a5e]'
                          }`}>
                            {step.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Pickup Timeline: 4 steps */
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { name: 'Order placed', key: 'pending', time: trackedOrder.createdAt },
                      { name: 'Confirmed', key: 'confirmed' },
                      { name: 'Ready for pickup', key: 'ready_for_pickup', time: trackedOrder.readyAt },
                      { name: 'Collected', key: 'collected', time: trackedOrder.collectedAt }
                    ].map((step, idx) => {
                      const state = getStepState(idx, trackedOrder.status, false);
                      const isComplete = state === 'completed';
                      const isCurrent = state === 'current';

                      return (
                        <div
                          key={step.key}
                          className={`p-3 border text-left flex flex-col justify-between transition-colors ${
                            isCurrent
                              ? 'border-[#0a0a0b] bg-[#f4f2ee] ring-1 ring-[#0a0a0b]'
                              : isComplete
                              ? 'border-emerald-300 bg-emerald-50'
                              : 'border-[#dcd8d2] bg-white opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-mono text-[10px] font-bold text-[#5c5a5e]">
                              STEP {idx + 1}
                            </span>
                            {isComplete && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                            {isCurrent && <Clock className="w-3.5 h-3.5 text-[#e0261f]" />}
                          </div>
                          <span className={`font-['Anton',sans-serif] text-xs sm:text-sm uppercase tracking-wide ${
                            isCurrent ? 'text-[#0a0a0b]' : isComplete ? 'text-emerald-900' : 'text-[#5c5a5e]'
                          }`}>
                            {step.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Postal Tracking Number & Tracking URL Link (if post) */}
            {isPost && (trackedOrder.trackingNumber || trackedOrder.trackingUrl) && (
              <div className="p-4 bg-[#f4f2ee] border border-[#dcd8d2] space-y-2">
                <span className="font-mono text-xs font-bold text-[#5c5a5e] uppercase tracking-wider block">
                  POSTAL DISPATCH TRACKING
                </span>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {trackedOrder.trackingNumber ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-[#0a0a0b]">
                        {trackedOrder.trackingNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyTrackingNumber(trackedOrder.trackingNumber)}
                        className="px-2 py-1 bg-white border border-[#dcd8d2] hover:border-[#0a0a0b] text-[11px] font-mono uppercase flex items-center gap-1 cursor-pointer"
                        aria-label="Copy tracking number"
                      >
                        {copiedTracking ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>COPIED</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>COPY</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : <div />}

                  {trackedOrder.trackingUrl && (
                    <a
                      href={trackedOrder.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0a0a0b] text-white font-['Anton',sans-serif] text-xs tracking-wider uppercase hover:bg-[#e0261f] transition-colors"
                    >
                      <span>Track with the post office</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Shop Pickup Ready Notification Banner (if pickup & ready_for_pickup) */}
            {!isPost && trackedOrder.status === 'ready_for_pickup' && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold uppercase text-xs font-mono">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>YOUR ORDER IS READY FOR PICKUP</span>
                </div>
                <div className="text-xs text-emerald-900 space-y-1">
                  <div><strong className="text-[#0a0a0b]">Address:</strong> {config?.shop?.address || 'Shop address'}</div>
                  <div><strong className="text-[#0a0a0b]">Hours:</strong> {config?.shop?.hours || 'Opening hours'}</div>
                  <div><strong className="text-[#0a0a0b]">Phone:</strong> {config?.shop?.phone || '+94 7X XXX XXXX'}</div>
                </div>
              </div>
            )}

            {/* Bank Transfer Instructions if unpaid */}
            {trackedOrder.paymentMethod === 'bank_transfer' && trackedOrder.paymentStatus === 'unpaid' && (
              <div className="p-4 bg-amber-50 border border-amber-300 space-y-2">
                <span className="font-mono text-xs font-bold text-amber-900 uppercase block tracking-wider">
                  PAYMENT REQUIRED: BANK TRANSFER
                </span>
                {trackedOrder.bankTransferInstructions ? (
                  <p className="font-mono text-xs text-amber-900 whitespace-pre-line">
                    {trackedOrder.bankTransferInstructions}
                  </p>
                ) : null}
                <p className="font-['Work_Sans',sans-serif] text-xs font-semibold text-amber-900 pt-1 border-t border-amber-200">
                  Your order is prepared after we confirm your payment.
                </p>
              </div>
            )}

            {/* Order Items & Totals Summary */}
            <div className="border border-[#dcd8d2] bg-[#f4f2ee] p-4">
              <span className="font-mono text-xs font-bold text-[#e0261f] uppercase tracking-wider block mb-2.5">
                ORDER ITEMS
              </span>
              <ul className="space-y-2 mb-3.5">
                {(trackedOrder.items || []).map((item, idx) => (
                  <li key={`${item.productId}-${item.size}-${idx}`} className="flex justify-between text-sm">
                    <span className="text-[#0a0a0b]">
                      {item.quantity}x {item.name || item.productId} ({item.size})
                    </span>
                    <span className="font-mono text-[#0a0a0b]">
                      {formatPrice((item.unitPrice || 0) * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="pt-2.5 border-t border-[#dcd8d2] space-y-1 text-sm">
                <div className="flex justify-between text-[#5c5a5e]">
                  <span>Subtotal:</span>
                  <span className="font-mono">{formatPrice(trackedOrder.subtotal)}</span>
                </div>
                {isPost && (
                  <div className="flex justify-between text-[#5c5a5e]">
                    <span>Shipping:</span>
                    <span className="font-mono">
                      {trackedOrder.shippingFee > 0
                        ? formatPrice(trackedOrder.shippingFee)
                        : (typeof config?.freeShippingThreshold === 'number' && config.freeShippingThreshold !== null && trackedOrder.subtotal >= config.freeShippingThreshold)
                        ? 'Free'
                        : 'Delivered by post'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-1.5 border-t border-[#dcd8d2] font-bold text-[#0a0a0b]">
                  <span className="font-['Anton',sans-serif] text-base uppercase">Total:</span>
                  <span className="font-['Anton',sans-serif] text-xl text-[#0a0a0b]">
                    {formatPrice(trackedOrder.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
