import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Preloader from './components/Preloader';
import Hero from './components/Hero';
import Marquee from './components/Marquee';
import NewArrivals from './components/NewArrivals';
import CategoryTiles from './components/CategoryTiles';
import ProductGrid from './components/ProductGrid';
import OrderTracking from './components/OrderTracking';
import About from './components/About';
import Footer from './components/Footer';
import Cart from './components/Cart';
import CheckoutModal from './components/CheckoutModal';
import QuickViewModal from './components/QuickViewModal';
import { getProducts, getConfig } from './services/api';

const CART_STORAGE_KEY = 'the_wanted_cart_v2';
const FULFILLMENT_SESSION_KEY = 'the_wanted_fulfillment_v1';

export default function App() {
  const [isPreloading, setIsPreloading] = useState(true);
  const [preloadedData, setPreloadedData] = useState(null);

  // Store configuration from api.getConfig()
  const [config, setConfig] = useState(null);

  // Fulfillment preference remembered for the session (default: "post")
  const [fulfillment, setFulfillment] = useState(() => {
    try {
      return sessionStorage.getItem(FULFILLMENT_SESSION_KEY) || 'post';
    } catch {
      return 'post';
    }
  });

  // Tracking shortcut reference
  const [initialTrackingRef, setInitialTrackingRef] = useState('');

  // Products from service layer
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(null);

  // Selected category state shared between CategoryTiles and ProductGrid
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Versioned cart state persisted in localStorage
  // Stores ONLY { productId, size, quantity }
  const [cartItems, setCartItems] = useState(() => {
    try {
      // Clear legacy stale carts on first load
      if (localStorage.getItem('the_wanted_cart')) {
        localStorage.removeItem('the_wanted_cart');
      }

      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (!saved) {
        return [];
      }

      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item) => item && item.productId && item.size && item.quantity > 0)
          .map((item) => ({
            productId: item.productId,
            size: item.size,
            quantity: Number(item.quantity) || 1
          }));
      }
      return [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [cartBump, setCartBump] = useState(false);

  // Quick View modal state
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [quickViewTriggerRef, setQuickViewTriggerRef] = useState(null);

  // Load configuration on mount
  useEffect(() => {
    let isMounted = true;
    getConfig().then((cfg) => {
      if (isMounted) {
        setConfig(cfg);
      }
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync fulfillment choice to sessionStorage
  const handleFulfillmentChange = (newVal) => {
    setFulfillment(newVal);
    try {
      sessionStorage.setItem(FULFILLMENT_SESSION_KEY, newVal);
    } catch {
      // Ignore storage error
    }
  };

  // Load products via service layer with error handling
  const fetchProductsList = useCallback(async () => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const data = await getProducts();
      setProducts(data || []);
    } catch (err) {
      setProductsError(err?.message || 'Unable to load products. Please check your network and try again.');
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProductsList();
  }, [fetchProductsList]);

  // Persist versioned cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch {
      // Ignore quota errors
    }
  }, [cartItems]);

  const handlePreloadComplete = useCallback((data) => {
    setPreloadedData(data);
    setIsPreloading(false);
    if (window.location.hash) {
      setTimeout(() => {
        const id = window.location.hash.replace('#', '');
        const target = document.getElementById(id);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
    }
  }, []);

  // Cart actions storing ONLY { productId, size, quantity }
  const handleAddToCart = ({ productId, size = 'Standard' }) => {
    if (!productId) return;

    setCartItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (item) => item.productId === productId && item.size === size
      );

      if (existingIndex > -1) {
        const next = [...prevItems];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + 1
        };
        return next;
      }

      return [...prevItems, { productId, size, quantity: 1 }];
    });

    setCartBump(true);
    setTimeout(() => setCartBump(false), 500);
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (productId, size, quantity) => {
    if (quantity <= 0) {
      handleRemoveItem(productId, size);
      return;
    }

    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.productId === productId && item.size === size ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveItem = (productId, size) => {
    setCartItems((prevItems) =>
      prevItems.filter((item) => !(item.productId === productId && item.size === size))
    );
  };

  const handleOrderSuccess = () => {
    setCartItems([]);
  };

  const handleOpenQuickView = (product, triggerRef) => {
    setQuickViewProduct(product);
    setQuickViewTriggerRef(triggerRef);
    setIsQuickViewOpen(true);
  };

  const handleNavigateToTracking = (orderRef) => {
    setInitialTrackingRef(orderRef);
    const trackingEl = document.getElementById('track-order');
    if (trackingEl) {
      trackingEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0b] text-[#0a0a0b] selection:bg-[#e0261f] selection:text-white">
      {/* Frame Sequence Preloader */}
      {isPreloading && <Preloader onComplete={handlePreloadComplete} />}

      {/* Main Application */}
      {!isPreloading && (
        <>
          <Navbar
            cartCount={totalCartCount}
            onOpenCart={() => setIsCartOpen(true)}
            cartBump={cartBump}
          />

          <main id="main-content" className="relative">
            {/* Hero Section */}
            <Hero preloadedData={preloadedData} />

            {/* New Arrivals Pinned Horizontal Section */}
            <NewArrivals
              onOpenQuickView={handleOpenQuickView}
              onAddToCart={handleAddToCart}
            />

            {/* Marquee divider (Black contrast band) */}
            <Marquee />

            {/* Shop by Category Section */}
            <CategoryTiles
              products={products}
              onSelectCategory={(cat) => setSelectedCategory(cat)}
            />

            {/* Shop Section (All Products Grid with loading skeletons and error state) */}
            <ProductGrid
              products={products}
              loading={productsLoading}
              error={productsError}
              onRetry={fetchProductsList}
              activeCategory={selectedCategory}
              onSelectCategory={(cat) => setSelectedCategory(cat)}
              onOpenQuickView={handleOpenQuickView}
              onAddToCart={handleAddToCart}
            />

            {/* Track Your Order Section */}
            <OrderTracking
              config={config}
              initialReference={initialTrackingRef}
            />

            {/* About / Factory Outlet Details */}
            <About />
          </main>

          {/* Footer / Contact (with Visit our shop block) */}
          <Footer config={config} />

          {/* Quick View Modal */}
          <QuickViewModal
            isOpen={isQuickViewOpen}
            onClose={() => setIsQuickViewOpen(false)}
            product={quickViewProduct}
            onAddToCart={handleAddToCart}
            triggerRef={quickViewTriggerRef}
          />

          {/* Slide-in Cart Drawer */}
          <Cart
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            items={cartItems}
            products={products}
            config={config}
            fulfillment={fulfillment}
            onFulfillmentChange={handleFulfillmentChange}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onOpenCheckout={() => {
              setIsCartOpen(false);
              setIsCheckoutOpen(true);
            }}
          />

          {/* Checkout Modal */}
          <CheckoutModal
            isOpen={isCheckoutOpen}
            onClose={() => setIsCheckoutOpen(false)}
            items={cartItems}
            products={products}
            config={config}
            fulfillment={fulfillment}
            onFulfillmentChange={handleFulfillmentChange}
            onOrderSuccess={handleOrderSuccess}
            onNavigateToTracking={handleNavigateToTracking}
          />
        </>
      )}
    </div>
  );
}
