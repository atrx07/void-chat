import { verifyAdminToken } from './admin/_verify.js';

export async function onRequestPost({ request, env }) {
  try {
    var body = await request.json();
    if (!await verifyAdminToken(body.adminToken, env)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    var clean = (body.message || '').trim().slice(0, 300);
    if (!clean) return Response.json({ error: 'Empty message' }, { status: 400 });
    var adminUser = env.ADMIN_USERNAME || 'atrx07';
    var now = Date.now();
    await env.DB.prepare('INSERT INTO messages (username, message, created_at, type) VALUES (?, ?, ?, ?)').bind(adminUser, clean, now, 'announce').run();
    await env.DB.prepare('DELETE FROM messages WHERE id NOT IN (SELECT id FROM messages ORDER BY id DESC LIMIT 200)').run();
    return Response.json({ ok: true });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
