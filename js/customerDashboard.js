// 获取当前登录用户
const token = localStorage.getItem('token');
const userId = localStorage.getItem('userId');
const userName = localStorage.getItem('userName');

// 检查token函数
function checkToken() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const userId = localStorage.getItem('userId');
  const userName = localStorage.getItem('userName') || 'User Name';
  if (!token || !['customer'].includes(role)) {
    window.location.href = 'login.html';
    return;
  }
}

// 登出函数
function logout() {
  localStorage.removeItem('token'); // or sessionStorage.removeItem('token');
  window.location.href = 'login.html';
}

// Case submission modal logic
document.addEventListener('DOMContentLoaded', function() {
  checkToken();
  // 统一封装带 Token 的请求
  window.authFetch = async function(url, options = {}) {
    const t = localStorage.getItem('token');
    const hdrs = Object.assign({}, options.headers || {});
    if (t) hdrs['Authorization'] = `Bearer ${t}`;
    const next = Object.assign({}, options, { headers: hdrs });
    const res = await fetch(url, next);
    if (res.status === 401 || res.status === 403) {
      try { localStorage.removeItem('token'); } catch {}
      window.location.href = 'login.html';
      throw new Error('Unauthorized');
    }
    return res;
  };
  // Set user info
  const userName = localStorage.getItem('userName') || 'User Name';
  document.getElementById('userName').textContent = userName;
  // Set sidebar avatar initial from user name first letter
  const avatarEl = document.getElementById('avatar');
  if (avatarEl) {
    const initial = userName && userName.trim().length ? userName.trim()[0].toUpperCase() : 'U';
    avatarEl.textContent = initial;
  }
  // Hide role for customer
  const userRoleEl = document.getElementById('userRole');
  if (userRoleEl) userRoleEl.style.display = 'none';
  // Init notifications (customer)
  initNotifications('customer');
  // Render sidebar and default content
  renderSidebar('customer');
  renderMainContent('customer-dashboard');
  const openBtn = document.getElementById('openCaseModalBtn');
  console.log('openBtn:', openBtn);
  if (openBtn) {
    openBtn.addEventListener('click', function() {
      console.log('New Case button clicked');
      const caseForm = document.getElementById('caseForm');
      if (caseForm) caseForm.reset();
      const feedback = document.getElementById('case-feedback');
      if (feedback) feedback.style.display = 'none';
      loadServices();
      const modalEl = document.getElementById('caseModal');
      console.log('caseModal:', modalEl);
      if (modalEl) {
        new bootstrap.Modal(modalEl).show();
      } else {
        console.error('caseModal not found');
      }
    });
  } else {
    console.error('openCaseModalBtn not found');
  }
  // Case form submit
  const caseForm = document.getElementById('caseForm');
  if (caseForm) {
    caseForm.onsubmit = async function(e) {
      e.preventDefault();
      const description = document.getElementById('caseDesc').value.trim();
      const type = document.getElementById('caseType').value;
      const item_id = document.getElementById('caseService').value;
      const customer_id = localStorage.getItem('userId');
      const feedback = document.getElementById('case-feedback');
      try {
        console.log('Submitting case:', { description, type, item_id, customer_id });
        const res = await authFetch('/cases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description, type, item_id, customer_id })
        });
        console.log('Response status:', res.status);
        const data = await res.json();
        console.log('Response data:', data);
        if (data.success) {
          feedback.textContent = 'Case drafted successfully!';
          feedback.style.display = 'block';
          feedback.classList.remove('text-danger');
          feedback.classList.add('text-success');
          if (caseForm) caseForm.reset();
          // Refresh dashboard after drafting
          renderMainContent('customer-dashboard');
        } else {
          feedback.textContent = data.message || 'Failed to draft case.';
          feedback.style.display = 'block';
          feedback.classList.remove('text-success');
          feedback.classList.add('text-danger');
        }
      } catch (error) {
        console.error('Error submitting case:', error);
        feedback.textContent = 'Network error. Please try again.';
        feedback.style.display = 'block';
        feedback.classList.remove('text-success');
        feedback.classList.add('text-danger');
      }
    };
  }
});

// Load services into select from Item table
async function loadServices() {
  const sel = document.getElementById('caseService');
  if (!sel) return;
  sel.innerHTML = `<option value="">Loading...</option>`;
  try {
    const res = await authFetch('/items');
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      sel.innerHTML = `<option value="">Select a service</option>` + data.data.map(it => {
        const price = (it.price != null) ? Number(it.price).toFixed(2) : '0.00';
        return `<option value="${it.item_id}">${it.item_name} - $${price}</option>`;
      }).join('');
    } else {
      sel.innerHTML = `<option value="">Failed to load</option>`;
    }
  } catch (e) {
    sel.innerHTML = `<option value="">Failed to load</option>`;
  }
}

