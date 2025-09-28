// resetPassword.js
// Page that lets a customer set a new password after email verification on Forgot Password

const form = document.getElementById('reset-form');
const p1 = document.getElementById('newPass1');
const p2 = document.getElementById('newPass2');
const feedback = document.getElementById('reset-feedback');
const emailLine = document.getElementById('reset-email-line');
const emailLabel = document.getElementById('resetEmailLabel');

function showFeedback(msg, ok) {
  feedback.textContent = msg;
  feedback.style.display = 'block';
  feedback.classList.remove('text-danger', 'text-success');
  feedback.classList.add(ok ? 'text-success' : 'text-danger');
}

if (form) {
  // Prefill email display from session or token
  (async () => {
    let email = null;
    try { email = sessionStorage.getItem('resetEmail') || null; } catch {}
    if (!email) {
      // Fallback: try to derive from logged-in token info if present
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');
      if (token && userId) {
        try {
          const res = await fetch('/customers');
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            const me = data.data.find(c => String(c.user_id) === String(userId));
            if (me) email = me.email;
          }
        } catch {}
      }
    }
    if (email) {
      emailLabel.textContent = email;
      emailLine.classList.remove('d-none');
    }
  })();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let email = null;
    try { email = sessionStorage.getItem('resetEmail'); } catch {}
    if (!email) {
      // Try to resolve again from customers endpoint
      const userId = localStorage.getItem('userId');
      try {
        const res = await fetch('/customers');
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const me = data.data.find(c => String(c.user_id) === String(userId));
          if (me) email = me.email;
        }
      } catch {}
    }
    if (!email) {
      showFeedback('Session expired. Please restart Forgot Password.', false);
      return;
    }
    const v1 = p1.value;
    const v2 = p2.value;
    if (!v1 || !v2) return showFeedback('Please fill both fields.', false);
    if (v1 !== v2) return showFeedback('Passwords do not match.', false);
    if (v1.length < 6) return showFeedback('Password must be at least 6 characters.', false);

    try {
      const res = await fetch('/reset-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, new_password: v1 })
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('Password updated. Redirecting to login…', true);
        sessionStorage.removeItem('resetEmail');
        setTimeout(() => { window.location.href = 'login.html'; }, 1200);
      } else {
        showFeedback(data.message || 'Failed to reset password.', false);
      }
    } catch (err) {
      console.error(err);
      showFeedback('Server error. Try again later.', false);
    }
  });
}
