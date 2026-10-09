# The Wanted — Backend API Contract & Specification

This document defines the formal API contract between **The Wanted** front-end application and the **Node.js Express backend**.

Base API path: `/api`
All endpoints accept and return UTF-8 JSON payloads with `Content-Type: application/json` unless otherwise noted (such as multipart file uploads).

---

## 1. Public Data Models & Payloads

### 1.1 Product Object (`Product`)

```typescript
interface Product {
  id: string;               // Unique product identifier (e.g., "tw-hd-01")
  name: string;             // Display name (e.g., "Grey hoodie")
  category: string;         // Department name (e.g., "Hoodies", "Jeans", "T-Shirts")
  price: number;            // Outlet selling price in whole LKR (Rs.)
  originalPrice?: number;   // Optional original retail price in LKR
  sizes: string[];          // Available sizes (e.g., ["S", "M", "L", "XL"])
  images: string[];         // Image filenames in /uploads or static product assets
  description?: string;     // Product fabric, fit, and construction details
  sample?: boolean;         // Optional flag: if true, displays "Sample photo" tag
  active: boolean;          // Active status flag (public GET /products only returns active: true)
}
```

---

### 1.2 Store Configuration (`StoreConfig`)

Fetched via `GET /api/config` or provided locally via `defaultConfig`:

```typescript
interface StoreConfig {
  shippingFee: number;                  // Shipping fee in whole LKR for postal delivery (default 0)
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
  fulfillment: "post" | "pickup";       // Required delivery method
  customer: {
    name: string;                       // Required (2 to 80 characters)
    phone: string;                      // Required Sri Lankan mobile number (07XXXXXXXX, +947XXXXXXXX, 947XXXXXXXX)
    address?: string;                   // Required ONLY for "post" (5 to 200 characters)
    city?: string;                      // Required ONLY for "post" (2 to 60 characters)
    postalCode?: string;                // Required ONLY for "post" (exactly 5 digits)
    district?: string;                  // Required ONLY for "post" (one of Sri Lanka's 25 districts)
  };
  paymentMethod: "cod" | "bank_transfer" | "pay_at_shop";
  items: Array<{
    productId: string;                  // Unique product identifier
    size: string;                       // Selected size (must be offered by product)
    quantity: number;                   // Positive integer (1 to 10)
  }>;                                   // Max 20 line items
  notes?: string;                       // Optional customer note (up to 300 characters)
}
```

#### Fulfillment & Payment Constraints:
- `fulfillment === "post"`:
  - Requires `address`, `city`, `postalCode` (5 digits), and `district` (one of the 25 administrative districts).
  - Allowed payment methods: `"cod"` and `"bank_transfer"` (when enabled in config).
  - `"pay_at_shop"` is rejected with `400 INVALID_INPUT`.
- `fulfillment === "pickup"`:
  - Must not store address fields.
  - Allowed payment methods: `"pay_at_shop"` and `"bank_transfer"` (when enabled in config).
  - `"cod"` is rejected with `400 INVALID_INPUT`.
- Disabled payment methods return `400 PAYMENT_METHOD_UNAVAILABLE`.

---

### 1.4 Order Response (`CreateOrderResponse`)

Returned by `POST /api/orders` (HTTP 201):

```typescript
interface CreateOrderResponse {
  reference: string;                    // Unique reference (e.g., "TW-784291")
  fulfillment: "post" | "pickup";       // Fulfillment type
  status: "pending";                    // Initial status
  paymentStatus: "unpaid";              // Initial payment status
  subtotal: number;                     // Server-computed items subtotal in whole LKR
  shippingFee: number;                  // Server-computed shipping fee in whole LKR
  total: number;                        // Server-computed grand total in whole LKR
  items: Array<{
    productId: string;
    name: string;
    size: string;
    quantity: number;
    unitPrice: number;                  // Recorded unit price at time of purchase
  }>;
  paymentMethod: "cod" | "bank_transfer" | "pay_at_shop";
  bankTransferInstructions: string;     // Instructions if paymentMethod === "bank_transfer", else ""
  createdAt: string;                    // ISO 8601 timestamp
}
```

---

### 1.5 Order Status Lifecycle & Rules

