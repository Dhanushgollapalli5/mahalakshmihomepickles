const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');
const navLinks = navMenu ? navMenu.querySelectorAll('.nav-links a') : [];
const themeToggle = document.querySelector('.theme-toggle');
const scrollProgress = document.querySelector('.scroll-progress');
const faqItems = document.querySelectorAll('.faq-item');
const orderForm = document.querySelector('.order-form');

// Leave empty when backend runs on the same domain as the website.
// If your Node.js backend is hosted separately, set its full HTTPS URL here
// either by editing the `REMOTE_API_BASE_URL_MANUAL` below, by setting
// `window.__MAHA_API_BASE_URL__` before loading this script, or by adding a
// meta tag in your HTML head: <meta name="api-base-url" content="https://api.example.com">
// Example manual override:
// const REMOTE_API_BASE_URL_MANUAL = 'https://api.mahalakshmihomepickles.com';
const REMOTE_API_BASE_URL_MANUAL = '';

// Set this only when you want the frontend to decide payment mode entirely.
// Example override: `window.__MAHA_PAYMENT_MODE__ = 'razorpay'` or use the
// meta tag <meta name="payment-mode" content="razorpay" /> in your HTML.
const REMOTE_PAYMENT_MODE_MANUAL = '';

const isLocalHost = (() => {
  const { protocol, hostname } = window.location;
  return protocol === 'file:' || hostname === '' || hostname === 'localhost' || hostname === '127.0.0.1';
})();

// Resolve REMOTE_API_BASE_URL with the following precedence:
// 1) manual override in this file (REMOTE_API_BASE_URL_MANUAL)
// 2) global override on window.__MAHA_API_BASE_URL__
// 3) meta tag <meta name="api-base-url" content="..."> in the page head
// 4) fallback to same-origin / localhost behavior (handled below)
let REMOTE_API_BASE_URL = REMOTE_API_BASE_URL_MANUAL || '';

if (!REMOTE_API_BASE_URL && typeof window !== 'undefined' && window.__MAHA_API_BASE_URL__) {
  REMOTE_API_BASE_URL = String(window.__MAHA_API_BASE_URL__).trim().replace(/\/$/, '');
}

if (!REMOTE_API_BASE_URL && !isLocalHost && typeof document !== 'undefined') {
  const meta = document.querySelector('meta[name="api-base-url"]');
  if (meta && meta.content && meta.content.trim()) {
    REMOTE_API_BASE_URL = meta.content.trim().replace(/\/$/, '');
  }
}

// Resolve REMOTE_PAYMENT_MODE with the following precedence:
// 1) manual override in this file (REMOTE_PAYMENT_MODE_MANUAL)
// 2) global override on window.__MAHA_PAYMENT_MODE__
// 3) meta tag <meta name="payment-mode" content="..."> in the page head
let REMOTE_PAYMENT_MODE = REMOTE_PAYMENT_MODE_MANUAL || '';

if (!REMOTE_PAYMENT_MODE && typeof window !== 'undefined' && window.__MAHA_PAYMENT_MODE__) {
  REMOTE_PAYMENT_MODE = String(window.__MAHA_PAYMENT_MODE__).trim();
}

if (!REMOTE_PAYMENT_MODE && !isLocalHost && typeof document !== 'undefined') {
  const meta = document.querySelector('meta[name="payment-mode"]');
  if (meta && meta.content && meta.content.trim()) {
    REMOTE_PAYMENT_MODE = meta.content.trim();
  }
}

const API_BASE_URL = (() => {
  const { origin } = window.location;

  if (REMOTE_API_BASE_URL) {
    return REMOTE_API_BASE_URL.replace(/\/$/, '');
  }

  // Running from file:// or local development
  if (isLocalHost) {
    return origin || 'http://localhost:3000';
  }

  // Same-domain deployment
  return origin;
})();

const PAYMENT_CONFIG_URL = API_BASE_URL ? new URL('/api/config', API_BASE_URL).toString() : '/api/config';
const API_ENDPOINT = (path) => API_BASE_URL.replace(/\/$/, '') + path;

const DEFAULT_PAYMENT_CONFIG = {
  paymentMode: 'razorpay',
  razorpayKeyId: ''
};

let paymentConfig = null;

function normalizePaymentMode(mode) {
  // Only Razorpay is supported for online checkout.
  return 'razorpay';
}

