// caseDetail.js

let caseId; // Global variable for case ID
let caseData; // Global variable for case data
let paymentInitialized = false; // Track if payment handlers are set up

// Add: helper to attach JWT to all requests and auto-redirect on 401/403
async function authFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401 || res.status === 403) {
    try { alert('Session expired or unauthorized. Please log in again.'); } catch (e) {}
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('role');
    localStorage.removeItem('userName');
    window.location.href = 'login.html';
    throw new Error('Unauthorized');
  }
  return res;
}

document.addEventListener('DOMContentLoaded', async function() {
  const urlParams = new URLSearchParams(window.location.search);
  caseId = urlParams.get('id');
  if (!caseId) return;

  // Check authentication and authorization
  const userId = localStorage.getItem('userId');
  const userRole = localStorage.getItem('role');
  
  if (!userId || !userRole) {
    // User not logged in, redirect to login
    window.location.href = 'login.html';
    return;
  }

  // load case details
  const caseRes = await authFetch(`/cases/${caseId}`);
  const caseResponse = await caseRes.json();
  
  if (!caseResponse.success) {
    alert('Case not found or access denied');
    window.location.href = 'login.html';
    return;
  }
  
  const caseDataTemp = caseResponse.data;
  
  // Get all assigned technicians for this case
  const assignedTechRes = await authFetch(`/cases/${caseId}/assigned-technicians`);
  let allAssignedTechs = [];
  if (assignedTechRes.ok) {
    const assignedData = await assignedTechRes.json();
    if (assignedData.success && Array.isArray(assignedData.data)) {
      allAssignedTechs = assignedData.data;
    }
  }
  
  // Check authorization
  let isAuthorized = false;
  if (userRole === 'admin') {
    isAuthorized = true;
  } else if (userRole === 'technician' && allAssignedTechs.length > 0) {
    // Check if this technician is assigned to the case
    isAuthorized = allAssignedTechs.some(tech => tech.user_id == userId);
  } else if (userRole === 'customer' && caseDataTemp) {
    // Allow the related customer to view their own case
    isAuthorized = String(caseDataTemp.customer_id) === String(userId);
  }
  
  if (!isAuthorized) {
    alert('You are not authorized to view this case');
    window.location.href = 'login.html';
    return;
  }

  if (caseResponse.success && caseResponse.data) {
    caseData = caseResponse.data; // Store globally
    renderCaseInfo(caseData);
    renderAssignedTech(allAssignedTechs); // Pass all assigned technicians
    renderActivityLog(caseData.activity || []);
    updateActivityLogFormState(); // Update form visibility based on role
  }

  // Load comments
  loadComments();

  // Load activity log
  loadActivityLog();

  // Comment submission
  document.getElementById('comment-form').onsubmit = async function(e) {
    e.preventDefault();
    
    // Check if case is closed
    if (caseData && (caseData.status === 'CANCELED' || caseData.status === 'COMPLETE' || caseData.status === 'PAID')) {
      alert('Cannot add comments to a closed case.');
      return;
    }
    
    const content = document.getElementById('comment-input').value.trim();
    if (!content) return;
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('role');
    if (!userId || !userRole) {
      alert('User not logged in');
      return;
    }
    await authFetch(`/cases/${caseId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, user_id: userId, user_role: userRole })
    });
    document.getElementById('comment-input').value = '';
    loadComments();
  };

  // Activity log form submission
  document.getElementById('activity-form').onsubmit = function(e) {
    e.preventDefault();
    const activity = document.getElementById('activity-input').value.trim();
    if (!activity) return;
    
    const userRole = localStorage.getItem('role');
    if (userRole !== 'technician') {
      alert('Only technicians can add activity log entries.');
      return;
    }
    
    // Check if case is closed
    if (caseData && (caseData.status === 'CANCELED' || caseData.status === 'COMPLETE' || caseData.status === 'PAID')) {
      alert('Cannot add activity updates to a closed case.');
      return;
    }
    
    addActivityLogEntry(activity);
    document.getElementById('activity-input').value = '';
  };

  // Disable commenting if case is closed
  updateCommentFormState();

  // Show/hide activity log form based on user role
  updateActivityLogFormState();

  async function loadComments() {
    const res = await authFetch(`/cases/${caseId}/comments`);
    const data = await res.json();
    const list = document.getElementById('comment-list');
    if (data.success && Array.isArray(data.data)) {
      list.innerHTML = data.data.map(c => {
        const formattedTime = c.created_at ? new Date(c.created_at).toLocaleString() : '';
        // Determine icon and color based on user role
        let iconClass = '';
        let iconColor = '';
        if (c.user_role === 'admin') {
          iconClass = 'fa-solid fa-user-shield';
          iconColor = 'text-warning';
        } else if (c.user_role === 'technician') {
          iconClass = 'fa-solid fa-user-gear';
          iconColor = 'text-primary';
        } else if (c.user_role === 'customer') {
          iconClass = 'fa-solid fa-user-check';
          iconColor = 'text-success';
        }
        const roleLabel = c.user_role ? (c.user_role.charAt(0).toUpperCase() + c.user_role.slice(1)) : 'User';
        const nameLabel = c.author_name || 'Unknown';
        return `
          <div class="list-group-item">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <i class="${iconClass} ${iconColor} me-2"></i>
                <b>${nameLabel}</b>
                <span class="text-muted">• ${roleLabel}</span>
              </div>
              <span class="text-muted small text-nowrap">${formattedTime}</span>
            </div>
            <div class="mt-1">${c.content}</div>
          </div>
        `;
      }).join('');
    } else {
      list.innerHTML = '<div class="list-group-item text-muted">No comments yet.</div>';
    }
  }

  function loadActivityLog() {
    const activityLogs = getActivityLogs();
    renderActivityLog(activityLogs);
  }

  function addActivityLogEntry(activity) {
    const userId = localStorage.getItem('userId');
    const userName = localStorage.getItem('userName') || 'Unknown User';
    const timestamp = new Date().toLocaleString();
    
    const entry = {
      userId: userId,
      userName: userName,
      activity: activity,
      timestamp: timestamp
    };
    
    const activityLogs = getActivityLogs();
    activityLogs.push(entry);
    saveActivityLogs(activityLogs);
    renderActivityLog(activityLogs);
  }

  function getActivityLogs() {
    const logs = localStorage.getItem(`activityLog_${caseId}`);
    return logs ? JSON.parse(logs) : [];
  }

  function saveActivityLogs(logs) {
    localStorage.setItem(`activityLog_${caseId}`, JSON.stringify(logs));
  }
});

function renderCaseInfo(c) {
  const assignedDate = c.assigned_status ? new Date(c.assigned_status).toLocaleString() : '';
  const role = localStorage.getItem('role');
  let buttons = '';
  if (role === 'admin' && c.status === 'IN_PROGRESS') {
    buttons = `
      <div class="mt-3 d-flex flex-wrap gap-2">
        <button class="btn btn-danger" id="cancel-btn"><i class="fa-solid fa-ban me-1"></i> Cancel Case</button>
        <button class="btn btn-success" id="complete-btn"><i class="fa-regular fa-circle-check me-1"></i> Complete Case</button>
      </div>
    `;
  } else if (role === 'admin' && c.status === 'ASSIGNED') {
    buttons = `
      <div class="mt-3 d-flex flex-wrap gap-2">
        <button class="btn btn-danger" id="cancel-btn"><i class="fa-solid fa-ban me-1"></i> Cancel Case</button>
      </div>
    `;
  }
  // Customer pay button when case is complete and bill exists (but not paid yet)
  let customerPayHtml = '';
  if (role === 'customer' && c.status === 'COMPLETE' && c.bill_id) {
    customerPayHtml = `
      <div class="mt-3">
        <button class="btn btn-success" id="pay-btn"><i class="fa-solid fa-credit-card me-1"></i> Pay</button>
      </div>
    `;
  } else if (role === 'customer' && c.status === 'PAID') {
    customerPayHtml = `
      <div class="mt-3">
        <button class="btn btn-secondary" disabled><i class="fa-solid fa-check me-1"></i> Paid</button>
      </div>
    `;
  }
  let statusBanner = '';
  if (c.status === 'CANCELED') {
    statusBanner = `<div class="alert alert-danger text-center"><h1 class="display-6 text-danger m-0"><i class=\"fa-regular fa-circle-xmark me-2\"></i>CANCELED</h1></div>`;
  } else if (c.status === 'COMPLETE') {
    statusBanner = `<div class="alert alert-success text-center"><h1 class="display-6 text-success m-0"><i class=\"fa-regular fa-circle-check me-2\"></i>COMPLETE</h1></div>`;
  } else if (c.status === 'PAID') {
    statusBanner = `<div class="alert alert-dark text-center"><h1 class="display-6 text-white m-0"><i class=\"fa-solid fa-credit-card me-2\"></i>PAID</h1></div>`;
  }
  const statusBadge = (s) => {
    if (s === 'DRAFT') return '<span class="badge rounded-pill bg-warning text-dark">Draft</span>';
    if (s === 'ASSIGNED') return '<span class="badge rounded-pill bg-info text-dark">Assigned</span>';
    if (s === 'IN_PROGRESS') return '<span class="badge rounded-pill bg-primary">In Progress</span>';
    if (s === 'COMPLETE') return '<span class="badge rounded-pill bg-success">Completed</span>';
    if (s === 'CANCELED') return '<span class="badge rounded-pill bg-danger">Canceled</span>';
    if (s === 'PAID') return '<span class="badge rounded-pill bg-dark">Paid</span>';
    return `<span class="badge rounded-pill bg-secondary">${s || ''}</span>`;
  };
  const priceLine = (typeof c.bill_amount !== 'undefined' && c.bill_amount !== null) ? ` • $${Number(c.bill_amount || 0).toFixed(2)}` : '';
  document.getElementById('case-info').innerHTML = `
    <div class="card-header bg-white d-flex justify-content-between align-items-center">
      <div>
        <h5 class="mb-0"><i class="fa-regular fa-clipboard me-2"></i>Case #${c.case_id}</h5>
        <div class="text-muted small">${c.type || ''} • ${c.item_name || ''}${priceLine}</div>
      </div>
      <div>${statusBadge(c.status)}</div>
    </div>
    <div class="card-body">
      ${statusBanner}
      <div class="row g-3">
        <div class="col-md-6">
          <div><b><i class=\"fa-regular fa-note-sticky me-2\"></i>Description:</b> ${c.description || ''}</div>
          <div><b><i class=\"fa-regular fa-user me-2\"></i>Customer:</b> ${c.customer_name || ''}</div>
          <div><b><i class=\"fa-solid fa-location-dot me-2\"></i>Location:</b> ${c.location || ''}</div>
        </div>
        <div class="col-md-6">
          <div><b><i class=\"fa-regular fa-calendar-check me-2\"></i>Assigned:</b> ${assignedDate || '-'}</div>
          <div><b><i class=\"fa-solid fa-signal me-2\"></i>Priority:</b> ${c.priority || ''}</div>
          <div><b><i class=\"fa-solid fa-user-shield me-2\"></i>Accepted by:</b> ${c.admin_name ? `${c.admin_name} (${c.admin_email || ''})` : '-'}</div>
        </div>
      </div>
      ${c.bill_id ? `<div class="mt-3"><b><i class=\"fa-regular fa-file-lines me-2\"></i>Bill Amount:</b> $${Number(c.bill_amount || 0).toFixed(2)}</div>` : ''}
      ${buttons}
      ${customerPayHtml}
    </div>
  `;
  // Update global case data
  caseData = c;
  // Update comment form state
  updateCommentFormState();
  // Update activity log form state
  updateActivityLogFormState();
  
  // Add event listeners if buttons exist
  if (role === 'admin') {
    const cancelBtn = document.getElementById('cancel-btn');
    const completeBtn = document.getElementById('complete-btn');
    
    if (cancelBtn) {
      cancelBtn.onclick = async () => {
        const reason = prompt('Please provide a reason for canceling this case:');
        if (reason === null) return; // user canceled
        await updateCaseStatus(caseId, 'CANCELED', { reason });
        // Reload case data
        const caseRes = await authFetch(`/cases/${caseId}`);
        const caseData = await caseRes.json();
        if (caseData.success) renderCaseInfo(caseData.data);
      };
    }
    if (completeBtn) {
      completeBtn.onclick = async () => {
        await updateCaseStatus(caseId, 'COMPLETE');
        // Reload case data
        const caseRes = await authFetch(`/cases/${caseId}`);
        const caseData = await caseRes.json();
        if (caseData.success) renderCaseInfo(caseData.data);
      };
    }
  }
  
  // Set up payment functionality once
  if (role === 'customer' && c.status === 'COMPLETE' && c.bill_id && !paymentInitialized) {
    setupPaymentHandlers(c);
    paymentInitialized = true;
  }
  
  // Customer payment handlers
  if (role === 'customer' && c.status === 'COMPLETE' && c.bill_id) {
    const payBtn = document.getElementById('pay-btn');
    if (payBtn && !payBtn.hasAttribute('data-payment-setup')) {
      payBtn.setAttribute('data-payment-setup', 'true');
      payBtn.onclick = () => initatePayment(c);
    }
  }
}
async function updateCaseStatus(caseId, status, extra = {}) {
  try {
    const res = await authFetch(`/cases/${caseId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...extra, user_id: localStorage.getItem('userId') })
    });
    const data = await res.json();
    if (data.success) {
      alert(`Case ${status.toLowerCase()} successfully.`);
    } else {
      alert('Failed to update case status.');
    }
  } catch (error) {
    console.error('Error updating case status:', error);
    alert('Error updating case status.');
  }
}
function renderAssignedTech(assignedTech) {
  const role = localStorage.getItem('role');
  
  if (assignedTech && Array.isArray(assignedTech) && assignedTech.length > 0) {
    // Show technicians in a table format with remove buttons for admins
    const onlyOneAssigned = assignedTech.length === 1;
    const techRows = assignedTech.map(tech => {
      const removeButton = role === 'admin' && caseData && (caseData.status === 'ASSIGNED' || caseData.status === 'IN_PROGRESS') ? 
        `<button class="btn btn-sm btn-outline-danger remove-tech-btn" data-tech-id="${tech.user_id}" data-tech-name="${tech.name}" ${onlyOneAssigned ? 'disabled title="Cannot remove the last assigned technician"' : ''}>
          <i class="fa-solid fa-user-minus me-1"></i>Remove
        </button>` : '';
      
      return `
        <tr>
          <td>
            <i class="fas fa-user text-primary me-2"></i>
            <strong>${tech.name}</strong>
          </td>
          <td>${tech.email}</td>
          <td>${removeButton}</td>
        </tr>
      `;
    }).join('');
    
    const addButton = role === 'admin' && caseData && (caseData.status === 'ASSIGNED' || caseData.status === 'IN_PROGRESS') ? 
      `<button class="btn btn-sm btn-success mb-2" id="add-technician-btn">
        <i class="fa-solid fa-user-plus me-1"></i>Add Technician
      </button>` : '';

    document.getElementById('assigned-tech').innerHTML = `
      <div class="fw-bold mb-2">Assigned Technicians:</div>
      ${addButton}
      <table class="table table-sm table-hover">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${techRows}
        </tbody>
      </table>
    `;
    
    // Bind remove buttons
    document.querySelectorAll('.remove-tech-btn').forEach(btn => {
      if (btn.disabled) return; // Skip binding if disabled
      btn.onclick = async () => {
        const techId = btn.getAttribute('data-tech-id');
        const techName = btn.getAttribute('data-tech-name');
        
        if (confirm(`Remove ${techName} from this case?`)) {
          await removeTechnicianFromCase(techId);
        }
      };
    });
    
    // Bind add technician button
    const addTechBtn = document.getElementById('add-technician-btn');
    if (addTechBtn && !addTechBtn.getAttribute('data-handler')) {
      addTechBtn.setAttribute('data-handler', '1');
      addTechBtn.onclick = () => openAddTechModal();
    }
    
  } else {
    const addButton = role === 'admin' && caseData && (caseData.status === 'ASSIGNED' || caseData.status === 'IN_PROGRESS') ? 
      `<button class="btn btn-sm btn-success" id="add-technician-btn">
        <i class="fa-solid fa-user-plus me-1"></i>Add Technician
      </button>` : '';
    
    document.getElementById('assigned-tech').innerHTML = `
      <div class="text-muted mb-2">
        <i class="fas fa-user-slash me-2"></i>
        No technician assigned.
      </div>
      ${addButton}
    `;
    
    // Bind add technician button
    const addTechBtn = document.getElementById('add-technician-btn');
    if (addTechBtn && !addTechBtn.getAttribute('data-handler')) {
      addTechBtn.setAttribute('data-handler', '1');
      addTechBtn.onclick = () => openAddTechModal();
    }
  }
}
function renderActivityLog(logs) {
  const activityLogElement = document.getElementById('activity-log');
  if (logs && logs.length > 0) {
    activityLogElement.innerHTML = logs.map(log => `
      <li class="list-group-item">
        <div class="d-flex justify-content-between align-items-start">
          <div class="me-3 flex-grow-1">
            <i class=\"fa-regular fa-comment-dots me-2 text-muted\"></i>
            <strong>${log.userName}</strong>: <span class="text-body">${log.activity}</span>
          </div>
          <span class="text-muted small ms-2 text-nowrap">${log.timestamp}</span>
        </div>
      </li>
    `).join('');
  } else {
    activityLogElement.innerHTML = '<li class="list-group-item text-muted">No activity updates yet.</li>';
  }
}

