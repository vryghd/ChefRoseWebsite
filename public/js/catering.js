// ============================================================
// VERY GHOOD — catering.js
// Booking form + $250 Stripe deposit
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const form      = document.getElementById('catering-form');
  const submitBtn = document.getElementById('catering-submit-btn');
  const errorEl   = document.getElementById('catering-form-error');
  const successEl = document.getElementById('catering-success');
  if (!form) return;

  let stripe   = null;
  let elements = null;

  // ── Init Stripe Payment Element ─────────────────────────
  async function initStripeDeposit() {
    const depositArea = document.getElementById('deposit-payment-area');
    depositArea.innerHTML = '<div class="loading-state" style="padding:1rem 0;">Loading payment form…</div>';

    try {
      stripe = Stripe(CONFIG.STRIPE_PUBLIC_KEY);

      const res = await fetch(CONFIG.PAYMENT_INTENT_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          amount:   CONFIG.DEPOSIT_AMOUNT,
          metadata: { source: 'catering-deposit' },
        }),
      });
      const { clientSecret, error } = await res.json();
      if (error) throw new Error(error);

      elements = stripe.elements({ clientSecret, appearance: stripeAppearance() });
      const payEl = elements.create('payment');
      depositArea.innerHTML = '<div id="stripe-deposit-element"></div>';
      payEl.mount('#stripe-deposit-element');

    } catch (err) {
      document.getElementById('deposit-payment-area').innerHTML =
        `<div class="payment-placeholder">Payment form unavailable. Call us to reserve your date: ${CONFIG.PHONE}</div>`;
      console.error('Stripe deposit init error:', err);
    }
  }

  initStripeDeposit();

  // ── Form submit ─────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');

    const firstName = form.querySelector('#first-name').value.trim();
    const lastName  = form.querySelector('#last-name').value.trim();
    const email     = form.querySelector('#email').value.trim();
    const eventDate = form.querySelector('#event-date').value;
    const eventType = form.querySelector('#event-type').value;

    if (!firstName || !lastName) { showError('Please enter your full name.'); return; }
    if (!email || !email.includes('@')) { showError('Please enter a valid email.'); return; }
    if (!eventDate) { showError('Please select your event date.'); return; }
    if (!eventType) { showError('Please select an event type.'); return; }

    if (!stripe || !elements) { showError('Payment form is not ready yet. Please wait a moment.'); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing deposit…';

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/confirmation.html?type=catering',
        payment_method_data: {
          billing_details: { name: `${firstName} ${lastName}`, email },
        },
      },
      redirect: 'if_required',
    });

    if (error) {
      showError(error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit & Pay $250 Deposit';
      return;
    }

    form.classList.add('hidden');
    successEl.classList.remove('hidden');
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
      '.Input': { border: '1px solid #E2E2E2', boxShadow: 'none' },
      '.Input:focus': { border: '1px solid #0A0A0A', boxShadow: 'none' },
      '.Label': { fontFamily: '"Courier Prime", monospace', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5A5A5A' },
    },
  };
}
