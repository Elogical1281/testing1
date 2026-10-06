// server.js
// Entry point. Serves the static Budgity site (index.html, login, signup,
// dashboard, images, etc.) and the /api routes that back the login system
// and budget dashboard.

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const { requireAuthPage } = require('./auth');
const authRoutes = require('./routes/auth');
const budgetRoutes = require('./routes/budget');

const app = express();
const PORT = process.env.PORT || 3000;
const SITE_ROOT = path.join(__dirname, '..');

// Needed so req.ip is the real client IP when running behind a proxy
// (set TRUST_PROXY=1 in that case).
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// --- API ----------------------------------------------------------------
app.use('/api', authRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// --- Static site ----------------------------------------------------------
// Only the public site files are served. Previously the whole project
// folder was exposed, which meant /server/data.json (every user's password
// hash), /package.json and the server source were all downloadable.
const PUBLIC_FILES = ['index.html', 'about.html', 'mission.html', 'login.html', 'signup.html', 'style.css'];
const PUBLIC_DIRS = ['assets', 'frontPictures', 'images', 'nodey'];

app.get('/', (req, res) => res.sendFile(path.join(SITE_ROOT, 'index.html')));
PUBLIC_FILES.forEach((file) => {
  app.get('/' + file, (req, res) => res.sendFile(path.join(SITE_ROOT, file)));
});
PUBLIC_DIRS.forEach((dir) => {
  app.use('/' + dir, express.static(path.join(SITE_ROOT, dir)));
});

// The dashboard requires a logged-in session; otherwise visitors are sent to
// the login page (the /api/budget data is protected separately as well).
app.use('/dashboard', requireAuthPage, express.static(path.join(SITE_ROOT, 'dashboard'), { index: 'index.html' }));

// --- Errors ---------------------------------------------------------------
app.use((req, res) => res.status(404).send('Not found'));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Malformed JSON bodies, oversized bodies, etc.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request too large.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong.' });
});

app.listen(PORT, () => {
  console.log(`Budgity is running at http://localhost:${PORT}`);
});
