import { db } from './firebase-config.js';
import { requireAuth, setActiveNav, formatDate,
         SIDEBAR_HTML, logout } from './auth.js';
import {
  collection, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.getElementById('sidebarMount').innerHTML = SIDEBAR_HTML;
document.getElementById('logoutBtn').addEventListener('click', logout);

let allUsers = [];
let orderCountMap = {};

requireAuth(async () => {
  setActiveNav('users');
  await Promise.all([loadUsers(), loadOrderCounts()]);
});

async function loadOrderCounts() {
  const snap = await getDocs(collection(db, 'orders'));
  snap.forEach(doc => {
    const uid = doc.data().user_id;
    orderCountMap[uid] = (orderCountMap[uid] || 0) + 1;
  });
}

async function loadUsers() {
  const snap = await getDocs(
    query(collection(db, 'users'), orderBy('created_at', 'desc'))
  ).catch(() => getDocs(collection(db, 'users')));

  allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderUsers(allUsers);
}

function renderUsers(users) {
  const tbody = document.getElementById('usersBody');
  if (!users.length) {
    tbody.innerHTML = `<tr><td colspan="5">
      <div class="empty-state">
        <div class="icon">👥</div>
        <h3>No Users Found</h3>
      </div></td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => {
    const initials = (u.full_name || u.name || u.email || 'U')
      .substring(0, 2).toUpperCase();
    const orders = orderCountMap[u.id] || 0;
    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:38px;height:38px;border-radius:10px;
                        background:linear-gradient(135deg,var(--primary),var(--primary-dark));
                        display:flex;align-items:center;justify-content:center;
                        font-size:14px;font-weight:700;flex-shrink:0">
              ${initials}</div>
            <div>
              <div style="font-weight:600;font-size:13.5px">
                ${u.full_name || u.name || '—'}</div>
              <div style="font-size:11px;color:var(--text-muted)">
                ID: ${u.id.substring(0,10)}…</div>
            </div>
          </div>
        </td>
        <td style="font-size:13px;color:var(--text-muted)">${u.email || '—'}</td>
        <td style="font-size:13px;color:var(--text-muted)">${u.phone || '—'}</td>
        <td style="font-size:12px;color:var(--text-muted)">
          ${formatDate(u.created_at)}</td>
        <td>
          <span style="background:rgba(255,107,53,0.12);color:var(--primary);
                       font-weight:700;padding:4px 10px;border-radius:20px;
                       font-size:12px">${orders}</span>
        </td>
      </tr>`;
  }).join('');
}

document.getElementById('searchInput').addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  renderUsers(allUsers.filter(u =>
    (u.full_name || u.name || '').toLowerCase().includes(q) ||
    (u.email || '').toLowerCase().includes(q)
  ));
});