async function loadPaymentConfig() {
  if (paymentConfig) return paymentConfig;

  const attemptedUrls = [];
  async function fetchConfig(url) {
    attemptedUrls.push(url);
    const response = await fetch(url, { cache: 'no-store' });
    if (response.ok) {
      return response.json();
    }
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  try {
    const data = await fetchConfig(PAYMENT_CONFIG_URL);
    paymentConfig = {
      paymentMode: 'razorpay',
      razorpayKeyId: data.razorpayKeyId || data.razorpayKey || DEFAULT_PAYMENT_CONFIG.razorpayKeyId,
      supportsRazorpay: Boolean(data.razorpayKeyId || data.razorpayKey)
    };
    return paymentConfig;
  } catch (error) {
    console.warn(`Failed to load payment config from ${PAYMENT_CONFIG_URL}:`, error.message);

    const sameOriginUrl = '/api/config';
    if (!PAYMENT_CONFIG_URL.endsWith(sameOriginUrl)) {
      try {
        const fallbackData = await fetchConfig(sameOriginUrl);
        console.warn(`Loaded payment config from fallback ${sameOriginUrl}.`);
        paymentConfig = {
          paymentMode: 'razorpay',
          razorpayKeyId: fallbackData.razorpayKeyId || fallbackData.razorpayKey || DEFAULT_PAYMENT_CONFIG.razorpayKeyId,
          supportsRazorpay: Boolean(fallbackData.razorpayKeyId || fallbackData.razorpayKey)
        };
        return paymentConfig;
      } catch (fallbackError) {
        console.warn(`Fallback config fetch failed from ${sameOriginUrl}:`, fallbackError.message);
      }
    }
  }

  const errorMessage = `Unable to load payment gateway configuration from ${attemptedUrls.join(', ')}.`;
  console.error(errorMessage);
  if (typeof showNotification === 'function') {
    showNotification(`${errorMessage} Please verify the backend is running and accessible from this website.`, 'error');
  }

  paymentConfig = { ...DEFAULT_PAYMENT_CONFIG };
  return paymentConfig;
}

function setNavState(isOpen) {
  if (!navToggle || !navMenu) return;
  navMenu.classList.toggle('show', isOpen);
  navToggle.setAttribute('aria-expanded', String(isOpen));
}

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.body.classList.toggle('dark-mode', isDark);
  if (themeToggle) {
    themeToggle.textContent = isDark ? '☀️' : '🌙';
    themeToggle.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
  }
  localStorage.setItem('theme', theme);
}

function updateScrollProgress() {
  if (!scrollProgress) return;
  const scrollTop = window.scrollY;
  const docHeight = document.body.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  scrollProgress.style.width = `${Math.min(100, Math.max(0, progress))}%`;
}

if (navToggle && navMenu) {
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.addEventListener('click', () => {
    const isOpen = !navMenu.classList.contains('show');
    setNavState(isOpen);
  });
}

if (themeToggle) {
  const savedTheme = localStorage.getItem('theme');
  const defaultTheme = savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(defaultTheme);
  themeToggle.addEventListener('click', () => {
    const nextTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
    applyTheme(nextTheme);
  });
}

window.addEventListener('scroll', updateScrollProgress);
window.addEventListener('resize', updateScrollProgress);
updateScrollProgress();

const header = document.querySelector('.site-header');

// Animated Statistics Counter
function animateCounters() {
  const stats = document.querySelectorAll('.stat-number');
  const speed = 30;

  stats.forEach(stat => {
    const target = parseInt(stat.getAttribute('data-count'));
    let current = 0;
    const increment = target / speed;

    const counter = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(counter);
      }
      stat.textContent = Math.floor(current).toLocaleString();
    }, 50);
  });
}

const statsSection = document.getElementById('stats');
if (statsSection) {
  const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      animateCounters();
      observer.unobserve(statsSection);
    }
  }, { threshold: 0.5 });
  observer.observe(statsSection);
}

// Testimonial Carousel
class TestimonialCarousel {
  constructor() {
    this.carousel = document.querySelector('.testimonial-carousel');
    if (!this.carousel) return;

    this.items = this.carousel.querySelectorAll('.carousel-item');
    this.dots = this.carousel.querySelectorAll('.dot');
    this.currentIndex = 0;
    this.autoPlayInterval = null;

    this.setupEventListeners();
    this.startAutoPlay();
  }

  setupEventListeners() {
    this.carousel.querySelector('.carousel-btn.prev').addEventListener('click', () => this.prevSlide());
    this.carousel.querySelector('.carousel-btn.next').addEventListener('click', () => this.nextSlide());
    this.dots.forEach(dot => {
      dot.addEventListener('click', (e) => this.goToSlide(parseInt(e.target.getAttribute('data-index'))));
    });
    this.carousel.addEventListener('mouseenter', () => this.stopAutoPlay());
    this.carousel.addEventListener('mouseleave', () => this.startAutoPlay());
  }

  showSlide(index) {
    this.items.forEach(item => item.classList.remove('active'));
    this.dots.forEach(dot => dot.classList.remove('active'));
    this.items[index].classList.add('active');
    this.dots[index].classList.add('active');
    this.currentIndex = index;
  }

  nextSlide() {
    const nextIndex = (this.currentIndex + 1) % this.items.length;
    this.showSlide(nextIndex);
  }

  prevSlide() {
    const prevIndex = (this.currentIndex - 1 + this.items.length) % this.items.length;
    this.showSlide(prevIndex);
  }

  goToSlide(index) {
    this.showSlide(index);
  }

  startAutoPlay() {
    this.autoPlayInterval = setInterval(() => this.nextSlide(), 5000);
  }

  stopAutoPlay() {
    clearInterval(this.autoPlayInterval);
  }
}

new TestimonialCarousel();

