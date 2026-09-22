// --- Helpers -------------------------------------------------------------

// Shows/hides a small error message right under a field's div.
// Creates the message element the first time it's needed and reuses it
// after that, so we don't stack up duplicate elements on repeated submits.
function showError(fieldDiv, message) {
  let msgEl = fieldDiv.nextElementSibling;

  if (!msgEl || !msgEl.classList.contains('field-error')) {
    msgEl = document.createElement('small');
    msgEl.className = 'field-error';
    fieldDiv.insertAdjacentElement('afterend', msgEl);
  }

  msgEl.textContent = message;
  fieldDiv.classList.add('incorrect');
}

function clearError(fieldDiv) {
  fieldDiv.classList.remove('incorrect');
  const msgEl = fieldDiv.nextElementSibling;
  if (msgEl && msgEl.classList.contains('field-error')) {
    msgEl.textContent = '';
  }
}

function clearAllErrors(form) {
  form.querySelectorAll('div.incorrect').forEach(clearError);
}

// Password rule: at least 6 characters and at least 1 digit.
function isPasswordValid(password) {
  return password.length >= 6 && /\d/.test(password);
}

// Returns a message describing what's wrong with a password, or '' if it's fine.
function passwordProblem(password) {
  if (password.length < 6 && !/\d/.test(password)) {
    return 'Password must be at least 6 characters and include a number.';
  }
  if (password.length < 6) {
    return 'Password must be at least 6 characters.';
  }
  if (!/\d/.test(password)) {
    return 'Password must include at least one number.';
  }
  return '';
}

// --- Signup form -----------------------------------------------------------

const signupForm = document.getElementById('Signup');

if (signupForm) {
  const usernameInput = document.getElementById('username-input');
  const passwordInput = document.getElementById('password-input');
  const confirmInput = document.getElementById('confirmPassword-input');

  const usernameDiv = usernameInput.closest('div');
  const passwordDiv = passwordInput.closest('div');
  const confirmDiv = confirmInput.closest('div');

  // Live match-checking so the user knows right away whether password
  // and confirm password agree.
  function checkPasswordsMatch() {
    if (confirmInput.value.length === 0) {
      clearError(confirmDiv);
      return;
    }

    if (confirmInput.value !== passwordInput.value) {
      showError(confirmDiv, "Passwords don't match.");
    } else {
      clearError(confirmDiv);
    }
  }

  // Live feedback on the password field as the user types.
  passwordInput.addEventListener('input', () => {
    const problem = passwordProblem(passwordInput.value);
    if (problem) {
      showError(passwordDiv, problem);
    } else {
      clearError(passwordDiv);
    }
    checkPasswordsMatch();
  });

  confirmInput.addEventListener('input', checkPasswordsMatch);

  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearAllErrors(signupForm);

    let valid = true;

    // Username: at least 3 characters
    if (usernameInput.value.trim().length < 3) {
      showError(usernameDiv, 'Username must be at least 3 characters.');
      valid = false;
    }

    // Password: at least 6 characters and at least 1 number
    const problem = passwordProblem(passwordInput.value);
    if (problem) {
      showError(passwordDiv, problem);
      valid = false;
    }

    // Confirm password: must match and not be empty
    if (confirmInput.value.length === 0) {
      showError(confirmDiv, 'Please confirm your password.');
      valid = false;
    } else if (confirmInput.value !== passwordInput.value) {
      showError(confirmDiv, "Passwords don't match.");
      valid = false;
    }

    if (!valid) return;

    const submitBtn = signupForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: usernameInput.value.trim(),
        password: passwordInput.value,
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Signup failed.');
        window.location.href = 'dashboard/index.html';
      })
      .catch((err) => {
        // Most likely the username is taken — surface it on the username field.
        showError(usernameDiv, err.message);
      })
      .finally(() => {
        submitBtn.disabled = false;
      });
  });
}

// --- Login form ------------------------------------------------------------

const loginForm = document.getElementById('Login');

if (loginForm) {
  const usernameInput = document.getElementById('username-input');
  const passwordInput = document.getElementById('password-input');

  const usernameDiv = usernameInput.closest('div');
  const passwordDiv = passwordInput.closest('div');

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearAllErrors(loginForm);

    let valid = true;

    if (usernameInput.value.trim().length === 0) {
      showError(usernameDiv, 'Please enter your username.');
      valid = false;
    }

    if (passwordInput.value.length === 0) {
      showError(passwordDiv, 'Please enter your password.');
      valid = false;
    }

    if (!valid) return;

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: usernameInput.value.trim(),
        password: passwordInput.value,
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Login failed.');
        window.location.href = 'dashboard/index.html';
      })
      .catch((err) => {
        showError(passwordDiv, err.message);
      })
      .finally(() => {
        submitBtn.disabled = false;
      });
  });
}