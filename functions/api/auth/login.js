// functions/api/auth/login.js

async function hashPassword(password) {
const encoder = new TextEncoder();
const data = encoder.encode(password);
const hash = await crypto.subtle.digest(‘SHA-256’, data);
return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, ‘0’)).join(’’);
}

export async function onRequestPost({ request, env }) {
try {
const { username, password } = await request.json();

```
if (!username || !password) {
  return Response.json({ error: 'Missing fields' }, { status: 400 });
}

const hashed = await hashPassword(password);

const user = await env.DB.prepare(
  `SELECT username FROM users WHERE username = ? AND password_hash = ?`
).bind(username.trim(), hashed).first();

if (!user) {
  return Response.json({ error: 'Invalid username or password' }, { status: 401 });
}

// Check if banned
const banned = await env.DB.prepare(
  `SELECT 1 FROM banned_users WHERE username = ?`
).bind(username.trim()).first();
if (banned) return Response.json({ error: 'This account has been banned' }, { status: 403 });

return Response.json({ ok: true });
```

} catch (e) {
return Response.json({ error: e.message }, { status: 500 });
}
}