// Image Lightbox Gallery
class ImageLightbox {
  constructor() {
    this.lightbox = document.getElementById('lightbox');
    this.galleryImages = document.querySelectorAll('.gallery-card img');
    this.currentImageIndex = 0;

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.galleryImages.forEach((img, index) => {
      img.style.cursor = 'pointer';
      img.addEventListener('click', () => this.openLightbox(index));
    });

    this.lightbox.querySelector('.lightbox-close').addEventListener('click', () => this.closeLightbox());
    this.lightbox.querySelector('.lightbox-backdrop').addEventListener('click', () => this.closeLightbox());
    this.lightbox.querySelector('.lightbox-nav.prev').addEventListener('click', () => this.prevImage());
    this.lightbox.querySelector('.lightbox-nav.next').addEventListener('click', () => this.nextImage());

    document.addEventListener('keydown', (e) => {
      if (this.lightbox.classList.contains('active')) {
        if (e.key === 'Escape') this.closeLightbox();
        if (e.key === 'ArrowLeft') this.prevImage();
        if (e.key === 'ArrowRight') this.nextImage();
      }
    });
  }

  openLightbox(index) {
    this.currentImageIndex = index;
    const img = this.galleryImages[index];
    document.getElementById('lightbox-image').src = img.src;
    document.getElementById('lightbox-title').textContent = img.alt || 'Product Image';
    this.lightbox.classList.add('active');
    this.lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  closeLightbox() {
    this.lightbox.classList.remove('active');
    this.lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  nextImage() {
    this.currentImageIndex = (this.currentImageIndex + 1) % this.galleryImages.length;
    this.openLightbox(this.currentImageIndex);
  }

  prevImage() {
    this.currentImageIndex = (this.currentImageIndex - 1 + this.galleryImages.length) % this.galleryImages.length;
    this.openLightbox(this.currentImageIndex);
  }
}

new ImageLightbox();

// Cart Drawer
class CartDrawer {
  constructor() {
    this.drawer = document.getElementById('cartDrawer');
    this.fab = document.getElementById('cartFab');
    this.closeBtn = this.drawer ? this.drawer.querySelector('.drawer-close') : null;
    this.checkoutBtn = document.getElementById('drawerCheckout');
    this.itemsContainer = document.getElementById('drawerItems');
    this.totalDisplay = document.getElementById('drawerTotal');
    this.badge = document.getElementById('cartBadge');
    this.cart = JSON.parse(localStorage.getItem('mhp-cart')) || [];

    this.setupEventListeners();
    this.updateCart();
  }

  setupEventListeners() {
    if (this.fab) this.fab.addEventListener('click', () => this.toggleDrawer());
    if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.toggleDrawer());
    if (this.drawer) {
      this.drawer.addEventListener('click', (e) => {
        if (e.target.classList.contains('drawer-backdrop')) this.toggleDrawer();
      });
    }

    if (this.checkoutBtn) {
      this.checkoutBtn.addEventListener('click', () => this.checkout());
    }
  }

  toggleDrawer() {
    this.drawer.classList.toggle('open');
  }

  addItem(item) {
    try {
      const normalized = {
        name: item.name || item.item || 'Item',
        price: Number(item.price || item.priceNumeric || 0) || 0,
        qty: Number(item.qty || 1) || 1
      };

      this.cart.push(normalized);
      this.saveCart();
      this.updateCart();
      console.debug('Cart addItem:', normalized, 'cartCount=', this.cart.length);
      this.showNotification('Item added to cart!', 'success');
    } catch (err) {
      console.error('Failed to add item to cart', err, item);
    }
  }

  removeItem(index) {
    this.cart.splice(index, 1);
    this.saveCart();
    this.updateCart();
  }

  updateCart() {
    console.debug('updateCart called. cart length:', this.cart.length, 'badge:', this.badge, 'container:', this.itemsContainer);
    
    if (this.badge) {
      this.badge.textContent = this.cart.length;
      console.debug('Badge updated to:', this.cart.length);
    }

    if (!this.itemsContainer) {
      console.warn('itemsContainer is null, cannot update cart display');
      return;
    }

    if (this.cart.length === 0) {
      this.itemsContainer.innerHTML = '<p style="text-align: center; color: var(--text-medium); margin-top: 2rem;">Your cart is empty</p>';
      if (this.totalDisplay) this.totalDisplay.textContent = '₹0';
      console.debug('Cart is empty, showing empty message');
      return;
    }

    let html = '';
    let total = 0;

    this.cart.forEach((item, index) => {
      const qty = Number(item.qty || 1);
      const itemPrice = Number(item.price || 0);
      const itemTotal = itemPrice * qty;
      total += itemTotal;
      html += `
        <div class="drawer-item">
          <div class="drawer-item-info">
            <div><strong>${escapeHTML(item.name)}</strong> x${qty}</div>
            <div>${qty} × ₹${itemPrice} = ₹${itemTotal}</div>
          </div>
          <button class="drawer-item-remove" onclick="window.cartDrawer.removeItem(${index})">✕</button>
        </div>
      `;
    });

    this.itemsContainer.innerHTML = html;
    if (this.totalDisplay) this.totalDisplay.textContent = `₹${total}`;
    console.debug('Cart updated with', this.cart.length, 'items, total:', total);
  }

  saveCart() {
    localStorage.setItem('mhp-cart', JSON.stringify(this.cart));
    console.debug('Saved to localStorage:', this.cart);
  }

  checkout() {
    if (this.cart.length === 0) {
      this.showNotification('Cart is empty!', 'error');
      return;
    }

    const total = this.cart.reduce((sum, item) => {
      const qty = Number(item.qty || 1);
      const price = Number(item.price || 0);
      return sum + price * qty;
    }, 0);

    if (this.drawer && this.drawer.classList.contains('open')) {
      this.toggleDrawer();
    }

    const orderNumber = generateOrderNumber();
    showOrderModal(this.cart, total, 'Please review your cart and confirm your order details.', orderNumber);
  }

  showNotification(message, type) {
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.innerHTML = `<div class="notification-content"><span>${message}</span></div>`;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
  }
}

window.cartDrawer = new CartDrawer();

// Wishlist
class Wishlist {
  constructor() {
    this.wishlistButtons = document.querySelectorAll('.wishlist-btn');
    this.wishlist = JSON.parse(localStorage.getItem('mhp-wishlist')) || [];

    this.setupEventListeners();
    this.updateWishlistUI();
  }

