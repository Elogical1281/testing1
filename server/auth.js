// auth.js
// Small helpers for password hashing and session cookies (JWT stored in an
// httpOnly cookie, so client-side JS can never read the token directly).

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// In production you'd set JWT_SECRET as a real environment variable.
// Falling back to a fixed dev value keeps this runnable out of the box,
// but it means anyone with the source code could forge a login cookie —
// swap this for a real secret (and set it via the environment) before you
// put this anywhere other than your own machine.
const JWT_SECRET = process.env.JWT_SECRET || 'budgity-dev-secret-change-me';
const COOKIE_NAME = 'budgity_session';
const TOKEN_TTL = '7d';

const SALT_ROUNDS = 10;

function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

function verifyPassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

function issueSessionCookie(res, user) {
  const token = jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: TOKEN_TTL,
  });

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,       // not readable from client-side JS
    sameSite: 'lax',      // basic CSRF protection
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, matches TOKEN_TTL
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

// Express middleware: reads the session cookie, verifies it, and attaches
// req.user = { id, username } if valid. Responds 401 if missing/invalid.
function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'Not logged in.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, username: payload.username };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired, please log in again.' });
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  issueSessionCookie,
  clearSessionCookie,
  requireAuth,
};
