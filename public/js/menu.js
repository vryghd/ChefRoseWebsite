// ============================================================
// VERY GHOOD — menu.js
// Fetches menu + sides from Google Sheets
// Entrée items open a customization modal:
//   · Qty stepper per side (allows same side twice)
//   · Extra sides at EXTRA_SIDE_PRICE each
//   · Extra protein at EXTRA_MEAT_PRICE
//   · Special instructions / notes
// ============================================================

(async function () {
  const tabsEl  = document.getElementById('category-tabs');
  const itemsEl = document.getElementById('menu-items');
  if (!tabsEl || !itemsEl) return;

  let menuData  = [];
  let sidesPool = [];

  // ── Fetch ─────────────────────────────────────────────────
  async function fetchData() {
    const url = CONFIG.SHEETS_URL;
    if (!url || url === 'YOUR_GOOGLE_SHEETS_JSON_URL_HERE') {
      return { menu: CONFIG.SAMPLE_MENU, sides: CONFIG.SAMPLE_SIDES };
    }
    try {
      const res  = await fetch(url);
      const json = await res.json();

      const menu = (json.menu || []).map(r => ({
        category:    r.category    || r.Category    || 'Other',
        name:        r.name        || r.Name        || '',
        description: r.description || r.Description || '',
        price:       parseFloat(r.price || r.Price  || 0),
        type:        (r.type  || r.Type  || 'standalone').toLowerCase().trim(),
        sides:       (r.sides !== undefined && r.sides !== '') ? parseInt(r.sides, 10) : ((r.Sides !== undefined && r.Sides !== '') ? parseInt(r.Sides, 10) : 2),
      }));

      const sides = (json.sides || [])
        .filter(s => String(s.available || s.Available).toUpperCase() !== 'FALSE')
        .map(s => s.name || s.Name || '');

      return { menu, sides };
    } catch (e) {
      console.warn('Menu fetch failed, using sample data.', e);
      return { menu: CONFIG.SAMPLE_MENU, sides: CONFIG.SAMPLE_SIDES };
    }
  }

  // ── Tabs ──────────────────────────────────────────────────
  function renderTabs(categories, active) {
    tabsEl.innerHTML = '';
    [{ label: 'All', value: 'All' }, ...categories.map(c => ({ label: c, value: c }))]
      .forEach(({ label, value }) => {
        const btn = document.createElement('button');
        btn.className   = 'tab-btn' + (value === active ? ' active' : '');
        btn.textContent = label;
        btn.setAttribute('role', 'tab');
        btn.dataset.category = value;
        btn.addEventListener('click', () => renderMenu(value));
        tabsEl.appendChild(btn);
      });
  }

  // ── Menu items ────────────────────────────────────────────
  function renderMenu(category = 'All') {
    tabsEl.querySelectorAll('.tab-btn').forEach(btn =>
      btn.classList.toggle('active', btn.dataset.category === category)
    );

    const filtered = category === 'All'
      ? menuData
      : menuData.filter(i => i.category === category);

    if (!filtered.length) {
      itemsEl.innerHTML = '<div class="empty-state">No items in this category.</div>';
      return;
    }

    itemsEl.innerHTML = '';
    filtered.forEach(item => {
      const isEntree = item.type === 'entrée' || item.type === 'entree';

      const el = document.createElement('div');
      el.className = 'menu-item';
      el.setAttribute('role', 'listitem');

      el.innerHTML = `
        <div class="menu-item__info">
          <p class="menu-item__name">${item.name}</p>
          ${item.description ? `<p class="menu-item__desc">${item.description}</p>` : ''}
          ${isEntree ? `<p class="menu-item__sides-note">Choose ${item.sides} side${item.sides !== 1 ? 's' : ''}</p>` : ''}
        </div>
        <div class="menu-item__right">
          <p class="menu-item__price">$${item.price.toFixed(2)}</p>
          <button class="add-btn" aria-label="Add ${item.name} to cart">+ Add</button>
        </div>
      `;

      el.querySelector('.add-btn').addEventListener('click', function () {
        if (isEntree) {
          openCustomizer(item, this);
        } else {
          Cart.add({ name: item.name, price: item.price });
          flashAdded(this);
        }
      });

      itemsEl.appendChild(el);
    });
  }

  function flashAdded(btn) {
    btn.textContent = 'Added ✓';
    btn.classList.add('added');
    setTimeout(() => { btn.textContent = '+ Add'; btn.classList.remove('added'); }, 1500);
  }

  // ── Customizer modal ──────────────────────────────────────
  function openCustomizer(item, addBtn) {
    const modal      = document.getElementById('sides-modal');
    const closeXBtn  = document.getElementById('sides-modal-close');
    const titleEl    = document.getElementById('sides-modal-title');
    const subEl      = document.getElementById('sides-modal-sub');
    const reqListEl  = document.getElementById('sides-list');
    const extListEl  = document.getElementById('extra-sides-list');
    const meatLblEl  = document.getElementById('extra-meat-label');
    const notesEl    = document.getElementById('sides-notes');
    const errorEl    = document.getElementById('sides-error');
    const confirmBtn = document.getElementById('sides-confirm');
    const cancelBtn  = document.getElementById('sides-cancel');
    const reqCountEl = document.getElementById('req-count');
    if (!modal) return;

    const required        = item.sides !== undefined ? item.sides : 2;
    const extraSidePrice  = CONFIG.EXTRA_SIDE_PRICE || 3;
    const extraMeatPrice  = CONFIG.EXTRA_MEAT_PRICE || 8;

    // State maps: sideName → qty
    const reqMap  = {};
    const extMap  = {};
    sidesPool.forEach(s => { reqMap[s] = 0; extMap[s] = 0; });

    titleEl.textContent = item.name;
    subEl.textContent   = `Choose ${required} side${required !== 1 ? 's' : ''} — included`;
    meatLblEl.textContent = `Extra Protein  +$${extraMeatPrice.toFixed(2)}`;
    const priceLblEl = document.getElementById('extra-side-price-label');
    if (priceLblEl) priceLblEl.textContent = extraSidePrice.toFixed(2);
    notesEl.value = '';
    errorEl.classList.add('hidden');

    // ── Build required sides list ─────────────────────────
    function buildRequiredList() {
      reqListEl.innerHTML = '';
      if (!sidesPool.length) {
        reqListEl.innerHTML = '<p class="sides-unavailable">Sides unavailable. Check back soon.</p>';
        return;
      }
      sidesPool.forEach(side => {
        const row = buildStepperRow(side, reqMap, () => updateReqUI());
        reqListEl.appendChild(row);
      });
    }

    // ── Build extra sides list ────────────────────────────
    function buildExtraList() {
      extListEl.innerHTML = '';
      sidesPool.forEach(side => {
        const row = buildStepperRow(side, extMap, () => updateExtUI());
        extListEl.appendChild(row);
      });
    }

    function buildStepperRow(side, map, onChange) {
      const row = document.createElement('div');
      row.className = 'side-stepper-row';
      row.innerHTML = `
        <span class="side-stepper-name">${side}</span>
        <div class="side-stepper">
          <button class="stepper-btn dec" type="button" aria-label="Decrease">−</button>
          <span class="stepper-val">${map[side]}</span>
          <button class="stepper-btn inc" type="button" aria-label="Increase">+</button>
        </div>
      `;
      row.querySelector('.dec').addEventListener('click', () => {
        if (map[side] > 0) { map[side]--; row.querySelector('.stepper-val').textContent = map[side]; onChange(); }
      });
      row.querySelector('.inc').addEventListener('click', () => {
        map[side]++;
        row.querySelector('.stepper-val').textContent = map[side];
        onChange();
      });
      return row;
    }

    // ── Required count display ────────────────────────────
    function reqTotal() { return sidesPool.reduce((s, k) => s + (reqMap[k] || 0), 0); }
    function extTotal() { return sidesPool.reduce((s, k) => s + (extMap[k] || 0), 0); }

    function updateReqUI() {
      const total = reqTotal();
      reqCountEl.textContent = `${total} / ${required} selected`;
      reqCountEl.classList.toggle('complete', total === required);
      errorEl.classList.add('hidden');

      // Cap the + buttons in the required section at the required total
      const atLimit = total >= required;
      reqListEl.querySelectorAll('.stepper-btn.inc').forEach(btn => {
        btn.disabled = atLimit;
        btn.style.opacity = atLimit ? '0.3' : '';
        btn.style.cursor  = atLimit ? 'not-allowed' : '';
      });
    }

    function updateExtUI() {
      const cost = extTotal() * extraSidePrice;
      document.getElementById('extra-sides-cost').textContent =
        extTotal() > 0 ? `+$${cost.toFixed(2)}` : '';
    }

    buildRequiredList();
    buildExtraList();
    updateReqUI();
    updateExtUI();

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Trap Focus
    const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    
    function trapFocus(e) {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) { e.preventDefault(); lastFocusable.focus(); }
        } else {
          if (document.activeElement === lastFocusable) { e.preventDefault(); firstFocusable.focus(); }
        }
      }
    }
    modal.addEventListener('keydown', trapFocus);
    if (firstFocusable) firstFocusable.focus();

    // ── Confirm ───────────────────────────────────────────
    function handleConfirm() {
      const total = reqTotal();
      if (total !== required) {
        errorEl.textContent = `Please choose exactly ${required} side${required !== 1 ? 's' : ''}.`;
        errorEl.classList.remove('hidden');
        return;
      }

      const extraMeatChecked = document.getElementById('extra-meat-check').checked;

      // Build sides label list (e.g. "Mac & Cheese x2")
      const sidesArr = sidesPool
        .filter(s => reqMap[s] > 0)
        .map(s => reqMap[s] > 1 ? `${s} ×${reqMap[s]}` : s);

      const extraSidesArr = sidesPool
        .filter(s => extMap[s] > 0)
        .map(s => extMap[s] > 1 ? `${s} ×${extMap[s]}` : s);

      const extrasPrice = extTotal() * extraSidePrice + (extraMeatChecked ? extraMeatPrice : 0);
      const notes       = notesEl.value.trim();

      Cart.add({
        name:        item.name,
        price:       item.price + extrasPrice,
        sides:       sidesArr,
        extraSides:  extraSidesArr,
        extraMeat:   extraMeatChecked,
        notes,
      });

      closeModal();
      flashAdded(addBtn);
    }

    function closeModal() {
      modal.classList.remove('open');
      document.body.style.overflow = '';
      sidesPool.forEach(s => { reqMap[s] = 0; extMap[s] = 0; });
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', closeModal);
      closeXBtn.removeEventListener('click', closeModal);
      modal.removeEventListener('keydown', trapFocus);
      if (addBtn) addBtn.focus();
    }

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', closeModal);
    closeXBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); }, { once: true });
  }

  // ── Init ─────────────────────────────────────────────────
  itemsEl.innerHTML = '<div class="loading-state">Loading menu&hellip;</div>';
  const data = await fetchData();
  menuData   = data.menu;
  sidesPool  = data.sides;

  const categories = [...new Set(menuData.map(i => i.category))];
  renderTabs(categories, 'All');
  renderMenu('All');
})();
