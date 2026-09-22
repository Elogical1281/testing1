// routes/auth.js
// Signup, login, logout, and "who am I" endpoints.

const express = require('express');
const db = require('../db');
const {
  hashPassword,
  verifyPassword,
  issueSessionCookie,
  clearSessionCookie,
  requireAuth,
} = require('../auth');

const router = express.Router();

function isValidUsername(username) {
  return typeof username === 'string' && username.trim().length >= 3;
}

function passwordProblem(password) {
  if (typeof password !== 'string') return 'Password is required.';
  if (password.length < 6) return 'Password must be at least 6 characters.';
  if (!/\d/.test(password)) return 'Password must include at least one number.';
  return null;
}

// POST /api/signup
router.post('/signup', async (req, res) => {
  const username = (req.body.username || '').trim();
  const { password } = req.body;

  if (!isValidUsername(username)) {
    return res.status(400).json({ error: 'Username must be at least 3 characters.' });
  }

  const pwProblem = passwordProblem(password);
  if (pwProblem) {
    return res.status(400).json({ error: pwProblem });
  }

  if (db.getUserByUsername(username)) {
    return res.status(409).json({ error: 'That username is already taken.' });
  }

  try {
    const password_hash = await hashPassword(password);
    const user = db.createUser(username, password_hash);

    issueSessionCookie(res, user);
    res.status(201).json({ username: user.username });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Something went wrong creating your account.' });
  }
});

// POST /api/login
router.post('/login', async (req, res) => {
  const username = (req.body.username || '').trim();
  const { password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = db.getUserByUsername(username);
  // Same error for "no such user" and "wrong password" on purpose, so a
  // login attempt can't be used to discover which usernames exist.
  const genericError = { error: 'Incorrect username or password.' };

  if (!user) {
    return res.status(401).json(genericError);
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    return res.status(401).json(genericError);
  }

  issueSessionCookie(res, user);
  res.json({ username: user.username });
});

// POST /api/logout
router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

// GET /api/me — used by the dashboard to check whether someone is logged in.
router.get('/me', requireAuth, (req, res) => {
  res.json({ username: req.user.username });
});

module.exports = router;