// Function to update activity log form state based on user role and case status
function updateActivityLogFormState() {
  const activityForm = document.getElementById('activity-log-form');
  const activityInput = document.getElementById('activity-input');
  const submitBtn = document.getElementById('activity-form').querySelector('button[type="submit"]');
  const userRole = localStorage.getItem('role');
  
  if (userRole === 'technician' && caseData && (caseData.status !== 'CANCELED' && caseData.status !== 'COMPLETE' && caseData.status !== 'PAID')) {
    activityForm.style.display = 'block';
    activityInput.disabled = false;
    activityInput.placeholder = 'Add activity update...';
    if (submitBtn) {
      submitBtn.disabled = false;
    }
  } else {
    if (userRole === 'technician') {
      activityForm.style.display = 'block';
      activityInput.disabled = true;
      activityInput.placeholder = 'Activity log disabled for closed cases';
      if (submitBtn) {
        submitBtn.disabled = true;
      }
    } else {
      activityForm.style.display = 'none';
    }
  }
}

// Function to update comment form state based on case status
function updateCommentFormState() {
  const commentForm = document.getElementById('comment-form');
  const commentInput = document.getElementById('comment-input');
  const submitBtn = commentForm ? commentForm.querySelector('button[type="submit"]') : null;
  
  if (!commentForm || !commentInput) return;
  
  if (caseData && (caseData.status === 'CANCELED' || caseData.status === 'COMPLETE' || caseData.status === 'PAID')) {
    // Disable commenting for closed cases
    commentInput.disabled = true;
    commentInput.placeholder = 'Comments are disabled for closed cases';
    commentInput.value = '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Comments Disabled';
    }
    commentForm.style.opacity = '0.6';
  } else {
    // Enable commenting for open cases
    commentInput.disabled = false;
    commentInput.placeholder = 'Add a comment...';
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Post Comment';
    }
    commentForm.style.opacity = '1';
  }
}

