// server.js
// Entry point. Serves the static Budgity site (index.html, login, signup,
// dashboard, images, etc.) and the /api routes that back the login system
// and budget dashboard.

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const budgetRoutes = require('./routes/budget');

const app = express();
const PORT = process.env.PORT || 3000;
const SITE_ROOT = path.join(__dirname, '..');

app.use(express.json());
app.use(cookieParser());

// --- API ----------------------------------------------------------------
app.use('/api', authRoutes);
app.use('/api/budget', budgetRoutes);

// --- Static site ----------------------------------------------------------
// Serves index.html, login.html, signup.html, style.css, frontPictures/,
// images/, assets/, and the dashboard/ folder exactly as they were.
app.use(express.static(SITE_ROOT));

app.listen(PORT, () => {
  console.log(`Budgity is running at http://localhost:${PORT}`);
});
