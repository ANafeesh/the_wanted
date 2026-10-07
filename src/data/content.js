/**
 * The Wanted — Factory Outlet Centralized Content & Configuration Defaults
 * Static copy, metadata, and backend-ready local configuration.
 */

/**
 * Global switch controlling the "Sample photo" tag on product cards.
 * When true AND product.sample === true, shows "Sample photo".
 */
export const SHOW_SAMPLE_TAG = true;

/**
 * Default local configuration returned by api.getConfig() when no remote backend is configured.
 * Every placeholder value that the shop owner must replace is marked with a TODO comment.
 */
export const defaultConfig = {
  // TODO: Set shipping fee in LKR (Rs.) for postal delivery when applicable (default 0)
  shippingFee: 0,

  // TODO: Set free shipping threshold in LKR (e.g. 15000), or null if no threshold applies
  freeShippingThreshold: null,

  // TODO: Set estimated delivery time frame for postal orders
  estimatedDelivery: 'To be confirmed',

  // Enabled payment methods per fulfillment method
  enabledPaymentMethods: {
    post: ['cod', 'bank_transfer'],
    pickup: ['pay_at_shop', 'bank_transfer']
  },

  // TODO: Enter your official bank account details here (Bank, Account Name, Account Number, Branch)
  bankTransferInstructions: 'Commercial Bank',

  shop: {
    // TODO: Enter your real physical store street address
    address: 'Kandy',

    // TODO: Enter your real store opening hours (e.g. Monday – Saturday: 10:00 AM – 8:00 PM)
    hours: 'Opening hours Monday – Saturday: 10:00 AM – 8:00 PM',

    // TODO: Enter your store contact phone number
    phone: '+94 76 123 4567',

    // TODO: Enter your Google Maps directions URL (e.g. https://maps.app.goo.gl/...) or leave empty
    mapUrl: ''
  },

  // TODO: Customize the customer pickup note
  pickupNote: 'We will contact you when your order is ready.'
};

export const siteContent = {
  brand: {
    name: 'The Wanted',
    tagline: 'Factory outlet. Real brands, outlet prices.',
    heroTag: 'FACTORY OUTLET'
  },

  fulfillment: {
    line: 'Delivery by post or collect from our shop.',
    post: {
      id: 'post',
      title: 'Delivery by post',
      shortDesc: 'Delivered directly to your address across Sri Lanka.',
      badge: 'ISLANDWIDE'
    },
    pickup: {
      id: 'pickup',
      title: 'Collect from our shop',
      shortDesc: 'Pick up in person directly from our physical shop.',
      badge: 'FREE'
    }
  },

  hero: {
    stage1: {
      title: 'The Wanted',
      desc: 'Factory outlet. Real brands, outlet prices.',
      scrollHint: 'Scroll to explore'
    },
    stage2: {
      tag: 'OUTLET FLOOR',
      title: 'Factory Surplus',
      desc: 'Direct overruns and surplus pieces at outlet prices.'
    },
    stage3: {
      tag: 'COLLECTION',
      title: 'New Arrivals',
      desc: 'Factory outlet stock available while supply lasts.',
      cta: 'Explore Collection'
    }
  },

  about: {
    tag: 'FACTORY OUTLET',
    title: 'ABOUT THE OUTLET',
    statement: 'Direct outlet apparel, bringing you surplus and overrun stock at outlet prices.',
    fulfillmentLine: 'Delivery by post or collect from our shop.',
    details: [
      {
        title: 'OVERRUN & SURPLUS',
        desc: 'Overrun garments and factory surplus sourced directly for the outlet floor.'
      },
      {
        title: 'OUTLET VALUE',
        desc: 'Substantial savings off original retail prices across all available categories.'
      },
      {
        title: 'OUTLET STYLES',
        desc: 'Curated selection of hoodies, jackets, tees, and pants.'
      }
    ]
  },

  tracking: {
    title: 'TRACK YOUR ORDER',
    subtitle: 'Enter your order reference number and phone number to view live status updates.',
    referencePlaceholder: 'TW-XXXXXX',
    phonePlaceholder: '07XXXXXXXX or +94 7XXXXXXXX',
    notFoundMessage: 'We could not find an order matching that reference number and phone. Please check your details or contact us on WhatsApp.',
    networkErrorMessage: 'Unable to connect to order status service. Please check your connection and try again.'
  },

  contact: {
    title: 'CONTACT & LOCATION',
    // TODO: Insert your real physical shop address here when available
    address: 'Kandy',
    // TODO: Insert your real WhatsApp phone number here (e.g., +94 7X XXX XXXX)
    whatsApp: 'WhatsApp +94 76 123',
    // TODO: Insert your raw WhatsApp contact number for wa.me link
    whatsAppRaw: '+947',
    // TODO: Insert opening hours if applicable (e.g., Monday – Saturday: 10:00 AM – 8:00 PM)
    hours: 'Opening hours',
    note: 'Contact us via WhatsApp for inquiries about product sizing or order status.'
  },

  footer: {
    tagline: 'The Wanted Factory Outlet. Real brands, outlet prices.',
    // TODO: Update copyright holder or year as needed
    copyright: `© ${new Date().getFullYear()} The Wanted. All rights reserved.`
  }
};

export default siteContent;
