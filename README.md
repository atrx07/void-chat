# void.chat — v2

Real-time global chatroom. Firebase auth (email + Google). Cloudflare Workers + D1 + Durable Objects.

---

## Architecture

```
Browser
  │  Firebase Auth (ID token)
  │
  ├──► Cloudflare Pages        (static frontend)
  │
  └──► Cloudflare Worker       (REST API + WS upgrade)
         ├── D1 Database       (message storage)
         └── Durable Object    (WebSocket hub — real-time broadcast)
```

**Real-time flow:**
1. User opens page → Firebase auth → gets ID token
2. Frontend opens `wss://worker/api/ws?token=...`
3. Worker verifies token, upgrades to the `ChatRoom` Durable Object
4. Durable Object holds all live WebSocket connections in memory
5. When any user POSTs a message → Worker saves to D1 → calls `DO /broadcast` → DO fans out to every connected socket instantly

---

## Project Structure

```
voidchat/
├── schema.sql                     ← D1 schema (run once)
│
├── frontend/
│   ├── index.html                 ← Full frontend (Firebase auth + chat UI)
│   ├── manifest.json              ← PWA manifest
│   ├── _headers                   ← Cloudflare Pages security headers
│   ├── icon-192.png               ← PWA icon (add your own)
│   └── icon-512.png               ← PWA icon (add your own)
│
└── worker/
    ├── wrangler.toml              ← Worker config (D1 + DO bindings)
    └── src/
        ├── index.js               ← Router + WS upgrade entry point
        ├── chatroom.js            ← ChatRoom Durable Object
        ├── firebase-verify.js     ← Firebase JWT verification (no npm needed)
        ├── utils.js               ← Auth helpers, CORS, response builders
        └── routes/
            ├── messages.js        ← GET/POST /api/messages
            ├── online.js          ← GET/POST /api/online
            ├── announce.js        ← POST /api/announce
            └── admin/
                ├── clear.js       ← POST /api/admin/clear
                ├── ban.js         ← POST /api/admin/ban
                ├── unban.js       ← POST /api/admin/unban
                ├── users.js       ← GET /api/admin/users
                └── delete-message.js  ← POST /api/admin/delete-message
```

---

## Setup Guide

