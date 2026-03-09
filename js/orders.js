import { db } from './firebase-config.js';
import { requireAuth, setActiveNav, showToast,
         formatCurrency, formatDate, SIDEBAR_HTML, logout } from './auth.js';
import {
  collection, getDocs, updateDoc, doc,
  orderBy, query
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.getElementById('sidebarMount').innerHTML = SIDEBAR_HTML;
document.getElementById('logoutBtn').addEventListener('click', logout);

let allOrders = [];
let selectedOrderId = null;

requireAuth(async () => {
  setActiveNav('orders');
  await loadOrders();
  setupListeners();
});

async function loadOrders() {
  const snap = await getDocs(
    query(collection(db, 'orders'), orderBy('created_at', 'desc'))
  );
  allOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderOrders(allOrders);
}

const STATUS_BADGE = {
  preparing: 'badge-warning',
  on_the_way: 'badge-info',
  delivered: 'badge-success',
  cancelled: 'badge-error',
};
const STATUS_LABEL = {
  preparing: 'Preparing',
  on_the_way: 'On the Way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

function renderOrders(orders) {
  const tbody = document.getElementById('ordersBody');
  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="8">
      <div class="empty-state">
        <div class="icon">📭</div>
        <h3>No Orders Found</h3></div></td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(o => `
    <tr>
      <td><span style="font-family:monospace;font-size:12px;font-weight:700">
        #${o.id.substring(0,8).toUpperCase()}</span></td>
      <td style="font-size:12px;color:var(--text-muted)">
        ${o.user_id?.substring(0,10) || '—'}…</td>
      <td>${o.items?.length || 0} items</td>
      <td><strong style="color:var(--primary)">${formatCurrency(o.total)}</strong></td>
      <td style="font-size:12px">${o.payment_method || '—'}</td>
      <td><span class="badge ${STATUS_BADGE[o.status] || 'badge-muted'}">
        ${STATUS_LABEL[o.status] || o.status}</span></td>
      <td style="font-size:12px;color:var(--text-muted)">
        ${formatDate(o.created_at)}</td>
      <td>
        <button class="btn btn-outline btn-sm"
          onclick="viewOrder('${o.id}')">View</button>
      </td>
    </tr>`).join('');
}

window.viewOrder = (id) => {
  const o = allOrders.find(x => x.id === id);
  if (!o) return;
  selectedOrderId = id;

  const items = (o.items || []).map(item => `
    <div style="display:flex;justify-content:space-between;
                padding:8px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:13px">${item.product_name || '—'}</span>
      <span style="font-size:13px;color:var(--text-muted)">
        x${item.quantity} · ${formatCurrency(item.price)}</span>
    </div>`).join('');

  document.getElementById('orderDetailContent').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;
                gap:12px;margin-bottom:20px">
      <div style="background:var(--surface2);border-radius:10px;padding:14px">
        <div style="font-size:11px;color:var(--text-muted);
                    text-transform:uppercase;margin-bottom:4px">Order ID</div>
        <div style="font-family:monospace;font-weight:700">
          #${o.id.substring(0,8).toUpperCase()}</div>
      </div>
      <div style="background:var(--surface2);border-radius:10px;padding:14px">
        <div style="font-size:11px;color:var(--text-muted);
                    text-transform:uppercase;margin-bottom:4px">Date</div>
        <div style="font-weight:600">${formatDate(o.created_at)}</div>
      </div>
      <div style="background:var(--surface2);border-radius:10px;padding:14px">
        <div style="font-size:11px;color:var(--text-muted);
                    text-transform:uppercase;margin-bottom:4px">Total</div>
        <div style="font-weight:700;color:var(--primary);font-size:18px">
          ${formatCurrency(o.total)}</div>
      </div>
      <div style="background:var(--surface2);border-radius:10px;padding:14px">
        <div style="font-size:11px;color:var(--text-muted);
                    text-transform:uppercase;margin-bottom:4px">Payment</div>
        <div style="font-weight:600">${o.payment_method || '—'}</div>
      </div>
    </div>

    <div style="margin-bottom:16px">
      <div style="font-size:12px;color:var(--text-muted);
                  text-transform:uppercase;margin-bottom:8px">
        📍 Delivery Address</div>
      <div style="background:var(--surface2);border-radius:10px;padding:12px;
                  font-size:13px">${o.delivery_address || '—'}</div>
    </div>

    <div>
      <div style="font-size:12px;color:var(--text-muted);
                  text-transform:uppercase;margin-bottom:8px">
        📦 Items (${o.items?.length || 0})</div>
      ${items || '<p style="color:var(--text-muted)">No items</p>'}
    </div>

    <div style="display:flex;justify-content:space-between;
                margin-top:16px;padding-top:12px;border-top:1px solid var(--border)">
      <span style="color:var(--text-muted)">Subtotal</span>
      <span>${formatCurrency(o.subtotal)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:8px">
      <span style="color:var(--text-muted)">Delivery Fee</span>
      <span>${formatCurrency(o.delivery_fee)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:8px;
                font-weight:700;font-size:15px">
      <span>Total</span>
      <span style="color:var(--primary)">${formatCurrency(o.total)}</span>
    </div>`;

  document.getElementById('statusUpdateSelect').value = o.status || 'preparing';
  document.getElementById('orderModal').classList.add('open');
};

async function updateStatus() {
  if (!selectedOrderId) return;
  const newStatus = document.getElementById('statusUpdateSelect').value;
  const btn = document.getElementById('updateStatusBtn');
  btn.textContent = 'Updating…';
  btn.disabled = true;

  try {
    await updateDoc(doc(db, 'orders', selectedOrderId), { status: newStatus });
    const order = allOrders.find(o => o.id === selectedOrderId);
    if (order) order.status = newStatus;
    renderOrders(allOrders);
    showToast('Order status updated ✓', 'success');
    document.getElementById('orderModal').classList.remove('open');
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  } finally {
    btn.textContent = 'Update Status';
    btn.disabled = false;
  }
}

function filterOrders() {
  const q   = document.getElementById('searchInput').value.toLowerCase();
  const sta = document.getElementById('statusFilter').value;
  const filtered = allOrders.filter(o => {
    const matchQ   = !q || o.id.toLowerCase().includes(q);
    const matchSta = !sta || o.status === sta;
    return matchQ && matchSta;
  });
  renderOrders(filtered);
}

function setupListeners() {
  document.getElementById('modalClose')
    .addEventListener('click', () =>
      document.getElementById('orderModal').classList.remove('open'));
  document.getElementById('updateStatusBtn')
    .addEventListener('click', updateStatus);
  document.getElementById('searchInput')
    .addEventListener('input', filterOrders);
  document.getElementById('statusFilter')
    .addEventListener('change', filterOrders);
  document.getElementById('orderModal')
    .addEventListener('click', e => {
      if (e.target.id === 'orderModal')
        document.getElementById('orderModal').classList.remove('open');
    });
}