// ============================================================
// VERY GHOOD — catering.js
// Two modes: $250 Booking Deposit | $10 Consultation
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const form         = document.getElementById('catering-form');
  const submitBtn    = document.getElementById('catering-submit-btn');
  const errorEl      = document.getElementById('catering-form-error');
  const successEl    = document.getElementById('catering-success');
  const depositArea  = document.getElementById('deposit-payment-area');
  if (!form) return;

  let stripe   = null;
  let elements = null;
  let currentMode = 'booking'; // 'booking' | 'consult'

  // ── Service Toggle ─────────────────────────────────────
  const toggleBooking = document.getElementById('toggle-booking');
  const toggleConsult = document.getElementById('toggle-consult');

  function setMode(mode) {
    currentMode = mode;
    stripe   = null;
    elements = null;

    if (mode === 'booking') {
      toggleBooking.classList.add('active');
      toggleConsult.classList.remove('active');
      submitBtn.textContent = 'Submit & Pay $250 Deposit';
      document.getElementById('booking-fields').classList.remove('hidden');
      document.getElementById('consult-note').classList.add('hidden');
      document.getElementById('deposit-label').textContent = '$250 deposit — applied to your total';
    } else {
      toggleConsult.classList.add('active');
      toggleBooking.classList.remove('active');
      submitBtn.textContent = 'Book Consultation — $10';
      document.getElementById('booking-fields').classList.add('hidden');
      document.getElementById('consult-note').classList.remove('hidden');
      document.getElementById('deposit-label').textContent = '$10 consultation fee';
    }

    initStripe();
  }

  if (toggleBooking) toggleBooking.addEventListener('click', () => setMode('booking'));
  if (toggleConsult) toggleConsult.addEventListener('click', () => setMode('consult'));

  // ── Init Stripe ────────────────────────────────────────
  async function initStripe() {
    if (!depositArea) return;
    depositArea.innerHTML = '<div class="loading-state" style="padding:1rem 0;">Loading payment form…</div>';

    const amount = currentMode === 'booking' ? CONFIG.DEPOSIT_AMOUNT : 10;

    // Build metadata from current form values
    const firstName = form.querySelector('#first-name').value.trim();
    const lastName  = form.querySelector('#last-name').value.trim();
    const email     = form.querySelector('#email').value.trim();
    const phone     = form.querySelector('#phone').value.trim();
    const eventDate = form.querySelector('#event-date')?.value || '';
    const eventType = form.querySelector('#event-type')?.value || '';
    const guests    = form.querySelector('#guest-count')?.value || '';
    const notes     = form.querySelector('#notes').value.trim();

    const metadata = {
      source:      currentMode === 'booking' ? 'catering-deposit' : 'catering-consultation',
      customer:    `${firstName} ${lastName}`.trim(),
      email,
      phone,
      event_date:  eventDate,
      event_type:  eventType,
      guest_count: guests,
      amount_paid: `$${amount}`,
      ...(notes ? { notes: notes.slice(0, 499) } : {}),
    };

    try {
      stripe = Stripe(CONFIG.STRIPE_PUBLIC_KEY);

      const res = await fetch(CONFIG.PAYMENT_INTENT_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ amount, metadata }),
      });
      const { clientSecret, error } = await res.json();
      if (error) throw new Error(error);

      elements = stripe.elements({ clientSecret, appearance: stripeAppearance() });
      const payEl = elements.create('payment', { layout: { type: 'tabs' } });
      depositArea.innerHTML = '<div id="stripe-deposit-element"></div>';
      payEl.mount('#stripe-deposit-element');

    } catch (err) {
      depositArea.innerHTML =
        `<div class="payment-placeholder">Payment form unavailable. Call us to reserve your date: ${CONFIG.PHONE}</div>`;
      console.error('Stripe catering init error:', err);
    }
  }

  // Init on load in booking mode
  initStripe();

  // ── Form submit ────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');

    const firstName = form.querySelector('#first-name').value.trim();
    const lastName  = form.querySelector('#last-name').value.trim();
    const email     = form.querySelector('#email').value.trim();
    const eventDate = form.querySelector('#event-date')?.value || '';
    const eventType = form.querySelector('#event-type')?.value || '';

    if (!firstName || !lastName) { showError('Please enter your full name.'); return; }
    if (!email || !email.includes('@')) { showError('Please enter a valid email.'); return; }

    // Booking requires date + event type; consultation does not
    if (currentMode === 'booking') {
      if (!eventDate) { showError('Please select your event date.'); return; }
      if (!eventType) { showError('Please select an event type.'); return; }
    }

    if (!stripe || !elements) { showError('Payment form is not ready. Please wait a moment.'); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing…';

    // Re-init with final form values before confirming
    // (captures any info typed after the initial load)
    const phone  = form.querySelector('#phone').value.trim();
    const guests = form.querySelector('#guest-count')?.value || '';
    const notes  = form.querySelector('#notes').value.trim();
    const amount = currentMode === 'booking' ? CONFIG.DEPOSIT_AMOUNT : 10;

    // Update PaymentIntent metadata before confirming
    try {
      const res2 = await fetch(CONFIG.PAYMENT_INTENT_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          metadata: {
            source:      currentMode === 'booking' ? 'catering-deposit' : 'catering-consultation',
            customer:    `${firstName} ${lastName}`.trim(),
            email, phone,
            event_date:  eventDate,
            event_type:  eventType,
            guest_count: guests,
            amount_paid: `$${amount}`,
            ...(notes ? { notes: notes.slice(0, 499) } : {}),
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
        return_url: window.location.origin + '/confirmation.html?type=' + currentMode,
        payment_method_data: {
          billing_details: { name: `${firstName} ${lastName}`, email },
        },
      },
      redirect: 'if_required',
    });

    if (error) {
      showError(error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = currentMode === 'booking'
        ? 'Submit & Pay $250 Deposit'
        : 'Book Consultation — $10';
      return;
    }

    form.classList.add('hidden');
    successEl.classList.remove('hidden');
    successEl.querySelector('.success-msg').textContent = currentMode === 'booking'
      ? 'Your $250 deposit has been submitted and your date is being held. Chef Rose will be in touch within 24 hours.'
      : 'Your $10 consultation fee has been received. Chef Rose will reach out within 24 hours to schedule your call.';
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
