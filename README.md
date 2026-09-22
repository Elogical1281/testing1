# Budgity

A simple budgeting site with real accounts and a saved dashboard.

## What's new

- **Signup / Login** (`signup.html`, `login.html`) now create real accounts on
  a small Node.js server. Passwords are hashed with bcrypt before they're
  ever written to disk — the server never stores your plain password.
- **Dashboard** (`dashboard/index.html`) is now personalized and functional:
  add income, expenses, and subscriptions, see your totals update live, and
  everything is saved to a database so it's still there next time you log in.
- Logging in sets a secure, httpOnly session cookie (JSON Web Token) — no
  passwords are ever kept in the browser.

## Requirements

- [Node.js](https://nodejs.org) 18 or newer (this was built/tested on Node 22).
- `npm` (comes bundled with Node.js).

## Setup

```bash
cd websitebudgity
npm install
npm start
```

Then open **http://localhost:3000** in your browser. That's it — the same
server serves the whole site (landing page, signup, login, dashboard) and
the API, so there's nothing else to configure.

The first time you run it, a `server/data.json` file is created
automatically to store accounts and budget entries. It'll keep growing as
people sign up and add entries — nothing to set up by hand.

Everything here is pure JavaScript (no native modules like SQLite bindings
that need compiling), so `npm install` should work the same on Windows,
Mac, or Linux without any extra build tools.

## Project structure

```
websitebudgity/
  index.html, about.html, mission.html   ← existing static pages, unchanged
  login.html, signup.html                ← now call the real API
  assets/valid.js                        ← client-side validation + API calls
  dashboard/
    index.html                           ← dashboard shell (auth-guarded)
    app.js                               ← dashboard logic (loads/saves data)
    styles.css                           ← dashboard styling
  server/
    server.js                            ← Express app / static file server
    db.js                                ← JSON file storage (server/data.json)
    auth.js                              ← password hashing + session cookies
    routes/
      auth.js                            ← /api/signup, /api/login, /api/logout, /api/me
      budget.js                          ← /api/budget (list/add/delete entries)
```

## API overview

| Method | Route              | Auth required | Purpose                         |
|--------|--------------------|----------------|----------------------------------|
| POST   | `/api/signup`      | no             | Create an account                |
| POST   | `/api/login`       | no             | Log in                           |
| POST   | `/api/logout`      | no             | Clear the session cookie         |
| GET    | `/api/me`          | yes            | Check who's logged in            |
| GET    | `/api/budget`      | yes            | List entries + totals            |
| POST   | `/api/budget`      | yes            | Add an income/expense/subscription entry |
| DELETE | `/api/budget/:id`  | yes            | Delete one of your own entries   |

## Notes / things to know before deploying this for real

- **`JWT_SECRET`**: the code falls back to a fixed development secret so it
  runs out of the box. Before putting this anywhere public, set a real
  secret as an environment variable, e.g. `JWT_SECRET=$(openssl rand -hex 32) npm start`.
- **Dashboard route protection** is done client-side (the dashboard checks
  `/api/me` on load and redirects to `login.html` if you're not
  authenticated). The *data* itself is always protected server-side — every
  `/api/budget` route requires a valid session — so no one can read or
  change another user's data even if they loaded the dashboard HTML
  directly.
- **HTTPS**: cookies are marked `secure` automatically once
  `NODE_ENV=production` is set, which requires serving over HTTPS (e.g.
  behind a reverse proxy). Locally over `http://localhost` this isn't
  needed.
- This is sized for a small personal/learning project — a single JSON data
  file, JWT auth, no email verification or password reset flow. The JSON
  file also isn't built for many people hitting it at the exact same
  instant (no real database transactions) — fine for a class project or a
  handful of users, but swap in a real database before anything bigger.
  Happy to add any of this if you want to take it further.