// Render sidebar for customer
function renderSidebar(role) {
  const sidebarNav = document.getElementById('sidebarNav');
  if (role === 'customer') {
    sidebarNav.innerHTML = `
      <a class="nav-link" href="#" id="nav-dashboard"><i class="fa-solid fa-table-columns"></i> Dashboard</a>
      <a class="nav-link" href="#" id="nav-case"><i class="fa-solid fa-briefcase"></i> Case</a>
      <a class="nav-link" href="#" id="nav-profile"><i class="fa-solid fa-user"></i> Profile</a>
    `;
    document.getElementById('nav-dashboard').onclick = () => renderMainContent('customer-dashboard');
    document.getElementById('nav-case').onclick = () => renderMainContent('customer-case');
    document.getElementById('nav-profile').onclick = () => renderMainContent('customer-profile');
  }
}

// Render main content
function renderMainContent(section) {
  const main = document.querySelector('.main-content');
  // Clear content except header and modal
  main.querySelectorAll('.dashboard-header ~ *:not(script):not(.modal)').forEach(e => e.remove());
  if (section === 'customer-dashboard') {
    renderCustomerDashboard();
  } else if (section === 'customer-case') {
    renderCustomerCase();
  } else if (section === 'customer-profile') {
    renderCustomerProfile();
  }
}

// --------------- Notifications (Customer) ---------------
function initNotifications(role) {
  const badge = document.getElementById('notifBadge');
  const menu = document.getElementById('notifMenu');
  const btn = document.getElementById('notifBtn');
  if (!badge || !menu || !btn) return; // header not present

  const userId = localStorage.getItem('userId');
  const storageKey = `notifState:${role}:${userId}`;
  let prevMap = {};
  try {
    const raw = localStorage.getItem(storageKey);
    prevMap = raw ? JSON.parse(raw) : {};
  } catch { prevMap = {}; }

  let items = [];

  function savePrev() {
    try { localStorage.setItem(storageKey, JSON.stringify(prevMap)); } catch {}
  }

  function setBadge(count) {
    if (count > 0) {
      badge.textContent = String(count);
      badge.classList.remove('d-none');
    } else {
      badge.classList.add('d-none');
    }
  }

  function renderMenu() {
    if (!items.length) {
      menu.innerHTML = '<li class="text-muted small px-2">No notifications</li>';
      return;
    }
    const safe = items
      .slice(-20)
      .reverse()
      .map(n => {
        const ts = new Date(n.ts).toLocaleString();
        const href = `caseDetail.html?id=${encodeURIComponent(n.case_id)}`;
        return `<li><a class="dropdown-item small" href="${href}" target="_blank" rel="noopener noreferrer"><b>#${n.case_id}</b> - ${n.msg}<br><span class="text-muted">${ts}</span></a></li>`;
      }).join('');
    menu.innerHTML = safe;
  }

  function statusVerb(status) {
    switch (status) {
      case 'ASSIGNED': return 'was assigned';
      case 'IN_PROGRESS': return 'is in progress';
      case 'COMPLETE': return 'was completed';
      case 'CANCELED': return 'was canceled';
      case 'PAID': return 'was paid';
      default: return `updated to ${status}`;
    }
  }

  async function fetchRelevantCases() {
    // Customer: fetch all and filter by my id (reuse existing endpoint style)
    const res = await authFetch('/cases');
    const data = await res.json();
    const myId = localStorage.getItem('userId');
    if (data.success && Array.isArray(data.data)) {
      return data.data.filter(c => String(c.customer_id) === String(myId));
    }
    return [];
  }

  async function check() {
    try {
      const cases = await fetchRelevantCases();
      let newCount = 0;
      for (const c of cases) {
        const cid = String(c.case_id);
        const prev = prevMap[cid]?.status;
        if (!prev) {
          // seed without notifying
          prevMap[cid] = { status: c.status };
          continue;
        }
        if (prev !== c.status) {
          // Create notification for status changes (ignore DRAFT -> DRAFT)
          if (c.status && c.status !== 'DRAFT') {
            items.push({ case_id: cid, status: c.status, ts: Date.now(), msg: statusVerb(c.status) });
            newCount++;
          }
          prevMap[cid] = { status: c.status };
        }
      }
      if (newCount > 0) {
        setBadge((parseInt(badge.textContent || '0', 10) || 0) + newCount);
        renderMenu();
        savePrev();
      } else {
        // still save map to capture new cases without alerts
        savePrev();
      }
    } catch (e) {
      // swallow errors for polling
    }
  }

  // Mark as read when dropdown opens
  btn.addEventListener('show.bs.dropdown', () => {
    setBadge(0);
  });

  // Initial seed and menu build
  (async () => {
    try {
      const cases = await fetchRelevantCases();
      for (const c of cases) {
        const cid = String(c.case_id);
        if (!prevMap[cid]) prevMap[cid] = { status: c.status };
      }
      savePrev();
      renderMenu();
    } catch {}
  })();

  // Poll every 20s
  setInterval(check, 20000);
}

