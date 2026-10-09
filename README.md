# THE WANTED — FACTORY OUTLET

Official web application and Node.js backend for **The Wanted** clothing factory outlet with an online shop and a physical shop. Customers can choose delivery by post across Sri Lanka or collection from the physical store in Kandy.

---

## 1. Backend Architecture & Tech Stack

* **Runtime**: Node.js 20+ (ES Modules)
* **Framework**: Express 5
* **Database & ORM**: Prisma ORM with SQLite (switching to PostgreSQL in production is only a `schema.prisma` configuration change)
* **Validation**: Zod schema validation
* **Authentication**: Signed JWT inside an `httpOnly` cookie (`SameSite: Lax`, `Secure` in production, 8-hour expiry)
* **Security & Optimization**: Helmet, CORS restricted to `FRONTEND_ORIGIN`, Compression, Express Rate Limit, 100 KB JSON body limit
* **File Processing**: Multer memory storage + Sharp (image inspection, max 1200px width resize, WebP conversion)
* **Testing**: Vitest + Supertest
* **Base Path**: `/api`
* **Currency**: Whole Sri Lankan Rupees (LKR / Rs.) stored as integers

---

## 2. Windows Setup & Quick Start

### 2.1 Prerequisites
* Node.js v20+ (`node -v`)
* npm v10+ (`npm -v`)

### 2.2 Installation & Environment Configuration
1. Clone the repository and navigate into the project directory:
   ```powershell
   cd d:\Shop\the-wanted
   ```
2. Install dependencies:
   ```powershell
   npm install
   ```
3. Copy `.env.example` to create your local `.env`:
   ```powershell
   copy .env.example .env
   ```
4. Verify or customize your `.env` variables:
   ```env
   PORT=4000
   DATABASE_URL="file:./dev.db"
   JWT_SECRET=super_secret_jwt_key_the_wanted_store_at_least_32_characters_2026
   FRONTEND_ORIGIN=http://localhost:5173
   ADMIN_EMAIL=admin@thewanted.lk
   ADMIN_PASSWORD=AdminSecurePassword123!
   TRACKING_URL_TEMPLATE=https://tracking.post.lk/?id={trackingNumber}
   PRODUCTS_SEED_FILE=src/data/products.json
   ```

### 2.3 Initialize Database & Seed
Initialize the database schema and seed the initial admin account, store settings, and products from `src/data/products.json`:

```powershell
npx prisma db push
npm run seed
```

### 2.4 Running the Applications
* **Start Backend API Server**:
  ```powershell
  npm run server
  ```
  API is accessible at `http://localhost:4000/api`.

* **Start React Frontend**:
  In a separate terminal:
  ```powershell
  npm run dev
  ```
  Front-end will run at `http://localhost:5173`. Ensure `.env` in the frontend or root has `VITE_API_URL=http://localhost:4000/api`.

* **Run Automated Tests**:
  ```powershell
  npm test
  ```

---

## 3. Admin Authentication

