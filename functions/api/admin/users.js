import { verifyAdminToken } from './_verify.js';

export async function onRequestPost({ request, env }) {
  try {
    var body = await request.json();
    if (!await verifyAdminToken(body.token, env)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    var r = await env.DB.prepare('SELECT username, created_at FROM users ORDER BY created_at DESC').all();
    return Response.json({ users: r.results || [] });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