// Render customer dashboard
async function renderCustomerDashboard() {
  const main = document.querySelector('.main-content');
  main.insertAdjacentHTML('beforeend', `<div class="container py-4"><h4>Customer Dashboard</h4><div id="customer-dashboard-content"></div></div>`);
  const container = document.getElementById('customer-dashboard-content');
  // Fetch cases for the customer
  const customerId = localStorage.getItem('userId');
  const res = await authFetch('/cases');
  const data = await res.json();
  let drafted = 0, active = 0, completed = 0, canceled = 0, paid = 0;
  if (data.success && Array.isArray(data.data)) {
    data.data.forEach(c => {
      if (c.customer_id == customerId) {
        if (c.status === 'DRAFT') drafted++;
        else if (c.status === 'ASSIGNED' || c.status === 'IN_PROGRESS') active++;
        else if (c.status === 'COMPLETE') completed++;
        else if (c.status === 'CANCELED') canceled++;
        else if (c.status === 'PAID') paid++;
      }
    });
  }
  container.innerHTML = `
    <div class="row g-3 mb-4">
      <div class="col-md-3"><div class="card p-3"><b><i class="fa-regular fa-file-lines me-2 text-warning"></i>Drafted Cases</b><div class="fs-3">${drafted}</div></div></div>
      <div class="col-md-3"><div class="card p-3"><b><i class="fa-solid fa-bolt me-2 text-info"></i>Active Cases</b><div class="fs-3">${active}</div></div></div>
      <div class="col-md-3"><div class="card p-3"><b><i class="fa-regular fa-circle-check me-2 text-success"></i>Completed Cases</b><div class="fs-3">${completed}</div></div></div>
      <div class="col-md-3"><div class="card p-3"><b><i class="fa-regular fa-circle-xmark me-2 text-danger"></i>Canceled Cases</b><div class="fs-3">${canceled}</div></div></div>
    </div>
    <div class="row g-3 mb-4">
      <div class="col-md-3"><div class="card p-3"><b><i class="fa-solid fa-credit-card me-2 text-dark"></i>Paid Cases</b><div class="fs-3">${paid}</div></div></div>
    </div>
  `;
}