  setupEventListeners() {
    this.wishlistButtons.forEach((btn, index) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleWishlist(btn, index);
      });
    });
  }

  toggleWishlist(btn, index) {
    if (this.wishlist.includes(index)) {
      this.wishlist = this.wishlist.filter(i => i !== index);
      btn.classList.remove('liked');
      btn.textContent = '♡';
      btn.setAttribute('aria-pressed', 'false');
      this.showWishlistToast('Removed from wishlist', 'removed');
    } else {
      this.wishlist.push(index);
      btn.classList.add('liked');
      btn.textContent = '♥';
      btn.setAttribute('aria-pressed', 'true');
      this.showWishlistToast('Added to wishlist ❤️', 'added');
    }
    this.saveWishlist();
  }

  saveWishlist() {
    localStorage.setItem('mhp-wishlist', JSON.stringify(this.wishlist));
  }

  updateWishlistUI() {
    this.wishlistButtons.forEach((btn, index) => {
      if (this.wishlist.includes(index)) {
        btn.classList.add('liked');
        btn.textContent = '♥';
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.textContent = '♡';
        btn.setAttribute('aria-pressed', 'false');
      }
    });
  }

  showWishlistToast(message, type) {
    const toast = document.getElementById('wishlistToast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }
}

new Wishlist();

navLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    setNavState(false);

    const targetId = link.getAttribute('href')?.slice(1);
    const target = targetId ? document.getElementById(targetId) : null;
    if (target) {
      event.preventDefault();
      const offset = 20; // Small offset for better positioning
      const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

faqItems.forEach((item) => {
  item.addEventListener('click', () => {
    const isActive = item.classList.contains('active');
    faqItems.forEach((faq) => faq.classList.remove('active'));
    if (!isActive) item.classList.add('active');
  });
});

if (orderForm) {
  orderForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!orderForm.checkValidity()) {
      orderForm.reportValidity();
      return;
    }

    showNotification('Select products from the catalogue and use Proceed to Order for Razorpay checkout.', 'info');
  });
}

const trackOrderForm = document.getElementById('trackOrderForm');
const trackOrderStatus = document.getElementById('trackOrderStatus');

if (trackOrderForm && trackOrderStatus) {
  trackOrderForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const orderIdInput = document.getElementById('trackOrderInput');
    const orderId = orderIdInput ? orderIdInput.value.trim() : '';
    if (!orderId) {
      trackOrderStatus.textContent = 'Please enter your order number.';
      return;
    }

    const knownStatus = {
      'MHP-READY': 'Packed and ready for dispatch. We will ship your order in 24 hours.',
      'MHP-SHIPPED': 'Your order is on the way and expected to arrive in 2-5 days.',
      'MHP-DELIVER': 'Out for delivery now. Please keep your phone on for updates.',
      'MHP-DELIVERED': 'Delivered successfully. Thank you for ordering with us!'
    };

    const status = knownStatus[orderId.toUpperCase()] || `We have received your order number ${orderId}. For the latest live status, please call +91 93924 40953 or message us on WhatsApp.`;
    trackOrderStatus.textContent = status;
  });
}

const searchInput = document.querySelector('#product-search');
const productRows = document.querySelectorAll('.table-wrap tbody tr');
const backToTop = document.querySelector('.back-to-top');

if (searchInput) {
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    productRows.forEach((row) => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(query) ? '' : 'none';
    });
  });
}

