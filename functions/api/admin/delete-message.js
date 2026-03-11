// functions/api/admin/delete-message.js
import { verifyAdminToken } from ‘./_verify.js’;

export async function onRequestPost({ request, env }) {
try {
const { id, token } = await request.json();
if (!await verifyAdminToken(token, env)) {
return Response.json({ error: ‘Unauthorized’ }, { status: 401 });
}
if (!id) return Response.json({ error: ‘Missing id’ }, { status: 400 });

```
await env.DB.prepare(`DELETE FROM messages WHERE id = ?`).bind(id).run();
return Response.json({ ok: true });
```

} catch (e) {
return Response.json({ error: e.message }, { status: 500 });
}
}
