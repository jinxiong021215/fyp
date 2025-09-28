// Use token-protected requests inside iframe pages
async function authFetch(url, options = {}) {
  const t = localStorage.getItem('token');
  const headers = Object.assign({}, options.headers || {});
  if (t) headers['Authorization'] = `Bearer ${t}`;
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401 || res.status === 403) {
    try { localStorage.removeItem('token'); } catch {}
    if (window.top) window.top.location.href = 'companyLogin.html';
    throw new Error('Unauthorized');
  }
  return res;
}

let itemList = [];

// 渲染表格
function renderItemTable() {
  const tbody = document.querySelector("#itemTable tbody");
  tbody.innerHTML = itemList.map(item => `
    <tr>
      <td>${item.item_name}</td>
      <td>${item.price}</td>
      <td>
        <button class="btn btn-sm btn-warning btn-edit" data-id="${item.item_id}">Edit</button>
        <button class="btn btn-sm btn-danger btn-delete" data-id="${item.item_id}">Delete</button>
      </td>
    </tr>
  `).join('');
  bindItemButtons();
}

// 获取数据
async function fetchItemData() {
  try {
    const res = await authFetch('/items');
    const data = await res.json();
    itemList = data.success ? data.data : [];
  } catch {
    itemList = [];
  }
}

// 绑定按钮
function bindItemButtons() {
  // 编辑
  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.onclick = function() {
      const id = btn.getAttribute('data-id');
      const item = itemList.find(i => i.item_id == id);
      if (item) {
        document.getElementById('itemId').value = item.item_id;
        document.getElementById('itemName').value = item.item_name;
        document.getElementById('itemPrice').value = item.price;
        document.getElementById('itemModalLabel').textContent = 'Edit Item';
        new bootstrap.Modal(document.getElementById('itemModal')).show();
      }
    };
  });
  // 删除
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.onclick = async function() {
      if (confirm('Delete this item?')) {
        const id = btn.getAttribute('data-id');
        const res = await authFetch(`/items/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          await fetchItemData();
          renderItemTable();
        } else {
          alert('Delete failed.');
        }
      }
    };
  });
}

// 添加/编辑
function setupItemForm() {
  document.getElementById('addItemBtn').onclick = function() {
    document.getElementById('itemForm').reset();
    document.getElementById('itemId').value = '';
    document.getElementById('itemModalLabel').textContent = 'Add Item';
    new bootstrap.Modal(document.getElementById('itemModal')).show();
  };
  document.getElementById('itemForm').onsubmit = async function(e) {
    e.preventDefault();
    const id = document.getElementById('itemId').value;
    const name = document.getElementById('itemName').value.trim();
    const price = document.getElementById('itemPrice').value;
    let res, data;
    if (id) {
      // 编辑
      res = await authFetch(`/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_name: name, price })
      });
    } else {
      // 新增
      res = await authFetch('/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_name: name, price })
      });
    }
    data = await res.json();
    if (data.success) {
      bootstrap.Modal.getInstance(document.getElementById('itemModal')).hide();
      await fetchItemData();
      renderItemTable();
    } else {
      alert(data.message || 'Operation failed.');
    }
  };
}

// 初始化
window.onload = async function() {
  await fetchItemData();
  renderItemTable();
  setupItemForm();
};