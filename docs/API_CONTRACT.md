# The Wanted — Backend API Contract

This document defines the formal API contract between **The Wanted** front-end application and the upcoming **Node.js backend**.

The front-end accesses all backend resources through the service layer in [`src/services/api.js`](file:///d:/Shop/the-wanted/src/services/api.js).
- When `VITE_API_URL` is set in the environment (`.env`), the service makes standard HTTP JSON requests to the endpoints documented below.
- When `VITE_API_URL` is not set, the service falls back to local data mocks (`products.json`, `content.js`, and versioned `localStorage`).

---

## 1. Data Models & Payloads

### 1.1 Product Object (`Product`)

```typescript
interface Product {
  id: string;               // Unique product identifier (e.g., "tw-hd-01")
  name: string;             // Display name (e.g., "Grey hoodie")
  category: string;         // Department name (e.g., "Hoodies", "Jeans", "T-Shirts")
  price: number;            // Outlet selling price in LKR (Rs.)
  originalPrice?: number;   // Optional. Original retail price in LKR (renders crossed-out price + discount badge)
  sizes: string[];          // Available sizes (e.g., ["S", "M", "L", "XL"])
  images: string[];         // Image filenames or absolute URL paths (e.g., ["hoodie-grey-1.webp"])
  description?: string;     // Product fabric, fit, and construction details
  sample?: boolean;         // Optional flag: if true, displays "Sample photo" tag
}
```

---

### 1.2 Store Configuration (`Config`)

Fetched via `GET /config` or provided locally via `defaultConfig` in [`src/data/content.js`](file:///d:/Shop/the-wanted/src/data/content.js).

```typescript
interface StoreConfig {
  shippingFee: number;                  // Shipping fee in LKR for postal delivery (default 0)
  freeShippingThreshold: number | null; // Order subtotal threshold for free shipping, or null if none
  estimatedDelivery: string;            // Estimated postal delivery window (default "To be confirmed")
  enabledPaymentMethods: {
    post: Array<"cod" | "bank_transfer">;
    pickup: Array<"pay_at_shop" | "bank_transfer">;
  };
  bankTransferInstructions: string;     // Bank details displayed to customer for bank transfers
  shop: {
    address: string;                    // Physical store street address (default "Shop address")
    hours: string;                      // Store opening hours (default "Opening hours")
    phone: string;                      // Contact phone number (default "+94 7X XXX XXXX")
    mapUrl: string;                     // Optional Google Maps URL for directions (or "" if unset)
  };
  pickupNote: string;                   // Note shown for shop collections (default "We will contact you when your order is ready.")
}
```

---

### 1.3 Order Creation Request (`CreateOrderRequest`)

> **CRITICAL SECURITY NOTE:**
> The client **NEVER** computes, passes, or trusts item prices, shipping fees, or order totals.
> The backend **MUST** look up product prices by `productId` from its database, calculate all subtotals, apply shipping fees or free-shipping thresholds server-side, and record the final payable total.

```typescript
interface CreateOrderRequest {
  fulfillment: "post" | "pickup";       // Required. Delivery method
  customer: {
    name: string;                       // Required. Customer full name
    phone: string;                      // Required. Sri Lankan phone number (e.g., "0771234567" or "+94 77 123 4567")
    address?: string;                   // Required ONLY when fulfillment === "post"
    city?: string;                      // Required ONLY when fulfillment === "post"
    postalCode?: string;                // Required ONLY when fulfillment === "post". Exactly 5 digits
    district?: string;                  // Required ONLY when fulfillment === "post". One of Sri Lanka's 25 districts
  };
  paymentMethod: "cod" | "bank_transfer" | "pay_at_shop";
  items: Array<{
    productId: string;                  // Unique product identifier
    size: string;                       // Selected size
    quantity: number;                   // Positive integer >= 1
  }>;
  notes?: string;                       // Optional customer or delivery notes
}
```

#### Fulfillment & Payment Constraints:
- `address`, `city`, `postalCode`, and `district` are sent **only** when `fulfillment === "post"`.
- `cod` (Cash on delivery) is allowed **only** when `fulfillment === "post"`.
- `pay_at_shop` (Pay at the shop) is allowed **only** when `fulfillment === "pickup"`.
- `bank_transfer` is allowed with either fulfillment method (when enabled in config).
- Never accept client-submitted prices, discounts, fees, or total values.

#### Example Post Order Request JSON:
```json
{
  "fulfillment": "post",
  "customer": {
    "name": "Kasun Perera",
    "phone": "0771234567",
    "address": "14 Galle Road",
    "city": "Colombo",
    "postalCode": "00300",
    "district": "Colombo"
  },
  "paymentMethod": "cod",
  "items": [
    {
      "productId": "tw-hd-01",
      "size": "M",
      "quantity": 1
    }
  ],
  "notes": "Please call before arrival"
}
```

#### Example Pickup Order Request JSON:
```json
{
  "fulfillment": "pickup",
  "customer": {
    "name": "Dilshan Fernando",
    "phone": "+94 71 987 6543"
  },
  "paymentMethod": "pay_at_shop",
  "items": [
    {
      "productId": "tw-jk-03",
      "size": "L",
      "quantity": 1
    }
  ],
  "notes": "Will collect on Saturday morning"
}
```

---

### 1.4 Order Response (`CreateOrderResponse`)

Returned by `POST /orders`:

```typescript
interface CreateOrderResponse {
  reference: string;                    // Order reference number (e.g., "TW-784291")
  fulfillment: "post" | "pickup";       // Fulfillment type
  status: OrderStatus;                  // Initial status: "pending"
  paymentStatus: "unpaid" | "paid";     // Payment status ("unpaid" for COD / Pay at shop / pending transfer)
  subtotal: number;                     // Server-computed items subtotal in LKR
  shippingFee: number;                  // Server-computed shipping fee in LKR
  total: number;                        // Server-computed grand total in LKR (subtotal + shippingFee)
  items: Array<{
    productId: string;
    name: string;
    size: string;
    quantity: number;
    unitPrice: number;                  // Server price per unit
  }>;
  paymentMethod: "cod" | "bank_transfer" | "pay_at_shop";
  bankTransferInstructions: string;     // Instructions if paymentMethod === "bank_transfer", else ""
  createdAt: string;                    // ISO 8601 timestamp
}
```

---

### 1.5 Order Status Lifecycle by Fulfillment

#### For `fulfillment: "post"`
- `pending`: Order received, awaiting confirmation.
- `confirmed`: Order confirmed by outlet team.
- `packed`: Garments inspected, tagged, and packed into parcel.
- `posted`: Parcel handed over to post office / postal courier service.
- `delivered`: Parcel successfully delivered to customer address.
- `cancelled`: Order cancelled.
- `returned`: Parcel could not be delivered and was returned to shop.

#### For `fulfillment: "pickup"`
- `pending`: Order received, awaiting inventory reservation.
- `confirmed`: Order confirmed and garments reserved on floor.
- `ready_for_pickup`: Garments ready at the counter for customer collection.
- `collected`: Customer has collected order and completed payment (if due).
- `cancelled`: Order cancelled.

#### Payment Statuses:
- `unpaid`: Payment pending (COD, Pay at shop, or pending bank transfer verification).
- `paid`: Payment received and verified.

---

### 1.6 Tracking Status Response (`TrackedOrderResponse`)

Returned by `GET /orders/:reference?phone=...`:

```typescript
interface TrackedOrderResponse extends CreateOrderResponse {
  customer: {
    name: string;
    phone: string;
    address?: string;
    city?: string;
    postalCode?: string;
    district?: string;
  };
  trackingNumber: string | null;        // Postal tracking barcode / ID (when posted)
  trackingUrl: string | null;           // Direct tracking URL for post office (nullable)
  postedAt: string | null;              // Timestamp when posted
  readyAt: string | null;               // Timestamp when ready for pickup
  deliveredAt: string | null;           // Timestamp when delivered
  collectedAt: string | null;           // Timestamp when collected
}
```

---

## 2. API Endpoints

All endpoints accept and return UTF-8 JSON payloads with `Content-Type: application/json`.

### 2.1 Get Store Configuration
- **HTTP Method**: `GET`
- **Path**: `/config`
- **Response**: `200 OK`
```json
{
  "shippingFee": 0,
  "freeShippingThreshold": null,
  "estimatedDelivery": "To be confirmed",
  "enabledPaymentMethods": {
    "post": ["cod", "bank_transfer"],
    "pickup": ["pay_at_shop", "bank_transfer"]
  },
  "bankTransferInstructions": "",
  "shop": {
    "address": "Shop address",
    "hours": "Opening hours",
    "phone": "+94 7X XXX XXXX",
    "mapUrl": ""
  },
  "pickupNote": "We will contact you when your order is ready."
}
```

---

### 2.2 Get All Products
- **HTTP Method**: `GET`
- **Path**: `/products`
- **Response**: `200 OK`
- **Response Body**: Array of `Product` objects.

---

### 2.3 Get Single Product
- **HTTP Method**: `GET`
- **Path**: `/products/:id`
- **Response**:
  - `200 OK`: Single `Product` object.
  - `404 Not Found`: If no product matches `:id`.

---

### 2.4 Create Order
- **HTTP Method**: `POST`
- **Path**: `/orders`
- **Request Body**: `CreateOrderRequest`
- **Response**:
  - `201 Created`: `CreateOrderResponse`
  - `400 Bad Request`: Input validation failed.
  - `500 Internal Server Error`: Processing failed.

---

### 2.5 Get Order Tracking Status
- **HTTP Method**: `GET`
- **Path**: `/orders/:reference?phone=07XXXXXXXX`
- **Parameters**:
  - `:reference` (path parameter): Order reference (e.g. `TW-784291`). Case-insensitive.
  - `phone` (query parameter): Customer contact phone number used during checkout. Sri Lankan numbers normalized (leading 0, 94, +94).
- **Response**:
  - `200 OK`: `TrackedOrderResponse`
  - `404 Not Found`: Reference not found or phone number does not match.

---

## 3. Standard Error Format

When an error occurs (HTTP 4xx or 5xx), the response body MUST follow this uniform structure:

```json
{
  "error": {
    "code": "STRING_ERROR_CODE",
    "message": "Human-readable explanation of what went wrong"
  }
}
```

### Standard Error Codes

| HTTP Status | Error Code | Description |
|---|---|---|
| `400` | `INVALID_INPUT` | Missing or invalid required fields (e.g., customer name). |
| `400` | `INVALID_PHONE` | Phone number does not match Sri Lankan format. |
| `400` | `INVALID_FULFILLMENT` | Fulfillment is not `"post"` or `"pickup"`. |
| `400` | `INVALID_ADDRESS` | Missing address, city, postal code, or district for postal order. |
| `400` | `INVALID_POSTAL_CODE` | Postal code is not exactly 5 digits. |
| `400` | `INVALID_DISTRICT` | District is not one of the 25 Sri Lankan districts. |
| `400` | `INVALID_PAYMENT_METHOD` | Payment method is not valid for the chosen fulfillment. |
| `400` | `EMPTY_ORDER` | The `items` array is empty or invalid. |
| `404` | `PRODUCT_NOT_FOUND` | Product ID does not exist. |
| `404` | `ORDER_NOT_FOUND` | Order reference or phone verification did not match. |
| `409` | `OUT_OF_STOCK` | Requested product or size is unavailable. |
| `500` | `INTERNAL_SERVER_ERROR` | Server execution error. |

---

## 4. Environment & Deployment Setup

To point the front-end to your Node.js backend:
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Set `VITE_API_URL` to your backend URL:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```
3. Build or start the application:
   ```bash
   npm run build
   ```
No front-end code changes are needed when switching between local mock mode and the remote backend.
