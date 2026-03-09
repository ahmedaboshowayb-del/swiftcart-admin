import { db } from './firebase-config.js';
import { requireAuth, setActiveNav, formatCurrency,
         formatDate, SIDEBAR_HTML, logout } from './auth.js';
import {
  collection, getDocs, query,
  orderBy, limit, where, Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.getElementById('sidebarMount').innerHTML = SIDEBAR_HTML;
document.getElementById('logoutBtn')
  .addEventListener('click', logout);

document.getElementById('dateLabel').textContent =
  new Date().toLocaleDateString('en-GB', {
    weekday:'long', year:'numeric', month:'long', day:'numeric'
  });

requireAuth(async () => {
  setActiveNav('dashboard');
  await Promise.all([
    loadStats(),
    loadRecentOrders(),
    loadTopProducts(),
  ]);
  loadCharts();
});

async function loadStats() {
  const [ordersSnap, usersSnap, productsSnap] = await Promise.all([
    getDocs(collection(db, 'orders')),
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'products')),
  ]);

  let revenue = 0;
  ordersSnap.forEach(doc => {
    const d = doc.data();
    if (d.status !== 'cancelled') revenue += d.total || 0;
  });

  document.getElementById('totalRevenue').textContent   = formatCurrency(revenue);
  document.getElementById('totalOrders').textContent    = ordersSnap.size;
  document.getElementById('totalUsers').textContent     = usersSnap.size;
  document.getElementById('totalProducts').textContent  = productsSnap.size;
  document.getElementById('revenueChange').textContent  =
    `↑ SAR ${(revenue / Math.max(ordersSnap.size,1)).toFixed(0)} avg`;
  document.getElementById('ordersChange').textContent   =
    `${ordersSnap.size} total orders`;

  let pending = 0;
  ordersSnap.forEach(doc => {
    if (doc.data().status === 'preparing') pending++;
  });
  const badge = document.getElementById('pendingBadge');
  if (badge) badge.textContent = pending;
}

async function loadRecentOrders() {
  const snap = await getDocs(
    query(collection(db, 'orders'), orderBy('created_at', 'desc'), limit(6))
  );

  const tbody = document.getElementById('recentOrdersBody');
  if (snap.empty) {
    tbody.innerHTML = `<tr><td colspan="4">
      <div class="empty-state"><div class="icon">📭</div>No orders yet</div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = snap.docs.map(doc => {
    const d = doc.data();
    const statusMap = {
      preparing: 'warning', on_the_way: 'info',
      delivered: 'success', cancelled: 'error'
    };
    const badgeClass = statusMap[d.status] || 'muted';
    return `
      <tr>
        <td><span style="font-family:monospace;font-size:12px">
          #${doc.id.substring(0,8).toUpperCase()}</span></td>
        <td><strong>${formatCurrency(d.total)}</strong></td>
        <td><span class="badge badge-${badgeClass}">${d.status || '—'}</span></td>
        <td style="color:var(--text-muted)">${formatDate(d.created_at)}</td>
      </tr>`;
  }).join('');
}

async function loadTopProducts() {
  const snap = await getDocs(
    query(collection(db, 'products'),
      orderBy('review_count', 'desc'), limit(5))
  );

  const el = document.getElementById('topProductsList');
  if (snap.empty) {
    el.innerHTML = `<div class="empty-state"><div class="icon">📦</div>No products</div>`;
    return;
  }

  el.innerHTML = snap.docs.map((doc, i) => {
    const d = doc.data();
    return `
      <div style="display:flex;align-items:center;gap:12px;
                  padding:10px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:18px;font-weight:800;color:var(--primary);
                     width:22px;text-align:center">${i+1}</span>
        <img src="${d.images?.[0]||''}" class="thumb"
             onerror="this.src='';this.style.background='var(--surface3)'"/>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;
                      white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${d.name}</div>
          <div style="font-size:11px;color:var(--text-muted)">
            ⭐ ${d.rating} · ${d.review_count} reviews</div>
        </div>
        <div style="font-size:13px;font-weight:700;color:var(--primary);
                    white-space:nowrap">
          ${formatCurrency(d.discount_price || d.price)}</div>
      </div>`;
  }).join('');
}

async function loadCharts() {
  const snap = await getDocs(collection(db, 'orders'));
  const orders = snap.docs.map(d => ({ ...d.data(), id: d.id }));

  const days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const dayLabels = days.map(d => d.toLocaleDateString('en', {
    weekday: 'short'
  }));
  const dayRevenue = days.map(day => {
    const start = new Date(day); start.setHours(0,0,0,0);
    const end   = new Date(day); end.setHours(23,59,59,999);
    return orders
      .filter(o => {
        const t = o.created_at?.toDate?.() || new Date(o.created_at);
        return t >= start && t <= end && o.status !== 'cancelled';
      })
      .reduce((sum, o) => sum + (o.total || 0), 0);
  });

  const statusCount = { preparing: 0, on_the_way: 0, delivered: 0, cancelled: 0 };
  orders.forEach(o => {
    if (statusCount.hasOwnProperty(o.status)) statusCount[o.status]++;
  });

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#8888A0', font: { family: 'Poppins' } } } },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8888A0' } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8888A0' } }
    }
  };

new Chart(document.getElementById('revenueChart'), {
  type: 'bar',
  data: {
    labels: dayLabels,
    datasets: [{
      label: 'Revenue (SAR)',
      data: dayRevenue,
      backgroundColor: 'rgba(255,107,53,0.7)',
      borderColor: '#FF6B35',
      borderWidth: 2,
      borderRadius: 8,
      borderSkipped: false,
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8888A0' } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8888A0' } }
    }
  }
});

new Chart(document.getElementById('statusChart'), {
  type: 'doughnut',
  data: {
    labels: ['Preparing', 'On the Way', 'Delivered', 'Cancelled'],
    datasets: [{
      data: [
        statusCount.preparing   || 1,
        statusCount.on_the_way  || 1,
        statusCount.delivered   || 1,
        statusCount.cancelled   || 1,
      ],
      backgroundColor: ['#FFB800','#5B8DEF','#00C48C','#FF4560'],
      borderColor: '#13131C',
      borderWidth: 3,
      hoverOffset: 8,
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#8888A0',
          padding: 16,
          font: { family: 'Poppins', size: 12 }
        }
      }
    }
  }
});
}