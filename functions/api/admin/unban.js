import { verifyAdminToken } from './_verify.js';

export async function onRequestPost({ request, env }) {
  try {
    var body = await request.json();
    if (!await verifyAdminToken(body.token, env)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!body.username) return Response.json({ error: 'Missing username' }, { status: 400 });
    await env.DB.prepare('DELETE FROM banned_users WHERE username = ?').bind(body.username.trim()).run();
    return Response.json({ ok: true });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
