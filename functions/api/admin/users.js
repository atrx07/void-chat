// functions/api/admin/users.js
import { verifyAdminToken } from './_verify.js';

export async function onRequestPost({ request, env }) {
try {
const { token } = await request.json();
if (!await verifyAdminToken(token, env)) {
return Response.json({ error: 'Unauthorized' }, { status: 401 });
}

```
const { results } = await env.DB.prepare(
  `SELECT username, created_at FROM users ORDER BY created_at DESC`
).all();

return Response.json({ users: results || [] });
```

} catch (e) {
return Response.json({ error: e.message }, { status: 500 });
}
}