// Function to open add technician modal and populate with qualified technicians
async function openAddTechModal() {
  try {
    // Get case data to find item_id for skill matching
    const caseRes = await authFetch(`/cases/${caseId}`);
    const caseResponse = await caseRes.json();
    
    if (!caseResponse.success) {
      alert('Error loading case data');
      return;
    }

    const itemId = caseResponse.data.item_id;
    console.log('Case item_id:', itemId); // Debug log
    
    // Get all currently assigned technicians for this case
    const assignedTechRes = await authFetch(`/cases/${caseId}/assigned-technicians`);
    let assignedTechIds = [];
    if (assignedTechRes.ok) {
      const assignedData = await assignedTechRes.json();
      if (assignedData.success && Array.isArray(assignedData.data)) {
        assignedTechIds = assignedData.data.map(tech => tech.user_id);
      }
    }
    console.log('Already assigned technician IDs:', assignedTechIds); // Debug log
    
    // Get all technicians
    const techRes = await authFetch('/employees/technicians');
    const techData = await techRes.json();
    
    if (techData.success && Array.isArray(techData.data)) {
      const onDutyTechs = techData.data.filter(t => t.status === 'ON_DUTY');
      
      // Fetch skills for each technician and check for match
      const techPromises = onDutyTechs.map(async (t) => {
        // Skip if already assigned to this case
        if (assignedTechIds.includes(t.user_id)) {
          return { ...t, hasMatchingSkill: false, alreadyAssigned: true };
        }
        
        const skillRes = await authFetch(`/employees/technicians/${t.user_id}/skills`);
        const skillData = await skillRes.json();
        let hasMatchingSkill = false;
        
        if (skillData.success && Array.isArray(skillData.data)) {
          hasMatchingSkill = skillData.data.some(skill => skill.item_id == itemId);
        }
        
        console.log(`Tech ${t.name} skills:`, skillData.data, 'Match:', hasMatchingSkill); // Debug log
        return { ...t, hasMatchingSkill, alreadyAssigned: false };
      });
      
      const techsWithSkills = await Promise.all(techPromises);
      
      // Only show technicians with matching skills who are not already assigned
      const availableTechs = techsWithSkills.filter(t => t.hasMatchingSkill && !t.alreadyAssigned);
      
      // Populate modal with qualified technicians
      const techList = document.getElementById('add-tech-list');
      if (availableTechs.length === 0) {
        techList.innerHTML = '<div class="alert alert-warning">No additional qualified technicians are available for this case.</div>';
      } else {
        techList.innerHTML = availableTechs.map(tech => 
          `<div class="technician-item mb-2">
            <input type="checkbox" class="form-check-input me-2" id="tech-${tech.user_id}" value="${tech.user_id}">
            <label for="tech-${tech.user_id}" class="form-check-label">
              ${tech.name} (${tech.email})
            </label>
          </div>`
        ).join('');
      }
      
      // Add event listener to confirm button
      const confirmBtn = document.getElementById('add-tech-confirm-btn');
      if (confirmBtn && !confirmBtn.getAttribute('data-handler')) {
        confirmBtn.setAttribute('data-handler', '1');
        confirmBtn.onclick = assignSelectedTechnicians;
      }
      
      // Show the modal
  let modal = bootstrap.Modal.getInstance(document.getElementById('addTechModal'));
  if (!modal) modal = new bootstrap.Modal(document.getElementById('addTechModal')); 
  modal.show();
    } else {
      alert('Error loading technicians data');
    }
  } catch (error) {
    console.error('Error loading technicians:', error);
    alert('Error loading technicians: ' + error.message);
  }
}

