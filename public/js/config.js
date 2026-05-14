// ============================================================
// VERY GHOOD — Site Configuration
// Update these values as needed
// ============================================================

const CONFIG = {

  // ── Google Sheets ──────────────────────────────────────────
  // After setting up your Google Sheet + Apps Script,
  // paste the published JSON URL here.
  SHEETS_URL: 'https://script.google.com/macros/s/AKfycbwei8QWqZr2YFJyvrHvtZhI8HF3Re3eBIV3NrcS2d_JMKd_-xExRF0zBaYgFunUuWQ5/exec',

  // ── Stripe ─────────────────────────────────────────────────
  // Paste your Stripe publishable key (starts with pk_live_ or pk_test_)
  STRIPE_PUBLIC_KEY: 'pk_live_51TW3ye3C5MtiZo8ZQjsNGoBHPSCGmzDOUVmaoQZTJqZJsQzAFZBYC2PpZa6cTCj1J0sxLa7cSlu5O5ineUQ7aEdJ00w80gT4sa',

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

  // ── Extras Pricing ─────────────────────────────────────────
  // Price per additional side beyond what's included
  EXTRA_SIDE_PRICE: 3.00,
  // Price to add an extra portion of protein
  EXTRA_MEAT_PRICE: 8.00,

  // ── Gallery Photos ──────────────────────────────────────────
  // Add filenames here as you drop images into assets/photos/
  // Example: 'jerk-chicken.jpg', 'oxtail-bowl.jpg'
  GALLERY_PHOTOS: [
    // 'filename.jpg',
  ],

  // ── Sample data (used when Sheets URL is not set) ───────────────
  // type: 'entrée'  → shows sides picker, 'sides' column = how many they choose
  // type: 'standalone' → adds to cart directly, no sides picker
  SAMPLE_MENU: [
    { category: 'Entrée',     name: 'Lamb Chops',   description: 'Connect your Google Sheet to display live menu items and pricing.', price: 25.00, type: 'entrée',     sides: 2 },
    { category: 'Entrée',     name: 'Lobster Tail',  description: 'Connect your Google Sheet to display live menu items and pricing.', price: 35.00, type: 'entrée',     sides: 2 },
    { category: 'À la Carte', name: 'Pasta',         description: 'Connect your Google Sheet to display live menu items and pricing.', price: 15.00, type: 'standalone', sides: 0 },
  ],

  SAMPLE_SIDES: [
    'Garlic Mashed Potatoes',
    'Roasted Asparagus',
    'Mac & Cheese',
    'Rice & Peas',
    'Roasted Carrots',
    'Sautéed Spinach',
  ],
};

// ── Global Utilities ───────────────────────────────────────
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
