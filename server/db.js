// db.js
// A tiny file-based database — no external dependencies, no native code to
// compile. Everything is stored in server/data.json and kept in memory
// while the server runs, so reads are instant and writes re-save the file.
// Fine for a small personal/school project; not built for heavy concurrency.

const fs = require('fs');
const path = require('path');

const DATA_PATH = process.env.BUDGITY_DATA_PATH || path.join(__dirname, 'data.json');

function emptyState() {
  return {
    nextUserId: 1,
    nextItemId: 1,
    users: [], // { id, username, password_hash, created_at }
    budgetItems: [], // { id, user_id, type, name, category, amount, recurring, entry_date, created_at }
  };
}

function load() {
  if (!fs.existsSync(DATA_PATH)) {
    return emptyState();
  }
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  try {
    const state = { ...emptyState(), ...JSON.parse(raw) };
    // Keep the id counters ahead of anything already stored.
    state.nextUserId = Math.max(state.nextUserId, ...state.users.map((u) => u.id + 1), 1);
    state.nextItemId = Math.max(state.nextItemId, ...state.budgetItems.map((i) => i.id + 1), 1);
    return state;
  } catch (err) {
    // Never silently throw away (and later overwrite) everyone's accounts:
    // set the unreadable file aside and tell the person running the server.
    const backup = `${DATA_PATH}.corrupt-${Date.now()}`;
    fs.writeFileSync(backup, raw, 'utf8');
    console.error(`Could not parse data.json (${err.message}). Saved a copy to ${backup} and starting fresh.`);
    return emptyState();
  }
}

let state = load();

// Write to a temp file and rename it into place, so a crash mid-write can't
// leave a half-written data.json behind.
function save() {
  const tmp = `${DATA_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmp, DATA_PATH);
}

// --- Users ----------------------------------------------------------------

function getUserByUsername(username) {
  const wanted = String(username).toLowerCase();
  return state.users.find((u) => u.username.toLowerCase() === wanted);
}

function createUser(username, password_hash) {
  if (getUserByUsername(username)) {
    const err = new Error('Username taken');
    err.code = 'USERNAME_TAKEN';
    throw err;
  }
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
    .sort((a, b) => {
      // Newest date first; ties broken by newest id.
      if (a.entry_date !== b.entry_date) return a.entry_date < b.entry_date ? 1 : -1;
      return b.id - a.id;
    });
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
