// ============================================================
// VERY GHOOD — cookbook.js
// Booking form + $20 Stripe payment for digital download
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const form        = document.getElementById('cookbook-form');
  const submitBtn   = document.getElementById('cookbook-submit-btn');
  const errorEl     = document.getElementById('cookbook-form-error');
  const paymentArea = document.getElementById('cookbook-payment-area');
  
  if (!form) return;

  let stripe   = null;
  let elements = null;
  const AMOUNT = 20; // $20.00

  // ── Init Stripe Payment Element ─────────────────────────
  async function initStripe() {
    paymentArea.innerHTML = '<div class="loading-state" style="padding:1rem 0;">Loading payment form…</div>';

    try {
      stripe = Stripe(CONFIG.STRIPE_PUBLIC_KEY);

      const res = await fetch(CONFIG.PAYMENT_INTENT_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          amount:   AMOUNT,
          metadata: { source: 'cookbook-purchase' },
        }),
      });
      const { clientSecret, error } = await res.json();
      if (error) throw new Error(error);

      elements = stripe.elements({ clientSecret, appearance: stripeAppearance() });
      const payEl = elements.create('payment', { layout: { type: 'tabs' } });
      paymentArea.innerHTML = '<div id="stripe-payment-element"></div>';
      payEl.mount('#stripe-payment-element');

    } catch (err) {
      paymentArea.innerHTML =
        `<div class="payment-placeholder">Payment form unavailable. Please try again later.</div>`;
      console.error('Stripe cookbook init error:', err);
    }
  }

  initStripe();

  // ── Form submit ─────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');

    const firstName = form.querySelector('#first-name').value.trim();
    const lastName  = form.querySelector('#last-name').value.trim();
    const email     = form.querySelector('#email').value.trim();

    if (!firstName || !lastName) { showError('Please enter your full name.'); return; }
    if (!email || !email.includes('@')) { showError('Please enter a valid email.'); return; }

    if (!stripe || !elements) { showError('Payment form is not ready yet. Please wait a moment.'); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing…';

    // Update PaymentIntent metadata before confirming
    try {
      const res2 = await fetch(CONFIG.PAYMENT_INTENT_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: AMOUNT,
          metadata: {
            source:      'cookbook-purchase',
            customer:    `${firstName} ${lastName}`.trim(),
            email:       email,
            item:        'Very Ghood Cookbook v1',
            amount_paid: `$${AMOUNT.toFixed(2)}`
          },
        }),
      });
      const { clientSecret: newSecret, error: piErr } = await res2.json();
      if (!piErr && newSecret) {
        elements.fetchUpdates();
      }
    } catch (_) { /* non-fatal — proceed with original intent */ }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/confirmation.html?type=cookbook',
        payment_method_data: {
          billing_details: { name: `${firstName} ${lastName}`, email },
        },
        receipt_email: email, // Stripe will send a receipt
      },
      redirect: 'if_required',
    });

    if (error) {
      showError(error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Pay $20.00 & Download';
      return;
    }

    // Redirect to confirmation so they know it worked
    window.location.href = 'confirmation.html?type=cookbook';
  });

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
  }
});

function stripeAppearance() {
  return {
    theme: 'stripe',
    variables: {
      colorPrimary:    '#C8212A',
      colorBackground: '#FAFAFA',
      colorText:       '#0A0A0A',
      colorDanger:     '#C8212A',
      fontFamily:      '"DM Sans", system-ui, sans-serif',
      borderRadius:    '0px',
    },
    rules: {
      '.Input':       { border: '1px solid #E2E2E2', boxShadow: 'none' },
      '.Input:focus': { border: '1px solid #0A0A0A', boxShadow: 'none' },
      '.Label':       { fontFamily: '"Courier Prime", monospace', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5A5A5A' },
    },
  };
}
