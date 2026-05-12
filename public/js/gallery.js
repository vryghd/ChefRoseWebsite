// ============================================================
// VERY GHOOD — gallery.js
// Renders photos from CONFIG.GALLERY_PHOTOS array
// To add a photo: drop file in assets/photos/ then add the
// filename to GALLERY_PHOTOS in js/config.js
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const grid     = document.getElementById('gallery-grid');
  const empty    = document.getElementById('gallery-empty');
  const photos   = CONFIG.GALLERY_PHOTOS || [];

  if (!photos.length) {
    empty.classList.remove('hidden');
    return;
  }

  // Build grid
  photos.forEach((filename, index) => {
    const item = document.createElement('div');
    item.className = 'gallery-item';

    const img = document.createElement('img');
    img.src     = `assets/photos/${filename}`;
    img.alt     = `Very Ghood — photo ${index + 1}`;
    img.loading = 'lazy';
    img.addEventListener('click', () => openLightbox(index));

    item.appendChild(img);
    grid.appendChild(item);
  });

  // ── Lightbox ───────────────────────────────────────────────
  const lightbox = document.getElementById('lightbox');
  const lbImg    = document.getElementById('lightbox-img');
  const lbClose  = document.getElementById('lightbox-close');
  const lbPrev   = document.getElementById('lightbox-prev');
  const lbNext   = document.getElementById('lightbox-next');
  let current    = 0;

  function openLightbox(index) {
    current = index;
    lbImg.src = `assets/photos/${photos[current]}`;
    lbImg.alt = `Very Ghood — photo ${current + 1}`;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    updateArrows();
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    lbImg.src = '';
  }

  function showPrev() {
    current = (current - 1 + photos.length) % photos.length;
    lbImg.src = `assets/photos/${photos[current]}`;
    updateArrows();
  }

  function showNext() {
    current = (current + 1) % photos.length;
    lbImg.src = `assets/photos/${photos[current]}`;
    updateArrows();
  }

  function updateArrows() {
    lbPrev.style.display = photos.length > 1 ? 'flex' : 'none';
    lbNext.style.display = photos.length > 1 ? 'flex' : 'none';
  }

  lbClose.addEventListener('click', closeLightbox);
  lbPrev.addEventListener('click', showPrev);
  lbNext.addEventListener('click', showNext);

  // Close on backdrop click
  lightbox.addEventListener('click', e => {
    if (e.target === lightbox) closeLightbox();
  });

  // Keyboard navigation
  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape')      closeLightbox();
    if (e.key === 'ArrowLeft')   showPrev();
    if (e.key === 'ArrowRight')  showNext();
  });
});
