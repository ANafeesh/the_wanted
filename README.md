# THE WANTED — FACTORY OUTLET

Official web application for **The Wanted** factory outlet store. Real brands, outlet prices, straight from the factory floor.

Built with React 19, Vite, Tailwind CSS v4, GSAP ScrollTrigger, and Web Audio API.

---

## Design System & Theme

* **Hero Entrance**: Dark, cinematic 3D frame sequence with a tall smooth gradient transition into the light theme.
* **Post-Hero Theme**: Light editorial clothing-store theme (`#f4f2ee` page background, `#ffffff` cards, `#0a0a0b` primary text, `#5c5a5e` muted text, `#dcd8d2` borders, and `#e0261f` brand accents).
* **Marquee & Footer**: High-contrast black contrast bands with high-contrast text.

---

## Adding Products

All product catalog data comes exclusively from:

```text
src/data/products.json
```

### Expected Product Structure

Each product item in `src/data/products.json` must adhere to the following JSON structure:

```json
{
  "id": "tw-hd-01",
  "name": "Grey hoodie",
  "category": "Hoodies",
  "price": 6900,
  "originalPrice": 14500,
  "sizes": ["S", "M", "L", "XL"],
  "images": ["hoodie-grey-1.webp", "hoodie-grey-2.webp"],
  "description": "Heavyweight French terry relaxed fit hoodie with ribbed cuffs and hem.",
  "sample": true
}
```

* **`id`** *(required, string)*: Unique SKU / identifier.
* **`name`** *(required, string)*: Generic descriptive name of the garment.
* **`category`** *(required, string)*: Category name (e.g. `Hoodies`, `Bomber jackets`, `Denim jackets`, `T-shirts`, `Cargo pants`, `Jeans`, `Windbreakers`, `Knitwear`, `Sweatshirts`). Category filters and tiles are generated dynamically from these values.
* **`price`** *(required, number)*: Current outlet price in Sri Lankan Rupees (Rs.).
* **`originalPrice`** *(optional, number)*: Retail price before discount. When both `originalPrice` and `price` are provided, a discount badge percentage is dynamically calculated (`((originalPrice - price) / originalPrice) * 100`).
* **`sizes`** *(required, array of strings)*: Available sizes (e.g. `["S", "M", "L", "XL"]`).
* **`images`** *(required, array of strings)*: Array of filenames referencing photos in the `public/products/` folder.
* **`description`** *(optional, string)*: Detailed fabric and garment spec.
* **`sample`** *(optional, boolean)*: Set to `true` for temporary development products to enable the "Sample photo" tag.

### Where Product Photos Must Be Placed

Place all product images inside:

```text
public/products/
```

### How Image Filenames Are Referenced

Images are referenced directly by filename (e.g. `"hoodie-grey-1.webp"`). In the application, images are resolved from `/products/{filename}`.
* The first image in the `images` array is used as the default product photo.
* If a second image exists in the `images` array, it smoothly fades in on card hover.
* In the product Quick View modal, all images are shown as selectable gallery thumbnails.
* If `images` is empty or if an image file does not exist, the website gracefully displays a neutral placeholder: **Photo coming soon**.
* If `products.json` has no items, the shop section displays: **New stock arriving soon**.

### Sample Photo Tag Global Switch

Controlled centrally in `src/data/content.js`:

```javascript
export const SHOW_SAMPLE_TAG = true; // Toggle to false to hide "Sample photo" badge globally
```

---

## Image Credits

All temporary development photography credits and original Unsplash photographer attributions are documented in:

```text
public/products/CREDITS.md
```

---

## Changing Contact Details

All site copy, physical address, and contact phone numbers are centralized in:

```text
src/data/content.js
```

### TODO Placeholders

Look for the `TODO` comments inside `src/data/content.js` to update real contact details:

1. **Shop Address**:
   ```javascript
   // TODO: Insert your real physical shop address here when available
   address: 'Shop address',
   ```
2. **WhatsApp Contact Number**:
   ```javascript
   // TODO: Insert your real WhatsApp phone number here (e.g., +94 7X XXX XXXX)
   whatsApp: 'WhatsApp +94 7X XXX XXXX',
   // TODO: Insert your raw WhatsApp contact number for wa.me link
   whatsAppRaw: '+947XXXXXXXX',
   ```
3. **Opening Hours**:
   ```javascript
   // TODO: Insert opening hours if applicable
   hours: 'Monday – Saturday: 10:00 AM – 8:00 PM',
   ```

Do not hardcode contact details across components. All components (Navbar, Footer, Modals) read from `siteContent`.

---

## Backend Integration

The frontend uses a backend-ready service abstraction layer located in:

```text
src/services/api.js
```

### Service Interface

The service module exports three functions:

* **`getProducts()`**: Fetches all products. Currently reads from `src/data/products.json`.
* **`createOrder(order)`**: Places an order. Currently stores demo orders in `localStorage` under `the_wanted_demo_orders`.
* **`getOrderStatus(id)`**: Retrieves status for an order ID from `localStorage`.

---

## Running the Application

### Install Dependencies

```bash
npm install
```

### Start Development Server

```bash
npm run dev
```

### Production Build

```bash
npm run build
```
