// app.js — dashboard logic.
// Everything here talks to the /api routes on the same server; there is
// no separate frontend/backend host, so relative fetch() calls just work.

const money = (n) =>
  '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const el = (id) => document.getElementById(id);

let allItems = [];
let currentView = 'dashboard'; // 'dashboard' | 'subscriptions' | 'purchases'

// --- Auth guard -----------------------------------------------------------
// If there's no valid session cookie, bounce back to the login page.
async function checkAuth() {
  const res = await fetch('/api/me');
  if (!res.ok) {
    window.location.href = '../login.html';
    return null;
  }
  return res.json();
}

function renderUser(user) {
  el('userGreeting').textContent = `Hey, ${user.username}`;
  el('userAvatar').textContent = user.username.charAt(0).toUpperCase();
}

el('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '../login.html';
});

// --- Date pill --------------------------------------------------------
function renderDate() {
  const today = new Date();
  const formatted = today.toLocaleDateString(undefined, {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
  el('datePill').textContent = `📅 ${formatted}`;
  el('entry-date').value = today.toISOString().slice(0, 10);
}

// --- Loading & rendering budget data ------------------------------------
async function loadBudget() {
  const res = await fetch('/api/budget');
  if (!res.ok) return;
  const data = await res.json();
  allItems = data.items;
  renderStats(data.totals);
  renderList();
}

function renderStats(totals) {
  el('statIncome').textContent = money(totals.income);
  el('statExpenses').textContent = money(totals.expenses);
  el('statSaved').textContent = money(totals.saved);

  const foot = el('statSavedFoot');
  if (totals.income > 0) {
    const rate = Math.round((totals.saved / totals.income) * 100);
    foot.textContent = `${rate}% of income saved`;
  } else {
    foot.textContent = 'Income minus expenses';
  }
}

function itemsForView() {
  if (currentView === 'subscriptions') return allItems.filter((i) => i.type === 'subscription');
  if (currentView === 'purchases') return allItems.filter((i) => i.type === 'expense');
  return allItems;
}

function renderList() {
  const items = itemsForView();
  const listEl = el('entryList');

  if (items.length === 0) {
    listEl.innerHTML = '';
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent =
      currentView === 'subscriptions'
        ? 'No subscriptions yet — add one above.'
        : currentView === 'purchases'
        ? 'No purchases logged yet — add one above.'
        : "You haven't added anything yet — use the form above to add your first entry.";
    listEl.appendChild(empty);
    return;
  }

  listEl.innerHTML = '';
  items.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'entry-row';
    row.innerHTML = `
      <span class="entry-type type-${item.type}">${item.type}</span>
      <span class="entry-name">${escapeHtml(item.name)}</span>
      <span class="entry-category">${escapeHtml(item.category)}</span>
      <span class="entry-date">${item.entry_date}</span>
      <span class="entry-amount ${item.type === 'income' ? 'positive' : 'negative'}">
        ${item.type === 'income' ? '+' : '-'}${money(item.amount)}
      </span>
      <button class="entry-delete" data-id="${item.id}" title="Delete">✕</button>
    `;
    listEl.appendChild(row);
  });

  listEl.querySelectorAll('.entry-delete').forEach((btn) => {
    btn.addEventListener('click', () => deleteEntry(btn.dataset.id));
  });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// --- Add entry ----------------------------------------------------------
const entryForm = el('entryForm');
const entryFormError = el('entryFormError');

entryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  entryFormError.textContent = '';

  const payload = {
    type: el('entry-type').value,
    name: el('entry-name').value.trim(),
    category: el('entry-category').value.trim() || 'General',
    amount: parseFloat(el('entry-amount').value),
    entry_date: el('entry-date').value,
  };

  const submitBtn = el('entrySubmitBtn');
  submitBtn.disabled = true;

  try {
    const res = await fetch('/api/budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not add entry.');

    entryForm.reset();
    renderDate();
    await loadBudget();
  } catch (err) {
    entryFormError.textContent = err.message;
  } finally {
    submitBtn.disabled = false;
  }
});

// --- Delete entry ---------------------------------------------------------
async function deleteEntry(id) {
  const res = await fetch(`/api/budget/${id}`, { method: 'DELETE' });
  if (res.ok) await loadBudget();
}

// --- Sidebar view switching -----------------------------------------------
const viewTitles = {
  dashboard: 'Dashboard',
  analytics: 'Analytics',
  settings: 'Settings',
};

document.querySelectorAll('.nav-item').forEach((navItem) => {
  navItem.addEventListener('click', () => {
    if (navItem.dataset.soon) {
      navItem.classList.add('shake');
      setTimeout(() => navItem.classList.remove('shake'), 400);
      return;
    }
    document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
    navItem.classList.add('active');
    currentView = navItem.dataset.view;
    el('pageTitle').textContent = viewTitles[currentView];
    el('listTitle').textContent =
      currentView === 'dashboard' ? 'All entries' : viewTitles[currentView];
    renderList();
  });
});

// --- Init -----------------------------------------------------------------
(async function init() {
  const user = await checkAuth();
  if (!user) return;
  renderUser(user);
  renderDate();
  await loadBudget();
})();
