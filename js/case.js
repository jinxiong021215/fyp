document.getElementById('caseForm').onsubmit = async function(e) {
  e.preventDefault();
  const description = document.getElementById('caseDesc').value.trim();
  const type = document.getElementById('caseType').value;
  // 假设已登录，customer_id 存在 localStorage
  const customer_id = localStorage.getItem('userId');
  const res = await fetch('/cases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, type, customer_id })
  });
  const data = await res.json();
  const feedback = document.getElementById('case-feedback');
  if (data.success) {
    feedback.textContent = 'Case drafted successfully!';
    feedback.style.display = 'block';
    document.getElementById('caseForm').reset();
  } else {
    feedback.textContent = data.message || 'Failed to draft case.';
    feedback.style.display = 'block';
    feedback.classList.remove('text-success');
    feedback.classList.add('text-danger');
  }
};