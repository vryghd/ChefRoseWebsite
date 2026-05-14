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
    // Unique key includes name, sides, extras, meat, notes so each combination is a separate line item
    const sidesKey    = (item.sides      || []).slice().sort().join('|');
    const extSidesKey = (item.extraSides || []).slice().sort().join('|');
    const meatKey     = item.extraMeat ? '1' : '0';
    let safeNotes;
    try { safeNotes = btoa(encodeURIComponent(item.notes || '')); }
    catch { safeNotes = encodeURIComponent(item.notes || '').slice(0, 80); }
    const key = [item.name, sidesKey, extSidesKey, meatKey, safeNotes].join('::');

    const existing = items.find(i => i._key === key);
    if (existing) {
      existing.qty += 1;
    } else {
      items.push({
        _key:       key,
        name:       item.name,
        price:      item.price,
        sides:      item.sides      || [],
        extraSides: item.extraSides || [],
        extraMeat:  item.extraMeat  || false,
        notes:      item.notes      || '',
        qty:        1,
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
  let stripeLoaded  = false;

  async function initStripe(amount, orderMeta = {}) {
    const onlineArea = document.getElementById('online-payment-area');
    if (!onlineArea) return;

    if (elements && paymentElement) {
      paymentElement.destroy();
      elements = null;
      paymentElement = null;
    }

    onlineArea.innerHTML = '<div class="loading-state" style="padding:1rem 0;">Loading payment form…</div>';

    // Build itemized metadata for Stripe dashboard
    const cartItems  = getItems();
    const lineItems  = cartItems.map(i =>
      `${i.qty}x ${i.name} @ $${i.price.toFixed(2)}`
    ).join(' | ');

    const metadata = {
      source:       'menu-order',
      customer:     orderMeta.name  || '',
      phone:        orderMeta.phone || '',
      order_total:  '$' + total().toFixed(2),
      item_count:   String(count()),
      items:        lineItems.slice(0, 499), // Stripe metadata max 500 chars
      ...orderMeta.notes ? { notes: orderMeta.notes.slice(0, 499) } : {},
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
      paymentElement = elements.create('payment', {
        layout: { type: 'tabs' }
      });

      onlineArea.innerHTML = '<div id="stripe-payment-element"></div>';
      paymentElement.mount('#stripe-payment-element');

    } catch (err) {
      onlineArea.innerHTML = `<div class="payment-placeholder">Payment form unavailable. Please use Cash at Pickup or contact us directly.</div>`;
      console.error('Stripe init error:', err);
    }
  }

  let stripeTimer = null;
  function queueStripeSync(orderMeta = {}) {
    const toggleOnline = document.getElementById('toggle-online');
    if (!stripeLoaded || !toggleOnline?.classList.contains('active')) return;
    if (stripeTimer) clearTimeout(stripeTimer);
    stripeTimer = setTimeout(() => {
      if (total() > 0) initStripe(total(), orderMeta);
    }, 500);
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

      const safeName       = typeof escapeHTML === 'function' ? escapeHTML(item.name) : item.name;
      const safeSides      = typeof escapeHTML === 'function' && item.sides ? item.sides.map(escapeHTML) : (item.sides || []);
      const safeExtSides   = typeof escapeHTML === 'function' && item.extraSides ? item.extraSides.map(escapeHTML) : (item.extraSides || []);
      const safeNotes      = typeof escapeHTML === 'function' ? escapeHTML(item.notes) : item.notes;

      const sidesHTML      = safeSides.length      ? `<p class="cart-item__sides">${safeSides.join(', ')}</p>` : '';
      const extraSidesHTML = safeExtSides.length   ? `<p class="cart-item__sides cart-item__sides--extra">+ Extra: ${safeExtSides.join(', ')}</p>` : '';
      const extraMeatHTML  = item.extraMeat        ? `<p class="cart-item__badge">+ Extra Protein</p>` : '';
      const notesHTML      = safeNotes             ? `<p class="cart-item__notes">"${safeNotes}"</p>` : '';

      el.innerHTML = `
        <div class="cart-item__info">
          <p class="cart-item__name">${safeName}</p>
          ${sidesHTML}${extraSidesHTML}${extraMeatHTML}${notesHTML}
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
        queueStripeSync();
      });
    });
    listEl.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => { 
        remove(btn.dataset.key); 
        renderCartPage(); 
        queueStripeSync();
      });
    });

    // Summary
    summaryEl.innerHTML = '';
    items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'summary-row';
      const safeName = typeof escapeHTML === 'function' ? escapeHTML(item.name) : item.name;
      row.innerHTML = `<span>${safeName} ×${item.qty}</span><span>$${(item.price * item.qty).toFixed(2)}</span>`;
      summaryEl.appendChild(row);
    });
    totalEl.textContent = '$' + total().toFixed(2);

    // ── Payment toggle ───────────────────────────────────
    // Wire only once — guard prevents duplicate listeners on re-render
    const toggleOnline = document.getElementById('toggle-online');
    const toggleCash   = document.getElementById('toggle-cash');
    const onlineArea   = document.getElementById('online-payment-area');
    const cashNotice   = document.getElementById('cash-notice');

    function showOnline() {
      toggleOnline.classList.add('active');
      toggleCash.classList.remove('active');
      onlineArea.classList.remove('hidden');
      cashNotice.classList.add('hidden');
      if (!stripeLoaded) {
        stripeLoaded = true;
        // Pass whatever name/phone are already typed
        const name  = document.getElementById('checkout-name')?.value.trim()  || '';
        const phone = document.getElementById('checkout-phone')?.value.trim() || '';
        initStripe(total(), { name, phone });
      }
    }

    function showCash() {
      toggleCash.classList.add('active');
      toggleOnline.classList.remove('active');
      cashNotice.classList.remove('hidden');
      onlineArea.classList.add('hidden');
    }

    if (toggleOnline && !toggleOnline.dataset.wired) {
      toggleOnline.dataset.wired = '1';
      toggleOnline.addEventListener('click', showOnline);
    }
    if (toggleCash && !toggleCash.dataset.wired) {
      toggleCash.dataset.wired = '1';
      toggleCash.addEventListener('click', showCash);
    }

    // Default: online (load Stripe immediately)
    showOnline();

    // Place order — guard prevents duplicate listeners across re-renders
    if (placeBtn && !placeBtn.dataset.wired) {
      placeBtn.dataset.wired = '1';
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

        // Save order & metadata BEFORE calling Stripe
        const orderMeta = { name, phone, notes };
        sessionStorage.setItem('vg_last_order', JSON.stringify({
          items: getItems(), total: total().toFixed(2),
          name, phone, notes,
          paymentMethod: isOnline ? 'online' : 'cash',
        }));

        if (isOnline) {
          // Re-init Stripe with full metadata (name/phone now confirmed)
          await initStripe(total(), orderMeta);

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
            sessionStorage.removeItem('vg_last_order');
            return;
          }
        }

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
