// ============================================================
// Netlify Serverless Function — Create Stripe PaymentIntent
// This runs securely on the server — your secret key never
// touches the browser.
//
// Deploy to Netlify and set environment variable:
//   STRIPE_SECRET_KEY = sk_live_XXXXXXXXXXXXXXXXXXXX
// ============================================================

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { amount, metadata = {} } = JSON.parse(event.body);

    if (!amount || isNaN(amount) || amount <= 0) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'Invalid amount.' }),
      };
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount:   Math.round(parseFloat(amount) * 100), // dollars → cents
      currency: 'usd',
      metadata,
      automatic_payment_methods: { enabled: true },
    });

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ clientSecret: paymentIntent.client_secret }),
    };

  } catch (err) {
    console.error('Stripe error:', err.message);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: err.message }),
    };
  }
};

function corsHeaders() {
  return {
    'Content-Type':                'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}
