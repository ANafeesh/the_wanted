import React, { useState, useEffect } from 'react';
import { isSoundEnabled, setSoundEnabled } from '../utils/audio';
import { Volume2, VolumeX, ShoppingBag, Menu, X } from 'lucide-react';

/**
 * Responsive Navbar with:
 * - 56px tall logo on desktop, 40px on mobile
 * - Transparent over hero, solid dark with backdrop blur when scrolled
 * - Sound Toggle with auto-dismissing hint (6s, on click anywhere, remembered in localStorage)
 * - Animated cart bump indicator
 * - Real section navigation: Shop, Categories, New Arrivals, About, Contact
 * - Active in-view section highlighting
 * - Accessible mobile navigation drawer
 */
export default function Navbar({ cartCount = 0, onOpenCart, cartBump = false }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [showSoundHint, setShowSoundHint] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  // Initialize sound state & hint from localStorage
  useEffect(() => {
    const enabled = isSoundEnabled();
    setSoundOn(enabled);

    const hintDismissed = localStorage.getItem('the_wanted_sound_hint_dismissed');
    if (!hintDismissed && !enabled) {
      setShowSoundHint(true);
    }

    const handleSoundChange = (e) => {
      setSoundOn(e.detail.enabled);
    };
    window.addEventListener('the_wanted_sound_changed', handleSoundChange);
    return () => window.removeEventListener('the_wanted_sound_changed', handleSoundChange);
  }, []);

  // Sound hint auto-dismiss after 6s OR click anywhere
  useEffect(() => {
    if (!showSoundHint) return;

    const timer = setTimeout(() => {
      dismissHint();
    }, 6000);

    const handleGlobalClick = () => {
      dismissHint();
    };

    // Slight delay so the triggering action doesn't immediately dismiss
    const delayTimer = setTimeout(() => {
      window.addEventListener('click', handleGlobalClick);
      window.addEventListener('touchstart', handleGlobalClick);
    }, 100);

    return () => {
      clearTimeout(timer);
      clearTimeout(delayTimer);
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('touchstart', handleGlobalClick);
    };
  }, [showSoundHint]);

  // Stop page behind mobile menu from scrolling while open
  useEffect(() => {
    if (mobileMenuOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [mobileMenuOpen]);

  // Monitor scroll position and active section in view
  useEffect(() => {
    const sectionIds = ['new-arrivals', 'shop-by-category', 'shop', 'track-order', 'about', 'contact'];

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);

      // If at the top of the page in the Hero section, no nav link should be active
      if (window.scrollY < 80) {
        setActiveSection('');
        return;
      }

      const heroEl = document.getElementById('hero');
      if (heroEl) {
        const heroRect = heroEl.getBoundingClientRect();
        // While Hero bottom has not scrolled past the upper viewport, keep hero active (unhighlighted nav)
        if (heroRect.bottom > 120) {
          setActiveSection('');
          return;
        }
      }

      // If at bottom of page, highlight Contact
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 60) {
        setActiveSection('#contact');
        return;
      }

      // Robust viewport intersection calculation: section under the sticky navbar
      let current = '';
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 140 && rect.bottom > 140) {
            current = `#${id}`;
            break;
          }
        }
      }

      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const dismissHint = () => {
    setShowSoundHint(false);
    localStorage.setItem('the_wanted_sound_hint_dismissed', 'true');
  };

  const handleToggleSound = (e) => {
    e.stopPropagation();
    const nextState = !soundOn;
    setSoundOn(nextState);
    setSoundEnabled(nextState);

    if (showSoundHint) {
      dismissHint();
    }
  };

  const handleNavClick = (e, href) => {
    e.preventDefault();
    const id = href.replace('#', '');
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
      window.history.pushState(null, '', href);
    }
  };

  const navLinks = [
    { label: 'New Arrivals', href: '#new-arrivals' },
    { label: 'Categories', href: '#shop-by-category' },
    { label: 'Shop', href: '#shop' },
    { label: 'Track Order', href: '#track-order' },
    { label: 'About', href: '#about' },
    { label: 'Contact', href: '#contact' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-colors duration-300 ${isScrolled
        ? 'bg-[#0a0a0b]/95 backdrop-blur-md border-b border-[#2a2a2d] shadow-lg'
        : 'bg-transparent'
        }`}
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 md:h-[84px] flex items-center justify-between">
        {/* Brand Logo - 56px desktop, 44px mobile, clearly readable */}
        <a
          href="#hero"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            window.history.pushState(null, '', window.location.pathname);
            setActiveSection('');
            setMobileMenuOpen(false);
          }}
          className="flex items-center gap-2 select-none min-h-[44px] focus-visible:outline-2 focus-visible:outline-[#e0261f]"
          aria-label="The Wanted Outlet Home"
        >
          {!logoError ? (
            <img
              src="/logo.png"
              alt="The Wanted"
              className="h-11 sm:h-[56px] w-auto object-contain block drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="flex flex-col items-start leading-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
              <div className="flex items-baseline gap-1">
                <span className="font-['Work_Sans',sans-serif] font-extrabold italic text-sm tracking-wider text-[#e0261f]">
                  the
                </span>
                <span className="font-['Anton',sans-serif] text-3xl sm:text-4xl tracking-wider text-[#e0261f]">
                  WANTED
                </span>
              </div>
              <div className="flex gap-1 text-[10px] sm:text-[11px] text-[#f58b25]" aria-hidden="true">
                <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
              </div>
            </div>
          )}
        </a>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-7" aria-label="Main Navigation">
          {navLinks.map((link) => {
            const isActive = activeSection === link.href;
            return (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className={`font-['Anton',sans-serif] text-xs sm:text-sm tracking-widest uppercase transition-colors py-1 focus-visible:outline-2 focus-visible:outline-[#e0261f] ${isActive
                  ? 'text-[#e0261f] border-b-2 border-[#e0261f]'
                  : 'text-[#f4f2ee] hover:text-[#e0261f]'
                  }`}
              >
                {link.label}
              </a>
            );
          })}
        </nav>

        {/* Actions (Sound toggle, Cart trigger, Mobile menu) */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Sound Toggle Button with One-Time Hint - min 44x44px tap target */}
          <div className="relative">
            <button
              type="button"
              onClick={handleToggleSound}
              aria-pressed={soundOn}
              aria-label={`Toggle website audio feedback, currently ${soundOn ? 'ON' : 'OFF'}`}
              className={`flex items-center justify-center gap-1.5 px-3 min-h-[44px] min-w-[44px] border text-[11px] sm:text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#e0261f] ${soundOn
                ? 'border-[#e0261f] bg-[#e0261f]/15 text-[#f4f2ee]'
                : 'border-[#2a2a2d] bg-[#141416] text-[#d6d3d0] hover:text-[#f4f2ee] hover:border-[#a09da0]'
                }`}
            >
              {soundOn ? (
                <Volume2 className="w-4 h-4 text-[#e0261f]" aria-hidden="true" />
              ) : (
                <VolumeX className="w-4 h-4 text-[#d6d3d0]" aria-hidden="true" />
              )}
              <span className="hidden sm:inline font-semibold">
                SOUND {soundOn ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* One-time sound hint */}
            {showSoundHint && (
              <div
                role="tooltip"
                className="absolute top-full right-0 mt-2 w-60 bg-[#141416] border border-[#e0261f] p-3 shadow-xl z-50 text-left"
              >
                <div className="flex justify-between items-start gap-2">
                  <p className="font-['Work_Sans',sans-serif] text-xs text-[#f4f2ee] leading-tight">
                    Turn sound on for the full experience
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissHint();
                    }}
                    className="text-[#a09da0] hover:text-[#f4f2ee] min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer text-sm"
                    aria-label="Dismiss sound hint"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Cart Button with Bump Animation - min 44x44px tap target */}
          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`Open shopping bag, ${cartCount} items`}
            className={`flex items-center justify-center gap-1.5 px-3 min-h-[44px] min-w-[44px] border border-[#2a2a2d] bg-[#141416] text-[#f4f2ee] hover:border-[#e0261f] transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[#e0261f] ${cartBump ? 'scale-105 border-[#e0261f] bg-[#e0261f]/20' : ''
              }`}
          >
            <ShoppingBag className="w-4 h-4 text-[#e0261f]" aria-hidden="true" />
            <span className="font-['Anton',sans-serif] text-xs tracking-wider uppercase">
              CART
            </span>
            <span
              className={`font-mono text-xs px-1.5 py-0.5 font-bold min-w-5 text-center transition-colors ${cartCount > 0 ? 'bg-[#e0261f] text-white' : 'bg-[#2a2a2d] text-[#d6d3d0]'
                }`}
            >
              {cartCount}
            </span>
          </button>

          {/* Mobile Menu Toggle Button - min 44x44px tap target */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex items-center justify-center w-11 h-11 min-h-[44px] min-w-[44px] border border-[#2a2a2d] bg-[#141416] text-[#f4f2ee] hover:border-[#a09da0] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#e0261f]"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation with Dark Backdrop Blur */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-[72px] sm:top-20 z-30 md:hidden flex flex-col">
          {/* Dark background blur behind the menu */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Navigation Links (tap target min 44x44px, highlight active section only) */}
          <nav
            className="relative bg-[#0a0a0b] border-b border-[#2a2a2d] px-6 py-5 flex flex-col space-y-1 shadow-2xl z-10 max-h-[calc(100dvh-72px)] overflow-y-auto"
            aria-label="Mobile Navigation"
          >
            {navLinks.map((link) => {
              const isActive = activeSection === link.href;
              return (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => {
                    handleNavClick(e, link.href);
                    setMobileMenuOpen(false);
                  }}
                  className={`font-['Anton',sans-serif] text-lg tracking-wider uppercase min-h-[44px] flex items-center border-b border-[#2a2a2d]/40 transition-colors ${
                    isActive ? 'text-[#e0261f] pl-2 border-l-2 border-l-[#e0261f]' : 'text-[#f4f2ee] hover:text-[#e0261f]'
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