window.addEventListener('scroll', () => {
  if (!backToTop) return;
  if (window.pageYOffset > 440) {
    backToTop.style.opacity = '1';
    backToTop.style.pointerEvents = 'auto';
  } else {
    backToTop.style.opacity = '0';
    backToTop.style.pointerEvents = 'none';
  }
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      navLinks.forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`);
      });
    }
  });
}, {
  rootMargin: '-35% 0px -55% 0px',
  threshold: 0,
});

document.querySelectorAll('section[id]').forEach((section) => observer.observe(section));

// Product Selection & Order Handler
const orderButtons = document.querySelectorAll('.order-selected-btn');

// Cart tracking
let selectedItemCount = 0;

function generateOrderNumber() {
  const now = new Date();
  const parts = [
    String(now.getFullYear()).slice(-2),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0')
  ];
  return `MHP-${parts.join('')}`;
}

function getExpectedDeliveryDate(daysAhead = 2) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short'
  });
}

function buildOrderSummary(items, grandTotal, orderNo) {
  const orderNumber = orderNo || generateOrderNumber();
  const packagingFee = 30;
  const deliveryCharge = 50;
  const totalAmount = grandTotal + packagingFee + deliveryCharge;

  let summary = `Order #${orderNumber}\n`;
  summary += '──────────────────\n';

  items.forEach((item, index) => {
    const itemName = item.item || item.name || 'Item';
    const itemSize = item.size || 'Standard';
    const itemQty = item.qty || 1;
    const unitPrice = Number(item.priceNumeric || item.price || 0);
    const itemTotal = item.total || unitPrice * itemQty;

    summary += `${index + 1}. ${itemName} | ${itemSize} | x ${itemQty} | ₹${itemTotal}/-\n`;
  });

  summary += '──────────────────\n';
  summary += `Subtotal: ₹${grandTotal}/-\n`;
  summary += `Packaging: ₹${packagingFee}/-\n`;
  summary += `Delivery: ₹${deliveryCharge}/-\n`;
  summary += `Total: ₹${totalAmount}/-\n\n`;
  summary += `Expected Delivery: ${getExpectedDeliveryDate()}\n`;

  return summary;
}

// Track checkbox changes
document.addEventListener('change', (e) => {
  if (e.target.classList.contains('product-checkbox')) {
    selectedItemCount = document.querySelectorAll('.product-checkbox:checked').length;
  }
});

// Cart click handler placeholder removed in favor of Order Selected Items buttons

orderButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const sectionId = btn.getAttribute('data-section');
    const section = document.getElementById(sectionId);
    if (!section) return;

    const table = section.querySelector('table');
    if (!table) return;

    const rows = table.querySelectorAll('tbody tr');
    const selectedItems = [];

    rows.forEach((row) => {
      const checkbox = row.querySelector('.product-checkbox');
      if (checkbox && checkbox.checked) {
        // Get the item name (third column after checkbox and #)
        const itemCell = row.querySelector('td:nth-child(3)');
        const itemName = itemCell ? itemCell.textContent.trim() : '';

        // Get the size select (5th column)
        const sizeSelect = row.querySelector('.size-select');
        const selectedSize = sizeSelect ? sizeSelect.value : '';

        // Get the quantity input (6th column)
        const qtyInput = row.querySelector('.qty-input');
        const quantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1;

        // Get prices based on section and size
        let price = '';
        let priceNumeric = 0;

        if (sectionId === 'chocolates') {
          // Chocolates: 1 Box (15 Chocolates), 1 Box (30 Chocolates)
          if (selectedSize === '1 Box (15 Chocolates)') {
            const priceCell = row.querySelector('td:nth-child(7)');
            price = priceCell ? priceCell.textContent.trim() : '';
          } else if (selectedSize === '1 Box (30 Chocolates)') {
            const priceCell = row.querySelector('td:nth-child(8)');
            price = priceCell ? priceCell.textContent.trim() : '';
          }
        } else {
          // Other sections: 250gm, 500gm, 1kg + special piece-based items
          if (selectedSize === '100gm' || selectedSize === '250gm' || selectedSize === '1 piece') {
            const priceCell = row.querySelector('td:nth-child(7)');
            price = priceCell ? priceCell.textContent.trim() : '';
          } else if (selectedSize === '500gm' || selectedSize === '10 pieces') {
            const priceCell = row.querySelector('td:nth-child(8)');
            price = priceCell ? priceCell.textContent.trim() : '';
          } else if (selectedSize === '1kg' || selectedSize === '20 pieces') {
            const priceCell = row.querySelector('td:nth-child(9)');
            price = priceCell ? priceCell.textContent.trim() : '';
          }
        }

        // Extract numeric price
        if (price && price !== '—') {
          priceNumeric = parseInt(price.replace('/-', '')) || 0;
        }

        if (itemName && selectedSize && price && price !== '—') {
          selectedItems.push({
            item: itemName,
            size: selectedSize,
            qty: quantity,
            price: price,
            priceNumeric: priceNumeric,
            total: priceNumeric * quantity
          });
        }
      }
    });

    if (selectedItems.length === 0) {
      showNotification('Please select at least one item to order', 'error');
      return;
    }

    // Calculate grand total
    const grandTotal = selectedItems.reduce((sum, item) => sum + item.total, 0);
    const orderNumber = generateOrderNumber();
    const orderMessage = buildOrderSummary(selectedItems, grandTotal, orderNumber);

    // If cart drawer exists, add selected items to cart and open drawer
    if (window.cartDrawer && typeof window.cartDrawer.addItem === 'function') {
      selectedItems.forEach((it) => {
        window.cartDrawer.addItem({ name: it.item, price: it.priceNumeric || 0, qty: it.qty });
      });
      showNotification('Selected items added to cart', 'success');
      const drawer = document.getElementById('cartDrawer');
      if (drawer) drawer.classList.add('open');
      return;
    }

    // Fallback: Show order summary modal
    showOrderModal(selectedItems, grandTotal, orderMessage, orderNumber);
  });
});

