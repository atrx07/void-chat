// functions/api/auth/register.js

async function hashPassword(password) {
const encoder = new TextEncoder();
const data = encoder.encode(password);
const hash = await crypto.subtle.digest('SHA-256', data);
return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost({ request, env }) {
try {
const { username, password } = await request.json();

```
if (!username || !password) {
  return Response.json({ error: 'Missing fields' }, { status: 400 });
}

const cleanUsername = username.trim().slice(0, 30);
if (!cleanUsername || cleanUsername.length < 3) {
  return Response.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
}

// No spaces allowed
if (/\s/.test(cleanUsername)) {
  return Response.json({ error: 'Username cannot contain spaces' }, { status: 400 });
}

// Check if username is banned
const banned = await env.DB.prepare(
  `SELECT 1 FROM banned_users WHERE username = ?`
).bind(cleanUsername).first();
if (banned) return Response.json({ error: 'This username is not available' }, { status: 400 });

// Check if username already taken
const existing = await env.DB.prepare(
  `SELECT 1 FROM users WHERE username = ?`
).bind(cleanUsername).first();
if (existing) return Response.json({ error: 'Username already taken' }, { status: 400 });

const hashed = await hashPassword(password);

await env.DB.prepare(
  `INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)`
).bind(cleanUsername, hashed, Date.now()).run();

return Response.json({ ok: true });
```

} catch (e) {
return Response.json({ error: e.message }, { status: 500 });
}
}
