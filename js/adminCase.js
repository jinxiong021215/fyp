let technicians = [];

async function fetchTechnicians() {
  const res = await fetch('/employees/technicians');
  const data = await res.json();
  if (data.success) {
    technicians = data.data;
  }
}

async function fetchCases() {
  const res = await fetch('/cases?status=draft');
  const data = await res.json();
  if (!data.success) return [];
  return data.data;
}

function renderCases(cases) {
  const tbody = document.querySelector('#caseTable tbody');
  tbody.innerHTML = cases.map(c => `
    <tr>
      <td>${c.case_id}</td>
      <td>${c.description}</td>
      <td>${c.type}</td>
      <td>${c.status}</td>
      <td>${c.customer_id}</td>
      <td>
        <select class="form-select form-select-sm tech-select" data-id="${c.case_id}">
          <option value="">Select</option>
          ${technicians.map(t => `<option value="${t.user_id}">${t.name}</option>`).join('')}
        </select>
      </td>
      <td>
        <button class="btn btn-success btn-sm accept-btn" data-id="${c.case_id}">Accept & Assign</button>
      </td>
    </tr>
  `).join('');
  bindAssignEvents();
}

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

async function loadCases() {
  await fetchTechnicians();
  const cases = await fetchCases();
  renderCases(cases);
}

window.onload = loadCases;