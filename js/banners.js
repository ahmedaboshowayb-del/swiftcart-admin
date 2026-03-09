import { db } from './firebase-config.js';
import { requireAuth, setActiveNav, showToast,
         SIDEBAR_HTML, logout } from './auth.js';
import {
  collection, getDocs, addDoc, updateDoc,
  deleteDoc, doc, orderBy, query
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.getElementById('sidebarMount').innerHTML = SIDEBAR_HTML;
document.getElementById('logoutBtn').addEventListener('click', logout);

let allBanners = [];
let editingId = null;

requireAuth(async () => {
  setActiveNav('banners');
  await loadBanners();
  setupListeners();
});

async function loadBanners() {
  const snap = await getDocs(
    query(collection(db, 'banners'), orderBy('order'))
  ).catch(() => getDocs(collection(db, 'banners')));

  allBanners = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderBannerCards();
  renderBannersTable();
}

const GRADIENTS = [
  'linear-gradient(135deg,#FF6B35,#E84E0F)',
  'linear-gradient(135deg,#5B8DEF,#3B6BD4)',
  'linear-gradient(135deg,#00C48C,#009E72)',
  'linear-gradient(135deg,#9B59B6,#7D3C98)',
];

function renderBannerCards() {
  const grid = document.getElementById('bannerGrid');
  grid.innerHTML = allBanners.map((b, i) => `
    <div style="border-radius:16px;overflow:hidden;position:relative;
                height:160px;background:${GRADIENTS[i % GRADIENTS.length]};
                cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,0.3)">
      ${b.image_url
        ? `<img src="${b.image_url}" style="position:absolute;inset:0;
             width:100%;height:100%;object-fit:cover;opacity:0.35"/>`
        : ''}
      <div style="position:absolute;inset:0;padding:20px;
                  display:flex;flex-direction:column;justify-content:flex-end">
        <span style="font-size:11px;font-weight:700;letter-spacing:1px;
                     color:rgba(255,255,255,0.8);text-transform:uppercase">
          ${b.action ? `🏷️ ${b.action}` : '🎯 General'}</span>
        <div style="font-size:20px;font-weight:800;color:#fff;
                    line-height:1.2;margin-top:4px">${b.title}</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:4px">
          ${b.subtitle || ''}</div>
      </div>
      <div style="position:absolute;top:12px;right:12px;
                  background:rgba(0,0,0,0.4);border-radius:20px;
                  padding:3px 10px;font-size:11px;color:#fff;font-weight:600">
        #${b.order || i+1}</div>
    </div>`).join('');
}

function renderBannersTable() {
  const tbody = document.getElementById('bannersBody');
  if (!allBanners.length) {
    tbody.innerHTML = `<tr><td colspan="6">
      <div class="empty-state">
        <div class="icon">🖼️</div>
        <h3>No Banners</h3>
      </div></td></tr>`;
    return;
  }

  tbody.innerHTML = allBanners.map(b => `
    <tr>
      <td>
        <div style="width:80px;height:44px;border-radius:8px;overflow:hidden;
                    background:var(--surface2)">
          ${b.image_url
            ? `<img src="${b.image_url}"
                 style="width:100%;height:100%;object-fit:cover"
                 onerror="this.style.display='none'"/>`
            : '<div style="width:100%;height:100%;display:flex;align-items:center;'
              + 'justify-content:center;font-size:20px">🖼️</div>'}
        </div>
      </td>
      <td style="font-weight:600">${b.title}</td>
      <td style="color:var(--text-muted);font-size:12px">${b.subtitle || '—'}</td>
      <td><span style="font-weight:700;color:var(--primary)">${b.order || '—'}</span></td>
      <td><span class="badge ${b.is_active ? 'badge-success' : 'badge-error'}">
        ${b.is_active ? 'Active' : 'Inactive'}</span></td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-sm btn-icon"
            onclick="editBanner('${b.id}')">✏️</button>
          <button class="btn btn-danger btn-sm btn-icon"
            onclick="deleteBanner('${b.id}','${b.title.replace(/'/g,"\\'")}')">🗑️</button>
        </div>
      </td>
    </tr>`).join('');
}

window.editBanner = (id) => {
  const b = allBanners.find(x => x.id === id);
  if (!b) return;
  editingId = id;
  document.getElementById('bf_title').value     = b.title || '';
  document.getElementById('bf_subtitle').value  = b.subtitle || '';
  document.getElementById('bf_image_url').value = b.image_url || '';
  document.getElementById('bf_action').value    = b.action || '';
  document.getElementById('bf_order').value     = b.order || '';
  document.getElementById('bannerModalTitle').textContent = 'Edit Banner';
  document.getElementById('bannerModal').classList.add('open');
};

window.deleteBanner = async (id, title) => {
  if (!confirm(`Delete banner "${title}"?`)) return;
  await deleteDoc(doc(db, 'banners', id));
  allBanners = allBanners.filter(b => b.id !== id);
  renderBannerCards();
  renderBannersTable();
  showToast('Banner deleted', 'success');
};

async function saveBanner() {
  const title = document.getElementById('bf_title').value.trim();
  if (!title) { showToast('Title is required', 'error'); return; }

  const data = {
    title,
    subtitle:  document.getElementById('bf_subtitle').value.trim(),
    image_url: document.getElementById('bf_image_url').value.trim(),
    action:    document.getElementById('bf_action').value.trim() || null,
    order:     parseInt(document.getElementById('bf_order').value) || 1,
    is_active: true,
  };

  const btn = document.getElementById('saveBannerBtn');
  btn.textContent = 'Saving…'; btn.disabled = true;

  try {
    if (editingId) {
      await updateDoc(doc(db, 'banners', editingId), data);
      showToast('Banner updated ✓', 'success');
    } else {
      await addDoc(collection(db, 'banners'), data);
      showToast('Banner added ✓', 'success');
    }
    document.getElementById('bannerModal').classList.remove('open');
    editingId = null;
    await loadBanners();
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  } finally {
    btn.textContent = 'Save Banner'; btn.disabled = false;
  }
}

function setupListeners() {
  document.getElementById('addBannerBtn').addEventListener('click', () => {
    editingId = null;
    ['bf_title','bf_subtitle','bf_image_url','bf_action','bf_order']
      .forEach(id => document.getElementById(id).value = '');
    document.getElementById('bannerModalTitle').textContent = 'Add Banner';
    document.getElementById('bannerModal').classList.add('open');
  });
  document.getElementById('bannerModalClose').addEventListener('click', () =>
    document.getElementById('bannerModal').classList.remove('open'));
  document.getElementById('cancelBannerBtn').addEventListener('click', () =>
    document.getElementById('bannerModal').classList.remove('open'));
  document.getElementById('saveBannerBtn').addEventListener('click', saveBanner);
  document.getElementById('bannerModal').addEventListener('click', e => {
    if (e.target.id === 'bannerModal')
      document.getElementById('bannerModal').classList.remove('open');
  });
}