// routes/budget.js
// CRUD for a logged-in user's income / expense / subscription entries,
// plus totals the dashboard uses for the stat cards.

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();
router.use(requireAuth); // every route below requires a logged-in user

const VALID_TYPES = new Set(['income', 'expense', 'subscription']);

// GET /api/budget — all entries + computed totals for this user
router.get('/', (req, res) => {
  const items = db.listBudgetItems(req.user.id);

  const totals = items.reduce(
    (acc, item) => {
      if (item.type === 'income') acc.income += item.amount;
      else acc.expenses += item.amount; // expenses and subscriptions both count as spending
      return acc;
    },
    { income: 0, expenses: 0 }
  );
  totals.saved = totals.income - totals.expenses;

  res.json({ items, totals });
});

// POST /api/budget — add a new entry
router.post('/', (req, res) => {
  const { type, name, category, amount, recurring, entry_date } = req.body;

  if (!VALID_TYPES.has(type)) {
    return res.status(400).json({ error: 'Type must be income, expense, or subscription.' });
  }
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required.' });
  }
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number.' });
  }

  const item = db.addBudgetItem({
    user_id: req.user.id,
    type,
    name: name.trim(),
    category: (category && String(category).trim()) || 'General',
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