#### Postal Delivery (`fulfillment: "post"`):
- Statuses: `pending`, `confirmed`, `packed`, `posted`, `delivered`, `cancelled`, `returned`
- Allowed transitions:
  - `pending` -> `confirmed` | `cancelled`
  - `confirmed` -> `packed` | `cancelled`
  - `packed` -> `posted` | `cancelled`
  - `posted` -> `delivered` | `returned`
- Terminal: `delivered`, `cancelled`, `returned`

#### Shop Collection (`fulfillment: "pickup"`):
- Statuses: `pending`, `confirmed`, `ready_for_pickup`, `collected`, `cancelled`
- Allowed transitions:
  - `pending` -> `confirmed` | `cancelled`
  - `confirmed` -> `ready_for_pickup` | `cancelled`
  - `ready_for_pickup` -> `collected` | `cancelled`
- Terminal: `collected`, `cancelled`

#### Critical Business Rules:
1. **Invalid Moves**: Return `409 INVALID_STATUS_TRANSITION`.
2. **Bank Transfer Requirement**: Orders with `paymentMethod === "bank_transfer"` cannot move to `packed` (post) or `ready_for_pickup` (pickup) until `paymentStatus === "paid"`. Returns `409 PAYMENT_REQUIRED`.
3. **Automatic Payment Marking**:
   - `cod` orders automatically become `paymentStatus: "paid"` when transitioning to `delivered`.
   - `pay_at_shop` orders automatically become `paymentStatus: "paid"` when transitioning to `collected`.
4. **Timestamps**: `postedAt`, `readyAt`, `deliveredAt`, `collectedAt` are automatically set upon entering those respective statuses.
5. **Tracking Number**: Can only be assigned when status is `packed` (automatically moves status to `posted` and sets `postedAt`) or `posted` (edits tracking number). Format: 3 to 40 alphanumeric chars or dashes (`/^[A-Za-z0-9\-]{3,40}$/`).

---

### 1.6 Public Tracking Response (`TrackedOrderResponse`)

Returned by `GET /api/orders/:reference?phone=07XXXXXXXX`:

> **PRIVACY NOTE:** Customer delivery address and contact details are omitted in public tracking responses to safeguard customer privacy.

```typescript
interface TrackedOrderResponse {
  reference: string;
  fulfillment: "post" | "pickup";
  status: string;
  paymentStatus: "unpaid" | "paid";
  paymentMethod: "cod" | "bank_transfer" | "pay_at_shop";
  subtotal: number;
  shippingFee: number;
  total: number;
  items: Array<{
    productId: string;
    name: string;
    size: string;
    quantity: number;
    unitPrice: number;
  }>;
  trackingNumber: string | null;        // Postal tracking number
  trackingUrl: string | null;           // Built from TRACKING_URL_TEMPLATE, or null
  postedAt: string | null;
  readyAt: string | null;
  deliveredAt: string | null;
  collectedAt: string | null;
  createdAt: string;
}
```

---

## 2. API Endpoints Reference

### 2.1 Public Endpoints

| Method | Endpoint | Description | Rate Limit |
|---|---|---|---|
| `GET` | `/health` / `/api/health` | Health check (`{ status: "ok" }`) | General |
| `GET` | `/api/config` | Retrieve active store settings | General |
| `GET` | `/api/products` | Retrieve active products list | General |
| `GET` | `/api/products/:id` | Retrieve single active product by ID | General |
| `POST` | `/api/orders` | Place a customer order | 10 / hr / IP |
| `GET` | `/api/orders/:reference?phone=...` | Track order by reference and customer phone | 20 / 15m / IP |

---

### 2.2 Admin Endpoints (Requires Authentication)

