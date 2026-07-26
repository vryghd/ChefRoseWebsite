// ============================================================
// VERY GHOOD — menu.js
// Fetches menu, sides & sauces from Google Sheets
// Entrée items open customization modal:
//   · Wing flavor selection (if Wings selected)
//   · Unified sides list (3 included sides default)
//   · Red highlight counter & dynamic add-on price for extra sides ($7 each)
//   · Extra protein & special instructions
// ============================================================

(async function () {
  const tabsEl  = document.getElementById('category-tabs');
  const itemsEl = document.getElementById('menu-items');
  if (!tabsEl || !itemsEl) return;

  let menuData   = [];
  let sidesPool  = [];
  let saucesPool = [];

  // ── Fetch ─────────────────────────────────────────────────
  async function fetchData() {
    const url = CONFIG.SHEETS_URL;
    if (!url || url === 'YOUR_GOOGLE_SHEETS_JSON_URL_HERE') {
      const defaultSauces = (CONFIG.SAMPLE_SAUCES || []).filter(s => s.available).map(s => s.name);
      return { menu: CONFIG.SAMPLE_MENU, sides: CONFIG.SAMPLE_SIDES, sauces: defaultSauces };
    }
    try {
      // Timestamp cache-buster + no-store ensures live spreadsheet updates display instantly
      const fetchUrl = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
      const res  = await fetch(fetchUrl, { cache: 'no-store' });
      const json = await res.json();

      const menu = (json.menu || [])
        .map(r => {
          const rawName = r.name || r.Name || '';
          return {
            category:       r.category       || r.Category       || 'Other',
            name:           rawName,
            description:    r.description    || r.Description    || '',
            price:          parseFloat(r.price || r.Price        || 0),
            type:           (r.type  || r.Type  || 'standalone').toLowerCase().trim(),
            sides:          (r.sides !== undefined && r.sides !== '') ? parseInt(r.sides, 10) : ((r.Sides !== undefined && r.Sides !== '') ? parseInt(r.Sides, 10) : 3),
            protein_prompt: String(r.protein_prompt || r.Protein_prompt || '').toUpperCase() === 'TRUE',
            sauce_prompt:   String(r.sauce_prompt || r.Sauce_prompt || '').toUpperCase() === 'TRUE' || rawName.toLowerCase().includes('wing'),
            // available col: blank/missing = shown; FALSE = hidden
            available:      String(r.available || r.Available || 'true').toUpperCase() !== 'FALSE',
          };
        })
        // Drop rows with no name or marked unavailable
        .filter(r => r.name && r.available);

      const sides = (json.sides || [])
        .filter(s => String(s.available || s.Available || 'true').toUpperCase() !== 'FALSE')
        .map(s => s.name || s.Name || '')
        .filter(Boolean);

      let sauces = (json.sauces || json.flavors || [])
        .filter(s => String(s.available || s.Available || 'true').toUpperCase() !== 'FALSE')
        .map(s => s.name || s.Name || '')
        .filter(Boolean);

      if (!sauces.length) {
        sauces = (CONFIG.SAMPLE_SAUCES || [])
          .filter(s => s.available)
          .map(s => s.name);
      }

      return { menu, sides, sauces };
    } catch (e) {
      console.warn('Menu fetch failed, using sample data.', e);
      const defaultSauces = (CONFIG.SAMPLE_SAUCES || []).filter(s => s.available).map(s => s.name);
      return { menu: CONFIG.SAMPLE_MENU, sides: CONFIG.SAMPLE_SIDES, sauces: defaultSauces };
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

      const safeName = typeof escapeHTML === 'function' ? escapeHTML(item.name) : item.name;
      const safeDesc = typeof escapeHTML === 'function' && item.description ? escapeHTML(item.description) : item.description;

      el.innerHTML = `
        <div class="menu-item__info">
          <p class="menu-item__name">${safeName}</p>
          ${safeDesc ? `<p class="menu-item__desc">${safeDesc}</p>` : ''}
          ${isEntree ? `<p class="menu-item__sides-note">Choose ${item.sides} side${item.sides !== 1 ? 's' : ''}</p>` : ''}
        </div>
        <div class="menu-item__right">
          <p class="menu-item__price">$${item.price.toFixed(2)}</p>
          <button class="add-btn" aria-label="Add ${item.name} to cart">+ Add</button>
        </div>
      `;

      el.querySelector('.add-btn').addEventListener('click', function () {
        if (item.protein_prompt) {
          openProteinModal(item, this);
        } else if (isEntree) {
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

  // ── Customizer modal (Unified Sides & Wings Flavor) ───────
  function openCustomizer(item, addBtn) {
    const modal      = document.getElementById('sides-modal');
    const closeXBtn  = document.getElementById('sides-modal-close');
    const titleEl    = document.getElementById('sides-modal-title');
    const sidesListEl= document.getElementById('sides-list');
    const saucesSecEl= document.getElementById('sauces-section');
    const saucesLstEl= document.getElementById('sauces-list');
    const meatCheckEl= document.getElementById('extra-meat-check');
    const meatLblEl  = document.getElementById('extra-meat-label');
    const notesEl    = document.getElementById('sides-notes');
    const errorEl    = document.getElementById('sides-error');
    const confirmBtn = document.getElementById('sides-confirm');
    const cancelBtn  = document.getElementById('sides-cancel');
    const reqCountEl = document.getElementById('req-count');
    const priceLblEl = document.getElementById('extra-side-price-label');
    if (!modal) return;

    const required       = item.sides !== undefined ? item.sides : 3;
    const extraSidePrice = CONFIG.EXTRA_SIDE_PRICE || 7.00;
    const extraMeatPrice = CONFIG.EXTRA_MEAT_PRICE || 8.00;
    const isWingsItem    = item.sauce_prompt || item.name.toLowerCase().includes('wing');

    // State map for sides: sideName → qty
    const sideMap = {};
    sidesPool.forEach(s => { sideMap[s] = 0; });

    titleEl.textContent = item.name;
    if (priceLblEl) priceLblEl.textContent = extraSidePrice.toFixed(2);
    if (meatLblEl) meatLblEl.textContent = `Extra Protein  +$${extraMeatPrice.toFixed(2)}`;
    if (meatCheckEl) meatCheckEl.checked = false;
    notesEl.value = '';
    errorEl.classList.add('hidden');

    // ── Setup Wing Flavor Section ─────────────────────────
    if (isWingsItem && saucesSecEl && saucesLstEl) {
      saucesSecEl.classList.remove('hidden');
      saucesLstEl.innerHTML = '';
      if (!saucesPool.length) {
        saucesLstEl.innerHTML = '<p class="sides-unavailable">Flavors unavailable.</p>';
      } else {
        saucesPool.forEach((sauce, idx) => {
          const safeSauce = typeof escapeHTML === 'function' ? escapeHTML(sauce) : sauce;
          const label = document.createElement('label');
          label.className = 'flavor-option';
          label.innerHTML = `
            <input type="radio" name="wing-flavor" value="${safeSauce}" ${idx === 0 ? 'checked' : ''} />
            <span class="flavor-option__box"><span class="flavor-option__check"></span></span>
            <span class="flavor-option__name">${safeSauce}</span>
          `;
          saucesLstEl.appendChild(label);
        });
      }
    } else if (saucesSecEl) {
      saucesSecEl.classList.add('hidden');
    }

    // ── Build Single Unified Sides List ───────────────────
    function buildSidesList() {
      sidesListEl.innerHTML = '';
      if (!sidesPool.length) {
        sidesListEl.innerHTML = '<p class="sides-unavailable">Sides unavailable. Check back soon.</p>';
        return;
      }
      sidesPool.forEach(side => {
        const safeSide = typeof escapeHTML === 'function' ? escapeHTML(side) : side;
        const row = document.createElement('div');
        row.className = 'side-stepper-row';
        row.innerHTML = `
          <span class="side-stepper-name">${safeSide}</span>
          <div class="side-stepper">
            <button class="stepper-btn dec" type="button" aria-label="Decrease">−</button>
            <span class="stepper-val">${sideMap[side]}</span>
            <button class="stepper-btn inc" type="button" aria-label="Increase">+</button>
          </div>
        `;
        row.querySelector('.dec').addEventListener('click', () => {
          if (sideMap[side] > 0) {
            sideMap[side]--;
            row.querySelector('.stepper-val').textContent = sideMap[side];
            updateUI();
          }
        });
        row.querySelector('.inc').addEventListener('click', () => {
          sideMap[side]++;
          row.querySelector('.stepper-val').textContent = sideMap[side];
          updateUI();
        });
        sidesListEl.appendChild(row);
      });
    }

    function totalSidesSelected() {
      return sidesPool.reduce((sum, s) => sum + (sideMap[s] || 0), 0);
    }

    // ── Dynamic Counter & Price Calculation ───────────────
    function updateUI() {
      const totalSelected  = totalSidesSelected();
      const extraCount     = Math.max(0, totalSelected - required);
      const extraSidesCost = extraCount * extraSidePrice;
      const extraMeatCost  = (meatCheckEl && meatCheckEl.checked) ? extraMeatPrice : 0;
      const currentPrice   = item.price + extraSidesCost + extraMeatCost;

      errorEl.classList.add('hidden');

      if (totalSelected <= required) {
        reqCountEl.textContent = `${totalSelected} / ${required} selected`;
        reqCountEl.classList.remove('extra-active');
        reqCountEl.classList.toggle('complete', totalSelected === required);
      } else {
        reqCountEl.textContent = `${totalSelected} / ${required} selected (+${extraCount} Extra: +$${extraSidesCost.toFixed(2)})`;
        reqCountEl.classList.remove('complete');
        reqCountEl.classList.add('extra-active'); // Turns RED to indicate extra sides
      }

      confirmBtn.textContent = `Add to Order — $${currentPrice.toFixed(2)}`;
    }

    if (meatCheckEl) {
      meatCheckEl.addEventListener('change', updateUI);
    }

    buildSidesList();
    updateUI();

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Focus Trap
    const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const firstFocusable = focusableElements[0];
    const lastFocusable  = focusableElements[focusableElements.length - 1];

    function trapFocus(e) {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) { e.preventDefault(); lastFocusable.focus(); }
        } else {
          if (document.activeElement === lastFocusable) { e.preventDefault(); firstFocusable.focus(); }
        }
      }
      if (e.key === 'Escape') closeModal();
    }
    modal.addEventListener('keydown', trapFocus);
    if (firstFocusable) firstFocusable.focus();

    // ── Confirm Handler ───────────────────────────────────
    function handleConfirm() {
      const totalSelected = totalSidesSelected();
      if (totalSelected < required) {
        errorEl.textContent = `Please choose at least ${required} included side${required !== 1 ? 's' : ''}.`;
        errorEl.classList.remove('hidden');
        return;
      }

      let chosenFlavor = '';
      if (isWingsItem) {
        const checkedFlavor = modal.querySelector('input[name="wing-flavor"]:checked');
        if (!checkedFlavor) {
          errorEl.textContent = 'Please select a wing flavor.';
          errorEl.classList.remove('hidden');
          return;
        }
        chosenFlavor = checkedFlavor.value;
      }

      const extraMeatChecked = meatCheckEl ? meatCheckEl.checked : false;
      const extraCount        = Math.max(0, totalSelected - required);
      const extraSidesCost   = extraCount * extraSidePrice;
      const extraMeatCost    = extraMeatChecked ? extraMeatPrice : 0;
      const finalPrice       = item.price + extraSidesCost + extraMeatCost;

      // Flatten selected sides into an ordered list
      const flatSides = [];
      sidesPool.forEach(side => {
        for (let i = 0; i < sideMap[side]; i++) {
          flatSides.push(side);
        }
      });

      // Split into included vs extra sides
      const includedRaw = flatSides.slice(0, required);
      const extraRaw    = flatSides.slice(required);

      // Group counts for clean display (e.g. "Mac & Cheese ×2")
      function groupSides(arr) {
        const counts = {};
        arr.forEach(s => { counts[s] = (counts[s] || 0) + 1; });
        return Object.keys(counts).map(s => counts[s] > 1 ? `${s} ×${counts[s]}` : s);
      }

      const sidesArr      = groupSides(includedRaw);
      const extraSidesArr = groupSides(extraRaw);

      let itemName = item.name.trim();
      if (chosenFlavor) {
        itemName += ` (${chosenFlavor})`;
      }

      Cart.add({
        name:        itemName,
        price:       finalPrice,
        sides:       sidesArr,
        extraSides:  extraSidesArr,
        extraMeat:   extraMeatChecked,
        notes:       notesEl.value.trim(),
      });

      closeModal();
      flashAdded(addBtn);
    }

    function closeModal() {
      modal.classList.remove('open');
      document.body.style.overflow = '';
      sidesPool.forEach(s => { sideMap[s] = 0; });
      if (meatCheckEl) meatCheckEl.removeEventListener('change', updateUI);
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

  // ── Protein Selection Modal ─────────────────────────────
  function openProteinModal(item, addBtn) {
    const modal      = document.getElementById('protein-modal');
    const closeXBtn  = document.getElementById('protein-modal-close');
    const confirmBtn = document.getElementById('protein-confirm');
    const cancelBtn  = document.getElementById('protein-cancel');
    if (!modal) return;

    // Reset radio to default
    const defaultRadio = modal.querySelector('input[name="protein"][value="Chicken"]');
    if (defaultRadio) defaultRadio.checked = true;

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Focus trap
    const focusable = modal.querySelectorAll('button, input');
    const firstF = focusable[0];
    const lastF  = focusable[focusable.length - 1];
    function trapFocus(e) {
      if (e.key === 'Tab') {
        if (e.shiftKey) { if (document.activeElement === firstF) { e.preventDefault(); lastF.focus(); } }
        else            { if (document.activeElement === lastF)  { e.preventDefault(); firstF.focus(); } }
      }
      if (e.key === 'Escape') closeProteinModal();
    }
    modal.addEventListener('keydown', trapFocus);
    if (firstF) firstF.focus();

    function handleConfirm() {
      const selected = modal.querySelector('input[name="protein"]:checked');
      if (!selected) return;
      const choice = selected.value;

      let customItem = {
        name:  item.name + ' (' + choice + ')',
        price: item.price + (choice === 'Both' ? 10 : 0),
      };

      Cart.add(customItem);
      closeProteinModal();
      flashAdded(addBtn);
    }

    function closeProteinModal() {
      modal.classList.remove('open');
      document.body.style.overflow = '';
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', closeProteinModal);
      closeXBtn.removeEventListener('click', closeProteinModal);
      modal.removeEventListener('keydown', trapFocus);
      modal.removeEventListener('click', backdropClose);
      if (addBtn) addBtn.focus();
    }

    function backdropClose(e) { if (e.target === modal) closeProteinModal(); }

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', closeProteinModal);
    closeXBtn.addEventListener('click', closeProteinModal);
    modal.addEventListener('click', backdropClose, { once: true });
  }

  // ── Init ─────────────────────────────────────────────────
  itemsEl.innerHTML = '<div class="loading-state">Loading menu&hellip;</div>';
  const data = await fetchData();
  menuData   = data.menu;
  sidesPool  = data.sides;
  saucesPool = data.sauces;

  const categories = [...new Set(menuData.map(i => i.category))];
  renderTabs(categories, 'All');
  renderMenu('All');
})();
