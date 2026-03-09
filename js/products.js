import { db } from './firebase-config.js';
import { requireAuth, setActiveNav, showToast,
         formatCurrency, SIDEBAR_HTML, logout } from './auth.js';
import {
  collection, getDocs, addDoc, updateDoc,
  deleteDoc, doc, Timestamp, orderBy, query
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.getElementById('sidebarMount').innerHTML = SIDEBAR_HTML;
document.getElementById('logoutBtn').addEventListener('click', logout);

let allProducts = [];
let allCategories = [];
let editingId = null;

requireAuth(async () => {
  setActiveNav('products');
  await Promise.all([loadCategories(), loadProducts()]);
  setupListeners();
});

async function loadProducts() {
  const snap = await getDocs(
    query(collection(db, 'products'), orderBy('name'))
  );
  allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderProducts(allProducts);
}

async function loadCategories() {
  const snap = await getDocs(collection(db, 'categories'));
  allCategories = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const opts = allCategories.map(c =>
    `<option value="${c.id}">${c.name}</option>`
  ).join('');
  document.getElementById('categoryFilter').innerHTML +=  opts;
  document.getElementById('f_category').innerHTML +=  opts;
}

function renderProducts(products) {
  const tbody = document.getElementById('productsBody');
  if (!products.length) {
    tbody.innerHTML = `<tr><td colspan="7">
      <div class="empty-state">
        <div class="icon">📦</div>
        <h3>No Products Found</h3>
        <p>Add your first product or adjust filters</p>
      </div></td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:12px">
          <img src="${p.images?.[0]||''}" class="thumb"
               onerror="this.style.background='var(--surface3)'"/>
          <div>
            <div style="font-weight:600;font-size:13.5px">${p.name}</div>
            <div style="font-size:11px;color:var(--text-muted)">${p.brand || '—'}</div>
          </div>
        </div>
      </td>
      <td>${p.category_name || '—'}</td>
      <td>
        <div style="font-weight:700;color:var(--primary)">
          ${formatCurrency(p.discount_price || p.price)}</div>
        ${p.discount_price
          ? `<div style="font-size:11px;color:var(--text-muted);text-decoration:line-through">
               ${formatCurrency(p.price)}</div>`
          : ''}
      </td>
      <td>
        <span style="font-weight:600;color:${p.stock > 0
          ? 'var(--success)' : 'var(--error)'}">
          ${p.stock ?? '—'}
        </span>
      </td>
      <td>
        <span style="color:var(--warning)">★</span>
        <span style="font-size:13px;font-weight:600">${p.rating || 0}</span>
        <span style="font-size:11px;color:var(--text-muted)">
          (${p.review_count || 0})</span>
      </td>
      <td>
        <span class="badge ${p.is_active !== false
          ? 'badge-success' : 'badge-error'}">
          ${p.is_active !== false ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-sm btn-icon"
            onclick="editProduct('${p.id}')" title="Edit">✏️</button>
          <button class="btn btn-danger btn-sm btn-icon"
            onclick="deleteProduct('${p.id}','${p.name.replace(/'/g,"\\'")}')
            " title="Delete">🗑️</button>
        </div>
      </td>
    </tr>`).join('');
}

function filterProducts() {
  const q   = document.getElementById('searchInput').value.toLowerCase();
  const cat = document.getElementById('categoryFilter').value;
  const sta = document.getElementById('statusFilter').value;

  const filtered = allProducts.filter(p => {
    const matchQ   = !q || p.name.toLowerCase().includes(q) ||
                     (p.brand || '').toLowerCase().includes(q);
    const matchCat = !cat || p.category_id === cat;
    const matchSta = !sta ||
      (sta === 'active' ? p.is_active !== false : p.is_active === false);
    return matchQ && matchCat && matchSta;
  });
  renderProducts(filtered);
}

function openModal(title) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('productModal').classList.add('open');
}
function closeModal() {
  document.getElementById('productModal').classList.remove('open');
  editingId = null;
  clearForm();
}
function clearForm() {
  ['f_name','f_brand','f_description','f_price','f_discount_price',
   'f_stock','f_image','f_rating','f_review_count'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('f_category').value = '';
  document.getElementById('f_is_featured').checked = false;
  document.getElementById('f_is_new').checked = false;
}

window.editProduct = (id) => {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  editingId = id;

  document.getElementById('f_name').value          = p.name || '';
  document.getElementById('f_brand').value         = p.brand || '';
  document.getElementById('f_description').value   = p.description || '';
  document.getElementById('f_price').value         = p.price || '';
  document.getElementById('f_discount_price').value= p.discount_price || '';
  document.getElementById('f_stock').value         = p.stock || '';
  document.getElementById('f_category').value      = p.category_id || '';
  document.getElementById('f_image').value         = p.images?.[0] || '';
  document.getElementById('f_rating').value        = p.rating || '';
  document.getElementById('f_review_count').value  = p.review_count || '';
  document.getElementById('f_is_featured').checked = p.is_featured || false;
  document.getElementById('f_is_new').checked      = p.is_new || false;

  openModal('Edit Product');
};

window.deleteProduct = async (id, name) => {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  await deleteDoc(doc(db, 'products', id));
  allProducts = allProducts.filter(p => p.id !== id);
  renderProducts(allProducts);
  showToast('Product deleted', 'success');
};

async function saveProduct() {
  const name  = document.getElementById('f_name').value.trim();
  const price = parseFloat(document.getElementById('f_price').value);
  const stock = parseInt(document.getElementById('f_stock').value);
  const catId = document.getElementById('f_category').value;

  if (!name || isNaN(price) || isNaN(stock) || !catId) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  const cat = allCategories.find(c => c.id === catId);
  const discountRaw = document.getElementById('f_discount_price').value;
  const imageUrl  = document.getElementById('f_image').value.trim();

  const data = {
    name,
    brand:          document.getElementById('f_brand').value.trim(),
    description:    document.getElementById('f_description').value.trim(),
    price,
    discount_price: discountRaw ? parseFloat(discountRaw) : null,
    stock,
    category_id:    catId,
    category_name:  cat?.name || '',
    images:         imageUrl ? [imageUrl] : [],
    rating:         parseFloat(document.getElementById('f_rating').value) || 0,
    review_count:   parseInt(document.getElementById('f_review_count').value) || 0,
    is_featured:    document.getElementById('f_is_featured').checked,
    is_new:         document.getElementById('f_is_new').checked,
    is_active:      true,
    tags:           [name.toLowerCase(), cat?.name?.toLowerCase() || ''],
  };

  const btn = document.getElementById('saveProductBtn');
  btn.textContent = 'Saving…';
  btn.disabled = true;

  try {
    if (editingId) {
      await updateDoc(doc(db, 'products', editingId), data);
      showToast('Product updated ✓', 'success');
    } else {
      data.created_at = Timestamp.now();
      await addDoc(collection(db, 'products'), data);
      showToast('Product added ✓', 'success');
    }
    closeModal();
    await loadProducts();
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  } finally {
    btn.textContent = 'Save Product';
    btn.disabled = false;
  }
}

function setupListeners() {
  document.getElementById('addProductBtn')
    .addEventListener('click', () => openModal('Add Product'));
  document.getElementById('modalClose')
    .addEventListener('click', closeModal);
  document.getElementById('cancelModalBtn')
    .addEventListener('click', closeModal);
  document.getElementById('saveProductBtn')
    .addEventListener('click', saveProduct);
  document.getElementById('searchInput')
    .addEventListener('input', filterProducts);
  document.getElementById('categoryFilter')
    .addEventListener('change', filterProducts);
  document.getElementById('statusFilter')
    .addEventListener('change', filterProducts);

  document.getElementById('productModal')
    .addEventListener('click', e => {
      if (e.target.id === 'productModal') closeModal();
    });
}