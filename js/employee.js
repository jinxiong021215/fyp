// Use token-protected requests inside iframe pages
async function authFetch(url, options = {}) {
  const t = localStorage.getItem('token');
  const headers = Object.assign({}, options.headers || {});
  if (t) headers['Authorization'] = `Bearer ${t}`;
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401 || res.status === 403) {
    try { localStorage.removeItem('token'); } catch {}
    // redirect whole app, not just iframe
    if (window.top) window.top.location.href = 'companyLogin.html';
    throw new Error('Unauthorized');
  }
  return res;
}

let adminList = [];
let technicianList = [];

// 渲染表格
function renderEmployeeTables() {
  // Admin
  const adminTbody = document.querySelector("#adminTable tbody");
  adminTbody.innerHTML = adminList.map(a => {
    const isActive = !a.status || a.status === 'ACTIVE';
    const statusBadge = isActive ? 
      '<span class="badge bg-success">Active</span>' : 
      '<span class="badge bg-danger">Inactive</span>';
    const actionButton = isActive ?
      `<button class="btn btn-sm btn-outline-danger btn-deactivate-admin" data-id="${a.user_id}">Deactivate</button>` :
      `<button class="btn btn-sm btn-outline-success btn-reactivate-admin" data-id="${a.user_id}">Reactivate</button>`;
    
    return `
      <tr>
        <td><a href="#" class="emp-name" data-role="admin" data-id="${a.user_id}">${a.name}</a></td>
        <td>${a.email}</td>
        <td>${a.phone}</td>
        <td>${statusBadge}</td>
        <td>${actionButton}</td>
      </tr>
    `;
  }).join('');
  // Technician
  const techTbody = document.querySelector("#technicianTable tbody");
  techTbody.innerHTML = technicianList.map(t => {
    let statusClass = '';
    let statusText = t.status;
    const isActive = t.status !== 'NON_ACTIVE';
    
    if (t.status === 'ON_DUTY') statusClass = 'bg-success';
    else if (t.status === 'TAKE_BREAK') statusClass = 'bg-warning text-dark';
    else if (t.status === 'NON_ACTIVE') statusClass = 'bg-danger';
    else statusClass = 'bg-secondary';
    
    const actionButton = isActive ?
      `<button class="btn btn-sm btn-outline-danger btn-deactivate-tech" data-id="${t.user_id}">Deactivate</button>` :
      `<button class="btn btn-sm btn-outline-success btn-reactivate-tech" data-id="${t.user_id}">Reactivate</button>`;
    
    return `
      <tr>
        <td><a href="#" class="emp-name" data-role="technician" data-id="${t.user_id}">${t.name}</a></td>
        <td>${t.email}</td>
        <td>${t.phone}</td>
        <td><span class="badge ${statusClass}">${statusText}</span></td>
        <td>${actionButton}</td>
      </tr>
    `;
  }).join('');
  bindActionButtons();
  bindEmployeeNameClicks();
}

// 获取员工数据
async function fetchEmployeeData() {
  // 获取Admin
  try {
    const resAdmin = await authFetch('/employees/admins');
    const dataAdmin = await resAdmin.json();
    adminList = dataAdmin.success ? dataAdmin.data : [];
  } catch {
    adminList = [];
  }
  // 获取Technician
  try {
    const resTech = await authFetch('/employees/technicians');
    const dataTech = await resTech.json();
    technicianList = dataTech.success ? dataTech.data : [];
  } catch {
    technicianList = [];
  }
}

