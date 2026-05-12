// ============================================================
// VERY GHOOD — cart.js
// localStorage cart — shared across all pages
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
    const existing = items.find(i => i.name === item.name);
    if (existing) {
      existing.qty += 1;
    } else {
      items.push({ name: item.name, price: item.price, image: item.image || '', qty: 1 });
    }
    saveItems(items);
  }

  function remove(name) {
    saveItems(getItems().filter(i => i.name !== name));
  }

  function updateQty(name, delta) {
    const items = getItems().map(i => {
      if (i.name === name) i.qty = Math.max(1, i.qty + delta);
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

  // Update cart badge in nav
  function updateNavCount() {
    const badge = document.getElementById('nav-cart-count');
    if (!badge) return;
    const n = count();
    badge.textContent = n;
    badge.classList.toggle('visible', n > 0);
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

    // Render items list
    listEl.innerHTML = '';
    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'cart-item';
      el.innerHTML = `
        <div class="cart-item__info">
          <p class="cart-item__name">${item.name}</p>
          <p class="cart-item__unit">$${item.price.toFixed(2)} each</p>
        </div>
        <div class="cart-item__controls">
          <button class="qty-btn" data-action="dec" data-name="${item.name}" aria-label="Decrease quantity">−</button>
          <span class="qty-value" id="qty-${item.name.replace(/\s+/g,'-')}">${item.qty}</span>
          <button class="qty-btn" data-action="inc" data-name="${item.name}" aria-label="Increase quantity">+</button>
          <button class="remove-btn" data-name="${item.name}">Remove</button>
        </div>
      `;
      listEl.appendChild(el);
    });

    // Quantity & remove buttons
    listEl.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const name  = btn.dataset.name;
        const delta = btn.dataset.action === 'inc' ? 1 : -1;
        updateQty(name, delta);
        renderCartPage();
      });
    });
    listEl.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => { remove(btn.dataset.name); renderCartPage(); });
    });

    // Summary rows
    summaryEl.innerHTML = '';
    items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'summary-row';
      row.innerHTML = `<span>${item.name} ×${item.qty}</span><span>$${(item.price * item.qty).toFixed(2)}</span>`;
      summaryEl.appendChild(row);
    });
    totalEl.textContent = '$' + total().toFixed(2);

    // Place order
    if (placeBtn) {
      placeBtn.addEventListener('click', () => {
        const name  = document.getElementById('checkout-name')?.value.trim();
        const phone = document.getElementById('checkout-phone')?.value.trim();
        const errorEl = document.getElementById('cart-error');

        if (!name) {
          errorEl.textContent = 'Please enter your name.';
          errorEl.classList.remove('hidden');
          return;
        }
        errorEl.classList.add('hidden');

        const isOnline = document.getElementById('toggle-online')?.classList.contains('active');
        const notes    = document.getElementById('order-notes')?.value || '';

        if (isOnline) {
          // TODO: Trigger payment processor here
          errorEl.textContent = 'Online payment coming soon — please select Cash at Pickup.';
          errorEl.classList.remove('hidden');
          return;
        }

        // Cash order — save to sessionStorage and redirect
        const orderData = {
          items: getItems(),
          total: total().toFixed(2),
          name, phone, notes,
          paymentMethod: isOnline ? 'online' : 'cash',
        };
        sessionStorage.setItem('vg_last_order', JSON.stringify(orderData));
        clear();
        window.location.href = 'confirmation.html';
      });
    }
  }

  // Init on load
  document.addEventListener('DOMContentLoaded', () => {
    updateNavCount();
    renderCartPage();
  });

  return { add, remove, updateQty, clear, total, count, getItems };
})();
