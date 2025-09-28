// only allow admin、technician、company to login
document.getElementById('login-form').onsubmit = async function(e) {
  e.preventDefault();
  const emailOrCompany = document.getElementById('loginEmail').value.trim();
  const passwordOrSSN = document.getElementById('loginPassword').value;
  const feedback = document.getElementById('login-feedback');
  feedback.style.display = 'none';

  // check if it's a company login (if not email format, treat as company_name)
  let body = {};
  const isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailOrCompany);
  if (isEmail) {
    body = { email: emailOrCompany, password: passwordOrSSN };
  } else {
    body = { company_name: emailOrCompany, company_ssn: passwordOrSSN };
  }

  const res = await fetch('/login-intra', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (data.success) {
    if (['admin', 'technician', 'company'].includes(data.role)) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      localStorage.setItem('userId', data.userId);
      localStorage.setItem('userName', data.name);
      if (data.role === 'company') {
        localStorage.setItem('companyName', data.company_name || '');
        localStorage.setItem('companyLocation', data.company_location || '');
        localStorage.setItem('companySSN', data.company_ssn || '');
      }
      window.location.href = 'intraDashboard.html';
    } else {
      feedback.textContent = 'Only employees can login here.';
      feedback.style.display = 'block';
    }
  } else {
    feedback.textContent = data.message || 'Login failed.';
    feedback.style.display = 'block';
  }
};