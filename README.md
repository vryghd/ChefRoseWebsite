# Very Ghood — Dinner with Chef Rose

Website for Very Ghood catering and everyday menu ordering.
Hosted on **Cloudflare Pages**. Menu managed via Google Sheets.

---

## Google Sheets Menu Setup (Do This Once)

### Step 1 — Create the Sheet

1. Go to [sheets.google.com](https://sheets.google.com)
2. Create a new spreadsheet — name it **Very Ghood Menu**
3. You need **two tabs** inside the same spreadsheet

---

#### Tab 1 — Rename it "Menu"

Set up Row 1 as headers exactly:

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| category | name | description | price | type | sides |

- `category` — how items group on the site (e.g. Entrée, À la Carte)
- `type` — either **entrée** or **standalone**
  - `entrée` → customer sees a sides picker before adding to cart
  - `standalone` → adds to cart directly (pasta, soups, etc.)
- `sides` — how many sides the customer must choose (e.g. `2` or `3`) — leave blank for standalone

Example rows:

| category | name | description | price | type | sides |
|----------|------|-------------|-------|------|-------|
| Entrée | Lamb Chops | Pan-seared lamb | 38.00 | entrée | 2 |
| Entrée | Lobster Tail | Butter-poached | 55.00 | entrée | 3 |
| À la Carte | Pasta | Rigatoni in vodka cream sauce | 18.00 | standalone | |

---

#### Tab 2 — Rename it "Sides"

Set up Row 1 as headers:

| A | B |
|---|---|
| name | available |

- Set `available` to **TRUE** to show the side, **FALSE** to hide it that day

Example:

| name | available |
|------|-----------|
| Garlic Mashed Potatoes | TRUE |
| Roasted Asparagus | TRUE |
| Mac & Cheese | TRUE |
| Rice & Peas | FALSE |
| Roasted Carrots | TRUE |
| Sautéed Spinach | TRUE |

**To change sides that day**: just flip TRUE ↔ FALSE in the Sides tab from your phone.

---

### Step 2 — Publish via Apps Script

1. In your Google Sheet, click **Extensions → Apps Script**
2. Delete any existing code and paste in this entire script:

```javascript
function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── Menu tab ─────────────────────────────────────────────
  const menuSheet = ss.getSheetByName('Menu');
  const menuRows  = menuSheet.getDataRange().getValues();
  const menuHdrs  = menuRows[0];
  const menu = menuRows.slice(1).map(row => {
    const obj = {};
    menuHdrs.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });

  // ── Sides tab ─────────────────────────────────────────────
  const sidesSheet = ss.getSheetByName('Sides');
  const sidesRows  = sidesSheet.getDataRange().getValues();
  const sidesHdrs  = sidesRows[0];
  const sides = sidesRows.slice(1).map(row => {
    const obj = {};
    sidesHdrs.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });

  return ContentService
    .createTextOutput(JSON.stringify({ menu, sides }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Click **Save** — name the project anything (e.g. "VeryGhood")
4. Click **Deploy → New Deployment**
5. Gear icon next to "Select type" → **Web App**
6. **Execute as:** Me — **Who has access:** Anyone
7. Click **Deploy** — copy the URL

### Step 3 — Paste URL into Site

Open `public/js/config.js` and replace `YOUR_GOOGLE_SHEETS_JSON_URL_HERE` with your new Google Apps Script Web App URL. Save the file, commit, and push.

---

## Updating the Menu From Your Phone

- **Change a side dish**: open Sides tab, flip TRUE/FALSE
- **Change what the pasta is today**: edit the description cell in the Menu tab
- **Add a new item**: add a row in the Menu tab
- **Hide an item**: delete the row or change the price to 0

Changes are live within a few minutes — no code needed.

---

## Cloudflare Pages Setup

1. Push this repo to GitHub
2. Log into Cloudflare Dashboard → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
3. Select this repository.
4. In the Build settings:
   - **Framework preset**: None
   - **Build command**: (leave blank)
   - **Build output directory**: `public`
5. Click **Save and Deploy**. Your site will be live and your `functions/api/create-payment-intent.js` serverless function will automatically be configured!

---

## Payment Processor Setup (Stripe)

Stripe is fully integrated using Cloudflare Pages serverless functions.
To ensure payments work in production:

1. Open `public/js/config.js` and ensure `CONFIG.STRIPE_PUBLIC_KEY` is set to your **Live Public Key** (`pk_live_...`).
2. Go to your Cloudflare Dashboard → Pages → Your Project → **Settings** → **Environment variables**.
3. Add a new variable: `STRIPE_SECRET_KEY` and paste your **Live Secret Key** (`sk_live_...`).
4. Go to **Settings** → **Functions** → **Compatibility flags** and ensure `nodejs_compat` is added to production.
5. Deploy a new build to apply the keys.

---

## File Structure

```text
/
├── functions/
│   └── api/
│       └── create-payment-intent.js  ← Stripe serverless function (Cloudflare)
├── public/
│   ├── index.html                    ← Home
│   ├── menu.html                     ← Everyday menu
│   ├── catering.html                 ← Catering booking
│   ├── cart.html                     ← Cart & checkout
│   ├── confirmation.html             ← Order confirmed
│   ├── contact.html                  ← Contact
│   ├── css/
│   │   └── style.css                 ← All styles
│   ├── js/
│   │   ├── config.js                 ← Sheets URL, Stripe public key, business info
│   │   ├── menu.js                   ← Menu rendering logic
│   │   ├── cart.js                   ← LocalStorage cart logic + Stripe Checkout
│   │   └── catering.js               ← Catering form + $250 Deposit Checkout
│   └── assets/
│       ├── logo.png                  ← Chef Rose logo
│       └── photos/                   ← Food photos for gallery
```
