// ============================================================
// VERY GHOOD — menu.js
// Fetches menu + available sides from Google Sheets
// Entrée items open a sides-picker modal before adding to cart
// ============================================================

(async function () {
  const tabsEl  = document.getElementById('category-tabs');
  const itemsEl = document.getElementById('menu-items');
  if (!tabsEl || !itemsEl) return;

  let menuData  = [];
  let sidesPool = []; // available sides today

  // ── Fetch from Google Sheets ─────────────────────────────
  // Apps Script returns: { menu: [...], sides: [...] }
  async function fetchData() {
    const url = CONFIG.SHEETS_URL;

    if (!url || url === 'YOUR_GOOGLE_SHEETS_JSON_URL_HERE') {
      return { menu: CONFIG.SAMPLE_MENU, sides: CONFIG.SAMPLE_SIDES };
    }

    try {
      const res  = await fetch(url);
      const json = await res.json();

      const menu = (json.menu || []).map(r => ({
        category: r.category || r.Category || 'Other',
        name:     r.name     || r.Name     || '',
        description: r.description || r.Description || '',
        price:    parseFloat(r.price || r.Price || 0),
        type:     (r.type  || r.Type  || 'standalone').toLowerCase().trim(),
        sides:    parseInt(r.sides || r.Sides || 2, 10),
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

  // ── Render category tabs ──────────────────────────────────
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

  // ── Render menu items ─────────────────────────────────────
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
          openSidesPicker(item, this);
        } else {
          Cart.add({ name: item.name, price: item.price });
          this.textContent = 'Added ✓';
          this.classList.add('added');
          setTimeout(() => {
            this.textContent = '+ Add';
            this.classList.remove('added');
          }, 1500);
        }
      });

      itemsEl.appendChild(el);
    });
  }

  // ── Sides picker modal ────────────────────────────────────
  function openSidesPicker(item, addBtn) {
    const modal       = document.getElementById('sides-modal');
    const titleEl     = document.getElementById('sides-modal-title');
    const subEl       = document.getElementById('sides-modal-sub');
    const listEl      = document.getElementById('sides-list');
    const errorEl     = document.getElementById('sides-error');
    const confirmBtn  = document.getElementById('sides-confirm');
    const cancelBtn   = document.getElementById('sides-cancel');

    if (!modal) return;

    const required = item.sides || 2;

    titleEl.textContent = item.name;
    subEl.textContent   = `Choose ${required} side${required !== 1 ? 's' : ''}`;
    errorEl.classList.add('hidden');
    confirmBtn.textContent = `Add to Order`;

    // Populate sides
    listEl.innerHTML = '';

    if (!sidesPool.length) {
      listEl.innerHTML = '<p class="sides-unavailable">Sides unavailable — please check back soon.</p>';
    } else {
      sidesPool.forEach(side => {
        const row = document.createElement('label');
        row.className = 'side-option';
        row.innerHTML = `
          <input type="checkbox" class="side-checkbox" value="${side}" />
          <span class="side-check-icon"></span>
          <span class="side-name">${side}</span>
        `;
        listEl.appendChild(row);
      });
    }

    // Enforce max selections
    listEl.addEventListener('change', () => {
      const checked = listEl.querySelectorAll('.side-checkbox:checked');
      listEl.querySelectorAll('.side-checkbox:not(:checked)').forEach(cb => {
        cb.disabled = checked.length >= required;
      });
      errorEl.classList.add('hidden');
    });

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Confirm
    const handleConfirm = () => {
      const selected = [...listEl.querySelectorAll('.side-checkbox:checked')].map(cb => cb.value);
      if (selected.length !== required) {
        errorEl.textContent = `Please choose exactly ${required} side${required !== 1 ? 's' : ''}.`;
        errorEl.classList.remove('hidden');
        return;
      }
      Cart.add({ name: item.name, price: item.price, sides: selected });
      closeModal();
      addBtn.textContent = 'Added ✓';
      addBtn.classList.add('added');
      setTimeout(() => {
        addBtn.textContent = '+ Add';
        addBtn.classList.remove('added');
      }, 1500);
    };

    const handleCancel = () => closeModal();

    function closeModal() {
      modal.classList.remove('open');
      document.body.style.overflow = '';
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
      listEl.innerHTML = '';
    }

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);

    // Backdrop click
    modal.addEventListener('click', e => {
      if (e.target === modal) closeModal();
    }, { once: true });
  }

  // ── Init ─────────────────────────────────────────────────
  itemsEl.innerHTML = '<div class="loading-state">Loading menu&hellip;</div>';

  const data  = await fetchData();
  menuData    = data.menu;
  sidesPool   = data.sides;

  const categories = [...new Set(menuData.map(i => i.category))];
  renderTabs(categories, 'All');
  renderMenu('All');
})();
