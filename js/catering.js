// ============================================================
// VERY GHOOD — catering.js
// Catering booking form + $250 deposit payment handler
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const form      = document.getElementById('catering-form');
  const submitBtn = document.getElementById('catering-submit-btn');
  const errorEl   = document.getElementById('catering-form-error');
  const successEl = document.getElementById('catering-success');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');

    // ── Validation ──────────────────────────────────────────
    const firstName = form.querySelector('#first-name').value.trim();
    const lastName  = form.querySelector('#last-name').value.trim();
    const email     = form.querySelector('#email').value.trim();
    const eventDate = form.querySelector('#event-date').value;
    const eventType = form.querySelector('#event-type').value;

    if (!firstName || !lastName) {
      showError('Please enter your full name.'); return;
    }
    if (!email || !email.includes('@')) {
      showError('Please enter a valid email address.'); return;
    }
    if (!eventDate) {
      showError('Please select an event date.'); return;
    }
    if (!eventType) {
      showError('Please select an event type.'); return;
    }

    // ── Payment ─────────────────────────────────────────────
    // TODO: Replace this block with your chosen processor.
    //
    // --- Stripe Example ---
    // const stripe  = Stripe(CONFIG.STRIPE_PUBLIC_KEY);
    // const { error, paymentMethod } = await stripe.createPaymentMethod({ ... });
    //
    // --- Square Example ---
    // const payments = Square.payments(CONFIG.SQUARE_APP_ID, CONFIG.SQUARE_LOCATION_ID);
    // const card = await payments.card(); await card.attach('#deposit-payment-area');
    // const result = await card.tokenize();

    const processorReady = false; // set to true once payment processor is configured

    if (!processorReady) {
      // Temporary: allow form submission without live payment
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting…';

      // Simulate brief processing delay
      await new Promise(r => setTimeout(r, 1000));

      form.classList.add('hidden');
      successEl.classList.remove('hidden');
      return;
    }

    // Production flow — charge $250 deposit
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing…';

    try {
      // const token = await getPaymentToken(); // implement per processor
      // await fetch('/api/catering-deposit', { method:'POST', body: JSON.stringify({ token, ...formData }) });
      form.classList.add('hidden');
      successEl.classList.remove('hidden');
    } catch (err) {
      showError('Payment failed. Please try again or contact us directly.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit & Pay $250 Deposit';
    }
  });

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
  }
});
