# void.chat

A real-time, anonymous global chatroom. No forced sign-up. Just open the page and start talking.

![status](https://img.shields.io/badge/status-live-98c379?style=flat-square)
![platform](https://img.shields.io/badge/hosted%20on-Cloudflare%20Pages-e06c75?style=flat-square)
![database](https://img.shields.io/badge/database-Cloudflare%20D1-61afef?style=flat-square)
![license](https://img.shields.io/badge/license-MIT-c678dd?style=flat-square)

**Live at → [void-chat-4wf.pages.dev](https://void-chat-4wf.pages.dev)**

-----

## Overview

void.chat is a global chatroom built around one idea — talking to strangers should require zero friction. Open the page, get a randomly generated identity, and start chatting instantly. No email. No verification. No profile to set up.

For users who want to come back with the same identity, a lightweight registration system lets you claim and lock a username with a password. Everything runs on Cloudflare’s edge infrastructure — no traditional servers, no DevOps overhead.

-----

## Features

### Anonymous by Default

Every session generates a unique username from a curated pool of adjectives and nouns — names like `silent_echo42` or `wandering_phase14`. Each username is deterministically assigned a color from a dark-theme palette, making users visually distinct without any configuration. Guests can chat immediately with zero setup.

### Username Registration & Login

Users who want a persistent identity can register a username and password through the side menu. Registered usernames are locked — no one else can claim them. Logging in restores your identity and color across sessions. Logging out returns you to a fresh anonymous identity.

### Real-Time Messaging

Messages are fetched via lightweight polling every 2.5 seconds. No WebSocket infrastructure required — the result is near-real-time chat with minimal complexity and zero persistent connections.

### 200-Message Rolling Window

The chat retains the last 200 messages at all times. When a new message is sent, the oldest one is automatically removed. This keeps the database lean indefinitely and ensures the chat always has context for new visitors.

### Admin Control Panel

A protected admin panel is accessible via the side menu. The admin can clear the entire chat, send highlighted announcements visible to all users, ban registered or anonymous usernames, delete individual messages, and view all registered users. Admin announcements appear with a distinct gold highlight and larger text to stand out from regular messages. The `/announce` command is also available directly from the chat input when logged in as admin.

### Sliding Side Menu

A hamburger menu slides in from the left with two tabs — User and Admin. The User tab handles registration and login. The Admin tab is protected by credentials and unlocks moderation tools. The menu footer displays author info and links to social profiles.

### Serverless Edge Architecture

The entire stack runs on Cloudflare’s global network. Pages Functions handle the API layer, D1 provides SQLite at the edge, and Pages serves the frontend — all from the same platform with no cold starts and sub-100ms response times globally.

### Mobile-First Design

Built to work across Android and iOS on Chrome, Brave, and Safari. Input zoom is suppressed, the chat box stays anchored above the keyboard, and touch targets are sized for real use.

### Zero Frontend Dependencies

No frameworks. No build tools. No package.json. The frontend is a single HTML file with vanilla JavaScript. The entire codebase is under 900 lines.

-----

## Tech Stack

|Layer     |Technology                                     |
|----------|-----------------------------------------------|
|Frontend  |Vanilla HTML, CSS, JavaScript                  |
|Fonts     |JetBrains Mono + Syne (Google Fonts)           |
|Hosting   |Cloudflare Pages                               |
|API       |Cloudflare Pages Functions                     |
|Database  |Cloudflare D1 (SQLite at the edge)             |
|Auth      |SHA-256 password hashing via Web Crypto API    |
|Deployment|GitHub → Cloudflare Pages (auto-deploy on push)|

-----

## Project Structure

```
void-chat/
├── index.html                        # Complete frontend
└── functions/
    └── api/
        ├── messages.js               # GET + POST chat messages
        ├── announce.js               # Admin announcements
        ├── auth/
        │   ├── register.js           # User registration
        │   └── login.js              # User login
        └── admin/
            ├── _verify.js            # Token verification helper
            ├── login.js              # Admin authentication
            ├── clear.js              # Clear entire chat
            ├── ban.js                # Ban a username
            ├── users.js              # List registered users
            └── delete-message.js     # Delete specific message
```

-----

## API Reference

|Method|Endpoint                   |Description                     |
|------|---------------------------|--------------------------------|
|GET   |`/api/messages?since={id}` |Fetch messages after a given ID |
|POST  |`/api/messages`            |Send a chat message             |
|POST  |`/api/announce`            |Send an admin announcement      |
|POST  |`/api/auth/register`       |Register a new username         |
|POST  |`/api/auth/login`          |Login with username and password|
|POST  |`/api/admin/login`         |Admin authentication            |
|POST  |`/api/admin/clear`         |Clear all messages              |
|POST  |`/api/admin/ban`           |Ban a username                  |
|POST  |`/api/admin/users`         |List all registered users       |
|POST  |`/api/admin/delete-message`|Delete a specific message       |

-----

## Environment Variables

Set these in Cloudflare Pages → Settings → Variables and Secrets:

|Variable        |Type     |Description                       |
|----------------|---------|----------------------------------|
|`ADMIN_PASSWORD`|Secret   |Admin login password              |
|`ADMIN_SECRET`  |Secret   |Token signing secret              |
|`ADMIN_USERNAME`|Plaintext|Admin username (default: `atrx07`)|

-----

## Database Schema

```sql
CREATE TABLE messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  username    TEXT    NOT NULL,
  message     TEXT    NOT NULL,
  created_at  INTEGER NOT NULL,
  type        TEXT    NOT NULL DEFAULT 'chat'
);

CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  created_at    INTEGER NOT NULL
);

CREATE TABLE banned_users (
  username   TEXT    NOT NULL UNIQUE,
  banned_at  INTEGER NOT NULL
);
```

-----

## Roadmap

- [ ] **WebSocket / Durable Objects** — upgrade from polling to true real-time connections
- [ ] **Named rooms** — isolated chatrooms via unique URLs (`/room/lofi`, `/room/dev`)
- [ ] **Typing indicators** — show when someone is composing a message
- [ ] **Message reactions** — anonymous emoji reactions without accounts
- [ ] **Rate limiting** — IP-based throttling via Cloudflare Workers to prevent spam
- [ ] **PWA support** — installable app with push notifications
- [ ] **Custom domain** — a proper home for the project
- [ ] **UptimeRobot badge** — live status monitoring embedded in this README

-----

## Running Locally

No build step required.

```bash
git clone https://github.com/atrx07/void-chat.git
cd void-chat
npx wrangler pages dev . --d1=DB=your-database-id
```

-----

## Deployment

Pushing to `main` on GitHub triggers an automatic deployment via Cloudflare Pages. Environment variables and the D1 database binding (`DB`) are configured in the Pages project settings.

-----

## License

MIT — use it, fork it, build on it.
