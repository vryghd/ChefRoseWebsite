# Very Ghood — Dinner with Chef Rose

Website for Very Ghood catering and everyday menu ordering.
Hosted on GitHub Pages. Menu managed via Google Sheets.

---

## Google Sheets Menu Setup (Do This Once)

### Step 1 — Create the Sheet

1. Go to [sheets.google.com](https://sheets.google.com) on your phone or computer
2. Create a new spreadsheet — name it **Very Ghood Menu**
3. Set up **Row 1** as headers exactly like this:

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| category | name | description | price | available | image |

4. Add your menu items starting on Row 2. Example:

| category | name | description | price | available | image |
|----------|------|-------------|-------|-----------|-------|
| Entrees | Jerk Chicken Bowl | Slow-cooked w/ rice & peas | 18.00 | TRUE | |
| Sides | Mac & Cheese | Creamy, baked | 6.00 | TRUE | |

- Set `available` to **FALSE** to hide an item without deleting it
- Leave `image` blank for now — add a URL when you have photos

### Step 2 — Publish via Apps Script

1. In your Google Sheet, click **Extensions → Apps Script**
2. Delete any existing code and paste in this entire script:

```javascript
function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const rows  = sheet.getDataRange().getValues();
  const headers = rows[0];
  const data = rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Click **Save** (name the project anything, e.g. "VeryGhood")
4. Click **Deploy → New Deployment**
5. Click the gear icon next to "Select type" → choose **Web App**
6. Set **Execute as:** Me
7. Set **Who has access:** Anyone
8. Click **Deploy** — copy the URL it gives you

### Step 3 — Add URL to Site

1. Open `js/config.js` in this project
2. Replace `YOUR_GOOGLE_SHEETS_JSON_URL_HERE` with the URL you copied
3. Save and push to GitHub

---

## Updating the Menu From Your Phone

1. Open **Google Sheets** app → open "Very Ghood Menu"
2. Edit any row (change price, toggle available to FALSE, add new item)
3. The site updates automatically within a few minutes — no coding needed

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
