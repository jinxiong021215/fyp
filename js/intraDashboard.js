// intraDashboard.js
// 只允许 company, admin, technician 进入
// 动态填充用户信息和 case 管理表


document.addEventListener('DOMContentLoaded', function() {
  // Token 和角色校验
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const userId = localStorage.getItem('userId');
  const userName = localStorage.getItem('userName') || 'User Name';
  if (!token || !['company', 'admin', 'technician'].includes(role)) {
    window.location.href = 'companyLogin.html';
    return;
  }
  // 统一封装带 Token 的请求
  window.authFetch = async function(url, options = {}) {
    const t = localStorage.getItem('token');
    const hdrs = Object.assign({}, options.headers || {});
    if (t) hdrs['Authorization'] = `Bearer ${t}`;
    const next = Object.assign({}, options, { headers: hdrs });
    const res = await fetch(url, next);
    if (res.status === 401 || res.status === 403) {
      try { localStorage.removeItem('token'); } catch {}
      const r = localStorage.getItem('role');
      // technician/admin/company all use companyLogin.html
      window.location.href = 'companyLogin.html';
      throw new Error('Unauthorized');
    }
    return res;
  };
  // 用户信息
  document.getElementById('userName').textContent = userName;
  document.getElementById('userRole').textContent = role;
  const userName2El = document.getElementById('userName2');
  if (userName2El) userName2El.textContent = userName; // safe no-op if hidden
  // 头像：右上角不显示字母，但侧边栏保留首字母
  const avatarChar = userName && userName[0] ? userName[0].toUpperCase() : 'U';
  const avatarEl = document.getElementById('avatar'); // sidebar
  if (avatarEl) avatarEl.textContent = avatarChar;
  const avatar2El = document.getElementById('avatar2');
  if (avatar2El) avatar2El.textContent = '';

  // 动态渲染侧边栏
  renderSidebar(role);
  // 初始化通知（admin/technician/company）
  initNotifications(role);
  // 默认加载内容
  if (role === 'admin') {
    renderMainContent('admin-dashboard');
  } else if (role === 'technician') {
    renderMainContent('tech-dashboard');
  } else if (role === 'company') {
    renderMainContent('company-dashboard');
  }
});

function renderSidebar(role) {
  const sidebarNav = document.getElementById('sidebarNav');
  let navHtml = '';
  if (role === 'company') {
    navHtml += `<a class="nav-link" href="#" id="nav-dashboard"><i class="fa-solid fa-table-columns"></i> Dashboard</a>`;
    navHtml += `<a class="nav-link" href="#" id="nav-employee"><i class="fa-solid fa-users"></i> Employee</a>`;
    navHtml += `<a class="nav-link" href="#" id="nav-item"><i class="fa-solid fa-boxes-stacked"></i> Items</a>`;
    navHtml += `<a class="nav-link" href="#" id="nav-profile"><i class="fa-solid fa-user"></i> Profile</a>`;
  } else if (role === 'admin') {
    navHtml += `<a class="nav-link" href="#" id="nav-dashboard"><i class="fa-solid fa-table-columns"></i> Dashboard</a>`;
    navHtml += `<a class="nav-link" href="#" id="nav-technician"><i class="fa-solid fa-users"></i> Technician</a>`;
    navHtml += `<a class="nav-link" href="#" id="nav-case"><i class="fa-solid fa-briefcase"></i> Case</a>`;
    navHtml += `<a class="nav-link" href="#" id="nav-profile"><i class="fa-solid fa-user"></i> Profile</a>`;
  } else if (role === 'technician') {
    navHtml += `<a class="nav-link" href="#" id="nav-dashboard"><i class="fa-solid fa-table-columns"></i> Dashboard</a>`;
    navHtml += `<a class="nav-link" href="#" id="nav-case"><i class="fa-solid fa-briefcase"></i> Case</a>`;
    navHtml += `<a class="nav-link" href="#" id="nav-profile"><i class="fa-solid fa-user"></i> Profile</a>`;
  }
  sidebarNav.innerHTML = navHtml;
  // 绑定点击事件
  if (role === 'company') {
    document.getElementById('nav-dashboard').onclick = () => renderMainContent('company-dashboard');
    document.getElementById('nav-employee').onclick = () => renderMainContent('company-employee');
    document.getElementById('nav-item').onclick = () => renderMainContent('company-item');
    document.getElementById('nav-profile').onclick = () => renderMainContent('company-profile');
  } else if (role === 'admin') {
    document.getElementById('nav-dashboard').onclick = () => renderMainContent('admin-dashboard');
    document.getElementById('nav-technician').onclick = () => renderMainContent('admin-technician');
    document.getElementById('nav-case').onclick = () => renderMainContent('admin-case');
    document.getElementById('nav-profile').onclick = () => renderMainContent('admin-profile');
  } else if (role === 'technician') {
    document.getElementById('nav-dashboard').onclick = () => renderMainContent('tech-dashboard');
    document.getElementById('nav-case').onclick = () => renderMainContent('tech-case');
    document.getElementById('nav-profile').onclick = () => renderMainContent('tech-profile');
  }
}

