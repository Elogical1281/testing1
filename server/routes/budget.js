// routes/budget.js
// CRUD for a logged-in user's income / expense / subscription / reminder
// entries, plus totals the dashboard uses for the stat cards.

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();
router.use(requireAuth); // every route below requires a logged-in user

const VALID_TYPES = new Set(['income', 'expense', 'subscription', 'reminder']);
const MAX_AMOUNT = 1e9;

function isValidDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

// GET /api/budget — all entries + computed totals for this user
router.get('/', (req, res) => {
  const items = db.listBudgetItems(req.user.id);

  // Add up in whole cents so floating-point error doesn't creep in
  // (0.1 + 0.2 !== 0.3). Reminders aren't money, so they're skipped.
  let income = 0;
  let expenses = 0;
  for (const item of items) {
    const cents = Math.round(item.amount * 100);
    if (item.type === 'income') income += cents;
    else if (item.type === 'expense' || item.type === 'subscription') expenses += cents;
  }
  const totals = {
    income: income / 100,
    expenses: expenses / 100,
    saved: (income - expenses) / 100,
  };

  res.json({ items, totals });
});

// POST /api/budget — add a new entry
router.post('/', (req, res) => {
  const { type, name, category, amount, recurring, entry_date } = req.body || {};

  if (!VALID_TYPES.has(type)) {
    return res
      .status(400)
      .json({ error: 'Type must be income, expense, subscription, or reminder.' });
  }
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required.' });
  }
  if (name.trim().length > 100) {
    return res.status(400).json({ error: 'Name must be 100 characters or fewer.' });
  }

  // Reminders are just a name + date; everything else needs an amount.
  let numericAmount = 0;
  if (type !== 'reminder') {
    numericAmount = typeof amount === 'string' || typeof amount === 'number' ? Number(amount) : NaN;
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number.' });
    }
    if (numericAmount > MAX_AMOUNT) {
      return res.status(400).json({ error: 'Amount is too large.' });
    }
    numericAmount = Math.round(numericAmount * 100) / 100;
  }

  const cat = category == null ? '' : String(category).trim();
  if (cat.length > 50) {
    return res.status(400).json({ error: 'Category must be 50 characters or fewer.' });
  }

  if (entry_date != null && entry_date !== '' && !isValidDate(entry_date)) {
    return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format.' });
  }
  if (type === 'reminder' && !entry_date) {
    return res.status(400).json({ error: 'A reminder needs a date.' });
  }

  const item = db.addBudgetItem({
    user_id: req.user.id,
    type,
    name: name.trim(),
    category: cat || 'General',
    amount: numericAmount,
    recurring: type === 'subscription' || recurring ? 1 : 0,
    entry_date: entry_date || new Date().toISOString().slice(0, 10),
  });

  res.status(201).json(item);
});

// DELETE /api/budget/:id — remove one of this user's entries
router.delete('/:id', (req, res) => {
  const changed = db.deleteBudgetItem(req.params.id, req.user.id);
  if (!changed) {
    return res.status(404).json({ error: 'Entry not found.' });
  }
  res.json({ ok: true });
});

module.exports = router;