All admin endpoints require an active session via the `admin_token` httpOnly cookie (or `Authorization: Bearer <token>`).

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/admin/login` | Admin login with `{ email, password }`. Sets 8-hour httpOnly cookie. (Limit: 5 / 15m) |
| `POST` | `/api/admin/logout` | Clears authentication cookie. |
| `GET` | `/api/admin/me` | Returns current admin profile. |
| `GET` | `/api/admin/orders` | List orders (filters: `status`, `fulfillment`, `paymentStatus`, `search`, `page`, `limit`). Sorted newest first. |
| `GET` | `/api/admin/orders/:reference` | Get detailed order by reference (including customer and notes). |
| `PATCH` | `/api/admin/orders/:reference/status` | Update status: `{ status }`. Enforces status transitions and payment checks. |
| `PATCH` | `/api/admin/orders/:reference/payment` | Update payment status: `{ paymentStatus: "paid" \| "unpaid" }`. |
| `PATCH` | `/api/admin/orders/:reference/tracking` | Set/update tracking number: `{ trackingNumber }`. Auto-advances packed to posted. |
| `GET` | `/api/admin/orders/:reference/label` | Get shipping label for postal orders: `{ reference, name, phone, address, city, district, postalCode, itemCount }` (No prices). |
| `GET` | `/api/admin/products` | List all products (including inactive). |
| `POST` | `/api/admin/products` | Create a new product. |
| `PUT` | `/api/admin/products/:id` | Update an existing product. |
| `DELETE` | `/api/admin/products/:id` | Soft delete product (sets `active: false`). |
| `POST` | `/api/admin/upload` | Upload product image (JPG/PNG/WebP, max 8 MB, resized to max 1200px wide, converted to WebP). |
| `GET` | `/api/admin/settings` | Get current store settings. |
| `PUT` | `/api/admin/settings` | Update store settings. |

---

## 3. Standard Error Format

All error responses strictly follow this format:

```json
{
  "error": {
    "code": "STRING_ERROR_CODE",
    "message": "Human-readable explanation of error",
    "fields": {
      "fieldName": "Specific validation failure explanation"
    }
  }
}
```

### Standard Error Codes

| HTTP Status | Error Code | Description |
|---|---|---|
| `400` | `INVALID_INPUT` | Input payload validation failed (includes `fields`). |
| `400` | `INVALID_PHONE` | Phone number does not match Sri Lankan format. |
| `400` | `INVALID_SIZE` | Product does not offer the requested size. |
| `400` | `PAYMENT_METHOD_UNAVAILABLE` | Payment method is disabled in store settings. |
| `400` | `NOT_A_POSTAL_ORDER` | Requested shipping label on a shop pickup order. |
| `400` | `INVALID_FILE_TYPE` | Uploaded file is not a supported image format. |
| `400` | `FILE_TOO_LARGE` | Uploaded image exceeds 8 MB size limit. |
| `401` | `UNAUTHORIZED` | Authentication required or token expired. |
| `401` | `INVALID_CREDENTIALS` | Invalid email or password provided during login. |
| `404` | `PRODUCT_NOT_FOUND` | Product ID does not exist or is inactive. |
| `404` | `ORDER_NOT_FOUND` | Order reference not found or phone does not match. |
| `409` | `INVALID_STATUS_TRANSITION` | Disallowed status lifecycle transition. |
| `409` | `PAYMENT_REQUIRED` | Bank transfer order must be marked as paid before packing/ready for pickup. |
| `429` | `RATE_LIMIT_EXCEEDED` | Request throttled by rate limiter. |
| `500` | `INTERNAL_SERVER_ERROR` | Server execution error (internal details hidden). |

---

## 4. Summary of Differences from Previous Front-End Contract Copy

1. **Active Flag & Product Visibility**:
   `Product` includes an `active: boolean` field. Public endpoint `GET /products` returns only active products. Admin endpoint `GET /admin/products` returns both active and inactive, and `DELETE /admin/products/:id` performs soft deletion by setting `active: false`.
2. **Customer Privacy in Public Tracking**:
   The public `GET /orders/:reference?phone=...` endpoint returns the order details without the nested customer personal address and phone data to protect customer privacy on public networks.
3. **Comprehensive Admin Endpoints**:
   Added complete specifications for admin authentication, order management, status transitions, shipping labels, product catalog CRUD, image uploads, and settings configuration.
4. **Sri Lankan Phone & District Validation**:
   Formalized phone validation accepting `07XXXXXXXX`, `+947XXXXXXXX`, or `947XXXXXXXX` normalized to `947XXXXXXXX`, and postal delivery validation requiring one of Sri Lanka's 25 administrative districts.
