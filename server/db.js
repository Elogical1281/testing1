// db.js
// A tiny file-based database — no external dependencies, no native code to
// compile. Everything is stored in server/data.json and kept in memory
// while the server runs, so reads are instant and writes just re-save the
// file. This is plenty for a small personal/school project; it's not built
// for many simultaneous writers, but that's not a concern here.

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, 'data.json');

function emptyState() {
  return {
    nextUserId: 1,
    nextItemId: 1,
    users: [],        // { id, username, password_hash, created_at }
    budgetItems: [],  // { id, user_id, type, name, category, amount, recurring, entry_date, created_at }
  };
}

function load() {
  if (!fs.existsSync(DATA_PATH)) {
    return emptyState();
  }
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf8');
    return { ...emptyState(), ...JSON.parse(raw) };
  } catch (err) {
    console.error('Could not read data.json, starting fresh:', err.message);
    return emptyState();
  }
}

let state = load();

function save() {
  fs.writeFileSync(DATA_PATH, JSON.stringify(state, null, 2), 'utf8');
}

// --- Users ----------------------------------------------------------------

function getUserByUsername(username) {
  return state.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
}

function createUser(username, password_hash) {
  const user = {
    id: state.nextUserId++,
    username,
    password_hash,
    created_at: new Date().toISOString(),
  };
  state.users.push(user);
  save();
  return user;
}

// --- Budget items -----------------------------------------------------------

function listBudgetItems(userId) {
  return state.budgetItems
    .filter((item) => item.user_id === userId)
    .sort((a, b) => (b.entry_date > a.entry_date ? 1 : -1) || b.id - a.id);
}

function addBudgetItem(entry) {
  const item = {
    id: state.nextItemId++,
    created_at: new Date().toISOString(),
    ...entry,
  };
  state.budgetItems.push(item);
  save();
  return item;
}

function deleteBudgetItem(id, userId) {
  const before = state.budgetItems.length;
  state.budgetItems = state.budgetItems.filter(
    (item) => !(item.id === Number(id) && item.user_id === userId)
  );
  const changed = state.budgetItems.length !== before;
  if (changed) save();
  return changed;
}

module.exports = {
  getUserByUsername,
  createUser,
  listBudgetItems,
  addBudgetItem,
  deleteBudgetItem,
};