// Render customer case
async function renderCustomerCase() {
  const main = document.querySelector('.main-content');
  main.insertAdjacentHTML('beforeend', `<div class="container py-4"><h4>My Cases</h4><div id="customer-case-content"></div></div>`);
  const container = document.getElementById('customer-case-content');
  container.innerHTML = `
    <div class="mb-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
      <div class="btn-group" role="group" aria-label="Customer Case Filter">
        <button class="btn btn-outline-warning" id="btn-drafted"><i class="fa-regular fa-file-lines me-1"></i> Drafted Cases</button>
        <button class="btn btn-outline-info" id="btn-active"><i class="fa-solid fa-bolt me-1"></i> Active Cases</button>
        <button class="btn btn-outline-success" id="btn-completed"><i class="fa-regular fa-circle-check me-1"></i> Completed Cases</button>
        <button class="btn btn-outline-danger" id="btn-canceled"><i class="fa-regular fa-circle-xmark me-1"></i> Canceled Cases</button>
        <button class="btn btn-outline-dark" id="btn-paid"><i class="fa-solid fa-credit-card me-1"></i> Paid Cases</button>
      </div>
      <div class="ms-auto">
        <input id="customer-case-search" class="form-control form-control-sm" style="min-width:220px" placeholder="Search my cases..." />
      </div>
    </div>
    <table class="table table-hover"><thead><tr><th>ID</th><th>Description</th><th>Status</th><th>Type</th><th>Priority</th><th>Service</th><th>Date</th><th>Action</th></tr></thead><tbody id="customer-case-tbody"></tbody></table>
  `;
  let currentFilter = 'drafted';
  
  function setActiveFilterBtn(activeId) {
    const filterButtons = ['btn-drafted', 'btn-active', 'btn-completed', 'btn-canceled', 'btn-paid'];
    filterButtons.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        if (id === activeId) {
          // Make active button solid with its hover color
          if (id === 'btn-drafted') btn.className = 'btn btn-warning';
          else if (id === 'btn-active') btn.className = 'btn btn-info';
          else if (id === 'btn-completed') btn.className = 'btn btn-success';
          else if (id === 'btn-canceled') btn.className = 'btn btn-danger';
          else if (id === 'btn-paid') btn.className = 'btn btn-dark';
        } else {
          // Make inactive buttons outline
          if (id === 'btn-drafted') btn.className = 'btn btn-outline-warning';
          else if (id === 'btn-active') btn.className = 'btn btn-outline-info';
          else if (id === 'btn-completed') btn.className = 'btn btn-outline-success';
          else if (id === 'btn-canceled') btn.className = 'btn btn-outline-danger';
          else if (id === 'btn-paid') btn.className = 'btn btn-outline-dark';
        }
      }
    });
  }

  // Update filter button labels with live counts
  updateCustomerCounts();
  
  document.getElementById('btn-drafted').onclick = () => { setActiveFilterBtn('btn-drafted'); currentFilter = 'drafted'; loadCustomerCases(currentFilter); };
  document.getElementById('btn-active').onclick = () => { setActiveFilterBtn('btn-active'); currentFilter = 'active'; loadCustomerCases(currentFilter); };
  document.getElementById('btn-completed').onclick = () => { setActiveFilterBtn('btn-completed'); currentFilter = 'completed'; loadCustomerCases(currentFilter); };
  document.getElementById('btn-canceled').onclick = () => { setActiveFilterBtn('btn-canceled'); currentFilter = 'canceled'; loadCustomerCases(currentFilter); };
  document.getElementById('btn-paid').onclick = () => { setActiveFilterBtn('btn-paid'); currentFilter = 'paid'; loadCustomerCases(currentFilter); };
  // Search input live filter
  const searchInput = document.getElementById('customer-case-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => loadCustomerCases(currentFilter));
  }
  // Set default active button
  setActiveFilterBtn('btn-drafted');
  loadCustomerCases(currentFilter); // Default to drafted
}

// Load customer cases
async function loadCustomerCases(filter) {
  const customerId = localStorage.getItem('userId');
  const res = await authFetch('/cases');
  const data = await res.json();
  const tbody = document.getElementById('customer-case-tbody');
  tbody.innerHTML = '';
  if (data.success && Array.isArray(data.data)) {
    let filteredCases = data.data.filter(c => c.customer_id == customerId);
    const term = (document.getElementById('customer-case-search')?.value || '').toLowerCase().trim();
    if (filter === 'drafted') {
      filteredCases = filteredCases.filter(c => c.status === 'DRAFT');
    } else if (filter === 'active') {
      filteredCases = filteredCases.filter(c => c.status === 'ASSIGNED' || c.status === 'IN_PROGRESS');
    } else if (filter === 'completed') {
      filteredCases = filteredCases.filter(c => c.status === 'COMPLETE');
    } else if (filter === 'canceled') {
      filteredCases = filteredCases.filter(c => c.status === 'CANCELED');
    } else if (filter === 'paid') {
      filteredCases = filteredCases.filter(c => c.status === 'PAID');
    } else if (filter === 'history') {
      filteredCases = filteredCases.filter(c => c.status !== 'DRAFT');
    }
    // Apply text search
    if (term) {
      filteredCases = filteredCases.filter(c =>
        String(c.case_id || '').includes(term) ||
        String(c.description || '').toLowerCase().includes(term) ||
        String(c.item_name || '').toLowerCase().includes(term) ||
        String(c.type || '').toLowerCase().includes(term) ||
        String(c.priority || '').toLowerCase().includes(term)
      );
    }
    // Helper to render a colored status badge
    const statusBadge = (status) => {
      const map = {
        DRAFT: { cls: 'bg-warning text-dark', label: 'Draft' },
        ASSIGNED: { cls: 'bg-info text-dark', label: 'Assigned' },
        IN_PROGRESS: { cls: 'bg-primary', label: 'In Progress' },
        COMPLETE: { cls: 'bg-success', label: 'Completed' },
        CANCELED: { cls: 'bg-danger', label: 'Canceled' },
        PAID: { cls: 'bg-dark', label: 'Paid' }
      };
      const meta = map[status] || { cls: 'bg-secondary', label: status };
      return `<span class="badge ${meta.cls}">${meta.label}</span>`;
    };

    tbody.innerHTML = filteredCases.map(c => {
      let date = '';
      if (c.status === 'DRAFT' && c.draft_status) {
        date = new Date(c.draft_status).toLocaleDateString();
      } else if (c.status === 'ASSIGNED' && c.assigned_status) {
        date = new Date(c.assigned_status).toLocaleDateString();
      } else if (c.status === 'IN_PROGRESS' && c.progress_status) {
        date = new Date(c.progress_status).toLocaleDateString();
      } else if (c.status === 'COMPLETE' && c.complete_status) {
        date = new Date(c.complete_status).toLocaleDateString();
      } else if (c.status === 'CANCELED' && c.canceled_status) {
        date = new Date(c.canceled_status).toLocaleDateString();
      } else if (c.status === 'PAID' && c.paid_status) {
        date = new Date(c.paid_status).toLocaleDateString();
      } else if (c.status === 'PAID' && c.paid_status) {
        date = new Date(c.paid_status).toLocaleDateString();
      }
      return `<tr>
        <td>${c.case_id}</td>
        <td>${c.description}</td>
        <td>${statusBadge(c.status)}</td>
        <td>${c.type}</td>
        <td>${c.priority || ''}</td>
        <td>${c.item_name || ''}</td>
        <td>${date}</td>
          <td><a href="caseDetail.html?id=${c.case_id}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm"><i class="fa-regular fa-eye me-1"></i> View</a></td>
      </tr>`;
    }).join('');

    // Refresh counts alongside list updates
    updateCustomerCounts();
  }
}

