// ============================================================
// VERY GHOOD — Site Configuration
// Update these values as needed
// ============================================================

const CONFIG = {

  // ── Google Sheets ──────────────────────────────────────────
  // After setting up your Google Sheet + Apps Script,
  // paste the published JSON URL here.
  SHEETS_URL: 'YOUR_GOOGLE_SHEETS_JSON_URL_HERE',

  // ── Payment Processor ──────────────────────────────────────
  // Uncomment and fill in when you choose a processor.

  // ── Stripe ─────────────────────────────────────────────────
  // Paste your Stripe publishable key (starts with pk_live_ or pk_test_)
  STRIPE_PUBLIC_KEY: 'pk_test_XXXXXXXXXXXXXXXXXXXX',

  // Serverless function endpoint (works on Netlify automatically)
  PAYMENT_INTENT_URL: '/api/create-payment-intent',

  // ── Business Info ──────────────────────────────────────────
  PHONE:  '(816) 606-1850',
  EMAIL:  'rose@veryghood.com',
  INSTAGRAM_BUSINESS:   'veryghoodchef',
  INSTAGRAM_PERSONAL:   'chrisrosehill',
  INSTAGRAM_EVENTS:     'thenightcartel',

  // ── Catering Deposit ───────────────────────────────────────
  DEPOSIT_AMOUNT: 250,

  // ── Gallery Photos ──────────────────────────────────────────
  // Add filenames here as you drop images into assets/photos/
  // Example: 'jerk-chicken.jpg', 'oxtail-bowl.jpg'
  GALLERY_PHOTOS: [
    // 'filename.jpg',
  ],

  // ── Sample menu data (used when Sheets URL is not set) ─────
  SAMPLE_MENU: [
    { category: 'Entrees', name: 'Item Coming Soon', description: 'Menu managed via Google Sheets', price: 0.00 }
  ]
};