// Modern Order Modal System
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char];
  });
}

async function submitOrder(orderData) {
  const packagingFee = 30;
  const deliveryCharge = 50;
  const amountINR = Number(orderData.total) + packagingFee + deliveryCharge;

  if (!Number.isFinite(amountINR) || amountINR <= 0) {
    console.error('Invalid order amount:', orderData.total, packagingFee, deliveryCharge);
    showNotification('Unable to process order: invalid order amount.', 'error');
    return;
  }

  const orderSummary = buildOrderSummary(orderData.items, orderData.total, orderData.orderNumber);

  const notificationResult = await sendOrderNotification({
    orderNumber: orderData.orderNumber,
    amount: amountINR,
    customerName: orderData.name,
    email: orderData.email,
    phone: orderData.phone,
    address: orderData.address,
    whatsappProvider: orderData.whatsappProvider,
    orderSummary,
    paymentMethod: 'Razorpay'
  });

  const successData = {
    orderNumber: orderData.orderNumber,
    customerName: orderData.name,
    email: orderData.email,
    phone: orderData.phone,
    address: orderData.address,
    amount: amountINR,
    orderSummary,
    notificationResult
  };

  sessionStorage.setItem('orderSuccessData', JSON.stringify(successData));
  showNotification('Finalizing your order... please wait.', 'info');
  await new Promise((resolve) => setTimeout(resolve, 1500));
  window.location.href = 'success.html';
}

async function sendOrderNotification(notificationData) {
  try {
    const response = await fetch('/api/order-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(notificationData)
    });

    const result = await response.json();
    if (response.ok && result.success) {
      return {
        success: true,
        emailSent: result.emailSent,
        whatsappSent: result.whatsappSent,
        details: result
      };
    }

    console.warn('Order notification failed:', result);
    return {
      success: false,
      emailSent: result.emailSent ?? false,
      whatsappSent: result.whatsappSent ?? false,
      error: result.error || 'Notification request failed',
      details: result
    };
  } catch (error) {
    console.error('Failed to notify server:', error);
    return {
      success: false,
      emailSent: false,
      whatsappSent: false,
      error: error.message || 'Failed to contact notification server'
    };
  }
}