function renderMainContent(section) {
  const main = document.querySelector('.main-content');
  // 清空内容
  main.querySelectorAll('.dashboard-header ~ *:not(script)').forEach(e => e.remove());
  // 渲染内容
  if (section === 'company-employee') {
    // 员工管理（Item 管理已移至单独的 Items 侧边栏）
    main.insertAdjacentHTML('beforeend', `
      <div class="container py-3">
        <div class="row g-3">
          <div class="col-12">
            <div class="card h-100">
              <div class="card-header"><i class="fa-solid fa-users me-2"></i>Employee Management</div>
              <div class="card-body p-0">
                <iframe src="../html/employee.html" style="width:100%;height:70vh;border:none;"></iframe>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);
  } else if (section === 'company-item') {
    // Item management page for company
    main.insertAdjacentHTML('beforeend', `
      <iframe src="../html/item.html" style="width:100%;height:80vh;border:none;"></iframe>
    `);
    // company profile
  } else if (section === 'company-profile') {
    const companyName = localStorage.getItem('companyName') || 'Company Name';
    const companyLocation = localStorage.getItem('companyLocation') || 'Company Location';
    const companySSN = localStorage.getItem('companySSN') || 'Company SSN';
    main.insertAdjacentHTML('beforeend', `
      <div class="container py-4">
        <h4>Company Profile</h4>
        <ul class="list-group">
          <li class="list-group-item"><b>Name:</b> ${companyName}</li>
          <li class="list-group-item"><b>Location:</b> ${companyLocation}</li>
          <li class="list-group-item"><b>SSN:</b> ${companySSN}</li>
        </ul>
      </div>
    `);
  } else if (section === 'company-dashboard') {
    // company dashboard (same as admin view with reports)
    main.insertAdjacentHTML('beforeend', `<div class="container py-4"><h4>Company Dashboard</h4><div id="company-dashboard-content"></div></div>`);
    renderCompanyDashboard();
  } else if (section === 'admin-dashboard') {
    // admin dashboard
    main.insertAdjacentHTML('beforeend', `<div class="container py-4"><h4>Admin Dashboard</h4><div id="admin-dashboard-content"></div></div>`);
    renderAdminDashboard();
  } else if (section === 'admin-technician') {
    main.insertAdjacentHTML('beforeend', `<div class="container py-4"><h4>Technician List</h4><div id="admin-tech-content"></div></div>`);
    renderAdminTechnician();
  } else if (section === 'admin-case') {
    main.insertAdjacentHTML('beforeend', `<div class="container py-4"><h4>Case Management</h4><div id="admin-case-content"></div></div>`);
    renderAdminCase();
  } else if (section === 'admin-profile') {
    const userId = localStorage.getItem('userId') || '';
    const userName = localStorage.getItem('userName') || '';
    main.insertAdjacentHTML('beforeend', `
      <div class="container py-4">
        <h4><i class="fa-regular fa-id-badge me-2"></i>Profile</h4>
        <ul class="list-group" id="admin-profile-list">
          <li class="list-group-item"><i class="fa-regular fa-id-card me-2"></i><b>User ID:</b> ${userId}</li>
          <li class="list-group-item"><i class="fa-regular fa-user me-2"></i><b>Name:</b> ${userName}</li>
          <li class="list-group-item" id="admin-email"><i class="fa-regular fa-envelope me-2"></i><b>Email:</b> </li>
          <li class="list-group-item" id="admin-phone"><i class="fa-solid fa-phone me-2"></i><b>Phone:</b> </li>
        </ul>
      </div>
    `);
    // fetch email/phone
    authFetch(`/employees/admins`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          const me = data.data.find(a => a.user_id == userId);
          if (me) {
            document.getElementById('admin-email').innerHTML = `<b>Email:</b> ${me.email}`;
            document.getElementById('admin-phone').innerHTML = `<b>Phone:</b> ${me.phone}`;
          }
        }
      });
  } else if (section === 'tech-dashboard') {
    main.insertAdjacentHTML('beforeend', `<div class="container py-4"><h4>Technician Dashboard</h4><div id="tech-dashboard-content"></div></div>`);
    renderTechDashboard();
  } else if (section === 'tech-case') {
    main.insertAdjacentHTML('beforeend', `<div class="container py-4"><h4>My Cases</h4><div id="tech-case-content"></div></div>`);
    renderTechCase();
  } else if (section === 'tech-profile') {
    const userId = localStorage.getItem('userId') || '';
    const userName = localStorage.getItem('userName') || '';
    main.insertAdjacentHTML('beforeend', `
      <div class="container py-4">
        <h4><i class="fa-regular fa-id-badge me-2"></i>Profile</h4>
        <ul class="list-group" id="tech-profile-list">
          <li class="list-group-item"><i class="fa-regular fa-id-card me-2"></i><b>User ID:</b> ${userId}</li>
          <li class="list-group-item"><i class="fa-regular fa-user me-2"></i><b>Name:</b> ${userName}</li>
          <li class="list-group-item" id="tech-email"><i class="fa-regular fa-envelope me-2"></i><b>Email:</b> </li>
          <li class="list-group-item" id="tech-phone"><i class="fa-solid fa-phone me-2"></i><b>Phone:</b> </li>
        </ul>
      </div>
    `);
    // fetch email/phone
    authFetch(`/employees/technicians`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          const me = data.data.find(t => t.user_id == userId);
          if (me) {
            document.getElementById('tech-email').innerHTML = `<b>Email:</b> ${me.email}`;
            document.getElementById('tech-phone').innerHTML = `<b>Phone:</b> ${me.phone}`;
          }
        }
      });
  }
}

// 以下为各角色内容渲染函数（可根据需要完善）
async function renderAdminDashboard() {
  // 获取统计数据
  const [casesRes, techRes] = await Promise.all([
    authFetch('/cases').then(r => r.json()),
    authFetch('/employees/technicians').then(r => r.json())
  ]);
  let pending = 0, inProgress = 0, completedToday = 0, canceledToday = 0, activeTech = 0;
  const today = new Date().toISOString().slice(0, 10);
  if (casesRes.success && Array.isArray(casesRes.data)) {
    for (const c of casesRes.data) {
      if (c.status === 'DRAFT') pending++;
      if (c.status === 'IN_PROGRESS') inProgress++;
      if (c.status === 'COMPLETE' && c.complete_status && c.complete_status.slice(0,10) === today) completedToday++;
      if (c.status === 'CANCELED' && c.canceled_status && c.canceled_status.slice(0,10) === today) canceledToday++;
    }
  }
  if (techRes.success && Array.isArray(techRes.data)) {
    activeTech = techRes.data.filter(t => t.status === 'ON_DUTY').length;
  }
  // Fetch income for current month
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  let monthlyIncome = 0;
  let monthlySeries = [];
  try {
    const incRes = await authFetch(`/reports/payments/monthly?year=${year}&month=${month}`);
    const incData = await incRes.json();
    if (incData.success) monthlyIncome = incData.data.total || 0;
  } catch {}
  try {
    const seriesRes = await authFetch(`/reports/payments/by-month?months=6`);
    const seriesData = await seriesRes.json();
    if (seriesData.success && Array.isArray(seriesData.data)) {
      monthlySeries = seriesData.data;
    }
  } catch {}

  document.getElementById('admin-dashboard-content').innerHTML = `
    <div class="row g-3 mb-4">
      <div class="col-md-3"><div class="card p-3"><b><i class="fa-regular fa-file-lines me-2 text-warning"></i>Pending Cases</b><div class="fs-3">${pending}</div></div></div>
      <div class="col-md-3"><div class="card p-3"><b><i class="fa-solid fa-spinner fa-spin me-2"></i>In Progress</b><div class="fs-3">${inProgress}</div></div></div>
      <div class="col-md-3"><div class="card p-3"><b><i class="fa-regular fa-circle-check me-2 text-success"></i>Completed Today</b><div class="fs-3">${completedToday}</div></div></div>
      <div class="col-md-3"><div class="card p-3"><b><i class="fa-regular fa-circle-xmark me-2 text-danger"></i>Canceled Today</b><div class="fs-3">${canceledToday}</div></div></div>
    </div>
    <div class="row g-3 mb-4">
      <div class="col-md-6"><div class="card p-3"><b><i class="fa-solid fa-users-gear me-2 text-secondary"></i>Active Technicians</b><div class="fs-3">${activeTech}</div></div></div>
      <div class="col-md-6"><div class="card p-3"><b><i class="fa-solid fa-sack-dollar me-2 text-success"></i>Income This Month</b><div class="fs-3">$${monthlyIncome.toFixed(2)}</div>
        <div class="mt-2">
          <div class="small text-muted mb-1">Last 6 months</div>
          <ul class="list-unstyled small mb-0" id="income-series"></ul>
        </div>
      </div></div>
    </div>
  `;
  // Render income series list
  try {
    const ul = document.getElementById('income-series');
    if (ul) {
      if (!monthlySeries.length) {
        ul.innerHTML = '<li class="text-muted">No data</li>';
      } else {
        ul.innerHTML = monthlySeries
          .slice(-6)
          .map(m => `<li class="d-flex justify-content-between"><span>${m.ym}</span><span>$${Number(m.total||0).toFixed(2)}</span></li>`)
          .join('');
      }
    }
  } catch {}
}

// Company dashboard: mirror admin dashboard KPIs and payment reports
async function renderCompanyDashboard() {
  // Reuse the same data sources as admin
  const [casesRes, techRes] = await Promise.all([
    authFetch('/cases').then(r => r.json()),
    authFetch('/employees/technicians').then(r => r.json())
  ]);
  let pending = 0, inProgress = 0, completedToday = 0, canceledToday = 0, activeTech = 0;
  const today = new Date().toISOString().slice(0, 10);
  if (casesRes.success && Array.isArray(casesRes.data)) {
    for (const c of casesRes.data) {
      if (c.status === 'DRAFT') pending++;
      if (c.status === 'IN_PROGRESS') inProgress++;
      if (c.status === 'COMPLETE' && c.complete_status && c.complete_status.slice(0,10) === today) completedToday++;
      if (c.status === 'CANCELED' && c.canceled_status && c.canceled_status.slice(0,10) === today) canceledToday++;
    }
  }
  if (techRes.success && Array.isArray(techRes.data)) {
    activeTech = techRes.data.filter(t => t.status === 'ON_DUTY').length;
  }
  // Payment reports
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  let monthlyIncome = 0;
  let monthlySeries = [];
  try {
    const incRes = await authFetch(`/reports/payments/monthly?year=${year}&month=${month}`);
    const incData = await incRes.json();
    if (incData.success) monthlyIncome = incData.data.total || 0;
  } catch {}
  try {
    const seriesRes = await authFetch(`/reports/payments/by-month?months=6`);
    const seriesData = await seriesRes.json();
    if (seriesData.success && Array.isArray(seriesData.data)) {
      monthlySeries = seriesData.data;
    }
  } catch {}

  document.getElementById('company-dashboard-content').innerHTML = `
    <div class="row g-3 mb-4">
      <div class="col-md-3"><div class="card p-3"><b><i class="fa-regular fa-file-lines me-2 text-warning"></i>Pending Cases</b><div class="fs-3">${pending}</div></div></div>
      <div class="col-md-3"><div class="card p-3"><b><i class="fa-solid fa-spinner fa-spin me-2"></i>In Progress</b><div class="fs-3">${inProgress}</div></div></div>
      <div class="col-md-3"><div class="card p-3"><b><i class="fa-regular fa-circle-check me-2 text-success"></i>Completed Today</b><div class="fs-3">${completedToday}</div></div></div>
      <div class="col-md-3"><div class="card p-3"><b><i class="fa-regular fa-circle-xmark me-2 text-danger"></i>Canceled Today</b><div class="fs-3">${canceledToday}</div></div></div>
    </div>
    <div class="row g-3 mb-4">
      <div class="col-md-6"><div class="card p-3"><b><i class="fa-solid fa-users-gear me-2 text-secondary"></i>Active Technicians</b><div class="fs-3">${activeTech}</div></div></div>
      <div class="col-md-6"><div class="card p-3"><b><i class="fa-solid fa-sack-dollar me-2 text-success"></i>Income This Month</b><div class="fs-3">$${monthlyIncome.toFixed(2)}</div>
        <div class="mt-2">
          <div class="small text-muted mb-1">Last 6 months</div>
          <ul class="list-unstyled small mb-0" id="company-income-series"></ul>
        </div>
      </div></div>
    </div>
  `;
  // Render series
  try {
    const ul = document.getElementById('company-income-series');
    if (ul) {
      if (!monthlySeries.length) {
        ul.innerHTML = '<li class="text-muted">No data</li>';
      } else {
        ul.innerHTML = monthlySeries
          .slice(-6)
          .map(m => `<li class="d-flex justify-content-between"><span>${m.ym}</span><span>$${Number(m.total||0).toFixed(2)}</span></li>`)
          .join('');
      }
    }
  } catch {}
}

// --------------- Notifications (Intra) ---------------
function initNotifications(role) {
  const badge = document.getElementById('notifBadge');
  const menu = document.getElementById('notifMenu');
  const btn = document.getElementById('notifBtn');
  if (!badge || !menu || !btn) return; // header may not have bell

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
        const href = `../html/caseDetail.html?id=${encodeURIComponent(n.case_id)}`;
        return `<li><a class="dropdown-item small" href="${href}" target="_blank" rel="noopener noreferrer">
        <b>#${n.case_id}</b> - ${n.msg}<br><span class="text-muted">${ts}</span></a></li>`;
      }).join('');
    menu.innerHTML = safe;
  }

  function statusVerb(status) {
    switch (status) {
      case 'ASSIGNED': return 'Case assigned';
      case 'IN_PROGRESS': return 'Case in progress';
      case 'COMPLETE': return 'Case completed';
      case 'CANCELED': return 'Case canceled';
      case 'PAID': return 'Case paid';
      case 'DRAFT': return 'New draft case';
      default: return `Status: ${status}`;
    }
  }

  async function fetchRelevantCases() {
    if (role === 'technician') {
      const my = localStorage.getItem('userId');
      const res = await authFetch(`/cases?technician_id=${encodeURIComponent(my)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) return data.data;
      return [];
    }
    // admin/company: see all cases
    const res = await authFetch('/cases');
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) return data.data;
    return [];
  }

  async function check() {
    try {
      const cases = await fetchRelevantCases();
      let newCount = 0;
      for (const c of cases) {
        const cid = String(c.case_id);
        const prev = prevMap[cid]?.status;
        if (!prev) { prevMap[cid] = { status: c.status }; continue; }
        if (prev !== c.status) {
          items.push({ case_id: cid, status: c.status, ts: Date.now(), msg: statusVerb(c.status) });
          newCount++;
          prevMap[cid] = { status: c.status };
        }
      }
      if (newCount > 0) {
        setBadge((parseInt(badge.textContent || '0', 10) || 0) + newCount);
        renderMenu();
        savePrev();
      } else {
        savePrev();
      }
    } catch {}
  }

  btn.addEventListener('show.bs.dropdown', () => setBadge(0));

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

  setInterval(check, 20000);
}
async function renderAdminTechnician() {
  const container = document.getElementById('admin-tech-content');
  container.innerHTML = `
    <div class="mb-3">
      <div class="btn-group" role="group" aria-label="Technician Status Filter">
        <button type="button" class="btn btn-outline-primary" id="btn-on-duty"><i class="fa-solid fa-toggle-on me-1"></i>On Duty</button>
        <button type="button" class="btn btn-outline-warning" id="btn-break"><i class="fa-solid fa-mug-saucer me-1"></i>Break</button>
        <button type="button" class="btn btn-outline-secondary" id="btn-off-duty"><i class="fa-solid fa-toggle-off me-1"></i>Off Duty</button>
      </div>
    </div>
    <div class="table-responsive">
      <table class="table table-hover">
        <thead>
          <tr>
            <th>Name</th>
            <th class="d-none d-md-table-cell">Email</th>
            <th class="d-none d-md-table-cell">Phone</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody id="admin-tech-tbody"></tbody>
      </table>
    </div>
    
    <!-- Technician Details Modal -->
    <div class="modal fade" id="techModal" tabindex="-1" aria-labelledby="techModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="techModalLabel"><i class="fa-solid fa-user-gear me-2"></i>Technician Details</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div id="tech-info"></div>
            <hr>
            <h6>Available Skills</h6>
            <div id="tech-skills"></div>
            <hr>
            <h6>Add New Skill</h6>
            <div class="row">
              <div class="col-md-8">
                <select class="form-select" id="skill-select">
                  <option value="">Select a skill to add...</option>
                </select>
              </div>
              <div class="col-md-4">
                <button class="btn btn-primary" id="add-skill-btn"><i class="fa-solid fa-plus me-1"></i>Add Skill</button>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal"><i class="fa-solid fa-xmark me-1"></i>Close</button>
          </div>
        </div>
      </div>
    </div>
  `;
  async function loadTable(status) {
  const res = await authFetch('/employees/technicians');
    const data = await res.json();
    const tbody = document.getElementById('admin-tech-tbody');
    tbody.innerHTML = '';
    if (data.success && Array.isArray(data.data)) {
      const techBadge = (s) => {
        if (s === 'ON_DUTY') return '<span class="badge rounded-pill bg-success">On Duty</span>';
        if (s === 'TAKE_BREAK') return '<span class="badge rounded-pill bg-warning text-dark">Break</span>';
        if (s === 'OFF_DUTY') return '<span class="badge rounded-pill bg-secondary">Off Duty</span>';
        return `<span class="badge rounded-pill bg-light text-dark">${s || ''}</span>`;
      };
      tbody.innerHTML = data.data.filter(t => t.status === status).map(t =>
        `<tr>
          <td><a href="#" class="tech-name-link" data-id="${t.user_id}">${t.name}</a></td>
          <td class="d-none d-md-table-cell">${t.email}</td>
          <td class="d-none d-md-table-cell">${t.phone}</td>
          <td>${techBadge(t.status)}</td>
        </tr>`
      ).join('');
    }
    // Bind click events for technician names
    document.querySelectorAll('.tech-name-link').forEach(link => {
      link.onclick = (e) => {
        e.preventDefault();
        openTechModal(link.getAttribute('data-id'));
      };
    });
  }
  document.getElementById('btn-on-duty').onclick = () => {
    setActiveBtn('btn-on-duty');
    loadTable('ON_DUTY');
  };
  document.getElementById('btn-break').onclick = () => {
    setActiveBtn('btn-break');
    loadTable('TAKE_BREAK');
  };
  document.getElementById('btn-off-duty').onclick = () => {
    setActiveBtn('btn-off-duty');
    loadTable('OFF_DUTY');
  };
  function setActiveBtn(activeId) {
    const ids = ['btn-on-duty','btn-break','btn-off-duty'];
    ids.forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      if (id === activeId) {
        if (id === 'btn-on-duty') btn.className = 'btn btn-primary';
        else if (id === 'btn-break') btn.className = 'btn btn-warning';
        else if (id === 'btn-off-duty') btn.className = 'btn btn-secondary';
      } else {
        if (id === 'btn-on-duty') btn.className = 'btn btn-outline-primary';
        else if (id === 'btn-break') btn.className = 'btn btn-outline-warning';
        else if (id === 'btn-off-duty') btn.className = 'btn btn-outline-secondary';
      }
    });
  }
  setActiveBtn('btn-on-duty');
  loadTable('ON_DUTY');

  // Technician modal functions
  let currentTechId = null;
  
  async function openTechModal(techId) {
    currentTechId = techId;
    const res = await authFetch('/employees/technicians');
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      const tech = data.data.find(t => t.user_id == techId);
      if (tech) {
        document.getElementById('techModalLabel').textContent = `${tech.name} - Details`;
        document.getElementById('tech-info').innerHTML = `
          <div class="row">
            <div class="col-md-6"><strong>Name:</strong> ${tech.name}</div>
            <div class="col-md-6"><strong>Email:</strong> ${tech.email}</div>
          </div>
          <div class="row mt-2">
            <div class="col-md-6"><strong>Phone:</strong> ${tech.phone}</div>
            <div class="col-md-6"><strong>Status:</strong> ${tech.status}</div>
          </div>
        `;
        loadTechSkills(techId);
        loadAvailableSkills();
        new bootstrap.Modal(document.getElementById('techModal')).show();
      }
    }
  }

  async function loadTechSkills(techId) {
    try {
  const res = await authFetch(`/employees/technicians/${techId}/skills`);
      const data = await res.json();
      const skillsDiv = document.getElementById('tech-skills');
      if (data.success && Array.isArray(data.data)) {
        if (data.data.length > 0) {
          skillsDiv.innerHTML = data.data.map(skill => `
            <span class="badge bg-primary me-2 mb-2">${skill.item_name}
              <button class="btn btn-sm btn-danger ms-1 remove-skill" data-skill-id="${skill.item_id}" data-tech-id="${techId}">×</button>
            </span>
          `).join('');
        } else {
          skillsDiv.innerHTML = '<em>No skills assigned yet.</em>';
        }
      } else {
        skillsDiv.innerHTML = '<em>Failed to load skills.</em>';
      }
    } catch (error) {
      console.error('Error loading skills:', error);
      document.getElementById('tech-skills').innerHTML = '<em>Error loading skills.</em>';
    }
  }

  async function loadAvailableSkills() {
    try {
      const select = document.getElementById('skill-select');
      if (!select) return;
      // Fetch all items and current technician's skills in parallel
      const [itemsData, skillsData] = await Promise.all([
        authFetch('/items').then(r => r.json()),
        currentTechId ? authFetch(`/employees/technicians/${currentTechId}/skills`).then(r => r.json()) : Promise.resolve({ success: true, data: [] })
      ]);
      const allItems = (itemsData.success && Array.isArray(itemsData.data)) ? itemsData.data : [];
      const ownedSet = new Set(((skillsData.success && Array.isArray(skillsData.data)) ? skillsData.data : []).map(s => String(s.item_id)));
      const available = allItems.filter(it => !ownedSet.has(String(it.item_id)));
      if (available.length > 0) {
        select.innerHTML = '<option value="">Select a skill to add...</option>' +
          available.map(item => `<option value="${item.item_id}">${item.item_name}</option>`).join('');
        const btn = document.getElementById('add-skill-btn');
        if (btn) btn.disabled = false;
      } else {
        select.innerHTML = '<option value="">No new skills available</option>';
        const btn = document.getElementById('add-skill-btn');
        if (btn) btn.disabled = true;
      }
    } catch (error) {
      console.error('Error loading available skills:', error);
    }
  }

  // Bind add skill button
  document.getElementById('add-skill-btn').onclick = async () => {
    const skillSelect = document.getElementById('skill-select');
    const skillId = skillSelect.value;
    if (!skillId) {
      alert('Please select a skill to add.');
      return;
    }
    if (!currentTechId) {
      alert('No technician selected.');
      return;
    }
    
    try {
      const res = await authFetch(`/employees/technicians/${currentTechId}/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: skillId })
      });
      const data = await res.json();
      if (data.success) {
        skillSelect.value = '';
        loadTechSkills(currentTechId);
        loadAvailableSkills();
        alert('Skill added successfully!');
      } else {
        alert('Failed to add skill: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error adding skill:', error);
      alert('Error adding skill.');
    }
  };

  // Bind remove skill buttons (delegated event)
  document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('remove-skill')) {
      const skillId = e.target.getAttribute('data-skill-id');
      
      if (!currentTechId) {
        alert('No technician selected.');
        return;
      }
      
      if (confirm('Are you sure you want to remove this skill?')) {
        try {
          const res = await authFetch(`/employees/technicians/${currentTechId}/skills/${skillId}`, {
            method: 'DELETE'
          });
          const data = await res.json();
          if (data.success) {
            loadTechSkills(currentTechId);
            loadAvailableSkills();
            alert('Skill removed successfully!');
          } else {
            alert('Failed to remove skill: ' + (data.message || 'Unknown error'));
          }
        } catch (error) {
          console.error('Error removing skill:', error);
          alert('Error removing skill.');
        }
      }
    }
  });
}
async function renderAdminCase() {
  // 筛选按钮和表格
  const container = document.getElementById('admin-case-content');
  container.innerHTML = `
    <div class="mb-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
      <div class="btn-group" role="group" aria-label="Case Status Filter">
        <button class="btn btn-primary" id="btn-in-progress" title="In Progress"><i class="fa-solid fa-spinner fa-spin me-1"></i>In Progress</button>
        <button class="btn btn-outline-warning" id="btn-draft" title="Draft"><i class="fa-regular fa-file-lines me-1"></i>Draft</button>
        <button class="btn btn-outline-info" id="btn-assigned" title="Assigned"><i class="fa-solid fa-user-check me-1"></i>Assigned</button>
        <button class="btn btn-outline-success" id="btn-complete" title="Completed"><i class="fa-solid fa-circle-check me-1"></i>Completed</button>
        <button class="btn btn-outline-danger" id="btn-canceled" title="Canceled"><i class="fa-solid fa-ban me-1"></i>Canceled</button>
        <button class="btn btn-outline-dark" id="btn-paid" title="Paid"><i class="fa-solid fa-credit-card me-1"></i>Paid</button>
      </div>
      <div class="ms-auto">
        <input id="admin-case-search" class="form-control form-control-sm" style="min-width:220px" placeholder="Search cases..." />
      </div>
    </div>
  <div class="table-responsive">
    <table class="table table-hover">
      <thead>
        <tr>
          <th>ID</th>
          <th>Description</th>
          <th>Status</th>
          <th class="d-none d-lg-table-cell">Type</th>
          <th class="d-none d-lg-table-cell">Priority</th>
          <th class="d-none d-md-table-cell">Service</th>
          <th class="d-none d-xl-table-cell">Customer</th>
          <th>Date</th>
          <th class="d-none d-md-table-cell">Amount</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="admin-case-tbody"></tbody>
    </table>
  </div>
  <div id="admin-case-pager" class="d-flex justify-content-between align-items-center mb-2"></div>
    <!-- Modal for assigning technicians -->
    <div class="modal fade" id="assignModal" tabindex="-1" aria-labelledby="assignModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="assignModalLabel"><i class="fa-solid fa-user-plus me-2"></i>Assign Technicians</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div id="tech-list"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal"><i class="fa-solid fa-xmark me-1"></i>Cancel</button>
            <button type="button" class="btn btn-primary" id="assign-btn"><i class="fa-solid fa-user-check me-1"></i>Assign</button>
          </div>
        </div>
      </div>
    </div>
  `;
  let currentStatus = 'IN_PROGRESS';
  let currentSearch = '';
  let currentPage = 1;
  const pageSize = 10;
  const searchInput = document.getElementById('admin-case-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      currentSearch = searchInput.value.trim().toLowerCase();
      currentPage = 1;
      loadTable(currentStatus);
    });
  }
  async function updateAdminCounts() {
    try {
  const res = await authFetch('/cases');
      const data = await res.json();
      let cDraft=0,cAssigned=0,cProg=0,cComp=0,cCancel=0,cPaid=0;
      if (data.success && Array.isArray(data.data)) {
        data.data.forEach(c => {
          if (c.status === 'DRAFT') cDraft++;
          else if (c.status === 'ASSIGNED') cAssigned++;
          else if (c.status === 'IN_PROGRESS') cProg++;
          else if (c.status === 'COMPLETE') cComp++;
          else if (c.status === 'CANCELED') cCancel++;
          else if (c.status === 'PAID') cPaid++;
        });
      }
      const inBtn = document.getElementById('btn-in-progress');
      const dBtn = document.getElementById('btn-draft');
      const aBtn = document.getElementById('btn-assigned');
      const compBtn = document.getElementById('btn-complete');
      const canBtn = document.getElementById('btn-canceled');
      const paidBtn = document.getElementById('btn-paid');
      if (inBtn) inBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin me-1"></i>In Progress (${cProg})`;
      if (dBtn) dBtn.innerHTML = `<i class="fa-regular fa-file-lines me-1"></i>Draft (${cDraft})`;
      if (aBtn) aBtn.innerHTML = `<i class="fa-solid fa-user-check me-1"></i>Assigned (${cAssigned})`;
      if (compBtn) compBtn.innerHTML = `<i class="fa-solid fa-circle-check me-1"></i>Completed (${cComp})`;
      if (canBtn) canBtn.innerHTML = `<i class="fa-solid fa-ban me-1"></i>Canceled (${cCancel})`;
      if (paidBtn) paidBtn.innerHTML = `<i class="fa-solid fa-credit-card me-1"></i>Paid (${cPaid})`;
    } catch {}
  }
  async function loadTable(status) {
    currentStatus = status;
  const res = await authFetch(`/cases?status=${status}`);
    const data = await res.json();
    const tbody = document.getElementById('admin-case-tbody');
    tbody.innerHTML = '';
    if (data.success && Array.isArray(data.data)) {
      const matchesSearch = (c) => {
        if (!currentSearch) return true;
        const term = currentSearch;
        return (
          String(c.case_id || '').includes(term) ||
          String(c.description || '').toLowerCase().includes(term) ||
          String(c.customer_name || '').toLowerCase().includes(term) ||
          String(c.item_name || '').toLowerCase().includes(term) ||
          String(c.type || '').toLowerCase().includes(term) ||
          String(c.priority || '').toLowerCase().includes(term)
        );
      };
      const badgeForStatus = (s) => {
        if (s === 'DRAFT') return '<span class="badge rounded-pill bg-warning text-dark">Draft</span>';
        if (s === 'ASSIGNED') return '<span class="badge rounded-pill bg-info text-dark">Assigned</span>';
        if (s === 'IN_PROGRESS') return '<span class="badge rounded-pill bg-primary">In Progress</span>';
        if (s === 'COMPLETE') return '<span class="badge rounded-pill bg-success">Completed</span>';
        if (s === 'CANCELED') return '<span class="badge rounded-pill bg-danger">Canceled</span>';
        if (s === 'PAID') return '<span class="badge rounded-pill bg-dark">Paid</span>';
        return `<span class="badge rounded-pill bg-secondary">${s || ''}</span>`;
      };
      const filtered = data.data.filter(c => c.status === status && matchesSearch(c));
      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      if (currentPage > totalPages) currentPage = totalPages;
      if (currentPage < 1) currentPage = 1;
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, total);
      const pageItems = filtered.slice(startIndex, endIndex);

      tbody.innerHTML = pageItems.map(c => {
        let actions = '';
        if (c.status === 'DRAFT') {
          actions = `<button class="btn btn-success btn-sm accept-btn" data-id="${c.case_id}"><i class=\"fa fa-check me-1\"></i>Accept</button> <button class="btn btn-danger btn-sm reject-btn" data-id="${c.case_id}"><i class=\"fa fa-xmark me-1\"></i>Reject</button>`;
        } else if (c.status === 'ASSIGNED' || c.status === 'IN_PROGRESS' || c.status === 'COMPLETE' || c.status === 'CANCELED' || c.status === 'PAID') {
          actions = `<a href="../html/caseDetail.html?id=${c.case_id}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm"><i class=\"fa fa-eye me-1\"></i>View</a>`;
        }
        // Format date based on case status
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
        }
        const amountCell = c.status === 'PAID' ? `$${Number(c.bill_amount || 0).toFixed(2)}` : '';
        return `<tr>
          <td>${c.case_id}</td>
          <td class="truncate" title="${(c.description || '').replace(/"/g,'&quot;')}">${c.description}</td>
          <td>${badgeForStatus(c.status)}</td>
          <td class="d-none d-lg-table-cell">${c.type}</td>
          <td class="d-none d-lg-table-cell">${c.priority || ''}</td>
          <td class="d-none d-md-table-cell">${c.item_name || ''}</td>
          <td class="d-none d-xl-table-cell">${c.customer_name||''}</td>
          <td>${date}</td>
          <td class="d-none d-md-table-cell">${amountCell}</td>
          <td>${actions}</td>
        </tr>`;
      }).join('');

      renderAdminPager({ total, start: startIndex + 1, end: endIndex, page: currentPage, totalPages });
    }
    updateAdminCounts();
    // Bind events
    document.querySelectorAll('.accept-btn').forEach(btn => {
      btn.onclick = () => openAssignModal(btn.getAttribute('data-id'));
    });
    document.querySelectorAll('.reject-btn').forEach(btn => {
      btn.onclick = () => rejectCase(btn.getAttribute('data-id'));
    });
  }

  function renderAdminPager({ total, start, end, page, totalPages }) {
    const pager = document.getElementById('admin-case-pager');
    if (!pager) return;
    if (total === 0) {
      pager.innerHTML = '<span class="text-muted small">No cases found.</span>';
      return;
    }
    pager.innerHTML = `
      <span class="text-muted small">Showing ${start}–${end} of ${total}</span>
      <div class="btn-group btn-group-sm" role="group">
        <button class="btn btn-outline-secondary" id="admin-case-prev" ${page <= 1 ? 'disabled' : ''}>Prev</button>
        <button class="btn btn-outline-secondary" id="admin-case-next" ${page >= totalPages ? 'disabled' : ''}>Next</button>
      </div>
    `;
    const prev = document.getElementById('admin-case-prev');
    const next = document.getElementById('admin-case-next');
    if (prev) prev.onclick = () => { if (currentPage > 1) { currentPage--; loadTable(currentStatus); } };
    if (next) next.onclick = () => { if (currentPage < totalPages) { currentPage++; loadTable(currentStatus); } };
  }
  
  function setActiveFilterBtn(activeId) {
    const filterButtons = ['btn-in-progress', 'btn-draft', 'btn-assigned', 'btn-complete', 'btn-canceled', 'btn-paid'];
    filterButtons.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        if (id === activeId) {
          // Make active button solid with its hover color
          if (id === 'btn-in-progress') btn.className = 'btn btn-primary';
          else if (id === 'btn-draft') btn.className = 'btn btn-warning';
          else if (id === 'btn-assigned') btn.className = 'btn btn-info';
          else if (id === 'btn-complete') btn.className = 'btn btn-success';
          else if (id === 'btn-canceled') btn.className = 'btn btn-danger';
          else if (id === 'btn-paid') btn.className = 'btn btn-dark';
        } else {
          // Make inactive buttons outline
          if (id === 'btn-in-progress') btn.className = 'btn btn-outline-primary';
          else if (id === 'btn-draft') btn.className = 'btn btn-outline-warning';
          else if (id === 'btn-assigned') btn.className = 'btn btn-outline-info';
          else if (id === 'btn-complete') btn.className = 'btn btn-outline-success';
          else if (id === 'btn-canceled') btn.className = 'btn btn-outline-danger';
          else if (id === 'btn-paid') btn.className = 'btn btn-outline-dark';
        }
      }
    });
  }
  
  document.getElementById('btn-in-progress').onclick = () => {
    setActiveFilterBtn('btn-in-progress');
    currentPage = 1;
    loadTable('IN_PROGRESS');
  };
  document.getElementById('btn-draft').onclick = () => {
    setActiveFilterBtn('btn-draft');
    currentPage = 1;
    loadTable('DRAFT');
  };
  document.getElementById('btn-assigned').onclick = () => {
    setActiveFilterBtn('btn-assigned');
    currentPage = 1;
    loadTable('ASSIGNED');
  };
  document.getElementById('btn-complete').onclick = () => {
    setActiveFilterBtn('btn-complete');
    currentPage = 1;
    loadTable('COMPLETE');
  };
  document.getElementById('btn-canceled').onclick = () => {
    setActiveFilterBtn('btn-canceled');
    currentPage = 1;
    loadTable('CANCELED');
  };
  document.getElementById('btn-paid').onclick = () => {
    setActiveFilterBtn('btn-paid');
    currentPage = 1;
    loadTable('PAID');
  };
  loadTable(currentStatus);

  // Assign modal
  let currentCaseId = null;
  async function openAssignModal(caseId) {
    currentCaseId = caseId;
    // Get case item_id from the table data instead of fetching again
    const caseRow = document.querySelector(`tr td:first-child`).parentElement; // This is not reliable
    // Better approach: pass the item_id as a data attribute or fetch the case data
  const caseRes = await authFetch(`/cases/${caseId}`);
    const caseData = await caseRes.json();
    let caseItemId = null;
    if (caseData.success && caseData.data) {
      caseItemId = caseData.data.item_id;
    }
    console.log('Case item_id:', caseItemId); // Debug log
    // Fetch technicians
  const techRes = await authFetch('/employees/technicians');
    const techData = await techRes.json();
    const techList = document.getElementById('tech-list');
    techList.innerHTML = '';
    if (techData.success && Array.isArray(techData.data)) {
      const onDutyTechs = techData.data.filter(t => t.status === 'ON_DUTY');
      // Fetch skills for each technician and check for match
      const techPromises = onDutyTechs.map(async (t) => {
  const skillRes = await authFetch(`/employees/technicians/${t.user_id}/skills`);
        const skillData = await skillRes.json();
        let hasMatchingSkill = false;
        if (skillData.success && Array.isArray(skillData.data)) {
          hasMatchingSkill = skillData.data.some(skill => skill.item_id == caseItemId);
        }
        console.log(`Tech ${t.name} skills:`, skillData.data, 'Match:', hasMatchingSkill); // Debug log
        return { ...t, hasMatchingSkill };
      });
      const techsWithSkills = await Promise.all(techPromises);
      // Only show technicians with matching skills
      const availableTechs = techsWithSkills.filter(t => t.hasMatchingSkill);
      if (availableTechs.length === 0) {
        techList.innerHTML = '<div class="alert alert-warning">No technicians with matching skills are available.</div>';
      } else {
        techList.innerHTML = availableTechs.map(t => `
          <div class="form-check">
            <input class="form-check-input" type="checkbox" value="${t.user_id}" id="tech-${t.user_id}">
            <label class="form-check-label" for="tech-${t.user_id}">
              ${t.name} (${t.email})
            </label>
          </div>
        `).join('');
      }
    }
    // Add priority dropdown
    const modalBody = document.querySelector('#assignModal .modal-body');
    // Remove existing priority if any
    const existingHr = modalBody.querySelector('hr');
    if (existingHr) {
      existingHr.nextElementSibling.remove();
      existingHr.remove();
    }
    const currentPriority = caseData.data ? caseData.data.priority || 'MEDIUM' : 'MEDIUM';
    modalBody.innerHTML += `
      <hr>
      <div class="mb-3">
        <label for="priority-select" class="form-label">Priority</label>
        <select class="form-select" id="priority-select">
          <option value="LOW" ${currentPriority === 'LOW' ? 'selected' : ''}>Low</option>
          <option value="MEDIUM" ${currentPriority === 'MEDIUM' ? 'selected' : ''}>Medium</option>
          <option value="HIGH" ${currentPriority === 'HIGH' ? 'selected' : ''}>High</option>
          <option value="CRITICAL" ${currentPriority === 'CRITICAL' ? 'selected' : ''}>Critical</option>
        </select>
      </div>
    `;
    new bootstrap.Modal(document.getElementById('assignModal')).show();
  }
  document.getElementById('assign-btn').onclick = async () => {
    const selectedTechs = Array.from(document.querySelectorAll('#tech-list input:checked')).map(cb => cb.value);
    if (selectedTechs.length === 0) {
      alert('Please select at least one technician.');
      return;
    }
    const priority = document.getElementById('priority-select').value;
    const adminId = localStorage.getItem('userId');
    for (const techId of selectedTechs) {
      await authFetch(`/cases/${currentCaseId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technician_id: techId, admin_id: adminId })
      });
    }
    // Update case status to ASSIGNED and set priority
    await authFetch(`/cases/${currentCaseId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ASSIGNED', priority: priority, admin_id: adminId })
    });
    bootstrap.Modal.getInstance(document.getElementById('assignModal')).hide();
    loadTable(currentStatus);
  };

  async function rejectCase(caseId) {
    const reason = prompt('Please provide a reason for canceling this case:');
    if (reason === null) return;
    const adminId = localStorage.getItem('userId');
    await authFetch(`/cases/${caseId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELED', reason, admin_id: adminId })
    });
    loadTable(currentStatus);
  }
}
async function renderTechDashboard() {
  const userId = localStorage.getItem('userId');
  // 状态切换按钮
  const statusRes = await authFetch('/employees/technicians');
  const statusData = await statusRes.json();
  let myStatus = '';
  if (statusData.success && Array.isArray(statusData.data)) {
    const me = statusData.data.find(t => t.user_id == userId);
    if (me) myStatus = me.status;
  }
  document.getElementById('tech-dashboard-content').innerHTML = `
    <div class="mb-3">
      <b><i class=\"fa-solid fa-signal me-1\"></i>Status:</b>
      <button class="btn btn-sm btn-success" id="btn-on"><i class="fa-solid fa-toggle-on me-1"></i>On Duty</button>
      <button class="btn btn-sm btn-warning" id="btn-break"><i class="fa-solid fa-mug-saucer me-1"></i>Break</button>
      <button class="btn btn-sm btn-secondary" id="btn-off"><i class="fa-solid fa-toggle-off me-1"></i>Off Duty</button>
      <span class="ms-2"><i class="fa-regular fa-circle-dot me-1"></i>Current: <b id="my-status">${myStatus}</b></span>
    </div>
    <div class="row g-3 mb-4">
      <div class="col-md-3"><div class="card p-3"><b><i class="fa-solid fa-user-check me-2 text-warning"></i>Today's Assigned</b><div class="fs-3" id="tech-assigned">0</div></div></div>
      <div class="col-md-3"><div class="card p-3"><b><i class="fa-solid fa-spinner me-2 text-primary"></i>In Progress</b><div class="fs-3" id="tech-inprogress">0</div></div></div>
      <div class="col-md-3"><div class="card p-3"><b><i class="fa-regular fa-circle-check me-2 text-success"></i>Completed</b><div class="fs-3" id="tech-completed">0</div></div></div>
      <div class="col-md-3"><div class="card p-3"><b><i class="fa-regular fa-circle-xmark me-2 text-danger"></i>Canceled</b><div class="fs-3" id="tech-canceled">0</div></div></div>
    </div>
  `;


  document.getElementById('btn-on').onclick = () => updateTechStatus('ON_DUTY');
  document.getElementById('btn-break').onclick = () => updateTechStatus('TAKE_BREAK');
  document.getElementById('btn-off').onclick = () => updateTechStatus('OFF_DUTY');
  async function updateTechStatus(status) {
    await authFetch(`/employees/technicians/${userId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    document.getElementById('my-status').textContent = status;
  }

  // 统计case
  const res = await authFetch(`/cases?technician_id=${userId}`);
  const data = await res.json();
  let assigned = 0, inProgress = 0, completed = 0, canceled = 0;
  const today = new Date().toISOString().slice(0, 10);
  if (data.success && Array.isArray(data.data)) {
    for (const c of data.data) {
      if (c.status === 'ASSIGNED' && c.assigned_status && c.assigned_status.slice(0,10) === today) assigned++;
      if (c.status === 'IN_PROGRESS') inProgress++;
      if (c.status === 'COMPLETE') completed++;
      if (c.status === 'CANCELED') canceled++;
    }
  }
  document.getElementById('tech-assigned').textContent = assigned;
  document.getElementById('tech-inprogress').textContent = inProgress;
  document.getElementById('tech-completed').textContent = completed;
  document.getElementById('tech-canceled').textContent = canceled;
}
async function renderTechCase() {
  const userId = localStorage.getItem('userId');
  const container = document.getElementById('tech-case-content');
  container.innerHTML = `
    <div class="mb-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
      <div class="btn-group" role="group" aria-label="Technician Case Filter">
        <button class="btn btn-primary" id="btn-in-progress" title="In Progress"><i class="fa-solid fa-spinner fa-spin me-1"></i>In Progress</button>
        <button class="btn btn-outline-warning" id="btn-assigned" title="Assigned"><i class="fa-solid fa-user-check me-1"></i>Assigned</button>
        <button class="btn btn-outline-success" id="btn-completed" title="Completed"><i class="fa-solid fa-circle-check me-1"></i>Completed</button>
        <button class="btn btn-outline-danger" id="btn-canceled" title="Canceled"><i class="fa-solid fa-ban me-1"></i>Canceled</button>
      </div>
      <div class="ms-auto">
        <input id="tech-case-search" class="form-control form-control-sm" style="min-width:220px" placeholder="Search my cases..." />
      </div>
    </div>
    <div class="table-responsive">
      <table class="table table-hover">
        <thead>
          <tr>
            <th>ID</th>
            <th>Description</th>
            <th>Status</th>
            <th class="d-none d-lg-table-cell">Type</th>
            <th class="d-none d-lg-table-cell">Priority</th>
            <th class="d-none d-md-table-cell">Service</th>
            <th class="d-none d-xl-table-cell">Customer</th>
            <th>Date</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody id="tech-case-tbody"></tbody>
      </table>
    </div>
    <div id="tech-case-pager" class="d-flex justify-content-between align-items-center mb-2"></div>
  `;
  let selectedStatus = 'IN_PROGRESS';
  let currentSearch = '';
  let techCurrentPage = 1;
  const techPageSize = 10;
  const techSearchInput = document.getElementById('tech-case-search');
  if (techSearchInput) {
    techSearchInput.addEventListener('input', () => {
      currentSearch = techSearchInput.value.trim().toLowerCase();
      techCurrentPage = 1;
      loadCases(selectedStatus);
    });
  }
  async function updateTechCounts() {
    try {
  const res = await authFetch(`/cases?technician_id=${userId}`);
      const data = await res.json();
      let cAssigned=0,cProg=0,cComp=0,cCancel=0;
      if (data.success && Array.isArray(data.data)) {
        data.data.forEach(c => {
          if (c.status === 'ASSIGNED') cAssigned++;
          else if (c.status === 'IN_PROGRESS') cProg++;
          else if (c.status === 'COMPLETE') cComp++;
          else if (c.status === 'CANCELED') cCancel++;
        });
      }
      const inBtn = document.getElementById('btn-in-progress');
      const aBtn = document.getElementById('btn-assigned');
      const compBtn = document.getElementById('btn-completed');
      const canBtn = document.getElementById('btn-canceled');
      if (inBtn) inBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin me-1"></i>In Progress (${cProg})`;
      if (aBtn) aBtn.innerHTML = `<i class="fa-solid fa-user-check me-1"></i>Assigned (${cAssigned})`;
      if (compBtn) compBtn.innerHTML = `<i class="fa-solid fa-circle-check me-1"></i>Completed (${cComp})`;
      if (canBtn) canBtn.innerHTML = `<i class="fa-solid fa-ban me-1"></i>Canceled (${cCancel})`;
    } catch {}
  }
  async function loadCases(status) {
    selectedStatus = status;
  const res = await authFetch(`/cases?technician_id=${userId}&status=${status}`);
    const data = await res.json();
    const tbody = document.getElementById('tech-case-tbody');
    tbody.innerHTML = '';
    if (data.success && Array.isArray(data.data)) {
      const matchesSearch = (c) => {
        if (!currentSearch) return true;
        const term = currentSearch;
        return (
          String(c.case_id || '').includes(term) ||
          String(c.description || '').toLowerCase().includes(term) ||
          String(c.customer_name || '').toLowerCase().includes(term) ||
          String(c.item_name || '').toLowerCase().includes(term) ||
          String(c.type || '').toLowerCase().includes(term) ||
          String(c.priority || '').toLowerCase().includes(term)
        );
      };
      const badgeForStatus = (s) => {
        if (s === 'ASSIGNED') return '<span class="badge rounded-pill bg-warning text-dark">Assigned</span>';
        if (s === 'IN_PROGRESS') return '<span class="badge rounded-pill bg-primary">In Progress</span>';
        if (s === 'COMPLETE') return '<span class="badge rounded-pill bg-success">Completed</span>';
        if (s === 'CANCELED') return '<span class="badge rounded-pill bg-danger">Canceled</span>';
        return `<span class=\"badge rounded-pill bg-secondary\">${s || ''}</span>`;
      };
      const filtered = data.data.filter(c => matchesSearch(c));
      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / techPageSize));
      if (techCurrentPage > totalPages) techCurrentPage = totalPages;
      if (techCurrentPage < 1) techCurrentPage = 1;
      const startIndex = (techCurrentPage - 1) * techPageSize;
      const endIndex = Math.min(startIndex + techPageSize, total);
      const pageItems = filtered.slice(startIndex, endIndex);

      tbody.innerHTML = pageItems.map(c => {
        let action = '';
        if (c.status === 'ASSIGNED') {
          action = `
            <div class="btn-group btn-group-sm" role="group">
              <button class="btn btn-success accept-btn" data-id="${c.case_id}"><i class=\"fa fa-check me-1\"></i>Accept</button>
              <button class="btn btn-outline-danger reject-tech-btn" data-id="${c.case_id}"><i class=\"fa fa-xmark me-1\"></i>Reject</button>
            </div>
          `;
        } else if (c.status === 'IN_PROGRESS') {
          action = `<a href="../html/caseDetail.html?id=${c.case_id}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm"><i class=\"fa fa-eye me-1\"></i>View</a>`;
        } else if (c.status === 'COMPLETE') {
          action = `<a href="../html/caseDetail.html?id=${c.case_id}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm"><i class=\"fa fa-eye me-1\"></i>View</a>`;
        } else if (c.status === 'CANCELED') {
          action = `<a href="../html/caseDetail.html?id=${c.case_id}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm"><i class=\"fa fa-eye me-1\"></i>View</a>`;
        }
        // Format date based on case status
        let date = '';
        if (c.status === 'ASSIGNED' && c.assigned_status) {
          date = new Date(c.assigned_status).toLocaleDateString();
        } else if (c.status === 'IN_PROGRESS' && c.progress_status) {
          date = new Date(c.progress_status).toLocaleDateString();
        } else if (c.status === 'COMPLETE' && c.complete_status) {
          date = new Date(c.complete_status).toLocaleDateString();
        } else if (c.status === 'CANCELED' && c.canceled_status) {
          date = new Date(c.canceled_status).toLocaleDateString();
        }
        return `<tr>
          <td>${c.case_id}</td>
          <td class="truncate" title="${(c.description || '').replace(/"/g,'&quot;')}">${c.description}</td>
          <td>${badgeForStatus(c.status)}</td>
          <td class="d-none d-lg-table-cell">${c.type}</td>
          <td class="d-none d-lg-table-cell">${c.priority || ''}</td>
          <td class="d-none d-md-table-cell">${c.item_name || ''}</td>
          <td class="d-none d-xl-table-cell">${c.customer_name||''}</td>
          <td>${date}</td>
          <td>${action}</td>
        </tr>`;
      }).join('');

      renderTechPager({ total, start: startIndex + 1, end: endIndex, page: techCurrentPage, totalPages });
    }
    updateTechCounts();
    // Bind events
    document.querySelectorAll('.accept-btn').forEach(btn => {
      btn.onclick = async () => {
        const caseId = btn.getAttribute('data-id');
        const res = await authFetch(`/cases/${caseId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'IN_PROGRESS', technician_id: userId })
        });
        const data = await res.json();
        if (data.success) {
          alert('Case accepted!');
          loadCases(selectedStatus); // Reload the list
        } else {
          alert('Failed to accept case.');
        }
      };
    });
    document.querySelectorAll('.reject-tech-btn').forEach(btn => {
      btn.onclick = async () => {
        const caseId = btn.getAttribute('data-id');
        const reason = prompt('Please provide a reason for rejecting this case:');
        if (reason === null) return;
        
        const userId = localStorage.getItem('userId');
        
        // Post comment with reason tagged as technician
        await authFetch(`/cases/${caseId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: `Technician reject. Reason: ${reason}`, user_id: userId, user_role: 'technician' })
        });
        
        // Create admin notification for the rejection
        await authFetch(`/cases/${caseId}/rejection-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ technician_id: userId, reason: reason })
        });
        
        alert('Rejection submitted to admin.');
        loadCases(selectedStatus);
      };
    });
  }

  function renderTechPager({ total, start, end, page, totalPages }) {
    const pager = document.getElementById('tech-case-pager');
    if (!pager) return;
    if (total === 0) {
      pager.innerHTML = '<span class="text-muted small">No cases found.</span>';
      return;
    }
    pager.innerHTML = `
      <span class="text-muted small">Showing ${start}–${end} of ${total}</span>
      <div class="btn-group btn-group-sm" role="group">
        <button class="btn btn-outline-secondary" id="tech-case-prev" ${page <= 1 ? 'disabled' : ''}>Prev</button>
        <button class="btn btn-outline-secondary" id="tech-case-next" ${page >= totalPages ? 'disabled' : ''}>Next</button>
      </div>
    `;
    const prev = document.getElementById('tech-case-prev');
    const next = document.getElementById('tech-case-next');
    if (prev) prev.onclick = () => { if (techCurrentPage > 1) { techCurrentPage--; loadCases(selectedStatus); } };
    if (next) next.onclick = () => { if (techCurrentPage < totalPages) { techCurrentPage++; loadCases(selectedStatus); } };
  }
  
  function setActiveFilterBtn(activeId) {
    const filterButtons = ['btn-in-progress', 'btn-assigned', 'btn-completed', 'btn-canceled'];
    filterButtons.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        if (id === activeId) {
          // Make active button solid with its hover color
          if (id === 'btn-in-progress') btn.className = 'btn btn-primary';
          else if (id === 'btn-assigned') btn.className = 'btn btn-warning';
          else if (id === 'btn-completed') btn.className = 'btn btn-success';
          else if (id === 'btn-canceled') btn.className = 'btn btn-danger';
        } else {
          // Make inactive buttons outline
          if (id === 'btn-in-progress') btn.className = 'btn btn-outline-primary';
          else if (id === 'btn-assigned') btn.className = 'btn btn-outline-warning';
          else if (id === 'btn-completed') btn.className = 'btn btn-outline-success';
          else if (id === 'btn-canceled') btn.className = 'btn btn-outline-danger';
        }
      }
    });
  }
  
  // Bind button events
  document.getElementById('btn-assigned').onclick = () => {
    setActiveFilterBtn('btn-assigned');
    techCurrentPage = 1;
    loadCases('ASSIGNED');
  };
  document.getElementById('btn-in-progress').onclick = () => {
    setActiveFilterBtn('btn-in-progress');
    techCurrentPage = 1;
    loadCases('IN_PROGRESS');
  };
  document.getElementById('btn-completed').onclick = () => {
    setActiveFilterBtn('btn-completed');
    techCurrentPage = 1;
    loadCases('COMPLETE');
  };
  document.getElementById('btn-canceled').onclick = () => {
    setActiveFilterBtn('btn-canceled');
    techCurrentPage = 1;
    loadCases('CANCELED');
  };
  // Load default
  loadCases(selectedStatus);
}

// 技师列表
let technicians = [];

async function fetchTechnicians() {
  const res = await authFetch('/employees/technicians');
  const data = await res.json();
  if (data.success) {
    technicians = data.data;
  }
}

// 获取待处理工单
async function fetchCases() {
  const res = await authFetch('/cases?status=draft');
  const data = await res.json();
  if (!data.success) return [];
  return data.data;
}

// 渲染工单
function renderCases(cases) {
  const tbody = document.querySelector('#caseTable tbody');
  const badgeForStatus = (s) => {
    if (s === 'DRAFT') return '<span class="badge rounded-pill bg-warning text-dark">Draft</span>';
    if (s === 'ASSIGNED') return '<span class="badge rounded-pill bg-info text-dark">Assigned</span>';
    if (s === 'IN_PROGRESS') return '<span class="badge rounded-pill bg-primary">In Progress</span>';
    if (s === 'COMPLETE') return '<span class="badge rounded-pill bg-success">Completed</span>';
    if (s === 'CANCELED') return '<span class="badge rounded-pill bg-danger">Canceled</span>';
    return `<span class="badge rounded-pill bg-secondary">${s || ''}</span>`;
  };
  tbody.innerHTML = cases.map(c => `
    <tr>
      <td>${c.case_id}</td>
      <td>${c.description}</td>
      <td>${c.type}</td>
      <td>${badgeForStatus(c.status)}</td>
      <td>${c.customer_name}</td>
      <td>
        <select class="form-select form-select-sm tech-select" data-id="${c.case_id}">
          <option value="">Select</option>
          ${technicians.map(t => `<option value="${t.user_id}">${t.name}</option>`).join('')}
        </select>
      </td>
      <td>
        <button class="btn btn-success btn-sm accept-btn" data-id="${c.case_id}"><i class="fa-solid fa-user-check me-1"></i>Accept & Assign</button>
      </td>
    </tr>
  `).join('');
  bindAssignEvents();
}

// 绑定分配事件
function bindAssignEvents() {
  document.querySelectorAll('.accept-btn').forEach(btn => {
    btn.onclick = async function() {
      const caseId = btn.getAttribute('data-id');
      const techSelect = document.querySelector(`.tech-select[data-id="${caseId}"]`);
      const technician_id = techSelect.value;
      if (!technician_id) {
        alert('Please select a technician.');
        return;
      }
      const res = await fetch(`/cases/${caseId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technician_id })
      });
      const data = await res.json();
      if (data.success) {
        alert('Case assigned!');
        loadCases();
      } else {
        alert(data.message || 'Failed to assign.');
      }
    };
  });
}

// 加载工单
async function loadCases() {
  await fetchTechnicians();
  const cases = await fetchCases();
  renderCases(cases);
}

function logout() {
  localStorage.removeItem('token'); // or sessionStorage.removeItem('token');
  window.location.href = 'companyLogin.html';
}

// 页面加载时
window.onload = loadCases;