// Function to remove technician from case
async function removeTechnicianFromCase(techId) {
  try {
    const response = await authFetch(`/cases/${caseId}/technicians/${techId}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    if (result.success) {
      alert('Technician removed successfully');
      
      // Reload assigned technicians
      const assignedTechRes = await authFetch(`/cases/${caseId}/assigned-technicians`);
      if (assignedTechRes.ok) {
        const assignedData = await assignedTechRes.json();
        if (assignedData.success) {
          renderAssignedTech(assignedData.data);
        }
      }
    } else {
      alert('Failed to remove technician: ' + (result.message || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error removing technician:', error);
    alert('Error removing technician: ' + error.message);
  }
}

// Function to assign selected technicians to the case
async function assignSelectedTechnicians() {
  const selectedTechs = Array.from(document.querySelectorAll('#add-tech-list input[type="checkbox"]:checked'))
    .map(checkbox => checkbox.value);
  
  if (selectedTechs.length === 0) {
    alert('Please select at least one technician');
    return;
  }
  
  try {
    // Assign each selected technician (similar to intraDashboard logic)
    for (const techId of selectedTechs) {
      const response = await authFetch(`/cases/${caseId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          technician_id: techId
        })
      });
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(`Failed to assign technician ${techId}: ${result.message || 'Unknown error'}`);
      }
    }
    
    alert('Technicians assigned successfully');
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('addTechModal'));
    if (modal) {
      modal.hide();
    }
    
    // Reload assigned technicians
    const assignedTechRes = await authFetch(`/cases/${caseId}/assigned-technicians`);
    if (assignedTechRes.ok) {
      const assignedData = await assignedTechRes.json();
      if (assignedData.success) {
        renderAssignedTech(assignedData.data);
      }
    }
    
  } catch (error) {
    console.error('Error assigning technicians:', error);
    alert('Error assigning technicians: ' + error.message);
  }
}