The backend creates a single admin account via the seed script from `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

### Log In as Admin
Send a `POST` request to `/api/admin/login`:

```bash
curl -X POST http://localhost:4000/api/admin/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"admin@thewanted.lk","password":"AdminSecurePassword123!"}'
```

* The response sets a signed JWT in an `httpOnly` cookie (`admin_token`).
* Future admin requests can include `-b cookies.txt` (or the `Authorization: Bearer <token>` header).
* To log out: `POST /api/admin/logout`.

---

## 4. Endpoints Table

### 4.1 Public Endpoints

| Method | Endpoint | Description | Rate Limit |
|---|---|---|---|
| `GET` | `/health` / `/api/health` | Service health status | Standard |
| `GET` | `/api/config` | Store shipping fee, thresholds, shop hours & contact | Standard |
| `GET` | `/api/products` | All active products | Standard |
| `GET` | `/api/products/:id` | Single active product by ID | Standard |
| `POST` | `/api/orders` | Place customer order (Server calculates prices & fees) | 10 / hr / IP |
| `GET` | `/api/orders/:reference?phone=...` | Public order status lookup (requires matching customer phone) | 20 / 15m / IP |

### 4.2 Protected Admin Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/admin/login` | Log in and receive 8-hr httpOnly cookie (5 / 15m / IP) |
| `POST` | `/api/admin/logout` | Log out and clear cookie |
| `GET` | `/api/admin/me` | Current authenticated admin profile |
| `GET` | `/api/admin/orders` | List orders (filters: `status`, `fulfillment`, `paymentStatus`, `search`, `page`, `limit`) |
| `GET` | `/api/admin/orders/:reference` | Full order record (customer info, line items, notes) |
| `PATCH` | `/api/admin/orders/:reference/status` | Advance status (`{ "status": "..." }`) |
| `PATCH` | `/api/admin/orders/:reference/payment` | Update payment status (`{ "paymentStatus": "paid" \| "unpaid" }`) |
| `PATCH` | `/api/admin/orders/:reference/tracking` | Add / edit postal tracking number (`{ "trackingNumber": "..." }`) |
| `GET` | `/api/admin/orders/:reference/label` | Print postal shipping label (Post orders only; no prices) |
| `GET` | `/api/admin/products` | All products including inactive |
| `POST` | `/api/admin/products` | Create a new garment |
| `PUT` | `/api/admin/products/:id` | Update product details |
| `DELETE` | `/api/admin/products/:id` | Soft delete garment (sets `active: false`) |
| `POST` | `/api/admin/upload` | Upload product image (JPG/PNG/WebP, max 8 MB, auto-WebP converted) |
| `GET` | `/api/admin/settings` | Retrieve store configuration |
| `PUT` | `/api/admin/settings` | Update store configuration |

---

## 5. Order of Operations

### 5.1 Postal Order Flow (`fulfillment: "post"`)

```
[Customer Checkout]
       │
       ▼
1. POST /api/orders (status: pending, paymentStatus: unpaid)
       │
       ▼
2. Admin confirms stock: PATCH /api/admin/orders/:reference/status -> confirmed
       │
       ▼
3. Outlet tags & packs garments:
   - If paymentMethod is "bank_transfer", customer must deposit funds first:
     PATCH /api/admin/orders/:reference/payment -> paid
   - PATCH /api/admin/orders/:reference/status -> packed
       │
       ▼
4. Dispatch & Handover to Postal Service:
   - Admin attaches postal tracking barcode:
     PATCH /api/admin/orders/:reference/tracking -> { trackingNumber: "SL-12345678" }
     (Order automatically transitions to "posted" and records postedAt timestamp)
   - Or PATCH /api/admin/orders/:reference/status -> posted
       │
       ▼
5. Delivery:
   - When delivered to doorstep:
     PATCH /api/admin/orders/:reference/status -> delivered
     (If COD, order automatically marks paymentStatus: paid)
   - If parcel is returned to shop:
     PATCH /api/admin/orders/:reference/status -> returned
```

### 5.2 Shop Pickup Flow (`fulfillment: "pickup"`)

```
[Customer Checkout]
       │
       ▼
1. POST /api/orders (status: pending, paymentStatus: unpaid)
       │
       ▼
2. Shop team confirms item availability:
   PATCH /api/admin/orders/:reference/status -> confirmed
       │
       ▼
3. Counter staging:
   - If paymentMethod is "bank_transfer", customer must deposit funds first:
     PATCH /api/admin/orders/:reference/payment -> paid
   - Team moves garments to collection counter:
     PATCH /api/admin/orders/:reference/status -> ready_for_pickup
     (Records readyAt timestamp)
       │
       ▼
4. Collection:
   - Customer collects at the physical outlet in Kandy:
     PATCH /api/admin/orders/:reference/status -> collected
     (If pay_at_shop, order automatically marks paymentStatus: paid; records collectedAt timestamp)
```

*(Note: Orders in non-terminal states can transition to `cancelled` if requested).*

---

## 6. Frontend Configuration

When testing against the live backend:
1. In the root `.env` or front-end configuration, ensure:
   ```env
   VITE_API_URL=http://localhost:4000/api
   ```
2. The front-end service layer [`src/services/api.js`](file:///d:/Shop/the-wanted/src/services/api.js) will make requests to your live backend.
3. If `VITE_API_URL` is omitted, the front end falls back to local mocks.
