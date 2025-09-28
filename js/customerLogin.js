// Get HTML elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const forgotPasswordForm = document.getElementById('forgot-password-form');
const loginEmailInput = document.getElementById('loginEmail');
const loginPasswordInput = document.getElementById('loginPassword');
const registerNameInput = document.getElementById('registerName');
const registerEmailInput = document.getElementById('registerEmail');
const registerPasswordInput = document.getElementById('registerPassword');
const registerPhoneInput = document.getElementById('registerPhone');
const registerLocationInput = document.getElementById('registerLocation');
const registerStateInput = document.getElementById('registerState');
const forgotEmailInput = document.getElementById('forgotEmail');
const loginFeedback = document.getElementById('login-feedback');
const registerFeedback = document.getElementById('register-feedback');
const forgotFeedback = document.getElementById('forgot-feedback');

// Defensive: Only add listeners if forms exist
if (loginForm) loginForm.addEventListener('submit', handleLogin);
if (registerForm) registerForm.addEventListener('submit', handleRegister);
if (forgotPasswordForm) forgotPasswordForm.addEventListener('submit', handleForgotPassword);

// Function to handle login
async function handleLogin(event) {
  event.preventDefault();
  const email = loginEmailInput.value.trim();
  const password = loginPasswordInput.value;
  const feedback = document.getElementById('login-feedback');
  feedback.style.display = 'none';

  const res = await fetch('/login-customer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (data.success) {
    // Save token and user info
    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.role);
    localStorage.setItem('userId', data.userId);
    localStorage.setItem('userName', data.name);
    // Redirect to dashboard
    window.location.href = 'customerDashboard.html';
  } else {
    feedback.textContent = data.message || 'Login failed.';
    feedback.style.display = 'block';
  }
}

// Function to handle registration
function handleRegister(event) {
  event.preventDefault();
  const name = registerNameInput.value.trim();
  const email = registerEmailInput.value.trim();
  const password = registerPasswordInput.value;
  const phone = registerPhoneInput.value.trim();
  const location = registerLocationInput.value.trim();
  const state = registerStateInput.value.trim();
  if (!name || !email || !password || !phone || !location || !state) {
    showFeedback(registerFeedback, 'Please fill in all fields.', false);
    return;
  }
  if (password.length < 6) {
    showFeedback(registerFeedback, 'Password must be at least 6 characters.', false);
    return;
  }
  // Send AJAX request to server to create new user
  console.log('Sending register data:', { name, email, phone, location, state });
  fetch('/register-customer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone, email, password, location, state }),
  })
  .then((response) => {
    console.log('Register response status:', response.status);
    return response.json();
  })
  .then((data) => {
    console.log('Register response data:', data);
    if (data.success) {
      showFeedback(registerFeedback, 'Registration successful! Please log in.', true);
      setTimeout(() => { showLogin(new Event('click')); }, 1200);
    } else {
      showFeedback(registerFeedback, 'Email already in use.', false);
    }
  })
  .catch((error) => {
    showFeedback(registerFeedback, 'Server error. Please try again later.', false);
    console.error(error);
  });
}

// Function to handle forgot password
function handleForgotPassword(event) {
  event.preventDefault();
  const email = forgotEmailInput.value.trim();
  if (!email) {
    showFeedback(forgotFeedback, 'Please enter your email.', false);
    return;
  }
  // Send AJAX request to server to send password reset email
  fetch('/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  .then((response) => response.json())
  .then((data) => {
    if (data.success) {
      // Store email temporarily and show modal
      try { sessionStorage.setItem('resetEmail', email); } catch {}
      const modal = new bootstrap.Modal(document.getElementById('forgotSuccessModal'));
      document.getElementById('forgot-success-text').textContent = 'Email verified. You can reset your password now.';
      document.getElementById('btnGoReset').onclick = () => {
        window.location.href = 'resetPassword.html';
      };
      modal.show();
    } else {
      showFeedback(forgotFeedback, 'Email not found.', false);
    }
  })
  .catch((error) => {
    showFeedback(forgotFeedback, 'Server error. Please try again later.', false);
    console.error(error);
  });
}

// Helper function to show feedback
function showFeedback(element, message, isSuccess) {
  if (!element) return;
  element.textContent = message;
  element.style.display = 'block';
  element.classList.remove('text-danger', 'text-success');
  element.classList.add(isSuccess ? 'text-success' : 'text-danger');
  setTimeout(() => { element.style.display = 'none'; }, isSuccess ? 2000 : 3000);
}