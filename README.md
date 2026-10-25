# OneLink

**One link for everything you share.** A link-in-bio page builder like Linktree, built from scratch with Node.js, Express, SQLite and plain JavaScript.

Sign in with Google, claim a username, add your links, and share a single page: `yoursite.com/yourname`.

![Home page](docs/home.png)
![Dashboard](docs/dashboard.png)
![Public page on mobile](docs/public-page.png)

## Features

- **Google login:** one click with Google's "Choose an account" popup. No passwords are stored, and the account is created on first login
- **Custom username:** each user claims their own page URL
- **Link management:** add, edit, hide/show, reorder and delete links
- **Live phone preview:** the dashboard shows the public page in a phone frame and updates on every change
- **Click analytics:** total clicks, top link and a clicks-per-link chart. Clicks from the owner's own preview are not counted
- **Themes:** 4 accent colors for the public page
- **Responsive dark UI:** works from 375px phones to desktop, with a bottom tab bar on mobile, and respects `prefers-reduced-motion`

## Tech stack

| Part | Tool |
|---|---|
| Backend | Node.js 20+, Express |
| Database | SQLite (better-sqlite3) |
| Auth | Google Identity Services, JWT in an httpOnly cookie |
| Frontend | HTML, CSS, plain JavaScript (no framework, no build step) |
| Tests | Node's built-in test runner (`node:test`) |

## How it works

- **Login:** the browser gets a token from Google and sends it to `POST /api/auth/google`. The server verifies it with Google, checks that it was issued for this app's Client ID, creates or updates the user, and sets a signed JWT cookie.
- **Public pages:** `/:username` serves a static page that loads its data from `GET /api/u/:username`. Only active links are returned.
- **Click tracking:** each public link points to `/go/:id`. The server adds one to the counter, then redirects to the real URL, so the real URL is never on the page.

## Testing

```bash
npm test
```

There are 23 API tests. They run against an in-memory SQLite database, so no real data is used. They cover:

- **Auth:** protected routes return 401 without login, fake JWTs and fake Google tokens are rejected, and missing credentials return 400
- **Authorization:** a user can't edit, delete or reorder someone else's links (403 / 400)
- **Validation:** username length, reserved words, lowercase saving, a taken username returns 409, bio length, link title required
- **URL normalization:** `instagram.com/x` is saved as `https://instagram.com/x`, and invalid or non-http(s) URLs are rejected
- **Click tracking:** `/go/:id` redirects and counts the click, and preview clicks are not counted
- **Hidden links:** hidden links don't appear on the public page and can't be opened
- **Robustness:** broken JSON returns 400 instead of crashing, and unknown pages and links return 404

## Run it locally

### 1. Create a Google Client ID

1. Open [Google Cloud Console](https://console.cloud.google.com) and create a project.
2. Search for **Google Auth Platform** and click **Get started**.
   - **Branding:** app name, support email
   - **Audience:** External
   - **Contact:** email
3. **Audience → Test users:** add the Gmail accounts that will log in while the app is in Testing mode.
4. **Clients → Create client:**
   - Type: **Web application**
   - **Authorized JavaScript origins:** `http://localhost:3000` and `http://localhost`
5. Copy the **Client ID** (it ends in `.apps.googleusercontent.com`). The app doesn't use the client secret, so don't put it anywhere.

### 2. Install and configure

```bash
git clone https://github.com/<your-username>/onelink.git
cd onelink
npm install
cp .env.example .env      # Windows: copy .env.example .env
```

Fill in `.env`:

```env
PORT=3000
JWT_SECRET=change-me-to-a-long-random-string
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
DB_FILE=data.db
```

Generate a strong `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Start

```bash
npm start        # or: npm run dev (restarts on file changes)
```

Open http://localhost:3000. If the Client ID is missing or looks wrong, the server prints a warning at startup.

## Project structure

```
src/
  server.js           starts the server, warns about a bad Client ID
  app.js              Express setup and routes
  config.js           reads .env
  db.js               database connection + tables
  validators.js       username and URL checks
  middleware/auth.js  checks the login cookie
  routes/
    auth.js           Google login, logout, current user
    profile.js        update username, name, bio, theme
    links.js          add / edit / delete / reorder links
    public.js         public page data + click redirect
public/
  index.html          home page
  dashboard.html      editor (Links / Appearance / Analytics)
  page.html           public link page
  privacy.html, terms.html, 404.html
  css/style.css
  js/                 api.js, login.js, dashboard.js, page.js
tests/
  api.test.js         API tests
```

## API

| Method | Route | Login | What it does |
|---|---|---|---|
| GET | `/api/config` | no | Public Google Client ID for the frontend |
| POST | `/api/auth/google` | no | Log in with `{ credential }` or `{ accessToken }` |
| GET | `/api/auth/me` | yes | Current user |
| POST | `/api/auth/logout` | no | Clear the cookie |
| PUT | `/api/profile` | yes | Update username, name, bio, theme |
| GET | `/api/links` | yes | My links |
| POST | `/api/links` | yes | Add a link |
| PUT | `/api/links/:id` | yes | Edit or hide a link |
| DELETE | `/api/links/:id` | yes | Delete a link |
| PUT | `/api/links/reorder` | yes | Save a new order |
| GET | `/api/u/:username` | no | Public page data |
| GET | `/go/:id` | no | Count the click and redirect |

## Security

- Google tokens are verified on the server, and only tokens issued for this app's Client ID are accepted.
- The login cookie is `httpOnly` and `sameSite=lax`, and `secure` in production.
- Only `http`/`https` links can be saved.
- User content is rendered with `textContent`, never as HTML.
- `.env`, the database and key files are in `.gitignore`. Only `.env.example` with placeholders is committed.

## Contact

rehantroybusiness@gmail.com