// Compute and update counts on the customer filter buttons
async function updateCustomerCounts() {
  try {
    const customerId = localStorage.getItem('userId');
  const res = await authFetch('/cases');
    const data = await res.json();
    let drafted = 0, active = 0, completed = 0, canceled = 0, paid = 0;
    if (data.success && Array.isArray(data.data)) {
      data.data.forEach(c => {
        if (String(c.customer_id) === String(customerId)) {
          if (c.status === 'DRAFT') drafted++;
          else if (c.status === 'ASSIGNED' || c.status === 'IN_PROGRESS') active++;
          else if (c.status === 'COMPLETE') completed++;
          else if (c.status === 'CANCELED') canceled++;
          else if (c.status === 'PAID') paid++;
        }
      });
    }
    const d = document.getElementById('btn-drafted');
    const a = document.getElementById('btn-active');
    const cpl = document.getElementById('btn-completed');
    const cnl = document.getElementById('btn-canceled');
    const pd = document.getElementById('btn-paid');
  if (d) d.innerHTML = `<i class="fa-regular fa-file-lines me-1"></i> Drafted Cases (${drafted})`;
  if (a) a.innerHTML = `<i class="fa-solid fa-bolt me-1"></i> Active Cases (${active})`;
  if (cpl) cpl.innerHTML = `<i class="fa-regular fa-circle-check me-1"></i> Completed Cases (${completed})`;
  if (cnl) cnl.innerHTML = `<i class="fa-regular fa-circle-xmark me-1"></i> Canceled Cases (${canceled})`;
  if (pd) pd.innerHTML = `<i class="fa-solid fa-credit-card me-1"></i> Paid Cases (${paid})`;
  } catch (e) {
    // ignore count errors silently
  }
}

// Render customer profile
function renderCustomerProfile() {
  const main = document.querySelector('.main-content');
  const userId = localStorage.getItem('userId') || '';
  const userName = localStorage.getItem('userName') || '';
  main.insertAdjacentHTML('beforeend', `
    <div class="container py-4">
      <h4>Profile</h4>
      <ul class="list-group">
        <li class="list-group-item"><b>ID:</b> ${userId}</li>
        <li class="list-group-item"><b>Name:</b> ${userName}</li>
        <li class="list-group-item" id="customer-email"><b>Email:</b> </li>
        <li class="list-group-item" id="customer-phone"><b>Phone:</b> </li>
        <li class="list-group-item" id="customer-location"><b>Location:</b> </li>
        <li class="list-group-item" id="customer-state"><b>State:</b> </li>
      </ul>
    </div>
  `);
  // Fetch email, phone, location, state from backend
  authFetch('/customers')
    .then(res => res.json())
    .then(data => {
      if (data.success && Array.isArray(data.data)) {
        const me = data.data.find(c => c.user_id == userId);
        if (me) {
          document.getElementById('customer-email').innerHTML = `<b>Email:</b> ${me.email}`;
          document.getElementById('customer-phone').innerHTML = `<b>Phone:</b> ${me.phone}`;
          document.getElementById('customer-location').innerHTML = `<b>Location:</b> ${me.location || ''}`;
          document.getElementById('customer-state').innerHTML = `<b>State:</b> ${me.state || ''}`;
        }
      }
    });
}
