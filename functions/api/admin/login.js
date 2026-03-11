// functions/api/admin/login.js

export async function onRequestPost({ request, env }) {
try {
const { username, password } = await request.json();

```
const adminUser = env.ADMIN_USERNAME || 'atrx07';
const adminPass = env.ADMIN_PASSWORD;

if (!adminPass) {
  return Response.json({ error: 'Admin not configured' }, { status: 500 });
}

if (username !== adminUser || password !== adminPass) {
  return Response.json({ error: 'Invalid credentials' }, { status: 401 });
}

// Simple token: hash of username+password+secret
const encoder = new TextEncoder();
const data = encoder.encode(username + password + (env.ADMIN_SECRET || 'void'));
const hash = await crypto.subtle.digest('SHA-256', data);
const token = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');

return Response.json({ ok: true, token });
```

} catch (e) {
return Response.json({ error: e.message }, { status: 500 });
}
}
