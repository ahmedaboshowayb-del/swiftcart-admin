import { auth } from './firebase-config.js';
import {
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export function requireAuth(callback) {
  onAuthStateChanged(auth, user => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }
    const nameEl = document.getElementById('sidebarUserName');
    const roleEl = document.getElementById('sidebarUserRole');
    if (nameEl) nameEl.textContent = user.displayName || user.email.split('@')[0];
    if (roleEl) roleEl.textContent = 'Super Admin';
    if (callback) callback(user);
  });
}

export async function logout() {
  await signOut(auth);
  window.location.href = 'index.html';
}

export function setActiveNav(page) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
}

export function showToast(message, type = 'success') {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  let toast = document.getElementById('globalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'globalToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

export function formatCurrency(amount) {
  return `SAR ${Number(amount).toLocaleString('en-SA', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  })}`;
}

export function formatDate(timestamp) {
  if (!timestamp) return '—';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

export const SIDEBAR_HTML = `
<aside class="sidebar">
  <div class="sidebar-logo">
    <div class="logo-icon">🛒</div>
    <div>
      <div class="logo-name"><span>Swift</span>Cart</div>
      <span class="logo-badge">Admin Panel</span>
    </div>
  </div>

  <nav>
    <div class="nav-section">
      <div class="nav-section-title">Main</div>
      <a href="dashboard.html"   class="nav-item" data-page="dashboard">
        <span class="nav-icon">📊</span> Dashboard
      </a>
    </div>

    <div class="nav-section">
      <div class="nav-section-title">Store</div>
      <a href="products.html"    class="nav-item" data-page="products">
        <span class="nav-icon">📦</span> Products
      </a>
      <a href="categories.html"  class="nav-item" data-page="categories">
        <span class="nav-icon">🏷️</span> Categories
      </a>
      <a href="banners.html"     class="nav-item" data-page="banners">
        <span class="nav-icon">🖼️</span> Banners
      </a>
    </div>

    <div class="nav-section">
      <div class="nav-section-title">Operations</div>
      <a href="orders.html"      class="nav-item" data-page="orders">
        <span class="nav-icon">🧾</span> Orders
        <span class="nav-badge" id="pendingBadge">0</span>
      </a>
      <a href="users.html"       class="nav-item" data-page="users">
        <span class="nav-icon">👥</span> Users
      </a>
    </div>
  </nav>

  <div class="sidebar-bottom">
    <div class="user-card">
      <div class="user-avatar">👤</div>
      <div class="user-info">
        <div class="user-name" id="sidebarUserName">Admin</div>
        <div class="user-role" id="sidebarUserRole">Super Admin</div>
      </div>
      <button class="logout-btn" id="logoutBtn" title="Logout">⏻</button>
    </div>
  </div>
</aside>`;