// 绑定操作事件
function bindActionButtons() {
  // Admin deactivate buttons
  document.querySelectorAll('#adminTable .btn-deactivate-admin').forEach(btn => {
    btn.onclick = async function() {
      if (confirm('Deactivate this admin?')) {
        const id = btn.getAttribute('data-id');
        const res = await authFetch(`/employees/admins/${id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'NON_ACTIVE' })
        });
        const data = await res.json();
        if (data.success) {
          await fetchEmployeeData();
          renderEmployeeTables();
        } else {
          alert('Deactivate failed.');
        }
      }
    };
  });
  
  // Admin reactivate buttons
  document.querySelectorAll('#adminTable .btn-reactivate-admin').forEach(btn => {
    btn.onclick = async function() {
      if (confirm('Reactivate this admin?')) {
        const id = btn.getAttribute('data-id');
        const res = await authFetch(`/employees/admins/${id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ACTIVE' })
        });
        const data = await res.json();
        if (data.success) {
          await fetchEmployeeData();
          renderEmployeeTables();
        } else {
          alert('Reactivate failed.');
        }
      }
    };
  });
  
  // Technician deactivate buttons
  document.querySelectorAll('#technicianTable .btn-deactivate-tech').forEach(btn => {
    btn.onclick = async function() {
      if (confirm('Deactivate this technician?')) {
        const id = btn.getAttribute('data-id');
        const res = await authFetch(`/employees/technicians/${id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'NON_ACTIVE' })
        });
        const data = await res.json();
        if (data.success) {
          await fetchEmployeeData();
          renderEmployeeTables();
        } else {
          alert('Deactivate failed.');
        }
      }
    };
  });
  
  // Technician reactivate buttons
  document.querySelectorAll('#technicianTable .btn-reactivate-tech').forEach(btn => {
    btn.onclick = async function() {
      if (confirm('Reactivate this technician?')) {
        const id = btn.getAttribute('data-id');
        const res = await authFetch(`/employees/technicians/${id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'OFF_DUTY' })
        });
        const data = await res.json();
        if (data.success) {
          await fetchEmployeeData();
          renderEmployeeTables();
        } else {
          alert('Reactivate failed.');
        }
      }
    };
  });
}

// Bind click on employee name to open details + reset password modal
function bindEmployeeNameClicks() {
  document.querySelectorAll('.emp-name').forEach(a => {
    a.onclick = (e) => {
      e.preventDefault();
      const role = a.getAttribute('data-role');
      const id = a.getAttribute('data-id');
      openEmployeeDetailModal(role, id);
    };
  });
}