async function showOrderModal(items, total, message, orderNumber) {
  const config = await loadPaymentConfig();
  const paymentModeText = 'Razorpay';
  const paymentModeNote = 'You will pay securely through Razorpay checkout in the next step.';

  const existingModal = document.querySelector('.order-modal');
  if (existingModal) existingModal.remove();

  const hasItems = items && items.length > 0;
  const orderItemsHtml = hasItems ? items.map(item => {
    const itemName = item.item || item.name || 'Item';
    const itemSize = item.size || 'Standard';
    const itemPrice = item.price || item.priceNumeric || 0;
    const itemQty = item.qty || 1;
    const itemTotal = item.total || (itemPrice * itemQty);

    return `
      <div class="order-item">
        <div class="item-name">${escapeHTML(itemName)}</div>
        <div class="item-details">Size: ${escapeHTML(itemSize)} | Qty: ${itemQty} | ₹${itemPrice}</div>
        <div class="item-total">₹${itemTotal}/-</div>
      </div>
    `;
  }).join('') : '';

  const totalWithFees = hasItems ? total + 80 : 0;
  const orderIdHtml = orderNumber ? `<p class="order-number"><strong>Order Number:</strong> ${escapeHTML(orderNumber)}</p>` : '';
  const messageHtml = message && hasItems ? `<div class="order-message"><label>Order notes:</label><pre>${escapeHTML(message)}</pre></div>` : '';
  const emptyMessageHtml = !hasItems ? '<div class="order-message"><p>Please select products from the catalogue and proceed to place your order.</p></div>' : '';

  const modal = document.createElement('div');
  modal.className = 'order-modal';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3>📋 Order Confirmation</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body step-1">
        ${orderIdHtml}
        ${hasItems ? `<div class="order-items">${orderItemsHtml}</div>` : emptyMessageHtml}
        ${messageHtml}
        <div class="order-total">
          <strong>Grand Total: ₹${totalWithFees}/-</strong>
          ${hasItems ? '<small class="order-fees">Includes ₹30 packaging + ₹50 delivery</small>' : ''}
        </div>
        <div class="payment-mode-section">
          <div class="input-group">
            <label>Payment Mode:</label>
            <div class="payment-mode-text">${paymentModeText}</div>
          </div>
          <small class="payment-mode-note">${paymentModeNote}</small>
        </div>
        <div class="customer-details">
          <div class="input-group">
            <label for="customer-name">Full Name:</label>
            <input type="text" id="customer-name" placeholder="Enter your full name" required>
          </div>
          <div class="input-group">
            <label for="customer-address">Delivery Address:</label>
            <textarea id="customer-address" placeholder="Enter complete delivery address" rows="3" required></textarea>
          </div>
          <div class="input-group">
            <label for="customer-phone">Contact Number:</label>
            <input type="tel" id="customer-phone" placeholder="9876543210" maxlength="12" required>
            <small>Enter 10-digit number (e.g., 9876543210)</small>
          </div>
          <div class="input-group">
            <label for="customer-email">Email Address:</label>
            <input type="email" id="customer-email" placeholder="you@example.com">
            <small>Optional: receive email confirmation</small>
          </div>
          <div class="input-group">
            <label for="use-callmebot">WhatsApp notification</label>
            <label class="checkbox-label"><input id="use-callmebot" type="checkbox"> Send WhatsApp via CallMeBot</label>
            <small>Optional: send order alert via CallMeBot API (if configured)</small>
          </div>
        </div>
      </div>
      <div class="modal-body step-2" style="display:none;"></div>
      <div class="modal-footer">
        <button class="btn-secondary modal-back" style="display:none;">Back</button>
        <button class="btn-secondary modal-cancel">Cancel</button>
        <button class="btn-primary modal-confirm">${hasItems ? 'Next' : 'Close'}</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeBtn = modal.querySelector('.modal-close');
  const cancelBtn = modal.querySelector('.modal-cancel');
  const backBtn = modal.querySelector('.modal-back');
  const confirmBtn = modal.querySelector('.modal-confirm');
  const step1 = modal.querySelector('.step-1');
  const step2 = modal.querySelector('.step-2');
  const nameInput = modal.querySelector('#customer-name');
  const addressInput = modal.querySelector('#customer-address');
  const phoneInput = modal.querySelector('#customer-phone');
  const emailInput = modal.querySelector('#customer-email');
  const headerTitle = modal.querySelector('.modal-header h3');

  function closeModal() {
    modal.remove();
  }

  async function processRazorpayPayment({ orderData, totalWithFees, orderNumber, message, config }) {
    try {
      const createResponse = await fetch(API_ENDPOINT('/api/create-order'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: totalWithFees,
          receipt: orderNumber,
          notes: {
            customerName: orderData.name,
            email: orderData.email,
            phone: orderData.phone,
            address: orderData.address
          }
        })
      });

      const createResult = await createResponse.json();
      if (!createResponse.ok || !createResult.success) {
        throw new Error(createResult.error || 'Unable to create payment order');
      }

      const razorpayOrder = createResult.order;
      const options = {
        key: config.razorpayKeyId || config.razorpayKey,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'Mahalakshmi Home Pickles',
        description: `Order ${orderNumber}`,
        order_id: razorpayOrder.id,
        prefill: {
          name: orderData.name,
          email: orderData.email,
          contact: orderData.phone
        },
        theme: {
          color: '#0f766e'
        },
        handler: async function (response) {
          try {
            const verifyResponse = await fetch(API_ENDPOINT('/api/verify-payment'), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderNumber,
                amount: totalWithFees,
                customerName: orderData.name,
                email: orderData.email,
                phone: orderData.phone,
                address: orderData.address,
                whatsappProvider: orderData.whatsappProvider,
                orderSummary: message || '',
                paymentMethod: 'Razorpay'
              })
            });

            const verifyResult = await verifyResponse.json();
            if (!verifyResponse.ok || !verifyResult.success) {
              throw new Error(verifyResult.error || 'Payment verification failed');
            }

            sessionStorage.setItem('orderSuccessData', JSON.stringify({
              orderNumber,
              customerName: orderData.name,
              email: orderData.email,
              phone: orderData.phone,
              address: orderData.address,
              amount: totalWithFees,
              orderSummary: message || '',
              paymentMethod: 'Razorpay',
              notificationResult: verifyResult
            }));

            showNotification('Payment successful! Redirecting to confirmation...', 'success');
            window.location.href = 'success.html';
          } catch (error) {
            console.error('Payment verification error:', error);
            showNotification(`Payment completed but verification failed: ${error.message}`, 'error');
          }
        },
        modal: {
          ondismiss: function () {
            showNotification('Razorpay checkout dismissed. Payment not completed.', 'error');
          }
        }
      };

      const rzp = new Razorpay(options);
      rzp.on('payment.failed', function (response) {
        console.error('Razorpay payment failed:', response.error);
        showNotification('Payment failed. Please try again or contact support.', 'error');
      });

      rzp.open();
    } catch (error) {
      console.error('Razorpay order error:', error);
      showNotification(error.message || 'Could not start Razorpay payment.', 'error');
    }
  }

  async function showPaymentStep(orderData, items) {
    const config = await loadPaymentConfig();
    step1.style.display = 'none';
    step2.style.display = 'block';
    headerTitle.textContent = '💳 Payment Details';
    backBtn.style.display = 'inline-flex';

    confirmBtn.style.display = 'none';

    if (!config.razorpayKeyId && !config.razorpayKey) {
      showNotification('Razorpay is not configured. Please contact support.', 'error');
      return;
    }

    step2.innerHTML = `
      <div class="order-summary-compact">
        ${orderIdHtml}
        <div class="order-total">
          <strong>Total Payable:</strong> ₹${totalWithFees}/-
        </div>
        <div class="payment-razorpay-header">
          <p>Click the button below to complete your payment through Razorpay.</p>
        </div>
        <button class="button btn-primary" id="razorpay-pay-button" type="button">Pay ₹${totalWithFees} Now</button>
        <div class="payment-instructions">
          <p><strong>Order Number:</strong> ${escapeHTML(orderNumber || 'MHP')}</p>
          <p class="payment-hint">After payment, your order will be confirmed automatically.</p>
        </div>
      </div>
    `;

    const payButton = step2.querySelector('#razorpay-pay-button');
    payButton.addEventListener('click', async () => {
      payButton.disabled = true;
      payButton.textContent = 'Opening Razorpay...';
      await processRazorpayPayment({ orderData, totalWithFees, orderNumber, message, config });
      payButton.disabled = false;
      payButton.textContent = `Pay ₹${totalWithFees} Now`;
    });
  }

  function validateCustomerInfo() {
    const name = nameInput.value.trim();
    const address = addressInput.value.trim();
    const phone = phoneInput.value.trim();
    const email = emailInput.value.trim();
    const message = '';

    if (!name) {
      showNotification('Please enter your full name', 'error');
      nameInput.focus();
      return null;
    }

    if (!address) {
      showNotification('Please enter your delivery address', 'error');
      addressInput.focus();
      return null;
    }

    if (!phone) {
      showNotification('Please enter your contact number', 'error');
      phoneInput.focus();
      return null;
    }

    const cleanPhone = phone.replace(/[\s+\-()]/g, '');
    let finalPhone = '';

    if (/^\d{10}$/.test(cleanPhone)) {
      finalPhone = `91${cleanPhone}`;
    } else if (/^0\d{10}$/.test(cleanPhone)) {
      finalPhone = `91${cleanPhone.slice(1)}`;
    } else if (/^91\d{10}$/.test(cleanPhone)) {
      finalPhone = cleanPhone;
    } else {
      showNotification('Please enter a valid 10-digit Indian phone number', 'error');
      phoneInput.focus();
      return null;
    }

      const useCallMeBotCheckbox = document.getElementById('use-callmebot');
      const whatsappProvider = useCallMeBotCheckbox && useCallMeBotCheckbox.checked ? 'callmebot' : undefined;
    return {
      name,
      address,
      phone: finalPhone,
      email,
      message
    };
        whatsappProvider
  }

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
  backBtn.addEventListener('click', () => {
    step1.style.display = 'block';
    step2.style.display = 'none';
    headerTitle.textContent = '📋 Order Confirmation';
    confirmBtn.textContent = 'Next';
    confirmBtn.disabled = false;
    backBtn.style.display = 'none';
    confirmBtn.onclick = handleStep1;
  });

  async function handleStep1() {
    const orderData = validateCustomerInfo();
    if (!orderData) return;

    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Loading...';
    await showPaymentStep(orderData, items);
    confirmBtn.textContent = 'Confirm Order';
  }

  function handleCloseOnly() {
    closeModal();
  }

  if (!hasItems) {
    confirmBtn.onclick = handleCloseOnly;
  } else {
    confirmBtn.onclick = handleStep1;
  }

  setTimeout(() => nameInput.focus(), 100);
}

