// auth.js
// Helpers for password hashing and session cookies (JWT stored in an
// httpOnly cookie, so client-side JS can never read the token directly).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const IS_PROD = process.env.NODE_ENV === 'production';

// The signing secret must come from the environment in production. In
// development, one is generated the first time and saved to server/.jwt-secret
// (git-ignored), so logins survive server restarts without a secret being
// hard-coded in the source for anyone to read.
function loadDevSecret() {
  const file = path.join(__dirname, '.jwt-secret');
  try {
    const existing = fs.readFileSync(file, 'utf8').trim();
    if (existing.length >= 32) return existing;
  } catch (err) {
    // no saved secret yet — create one below
  }
  const secret = crypto.randomBytes(32).toString('hex');
  try {
    fs.writeFileSync(file, secret, { encoding: 'utf8', mode: 0o600 });
  } catch (err) {
    console.warn('Could not save server/.jwt-secret — logins will reset on restart.');
  }
  return secret;
}

let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (IS_PROD) {
    console.error('FATAL: JWT_SECRET must be set when NODE_ENV=production.');
    process.exit(1);
  }
  JWT_SECRET = loadDevSecret();
}

const COOKIE_NAME = 'budgity_session';
const TOKEN_TTL = '7d';
const SALT_ROUNDS = 10;

// bcrypt silently ignores everything past 72 bytes, so we cap passwords there.
const MAX_PASSWORD_BYTES = 72;

const COOKIE_OPTIONS = {
  httpOnly: true, // not readable from client-side JS
  sameSite: 'lax', // basic CSRF protection
  secure: IS_PROD,
  path: '/',
};

// Hash used to burn the same amount of time when a username doesn't exist,
// so response timing can't be used to discover which usernames are real.
const DUMMY_HASH = bcrypt.hashSync('budgity-dummy-password', SALT_ROUNDS);

function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

function verifyPassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash || DUMMY_HASH).then((ok) => ok && !!hash);
}

function issueSessionCookie(res, user) {
  const token = jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: TOKEN_TTL,
  });
  res.cookie(COOKIE_NAME, token, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000, // matches TOKEN_TTL
  });
}

function clearSessionCookie(res) {
  // Must use the same options the cookie was set with, or some browsers
  // won't actually remove it.
  res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
}

// Returns { id, username } for a valid session cookie, otherwise null.
function getSessionUser(req) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return { id: payload.sub, username: payload.username };
  } catch (err) {
    return null;
  }
}

// API middleware: 401 JSON if not logged in.
function requireAuth(req, res, next) {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not logged in.' });
  }
  req.user = user;
  next();
}

// Page middleware: redirect to the login page if not logged in.
function requireAuthPage(req, res, next) {
  const user = getSessionUser(req);
  if (!user) return res.redirect('/login.html');
  req.user = user;
  next();
}

module.exports = {
  MAX_PASSWORD_BYTES,
  hashPassword,
  verifyPassword,
  issueSessionCookie,
  clearSessionCookie,
  getSessionUser,
  requireAuth,
  requireAuthPage,
};