async function openEmployeeDetailModal(role, id) {
  // Find the record from cached lists
  const rec = role === 'admin' ? adminList.find(x => x.user_id == id) : technicianList.find(x => x.user_id == id);
  const box = document.getElementById('employeeDetails');
  if (!rec || !box) return;
  box.innerHTML = `
    <div class="mb-2"><strong>Role:</strong> ${role}</div>
    <div class="mb-2"><strong>User ID:</strong> ${rec.user_id}</div>
    <div class="mb-2 d-flex justify-content-between align-items-center">
      <div><strong>Name:</strong> <span id="empNameVal">${rec.name}</span></div>
      <button class="btn btn-sm btn-outline-secondary" id="btnEditName"><i class="fa fa-pen"></i> Edit</button>
    </div>
    <div class="mb-2 d-flex justify-content-between align-items-center">
      <div><strong>Email:</strong> <span id="empEmailVal">${rec.email}</span></div>
      <button class="btn btn-sm btn-outline-secondary" id="btnEditEmail"><i class="fa fa-pen"></i> Edit</button>
    </div>
    <div class="mb-2 d-flex justify-content-between align-items-center">
      <div><strong>Phone:</strong> <span id="empPhoneVal">${rec.phone}</span></div>
      <button class="btn btn-sm btn-outline-secondary" id="btnEditPhone"><i class="fa fa-pen"></i> Edit</button>
    </div>
    <div class="mb-2"><strong>Status:</strong> ${rec.status || ''}</div>
    <div class="mt-3">
      <button type="button" class="btn btn-primary btn-sm" id="btnOpenResetPassword">
        <i class="fa fa-key"></i> Reset Password
      </button>
    </div>
  `;
  // Open Reset Password popout
  const btnOpenReset = document.getElementById('btnOpenResetPassword');
  const resetModalEl = document.getElementById('resetPasswordModal');
  const resetModal = new bootstrap.Modal(resetModalEl);
  btnOpenReset.onclick = () => {
    document.getElementById('resetPass1').value = '';
    document.getElementById('resetPass2').value = '';
    resetModal.show();
  };
  // Keep details layer dim while reset popout is open
  resetModalEl.addEventListener('show.bs.modal', () => document.body.classList.add('dim-underlay'));
  resetModalEl.addEventListener('hidden.bs.modal', () => document.body.classList.remove('dim-underlay'));

  // Handle reset form submit
  document.getElementById('resetPasswordForm').onsubmit = async (e) => {
    e.preventDefault();
    const p1 = document.getElementById('resetPass1').value;
    const p2 = document.getElementById('resetPass2').value;
    if (!p1 || !p2) { alert('Please enter the new password twice.'); return; }
    if (p1 !== p2) { alert('Passwords do not match.'); return; }
    if (p1.length < 6) { alert('Password must be at least 6 characters.'); return; }
    const url = role === 'admin' ? `/employees/admins/${id}/password` : `/employees/technicians/${id}/password`;
    const res = await authFetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_password: p1 })
    });
    const data = await res.json();
    if (data.success) {
      resetModal.hide();
      alert('Password has been reset.');
    } else {
      alert(data.message || 'Failed to reset password.');
    }
  };
  new bootstrap.Modal(document.getElementById('employeeDetailModal')).show();

  // Wire per-field edit buttons -> generic modal
  const editModalEl = document.getElementById('editFieldModal');
  const editModal = new bootstrap.Modal(editModalEl);
  const editLabel = document.getElementById('editFieldLabel');
  const editHelp = document.getElementById('editFieldHelp');
  const editInput = document.getElementById('editFieldInput');
  let currentField = null;

  function openEdit(field, label, help, initial) {
    currentField = field;
    editLabel.textContent = label;
    editHelp.textContent = help || '';
    editInput.type = field === 'email' ? 'email' : 'text';
    editInput.value = initial || '';
    editModal.show();
    setTimeout(() => editInput.focus(), 100);
  }

  document.getElementById('btnEditName').onclick = () => openEdit('name', 'Edit Name', '', rec.name);
  document.getElementById('btnEditEmail').onclick = () => openEdit('email', 'Edit Email', 'Must be unique and valid email.', rec.email);
  document.getElementById('btnEditPhone').onclick = () => openEdit('phone', 'Edit Phone', 'Must be unique.', rec.phone);

  // Dim the underlying details modal while edit modal is open
  editModalEl.addEventListener('show.bs.modal', () => {
    document.body.classList.add('dim-underlay');
  });
  editModalEl.addEventListener('hidden.bs.modal', () => {
    document.body.classList.remove('dim-underlay');
  });

  document.getElementById('editFieldForm').onsubmit = async (e) => {
    e.preventDefault();
    const value = editInput.value.trim();
    if (!value) { alert('Please enter a value.'); return; }
    if (currentField === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) { alert('Please enter a valid email.'); return; }
    }
    const url = role === 'admin' ? `/employees/admins/${id}` : `/employees/technicians/${id}`;
    const body = { [currentField]: value };
    const res = await authFetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data && data.success) {
      // Update local cache and UI
      if (role === 'admin') {
        const ref = adminList.find(x => x.user_id == id);
        if (ref) ref[currentField] = value;
      } else {
        const ref = technicianList.find(x => x.user_id == id);
        if (ref) ref[currentField] = value;
      }
      if (currentField === 'name') document.getElementById('empNameVal').textContent = value;
      if (currentField === 'email') document.getElementById('empEmailVal').textContent = value;
      if (currentField === 'phone') document.getElementById('empPhoneVal').textContent = value;
      renderEmployeeTables();
      editModal.hide();
    } else {
      alert((data && data.message) || 'Update failed.');
    }
  };
}

// 添加员工
function setupAddEmployee() {
  document.getElementById('addEmployeeBtn').onclick = function() {
    document.getElementById('addEmployeeForm').reset();
    new bootstrap.Modal(document.getElementById('addEmployeeModal')).show();
  };
  document.getElementById('addEmployeeForm').onsubmit = async function(e) {
    e.preventDefault();
    const name = document.getElementById('employeeName').value.trim();
    const email = document.getElementById('employeeEmail').value.trim();
    const phone = document.getElementById('employeePhone').value.trim();
    const password = document.getElementById('employeePassword').value;
    const role = document.getElementById('employeeRole').value;
    if (!name || !email || !phone || !password || !role) {
      alert('Please fill all required fields.');
      return;
    }
    if (password.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }
    const res = await authFetch(`/register-${role}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, password })
    });
    const data = await res.json();
    if (data.success) {
      bootstrap.Modal.getInstance(document.getElementById('addEmployeeModal')).hide();
      await fetchEmployeeData();
      renderEmployeeTables();
    } else {
      alert(data.message || 'Add failed.');
    }
  };
}

// 初始化
window.onload = async function() {
  await fetchEmployeeData();
  renderEmployeeTables();
  setupAddEmployee();
};