### Prerequisites
- [Cloudflare account](https://dash.cloudflare.com) (free tier works)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) — `npm install -g wrangler`
- [Firebase project](https://console.firebase.google.com)

---

### Step 1 — Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com) → **Add project**
2. In your project → **Authentication** → **Get started**
3. Enable **Email/Password** provider
4. Enable **Google** provider
5. Go to **Project Settings** (gear icon) → **General** → scroll to **Your apps** → **Add app** → Web
6. Register the app, copy the `firebaseConfig` object — you'll need it shortly
7. Note your **Project ID** (shown in Project Settings)

---

### Step 2 — Cloudflare D1 Database

```bash
# Login to Cloudflare
wrangler login

# Create the database
wrangler d1 create voidchat-db
# Copy the database_id from the output

# Apply the schema
wrangler d1 execute voidchat-db --file=schema.sql
```

Open `worker/wrangler.toml` and replace `YOUR_D1_DATABASE_ID` with the ID you just got.

---

### Step 3 — Deploy the Worker

```bash
cd worker

# Set secrets (you'll be prompted to paste values)
wrangler secret put FIREBASE_PROJECT_ID
# → paste your Firebase project ID (e.g. my-project-abc123)

wrangler secret put ADMIN_UID
# → paste the Firebase UID of the user you want as admin
# (sign in once on the frontend, then find the UID in Firebase Console → Authentication → Users)

wrangler secret put FRONTEND_ORIGIN
# → paste your Cloudflare Pages URL (e.g. https://voidchat.pages.dev)
# (use * during development if you don't know it yet)

# Deploy
wrangler deploy
# Note the Worker URL: https://voidchat-api.<subdomain>.workers.dev
```

---

### Step 4 — Configure the Frontend

Open `frontend/index.html` and find the config section near the bottom:

```javascript
const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
};

const API_BASE = 'https://voidchat-api.YOUR_SUBDOMAIN.workers.dev';
```

Replace all `YOUR_*` values with:
- **FIREBASE_CONFIG** values → from Firebase Console → Project Settings → Your apps → Web app → SDK snippet
- **API_BASE** → your Worker URL from Step 3

---

### Step 5 — Deploy Frontend to Cloudflare Pages

**Option A — GitHub (recommended)**

1. Push the `frontend/` folder contents to a GitHub repository
2. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Pages** → **Create a project**
3. Connect GitHub → select your repo
4. Build settings:
   - Build command: *(leave empty)*
   - Output directory: `/` (or wherever index.html is)
5. Deploy → note your Pages URL (e.g. `https://voidchat.pages.dev`)

**Option B — Direct upload**

```bash
cd frontend
wrangler pages deploy . --project-name=voidchat
```

6. Go back to the Worker and update `FRONTEND_ORIGIN` secret with the actual Pages URL:
```bash
cd ../worker
wrangler secret put FRONTEND_ORIGIN
# → https://voidchat.pages.dev
```

---

### Step 6 — Firebase Authorized Domains

1. Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Add your Pages domain (e.g. `voidchat.pages.dev`)

---

### Step 7 — Find Your Admin UID

1. Open your deployed site and sign in with the account you want to be admin
2. Go to Firebase Console → **Authentication** → **Users**
3. Find your user → copy the **UID**
4. Update the Worker secret:
```bash
cd worker
wrangler secret put ADMIN_UID
# → paste the UID
wrangler deploy
```

The admin tab in the sidebar will appear automatically for that account.

---

## API Reference

All endpoints require `Authorization: Bearer <firebase_id_token>` header.

| Method | Endpoint                     | Auth     | Description                   |
|--------|------------------------------|----------|-------------------------------|
| GET    | `/api/messages?since={id}`   | User     | Fetch messages after id       |
| POST   | `/api/messages`              | User     | Send a chat message           |
| GET    | `/api/online`                | User     | List online users             |
| POST   | `/api/online`                | User     | Ping presence                 |
| POST   | `/api/announce`              | Admin    | Send highlighted announcement |
| POST   | `/api/admin/clear`           | Admin    | Clear all messages            |
| POST   | `/api/admin/ban`             | Admin    | Ban a user by UID             |
| POST   | `/api/admin/unban`           | Admin    | Unban a user by UID           |
| GET    | `/api/admin/users`           | Admin    | List all users + banned       |
| POST   | `/api/admin/delete-message`  | Admin    | Delete a specific message     |
| WS     | `/api/ws?token={idToken}`    | User     | Real-time WebSocket connection|

---

## WebSocket Events

Events received by the client over the WebSocket:

| `type`      | Payload                              | Description                        |
|-------------|--------------------------------------|------------------------------------|
| `message`   | `{ message: MessageObject }`         | New chat message                   |
| `delete`    | `{ messageId: number }`              | Message was deleted by admin       |
| `clear`     | —                                    | Chat was cleared by admin          |
| `presence`  | `{ event, displayName, onlineCount }`| User joined or left                |
| `pong`      | —                                    | Heartbeat response                 |

---

## Local Development

```bash
# Start the worker locally
cd worker
wrangler dev

# Serve frontend (any static server works)
cd ../frontend
npx serve .
# or: python3 -m http.server 8080
```

Set `API_BASE` in `index.html` to `http://localhost:8787` for local dev.

---

## Environment Variables / Secrets

| Variable             | Type   | Where to set           | Description                         |
|----------------------|--------|------------------------|-------------------------------------|
| `FIREBASE_PROJECT_ID`| Secret | `wrangler secret put`  | Firebase project ID                 |
| `ADMIN_UID`          | Secret | `wrangler secret put`  | Firebase UID of the admin user      |
| `FRONTEND_ORIGIN`    | Secret | `wrangler secret put`  | Pages domain for CORS               |
| `DB`                 | Binding| `wrangler.toml`        | D1 database binding                 |
| `CHAT_ROOM`          | Binding| `wrangler.toml`        | Durable Object binding              |

---

## What Changed from v1

| v1 (old)                         | v2 (new)                                      |
|----------------------------------|-----------------------------------------------|
| Anonymous + optional username    | Firebase auth required (email or Google)      |
| Password stored in D1 (SHA-256)  | Passwords managed by Firebase                 |
| Hardcoded admin username         | Admin = matching Firebase UID in env          |
| Polling every 2.5s               | WebSocket — true real-time via Durable Object |
| `time : user : message` layout   | `user + timestamp` header, message below      |
| Pages Functions (`/functions/`)  | Standalone Cloudflare Worker                  |
