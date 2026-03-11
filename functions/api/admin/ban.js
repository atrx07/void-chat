// functions/api/admin/ban.js
import { verifyAdminToken } from './_verify.js';

export async function onRequestPost({ request, env }) {
try {
const { username, token } = await request.json();
if (!await verifyAdminToken(token, env)) {
return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
if (!username) return Response.json({ error: 'Missing username' }, { status: 400 });

```
await env.DB.prepare(
  `INSERT OR IGNORE INTO banned_users (username, banned_at) VALUES (?, ?)`
).bind(username.trim(), Date.now()).run();

return Response.json({ ok: true });
```

} catch (e) {
return Response.json({ error: e.message }, { status: 500 });
}
}
