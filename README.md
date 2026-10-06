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
cd testing1-main   # the project folder
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
testing1-main/
  index.html, about.html, mission.html   ← existing static pages, unchanged
  login.html, signup.html                ← now call the real API
  assets/valid.js                        ← client-side validation + API calls
  dashboard/
    index.html                           ← dashboard (auth-guarded, loads/saves via the API)
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
| POST   | `/api/budget`      | yes            | Add an income/expense/subscription/reminder entry |
| DELETE | `/api/budget/:id`  | yes            | Delete one of your own entries   |

## Notes / things to know before deploying this for real

- **`JWT_SECRET`**: in development a random secret is generated once and saved to
  `server/.jwt-secret` (git-ignored), so logins survive restarts. With `NODE_ENV=production` the
  server refuses to start unless `JWT_SECRET` is set, e.g.
  `NODE_ENV=production JWT_SECRET=$(openssl rand -hex 32) npm start`.
- **Only public files are served.** `server/`, `package.json` and
  `data.json` (which holds password hashes) are not reachable from the browser.
- **Rate limiting**: login/signup are limited per IP. Behind a reverse proxy,
  set `TRUST_PROXY=1` so the real client IP is used.
- **Dashboard protection**: `/dashboard` redirects to the login page without
  a valid session, and every `/api/budget` route requires one too, so no one
  can read or change another user's data.
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
