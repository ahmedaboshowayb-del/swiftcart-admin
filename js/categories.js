import { db } from './firebase-config.js';
import { requireAuth, setActiveNav, showToast,
         SIDEBAR_HTML, logout } from './auth.js';
import {
  collection, getDocs, addDoc, updateDoc,
  deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.getElementById('sidebarMount').innerHTML = SIDEBAR_HTML;
document.getElementById('logoutBtn').addEventListener('click', logout);

let allCats = [];
let editingId = null;

requireAuth(async () => {
  setActiveNav('categories');
  await loadCategories();
  setupListeners();
});

async function loadCategories() {
  const snap = await getDocs(collection(db, 'categories'));
  allCats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  allCats.sort((a, b) => a.name.localeCompare(b.name));
  renderCats();
}

function renderCats() {
  const tbody = document.getElementById('catsBody');
  if (!allCats.length) {
    tbody.innerHTML = `<tr><td colspan="6">
      <div class="empty-state">
        <div class="icon">🏷️</div>
        <h3>No Categories</h3>
      </div></td></tr>`;
    return;
  }

  tbody.innerHTML = allCats.map(c => `
    <tr>
      <td style="font-size:28px">${c.icon || '📁'}</td>
      <td style="font-weight:600">${c.name}</td>
      <td style="font-family:sans-serif" dir="rtl">${c.name_ar || '—'}</td>
      <td>
        <span style="background:rgba(255,107,53,0.12);color:var(--primary);
                     font-weight:700;padding:3px 10px;border-radius:20px;
                     font-size:12px">${c.product_count || 0}</span>
      </td>
      <td><span class="badge ${c.is_active ? 'badge-success' : 'badge-error'}">
        ${c.is_active ? 'Active' : 'Inactive'}</span></td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-sm btn-icon"
            onclick="editCat('${c.id}')">✏️</button>
          <button class="btn btn-danger btn-sm btn-icon"
            onclick="deleteCat('${c.id}','${c.name}')">🗑️</button>
        </div>
      </td>
    </tr>`).join('');
}

window.editCat = (id) => {
  const c = allCats.find(x => x.id === id);
  if (!c) return;
  editingId = id;
  document.getElementById('cf_name').value      = c.name || '';
  document.getElementById('cf_name_ar').value   = c.name_ar || '';
  document.getElementById('cf_icon').value      = c.icon || '';
  document.getElementById('cf_image_url').value = c.image_url || '';
  document.getElementById('catModalTitle').textContent = 'Edit Category';
  document.getElementById('catModal').classList.add('open');
};

window.deleteCat = async (id, name) => {
  if (!confirm(`Delete "${name}"?`)) return;
  await deleteDoc(doc(db, 'categories', id));
  allCats = allCats.filter(c => c.id !== id);
  renderCats();
  showToast('Category deleted', 'success');
};

async function saveCat() {
  const name = document.getElementById('cf_name').value.trim();
  const icon = document.getElementById('cf_icon').value.trim();
  if (!name || !icon) {
    showToast('Name and icon are required', 'error');
    return;
  }

  const data = {
    name,
    name_ar:    document.getElementById('cf_name_ar').value.trim(),
    icon,
    image_url:  document.getElementById('cf_image_url').value.trim(),
    is_active:  true,
    product_count: 0,
  };

  const btn = document.getElementById('saveCatBtn');
  btn.textContent = 'Saving…'; btn.disabled = true;

  try {
    if (editingId) {
      await updateDoc(doc(db, 'categories', editingId), data);
      showToast('Category updated ✓', 'success');
    } else {
      await addDoc(collection(db, 'categories'), data);
      showToast('Category added ✓', 'success');
    }
    document.getElementById('catModal').classList.remove('open');
    editingId = null;
    await loadCategories();
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  } finally {
    btn.textContent = 'Save'; btn.disabled = false;
  }
}

function setupListeners() {
  document.getElementById('addCatBtn').addEventListener('click', () => {
    editingId = null;
    ['cf_name','cf_name_ar','cf_icon','cf_image_url']
      .forEach(id => document.getElementById(id).value = '');
    document.getElementById('catModalTitle').textContent = 'Add Category';
    document.getElementById('catModal').classList.add('open');
  });
  document.getElementById('catModalClose').addEventListener('click', () =>
    document.getElementById('catModal').classList.remove('open'));
  document.getElementById('cancelCatBtn').addEventListener('click', () =>
    document.getElementById('catModal').classList.remove('open'));
  document.getElementById('saveCatBtn').addEventListener('click', saveCat);
  document.getElementById('catModal').addEventListener('click', e => {
    if (e.target.id === 'catModal')
      document.getElementById('catModal').classList.remove('open');
  });
}