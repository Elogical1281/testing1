// routes/auth.js
// Signup, login, logout, and "who am I" endpoints.

const express = require('express');
const db = require('../db');
const {
  MAX_PASSWORD_BYTES,
  hashPassword,
  verifyPassword,
  issueSessionCookie,
  clearSessionCookie,
  requireAuth,
} = require('../auth');

const router = express.Router();

// --- Tiny in-memory rate limiter (per IP) to slow down password guessing ----
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 30;
const attempts = new Map(); // ip -> { count, resetAt }

function rateLimit(req, res, next) {
  const now = Date.now();
  const ip = req.ip;
  let entry = attempts.get(ip);
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    attempts.set(ip, entry);
  }
  entry.count++;
  if (entry.count > MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'Too many attempts. Please try again later.' });
  }
  next();
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of attempts) if (entry.resetAt < now) attempts.delete(ip);
}, WINDOW_MS).unref();

// --- Validation -------------------------------------------------------------

function usernameProblem(username) {
  if (typeof username !== 'string' || username.trim().length < 3) {
    return 'Username must be at least 3 characters.';
  }
  if (username.trim().length > 30) return 'Username must be 30 characters or fewer.';
  return null;
}

function passwordProblem(password) {
  if (typeof password !== 'string') return 'Password is required.';
  if (password.length < 6) return 'Password must be at least 6 characters.';
  if (!/\d/.test(password)) return 'Password must include at least one number.';
  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    return `Password must be at most ${MAX_PASSWORD_BYTES} bytes long.`;
  }
  return null;
}

// Pulls a string field out of the body without crashing on a missing body
// or a non-string value (e.g. {"username": 123}).
function str(body, key) {
  return body && typeof body[key] === 'string' ? body[key] : '';
}

// POST /api/signup
router.post('/signup', rateLimit, async (req, res) => {
  const username = str(req.body, 'username').trim();
  const password = str(req.body, 'password');

  const uProblem = usernameProblem(username);
  if (uProblem) return res.status(400).json({ error: uProblem });

  const pwProblem = passwordProblem(password);
  if (pwProblem) return res.status(400).json({ error: pwProblem });

  if (db.getUserByUsername(username)) {
    return res.status(409).json({ error: 'That username is already taken.' });
  }

  try {
    const password_hash = await hashPassword(password);
    const user = db.createUser(username, password_hash);
    issueSessionCookie(res, user);
    res.status(201).json({ username: user.username });
  } catch (err) {
    // Two signups for the same name can race while the password is hashing.
    if (err.code === 'USERNAME_TAKEN') {
      return res.status(409).json({ error: 'That username is already taken.' });
    }
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Something went wrong creating your account.' });
  }
});

// POST /api/login
router.post('/login', rateLimit, async (req, res) => {
  const username = str(req.body, 'username').trim();
  const password = str(req.body, 'password');

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const user = db.getUserByUsername(username);
    // Same error (and same amount of work) for "no such user" and "wrong
    // password", so login can't be used to discover which usernames exist.
    const ok = await verifyPassword(password, user && user.password_hash);
    if (!user || !ok) {
      return res.status(401).json({ error: 'Incorrect username or password.' });
    }
    issueSessionCookie(res, user);
    res.json({ username: user.username });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Something went wrong logging you in.' });
  }
});

// POST /api/logout
router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

// GET /api/me — used by the pages to check whether someone is logged in.
router.get('/me', requireAuth, (req, res) => {
  res.json({ username: req.user.username });
});

module.exports = router;
