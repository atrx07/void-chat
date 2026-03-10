# void.chat

> A minimalist, anonymous global chat. No accounts. No history. Just words in the dark.

![void.chat](https://img.shields.io/badge/status-live-98c379?style=flat-square&logoColor=white)
![Cloudflare Pages](https://img.shields.io/badge/hosted%20on-Cloudflare%20Pages-e06c75?style=flat-square)
![D1 Database](https://img.shields.io/badge/database-Cloudflare%20D1-61afef?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-c678dd?style=flat-square)

-----

## What is void.chat?

**void.chat** is a real-time anonymous global chatroom. Every visitor gets a randomly generated username — something like `silent_echo42` or `frozen_shade67` — and can immediately start talking to anyone else in the room. No sign-up. No profile. No trace.

It’s the internet the way it used to feel.

-----

## Features

- 🎭 **Random identity on every visit** — usernames like `wandering_phase14` are auto-generated from curated word pairs, each assigned a unique color
- 🌍 **Truly global** — one shared chatroom, everyone in the world, no rooms or filters
- ⚡ **Real-time polling** — messages refresh every 2.5 seconds, no websockets needed
- 🖤 **Dark minimalist UI** — monospace font, scanline aesthetic, zero clutter
- 📱 **Mobile first** — works across Chrome, Brave, and Safari on Android and iOS
- 🔒 **Zero data collection** — no emails, no passwords, no tracking
- 🛠️ **Serverless architecture** — runs entirely on Cloudflare’s global edge network

-----

## Tech Stack

|Layer   |Technology                          |
|--------|------------------------------------|
|Frontend|Vanilla HTML, CSS, JavaScript       |
|Hosting |Cloudflare Pages                    |
|Backend |Cloudflare Pages Functions          |
|Database|Cloudflare D1 (SQLite at the edge)  |
|Fonts   |JetBrains Mono + Syne (Google Fonts)|

No frameworks. No build tools. No npm. Just clean, fast, portable web code.

-----

## How It Works

```
User visits void.chat
        ↓
Random username generated client-side
        ↓
Frontend polls /api/messages every 2.5s
        ↓
Pages Function queries D1 database
        ↓
New messages render instantly
        ↓
User sends message → POST /api/messages → stored in D1
```

-----

## Project Structure

```
void-chat/
├── index.html              # Entire frontend (single file)
└── functions/
    └── api/
        └── messages.js     # GET + POST API (Cloudflare Pages Function)
```

-----

## Roadmap & Potential

This is v1 — intentionally minimal. Here’s where it could go:

- [ ] **Message reactions** — anonymous emoji reactions on messages
- [ ] **Rooms** — create named rooms with unique URLs (`void.chat/room/lofi`)
- [ ] **Message expiry** — messages auto-delete after 24 hours for true ephemerality
- [ ] **Typing indicators** — see when someone is typing
- [ ] **WebSocket support** — upgrade from polling to true real-time via Cloudflare Durable Objects
- [ ] **Custom domain** — `void.chat` or similar
- [ ] **Rate limiting** — prevent spam with IP-based throttling via Cloudflare Workers
- [ ] **Moderation tools** — basic word filtering and ban system
- [ ] **PWA support** — install as an app, get push notifications

-----

## Running Locally

No build step needed. Just serve the files:

```bash
git clone https://github.com/atrx07/void-chat.git
cd void-chat
npx wrangler pages dev . --d1=DB=your-database-id
```

-----

## Deployment

Deployed on **Cloudflare Pages** with a **D1** database binding. Any push to `main` triggers an automatic deployment.

-----

## Philosophy

Most chat apps want you to sign up, verify your email, pick a username, upload a photo, and agree to seventeen policies before you can say hello to someone.

**void.chat** skips all of that.

You load the page. You have a name. You talk. That’s it.

-----

*Built with curiosity. Deployed at the edge. Owned by no one.*
