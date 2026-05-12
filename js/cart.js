// ============================================================
// VERY GHOOD — cart.js
// localStorage cart + Stripe Payment Element checkout
// ============================================================

const Cart = (() => {
  const KEY = 'vg_cart';

  function getItems() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  }

  function saveItems(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    updateNavCount();
  }

  function add(item) {
    const items = getItems();
    // Use name + sorted sides as unique key so same entrée with diff sides coexist
    const sidesKey = (item.sides || []).slice().sort().join('|');
    const key = item.name + (sidesKey ? '::' + sidesKey : '');
    const existing = items.find(i => i._key === key);
    if (existing) {
      existing.qty += 1;
    } else {
      items.push({
        _key:  key,
        name:  item.name,
        price: item.price,
        sides: item.sides || [],
        qty:   1,
      });
    }
    saveItems(items);
  }

  function remove(key) {
    saveItems(getItems().filter(i => i._key !== key));
  }

  function updateQty(key, delta) {
    const items = getItems().map(i => {
      if (i._key === key) i.qty = Math.max(1, i.qty + delta);
      return i;
    });
    saveItems(items);
  }

  function clear() {
    localStorage.removeItem(KEY);
    updateNavCount();
  }

  function total() {
    return getItems().reduce((sum, i) => sum + i.price * i.qty, 0);
  }

  function count() {
    return getItems().reduce((sum, i) => sum + i.qty, 0);
  }

  function updateNavCount() {
    const badge = document.getElementById('nav-cart-count');
    if (!badge) return;
    const n = count();
    badge.textContent = n;
    badge.classList.toggle('visible', n > 0);
  }

  // ── Stripe state ────────────────────────────────────────
  let stripe        = null;
  let elements      = null;
  let paymentElement = null;

  async function initStripe(amount) {
    const onlineArea = document.getElementById('online-payment-area');
    if (!onlineArea) return;

    onlineArea.innerHTML = '<div class="loading-state" style="padding:1rem 0;">Loading payment form…</div>';

    try {
      stripe = Stripe(CONFIG.STRIPE_PUBLIC_KEY);

      // Create PaymentIntent via serverless function
      const res = await fetch(CONFIG.PAYMENT_INTENT_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ amount, metadata: { source: 'menu-order' } }),
      });
      const { clientSecret, error } = await res.json();

      if (error) throw new Error(error);

      elements = stripe.elements({ clientSecret, appearance: stripeAppearance() });
      paymentElement = elements.create('payment');

      onlineArea.innerHTML = '<div id="stripe-payment-element"></div>';
      paymentElement.mount('#stripe-payment-element');

    } catch (err) {
      onlineArea.innerHTML = `<div class="payment-placeholder">Payment form unavailable. Please use Cash at Pickup or contact us directly.</div>`;
      console.error('Stripe init error:', err);
    }
  }

  // ── Cart page rendering ─────────────────────────────────
  function renderCartPage() {
    const emptyEl   = document.getElementById('cart-empty');
    const contentEl = document.getElementById('cart-content');
    const listEl    = document.getElementById('cart-items-list');
    const summaryEl = document.getElementById('summary-rows');
    const totalEl   = document.getElementById('summary-total');
    const placeBtn  = document.getElementById('place-order-btn');
    if (!emptyEl) return;

    const items = getItems();

    if (!items.length) {
      emptyEl.classList.remove('hidden');
      contentEl.classList.add('hidden');
      return;
    }

    emptyEl.classList.add('hidden');
    contentEl.classList.remove('hidden');

    // Items list
    listEl.innerHTML = '';
    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'cart-item';
      const sidesHTML = item.sides && item.sides.length
        ? `<p class="cart-item__sides">${item.sides.join(', ')}</p>`
        : '';
      el.innerHTML = `
        <div class="cart-item__info">
          <p class="cart-item__name">${item.name}</p>
          ${sidesHTML}
          <p class="cart-item__unit">$${item.price.toFixed(2)} each</p>
        </div>
        <div class="cart-item__controls">
          <button class="qty-btn" data-action="dec" data-key="${item._key}" aria-label="Decrease">−</button>
          <span class="qty-value">${item.qty}</span>
          <button class="qty-btn" data-action="inc" data-key="${item._key}" aria-label="Increase">+</button>
          <button class="remove-btn" data-key="${item._key}">Remove</button>
        </div>
      `;
      listEl.appendChild(el);
    });

    listEl.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        updateQty(btn.dataset.key, btn.dataset.action === 'inc' ? 1 : -1);
        renderCartPage();
      });
    });
    listEl.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => { remove(btn.dataset.key); renderCartPage(); });
    });

    // Summary
    summaryEl.innerHTML = '';
    items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'summary-row';
      row.innerHTML = `<span>${item.name} ×${item.qty}</span><span>$${(item.price * item.qty).toFixed(2)}</span>`;
      summaryEl.appendChild(row);
    });
    totalEl.textContent = '$' + total().toFixed(2);

    // Payment toggle wiring
    const toggleOnline = document.getElementById('toggle-online');
    const toggleCash   = document.getElementById('toggle-cash');
    const onlineArea   = document.getElementById('online-payment-area');
    const cashNotice   = document.getElementById('cash-notice');

    let stripeLoaded = false;

    function showOnline() {
      toggleOnline.classList.add('active');
      toggleCash.classList.remove('active');
      onlineArea.classList.remove('hidden');
      cashNotice.classList.add('hidden');
      if (!stripeLoaded) {
        stripeLoaded = true;
        initStripe(total());
      }
    }

    function showCash() {
      toggleCash.classList.add('active');
      toggleOnline.classList.remove('active');
      cashNotice.classList.remove('hidden');
      onlineArea.classList.add('hidden');
    }

    if (toggleOnline) toggleOnline.addEventListener('click', showOnline);
    if (toggleCash)   toggleCash.addEventListener('click', showCash);

    // Default: online (load Stripe immediately)
    showOnline();

    // Place order
    if (placeBtn) {
      placeBtn.addEventListener('click', async () => {
        const name    = document.getElementById('checkout-name')?.value.trim();
        const phone   = document.getElementById('checkout-phone')?.value.trim();
        const notes   = document.getElementById('order-notes')?.value || '';
        const errorEl = document.getElementById('cart-error');
        const isOnline = toggleOnline?.classList.contains('active');

        if (!name) {
          errorEl.textContent = 'Please enter your name.';
          errorEl.classList.remove('hidden');
          return;
        }
        errorEl.classList.add('hidden');
        placeBtn.disabled = true;
        placeBtn.textContent = 'Processing…';

        if (isOnline) {
          // ── Stripe confirm ───────────────────────────────
          const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
              return_url: window.location.origin + '/confirmation.html',
              payment_method_data: { billing_details: { name } },
            },
            redirect: 'if_required',
          });

          if (error) {
            errorEl.textContent = error.message;
            errorEl.classList.remove('hidden');
            placeBtn.disabled = false;
            placeBtn.textContent = 'Place Order';
            return;
          }
        }

        // Save order & redirect
        sessionStorage.setItem('vg_last_order', JSON.stringify({
          items: getItems(), total: total().toFixed(2),
          name, phone, notes,
          paymentMethod: isOnline ? 'online' : 'cash',
        }));
        clear();
        window.location.href = 'confirmation.html';
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    updateNavCount();
    renderCartPage();
  });

  return { add, remove, updateQty, clear, total, count, getItems };
})();

// ── Stripe appearance (matches brand) ──────────────────────
function stripeAppearance() {
  return {
    theme: 'stripe',
    variables: {
      colorPrimary:       '#C8212A',
      colorBackground:    '#FAFAFA',
      colorText:          '#0A0A0A',
      colorDanger:        '#C8212A',
      fontFamily:         '"DM Sans", system-ui, sans-serif',
      spacingUnit:        '4px',
      borderRadius:       '0px',
    },
    rules: {
      '.Input': { border: '1px solid #E2E2E2', boxShadow: 'none' },
      '.Input:focus': { border: '1px solid #0A0A0A', boxShadow: 'none' },
      '.Label': { fontFamily: '"Courier Prime", monospace', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5A5A5A' },
    },
  };
}