// Set up payment functionality once to avoid duplicate handlers
function setupPaymentHandlers(caseData) {
  console.log('Setting up payment handlers for case:', caseData.case_id);
  const confirmBtn = document.getElementById('confirm-pay-btn');
  if (confirmBtn && !confirmBtn.hasAttribute('data-handler-setup')) {
    confirmBtn.setAttribute('data-handler-setup', 'true');
    confirmBtn.onclick = async () => {
      try {
        console.log('Confirm payment clicked for bill_id:', caseData.bill_id);
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i> Processing...';
        
        const resp = await authFetch('/payments/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bill_id: caseData.bill_id })
        });
        const result = await resp.json();
        
        console.log('Payment completion response:', result);
        
        if (result.success) {
          const modal = bootstrap.Modal.getInstance(document.getElementById('receiptModal'));
          if (modal) modal.hide();
          alert('Payment completed. Thank you!');
          window.location.reload();
        } else {
          console.error('Payment failed:', result.message);
          alert(result.message || 'Payment failed');
          confirmBtn.disabled = false;
          confirmBtn.innerHTML = '<i class="fa-solid fa-check me-1"></i> Confirm Pay';
        }
      } catch (e) {
        console.error('Payment processing error:', e);
        alert('Payment processing failed');
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fa-solid fa-check me-1"></i> Confirm Pay';
      }
    };
  }
}

// Initiate payment process
async function initatePayment(caseData) {
  try {
    console.log('Initiating payment for case:', caseData.case_id, 'bill_id:', caseData.bill_id);
    // Fetch bill/payment details
    const res = await authFetch(`/cases/${caseData.case_id}/bill`);
    const data = await res.json();
    
    console.log('Bill data response:', data);
    
    if (data.success && data.data && data.data.bill) {
      // Update modal content
      document.getElementById('receipt-case-id').textContent = caseData.case_id;
      document.getElementById('receipt-bill-id').textContent = caseData.bill_id;
      const amount = Number(data.data.bill.amount || 0).toFixed(2);
      document.getElementById('receipt-amount').textContent = `$${amount}`;
      
      // Show modal
      const modal = new bootstrap.Modal(document.getElementById('receiptModal'));
      modal.show();
    } else {
      console.error('Bill not found:', data);
      alert('Bill not found');
    }
  } catch (e) {
    console.error('Payment initialization error:', e);
    alert('Failed to load receipt');
  }
}