function showSuccessModal(data) {
  const existingModal = document.querySelector('.success-modal');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.className = 'success-modal';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3>✅ Order Received</h3>
        <button class="modal-close" aria-label="Close confirmation">&times;</button>
      </div>
      <div class="modal-body success-body">
        <p>Thank you, <strong>${escapeHTML(data.customerName || 'Customer')}</strong>!</p>
        <p>Your order total of <strong>₹${data.amount}/-</strong> has been recorded.</p>
        <p><strong>Order Number:</strong> ${escapeHTML(data.orderNumber || 'N/A')}</p>
        <p><strong>Contact:</strong> ${escapeHTML(data.phone || '')}${data.email ? ` | ${escapeHTML(data.email)}` : ''}</p>
        <p><strong>Delivery Address:</strong> ${escapeHTML(data.address || 'Not provided')}</p>
        <p>Your order has been recorded. Details will be sent to WhatsApp for confirmation if the server is configured.</p>
        <div class="order-summary-block">
          <h4>Order Summary</h4>
          <pre>${escapeHTML(data.orderSummary || '')}</pre>
        </div>
        <p>We will attempt to send confirmation to your WhatsApp number if the backend is configured correctly.</p>
      </div>
      <div class="modal-footer">
        <button class="btn-primary modal-close-btn">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeButtons = modal.querySelectorAll('.modal-close, .modal-close-btn');
  closeButtons.forEach(btn => btn.addEventListener('click', () => modal.remove()));
  modal.querySelector('.modal-backdrop').addEventListener('click', () => modal.remove());
}

// Modern Notification System
function showNotification(message, type = 'info') {
  // Remove existing notifications
  const existing = document.querySelectorAll('.notification');
  existing.forEach(n => n.remove());

  // Create notification
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
      <span class="notification-text">${message}</span>
    </div>
  `;

  document.body.appendChild(notification);

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
}

loadPaymentConfig().catch(() => {});
