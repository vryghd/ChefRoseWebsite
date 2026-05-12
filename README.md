# Very Ghood — Dinner with Chef Rose

Website for Very Ghood catering and everyday menu ordering.
Hosted on GitHub Pages. Menu managed via Google Sheets.

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

Open `js/config.js` and replace `YOUR_GOOGLE_SHEETS_JSON_URL_HERE` with your URL. Commit and push.

---

## Updating the Menu From Your Phone

- **Change a side dish**: open Sides tab, flip TRUE/FALSE
- **Change what the pasta is today**: edit the description cell in the Menu tab
- **Add a new item**: add a row in the Menu tab
- **Hide an item**: delete the row or change the price to 0

Changes are live within a few minutes — no code needed.

---

## GitHub Pages Setup

1. Push this repo to GitHub
2. Go to your repo → **Settings → Pages**
3. Set source to **Deploy from a branch → master → / (root)**
4. Your site will be live at `https://yourusername.github.io/very-ghood/`

---

## Payment Processor (Add When Ready)

Open `js/config.js` and uncomment + fill in either:
- **Stripe**: Add your `STRIPE_PUBLIC_KEY`
- **Square**: Add your `SQUARE_APP_ID` and `SQUARE_LOCATION_ID`

Then update `js/cart.js` (online payment section) and `js/catering.js` (deposit section) — both files have clear `TODO` comments marking exactly where to plug in.

---

## File Structure

```
/
├── index.html          ← Home
├── menu.html           ← Everyday menu
├── catering.html       ← Catering booking
├── cart.html           ← Cart & checkout
├── confirmation.html   ← Order confirmed
├── contact.html        ← Contact
├── css/
│   └── style.css       ← All styles
├── js/
│   ├── config.js       ← Sheets URL, payment keys, business info
│   ├── menu.js         ← Menu rendering
│   ├── cart.js         ← Cart logic
│   └── catering.js     ← Catering form
└── assets/
    ├── logo.png        ← Chef Rose logo
    └── photos/         ← Food photos (add when ready)
```
