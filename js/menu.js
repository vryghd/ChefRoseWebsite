// ============================================================
// VERY GHOOD — menu.js
// Fetches menu from Google Sheets JSON and renders it
// ============================================================

(async function () {
  const tabsEl  = document.getElementById('category-tabs');
  const itemsEl = document.getElementById('menu-items');
  if (!tabsEl || !itemsEl) return;

  let menuData = [];

  // ── Fetch from Google Sheets ─────────────────────────────
  async function fetchMenu() {
    const url = CONFIG.SHEETS_URL;

    if (!url || url === 'YOUR_GOOGLE_SHEETS_JSON_URL_HERE') {
      return CONFIG.SAMPLE_MENU;
    }

    try {
      const res  = await fetch(url);
      const json = await res.json();

      // Google Sheets published JSON format
      // Columns: Category, Name, Description, Price, Available, Image
      const rows = json.values || json.feed?.entry || [];

      // Handle Apps Script output (array of objects)
      if (Array.isArray(rows) && typeof rows[0] === 'object' && !Array.isArray(rows[0])) {
        return rows
          .filter(r => String(r.available).toUpperCase() !== 'FALSE')
          .map(r => ({
            category:    r.category    || r.Category    || 'Other',
            name:        r.name        || r.Name        || '',
            description: r.description || r.Description || '',
            price:       parseFloat(r.price || r.Price  || 0),
            available:   String(r.available || r.Available).toUpperCase() !== 'FALSE',
            image:       r.image       || r.Image       || '',
          }));
      }

      return CONFIG.SAMPLE_MENU;
    } catch (e) {
      console.warn('Menu fetch failed, using sample data.', e);
      return CONFIG.SAMPLE_MENU;
    }
  }

  // ── Render categories ────────────────────────────────────
  function renderTabs(categories, activeCategory) {
    tabsEl.innerHTML = '';

    // "All" tab
    const allBtn = document.createElement('button');
    allBtn.className  = 'tab-btn' + (activeCategory === 'All' ? ' active' : '');
    allBtn.textContent = 'All';
    allBtn.setAttribute('role', 'tab');
    allBtn.dataset.category = 'All';
    allBtn.addEventListener('click', () => renderMenu('All'));
    tabsEl.appendChild(allBtn);

    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className  = 'tab-btn' + (activeCategory === cat ? ' active' : '');
      btn.textContent = cat;
      btn.setAttribute('role', 'tab');
      btn.dataset.category = cat;
      btn.addEventListener('click', () => renderMenu(cat));
      tabsEl.appendChild(btn);
    });
  }

  // ── Render items ─────────────────────────────────────────
  function renderMenu(category = 'All') {
    // Update active tab
    tabsEl.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });

    const filtered = category === 'All'
      ? menuData
      : menuData.filter(item => item.category === category);

    if (!filtered.length) {
      itemsEl.innerHTML = '<div class="empty-state">No items in this category.</div>';
      return;
    }

    itemsEl.innerHTML = '';
    filtered.forEach(item => {
      const el = document.createElement('div');
      el.className = 'menu-item';
      el.setAttribute('role', 'listitem');

      const imgHTML = item.image
        ? `<div class="menu-item__photo"><img src="${item.image}" alt="${item.name}" loading="lazy" /></div>`
        : `<div class="menu-item__photo"><span>Photo</span></div>`;

      el.innerHTML = `
        ${imgHTML}
        <div class="menu-item__info">
          <p class="menu-item__name">${item.name}</p>
          ${item.description ? `<p class="menu-item__desc">${item.description}</p>` : ''}
        </div>
        <div class="menu-item__right">
          <p class="menu-item__price">$${item.price.toFixed(2)}</p>
          <button class="add-btn" data-name="${item.name}" data-price="${item.price}" aria-label="Add ${item.name} to cart">
            + Add
          </button>
        </div>
      `;

      // Add to cart
      el.querySelector('.add-btn').addEventListener('click', function () {
        Cart.add({ name: item.name, price: item.price, image: item.image });
        this.textContent = 'Added ✓';
        this.classList.add('added');
        setTimeout(() => {
          this.textContent = '+ Add';
          this.classList.remove('added');
        }, 1500);
      });

      itemsEl.appendChild(el);
    });
  }

  // ── Init ─────────────────────────────────────────────────
  itemsEl.innerHTML = '<div class="loading-state">Loading menu&hellip;</div>';
  menuData = await fetchMenu();

  const availableItems = menuData.filter(i => i.available !== false);
  menuData = availableItems;

  const categories = [...new Set(menuData.map(i => i.category))];
  renderTabs(categories, 'All');
  renderMenu('All');
})();
