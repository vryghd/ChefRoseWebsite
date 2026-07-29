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

---

#### Tab 3 (Optional) — Rename it "Sauces" or "Flavors"

Set up Row 1 as headers:

| A | B |
|---|---|
| name | available |

Example rows:

| name | available |
|------|-----------|
| Peach Teriyaki | TRUE |
| Sweet Chili | TRUE |
| Plain Cajun | TRUE |

---

### Step 2 — Publish via Apps Script

1. In your Google Sheet, click **Extensions → Apps Script**
2. Delete any existing code and paste in this entire script:

```javascript
function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let menu = [];
  let sides = [];
  let sauces = [];

  // 1. Try multi-tab setup first ('Menu', 'Sides', 'Sauces')
  const menuSheet   = ss.getSheetByName('Menu');
  const sidesSheet  = ss.getSheetByName('Sides');
  const saucesSheet = ss.getSheetByName('Sauces') || ss.getSheetByName('Flavors');

  if (menuSheet) {
    const rows = menuSheet.getDataRange().getValues();
    if (rows.length > 1) {
      const hdrs = rows[0].map(h => String(h).trim());
      menu = rows.slice(1).map(row => {
        const obj = {};
        hdrs.forEach((h, i) => { if (h) obj[h] = row[i]; });
        return obj;
      });
    }
  }

  if (sidesSheet) {
    const rows = sidesSheet.getDataRange().getValues();
    if (rows.length > 1) {
      const hdrs = rows[0].map(h => String(h).trim());
      sides = rows.slice(1).map(row => {
        const obj = {};
        hdrs.forEach((h, i) => { if (h) obj[h] = row[i]; });
        return obj;
      });
    }
  }

  if (saucesSheet) {
    const rows = saucesSheet.getDataRange().getValues();
    if (rows.length > 1) {
      const hdrs = rows[0].map(h => String(h).trim());
      sauces = rows.slice(1).map(row => {
        const obj = {};
        hdrs.forEach((h, i) => { if (h) obj[h] = row[i]; });
        return obj;
      });
    }
  }

  // 2. If single-tab layout (e.g. "Very Ghood Menu" active sheet)
  if (!menu.length) {
    const sheet = ss.getSheets()[0];
    const allRows = sheet.getDataRange().getValues();

    let currentTable = null;
    let currentHdrs  = [];

    allRows.forEach(row => {
      const firstCell = String(row[0] || '').trim().toLowerCase();

      if (firstCell === 'category') {
        currentTable = 'menu';
        currentHdrs  = row.map(h => String(h).trim());
        return;
      } else if (firstCell === 'name') {
        const secondCell = String(row[1] || '').trim().toLowerCase();
        if (secondCell === 'available') {
          if (sides.length === 0) {
            currentTable = 'sides';
          } else {
            currentTable = 'sauces';
          }
          currentHdrs = row.map(h => String(h).trim());
          return;
        }
      }

      if (currentTable && row.some(cell => String(cell).trim() !== '')) {
        const obj = {};
        currentHdrs.forEach((h, i) => { if (h) obj[h] = row[i]; });

        if (currentTable === 'menu' && obj['name']) {
          menu.push(obj);
        } else if (currentTable === 'sides' && obj['name']) {
          sides.push(obj);
        } else if (currentTable === 'sauces' && obj['name']) {
          sauces.push(obj);
        }
      }
    });
  }

  return ContentService
    .createTextOutput(JSON.stringify({ menu, sides, sauces }))
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
