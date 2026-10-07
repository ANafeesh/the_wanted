import React, { useState, useEffect, useRef } from 'react';
import { createOrder } from '../services/api';
import { SRI_LANKA_DISTRICTS } from '../data/districts';
import { siteContent } from '../data/content';
import { X, CheckCircle2, AlertCircle, Truck, Store, MapPin, Clock, Phone, Building2 } from 'lucide-react';

const LAST_ORDER_KEY = 'the_wanted_last_order_ref_v1';

/**
 * Checkout Modal supporting:
 * - Fulfillment choice: "Delivery by post" vs "Collect from our shop" (remembered in session)
 * - Dynamic fields & validation based on fulfillment
 * - Dynamic payment methods based on fulfillment & store config
 * - Exact backend order contract: no prices or fees sent
 * - Live totals estimate & final returned totals on confirmation
 */
export default function CheckoutModal({
  isOpen,
  onClose,
  items = [],
  products = [],
  config = null,
  fulfillment = 'post',
  onFulfillmentChange,
  onOrderSuccess,
  onNavigateToTracking
}) {
  const [currentFulfillment, setCurrentFulfillment] = useState(fulfillment);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    district: 'Colombo',
    paymentMethod: 'cod',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [submitError, setSubmitError] = useState('');

  const modalRef = useRef(null);

  // Sync fulfillment prop when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentFulfillment(fulfillment || 'post');
    }
  }, [isOpen, fulfillment]);

  // Adjust payment method whenever fulfillment changes to match enabled methods
  useEffect(() => {
    const isPost = currentFulfillment === 'post';
    const enabledMethods = config?.enabledPaymentMethods?.[currentFulfillment] || (
      isPost ? ['cod', 'bank_transfer'] : ['pay_at_shop', 'bank_transfer']
    );

    // If current payment method is not valid for this fulfillment or disabled, reset
    if (!enabledMethods.includes(formData.paymentMethod)) {
      setFormData((prev) => ({
        ...prev,
        paymentMethod: enabledMethods[0] || (isPost ? 'cod' : 'pay_at_shop')
      }));
    }
  }, [currentFulfillment, config]);

  // Modal keyboard and scroll lock
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        if (completedOrder) {
          handleFinish();
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        if (modalRef.current) {
          modalRef.current.focus();
        }
      }, 50);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, completedOrder, onClose]);

  if (!isOpen) return null;

  const getProduct = (productId) => products.find((p) => p.id === productId);

  // Client-only subtotal estimate from looked up products
  const subtotal = items.reduce((sum, it) => {
    const p = getProduct(it.productId);
    return sum + (Number(p?.price) || 0) * it.quantity;
  }, 0);

  // Estimated shipping fee
  const isPost = currentFulfillment === 'post';
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

  const handleSelectFulfillment = (newFulfillment) => {
    setCurrentFulfillment(newFulfillment);
    if (onFulfillmentChange) {
      onFulfillmentChange(newFulfillment);
    }
    // Clear errors when toggling fulfillment
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (submitError) {
      setSubmitError('');
    }
  };

  const validate = () => {
    const errs = {};

    if (!formData.name.trim()) {
      errs.name = 'Full name is required.';
    }

    const phoneRaw = formData.phone.trim();
    if (!phoneRaw) {
      errs.phone = 'Phone number is required.';
    } else {
      // Sri Lankan phone validation: accepts 07XXXXXXXX, +94 7XXXXXXXX, 07X XXX XXXX, etc.
      const cleaned = phoneRaw.replace(/[\s\-()]/g, '');
      const isValidSLPhone = /^(?:07\d{8}|\+947\d{8}|947\d{8}|0\d{9}|\+94\d{9})$/.test(cleaned);
      if (!isValidSLPhone) {
        errs.phone = 'Please enter a valid Sri Lankan phone number (e.g. 07XXXXXXXX or +94 7XXXXXXXX).';
      }
    }

    // Postal delivery specific fields
    if (isPost) {
      if (!formData.address.trim()) {
        errs.address = 'Street delivery address is required.';
      }

      if (!formData.city.trim()) {
        errs.city = 'City is required.';
      }

      const postal = formData.postalCode.trim();
      if (!postal) {
        errs.postalCode = 'Postal code is required.';
      } else if (!/^\d{5}$/.test(postal)) {
        errs.postalCode = 'Postal code must be exactly 5 digits (e.g., 00300).';
      }

      if (!formData.district) {
        errs.district = 'Please select a district.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    // Exact backend contract payload:
    // { fulfillment: "post" | "pickup", customer: { name, phone, address?, city?, postalCode?, district? }, paymentMethod: "cod" | "bank_transfer" | "pay_at_shop", items: [{ productId, size, quantity }], notes? }
    const orderPayload = {
      fulfillment: currentFulfillment,
      customer: {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        ...(isPost ? {
          address: formData.address.trim(),
          city: formData.city.trim(),
          postalCode: formData.postalCode.trim(),
          district: formData.district
        } : {})
      },
      paymentMethod: formData.paymentMethod,
      items: items.map((it) => ({
        productId: it.productId,
        size: it.size,
        quantity: it.quantity
      })),
      notes: formData.notes ? formData.notes.trim() : ''
    };

    try {
      const result = await createOrder(orderPayload);
      if (result && (result.reference || result.orderId)) {
        const orderSummary = result.order || result;
        setCompletedOrder(orderSummary);

        // Remember only the order reference in localStorage (no personal details)
        try {
          localStorage.setItem(LAST_ORDER_KEY, orderSummary.reference || orderSummary.id);
        } catch {
          // Ignore storage error
        }

        if (onOrderSuccess) {
          onOrderSuccess();
        }
      } else {
        setSubmitError('Unable to place order. Please verify your details and try again.');
      }
    } catch (err) {
      setSubmitError(err?.message || 'Unable to place order at this time. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    setCompletedOrder(null);
    onClose();
  };

  const handleTrackCreatedOrder = () => {
    const ref = completedOrder?.reference || completedOrder?.id;
    handleFinish();
    if (onNavigateToTracking) {
      onNavigateToTracking(ref);
    }
  };

  // Enabled payment methods from config
  const enabledPaymentMethods = config?.enabledPaymentMethods?.[currentFulfillment] || (
    isPost ? ['cod', 'bank_transfer'] : ['pay_at_shop', 'bank_transfer']
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
    >
      <div
        className="fixed inset-0 cursor-pointer"
        onClick={completedOrder ? handleFinish : onClose}
        aria-hidden="true"
      />

      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative z-10 w-full max-w-2xl max-h-[95dvh] sm:max-h-[90dvh] overflow-y-auto bg-white border border-[#dcd8d2] text-[#0a0a0b] shadow-2xl p-5 sm:p-8 focus-visible:outline-none"
      >
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b border-[#dcd8d2] mb-5">
          <div>
            <div className="font-mono text-xs font-bold tracking-widest text-[#e0261f] uppercase mb-1">
              {completedOrder ? 'TRANSACTION COMPLETE' : 'CHECKOUT DISPATCH'}
            </div>
            <h2
              id="checkout-modal-title"
              className="font-['Anton',sans-serif] text-2xl sm:text-3xl tracking-wider uppercase text-[#0a0a0b]"
            >
              {completedOrder ? 'ORDER CONFIRMED' : 'OUTLET CHECKOUT'}
            </h2>
            <p className="font-['Work_Sans',sans-serif] text-xs text-[#5c5a5e] mt-1">
              {siteContent.fulfillment.line}
            </p>
          </div>
          <button
            type="button"
            onClick={completedOrder ? handleFinish : onClose}
            className="p-2 border border-[#dcd8d2] bg-[#f4f2ee] text-[#0a0a0b] hover:bg-[#e0261f] hover:text-white hover:border-[#e0261f] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#e0261f]"
            aria-label="Close checkout"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        {completedOrder ? (
          <div className="space-y-5">
            <div className="p-4 border border-emerald-300 bg-emerald-50 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" aria-hidden="true" />
              <div>
                <span className="font-['Anton',sans-serif] text-lg text-emerald-900 tracking-wider uppercase block">
                  Order confirmed
                </span>
                <span className="font-mono text-xs text-emerald-700 font-bold">
                  REFERENCE NUMBER: {completedOrder.reference || completedOrder.id}
                </span>
              </div>
            </div>

            {/* Bank Transfer Instructions if applicable */}
            {completedOrder.paymentMethod === 'bank_transfer' && (
              <div className="p-4 bg-amber-50 border border-amber-300 space-y-2">
                <span className="font-mono text-xs font-bold text-amber-900 uppercase block tracking-wider">
                  BANK TRANSFER INSTRUCTIONS
                </span>
                {completedOrder.bankTransferInstructions ? (
                  <p className="font-mono text-xs text-amber-900 whitespace-pre-line">
                    {completedOrder.bankTransferInstructions}
                  </p>
                ) : (
                  <p className="font-['Work_Sans',sans-serif] text-xs text-amber-900">
                    Please transfer the total amount to our bank account.
                  </p>
                )}
                <p className="font-['Work_Sans',sans-serif] text-xs font-semibold text-amber-900 pt-1 border-t border-amber-200">
                  Your order is prepared after we confirm your payment.
                </p>
              </div>
            )}

            {/* Order Items & Totals Breakdown returned by createOrder */}
            <div className="border border-[#dcd8d2] bg-[#f4f2ee] p-4">
              <div className="font-mono text-xs font-bold text-[#e0261f] uppercase tracking-wider mb-2.5">
                ORDER BREAKDOWN
              </div>
              <ul className="space-y-2 mb-3.5">
                {(completedOrder.items || []).map((item, idx) => (
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
                  <span className="font-mono">{formatPrice(completedOrder.subtotal)}</span>
                </div>
                {completedOrder.fulfillment === 'post' && (
                  <div className="flex justify-between text-[#5c5a5e]">
                    <span>Shipping:</span>
                    <span className="font-mono">
                      {completedOrder.shippingFee === 0 ? 'Free' : formatPrice(completedOrder.shippingFee)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-1.5 border-t border-[#dcd8d2] font-bold text-[#0a0a0b]">
                  <span className="font-['Anton',sans-serif] text-base uppercase">Total:</span>
                  <span className="font-['Anton',sans-serif] text-xl text-[#0a0a0b]">
                    {formatPrice(completedOrder.total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Fulfillment & Destination Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-3.5 bg-[#f4f2ee] border border-[#dcd8d2]">
                <div className="font-mono text-[10px] text-[#5c5a5e] uppercase mb-1">RECIPIENT</div>
                <div className="text-sm font-semibold text-[#0a0a0b]">{completedOrder.customer?.name}</div>
                <div className="text-xs text-[#5c5a5e]">{completedOrder.customer?.phone}</div>
              </div>
              <div className="p-3.5 bg-[#f4f2ee] border border-[#dcd8d2]">
                <div className="font-mono text-[10px] text-[#5c5a5e] uppercase mb-1">
                  {completedOrder.fulfillment === 'post' ? 'POSTAL DELIVERY' : 'SHOP COLLECTION'}
                </div>
                {completedOrder.fulfillment === 'post' ? (
                  <div className="text-xs text-[#5c5a5e] space-y-0.5">
                    <div>{completedOrder.customer?.address}</div>
                    <div>{completedOrder.customer?.city}, {completedOrder.customer?.district}</div>
                    <div>Postal Code: {completedOrder.customer?.postalCode}</div>
                  </div>
                ) : (
                  <div className="text-xs text-[#5c5a5e] space-y-0.5">
                    <div className="font-semibold text-[#0a0a0b]">{config?.shop?.address || 'Shop address'}</div>
                    <div>{config?.shop?.hours || 'Opening hours'}</div>
                    <div className="text-[#e0261f] font-mono text-[11px] pt-1">
                      {config?.pickupNote || 'We will contact you when your order is ready.'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleTrackCreatedOrder}
                className="flex-1 py-3 bg-[#0a0a0b] text-white font-['Anton',sans-serif] text-sm tracking-widest uppercase hover:bg-[#e0261f] transition-colors cursor-pointer border border-[#0a0a0b]"
              >
                TRACK THIS ORDER
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="flex-1 py-3 bg-white text-[#0a0a0b] font-['Anton',sans-serif] text-sm tracking-widest uppercase hover:border-[#0a0a0b] transition-colors cursor-pointer border border-[#dcd8d2]"
              >
                RETURN TO HOME
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {submitError && (
              <div className="p-3 bg-red-50 border border-red-300 text-red-800 text-xs font-mono flex items-start gap-2" role="alert">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Step 1: Fulfillment Choice - Two Large Selectable Cards */}
            <div>
              <span className="block font-mono text-xs font-bold text-[#5c5a5e] uppercase tracking-wider mb-2">
                1. SELECT HOW YOU WANT TO RECEIVE YOUR ORDER *
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Select Fulfillment Method">
                {/* Delivery by Post Card */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={isPost}
                  onClick={() => handleSelectFulfillment('post')}
                  className={`p-4 border text-left flex flex-col justify-between transition-all cursor-pointer relative ${
                    isPost
                      ? 'border-[#0a0a0b] bg-[#f4f2ee] shadow-sm ring-1 ring-[#0a0a0b]'
                      : 'border-[#dcd8d2] bg-white hover:border-[#5c5a5e]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Truck className={`w-5 h-5 ${isPost ? 'text-[#e0261f]' : 'text-[#5c5a5e]'}`} />
                      <span className="font-['Anton',sans-serif] text-base uppercase text-[#0a0a0b]">
                        {siteContent.fulfillment.post.title}
                      </span>
                    </div>
                    <span className="font-mono text-[9px] px-1.5 py-0.5 bg-[#0a0a0b] text-white uppercase font-bold">
                      {siteContent.fulfillment.post.badge}
                    </span>
                  </div>
                  <p className="font-['Work_Sans',sans-serif] text-xs text-[#5c5a5e] mt-2 leading-relaxed">
                    {siteContent.fulfillment.post.shortDesc}
                  </p>
                </button>

                {/* Collect from our Shop Card */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={!isPost}
                  onClick={() => handleSelectFulfillment('pickup')}
                  className={`p-4 border text-left flex flex-col justify-between transition-all cursor-pointer relative ${
                    !isPost
                      ? 'border-[#0a0a0b] bg-[#f4f2ee] shadow-sm ring-1 ring-[#0a0a0b]'
                      : 'border-[#dcd8d2] bg-white hover:border-[#5c5a5e]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Store className={`w-5 h-5 ${!isPost ? 'text-[#e0261f]' : 'text-[#5c5a5e]'}`} />
                      <span className="font-['Anton',sans-serif] text-base uppercase text-[#0a0a0b]">
                        {siteContent.fulfillment.pickup.title}
                      </span>
                    </div>
                    <span className="font-mono text-[9px] px-1.5 py-0.5 bg-emerald-700 text-white uppercase font-bold">
                      {siteContent.fulfillment.pickup.badge}
                    </span>
                  </div>
                  <p className="font-['Work_Sans',sans-serif] text-xs text-[#5c5a5e] mt-2 leading-relaxed">
                    {siteContent.fulfillment.pickup.shortDesc}
                  </p>
                </button>
              </div>
            </div>

            {/* Step 2: Contact & Address Information */}
            <div className="space-y-3.5 pt-2 border-t border-[#dcd8d2]">
              <span className="block font-mono text-xs font-bold text-[#5c5a5e] uppercase tracking-wider mb-1">
                2. CUSTOMER & DELIVERY DETAILS *
              </span>

              {/* Full Name (Both) */}
              <div>
                <label htmlFor="checkout-name" className="block font-mono text-xs text-[#5c5a5e] uppercase tracking-wider mb-1">
                  FULL NAME *
                </label>
                <input
                  type="text"
                  id="checkout-name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Kasun Perera"
                  aria-invalid={!!errors.name}
                  className={`w-full p-2.5 sm:p-3 bg-white border text-[#0a0a0b] text-sm focus:border-[#e0261f] focus-visible:outline-2 focus-visible:outline-[#e0261f] ${
                    errors.name ? 'border-[#e0261f]' : 'border-[#dcd8d2]'
                  }`}
                />
                {errors.name && (
                  <p className="mt-1 font-mono text-xs text-[#e0261f]">{errors.name}</p>
                )}
              </div>

              {/* Phone Number (Both) */}
              <div>
                <label htmlFor="checkout-phone" className="block font-mono text-xs text-[#5c5a5e] uppercase tracking-wider mb-1">
                  PHONE NUMBER (SRI LANKA) *
                </label>
                <input
                  type="tel"
                  id="checkout-phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. 0771234567 or +94 77 123 4567"
                  aria-invalid={!!errors.phone}
                  className={`w-full p-2.5 sm:p-3 bg-white border text-[#0a0a0b] text-sm focus:border-[#e0261f] focus-visible:outline-2 focus-visible:outline-[#e0261f] ${
                    errors.phone ? 'border-[#e0261f]' : 'border-[#dcd8d2]'
                  }`}
                />
                {errors.phone && (
                  <p className="mt-1 font-mono text-xs text-[#e0261f]">{errors.phone}</p>
                )}
              </div>

              {/* Delivery by Post fields (Visible ONLY when isPost === true) */}
              {isPost ? (
                <>
                  {/* Street Address */}
                  <div>
                    <label htmlFor="checkout-address" className="block font-mono text-xs text-[#5c5a5e] uppercase tracking-wider mb-1">
                      STREET ADDRESS *
                    </label>
                    <input
                      type="text"
                      id="checkout-address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="e.g. 14 Galle Road"
                      aria-invalid={!!errors.address}
                      className={`w-full p-2.5 sm:p-3 bg-white border text-[#0a0a0b] text-sm focus:border-[#e0261f] focus-visible:outline-2 focus-visible:outline-[#e0261f] ${
                        errors.address ? 'border-[#e0261f]' : 'border-[#dcd8d2]'
                      }`}
                    />
                    {errors.address && (
                      <p className="mt-1 font-mono text-xs text-[#e0261f]">{errors.address}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* City */}
                    <div>
                      <label htmlFor="checkout-city" className="block font-mono text-xs text-[#5c5a5e] uppercase tracking-wider mb-1">
                        CITY *
                      </label>
                      <input
                        type="text"
                        id="checkout-city"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="e.g. Colombo"
                        aria-invalid={!!errors.city}
                        className={`w-full p-2.5 sm:p-3 bg-white border text-[#0a0a0b] text-sm focus:border-[#e0261f] focus-visible:outline-2 focus-visible:outline-[#e0261f] ${
                          errors.city ? 'border-[#e0261f]' : 'border-[#dcd8d2]'
                        }`}
                      />
                      {errors.city && (
                        <p className="mt-1 font-mono text-xs text-[#e0261f]">{errors.city}</p>
                      )}
                    </div>

                    {/* Postal Code (exactly 5 digits) */}
                    <div>
                      <label htmlFor="checkout-postal" className="block font-mono text-xs text-[#5c5a5e] uppercase tracking-wider mb-1">
                        POSTAL CODE *
                      </label>
                      <input
                        type="text"
                        id="checkout-postal"
                        name="postalCode"
                        maxLength={5}
                        value={formData.postalCode}
                        onChange={handleChange}
                        placeholder="e.g. 00300"
                        aria-invalid={!!errors.postalCode}
                        className={`w-full p-2.5 sm:p-3 bg-white border text-[#0a0a0b] text-sm focus:border-[#e0261f] focus-visible:outline-2 focus-visible:outline-[#e0261f] ${
                          errors.postalCode ? 'border-[#e0261f]' : 'border-[#dcd8d2]'
                        }`}
                      />
                      {errors.postalCode && (
                        <p className="mt-1 font-mono text-xs text-[#e0261f]">{errors.postalCode}</p>
                      )}
                    </div>

                    {/* District Dropdown (Sri Lanka 25 districts) */}
                    <div>
                      <label htmlFor="checkout-district" className="block font-mono text-xs text-[#5c5a5e] uppercase tracking-wider mb-1">
                        DISTRICT *
                      </label>
                      <select
                        id="checkout-district"
                        name="district"
                        value={formData.district}
                        onChange={handleChange}
                        aria-invalid={!!errors.district}
                        className={`w-full p-2.5 sm:p-3 bg-white border text-[#0a0a0b] text-sm focus:border-[#e0261f] focus-visible:outline-2 focus-visible:outline-[#e0261f] ${
                          errors.district ? 'border-[#e0261f]' : 'border-[#dcd8d2]'
                        }`}
                      >
                        {SRI_LANKA_DISTRICTS.map((dist) => (
                          <option key={dist} value={dist}>
                            {dist}
                          </option>
                        ))}
                      </select>
                      {errors.district && (
                        <p className="mt-1 font-mono text-xs text-[#e0261f]">{errors.district}</p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                /* Collect from our shop info block */
                <div className="p-4 bg-[#f4f2ee] border border-[#dcd8d2] space-y-2.5">
                  <span className="font-mono text-xs font-bold text-[#0a0a0b] uppercase flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-[#e0261f]" />
                    COLLECTION LOCATION & STORE HOURS
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#5c5a5e]">
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#e0261f] shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-[#0a0a0b]">Address:</strong> {config?.shop?.address || 'Shop address'}
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#e0261f] shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-[#0a0a0b]">Hours:</strong> {config?.shop?.hours || 'Opening hours'}
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#dcd8d2] text-xs font-medium text-[#e0261f]">
                    ★ {config?.pickupNote || 'We will contact you when your order is ready.'}
                  </div>
                </div>
              )}

              {/* Order Notes (Optional) */}
              <div>
                <label htmlFor="checkout-notes" className="block font-mono text-xs text-[#5c5a5e] uppercase tracking-wider mb-1">
                  ORDER NOTES (OPTIONAL)
                </label>
                <input
                  type="text"
                  id="checkout-notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="e.g. Landmark or pickup instructions"
                  className="w-full p-2.5 sm:p-3 bg-white border border-[#dcd8d2] text-[#0a0a0b] text-sm focus:border-[#e0261f] focus-visible:outline-2 focus-visible:outline-[#e0261f]"
                />
              </div>
            </div>

            {/* Step 3: Payment Method Selection */}
            <div className="pt-2 border-t border-[#dcd8d2]">
              <span className="block font-mono text-xs font-bold text-[#5c5a5e] uppercase tracking-wider mb-2">
                3. PAYMENT METHOD *
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" role="radiogroup" aria-label="Select Payment Method">
                {/* Cash on Delivery (Post only) */}
                {isPost && enabledPaymentMethods.includes('cod') && (
                  <label
                    className={`flex items-start gap-2.5 p-3 border cursor-pointer transition-colors ${
                      formData.paymentMethod === 'cod'
                        ? 'border-[#0a0a0b] bg-[#f4f2ee]'
                        : 'border-[#dcd8d2] bg-white hover:border-[#5c5a5e]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={formData.paymentMethod === 'cod'}
                      onChange={handleChange}
                      className="mt-0.5 accent-[#e0261f]"
                    />
                    <div>
                      <span className="font-['Anton',sans-serif] text-xs sm:text-sm tracking-wider uppercase text-[#0a0a0b] block">
                        Cash on delivery
                      </span>
                      <span className="text-[11px] text-[#5c5a5e] block mt-0.5">
                        Pay in cash upon postal delivery
                      </span>
                    </div>
                  </label>
                )}

                {/* Pay at Shop (Pickup only) */}
                {!isPost && enabledPaymentMethods.includes('pay_at_shop') && (
                  <label
                    className={`flex items-start gap-2.5 p-3 border cursor-pointer transition-colors ${
                      formData.paymentMethod === 'pay_at_shop'
                        ? 'border-[#0a0a0b] bg-[#f4f2ee]'
                        : 'border-[#dcd8d2] bg-white hover:border-[#5c5a5e]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="pay_at_shop"
                      checked={formData.paymentMethod === 'pay_at_shop'}
                      onChange={handleChange}
                      className="mt-0.5 accent-[#e0261f]"
                    />
                    <div>
                      <span className="font-['Anton',sans-serif] text-xs sm:text-sm tracking-wider uppercase text-[#0a0a0b] block">
                        Pay at the shop
                      </span>
                      <span className="text-[11px] text-[#5c5a5e] block mt-0.5">
                        Pay in cash or card when collecting
                      </span>
                    </div>
                  </label>
                )}

                {/* Bank Transfer (Both if enabled) */}
                {enabledPaymentMethods.includes('bank_transfer') && (
                  <label
                    className={`flex items-start gap-2.5 p-3 border cursor-pointer transition-colors ${
                      formData.paymentMethod === 'bank_transfer'
                        ? 'border-[#0a0a0b] bg-[#f4f2ee]'
                        : 'border-[#dcd8d2] bg-white hover:border-[#5c5a5e]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="bank_transfer"
                      checked={formData.paymentMethod === 'bank_transfer'}
                      onChange={handleChange}
                      className="mt-0.5 accent-[#e0261f]"
                    />
                    <div>
                      <span className="font-['Anton',sans-serif] text-xs sm:text-sm tracking-wider uppercase text-[#0a0a0b] block">
                        Bank transfer
                      </span>
                      <span className="text-[11px] text-[#5c5a5e] block mt-0.5">
                        Direct bank deposit before dispatch
                      </span>
                    </div>
                  </label>
                )}
              </div>

              {/* Bank Transfer Details Block */}
              {formData.paymentMethod === 'bank_transfer' && (
                <div className="mt-3 p-3.5 bg-amber-50 border border-amber-300 space-y-2">
                  <span className="font-mono text-xs font-bold text-amber-900 uppercase block tracking-wider">
                    BANK TRANSFER DETAILS
                  </span>
                  {config?.bankTransferInstructions ? (
                    <p className="font-mono text-xs text-amber-900 whitespace-pre-line">
                      {config.bankTransferInstructions}
                    </p>
                  ) : null}
                  <p className="font-['Work_Sans',sans-serif] text-xs font-semibold text-amber-900">
                    Your order is prepared after we confirm your payment.
                  </p>
                </div>
              )}
            </div>

            {/* Totals Summary */}
            <div className="pt-3 border-t border-[#dcd8d2] space-y-1.5">
              <div className="flex justify-between items-baseline text-[#5c5a5e] text-xs font-mono">
                <span>SUBTOTAL:</span>
                <span className="text-sm font-medium text-[#0a0a0b]">{formatPrice(subtotal)}</span>
              </div>

              {/* Shipping Fee line: shown ONLY for post */}
              {isPost && (
                <div className="flex justify-between items-baseline text-[#5c5a5e] text-xs font-mono">
                  <span>SHIPPING (POST):</span>
                  <span className="text-sm font-medium text-[#0a0a0b]">{shippingDisplay}</span>
                </div>
              )}

              <div className="pt-2 border-t border-[#dcd8d2] flex justify-between items-baseline">
                <div>
                  <span className="font-['Anton',sans-serif] text-xs sm:text-sm tracking-widest text-[#5c5a5e] uppercase block">
                    ESTIMATED TOTAL:
                  </span>
                  <span className="font-mono text-[10px] text-[#5c5a5e]">
                    {isPost ? 'Includes postal delivery' : 'Shop collection (no shipping fee)'}
                  </span>
                </div>
                <span className="font-['Anton',sans-serif] text-xl sm:text-2xl text-[#0a0a0b]">
                  {formatPrice(estimatedTotal)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-1/3 py-3 border border-[#dcd8d2] bg-white font-['Anton',sans-serif] text-xs sm:text-sm tracking-widest uppercase text-[#5c5a5e] hover:text-[#0a0a0b] hover:border-[#0a0a0b] transition-colors cursor-pointer disabled:opacity-50"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={isSubmitting || items.length === 0}
                className="w-2/3 py-3 bg-[#e0261f] text-white font-['Anton',sans-serif] text-sm sm:text-base tracking-widest uppercase hover:bg-[#c81e18] transition-colors cursor-pointer border border-[#e0261f] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-white"
              >
                {isSubmitting ? 'Placing order...' : 'PLACE ORDER'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
