# void.chat

A real-time, anonymous global chatroom. No accounts. No sign-up. Just open the page and start talking.

![status](https://img.shields.io/badge/status-live-98c379?style=flat-square)
![platform](https://img.shields.io/badge/hosted%20on-Cloudflare%20Pages-e06c75?style=flat-square)
![database](https://img.shields.io/badge/database-Cloudflare%20D1-61afef?style=flat-square)
![license](https://img.shields.io/badge/license-MIT-c678dd?style=flat-square)

**Live at → [void-chat-4wf.pages.dev](https://void-chat-4wf.pages.dev)**

-----

## Overview

void.chat strips chat down to its core — open the page, get a name, start talking. Every visitor is automatically assigned a randomly generated username and a unique color. There are no rooms, no threads, no profiles. Just one shared space for whoever shows up.

It is built entirely on Cloudflare’s edge infrastructure — no traditional servers, no DevOps overhead, global by default.

-----

## Features

### Anonymous Identity System

Every session generates a unique username from a curated pool of adjectives and nouns — names like `silent_echo42` or `wandering_phase14`. Each username is deterministically assigned a color from a dark-theme palette, so users are visually distinct without any configuration. Identities are session-scoped and disappear on refresh, keeping the experience truly anonymous.

### Real-Time Messaging

Messages are fetched via lightweight polling every 2.5 seconds. No WebSocket infrastructure required — the result is near-real-time chat with minimal complexity and zero persistent connections.

### 200-Message Rolling Window

The chat retains the last 200 messages at all times. When a new message is sent, the oldest one is automatically removed. This keeps the database lean indefinitely, ensures the chat always has context, and avoids the jarring experience of a sudden full wipe.

### Serverless Edge Architecture

The entire stack runs on Cloudflare’s global network. Pages Functions handle the API layer, D1 provides SQLite at the edge, and Pages serves the frontend — all from the same platform with no cold starts and sub-100ms response times globally.

### Mobile-First Design

Built to work across Android and iOS on Chrome, Brave, and Safari. Input zoom is suppressed, the chat box stays anchored above the keyboard, and touch targets are sized for real use.

### Zero Dependencies

No frameworks. No build tools. No package.json. The frontend is a single HTML file with vanilla JavaScript. The backend is a single JS module. The entire codebase is under 500 lines.

-----

## Tech Stack

|Layer     |Technology                                     |
|----------|-----------------------------------------------|
|Frontend  |Vanilla HTML, CSS, JavaScript                  |
|Fonts     |JetBrains Mono + Syne (Google Fonts)           |
|Hosting   |Cloudflare Pages                               |
|API       |Cloudflare Pages Functions                     |
|Database  |Cloudflare D1 (SQLite at the edge)             |
|Deployment|GitHub → Cloudflare Pages (auto-deploy on push)|

-----

## Project Structure

```
void-chat/
├── index.html              # Complete frontend — UI, styling, and logic
└── functions/
    └── api/
        └── messages.js     # GET (fetch messages) + POST (send + rolling window cleanup)
```

-----

## API

### `GET /api/messages?since={id}`

Returns all messages with an ID greater than `since`. Used for incremental polling.

```json
{
  "messages": [
    { "id": 42, "username": "silent_echo42", "message": "hello", "created_at": 1741234567890 }
  ]
}
```

### `POST /api/messages`

Inserts a new message and trims the chat to the last 200 messages.

```json
{ "username": "silent_echo42", "message": "hello" }
```

-----

## Roadmap

The current version is intentionally minimal. Planned and potential additions:

- [ ] **WebSocket / Durable Objects** — upgrade from polling to true real-time connections
- [ ] **Named rooms** — isolated chatrooms via unique URLs (`/room/lofi`, `/room/dev`)
- [ ] **Typing indicators** — show when someone is composing a message
- [ ] **Message reactions** — anonymous emoji reactions without accounts
- [ ] **Rate limiting** — IP-based throttling via Cloudflare Workers to prevent spam
- [ ] **Moderation layer** — basic word filtering and temporary bans
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

Replace `your-database-id` with your D1 database ID from the Cloudflare dashboard.

-----

## Deployment

Pushing to `main` on GitHub triggers an automatic deployment via Cloudflare Pages. The D1 database binding (`DB`) is configured in the Pages project settings.

-----

## License

MIT — use it, fork it, build on it.
