import { verifyAdminToken } from './_verify.js';

export async function onRequestPost({ request, env }) {
  try {
    var body = await request.json();
    if (!await verifyAdminToken(body.token, env)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!body.id) return Response.json({ error: 'Missing id' }, { status: 400 });
    await env.DB.prepare('DELETE FROM messages WHERE id = ?').bind(body.id).run();
    // Store deletion event so polling clients can pick it up
    await env.DB.prepare(
      'INSERT INTO deleted_messages (msg_id, deleted_at) VALUES (?, ?) ON CONFLICT(msg_id) DO UPDATE SET deleted_at = excluded.deleted_at'
    ).bind(body.id, Date.now()).run();
    // Clean up old deletion events after 10 seconds
    await env.DB.prepare('DELETE FROM deleted_messages WHERE deleted_at < ?').bind(Date.now() - 10000).run();
    return Response.json({ ok: true });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
